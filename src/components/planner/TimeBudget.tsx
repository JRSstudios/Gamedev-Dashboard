import { useState } from 'react'
import { useT } from '../../i18n'
import { availableBetween, deadlineRisks, hasAvailability, spentOnGoal, spentOnSection } from '../../model/availability'
import { resolveSections } from '../../model/layout'
import { setSectionBudget, updateGoal } from '../../model/ops'
import { sectionTitle, TRACKED_SECTIONS } from '../../sections'
import { mutate, setSection, useStore } from '../../store'

const round = (h: number) => Math.round(h * 10) / 10

function HoursInput({ value, label, onChange }: { value: number | null; label: string; onChange: (v: number | null) => void }) {
  return (
    <input
      type="number"
      className="hours"
      min={0}
      max={10000}
      step={0.5}
      aria-label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Math.min(10000, Math.max(0, Number(e.target.value) || 0)))}
    />
  )
}

function Row({ name, planned, spent, deadline, risk, onPlan, onOpen }: { name: string; planned: number | null; spent: number; deadline?: string | null; risk?: boolean; onPlan: (v: number | null) => void; onOpen: () => void }) {
  const t = useT()
  const pct = planned ? Math.min(100, Math.round((spent / planned) * 100)) : 0
  const over = planned !== null && spent > planned
  return (
    <tr className={risk ? 'risk' : ''}>
      <td>
        <button className="link clip" onClick={onOpen}>{name}</button>
        {deadline && <span className="small muted"> · {deadline}</span>}
        {risk && <span className="pill bad small">{t('budgetRisk')}</span>}
      </td>
      <td><HoursInput value={planned} label={t('budgetPlanned')} onChange={onPlan} /></td>
      <td className="num">{round(spent)} h</td>
      <td className={`num${over ? ' warn' : ''}`}>{planned === null ? t('budgetNotPlanned') : `${round(planned - spent)} h`}</td>
      <td className="bar-cell">
        <div className={`bar${over ? ' over' : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={name}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </td>
    </tr>
  )
}

/** Time column: planned, spent and remaining hours per section and per goal, checked against free time. */
export function TimeBudget({ projectId }: { projectId: string }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const [now] = useState(() => new Date())
  const project = data.projects.find((p) => p.id === projectId)
  if (!project) return null
  const sections = resolveSections(project).filter((s) => s.visible && TRACKED_SECTIONS.includes(s.id))
  const goals = data.goals.filter((g) => g.projectId === projectId && !g.archived)
  const risks = new Set(deadlineRisks(data, projectId, now).map((r) => r.goal.id))
  const remaining =
    goals.reduce((s, g) => s + Math.max(0, (g.estimateHours ?? 0) - spentOnGoal(data, g.id)), 0) +
    sections.reduce((s, x) => s + Math.max(0, (project.sectionBudgets[x.id] ?? 0) - spentOnSection(data, projectId, x.id)), 0)
  const lastDeadline = goals.map((g) => g.deadline).filter(Boolean).sort().pop()
  const until = lastDeadline ? new Date(`${lastDeadline}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 29)
  const free = hasAvailability(data.settings.availability) ? availableBetween(data.settings.availability, now, until) / 60 : null
  const sinks = sections
    .map((s) => ({ s, spent: spentOnSection(data, projectId, s.id) }))
    .filter((x) => x.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 3)

  return (
    <div className="time-budget">
      <section className="panel">
        <div className="hub-stats">
          <div>
            <span className="small muted">{t('budgetRemaining')}</span>
            <strong>{round(remaining)} h</strong>
          </div>
          <div>
            <span className="small muted">{lastDeadline ? t('budgetFreeUntil', { date: lastDeadline }) : t('budgetFree30')}</span>
            <strong>{free === null ? t('budgetNoWeek') : `${round(free)} h`}</strong>
          </div>
          <div>
            <span className="small muted">{t('budgetTopSinks')}</span>
            <strong className="small">{sinks.length ? sinks.map((x) => `${sectionTitle(t, x.s.id, x.s.label)} ${round(x.spent)} h`).join(' · ') : t('budgetNoTime')}</strong>
          </div>
        </div>
        {free === null && <p className="small muted">{t('budgetNoAvailability')}</p>}
        {free !== null && remaining > free && <p className="warn small" role="alert">{t('budgetTooMuch', { needed: round(remaining), free: round(free) })}</p>}
      </section>

      <section className="panel">
        <h2>{t('budgetGoals')}</h2>
        {goals.length === 0 && <p className="small muted">{t('noGoals')}</p>}
        {goals.length > 0 && (
          <table className="budget-table">
            <thead>
              <tr>
                <th>{t('budgetName')}</th>
                <th>{t('budgetPlanned')}</th>
                <th>{t('budgetSpent')}</th>
                <th>{t('budgetLeft')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {goals.map((g) => (
                <Row
                  key={g.id}
                  name={g.title}
                  deadline={g.deadline}
                  risk={risks.has(g.id)}
                  planned={g.estimateHours}
                  spent={spentOnGoal(data, g.id)}
                  onPlan={(v) => mutate((d) => updateGoal(d, g.id, { estimateHours: v }))}
                  onOpen={() => setSection('goals')}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h2>{t('budgetSections')}</h2>
        <p className="small muted">{t('budgetSectionsHint')}</p>
        <table className="budget-table">
          <thead>
            <tr>
              <th>{t('budgetName')}</th>
              <th>{t('budgetPlanned')}</th>
              <th>{t('budgetSpent')}</th>
              <th>{t('budgetLeft')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <Row
                key={s.id}
                name={sectionTitle(t, s.id, s.label)}
                planned={project.sectionBudgets[s.id] ?? null}
                spent={spentOnSection(data, projectId, s.id)}
                onPlan={(v) => mutate((d) => setSectionBudget(d, projectId, s.id, v))}
                onOpen={() => setSection(s.id)}
              />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
