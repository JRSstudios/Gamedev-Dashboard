import { useState } from 'react'
import { appExe, useInbox, useUnityValid } from '../features/hub'
import { useT } from '../i18n'
import { goalProgress, projectProgress } from '../model/progress'
import type { Project } from '../model/schema'
import { dayKey, formatMinutes, minutesOnDay, minutesThisWeek } from '../model/time'
import { IS_DESKTOP, type ExternalApp } from '../platform'
import { setSection, useStore } from '../store'
import { InboxList } from './hub/InboxList'
import { Suggestions } from './hub/Suggestions'
import { ProgressBar } from './ProgressBar'
import { Icon } from './shell/Icon'
import { UsagePanel } from './UsagePanel'

/** Status of one connected program, shown as a hub tile. */
function AppTile({ project, app, inboxCount }: { project: Project; app: ExternalApp; inboxCount: number }) {
  const t = useT()
  const unityValid = useUnityValid(app === 'unity' ? project.integrations.unityDir : null)
  const folder = app === 'unity' ? project.integrations.unityDir : app === 'blender' ? project.integrations.blenderExportDir : project.integrations.kritaDir
  const linked = Boolean(folder || appExe(project, app))
  const state = !linked ? t('hubNotLinked') : app === 'unity' && unityValid === false ? t('integInvalid') : t('hubLinked')
  const name = app === 'unity' ? 'Unity' : app === 'blender' ? 'Blender' : 'Krita'
  return (
    <button className={`panel app-tile ${app}${linked ? ' linked' : ''}`} onClick={() => setSection(app)}>
      <span className="app-tile-icon"><Icon name={app} size={22} /></span>
      <span className="app-tile-text">
        <strong>{name}</strong>
        <span className="small muted">{state}</span>
      </span>
      {app !== 'unity' && inboxCount > 0 && <span className="badge" title={t('hubInbox')}>{inboxCount}</span>}
    </button>
  )
}

export function Overview({ projectId }: { projectId: string }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const [now] = useState(() => new Date())
  const project = data.projects.find((p) => p.id === projectId)
  const linkedPaths = data.assets.flatMap((a) => (a.projectId === projectId && a.path ? [a.path] : []))
  const { items } = useInbox(project, linkedPaths)
  if (!project) return null
  const prog = projectProgress(data, projectId)
  const goals = data.goals.filter((g) => g.projectId === projectId && !g.archived)
  const assets = data.assets.filter((a) => a.projectId === projectId)
  const notes = data.notes.filter((n) => n.projectId === projectId)
  const projectSessions = { ...data, sessions: data.sessions.filter((s) => s.projectId === projectId) }

  const next = goals
    .filter((g) => g.steps.some((s) => !s.done))
    .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
    .slice(0, 5)

  const recent = [
    ...notes.map((n) => ({ id: n.id, at: n.createdAt, title: n.text.split('\n')[0], kind: t('ref_note'), go: () => setSection('notes') })),
    ...assets.map((a) => ({ id: a.id, at: a.addedAt, title: a.name, kind: t(`cat_${a.category}`), go: () => setSection('assets') })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6)

  return (
    <div className="overview hub">
      {IS_DESKTOP && (
        <div className="app-tiles" data-tour="hub-tiles">
          {(['unity', 'blender', 'krita'] as const).map((app) => (
            <AppTile key={app} project={project} app={app} inboxCount={items.filter((i) => i.source === app).length} />
          ))}
        </div>
      )}

      <div className="hub-grid">
        {IS_DESKTOP && (
          <section className="panel hub-inbox">
            <div className="panel-head">
              <h2><Icon name="inbox" size={16} /> {t('hubInbox')}</h2>
              {items.length > 0 && <span className="badge">{items.length}</span>}
            </div>
            <p className="small muted">{t('hubInboxHint')}</p>
            <InboxList project={project} items={items} limit={6} />
          </section>
        )}

        <Suggestions projectId={projectId} />

        <section className="panel">
          <div className="panel-head">
            <h2>{t('ovNextUp')}</h2>
            <button className="link" onClick={() => setSection('goals')}>{t('hubAllGoals')}</button>
          </div>
          {next.length === 0 && <p className="muted small">{t('ovNoNext')}</p>}
          <ul className="plain next-list">
            {next.map((g) => (
              <li key={g.id}>
                <div className="row-between">
                  <strong className="clip">{g.title}</strong>
                  <span className="small muted">{g.deadline ?? ''}</span>
                </div>
                <ProgressBar pct={goalProgress(g).pct} color={project.color} thin label={g.title} />
                <span className="small muted clip">{g.steps.find((s) => !s.done)?.title}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel hub-week">
          <h2>{t('hubThisWeek')}</h2>
          <div className="hub-stats">
            <div>
              <span className="small muted">{t('today')}</span>
              <strong>{formatMinutes(minutesOnDay(data, dayKey(now), projectId))}</strong>
            </div>
            <div>
              <span className="small muted">{t('thisWeek')}</span>
              <strong>{formatMinutes(minutesThisWeek(projectSessions, now))}</strong>
            </div>
            <div>
              <span className="small muted">{t('ovOpenSteps')}</span>
              <strong>{prog.total - prog.done}</strong>
            </div>
          </div>
          <span className="small muted">{t('ovProgress')} · {prog.pct}%</span>
          <ProgressBar pct={prog.pct} color={project.color} label={t('ovProgress')} />
          <button className="link" onClick={() => setSection('planner')}>{t('hubOpenPlanner')}</button>
        </section>

        <section className="panel">
          <h2>{t('hubRecent')}</h2>
          {recent.length === 0 && <p className="muted small">{t('noNotes')}</p>}
          <ul className="plain recent-list">
            {recent.map((r) => (
              <li key={r.id}>
                <button className="link clip" onClick={r.go}>{r.title}</button>
                <span className="small muted">{r.kind}</span>
              </li>
            ))}
          </ul>
        </section>

        {data.usage.length > 0 && <UsagePanel compact />}
      </div>
    </div>
  )
}
