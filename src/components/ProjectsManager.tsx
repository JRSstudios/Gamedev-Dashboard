import { useState } from 'react'
import { useT } from '../i18n'
import { addProject, deleteProject, updateProject } from '../model/ops'
import { projectProgress } from '../model/progress'
import { confirmDialog } from '../platform'
import { mutate, setActiveProject, useStore } from '../store'
import { ProgressBar } from './ProgressBar'

export function ProjectsManager() {
  const t = useT()
  const data = useStore((s) => s.data)
  const activeId = useStore((s) => s.activeProjectId)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const create = () => {
    if (!name.trim()) return
    const { data: next, project } = addProject(data, name)
    mutate(() => next)
    setActiveProject(project.id)
    setName('')
  }

  const remove = async (id: string, projectName: string) => {
    if (!(await confirmDialog(t('confirmDeleteProject', { name: projectName })))) return
    mutate((d) => deleteProject(d, id))
    if (activeId === id) setActiveProject(data.projects.find((p) => p.id !== id && !p.archived)?.id ?? null)
  }

  const visible = data.projects.filter((p) => showArchived || !p.archived)
  const hasArchived = data.projects.some((p) => p.archived)

  return (
    <section className="panel projects-manager" aria-label={t('projects')}>
      <h2>{t('settingsProjects')}</h2>
      <ul className="project-list">
        {visible.map((p) => {
          const prog = projectProgress(data, p.id)
          return (
            <li key={p.id} className={p.id === activeId ? 'project active' : 'project'}>
              {editing === p.id ? (
                <input
                  autoFocus
                  defaultValue={p.name}
                  maxLength={100}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v) mutate((d) => updateProject(d, p.id, { name: v }))
                    setEditing(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setEditing(null)
                  }}
                />
              ) : (
                <button className="project-main" onClick={() => setActiveProject(p.id)}>
                  <span className="dot" style={{ background: p.color }} />
                  <span className="project-name">{p.name}</span>
                  <span className="muted small">{prog.pct}%</span>
                </button>
              )}
              <ProgressBar pct={prog.pct} color={p.color} thin label={p.name} />
              <div className="row-actions">
                <button className="link" onClick={() => setEditing(p.id)}>{t('rename')}</button>
                <button className="link" onClick={() => mutate((d) => updateProject(d, p.id, { archived: !p.archived }))}>
                  {p.archived ? t('unarchive') : t('archive')}
                </button>
                <button className="link danger" onClick={() => void remove(p.id, p.name)}>{t('delete')}</button>
              </div>
            </li>
          )
        })}
      </ul>
      <label className="field">
        <span className="field-label">{t('projectNamePlaceholder')}</span>
        <input
          value={name}
          maxLength={100}
          aria-label={t('newProject')}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
      </label>
      <button className="primary" onClick={create}>+ {t('newProject')}</button>
      {hasArchived && (
        <label className="check small muted">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          {t('showArchived')}
        </label>
      )}
    </section>
  )
}
