import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { resolveSections } from '../model/layout'
import { sectionTitle, TRACKED_SECTIONS } from '../sections'
import { stopTimer } from '../model/ops'
import { formatClock } from '../model/time'
import { mutate, notify, useStore } from '../store'
import { timerPrefs, toggleTimer } from '../timerActions'

export function TimerPanel({ projectId }: { projectId: string }) {
  const t = useT()
  const timer = useStore((s) => s.data.timer)
  const goals = useStore((s) => s.data.goals)
  const projects = useStore((s) => s.data.projects)
  const [goalId, setGoalId] = useState(timerPrefs.goalId ?? '')
  const [section, setSectionPref] = useState(timerPrefs.section ?? '')
  const [mode, setMode] = useState(timerPrefs.mode)
  const [minutes, setMinutes] = useState(timerPrefs.minutes)
  const [now, setNow] = useState(() => Date.now())

  const running = timer !== null
  const elapsed = timer ? Math.max(0, (now - new Date(timer.startedAt).getTime()) / 1000) : 0
  const limit = timer?.mode === 'pomodoro' ? timer.minutes * 60 : null
  const shown = limit !== null ? limit - elapsed : elapsed

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  // A pomodoro ends itself, even if the app was closed while it ran.
  const finished = limit !== null && elapsed >= limit
  useEffect(() => {
    if (!finished || !timer) return
    const m = timer.minutes
    mutate((d) => stopTimer(d))
    notify(t('timerDone', { minutes: m }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per finished timer
  }, [finished])

  useEffect(() => {
    document.title = running ? `${formatClock(shown)} · Gamedev Dashboard` : 'Gamedev Dashboard'
    return () => {
      document.title = 'Gamedev Dashboard'
    }
  }, [running, shown])

  const projectGoals = goals.filter((g) => g.projectId === projectId && !g.archived)
  const runningProject = timer ? projects.find((p) => p.id === timer.projectId) : null
  const elsewhere = timer !== null && timer.projectId !== projectId

  const toggle = () => {
    timerPrefs.goalId = goalId || null
    timerPrefs.section = section || null
    timerPrefs.mode = mode
    timerPrefs.minutes = minutes
    const saved = toggleTimer(projectId)
    if (saved !== null && saved > 0) notify(t('timerSaved', { minutes: saved }))
  }

  return (
    <section className="panel timer" aria-label={t('timer')}>
      <h2>{t('timer')}</h2>
      <div className="clock" role="timer" aria-live="off">{formatClock(shown)}</div>
      {!running && (
        <>
          <div className="seg" role="group" aria-label={t('timer')}>
            <button className={mode === 'stopwatch' ? 'on' : ''} onClick={() => setMode('stopwatch')}>{t('stopwatch')}</button>
            <button className={mode === 'pomodoro' ? 'on' : ''} onClick={() => setMode('pomodoro')}>{t('pomodoro')}</button>
          </div>
          {mode === 'pomodoro' && (
            <label className="small muted">
              {t('pomodoroMinutes')}
              <input
                type="number"
                min={1}
                max={240}
                value={minutes}
                onChange={(e) => setMinutes(Math.min(240, Math.max(1, Math.round(Number(e.target.value)) || 25)))}
              />
            </label>
          )}
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)} aria-label={t('timerGoal')}>
            <option value="">{t('noGoal')}</option>
            {projectGoals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
          <select value={section} onChange={(e) => setSectionPref(e.target.value)} aria-label={t('timerSection')}>
            <option value="">{t('noSection')}</option>
            {resolveSections(projects.find((p) => p.id === projectId))
              .filter((s) => TRACKED_SECTIONS.includes(s.id))
              .map((s) => <option key={s.id} value={s.id}>{sectionTitle(t, s.id, s.label)}</option>)}
          </select>
        </>
      )}
      {elsewhere && <p className="warn small">{t('timerRunningElsewhere', { name: runningProject?.name ?? '?' })}</p>}
      <button className="primary" onClick={toggle} disabled={elsewhere && !running}>
        {running ? `⏹ ${t('stop')}` : `▶ ${t('start')}`}
      </button>
    </section>
  )
}
