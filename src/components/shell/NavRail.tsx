import { useState } from 'react'
import { useT } from '../../i18n'
import { SECTION_GROUPS, sectionTitle, type SectionGroupId } from '../../sections'
import { resolveSections, type SectionEntry } from '../../model/layout'
import { addProject } from '../../model/ops'
import { getData, mutate, setActiveProject, setSection, useStore } from '../../store'
import { Icon } from './Icon'
import { openUnityProject } from '../../features/onboarding'
import { IS_DESKTOP } from '../../platform'

const COLLAPSED_KEY = 'gamedev-dashboard.navCollapsed'

function readCollapsed(): Set<SectionGroupId> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is SectionGroupId => SECTION_GROUPS.some((g) => g.id === x)) : [])
  } catch {
    return new Set()
  }
}

export function NavRail() {
  const t = useT()
  const projects = useStore((s) => s.data.projects)
  const activeId = useStore((s) => s.activeProjectId)
  const section = useStore((s) => s.section)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const active = projects.filter((p) => !p.archived)
  const entries = resolveSections(active.find((p) => p.id === activeId)).filter((e) => e.visible)
  const [collapsed, setCollapsed] = useState<Set<SectionGroupId>>(readCollapsed)
  const toggleGroup = (id: SectionGroupId) => {
    const next = new Set(collapsed)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]))
    } catch {
      /* ignore */
    }
  }

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
    <aside className="navrail" data-tour="nav">
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
            onChange={(e) => {
              const v = e.target.value
              if (v === '__new') setCreating(true)
              else if (v === '__unity') void openUnityProject(t, true)
              else setActiveProject(v)
            }}
          >
            {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="__new">+ {t('newProjectEllipsis')}</option>
            {IS_DESKTOP && <option value="__unity">+ {t('onbUnityButton')}…</option>}
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

      <nav aria-label={t('projects')} className="nav-groups">
        {SECTION_GROUPS.map((g) => {
          const items = entries.filter((e) => (g.sections as readonly string[]).includes(e.id))
          if (items.length === 0) return null
          // The group with the open section never collapses, so the current place stays visible.
          const open = !collapsed.has(g.id) || items.some((e) => e.id === section)
          return (
            <div key={g.id} className="nav-group">
              <button className="nav-group-head" aria-expanded={open} onClick={() => toggleGroup(g.id)}>
                <span>{t(`group_${g.id}`)}</span>
                <Icon name="chevron" size={12} />
              </button>
              {open && <ul className="nav-list">{items.map(item)}</ul>}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
