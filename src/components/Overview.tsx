import { useState } from 'react'
import { useT } from '../i18n'
import { goalProgress, projectProgress } from '../model/progress'
import { dayKey, formatMinutes, minutesOnDay, minutesThisWeek } from '../model/time'
import { setSection, useStore, type Section } from '../store'
import { ProgressBar } from './ProgressBar'
import { Icon, type IconName } from './shell/Icon'
import { sectionTitle } from '../sections'

const TILES: Section[] = ['goals', 'concept', 'inspiration', 'research', 'audio', 'notes']

export function Overview({ projectId }: { projectId: string }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const [now] = useState(() => new Date())
  const project = data.projects.find((p) => p.id === projectId)
  if (!project) return null
  const prog = projectProgress(data, projectId)
  const goals = data.goals.filter((g) => g.projectId === projectId && !g.archived)
  const assets = data.assets.filter((a) => a.projectId === projectId)
  const notes = data.notes.filter((n) => n.projectId === projectId)

  const next = goals
    .filter((g) => g.steps.some((s) => !s.done))
    .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
    .slice(0, 4)

  const counts: Record<string, number> = {
    goals: goals.length,
    concept: assets.filter((a) => a.category === 'concept').length,
    inspiration: assets.filter((a) => a.category === 'inspiration').length,
    research: data.research.filter((r) => r.projectId === projectId).length,
    audio: assets.filter((a) => a.category === 'music' || a.category === 'sfx').length,
    notes: notes.length,
  }

  return (
    <div className="overview">
      <div className="stat-cards">
        <div className="panel stat">
          <span className="muted small">{t('ovProgress')}</span>
          <strong className="big">{prog.pct}%</strong>
          <ProgressBar pct={prog.pct} color={project.color} label={t('ovProgress')} />
          <span className="small muted">{t('stepsDone', { done: prog.done, total: prog.total })}</span>
        </div>
        <div className="panel stat">
          <span className="muted small">{t('ovOpenSteps')}</span>
          <strong className="big">{prog.total - prog.done}</strong>
        </div>
        <div className="panel stat">
          <span className="muted small">{t('today')}</span>
          <strong className="big">{formatMinutes(minutesOnDay(data, dayKey(now), projectId))}</strong>
        </div>
        <div className="panel stat">
          <span className="muted small">{t('thisWeek')}</span>
          <strong className="big">{formatMinutes(minutesThisWeek({ ...data, sessions: data.sessions.filter((s) => s.projectId === projectId) }, now))}</strong>
        </div>
      </div>

      <div className="overview-grid">
        <section className="panel">
          <h2>{t('ovNextUp')}</h2>
          {next.length === 0 && <p className="muted">{t('ovNoNext')}</p>}
          <ul className="plain">
            {next.map((g) => (
              <li key={g.id}>
                <div className="row-between">
                  <strong>{g.title}</strong>
                  <span className="small muted">{g.deadline ?? ''}</span>
                </div>
                <ProgressBar pct={goalProgress(g).pct} color={project.color} thin label={g.title} />
                <span className="small muted">{g.steps.find((s) => !s.done)?.title}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>{t('ovRecentNotes')}</h2>
          {notes.length === 0 && <p className="muted">{t('noNotes')}</p>}
          <ul className="plain">
            {notes.slice(0, 4).map((n) => (
              <li key={n.id}>
                <span className="small muted">{new Date(n.createdAt).toLocaleDateString()}</span>
                <p className="clamp">{n.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>{t('ovRecentAssets')}</h2>
          {assets.length === 0 && <p className="muted">{t('noAssets')}</p>}
          <ul className="plain">
            {[...assets].reverse().slice(0, 5).map((a) => (
              <li key={a.id} className="row-between">
                <span className="clip">{a.name}</span>
                <span className="small muted">{t(`cat_${a.category}`)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <h2 className="section-label">{t('ovSections')}</h2>
      <div className="tiles">
        {TILES.map((s) => (
          <button key={s} className="panel tile" onClick={() => setSection(s)}>
            <Icon name={s as IconName} size={22} />
            <strong>{sectionTitle(t, s)}</strong>
            <span className="small muted">{t('ovItems', { n: counts[s] ?? 0 })}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
