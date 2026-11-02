import { useEffect, useState } from 'react'
import { AiDialog } from './components/AiDialog'
import { AssetBoard } from './components/AssetBoard'
import { CalendarPanel } from './components/CalendarPanel'
import { GoalsPanel } from './components/GoalsPanel'
import { IntegrationsPanel } from './components/IntegrationsPanel'
import { LinkForm } from './components/LinkForm'
import { NotesPanel } from './components/NotesPanel'
import { Overview } from './components/Overview'
import { ResearchPanel } from './components/ResearchPanel'
import { SettingsPage } from './components/SettingsPage'
import { TimerPanel } from './components/TimerPanel'
import { CommandPalette } from './components/shell/CommandPalette'
import { NavRail } from './components/shell/NavRail'
import { ShortcutsDialog } from './components/shell/ShortcutsDialog'
import { TopBar } from './components/shell/TopBar'
import { useT } from './i18n'
import { addProject } from './model/ops'
import type { Project } from './model/schema'
import { saveTextFile } from './platform'
import { sectionDescription, sectionTitle } from './sections'
import { init, mutate, notify, setActiveProject, setSection, startFresh, useStore, type Section } from './store'
import { toggleTimer } from './timerActions'

function ErrorScreen({ message, raw }: { message: string; raw: string | null }) {
  const t = useT()
  return (
    <main className="center-screen">
      <h1>{t('errorTitle')}</h1>
      <p>{t('errorBody')}</p>
      <pre className="warn">{message}</pre>
      <div className="stack">
        {raw && <button onClick={() => void saveTextFile('data-unreadable.json', raw)}>{t('downloadRaw')}</button>}
        <button className="primary" onClick={startFresh}>{t('startFresh')}</button>
      </div>
    </main>
  )
}

function Welcome() {
  const t = useT()
  const data = useStore((s) => s.data)
  const [name, setName] = useState('')
  const create = () => {
    if (!name.trim()) return
    const { data: next, project } = addProject(data, name)
    mutate(() => next)
    setActiveProject(project.id)
  }
  return (
    <main className="center-screen">
      <h2>{t('noProjectsTitle')}</h2>
      <p className="muted">{t('noProjectsBody')}</p>
      <input
        autoFocus
        value={name}
        maxLength={100}
        placeholder={t('projectNamePlaceholder')}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && create()}
      />
      <button className="primary" onClick={create}>+ {t('newProject')}</button>
    </main>
  )
}

function SectionView({ section, project, onOpenAi }: { section: Section; project: Project; onOpenAi: () => void }) {
  const id = project.id
  switch (section) {
    case 'overview':
      return <Overview projectId={id} />
    case 'goals':
      return <GoalsPanel projectId={id} color={project.color} />
    case 'concept':
      return <AssetBoard projectId={id} categories={['concept']} layout="grid" />
    case 'inspiration':
      return <InspirationView projectId={id} />
    case 'research':
      return <ResearchPanel projectId={id} />
    case 'audio':
      return <AssetBoard projectId={id} categories={['music', 'sfx']} />
    case 'assets':
      return <AssetBoard projectId={id} />
    case 'notes':
      return <NotesPanel projectId={id} />
    case 'planner':
      return (
        <div className="planner">
          <TimerPanel projectId={id} />
          <CalendarPanel projectId={id} />
        </div>
      )
    case 'integrations':
      return <IntegrationsPanel projectId={id} />
    case 'settings':
      return <SettingsPage onOpenAi={onOpenAi} />
  }
}

function InspirationView({ projectId }: { projectId: string }) {
  const t = useT()
  return (
    <AssetBoard
      projectId={projectId}
      categories={['inspiration']}
      layout="grid"
      hint={t('inspirationHint')}
      actions={<LinkForm projectId={projectId} />}
    />
  )
}

export default function App() {
  const t = useT()
  const status = useStore((s) => s.status)
  const data = useStore((s) => s.data)
  const activeId = useStore((s) => s.activeProjectId)
  const section = useStore((s) => s.section)
  const notice = useStore((s) => s.notice)
  const saveError = useStore((s) => s.saveError)
  const [aiOpen, setAiOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const theme = data.settings.theme

  useEffect(() => void init(), [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'auto' ? '' : theme
  }, [theme])

  const project = data.projects.find((p) => p.id === activeId && !p.archived) ?? null
  const projectId = project?.id ?? null
  const phase = status.phase

  useEffect(() => {
    if (phase !== 'ready') return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      } else if (key === 'n' && projectId) {
        e.preventDefault()
        setSection('notes')
        setTimeout(() => document.getElementById('quick-note')?.focus(), 0)
      } else if (key === 't' && projectId) {
        e.preventDefault()
        const saved = toggleTimer(projectId)
        if (saved) notify(t('timerSaved', { minutes: saved }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` only changes with the language
  }, [phase, projectId])

  if (status.phase === 'loading') return <main className="center-screen muted">{t('loading')}</main>
  if (status.phase === 'error') return <ErrorScreen message={status.message} raw={status.raw} />

  const bare = section === 'overview' || section === 'settings' || section === 'planner' || section === 'integrations'

  return (
    <div className="app">
      <NavRail />
      <div className="app-main">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} onOpenAi={() => setAiOpen(true)} onOpenShortcuts={() => setShortcutsOpen(true)} />
        <main className="page">
          {data.projects.length === 0 ? (
            <Welcome />
          ) : project ? (
            <>
              <div className="page-head">
                <h1>{sectionTitle(t, section)}</h1>
                <p className="muted">{sectionDescription(t, section)}</p>
              </div>
              <div className={bare ? 'page-body' : 'page-body hide-h2'}>
                <SectionView key={`${project.id}-${section}`} section={section} project={project} onOpenAi={() => setAiOpen(true)} />
              </div>
            </>
          ) : (
            <p className="muted empty">{t('noProjectsBody')}</p>
          )}
        </main>
      </div>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      {aiOpen && <AiDialog projectId={projectId} onClose={() => setAiOpen(false)} />}
      {(notice || saveError) && (
        <div className="toast" role="status">
          {notice ?? t('saveFailed', { reason: saveError ?? '' })}
        </div>
      )}
    </div>
  )
}
