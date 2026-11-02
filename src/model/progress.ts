import type { Data, Goal } from './schema'

export interface Progress {
  done: number
  total: number
  pct: number
}

function fromGoals(goals: Goal[]): Progress {
  let done = 0
  let total = 0
  for (const goal of goals) {
    if (goal.archived) continue
    total += goal.steps.length
    done += goal.steps.filter((s) => s.done).length
  }
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}

export const goalProgress = (goal: Goal): Progress => fromGoals([{ ...goal, archived: false }])

export const projectProgress = (data: Data, projectId: string): Progress =>
  fromGoals(data.goals.filter((g) => g.projectId === projectId))

export function totalProgress(data: Data): Progress {
  const active = new Set(data.projects.filter((p) => !p.archived).map((p) => p.id))
  return fromGoals(data.goals.filter((g) => active.has(g.projectId)))
}
