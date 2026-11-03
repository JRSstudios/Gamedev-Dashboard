import type { Availability, Data, Goal, TimeBlock } from './schema'
import { dayKey, minutesByDay } from './time'

/**
 * How much gamedev time the user has: weekly blocks (work/school and gamedev) plus days that
 * differ. Times are wall-clock times, so a day keeps its hours across daylight saving changes.
 */

const toMinutes = (clock: string): number => {
  const [h, m] = clock.split(':').map(Number)
  return h * 60 + m
}

type Range = [number, number]

function union(ranges: Range[]): Range[] {
  const sorted = ranges.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0])
  const out: Range[] = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else out.push([r[0], r[1]])
  }
  return out
}

const total = (ranges: Range[]) => ranges.reduce((s, [a, b]) => s + b - a, 0)
const rangesOf = (blocks: TimeBlock[], kind: TimeBlock['kind']): Range[] =>
  union(blocks.filter((b) => b.kind === kind).map((b) => [toMinutes(b.from), toMinutes(b.to)]))

/** Gamedev minutes in a list of blocks; work time that overlaps a gamedev block does not count. */
export function gamedevMinutes(blocks: TimeBlock[]): number {
  const work = rangesOf(blocks, 'work')
  let minutes = 0
  for (const [a, b] of rangesOf(blocks, 'gamedev')) {
    const overlap = work.reduce((s, [x, y]) => s + Math.max(0, Math.min(b, y) - Math.max(a, x)), 0)
    minutes += b - a - overlap
  }
  return minutes
}

export const workMinutes = (blocks: TimeBlock[]): number => total(rangesOf(blocks, 'work'))

/** Blocks for a local day: an exception for that date replaces the weekly plan. */
export function blocksOn(av: Availability, day: Date): TimeBlock[] {
  const key = dayKey(day)
  return av.exceptions.find((e) => e.date === key)?.blocks ?? av.weekly[(day.getDay() + 6) % 7] ?? []
}

export const availableOn = (av: Availability, day: Date): number => gamedevMinutes(blocksOn(av, day))

/** Gamedev minutes from `from` to `to`, both local days included. */
export function availableBetween(av: Availability, from: Date, to: Date): number {
  let minutes = 0
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  for (let guard = 0; d.getTime() <= end && guard < 3700; guard++) {
    minutes += availableOn(av, d)
    d.setDate(d.getDate() + 1)
  }
  return minutes
}

export interface DayPlan {
  key: string
  date: Date
  available: number
  work: number
  done: number
}

/** One entry per day from `from` for `days` days, with time logged in the project. */
export function plan(data: Data, projectId: string | null, from: Date, days: number): DayPlan[] {
  const av = data.settings.availability
  let done = projectId ? minutesByDay(data, projectId) : null
  if (!done) {
    done = new Map<string, number>()
    for (const s of data.sessions) {
      const key = dayKey(new Date(s.start))
      done.set(key, (done.get(key) ?? 0) + s.minutes)
    }
  }
  const logged = done
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)
    const key = dayKey(date)
    const blocks = blocksOn(av, date)
    return { key, date, available: gamedevMinutes(blocks), work: workMinutes(blocks), done: logged.get(key) ?? 0 }
  })
}

export const hasAvailability = (av: Availability): boolean => av.weekly.some((d) => d.length > 0) || av.exceptions.length > 0

const day = (...blocks: [string, string, TimeBlock['kind']][]): TimeBlock[] => blocks.map(([from, to, kind]) => ({ from, to, kind }))

/** Starting points the user can adjust. */
export const AVAILABILITY_TEMPLATES = {
  student: () => {
    const weekday = day(['08:00', '14:00', 'work'], ['16:00', '18:00', 'gamedev'])
    return [weekday, weekday, weekday, weekday, weekday, day(['10:00', '14:00', 'gamedev']), day(['14:00', '17:00', 'gamedev'])]
  },
  fulltime: () => {
    const weekday = day(['08:00', '17:00', 'work'], ['19:30', '21:00', 'gamedev'])
    return [weekday, weekday, weekday, weekday, weekday, day(['10:00', '13:00', 'gamedev']), day(['14:00', '16:00', 'gamedev'])]
  },
  weekend: () => [[], [], [], [], [], day(['09:00', '13:00', 'gamedev'], ['14:00', '17:00', 'gamedev']), day(['10:00', '14:00', 'gamedev'])],
} satisfies Record<string, () => TimeBlock[][]>

export type AvailabilityTemplate = keyof typeof AVAILABILITY_TEMPLATES

export const setWeekly = (data: Data, weekly: TimeBlock[][]): Data => ({
  ...data,
  settings: { ...data.settings, availability: { ...data.settings.availability, weekly: weekly.slice(0, 7).map((d) => d.slice(0, 12)) } },
})

/** Sets (or with `null` removes) the blocks for one date. */
export function setException(data: Data, date: string, blocks: TimeBlock[] | null, note = ''): Data {
  const rest = data.settings.availability.exceptions.filter((e) => e.date !== date)
  const exceptions = blocks ? [...rest, { date, blocks: blocks.slice(0, 12), note: note.slice(0, 200) }].sort((a, b) => a.date.localeCompare(b.date)).slice(-1000) : rest
  return { ...data, settings: { ...data.settings, availability: { ...data.settings.availability, exceptions } } }
}

// ---- time budgets ----------------------------------------------------------

/** Hours already logged on a goal. */
export const spentOnGoal = (data: Data, goalId: string): number => data.sessions.filter((s) => s.goalId === goalId).reduce((m, s) => m + s.minutes, 0) / 60

/** Hours already logged on a section of a project. */
export const spentOnSection = (data: Data, projectId: string, section: string): number =>
  data.sessions.filter((s) => s.projectId === projectId && s.section === section).reduce((m, s) => m + s.minutes, 0) / 60

export interface GoalRisk {
  goal: Goal
  /** Hours still needed for this goal and every goal due before it. */
  needed: number
  /** Gamedev hours from today until the goal's deadline. */
  available: number
}

/**
 * Goals with a deadline and an estimate, in deadline order. A goal is at risk when the remaining
 * hours of it and all earlier goals do not fit into the available hours until its deadline.
 */
export function deadlineRisks(data: Data, projectId: string, now = new Date()): GoalRisk[] {
  const goals = data.goals
    .filter((g) => g.projectId === projectId && !g.archived && g.deadline && g.estimateHours !== null && (g.steps.length === 0 || g.steps.some((s) => !s.done)))
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
  if (!hasAvailability(data.settings.availability)) return []
  let needed = 0
  const out: GoalRisk[] = []
  for (const goal of goals) {
    needed += Math.max(0, (goal.estimateHours ?? 0) - spentOnGoal(data, goal.id))
    const deadline = new Date(`${goal.deadline!.slice(0, 10)}T00:00:00`)
    const available = deadline < now ? 0 : availableBetween(data.settings.availability, now, deadline) / 60
    if (needed > available) out.push({ goal, needed: Math.round(needed * 10) / 10, available: Math.round(available * 10) / 10 })
  }
  return out
}
