import { useMemo, useState } from 'react'
import { resolveLanguage, useT } from '../i18n'
import { dayKey, dayOf, formatMinutes, intensity, minutesByDay, monthGrid } from '../model/time'
import { useStore } from '../store'

export function CalendarPanel({ projectId }: { projectId: string }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const lang = resolveLanguage(data.settings.language)
  const [today] = useState(() => new Date())
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState<string>(dayKey(today))

  const info = useMemo(() => {
    const minutes = minutesByDay(data, projectId)
    const deadlines = new Map<string, string[]>()
    const done = new Map<string, string[]>()
    const notes = new Map<string, string[]>()
    const push = (map: Map<string, string[]>, key: string, value: string) => map.set(key, [...(map.get(key) ?? []), value])
    for (const g of data.goals) {
      if (g.projectId !== projectId) continue
      if (g.deadline && !g.archived) push(deadlines, g.deadline, g.title)
      for (const s of g.steps) if (s.done && s.doneAt) push(done, dayOf(s.doneAt), `${s.title} (${g.title})`)
    }
    for (const n of data.notes) if (n.projectId === projectId) push(notes, dayOf(n.createdAt), n.text)
    return { minutes, deadlines, done, notes }
  }, [data, projectId])

  const monthLabel = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(new Date(cursor.year, cursor.month, 1))
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(new Date(2026, 5, 1 + i)), // 1 Jun 2026 is a Monday
  )
  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  const sessions = data.sessions.filter((s) => s.projectId === projectId && dayOf(s.start) === selected)
  const goalTitle = (id: string | null) => data.goals.find((g) => g.id === id)?.title
  const dayDone = info.done.get(selected) ?? []
  const dayDeadlines = info.deadlines.get(selected) ?? []
  const dayNotes = info.notes.get(selected) ?? []
  const empty = sessions.length + dayDone.length + dayDeadlines.length + dayNotes.length === 0

  return (
    <section className="panel calendar" aria-label={t('calendar')}>
      <div className="panel-head">
        <h2>{t('calendar')}</h2>
        <button className="icon" aria-label={t('prevMonth')} onClick={() => shift(-1)}>‹</button>
        <strong className="month">{monthLabel}</strong>
        <button className="icon" aria-label={t('nextMonth')} onClick={() => shift(1)}>›</button>
        <button
          className="link"
          onClick={() => {
            setCursor({ year: today.getFullYear(), month: today.getMonth() })
            setSelected(dayKey(today))
          }}
        >
          {t('goToday')}
        </button>
      </div>
      <div className="cal-grid" role="grid">
        {weekdays.map((w) => <div key={w} className="cal-dow muted small" role="columnheader">{w}</div>)}
        {monthGrid(cursor.year, cursor.month).map((d) => {
          const key = dayKey(d)
          const level = intensity(info.minutes.get(key) ?? 0)
          const outside = d.getMonth() !== cursor.month
          const classes = ['cal-day', `lvl-${level}`, outside && 'outside', key === dayKey(today) && 'today', key === selected && 'selected']
          return (
            <button
              key={key}
              role="gridcell"
              className={classes.filter(Boolean).join(' ')}
              aria-label={`${key}${level ? `, ${formatMinutes(info.minutes.get(key) ?? 0)}` : ''}`}
              aria-pressed={key === selected}
              onClick={() => setSelected(key)}
            >
              {d.getDate()}
              {info.deadlines.has(key) && <span className="deadline-dot" title={t('dayDeadlines')} />}
            </button>
          )
        })}
      </div>
      <div className="day-detail small">
        <strong>{new Intl.DateTimeFormat(lang, { dateStyle: 'full' }).format(new Date(`${selected}T12:00:00`))}</strong>
        {empty && <p className="muted">{t('dayEmpty')}</p>}
        {sessions.length > 0 && (
          <>
            <h4>{t('daySessions')}</h4>
            <ul>
              {sessions.map((s) => (
                <li key={s.id}>{t('minutes', { n: s.minutes })}{goalTitle(s.goalId) ? ` · ${goalTitle(s.goalId)}` : ''}</li>
              ))}
            </ul>
          </>
        )}
        {dayDeadlines.length > 0 && (
          <>
            <h4>{t('dayDeadlines')}</h4>
            <ul>{dayDeadlines.map((x, i) => <li key={i}>⚑ {x}</li>)}</ul>
          </>
        )}
        {dayDone.length > 0 && (
          <>
            <h4>{t('dayDone')}</h4>
            <ul>{dayDone.map((x, i) => <li key={i}>✓ {x}</li>)}</ul>
          </>
        )}
        {dayNotes.length > 0 && (
          <>
            <h4>{t('dayNotes')}</h4>
            <ul>{dayNotes.map((x, i) => <li key={i}>{x.length > 120 ? `${x.slice(0, 120)}…` : x}</li>)}</ul>
          </>
        )}
      </div>
    </section>
  )
}
