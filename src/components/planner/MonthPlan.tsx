import { useState } from 'react'
import { useLang, useT } from '../../i18n'
import { blocksOn, gamedevMinutes, plan, setException } from '../../model/availability'
import type { TimeBlock } from '../../model/schema'
import { dayKey, formatMinutes, monthGrid } from '../../model/time'
import { mutate, useStore } from '../../store'
import { Totals } from './WeekPlan'

const level = (minutes: number): number => (minutes <= 0 ? 0 : minutes < 60 ? 1 : minutes < 120 ? 2 : minutes < 240 ? 3 : 4)

/** Month view: free gamedev hours per day, logged time, and days that differ from the week plan. */
export function MonthPlan({ projectId }: { projectId: string }) {
  const t = useT()
  const lang = useLang()
  const data = useStore((s) => s.data)
  const [cursor, setCursor] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }))
  const [selected, setSelected] = useState<string | null>(null)
  const av = data.settings.availability
  const first = new Date(cursor.year, cursor.month, 1)
  const length = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const days = plan(data, projectId, first, length)
  const byKey = new Map(days.map((d) => [d.key, d]))
  const [today] = useState(() => dayKey(new Date()))
  const exception = selected ? av.exceptions.find((e) => e.date === selected) : undefined
  const selectedBlocks = selected ? blocksOn(av, new Date(`${selected}T12:00:00`)) : []
  const move = (delta: number) => setCursor((c) => ({ year: c.month + delta < 0 ? c.year - 1 : c.month + delta > 11 ? c.year + 1 : c.year, month: (c.month + delta + 12) % 12 }))
  const setBlocks = (blocks: TimeBlock[] | null, note = exception?.note ?? '') => selected && mutate((d) => setException(d, selected, blocks, note))

  return (
    <div className="month-plan">
      <Totals label={t('plan_month')} available={days.reduce((s, d) => s + d.available, 0)} done={days.reduce((s, d) => s + d.done, 0)} />
      <div className="planner">
        <section className="panel">
          <div className="panel-head">
            <button className="link" aria-label={t('prevMonth')} onClick={() => move(-1)}>‹</button>
            <h2>{new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(first)}</h2>
            <button className="link" aria-label={t('nextMonth')} onClick={() => move(1)}>›</button>
          </div>
          <div className="cal-grid month-grid">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="cal-head small muted">{new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(new Date(2026, 5, 1 + i))}</span>
            ))}
            {monthGrid(cursor.year, cursor.month).map((date) => {
              const key = dayKey(date)
              const d = byKey.get(key)
              const outside = date.getMonth() !== cursor.month
              const differs = av.exceptions.some((e) => e.date === key)
              return (
                <button
                  key={key}
                  className={`cal-day plan-day lvl-${outside ? 0 : level(d?.available ?? 0)}${outside ? ' outside' : ''}${key === today ? ' today' : ''}${key === selected ? ' selected' : ''}${differs ? ' differs' : ''}`}
                  onClick={() => setSelected(key)}
                  aria-label={`${key}: ${formatMinutes(d?.available ?? 0)}`}
                >
                  <span>{date.getDate()}</span>
                  {!outside && d && d.available > 0 && <span className="small">{formatMinutes(d.available)}</span>}
                  {!outside && d && d.done > 0 && <span className="small done">✓ {formatMinutes(d.done)}</span>}
                </button>
              )
            })}
          </div>
          <p className="small muted">{t('planMonthHint')}</p>
        </section>
        <section className="panel">
          {!selected && <p className="muted small">{t('planPickDay')}</p>}
          {selected && (
            <>
              <h2>{new Intl.DateTimeFormat(lang, { dateStyle: 'full' }).format(new Date(`${selected}T12:00:00`))}</h2>
              <p className="small muted">
                {exception ? t('planDayCustom') : t('planDayWeekly')} · {formatMinutes(gamedevMinutes(selectedBlocks))}
              </p>
              <div className="row">
                <button onClick={() => setBlocks([])}>{t('planDayOff')}</button>
                <button onClick={() => setBlocks([{ from: '10:00', to: '16:00', kind: 'gamedev' }])}>{t('planDayFree')}</button>
                {exception && <button className="link" onClick={() => setBlocks(null)}>{t('planDayReset')}</button>}
              </div>
              {exception && (
                <>
                  {exception.blocks.map((b, i) => (
                    <div key={i} className="block-row">
                      <select value={b.kind} aria-label={t('planKind')} onChange={(e) => setBlocks(exception.blocks.map((x, k) => (k === i ? { ...x, kind: e.target.value as TimeBlock['kind'] } : x)))}>
                        <option value="gamedev">{t('planKind_gamedev')}</option>
                        <option value="work">{t('planKind_work')}</option>
                      </select>
                      <input type="time" value={b.from} aria-label={t('planFrom')} onChange={(e) => e.target.value && setBlocks(exception.blocks.map((x, k) => (k === i ? { ...x, from: e.target.value } : x)))} />
                      <span className="muted">–</span>
                      <input type="time" value={b.to === '24:00' ? '23:59' : b.to} aria-label={t('planTo')} onChange={(e) => e.target.value && setBlocks(exception.blocks.map((x, k) => (k === i ? { ...x, to: e.target.value === '23:59' ? '24:00' : e.target.value } : x)))} />
                      <button className="link" aria-label={t('delete')} onClick={() => setBlocks(exception.blocks.filter((_, k) => k !== i))}>×</button>
                    </div>
                  ))}
                  <button className="link" disabled={exception.blocks.length >= 12} onClick={() => setBlocks([...exception.blocks, { from: '18:00', to: '20:00', kind: 'gamedev' }])}>+ {t('planKind_gamedev')}</button>
                  <label className="field">
                    <span className="small muted">{t('planNote')}</span>
                    <input value={exception.note} maxLength={200} onChange={(e) => setBlocks(exception.blocks, e.target.value)} />
                  </label>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
