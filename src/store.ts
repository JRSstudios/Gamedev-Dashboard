import { useSyncExternalStore } from 'react'
import { parseData } from './model/migrate'
import { isSection, type Section } from './model/layout'
import { emptyData, type Data } from './model/schema'
import { createAdapter } from './storage'

export { SECTIONS, type Section } from './model/layout'

export type Status =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string; raw: string | null }

interface State {
  status: Status
  data: Data
  activeProjectId: string | null
  section: Section
  /** Which page/table is open in the Pages/Tables sections, and the node to focus on the canvas. */
  focus: { pageId: string | null; tableId: string | null; cheatId: string | null; modelId: string | null }
  saveError: string | null
  notice: string | null
  /** Optional button in the toast, e.g. "Undo". */
  noticeAction: { label: string; run: () => void } | null
  /** App-wide dialog opened from anywhere (onboarding). */
  dialog: 'connectClaude' | null
}

const ACTIVE_KEY = 'gamedev-dashboard.activeProject'
const SECTION_KEY = 'gamedev-dashboard.section'

function readSection(): Section {
  try {
    const stored = localStorage.getItem(SECTION_KEY)
    return isSection(stored) ? stored : 'overview'
  } catch {
    return 'overview'
  }
}
const SAVE_DELAY_MS = 250

const adapter = createAdapter()
let state: State = { status: { phase: 'loading' }, data: emptyData(), activeProjectId: null, section: readSection(), focus: { pageId: null, tableId: null, cheatId: null, modelId: null }, saveError: null, notice: null, noticeAction: null, dialog: null }
const listeners = new Set<() => void>()

function setState(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

// ---- persistence ----------------------------------------------------------

let saveTimer: ReturnType<typeof setTimeout> | undefined
let saving: Promise<void> = Promise.resolve()

function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flush, SAVE_DELAY_MS)
}

function flush(): Promise<void> {
  clearTimeout(saveTimer)
  if (state.status.phase !== 'ready') return saving
  const json = JSON.stringify(state.data)
  // Serialise writes so an older snapshot can never land after a newer one.
  saving = saving
    .then(() => adapter.save(json))
    .then(() => setState({ saveError: null }))
    .catch((e: unknown) => setState({ saveError: String(e) }))
  return saving
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush()
  })
}

let initPromise: Promise<void> | null = null
/** Idempotent: React StrictMode runs effects twice in development. */
export function init(): Promise<void> {
  initPromise ??= load()
  return initPromise
}

async function load(): Promise<void> {
  try {
    const raw = await adapter.load()
    const data = raw ? parseData(raw) : emptyData()
    let active: string | null = null
    try {
      active = localStorage.getItem(ACTIVE_KEY)
    } catch {
      /* storage unavailable */
    }
    if (!data.projects.some((p) => p.id === active && !p.archived)) {
      active = data.projects.find((p) => !p.archived)?.id ?? null
    }
    setState({ data, activeProjectId: active, status: { phase: 'ready' } })
  } catch (e) {
    // Never overwrite data we could not read: stay in the error phase until the user decides.
    const raw = await adapter.load().catch(() => null)
    setState({ status: { phase: 'error', message: e instanceof Error ? e.message : String(e), raw } })
  }
}

/** Escape hatch from the error screen; the unreadable file stays untouched until the next save. */
export function startFresh() {
  setState({ data: emptyData(), activeProjectId: null, status: { phase: 'ready' } })
}

// ---- public API -----------------------------------------------------------

/** Apply a pure transformation from `model/ops` and autosave. */
export function mutate(fn: (data: Data) => Data) {
  const next = fn(state.data)
  if (next === state.data) return
  setState({ data: next })
  scheduleSave()
}

export function replaceData(json: string) {
  const data = parseData(json)
  const active = data.projects.find((p) => !p.archived)?.id ?? null
  setState({ data, activeProjectId: active })
  scheduleSave()
}

export function setSection(section: Section) {
  setState({ section })
  try {
    localStorage.setItem(SECTION_KEY, section)
  } catch {
    /* ignore */
  }
}

/** Opens a page or table in its section. */
const OPEN_TARGETS = {
  page: ['pageId', 'pages'],
  table: ['tableId', 'tables'],
  cheat: ['cheatId', 'cheats'],
  model: ['modelId', 'models'],
} as const

export function openItem(kind: keyof typeof OPEN_TARGETS, id: string) {
  const [field, section] = OPEN_TARGETS[kind]
  setState({ focus: { ...state.focus, [field]: id }, section })
  try {
    localStorage.setItem(SECTION_KEY, state.section)
  } catch {
    /* ignore */
  }
}

export const openDialog = (dialog: State['dialog']) => setState({ dialog })

export const setFocus = (patch: Partial<State['focus']>) => setState({ focus: { ...state.focus, ...patch } })

export function setActiveProject(id: string | null) {
  setState({ activeProjectId: id })
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    /* ignore */
  }
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined
/** Shows a transient message in the toast. */
export function notify(message: string, action: { label: string; run: () => void } | null = null) {
  clearTimeout(noticeTimer)
  setState({ notice: message, noticeAction: action })
  noticeTimer = setTimeout(() => setState({ notice: null, noticeAction: null }), action ? 9000 : 6000)
}

export const getData =(): Data => state.data

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => selector(state),
  )
}

// Dev builds only: lets the scripted desktop tests set up data through the normal store path.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __gdTest: unknown }).__gdTest = { mutate, getData }
}
