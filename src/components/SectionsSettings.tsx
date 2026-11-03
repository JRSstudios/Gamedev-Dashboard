import { useT } from '../i18n'
import { LOCKED, moveSection, renameSection, resetLayout, resolveSections, setSectionVisible } from '../model/layout'
import { sectionTitle } from '../sections'
import { mutate, useStore } from '../store'
import { Icon } from './shell/Icon'

/** Settings → Sections: show/hide, rename and reorder the navigation of the active project. */
export function SectionsSettings() {
  const t = useT()
  const projectId = useStore((s) => s.activeProjectId)
  const project = useStore((s) => s.data.projects.find((p) => p.id === s.activeProjectId))
  if (!project || !projectId) return null
  const entries = resolveSections(project)
  const movable = entries.filter((e) => !LOCKED.includes(e.id))

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{t('sectionsTitle')}</h2>
        <button onClick={() => mutate((d) => resetLayout(d, projectId))}>{t('sectionsReset')}</button>
      </div>
      <p className="muted small">{t('sectionsIntro')}</p>
      <ul className="sections-list">
        {movable.map((e, i) => (
          <li key={e.id} className={e.visible ? '' : 'off'}>
            <Icon name={e.id} />
            <input
              value={e.label || sectionTitle(t, e.id)}
              maxLength={60}
              aria-label={t('rename')}
              // The built-in name is shown as the value; keeping it unchanged stores no custom name.
              onChange={(ev) => mutate((d) => renameSection(d, projectId, e.id, ev.target.value === sectionTitle(t, e.id) ? '' : ev.target.value))}
            />
            <label className="check small">
              <input type="checkbox" checked={e.visible} onChange={(ev) => mutate((d) => setSectionVisible(d, projectId, e.id, ev.target.checked))} />
              {t('sectionShown')}
            </label>
            <button className="icon" aria-label={t('moveUp')} disabled={i === 0} onClick={() => mutate((d) => moveSection(d, projectId, e.id, movable[i - 1].id))}>
              ↑
            </button>
            <button className="icon" aria-label={t('moveDown')} disabled={i === movable.length - 1} onClick={() => mutate((d) => moveSection(d, projectId, e.id, movable[i + 1].id))}>
              ↓
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
