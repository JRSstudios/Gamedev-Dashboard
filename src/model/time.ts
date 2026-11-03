import type { Data, Session } from './schema'

/** Local-calendar helpers. Days are keyed as `YYYY-MM-DD` in the user's time zone. */

const pad = (n: number) => String(n).padStart(2, '0')

export const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Local day of an ISO timestamp. */
export const dayOf = (iso: string): string => dayKey(new Date(iso))

/** Monday 00:00 of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h${pad(m % 60)}`
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const mm = pad(Math.floor((s % 3600) / 60))
  const ss = pad(s % 60)
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const sum = (sessions: Session[]) => sessions.reduce((total, s) => total + s.minutes, 0)

export function minutesOnDay(data: Data, day: string, projectId?: string | null): number {
  return sum(data.sessions.filter((s) => dayOf(s.start) === day && (!projectId || s.projectId === projectId)))
}

export function minutesThisWeek(data: Data, now: Date): number {
  const from = startOfWeek(now).getTime()
  return sum(data.sessions.filter((s) => new Date(s.start).getTime() >= from))
}

/** Minutes per local day for one project, used for the calendar heat map. */
export function minutesByDay(data: Data, projectId: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of data.sessions) {
    if (s.projectId !== projectId) continue
    const key = dayOf(s.start)
    map.set(key, (map.get(key) ?? 0) + s.minutes)
  }
  return map
}

/** 0 = nothing, 1-4 = increasing intensity. */
export function intensity(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0
  if (minutes < 30) return 1
  if (minutes < 60) return 2
  if (minutes < 120) return 3
  return 4
}

/** Cells of a Monday-first month grid: leading/trailing days from neighbouring months included. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = startOfWeek(first)
  const weeks = Math.ceil((((first.getDay() + 6) % 7) + new Date(year, month + 1, 0).getDate()) / 7)
  return Array.from({ length: weeks * 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}
