import type { Data, Graph, Project, RefType } from './schema'

const uid = (): string => crypto.randomUUID()

export const MAX_NODES = 500
export const EMPTY_GRAPH: Graph = { nodes: [], edges: [] }

export interface RefInfo {
  type: RefType
  id: string
  title: string
  subtitle: string
  /** Plain text this object contains; used to find [[links]]. */
  text: string
}

/** First non-empty line of a note, which is how notes are named on the canvas and in [[links]]. */
export function noteTitle(text: string): string {
  const line = text.split('\n').find((l) => l.trim()) ?? ''
  return line.replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, '').trim().slice(0, 80) || line.trim().slice(0, 80)
}

export function describeRef(data: Data, type: RefType, id: string): RefInfo | null {
  switch (type) {
    case 'goal': {
      const g = data.goals.find((x) => x.id === id)
      if (!g) return null
      const done = g.steps.filter((s) => s.done).length
      return { type, id, title: g.title, subtitle: `${done}/${g.steps.length}`, text: g.steps.map((s) => s.title).join('\n') }
    }
    case 'note': {
      const n = data.notes.find((x) => x.id === id)
      return n ? { type, id, title: noteTitle(n.text), subtitle: n.tags.map((t) => `#${t}`).join(' '), text: n.text } : null
    }
    case 'asset': {
      const a = data.assets.find((x) => x.id === id)
      return a ? { type, id, title: a.name, subtitle: a.category, text: a.note } : null
    }
    case 'research': {
      const r = data.research.find((x) => x.id === id)
      return r ? { type, id, title: r.title, subtitle: `${r.sources.length}`, text: r.body } : null
    }
    case 'table': {
      const t = data.tables.find((x) => x.id === id)
      return t ? { type, id, title: t.name, subtitle: `${t.rows.length}`, text: '' } : null
    }
    case 'page': {
      const p = data.pages.find((x) => x.id === id)
      if (!p) return null
      const text = p.blocks
        .map((b) => {
          if ('text' in b) return b.text
          if (b.type === 'list') return b.items.join('\n')
          if (b.type === 'checklist') return b.items.map((i) => i.text).join('\n')
          return ''
        })
        .filter(Boolean)
        .join('\n')
      return { type, id, title: p.title, subtitle: p.icon, text }
    }
  }
}

/** Everything in a project that can be placed on the canvas. */
export function listRefs(data: Data, projectId: string): RefInfo[] {
  const mine = <T extends { projectId: string }>(items: T[]) => items.filter((i) => i.projectId === projectId)
  const out: RefInfo[] = []
  const add = (type: RefType, items: { id: string }[]) => {
    for (const item of items) {
      const info = describeRef(data, type, item.id)
      if (info) out.push(info)
    }
  }
  add('goal', mine(data.goals))
  add('page', mine(data.pages))
  add('table', mine(data.tables))
  add('note', mine(data.notes))
  add('research', mine(data.research))
  add('asset', mine(data.assets))
  return out
}

const mapProject = (data: Data, projectId: string, fn: (p: Project) => Project): Data => ({
  ...data,
  projects: data.projects.map((p) => (p.id === projectId ? fn(p) : p)),
})

const clamp = (n: number) => Math.max(-100000, Math.min(100000, Math.round(n)))

/** Puts an object on the canvas. An object appears at most once per project. */
export function addNode(data: Data, projectId: string, type: RefType, refId: string, x: number, y: number): Data {
  return mapProject(data, projectId, (p) => {
    if (p.graph.nodes.length >= MAX_NODES) return p
    if (p.graph.nodes.some((n) => n.ref.type === type && n.ref.id === refId)) return p
    const node = { id: uid(), ref: { type, id: refId }, x: clamp(x), y: clamp(y) }
    return { ...p, graph: { ...p.graph, nodes: [...p.graph.nodes, node] } }
  })
}

export const moveNode = (data: Data, projectId: string, nodeId: string, x: number, y: number): Data =>
  mapProject(data, projectId, (p) => ({
    ...p,
    graph: { ...p.graph, nodes: p.graph.nodes.map((n) => (n.id === nodeId ? { ...n, x: clamp(x), y: clamp(y) } : n)) },
  }))

export const deleteNode = (data: Data, projectId: string, nodeId: string): Data =>
  mapProject(data, projectId, (p) => ({
    ...p,
    graph: {
      nodes: p.graph.nodes.filter((n) => n.id !== nodeId),
      edges: p.graph.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    },
  }))

/** Connects two nodes. Self links and duplicates (in either direction) are ignored. */
export function addEdge(data: Data, projectId: string, from: string, to: string): Data {
  return mapProject(data, projectId, (p) => {
    const ids = new Set(p.graph.nodes.map((n) => n.id))
    if (from === to || !ids.has(from) || !ids.has(to)) return p
    if (p.graph.edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))) return p
    if (p.graph.edges.length >= 2000) return p
    return { ...p, graph: { ...p.graph, edges: [...p.graph.edges, { id: uid(), from, to }] } }
  })
}

export const deleteEdge = (data: Data, projectId: string, edgeId: string): Data =>
  mapProject(data, projectId, (p) => ({ ...p, graph: { ...p.graph, edges: p.graph.edges.filter((e) => e.id !== edgeId) } }))

/** Removes every canvas node that shows a deleted object, plus the connections to it. */
export function removeRefs(data: Data, type: RefType, refId: string): Data {
  if (!data.projects.some((p) => p.graph.nodes.some((n) => n.ref.type === type && n.ref.id === refId))) return data
  return {
    ...data,
    projects: data.projects.map((p) => {
      const gone = new Set(p.graph.nodes.filter((n) => n.ref.type === type && n.ref.id === refId).map((n) => n.id))
      if (gone.size === 0) return p
      return {
        ...p,
        graph: {
          nodes: p.graph.nodes.filter((n) => !gone.has(n.id)),
          edges: p.graph.edges.filter((e) => !gone.has(e.from) && !gone.has(e.to)),
        },
      }
    }),
  }
}

export const NODE_W = 220
export const NODE_H = 120

const TYPE_ORDER: RefType[] = ['goal', 'page', 'table', 'note', 'research', 'asset']

/** Simple tidy-up: one column per type, in a fixed order, keeping the current top-to-bottom order. */
export function autoLayout(data: Data, projectId: string): Data {
  return mapProject(data, projectId, (p) => {
    const columns = TYPE_ORDER.filter((t) => p.graph.nodes.some((n) => n.ref.type === t))
    const placed = new Map<string, { x: number; y: number }>()
    columns.forEach((type, col) => {
      p.graph.nodes
        .filter((n) => n.ref.type === type)
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .forEach((n, row) => placed.set(n.id, { x: col * (NODE_W + 60), y: row * (NODE_H + 40) }))
    })
    return { ...p, graph: { ...p.graph, nodes: p.graph.nodes.map((n) => ({ ...n, ...(placed.get(n.id) ?? {}) })) } }
  })
}
