import { estimateCost } from '../ai/pricing'
import type { Data, Usage } from './schema'

export const MAX_USAGE = 5000

/** Stores one Claude request. The oldest entries are dropped once the log is full. */
export function addUsage(data: Data, entry: Omit<Usage, 'at'> & { at?: string }): Data {
  const item: Usage = { ...entry, at: entry.at ?? new Date().toISOString(), command: entry.command.slice(0, 40), model: entry.model.slice(0, 100) }
  return { ...data, usage: [...data.usage, item].slice(-MAX_USAGE) }
}

export interface UsageTotals {
  requests: number
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  /** Estimated dollars; entries with an unknown model are left out. */
  cost: number
}

const empty = (): UsageTotals => ({ requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 })

function add(t: UsageTotals, u: Usage): UsageTotals {
  return {
    requests: t.requests + 1,
    input: t.input + u.input,
    output: t.output + u.output,
    cacheRead: t.cacheRead + u.cacheRead,
    cacheWrite: t.cacheWrite + u.cacheWrite,
    cost: t.cost + (estimateCost(u.model, u) ?? 0),
  }
}

const localDay = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface UsageSummary {
  today: UsageTotals
  month: UsageTotals
  total: UsageTotals
  byModel: [string, UsageTotals][]
  byCommand: [string, UsageTotals][]
  /** Last `days` days, oldest first, including days without requests. */
  byDay: { day: string; totals: UsageTotals }[]
}

export function summarizeUsage(usage: Usage[], now: Date = new Date(), days = 30): UsageSummary {
  const today = localDay(now.toISOString())
  const month = today.slice(0, 7)
  let t = empty()
  let m = empty()
  let all = empty()
  const models = new Map<string, UsageTotals>()
  const commands = new Map<string, UsageTotals>()
  const perDay = new Map<string, UsageTotals>()
  for (const u of usage) {
    const day = localDay(u.at)
    all = add(all, u)
    if (day === today) t = add(t, u)
    if (day.startsWith(month)) m = add(m, u)
    models.set(u.model, add(models.get(u.model) ?? empty(), u))
    commands.set(u.command, add(commands.get(u.command) ?? empty(), u))
    perDay.set(day, add(perDay.get(day) ?? empty(), u))
  }
  const byDay: UsageSummary['byDay'] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = localDay(d.toISOString())
    byDay.push({ day: key, totals: perDay.get(key) ?? empty() })
  }
  const sorted = (map: Map<string, UsageTotals>) => [...map.entries()].sort((a, b) => b[1].cost - a[1].cost || b[1].input - a[1].input)
  return { today: t, month: m, total: all, byModel: sorted(models), byCommand: sorted(commands), byDay }
}

/** True when the estimated spend this month has reached the limit set in Settings. */
export function overMonthlyLimit(data: Data, now: Date = new Date()): boolean {
  const limit = data.settings.claude.monthlyLimitUsd
  if (limit === null) return false
  return summarizeUsage(data.usage, now, 1).month.cost >= limit
}
