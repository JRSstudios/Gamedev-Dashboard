import { useState } from 'react'
import { useT } from '../../i18n'
import { CalendarPanel } from '../CalendarPanel'
import { TimerPanel } from '../TimerPanel'
import { MonthPlan } from './MonthPlan'
import { TimeBudget } from './TimeBudget'
import { WeekPlan } from './WeekPlan'

const TABS = ['today', 'week', 'month', 'budget'] as const
type Tab = (typeof TABS)[number]
const TAB_KEY = 'gamedev-dashboard.plannerTab'

function readTab(): Tab {
  try {
    const v = localStorage.getItem(TAB_KEY)
    return TABS.find((t) => t === v) ?? 'today'
  } catch {
    return 'today'
  }
}

/** Planner: timer and calendar, weekly working times, month overview and time per section. */
export function PlannerView({ projectId }: { projectId: string }) {
  const t = useT()
  const [tab, setTab] = useState<Tab>(readTab)
  const pick = (next: Tab) => {
    setTab(next)
    try {
      localStorage.setItem(TAB_KEY, next)
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="planner-view">
      <div className="tabs" role="tablist" data-tour="planner-tabs">
        {TABS.map((id) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'tab on' : 'tab'} onClick={() => pick(id)}>
            {t(`plan_${id}`)}
          </button>
        ))}
      </div>
      {tab === 'today' && (
        <div className="planner">
          <TimerPanel projectId={projectId} />
          <CalendarPanel projectId={projectId} />
        </div>
      )}
      {tab === 'week' && <WeekPlan projectId={projectId} />}
      {tab === 'month' && <MonthPlan projectId={projectId} />}
      {tab === 'budget' && <TimeBudget projectId={projectId} />}
    </div>
  )
}
