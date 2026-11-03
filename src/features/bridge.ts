import { useEffect, useSyncExternalStore } from 'react'
import type { TFn } from '../i18n'
import type { Project } from '../model/schema'
import {
  bridgeEnqueue,
  bridgeInfo,
  bridgeSetConfig,
  bridgeSetEnabled,
  IS_DESKTOP,
  onBridgeEvent,
  type BridgeApp,
  type BridgeEvent,
} from '../platform'
import { unitySubFolder } from './transfer'

/** A plugin counts as connected when it polled within this many seconds. */
const CONNECTED_SECONDS = 12
const MAX_LOGS = 100

export interface UnityLog {
  level: 'error' | 'warning'
  message: string
  stack: string
  at: number
}

export interface CheckIssue {
  code: string
  object: string
  count?: number
}

export interface ModelCheck {
  triangles: number
  objects: number
  issues: CheckIssue[]
  at: number
}

export interface BridgeState {
  seen: Partial<Record<BridgeApp, number>>
  unityLogs: UnityLog[]
  compileErrors: number | null
  scenes: { path: string; enabled: boolean }[]
  /** Model checks from the Blender add-on, keyed by the exported file (see `pathKey`). */
  checks: Record<string, ModelCheck>
  /** Increments with every export event, so inboxes know to look again. */
  exports: number
  /** Result of the last Unity build started from the dashboard. */
  build?: { result: string; reason: string; errors: number; warnings: number; seconds: number; path: string; at: number }
}

let state: BridgeState = { seen: {}, unityLogs: [], compileErrors: null, scenes: [], checks: {}, exports: 0 }
const listeners = new Set<() => void>()
const set = (patch: Partial<BridgeState>) => {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}

export const pathKey = (p: string): string => p.replace(/\\/g, '/').toLowerCase()

export function useBridge<T>(selector: (s: BridgeState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => selector(state),
  )
}

export const isConnected = (seen: BridgeState['seen'], app: BridgeApp, now = Date.now() / 1000): boolean =>
  (seen[app] ?? 0) > now - CONNECTED_SECONDS

const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : '')
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

function readCheck(data: Record<string, unknown>, at: number): ModelCheck | null {
  if (!Array.isArray(data.issueCodes)) return null
  const issues = data.issueCodes
    .slice(0, 100)
    .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
    .map((i) => ({ code: str(i.code, 40), object: str(i.object, 200), ...(typeof i.count === 'number' ? { count: i.count } : {}) }))
  return { triangles: num(data.triangles), objects: num(data.objects), issues, at }
}

/** Applies one plugin event to the in-memory state. Pure enough to test with plain objects. */
export function applyEvent(s: BridgeState, e: BridgeEvent): BridgeState {
  const seen = { ...s.seen, [e.app]: e.at }
  const data = e.data ?? {}
  if (e.app === 'unity' && e.type === 'log') {
    const log: UnityLog = { level: data.level === 'warning' ? 'warning' : 'error', message: str(data.message), stack: str(data.stack), at: e.at }
    return { ...s, seen, unityLogs: [log, ...s.unityLogs].slice(0, MAX_LOGS) }
  }
  if (e.app === 'unity' && e.type === 'build')
    return { ...s, seen, build: { result: str(data.result, 40), reason: str(data.reason, 40), errors: num(data.errors), warnings: num(data.warnings), seconds: num(data.seconds), path: str(data.path, 2000), at: e.at } }
  if (e.app === 'unity' && e.type === 'compiled') return { ...s, seen, compileErrors: num(data.errors) }
  if (e.app === 'unity' && e.type === 'scenes' && Array.isArray(data.buildScenes)) {
    const scenes = data.buildScenes
      .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
      .slice(0, 200)
      .map((x) => ({ path: str(x.path, 500), enabled: x.enabled === true }))
    return { ...s, seen, scenes }
  }
  if (e.type === 'exported' || e.type === 'check') {
    const check = readCheck(data, e.at)
    const path = str(data.path, 2000)
    const checks = check && (path || str(data.blend)) ? { ...s.checks, [pathKey(path || str(data.blend))]: check } : s.checks
    return { ...s, seen, checks, exports: e.type === 'exported' ? s.exports + 1 : s.exports }
  }
  return { ...s, seen }
}

export const clearUnityLogs = () => set({ unityLogs: [] })

let started = false

/** Listens for plugin events and keeps the "last seen" times fresh. Call once when the app is ready. */
export function startBridge(onEvent: (e: BridgeEvent) => void): void {
  if (!IS_DESKTOP || started) return
  started = true
  void onBridgeEvent((e) => {
    set(applyEvent(state, e))
    onEvent(e)
  })
  const refresh = () =>
    void bridgeInfo()
      .then((info) => set({ seen: { ...state.seen, ...info.seen } }))
      .catch(() => {})
  refresh()
  window.setInterval(refresh, 5000)
}

/** What each plugin needs to know about the active project. */
export function bridgeConfig(project: Project | null): Record<string, unknown> {
  if (!project) return {}
  const i = project.integrations
  const folder = (cat: string) => unitySubFolder(project, cat)
  return {
    project: project.name,
    unity: {
      pixelArt: i.pixelArt,
      ppu: i.pixelsPerUnit,
      folders: { concept: folder('concept'), inspiration: folder('inspiration'), reference: folder('reference'), music: folder('music'), sfx: folder('sfx'), model: folder('model') },
    },
    blender: { exportDir: i.blenderExportDir ?? '' },
    krita: { exportDir: i.kritaDir ?? '' },
  }
}

/** Keeps the plugin settings in Rust in step with the active project and the on/off switch. */
export function useBridgeConfigSync(project: Project | null, enabled: boolean): void {
  const config = JSON.stringify(bridgeConfig(project))
  useEffect(() => {
    if (!IS_DESKTOP) return
    void bridgeSetConfig(JSON.parse(config) as Record<string, unknown>).catch(() => {})
  }, [config])
  useEffect(() => {
    if (IS_DESKTOP) void bridgeSetEnabled(enabled).catch(() => {})
  }, [enabled])
}

/** Asks a plugin to do something; it picks the job up within a few seconds. */
export const sendJob = (app: BridgeApp, job: Record<string, unknown>): Promise<void> => (IS_DESKTOP ? bridgeEnqueue(app, job) : Promise.resolve())

/** Translated text for one issue from the Blender model check. */
export function checkIssueText(t: TFn, issue: CheckIssue): string {
  const known = ['scale', 'negative_scale', 'rotation', 'no_uv', 'ngons', 'high_poly'] as const
  const code = known.find((k) => k === issue.code)
  return code ? t(`check_${code}`, { object: issue.object, n: issue.count ?? 0 }) : `${issue.object}: ${issue.code}`
}
