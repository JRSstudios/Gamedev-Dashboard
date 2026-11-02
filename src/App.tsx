import { useEffect, useState } from 'react'
import { AiDialog } from './components/AiDialog'
import { AssetBoard } from './components/AssetBoard'
import { CalendarPanel } from './components/CalendarPanel'
import { ClaudeDialog, type ClaudeRequest } from './components/ClaudeDialog'
import { GoalsPanel } from './components/GoalsPanel'
import { IntegrationsPanel } from './components/IntegrationsPanel'
import { LinkForm } from './components/LinkForm'
import { NotesPanel } from './components/NotesPanel'
import { Overview } from './components/Overview'
import { ResearchPanel } from './components/ResearchPanel'
import { SettingsPage } from './components/SettingsPage'
import { TimerPanel } from './components/TimerPanel'
import { BrainstormView } from './components/brainstorm/BrainstormView'
import { CheatSheetView } from './components/cheatsheet/CheatSheetView'
import { NodesView } from './components/graph/NodesView'
import { ModelsView } from './components/models/ModelsView'
import { ConnectClaudeDialog, Welcome } from './components/onboarding/Onboarding'
import { useGlobalDrop } from './globalDrop'
import { PagesView } from './components/pages/PagesView'
import { TablesView } from './components/tables/TablesView'
import { CommandPalette } from './components/shell/CommandPalette'
import { NavRail } from './components/shell/NavRail'
import { ShortcutsDialog } from './components/shell/ShortcutsDialog'
import { TopBar } from './components/shell/TopBar'
import { useLang, useT } from './i18n'
import { resolveSections } from './model/layout'
import type { Project } from './model/schema'
import { saveTextFile } from './platform'
import { sectionDescription, sectionTitle } from './sections'
import { init, notify, setSection, startFresh, useStore, type Section } from './store'
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
    case 'brainstorm':
      return <BrainstormView projectId={id} />
    case 'cheats':
      return <CheatSheetView projectId={id} />
    case 'models':
      return <ModelsView projectId={id} />
    case 'pages':
      return <PagesView projectId={id} />
    case 'tables':
      return <TablesView projectId={id} />
    case 'nodes':
      return <NodesView projectId={id} />
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
  const noticeAction = useStore((s) => s.noticeAction)
  const saveError = useStore((s) => s.saveError)
  const [aiOpen, setAiOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [claudeRequest, setClaudeRequest] = useState<ClaudeRequest | null>(null)
  const theme = data.settings.theme

  useEffect(() => void init(), [])
  useGlobalDrop(status.phase === 'ready' ? (data.projects.find((p) => p.id === activeId && !p.archived)?.id ?? null) : null)
  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'auto' ? '' : theme
  }, [theme])
  const lang = useLang()
  useEffect(() => {
    // lets the browser pick Japanese or Chinese glyph forms and read the page in the right language
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang
  }, [lang])

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

  const bare = ['overview', 'settings', 'planner', 'integrations', 'pages', 'tables', 'nodes', 'cheats', 'brainstorm', 'models'].includes(section)
  const sectionLabel = resolveSections(project).find((e) => e.id === section)?.label ?? ''

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
                <h1>{sectionTitle(t, section, sectionLabel)}</h1>
                <p className="muted">{sectionDescription(t, section)}</p>
              </div>
              <div className={`${bare ? 'page-body' : 'page-body hide-h2'} section-${section}`}>
                <SectionView key={`${project.id}-${section}`} section={section} project={project} onOpenAi={() => setAiOpen(true)} />
              </div>
            </>
          ) : (
            <p className="muted empty">{t('noProjectsBody')}</p>
          )}
        </main>
      </div>
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onClaude={(preset, topic, autorun) => setClaudeRequest({ preset, topic, autorun })}
        />
      )}
      {claudeRequest && projectId && <ClaudeDialog projectId={projectId} initial={claudeRequest} onClose={() => setClaudeRequest(null)} />}
      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      {aiOpen && <AiDialog projectId={projectId} onClose={() => setAiOpen(false)} />}
      <ConnectClaudeDialog />
      {(notice || saveError) && (
        <div className="toast" role="status">
          {notice ?? t('saveFailed', { reason: saveError ?? '' })}
          {notice && noticeAction && (
            <button
              className="toast-action"
              onClick={() => {
                noticeAction.run()
                notify('')
              }}
            >
              {noticeAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
