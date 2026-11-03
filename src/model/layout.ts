import type { Data, Layout, Project } from './schema'

export const SECTIONS = [
  'overview',
  'goals',
  'brainstorm',
  'cheats',
  'concept',
  'inspiration',
  'models',
  'research',
  'audio',
  'assets',
  'notes',
  'pages',
  'tables',
  'nodes',
  'planner',
  'unity',
  'blender',
  'krita',
  'templates',
  'tutorial',
  'settings',
] as const
export type Section = (typeof SECTIONS)[number]

/** Settings must stay reachable, otherwise a hidden section could never be shown again. */
export const LOCKED: readonly Section[] = ['settings']

export const isSection = (value: unknown): value is Section => SECTIONS.some((s) => s === value)

export interface SectionEntry {
  id: Section
  /** Custom name, empty for the built-in one. */
  label: string
  visible: boolean
}

/** Stored layout merged with the defaults: unknown ids are dropped, sections added in newer versions appear at the end. */
export function resolveSections(project: Pick<Project, 'layout'> | null | undefined): SectionEntry[] {
  const out: SectionEntry[] = []
  for (const s of project?.layout.sections ?? []) {
    if (!isSection(s.id) || out.some((e) => e.id === s.id)) continue
    out.push({ id: s.id, label: LOCKED.includes(s.id) ? '' : s.label, visible: LOCKED.includes(s.id) || s.visible })
  }
  for (const id of SECTIONS) {
    if (!out.some((e) => e.id === id)) out.push({ id, label: '', visible: true })
  }
  // Settings always closes the list.
  const settings = out.filter((e) => e.id === 'settings')
  return [...out.filter((e) => e.id !== 'settings'), ...settings]
}

const store = (entries: SectionEntry[]): Layout => ({
  // Not trimmed here: the label is stored while the user types (trailing spaces between words).
  sections: entries.map((e) => ({ id: e.id, label: e.label.slice(0, 60), visible: e.visible })),
})

const mapLayout = (data: Data, projectId: string, fn: (entries: SectionEntry[]) => SectionEntry[]): Data => ({
  ...data,
  projects: data.projects.map((p) => (p.id === projectId ? { ...p, layout: store(fn(resolveSections(p))) } : p)),
})

export const setSectionVisible = (data: Data, projectId: string, id: Section, visible: boolean): Data =>
  mapLayout(data, projectId, (es) => es.map((e) => (e.id === id && !LOCKED.includes(id) ? { ...e, visible } : e)))

export const renameSection = (data: Data, projectId: string, id: Section, label: string): Data =>
  mapLayout(data, projectId, (es) => es.map((e) => (e.id === id && !LOCKED.includes(id) ? { ...e, label } : e)))

/** Moves `id` to the position of `overId`. */
export function moveSection(data: Data, projectId: string, id: Section, overId: Section): Data {
  if (LOCKED.includes(id) || LOCKED.includes(overId) || id === overId) return data
  return mapLayout(data, projectId, (es) => {
    const from = es.findIndex((e) => e.id === id)
    const to = es.findIndex((e) => e.id === overId)
    if (from < 0 || to < 0) return es
    const next = [...es]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
  })
}

export const resetLayout = (data: Data, projectId: string): Data => ({
  ...data,
  projects: data.projects.map((p) => (p.id === projectId ? { ...p, layout: { sections: [] } } : p)),
})
