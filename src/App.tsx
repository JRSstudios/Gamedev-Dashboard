import { lazy, Suspense, useEffect, useState } from 'react'
import { AiDialog } from './components/AiDialog'
import { AssetBoard } from './components/AssetBoard'
import { ClaudeDialog, type ClaudeRequest } from './components/ClaudeDialog'
import { GoalsPanel } from './components/GoalsPanel'
import { LinkForm } from './components/LinkForm'
import { NotesPanel } from './components/NotesPanel'
import { Overview } from './components/Overview'
import { ResearchPanel } from './components/ResearchPanel'
import { Tour } from './components/tutorial/Tour'
import { onError, redact } from './features/bugs'
import { reportBug } from './features/reportBug'
import { QuickNote } from './components/QuickNote'
import { AssistantPanel } from './components/assistant/AssistantPanel'
import { ConnectClaudeDialog, Welcome } from './components/onboarding/Onboarding'
import { useGlobalDrop } from './globalDrop'
import { handleExportEvent } from './features/autoImport'
import { startBridge, useBridgeConfigSync } from './features/bridge'
import { CommandPalette } from './components/shell/CommandPalette'
import { NavRail } from './components/shell/NavRail'
import { Icon } from './components/shell/Icon'
import { ShortcutsDialog } from './components/shell/ShortcutsDialog'
import { TopBar } from './components/shell/TopBar'
import { useLang, useT } from './i18n'
import { resolveSections } from './model/layout'
import type { Project } from './model/schema'
import { confirmDialog, IS_DESKTOP, saveTextFile, snapshotNow, takeCrashLog } from './platform'
import { dayKey } from './model/time'
import { groupOf, sectionDescription, sectionTitle } from './sections'
import { getData, init, notify, redo, setSection, startFresh, undo, useStore, type Section } from './store'
import { toggleTimer } from './timerActions'
import { useLanguageReady } from './i18n/load'

// Sections other than the everyday ones load on first visit, which keeps the start bundle small.
const SettingsPage = lazy(() => import('./components/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const PlannerView = lazy(() => import('./components/planner/PlannerView').then((m) => ({ default: m.PlannerView })))
const TemplatesView = lazy(() => import('./components/templates/TemplatesView').then((m) => ({ default: m.TemplatesView })))
const TutorialView = lazy(() => import('./components/tutorial/TutorialView').then((m) => ({ default: m.TutorialView })))
const BugsView = lazy(() => import('./components/bugs/BugsView').then((m) => ({ default: m.BugsView })))
const ShowcaseView = lazy(() => import('./components/showcase/ShowcaseView').then((m) => ({ default: m.ShowcaseView })))
const BrainstormView = lazy(() => import('./components/brainstorm/BrainstormView').then((m) => ({ default: m.BrainstormView })))
const CheatSheetView = lazy(() => import('./components/cheatsheet/CheatSheetView').then((m) => ({ default: m.CheatSheetView })))
const NodesView = lazy(() => import('./components/graph/NodesView').then((m) => ({ default: m.NodesView })))
const ModelsView = lazy(() => import('./components/models/ModelsView').then((m) => ({ default: m.ModelsView })))
const PagesView = lazy(() => import('./components/pages/PagesView').then((m) => ({ default: m.PagesView })))
const TablesView = lazy(() => import('./components/tables/TablesView').then((m) => ({ default: m.TablesView })))
const BlenderPage = lazy(() => import('./components/hub/AppPages').then((m) => ({ default: m.BlenderPage })))
const KritaPage = lazy(() => import('./components/hub/AppPages').then((m) => ({ default: m.KritaPage })))
const UnityPage = lazy(() => import('./components/hub/AppPages').then((m) => ({ default: m.UnityPage })))

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
      return <PlannerView projectId={id} />
    case 'unity':
      return <UnityPage projectId={id} />
    case 'blender':
      return <BlenderPage projectId={id} />
    case 'krita':
      return <KritaPage projectId={id} />
    case 'templates':
      return <TemplatesView projectId={id} />
    case 'tutorial':
      return <TutorialView />
    case 'showcase':
      return <ShowcaseView projectId={id} />
    case 'bugs':
      return <BugsView />
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
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const theme = data.settings.theme

  useEffect(() => void init(), [])
  useGlobalDrop(status.phase === 'ready' ? (data.projects.find((p) => p.id === activeId && !p.archived)?.id ?? null) : null)
  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'auto' ? '' : theme
  }, [theme])
  const lang = useLang()
  const langReady = useLanguageReady(lang)
  useEffect(() => {
    // lets the browser pick Japanese or Chinese glyph forms and read the page in the right language
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang
  }, [lang])

  const project = data.projects.find((p) => p.id === activeId && !p.archived) ?? null
  const projectId = project?.id ?? null
  const phase = status.phase
  useBridgeConfigSync(phase === 'ready' ? project : null, data.settings.bridgeEnabled)
  useEffect(() => {
    if (phase !== 'ready') return
    startBridge(handleExportEvent)
    // A crash in the last run: offer to turn it into a bug report.
    void takeCrashLog().then(async (log) => {
      if (log && (await confirmDialog(t('crashLastRun')))) reportBug({ severity: 'crash', error: redact(log).slice(0, 8000), title: 'Crash in the previous run' })
    })
    // One snapshot per day; a missing backup folder is reported but never blocks the app.
    if (IS_DESKTOP) void snapshotNow(dayKey(new Date()), getData().settings.backupDir).catch((e: unknown) => notify(t('snapBackupFailed', { reason: String(e) })))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once when the data is ready
  }, [phase])

  useEffect(() => {
    const onAsk = (e: Event) => setClaudeRequest({ preset: (e as CustomEvent<{ preset: ClaudeRequest['preset'] }>).detail.preset, topic: '', autorun: true })
    const onTour = () => setTourOpen(true)
    window.addEventListener('gd-claude', onAsk)
    window.addEventListener('gd-tour', onTour)
    return () => {
      window.removeEventListener('gd-claude', onAsk)
      window.removeEventListener('gd-tour', onTour)
    }
  }, [])

  // Unhandled errors: ask once per message whether to prepare a bug report.
  useEffect(() => {
    const asked = new Set<string>()
    return onError((e) => {
      if (asked.has(e.message)) return
      asked.add(e.message)
      notify(t('errorOccurred'), { label: t('bugReport'), run: () => reportBug({ severity: 'high', error: `${e.message}\n${e.stack}`.slice(0, 8000), title: e.message.slice(0, 200) }) })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` only changes with the language
  }, [])

  // First start with a project: show the tour once.
  const tourDone = data.settings.tutorial.tourDone
  const hasProjects = data.projects.length > 0
  useEffect(() => {
    if (phase === 'ready' && hasProjects && !tourDone) setTourOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the app becomes ready
  }, [phase])

  useEffect(() => {
    if (phase !== 'ready') return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const key = e.key.toLowerCase()
      // Text fields keep their own undo; elsewhere Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) work on the data.
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))
      if ((key === 'z' || key === 'y') && !typing) {
        e.preventDefault()
        const redoKey = key === 'y' || e.shiftKey
        if (!(redoKey ? redo() : undo())) notify(t(redoKey ? 'nothingToRedo' : 'nothingToUndo'))
        return
      }
      if (e.shiftKey) return
      if (key === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      } else if (key === 'j' && projectId) {
        e.preventDefault()
        setAssistantOpen((open) => !open)
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

  if (status.phase === 'loading' || !langReady) return <main className="center-screen muted">{t('loading')}</main>
  if (status.phase === 'error') return <ErrorScreen message={status.message} raw={status.raw} />

  const bare = ['overview', 'settings', 'planner', 'unity', 'blender', 'krita', 'pages', 'tables', 'nodes', 'cheats', 'brainstorm', 'models', 'templates', 'tutorial', 'bugs', 'showcase'].includes(section)
  const sectionLabel = resolveSections(project).find((e) => e.id === section)?.label ?? ''

  return (
    <div className="app">
      <NavRail />
      <div className="app-main">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} onOpenAi={() => setAiOpen(true)} onOpenShortcuts={() => setShortcutsOpen(true)} onOpenAssistant={() => setAssistantOpen((open) => !open)} />
        <main className="page">
          {data.projects.length === 0 ? (
            <Welcome />
          ) : project ? (
            <>
              <div className="page-head">
                <nav className="crumbs small muted" aria-label={t('breadcrumbs')}>
                  <span>{project.name}</span>
                  {groupOf(section) && <span>{t(`group_${groupOf(section)!}`)}</span>}
                </nav>
                <div className="page-title-row">
                  <span className="page-icon-badge" aria-hidden="true"><Icon name={section} size={20} /></span>
                  <h1>{sectionTitle(t, section, sectionLabel)}</h1>
                </div>
                <p className="muted">{sectionDescription(t, section)}</p>
              </div>
              <div className={`${bare ? 'page-body' : 'page-body hide-h2'} section-${section}`}>
                <Suspense fallback={<p className="muted">{t('loading')}</p>}>
                  <SectionView key={`${project.id}-${section}`} section={section} project={project} onOpenAi={() => setAiOpen(true)} />
                </Suspense>
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
      {assistantOpen && projectId && <AssistantPanel projectId={projectId} onClose={() => setAssistantOpen(false)} />}
      <QuickNote />
      {tourOpen && <Tour onClose={() => setTourOpen(false)} />}
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
