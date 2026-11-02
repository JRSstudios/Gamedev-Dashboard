import { startTimer, stopTimer } from './model/ops'
import { getData, mutate } from './store'

/** Remembers the last choices so the Ctrl+T shortcut can start a timer without opening a form. */
export const timerPrefs: { goalId: string | null; mode: 'stopwatch' | 'pomodoro'; minutes: number } = {
  goalId: null,
  mode: 'stopwatch',
  minutes: 25,
}

/** Starts a timer for `projectId`, or stops the running one. Returns the minutes saved when stopping. */
export function toggleTimer(projectId: string): number | null {
  const { timer, goals } = getData()
  if (timer) {
    const before = getData().sessions.length
    mutate((d) => stopTimer(d))
    const sessions = getData().sessions
    return sessions.length > before ? sessions[sessions.length - 1].minutes : 0
  }
  const goalId = goals.some((g) => g.id === timerPrefs.goalId && g.projectId === projectId) ? timerPrefs.goalId : null
  mutate((d) => startTimer(d, projectId, goalId, timerPrefs.mode, timerPrefs.minutes))
  return null
}
