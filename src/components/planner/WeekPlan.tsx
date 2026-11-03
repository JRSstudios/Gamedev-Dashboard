import { useState } from 'react'
import { useLang, useT } from '../../i18n'
import { AVAILABILITY_TEMPLATES, gamedevMinutes, plan, setWeekly, workMinutes, type AvailabilityTemplate } from '../../model/availability'
import type { TimeBlock } from '../../model/schema'
import { formatMinutes, startOfWeek } from '../../model/time'
import { mutate, useStore } from '../../store'

const DAY_START = 6 * 60
const DAY_END = 24 * 60
const toMin = (c: string) => Number(c.slice(0, 2)) * 60 + Number(c.slice(3, 5))

/** A day as a horizontal bar from 06:00 to 24:00. */
function DayBar({ blocks }: { blocks: TimeBlock[] }) {
  const span = DAY_END - DAY_START
  return (
    <div className="day-bar" aria-hidden="true">
      {blocks.map((b, i) => {
        const from = Math.max(DAY_START, toMin(b.from))
        const to = Math.min(DAY_END, toMin(b.to))
        if (to <= from) return null
        return <span key={i} className={`blk ${b.kind}`} style={{ left: `${((from - DAY_START) / span) * 100}%`, width: `${((to - from) / span) * 100}%` }} />
      })}
    </div>
  )
}

/** Totals: available, logged and still free. */
export function Totals({ available, done, label }: { available: number; done: number; label: string }) {
  const t = useT()
  const pct = available > 0 ? Math.min(100, Math.round((done / available) * 100)) : 0
  return (
    <section className="panel plan-totals" aria-label={label}>
      <div className="hub-stats">
        <div>
          <span className="small muted">{t('planAvailable')}</span>
          <strong>{formatMinutes(available)}</strong>
        </div>
        <div>
          <span className="small muted">{t('planDone')}</span>
          <strong>{formatMinutes(done)}</strong>
        </div>
        <div>
          <span className="small muted">{t('planFree')}</span>
          <strong>{formatMinutes(Math.max(0, available - done))}</strong>
        </div>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {available === 0 && <p className="small callout">{t('planEmpty')}</p>}
    </section>
  )
}

/** Weekly working and gamedev times. The week plan repeats; single days can differ in the month view. */
export function WeekPlan({ projectId }: { projectId: string }) {
  const t = useT()
  const lang = useLang()
  const data = useStore((s) => s.data)
  const [now] = useState(() => new Date())
  const weekly = data.settings.availability.weekly
  const days = plan(data, projectId, startOfWeek(now), 7)
  const dayName = (i: number) => new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(new Date(2026, 5, 1 + i))

  const update = (day: number, blocks: TimeBlock[]) => mutate((d) => setWeekly(d, weekly.map((b, i) => (i === day ? blocks : b))))
  const patch = (day: number, index: number, p: Partial<TimeBlock>) => update(day, weekly[day].map((b, i) => (i === index ? { ...b, ...p } : b)))
  const applyTemplate = (id: AvailabilityTemplate) => {
    if (weekly.some((d) => d.length) && !window.confirm(t('planTemplateReplace'))) return
    mutate((d) => setWeekly(d, AVAILABILITY_TEMPLATES[id]()))
  }

  return (
    <div className="week-plan">
      <Totals label={t('plan_week')} available={days.reduce((s, d) => s + d.available, 0)} done={days.reduce((s, d) => s + d.done, 0)} />
      <section className="panel">
        <div className="panel-head">
          <h2>{t('planWeekly')}</h2>
          <div className="row">
            <span className="small muted">{t('planTemplates')}</span>
            {(Object.keys(AVAILABILITY_TEMPLATES) as AvailabilityTemplate[]).map((id) => (
              <button key={id} className="link" onClick={() => applyTemplate(id)}>{t(`planTpl_${id}`)}</button>
            ))}
          </div>
        </div>
        <p className="small muted">{t('planWeeklyHint')}</p>
        <div className="legend small">
          <span><i className="blk gamedev" /> {t('planKind_gamedev')}</span>
          <span><i className="blk work" /> {t('planKind_work')}</span>
        </div>
        <ul className="plain week-days">
          {weekly.map((blocks, day) => (
            <li key={day} className={(now.getDay() + 6) % 7 === day ? 'today' : ''}>
              <div className="row-between">
                <strong>{dayName(day)}</strong>
                <span className="small muted">
                  {t('planDaySum', { gamedev: formatMinutes(gamedevMinutes(blocks)), work: formatMinutes(workMinutes(blocks)) })}
                </span>
              </div>
              <DayBar blocks={blocks} />
              {blocks.map((b, i) => (
                <div key={i} className="block-row">
                  <select value={b.kind} onChange={(e) => patch(day, i, { kind: e.target.value as TimeBlock['kind'] })} aria-label={t('planKind')}>
                    <option value="gamedev">{t('planKind_gamedev')}</option>
                    <option value="work">{t('planKind_work')}</option>
                  </select>
                  <input type="time" value={b.from} aria-label={t('planFrom')} onChange={(e) => e.target.value && patch(day, i, { from: e.target.value })} />
                  <span className="muted">–</span>
                  <input type="time" value={b.to === '24:00' ? '23:59' : b.to} aria-label={t('planTo')} onChange={(e) => e.target.value && patch(day, i, { to: e.target.value === '23:59' ? '24:00' : e.target.value })} />
                  <button className="link" aria-label={t('delete')} onClick={() => update(day, blocks.filter((_, k) => k !== i))}>×</button>
                </div>
              ))}
              <div className="row">
                <button className="link" disabled={blocks.length >= 12} onClick={() => update(day, [...blocks, { from: '18:00', to: '20:00', kind: 'gamedev' }])}>+ {t('planKind_gamedev')}</button>
                <button className="link" disabled={blocks.length >= 12} onClick={() => update(day, [...blocks, { from: '08:00', to: '16:00', kind: 'work' }])}>+ {t('planKind_work')}</button>
                {day > 0 && (
                  <button className="link" onClick={() => update(day, weekly[day - 1].map((b) => ({ ...b })))}>{t('planCopyPrev')}</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
