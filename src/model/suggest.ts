import { deadlineRisks, hasAvailability } from './availability'
import { classify } from './classify'
import type { AssetCategory, Data } from './schema'

/**
 * Automatic hints for the hub, worked out locally from the project data (no AI, nothing sent).
 * Every hint has a stable id, so a dismissed hint stays dismissed.
 */

export type SuggestionKind = 'deadline' | 'noEstimate' | 'noSteps' | 'stale' | 'category' | 'missing' | 'unityErrors' | 'modelCheck'

export interface Suggestion {
  id: string
  kind: SuggestionKind
  /** Values for the translated text. */
  params: Record<string, string | number>
  /** What the action button refers to. */
  goalId?: string
  assetId?: string
  category?: AssetCategory
  message?: string
}

export interface SuggestContext {
  now?: Date
  /** Asset ids whose file is gone. */
  missing?: ReadonlySet<string>
  unityErrors?: { count: number; first: string }
  /** Exported models with problems from the Blender check. */
  modelIssues?: { name: string; count: number }[]
}

const DAY = 86400000
const MAX = 12

export function suggestions(data: Data, projectId: string, ctx: SuggestContext = {}): Suggestion[] {
  const project = data.projects.find((p) => p.id === projectId)
  if (!project) return []
  const now = ctx.now ?? new Date()
  const out: Suggestion[] = []
  const goals = data.goals.filter((g) => g.projectId === projectId && !g.archived)

  if (ctx.unityErrors && ctx.unityErrors.count > 0)
    out.push({ id: `s:unity:${ctx.unityErrors.first.slice(0, 80)}`, kind: 'unityErrors', params: { n: ctx.unityErrors.count, message: ctx.unityErrors.first.slice(0, 120) }, message: ctx.unityErrors.first })

  for (const r of deadlineRisks(data, projectId, now))
    out.push({ id: `s:deadline:${r.goal.id}:${r.goal.deadline}`, kind: 'deadline', params: { goal: r.goal.title, needed: r.needed, available: r.available }, goalId: r.goal.id })

  if (hasAvailability(data.settings.availability))
    for (const g of goals.filter((g) => g.deadline && g.estimateHours === null && g.steps.some((s) => !s.done)))
      out.push({ id: `s:estimate:${g.id}`, kind: 'noEstimate', params: { goal: g.title }, goalId: g.id })

  for (const g of goals) {
    const age = now.getTime() - new Date(g.createdAt).getTime()
    if (g.steps.length === 0 && age > DAY) out.push({ id: `s:steps:${g.id}`, kind: 'noSteps', params: { goal: g.title }, goalId: g.id })
    const open = g.steps.some((s) => !s.done)
    const lastStep = Math.max(new Date(g.createdAt).getTime(), ...g.steps.map((s) => (s.doneAt ? new Date(s.doneAt).getTime() : 0)))
    const lastSession = Math.max(0, ...data.sessions.filter((s) => s.goalId === g.id).map((s) => new Date(s.end).getTime()))
    const idle = Math.floor((now.getTime() - Math.max(lastStep, lastSession)) / DAY)
    if (open && idle >= 14) out.push({ id: `s:stale:${g.id}:${Math.floor(idle / 14)}`, kind: 'stale', params: { goal: g.title, days: idle }, goalId: g.id })
  }

  for (const m of ctx.modelIssues ?? []) out.push({ id: `s:model:${m.name}:${m.count}`, kind: 'modelCheck', params: { name: m.name, n: m.count } })

  for (const a of data.assets) {
    if (a.projectId !== projectId) continue
    if (ctx.missing?.has(a.id)) out.push({ id: `s:missing:${a.id}`, kind: 'missing', params: { name: a.name }, assetId: a.id })
    if (a.kind === 'link') continue
    const c = classify(a.name, a.kind, a.path ?? '', data.settings.learned)
    // Only speak up when there is a concrete word behind the guess.
    if (c.category !== a.category && c.reason && c.confidence >= (a.category === 'other' ? 0.5 : 0.75))
      out.push({ id: `s:cat:${a.id}:${c.category}`, kind: 'category', params: { name: a.name, category: c.category, word: c.reason }, assetId: a.id, category: c.category })
  }

  const dismissed = new Set(project.inboxDismissed)
  return out.filter((s) => !dismissed.has(s.id)).slice(0, MAX)
}
