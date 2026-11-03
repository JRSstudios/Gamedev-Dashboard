import { useState } from 'react'
import { useT } from '../../i18n'
import { mdToBlocks } from '../../model/importMd'
import { addPage, dailyPage, pageTree } from '../../model/pages'
import { dayKey } from '../../model/time'
import { getData, mutate, setFocus, useStore } from '../../store'
import { Icon } from '../shell/Icon'
import { PageEditor } from './PageEditor'

const PAGE_TEMPLATES = ['blank', 'gdd', 'character', 'level', 'postmortem'] as const
type PageTemplate = (typeof PAGE_TEMPLATES)[number]
const ICONS: Record<PageTemplate, string> = { blank: '', gdd: '🎮', character: '🧑', level: '🗺', postmortem: '📝' }

export function PagesView({ projectId }: { projectId: string }) {
  const t = useT()
  const all = useStore((s) => s.data.pages)
  const focusId = useStore((s) => s.focus.pageId)
  const [menu, setMenu] = useState(false)
  const pages = all.filter((p) => p.projectId === projectId)
  const selected = pages.find((p) => p.id === focusId) ?? pages[0] ?? null
  const tree = pageTree(pages)

  const create = (tpl: PageTemplate, parentId: string | null = null) => {
    const title = tpl === 'blank' ? t('pageTitlePlaceholder') : t(`pageTpl_${tpl}`)
    const blocks = tpl === 'blank' ? undefined : mdToBlocks(t(`pageTplBody_${tpl}`))
    const created = addPage(getData(), projectId, title, blocks, parentId)
    mutate(() => ({ ...created.data, pages: created.data.pages.map((p) => (p.id === created.page.id ? { ...p, icon: ICONS[tpl] } : p)) }))
    setFocus({ pageId: created.page.id })
    setMenu(false)
  }
  const today = () => {
    const r = dailyPage(getData(), projectId, dayKey(new Date()), t('devlog'))
    mutate(() => r.data)
    setFocus({ pageId: r.pageId })
  }

  return (
    <div className="split">
      <aside className="split-list panel">
        <div className="row">
          <button className="primary" onClick={() => setMenu(!menu)} aria-expanded={menu}>+ {t('newPage')}</button>
          <button onClick={today} title={t('devlogHint')}>{t('today')}</button>
        </div>
        {menu && (
          <div className="type-menu" role="menu">
            {PAGE_TEMPLATES.map((tpl, i) => (
              <button key={tpl} role="menuitem" autoFocus={i === 0} onClick={() => create(tpl)} onKeyDown={(e) => e.key === 'Escape' && setMenu(false)}>
                {ICONS[tpl]} {tpl === 'blank' ? t('pageBlank') : t(`pageTpl_${tpl}`)}
              </button>
            ))}
          </div>
        )}
        <ul className="item-list page-tree">
          {tree.map(({ page: p, depth }) => (
            <li key={p.id} style={{ paddingLeft: depth * 14 }}>
              <button className={p.id === selected?.id ? 'item active' : 'item'} onClick={() => setFocus({ pageId: p.id })}>
                {p.icon ? <span className="item-icon">{p.icon}</span> : <Icon name="pages" size={16} />}
                <span className="item-title">{p.title || t('pageTitlePlaceholder')}</span>
              </button>
            </li>
          ))}
        </ul>
        {selected && <button className="link" onClick={() => create('blank', selected.id)}>+ {t('subPage', { name: selected.title })}</button>}
      </aside>
      <div className="split-main">
        {selected ? <PageEditor key={selected.id} page={selected} /> : <p className="muted empty">{t('noPages')}</p>}
      </div>
    </div>
  )
}
