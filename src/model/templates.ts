import { z } from 'zod'
import { mdToBlocks } from './importMd'
import { addGoal, addSteps, deleteGoal, newId, updateGoal, updateProject } from './ops'
import { addPage, deletePage, pageToMarkdown } from './pages'
import { COLUMN_TYPES, type Cheat, type Data, type Install } from './schema'
import { addTable, deleteTable, sanitizeCell, type ColumnSpec } from './tables'

/**
 * Templates (`*.gdtemplate.json`): goals, pages, tables, cheat sheet entries and time budgets
 * someone else prepared. Data only; C# scripts are plain text the user copies to Unity after
 * reading them. Installing records what was created, so it can be removed again.
 */

const text = (max: number) => z.string().max(max)

export const TemplateSchema = z.object({
  format: z.literal('gdtemplate'),
  formatVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,60}$/),
  name: text(100).min(1),
  description: text(1000).default(''),
  author: text(100).default(''),
  version: text(20).default('1.0.0'),
  /** Languages of the texts inside, e.g. ["en", "de"]. */
  languages: z.array(text(10)).max(10).default([]),
  tags: z.array(text(30)).max(20).default([]),
  perspective: z.enum(['2d', '3d', 'any']).default('any'),
  contents: z.object({
    goals: z
      .array(z.object({ title: text(200).min(1), estimateHours: z.number().min(0).max(10000).nullable().default(null), steps: z.array(text(300)).max(200).default([]) }))
      .max(100)
      .default([]),
    pages: z.array(z.object({ title: text(200).min(1), icon: text(8).default(''), markdown: text(40000) })).max(50).default([]),
    tables: z
      .array(
        z.object({
          name: text(100).min(1),
          columns: z.array(z.object({ name: text(60), type: z.enum(COLUMN_TYPES), options: z.array(text(40)).max(30).default([]) })).min(1).max(30),
          rows: z.array(z.array(z.union([text(2000), z.number(), z.boolean(), z.null()])).max(30)).max(500).default([]),
        }),
      )
      .max(20)
      .default([]),
    cheats: z
      .array(z.object({ title: text(200).min(1), category: text(60).default(''), tags: z.array(text(40)).max(20).default([]), body: text(20000).default(''), code: text(20000).default('') }))
      .max(50)
      .default([]),
    /** Planned hours per section id. */
    budgets: z.record(text(40), z.number().min(0).max(10000)).default({}),
    unityScripts: z
      .array(z.object({ file: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,60}\.cs$/), text: text(100000) }))
      .max(20)
      .default([]),
  }),
})

export type Template = z.infer<typeof TemplateSchema>

/** Catalog entry in templates/index.json. */
export const CatalogSchema = z.object({
  templates: z
    .array(
      z.object({
        file: z.string().regex(/^[a-z0-9][a-z0-9-]{0,60}\.gdtemplate\.json$/),
        id: text(61),
        name: text(100),
        description: text(1000).default(''),
        author: text(100).default(''),
        tags: z.array(text(30)).max(20).default([]),
        perspective: z.enum(['2d', '3d', 'any']).default('any'),
        languages: z.array(text(10)).max(10).default([]),
      }),
    )
    .max(500),
})
export type Catalog = z.infer<typeof CatalogSchema>

export const MAX_TEMPLATE_BYTES = 1024 * 1024

export function parseTemplate(json: string): Template {
  if (json.length > MAX_TEMPLATE_BYTES) throw new Error('template too large')
  return TemplateSchema.parse(JSON.parse(json))
}

/** What installing would create, for the preview. */
export const templateSummary = (t: Template) => ({
  goals: t.contents.goals.length,
  steps: t.contents.goals.reduce((s, g) => s + g.steps.length, 0),
  pages: t.contents.pages.length,
  tables: t.contents.tables.length,
  cheats: t.contents.cheats.length,
  budgets: Object.keys(t.contents.budgets).length,
  scripts: t.contents.unityScripts.length,
})

/** Adds everything from the template to the project and remembers it for undo. */
export function installTemplate(data: Data, projectId: string, tpl: Template): { data: Data; install: Install } {
  let d = data
  const created: Install['created'] = []
  for (const g of tpl.contents.goals) {
    d = addGoal(d, projectId, g.title)
    const goal = d.goals[d.goals.length - 1]
    if (g.steps.length) d = addSteps(d, goal.id, g.steps)
    if (g.estimateHours !== null) d = updateGoal(d, goal.id, { estimateHours: g.estimateHours })
    created.push({ type: 'goal', id: goal.id })
  }
  for (const p of tpl.contents.pages) {
    const r = addPage(d, projectId, p.title, mdToBlocks(p.markdown))
    d = { ...r.data, pages: r.data.pages.map((x) => (x.id === r.page.id ? { ...x, icon: p.icon } : x)) }
    created.push({ type: 'page', id: r.page.id })
  }
  for (const t of tpl.contents.tables) {
    const r = addTable(d, projectId, t.name)
    const columns = t.columns.map((c: ColumnSpec & { options: string[] }) => ({ id: newId(), name: c.name.slice(0, 60) || 'Column', type: c.type, options: c.options }))
    const rows = t.rows.map((values) => ({ id: newId(), cells: Object.fromEntries(columns.map((c, i) => [c.id, sanitizeCell(c, values[i])])) }))
    d = { ...r.data, tables: r.data.tables.map((x) => (x.id === r.table.id ? { ...x, columns, rows } : x)) }
    created.push({ type: 'table', id: r.table.id })
  }
  const at = new Date().toISOString()
  const cheats: Cheat[] = tpl.contents.cheats.map((c) => ({ id: newId(), title: c.title, category: c.category, tags: c.tags, body: c.body, code: c.code, createdAt: at }))
  if (cheats.length) d = { ...d, cheats: [...d.cheats, ...cheats].slice(-2000) }
  created.push(...cheats.map((c) => ({ type: 'cheat' as const, id: c.id })))
  const project = d.projects.find((p) => p.id === projectId)
  if (project && Object.keys(tpl.contents.budgets).length)
    d = updateProject(d, projectId, { sectionBudgets: { ...project.sectionBudgets, ...tpl.contents.budgets } })
  const install: Install = { id: newId(), projectId, templateId: tpl.id, name: tpl.name.slice(0, 200), at, created: created.slice(0, 2000) }
  return { data: { ...d, installs: [...d.installs, install].slice(-500) }, install }
}

/** Removes what an install created (items the user deleted in the meantime are skipped). */
export function uninstallTemplate(data: Data, installId: string): Data {
  const install = data.installs.find((i) => i.id === installId)
  if (!install) return data
  let d = data
  for (const c of install.created) {
    if (c.type === 'goal') d = deleteGoal(d, c.id)
    else if (c.type === 'page') d = deletePage(d, c.id)
    else if (c.type === 'table') d = deleteTable(d, c.id)
    else d = { ...d, cheats: d.cheats.filter((x) => x.id !== c.id) }
  }
  return { ...d, installs: d.installs.filter((i) => i.id !== installId) }
}

export interface ExportChoice {
  goals: boolean
  pages: boolean
  tables: boolean
  budgets: boolean
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'template'

/**
 * The project as a template. Only text goes in: no file paths, no assets, no notes, no time logs,
 * goals without progress, image blocks and URL columns left out.
 */
export function exportTemplate(data: Data, projectId: string, choice: ExportChoice, meta: { name: string; description: string; author: string }): Template {
  const project = data.projects.find((p) => p.id === projectId)
  const goals = choice.goals
    ? data.goals.filter((g) => g.projectId === projectId && !g.archived).slice(0, 100).map((g) => ({ title: g.title, estimateHours: g.estimateHours, steps: g.steps.map((s) => s.title).slice(0, 200) }))
    : []
  const pages = choice.pages
    ? data.pages
        .filter((p) => p.projectId === projectId)
        .slice(0, 50)
        .map((p) => {
          const clean = { ...p, blocks: p.blocks.filter((b) => b.type !== 'image' && b.type !== 'table') }
          return { title: p.title, icon: p.icon, markdown: pageToMarkdown(clean, data).replace(/^## .*\n+/, '').slice(0, 40000) }
        })
    : []
  const tables = choice.tables
    ? data.tables
        .filter((t) => t.projectId === projectId)
        .slice(0, 20)
        .map((t) => {
          const columns = t.columns.filter((c) => c.type !== 'url')
          return { name: t.name, columns: columns.map((c) => ({ name: c.name, type: c.type, options: c.options })), rows: t.rows.slice(0, 500).map((r) => columns.map((c) => r.cells[c.id] ?? null)) }
        })
    : []
  return TemplateSchema.parse({
    format: 'gdtemplate',
    formatVersion: 1,
    id: slug(meta.name || project?.name || 'template'),
    name: (meta.name || project?.name || 'Template').slice(0, 100),
    description: meta.description.slice(0, 1000),
    author: meta.author.slice(0, 100),
    version: '1.0.0',
    languages: [data.settings.language === 'auto' ? 'en' : data.settings.language],
    tags: [],
    perspective: 'any',
    contents: { goals, pages, tables, cheats: [], budgets: choice.budgets ? (project?.sectionBudgets ?? {}) : {}, unityScripts: [] },
  })
}
