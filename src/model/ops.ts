import type {
  Asset,
  AssetCategory,
  AssetKind,
  Data,
  Goal,
  Note,
  Project,
  Settings,
} from './schema'

/** Pure, immutable operations on `Data`. The store wraps these. */

export const newId = (): string => crypto.randomUUID()
const now = (): string => new Date().toISOString()

export const PROJECT_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444']

const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus']
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'psd', 'kra', 'ase', 'aseprite']
const MODEL_EXT = ['fbx', 'obj', 'blend', 'gltf', 'glb', 'dae']
const DOC_EXT = ['md', 'txt', 'pdf', 'docx']

export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

export function guessKind(name: string): AssetKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (AUDIO_EXT.includes(ext)) return 'audio'
  if (IMAGE_EXT.includes(ext)) return 'image'
  if (MODEL_EXT.includes(ext)) return 'model'
  if (DOC_EXT.includes(ext)) return 'doc'
  return 'other'
}

export function guessCategory(kind: AssetKind): AssetCategory {
  if (kind === 'audio') return 'music'
  if (kind === 'image') return 'concept'
  return 'other'
}

export function extractTags(text: string): string[] {
  const found = new Set<string>()
  for (const m of text.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]{1,32})/gu)) {
    found.add(m[1].toLowerCase())
  }
  return [...found]
}

export function sanitizeTag(tag: string): string {
  return tag.trim().replace(/^#/, '').toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 32)
}

// ---- projects -------------------------------------------------------------

export function addProject(data: Data, name: string): { data: Data; project: Project } {
  const project: Project = {
    id: newId(),
    name: name.trim().slice(0, 100) || 'Untitled',
    color: PROJECT_COLORS[data.projects.length % PROJECT_COLORS.length],
    archived: false,
    createdAt: now(),
  }
  return { data: { ...data, projects: [...data.projects, project] }, project }
}

export const updateProject = (data: Data, id: string, patch: Partial<Omit<Project, 'id'>>): Data => ({
  ...data,
  projects: data.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
})

export const deleteProject = (data: Data, id: string): Data => {
  const goalIds = new Set(data.goals.filter((g) => g.projectId === id).map((g) => g.id))
  return {
    ...data,
    projects: data.projects.filter((p) => p.id !== id),
    goals: data.goals.filter((g) => g.projectId !== id),
    notes: data.notes.filter((n) => n.projectId !== id),
    assets: data.assets.filter((a) => a.projectId !== id),
    sessions: data.sessions.filter((s) => !s.goalId || !goalIds.has(s.goalId)),
  }
}

// ---- goals & steps --------------------------------------------------------

export function addGoal(data: Data, projectId: string, title: string): Data {
  const goal: Goal = {
    id: newId(),
    projectId,
    title: title.trim().slice(0, 200),
    deadline: null,
    archived: false,
    createdAt: now(),
    steps: [],
  }
  return { ...data, goals: [...data.goals, goal] }
}

export const updateGoal = (data: Data, id: string, patch: Partial<Pick<Goal, 'title' | 'deadline' | 'archived'>>): Data => ({
  ...data,
  goals: data.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
})

export const deleteGoal = (data: Data, id: string): Data => ({
  ...data,
  goals: data.goals.filter((g) => g.id !== id),
  notes: data.notes.map((n) => (n.goalId === id ? { ...n, goalId: null } : n)),
})

const mapGoal = (data: Data, id: string, fn: (g: Goal) => Goal): Data => ({
  ...data,
  goals: data.goals.map((g) => (g.id === id ? fn(g) : g)),
})

export const addSteps = (data: Data, goalId: string, titles: string[]): Data =>
  mapGoal(data, goalId, (g) => ({
    ...g,
    steps: [
      ...g.steps,
      ...titles
        .map((t) => t.trim().slice(0, 300))
        .filter(Boolean)
        .map((title) => ({ id: newId(), title, done: false, doneAt: null })),
    ],
  }))

export const toggleStep = (data: Data, goalId: string, stepId: string): Data =>
  mapGoal(data, goalId, (g) => ({
    ...g,
    steps: g.steps.map((s) =>
      s.id === stepId ? { ...s, done: !s.done, doneAt: s.done ? null : now() } : s,
    ),
  }))

export const deleteStep = (data: Data, goalId: string, stepId: string): Data =>
  mapGoal(data, goalId, (g) => ({ ...g, steps: g.steps.filter((s) => s.id !== stepId) }))

/** Moves `activeId` to the position of `overId` among the project's goals. */
export function reorderGoals(data: Data, activeId: string, overId: string): Data {
  const from = data.goals.findIndex((g) => g.id === activeId)
  const to = data.goals.findIndex((g) => g.id === overId)
  if (from < 0 || to < 0 || from === to) return data
  const goals = [...data.goals]
  const [moved] = goals.splice(from, 1)
  goals.splice(to, 0, moved)
  return { ...data, goals }
}

// ---- assets ---------------------------------------------------------------

export function newAsset(projectId: string, name: string, path: string | null, category?: AssetCategory): Asset {
  const kind = guessKind(name)
  return {
    id: newId(),
    projectId,
    kind,
    path,
    name: name.slice(0, 300),
    category: category ?? guessCategory(kind),
    tags: [],
    note: '',
    addedAt: now(),
  }
}

export const addAssets = (data: Data, assets: Asset[]): Data => ({ ...data, assets: [...data.assets, ...assets] })

export const updateAsset = (data: Data, id: string, patch: Partial<Pick<Asset, 'name' | 'category' | 'tags' | 'note'>>): Data => ({
  ...data,
  assets: data.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
})

export const deleteAsset = (data: Data, id: string): Data => ({
  ...data,
  assets: data.assets.filter((a) => a.id !== id),
  notes: data.notes.map((n) => (n.assetId === id ? { ...n, assetId: null } : n)),
})

/**
 * Drops `activeId` into `category`, before `beforeId` when given, otherwise at the end.
 */
export function moveAsset(data: Data, activeId: string, category: AssetCategory, beforeId: string | null): Data {
  const active = data.assets.find((a) => a.id === activeId)
  if (!active || activeId === beforeId) return data
  const rest = data.assets.filter((a) => a.id !== activeId)
  const moved = { ...active, category }
  const at = beforeId ? rest.findIndex((a) => a.id === beforeId) : -1
  if (at < 0) return { ...data, assets: [...rest, moved] }
  rest.splice(at, 0, moved)
  return { ...data, assets: rest }
}

// ---- notes ----------------------------------------------------------------

export function addNote(data: Data, projectId: string, text: string, goalId: string | null): Data {
  const body = text.trim().slice(0, 20000)
  if (!body) return data
  const note: Note = {
    id: newId(),
    projectId,
    text: body,
    tags: extractTags(body),
    goalId,
    assetId: null,
    createdAt: now(),
  }
  return { ...data, notes: [note, ...data.notes] }
}

export const setNoteTags = (data: Data, id: string, tags: string[]): Data => ({
  ...data,
  notes: data.notes.map((n) => (n.id === id ? { ...n, tags: [...new Set(tags.map(sanitizeTag).filter(Boolean))].slice(0, 50) } : n)),
})

export const deleteNote = (data: Data, id: string): Data => ({
  ...data,
  notes: data.notes.filter((n) => n.id !== id),
})

// ---- settings -------------------------------------------------------------

export const updateSettings = (data: Data, patch: Partial<Settings>): Data => ({
  ...data,
  settings: { ...data.settings, ...patch },
})
