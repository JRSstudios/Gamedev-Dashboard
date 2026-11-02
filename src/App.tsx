import { useEffect, useState } from 'react'
import { AiDialog } from './components/AiDialog'
import { AssetBoard } from './components/AssetBoard'
import { GoalsPanel } from './components/GoalsPanel'
import { NotesPanel } from './components/NotesPanel'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { useT } from './i18n'
import { addProject } from './model/ops'
import { saveTextFile } from './platform'
import { init, mutate, setActiveProject, startFresh, useStore } from './store'

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

export default function App() {
  const t = useT()
  const status = useStore((s) => s.status)
  const data = useStore((s) => s.data)
  const activeId = useStore((s) => s.activeProjectId)
  const notice = useStore((s) => s.notice)
  const saveError = useStore((s) => s.saveError)
  const [aiOpen, setAiOpen] = useState(false)
  const theme = data.settings.theme

  useEffect(() => void init(), [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'auto' ? '' : theme
  }, [theme])

  if (status.phase === 'loading') return <main className="center-screen muted">{t('loading')}</main>
  if (status.phase === 'error') return <ErrorScreen message={status.message} raw={status.raw} />

  const project = data.projects.find((p) => p.id === activeId && !p.archived) ?? null

  return (
    <div className="app">
      <TopBar onOpenAi={() => setAiOpen(true)} />
      {data.projects.length === 0 ? (
        <Welcome />
      ) : (
        <div className="layout">
          <Sidebar />
          {project ? (
            <>
              <GoalsPanel key={`g-${project.id}`} projectId={project.id} color={project.color} />
              <AssetBoard key={`a-${project.id}`} projectId={project.id} />
              <NotesPanel key={`n-${project.id}`} projectId={project.id} />
            </>
          ) : (
            <p className="muted empty">{t('noProjectsBody')}</p>
          )}
        </div>
      )}
      {aiOpen && <AiDialog projectId={project?.id ?? null} onClose={() => setAiOpen(false)} />}
      {(notice || saveError) && (
        <div className="toast" role="status">
          {notice ?? t('saveFailed', { reason: saveError ?? '' })}
        </div>
      )}
    </div>
  )
}
