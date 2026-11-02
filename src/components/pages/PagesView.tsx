import { useT } from '../../i18n'
import { addPage } from '../../model/pages'
import { getData, mutate, setFocus, useStore } from '../../store'
import { Icon } from '../shell/Icon'
import { PageEditor } from './PageEditor'

export function PagesView({ projectId }: { projectId: string }) {
  const t = useT()
  const all = useStore((s) => s.data.pages)
  const focusId = useStore((s) => s.focus.pageId)
  const pages = all.filter((p) => p.projectId === projectId)
  const selected = pages.find((p) => p.id === focusId) ?? pages[0] ?? null

  const create = () => {
    const created = addPage(getData(), projectId, t('pageTitlePlaceholder'))
    mutate(() => created.data)
    setFocus({ pageId: created.page.id })
  }

  return (
    <div className="split">
      <aside className="split-list panel">
        <ul className="item-list">
          {pages.map((p) => (
            <li key={p.id}>
              <button className={p.id === selected?.id ? 'item active' : 'item'} onClick={() => setFocus({ pageId: p.id })}>
                {p.icon ? <span className="item-icon">{p.icon}</span> : <Icon name="pages" size={16} />}
                <span className="item-title">{p.title || t('pageTitlePlaceholder')}</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="primary" onClick={create}>+ {t('newPage')}</button>
      </aside>
      <div className="split-main">
        {selected ? <PageEditor key={selected.id} page={selected} /> : <p className="muted empty">{t('noPages')}</p>}
      </div>
    </div>
  )
}
