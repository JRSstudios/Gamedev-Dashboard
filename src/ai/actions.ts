import { z } from 'zod'
import { getCheat } from '../cheatsheet'
import { addEdge, addNode, listRefs } from '../model/graph'
import { addGoal, addNote, addSteps, sanitizeTag } from '../model/ops'
import { addPage, newBlock } from '../model/pages'
import { ASSET_CATEGORIES, COLUMN_TYPES, type Block, type Data } from '../model/schema'
import { addColumn, addRow, addTable, setCell } from '../model/tables'

/** What Claude may propose (see APP_GUIDE). Everything is validated before it is shown or applied. */
const s = (max: number) => z.string().trim().min(1).max(max)

const BlockInput = z.object({
  kind: z.enum(['heading', 'paragraph', 'callout', 'list', 'checklist']),
  text: z.string().max(5000).optional(),
  items: z.array(z.string().max(500)).max(50).optional(),
})

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('goal'), title: s(200), steps: z.array(s(300)).max(20).default([]) }),
  z.object({ type: z.literal('page'), title: s(200), icon: z.string().max(8).optional(), blocks: z.array(BlockInput).max(60).default([]) }),
  z.object({
    type: z.literal('table'),
    name: s(100),
    columns: z.array(z.object({ name: s(60), type: z.enum(COLUMN_TYPES), options: z.array(s(40)).max(30).optional() })).min(1).max(12),
    rows: z.array(z.array(z.union([z.string().max(500), z.number(), z.boolean(), z.null()])).max(12)).max(50).default([]),
  }),
  z.object({ type: z.literal('note'), text: s(4000) }),
  z.object({ type: z.literal('cheat'), id: s(80), goal: z.string().max(200).optional() }),
  z.object({ type: z.literal('asset'), id: s(64), category: z.enum(ASSET_CATEGORIES).optional(), tags: z.array(s(40)).max(10).optional() }),
  z.object({ type: z.literal('connect'), from: s(200), to: s(200) }),
])
export type Action = z.infer<typeof ActionSchema>

/** Invalid single actions are dropped instead of failing the whole plan. */
export const PlanSchema = z.object({
  summary: z.string().max(2000).default(''),
  actions: z
    .array(z.unknown())
    .max(60)
    .transform((list) => list.flatMap((a) => {
      const r = ActionSchema.safeParse(a)
      return r.success ? [r.data] : []
    }).slice(0, 30)),
})
export type Plan = z.infer<typeof PlanSchema>

/** Removes actions that point at things that do not exist (unknown cheat or asset ids). */
export function validActions(data: Data, projectId: string, actions: Action[]): Action[] {
  return actions.filter((a) => {
    if (a.type === 'cheat') return Boolean(getCheat(a.id) ?? data.cheats.find((c) => c.id === a.id))
    if (a.type === 'asset') return data.assets.some((x) => x.id === a.id && x.projectId === projectId)
    return true
  })
}

function toBlocks(input: z.infer<typeof BlockInput>[]): Block[] {
  return input.map((b) => {
    const base = newBlock(b.kind)
    if (b.kind === 'list') return { ...base, type: 'list', items: (b.items ?? [b.text ?? '']).map((i) => i.slice(0, 500)) } as Block
    if (b.kind === 'checklist') return { ...base, type: 'checklist', items: (b.items ?? [b.text ?? '']).map((i) => ({ text: i.slice(0, 500), done: false })) } as Block
    if (b.kind === 'heading') return { ...base, type: 'heading', text: (b.text ?? '').slice(0, 5000), level: 1 } as Block
    return { ...base, type: b.kind, text: (b.text ?? '').slice(0, 5000) } as Block
  })
}

/** Places a canvas node for an item (if missing) and returns its node id. */
function nodeFor(data: Data, projectId: string, type: Parameters<typeof addNode>[2], id: string): { data: Data; nodeId: string | null } {
  const project = data.projects.find((p) => p.id === projectId)
  const existing = project?.graph.nodes.find((n) => n.ref.type === type && n.ref.id === id)
  if (existing) return { data, nodeId: existing.id }
  const count = project?.graph.nodes.length ?? 0
  const next = addNode(data, projectId, type, id, (count % 4) * 280, Math.floor(count / 4) * 170)
  const added = next.projects.find((p) => p.id === projectId)?.graph.nodes.find((n) => n.ref.type === type && n.ref.id === id)
  return { data: next, nodeId: added?.id ?? null }
}

function findByTitle(data: Data, projectId: string, title: string) {
  const key = title.trim().toLowerCase()
  return listRefs(data, projectId).find((r) => r.title.trim().toLowerCase() === key) ?? null
}

/** Applies the chosen actions in order. Later actions can refer to items created by earlier ones. */
export function applyActions(data: Data, projectId: string, actions: Action[]): Data {
  let d = data
  for (const a of validActions(d, projectId, actions)) {
    switch (a.type) {
      case 'goal': {
        d = addGoal(d, projectId, a.title)
        const goal = d.goals.at(-1)
        if (goal && a.steps.length) d = addSteps(d, goal.id, a.steps)
        break
      }
      case 'page': {
        const created = addPage(d, projectId, a.title, a.blocks.length ? toBlocks(a.blocks) : undefined)
        d = a.icon ? { ...created.data, pages: created.data.pages.map((p) => (p.id === created.page.id ? { ...p, icon: [...a.icon!].slice(0, 2).join('') } : p)) } : created.data
        break
      }
      case 'table': {
        const created = addTable(d, projectId, a.name, 'blank')
        d = { ...created.data, tables: created.data.tables.map((t) => (t.id === created.table.id ? { ...t, columns: [] } : t)) }
        for (const c of a.columns) d = addColumn(d, created.table.id, { name: c.name, type: c.type, options: c.options })
        const columns = d.tables.find((t) => t.id === created.table.id)?.columns ?? []
        for (const row of a.rows) {
          d = addRow(d, created.table.id)
          const rowId = d.tables.find((t) => t.id === created.table.id)?.rows.at(-1)?.id
          if (!rowId) continue
          row.forEach((cell, i) => {
            if (columns[i]) d = setCell(d, created.table.id, rowId, columns[i].id, cell)
          })
        }
        break
      }
      case 'note':
        d = addNote(d, projectId, a.text, null)
        break
      case 'asset':
        d = {
          ...d,
          assets: d.assets.map((x) =>
            x.id === a.id ? { ...x, category: a.category ?? x.category, tags: a.tags ? [...new Set([...x.tags, ...a.tags.map(sanitizeTag).filter(Boolean)])].slice(0, 50) : x.tags } : x,
          ),
        }
        break
      case 'cheat': {
        const cheat = nodeFor(d, projectId, 'cheat', a.id)
        d = cheat.data
        const goal = a.goal ? findByTitle(d, projectId, a.goal) : null
        if (goal && cheat.nodeId) {
          const g = nodeFor(d, projectId, goal.type, goal.id)
          d = g.data
          if (g.nodeId) d = addEdge(d, projectId, g.nodeId, cheat.nodeId)
        }
        break
      }
      case 'connect': {
        const from = findByTitle(d, projectId, a.from)
        const to = findByTitle(d, projectId, a.to)
        if (!from || !to) break
        const f = nodeFor(d, projectId, from.type, from.id)
        const t = nodeFor(f.data, projectId, to.type, to.id)
        d = t.data
        if (f.nodeId && t.nodeId) d = addEdge(d, projectId, f.nodeId, t.nodeId)
        break
      }
    }
  }
  return d
}
