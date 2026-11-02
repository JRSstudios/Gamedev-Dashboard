import { useState } from 'react'
import { useT } from '../../i18n'
import { sectionTitle } from '../../sections'
import { resolveSections, type SectionEntry } from '../../model/layout'
import { addProject } from '../../model/ops'
import { getData, mutate, setActiveProject, setSection, useStore } from '../../store'
import { Icon } from './Icon'

export function NavRail() {
  const t = useT()
  const projects = useStore((s) => s.data.projects)
  const activeId = useStore((s) => s.activeProjectId)
  const section = useStore((s) => s.section)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const active = projects.filter((p) => !p.archived)
  const entries = resolveSections(active.find((p) => p.id === activeId)).filter((e) => e.visible)
  const main = entries.filter((e) => e.id !== 'settings')
  const tools = entries.filter((e) => e.id === 'settings')

  const create = () => {
    if (!name.trim()) return setCreating(false)
    const { data: next, project } = addProject(getData(), name)
    mutate(() => next)
    setActiveProject(project.id)
    setName('')
    setCreating(false)
  }

  const item = ({ id: s, label }: SectionEntry) => (
    <li key={s}>
      <button className={s === section ? 'nav-item active' : 'nav-item'} aria-current={s === section ? 'page' : undefined} onClick={() => setSection(s)}>
        <Icon name={s} />
        {sectionTitle(t, s, label)}
      </button>
    </li>
  )

  return (
    <aside className="navrail">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <strong>{t('appName')}</strong>
      </div>

      <div className="project-switch">
        <label className="small muted" htmlFor="project-select">{t('projectSwitch')}</label>
        <div className="select-wrap">
          <select
            id="project-select"
            value={activeId ?? ''}
            onChange={(e) => (e.target.value === '__new' ? setCreating(true) : setActiveProject(e.target.value))}
          >
            {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="__new">+ {t('newProjectEllipsis')}</option>
          </select>
          <Icon name="chevron" size={14} />
        </div>
        {creating && (
          <input
            autoFocus
            value={name}
            maxLength={100}
            placeholder={t('projectNamePlaceholder')}
            onChange={(e) => setName(e.target.value)}
            onBlur={create}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create()
              if (e.key === 'Escape') setCreating(false)
            }}
          />
        )}
      </div>

      <nav aria-label={t('projects')}>
        <ul className="nav-list">{main.map(item)}</ul>
        <hr />
        <ul className="nav-list">{tools.map(item)}</ul>
      </nav>
    </aside>
  )
}
