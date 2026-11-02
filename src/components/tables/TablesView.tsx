import { useState } from 'react'
import { useT } from '../../i18n'
import { addTable, TABLE_TEMPLATES, type TemplateId } from '../../model/tables'
import { getData, mutate, setFocus, useStore } from '../../store'
import { Icon } from '../shell/Icon'
import { TableEditor } from './TableEditor'

const TEMPLATE_IDS = Object.keys(TABLE_TEMPLATES) as TemplateId[]

export function TablesView({ projectId }: { projectId: string }) {
  const t = useT()
  const all = useStore((s) => s.data.tables)
  const focusId = useStore((s) => s.focus.tableId)
  const [name, setName] = useState('')
  const [template, setTemplate] = useState<TemplateId>('assets')
  const tables = all.filter((x) => x.projectId === projectId)
  const selected = tables.find((x) => x.id === focusId) ?? tables[0] ?? null

  const create = () => {
    const created = addTable(getData(), projectId, name || t(`tpl_${template}`), template)
    mutate(() => created.data)
    setFocus({ tableId: created.table.id })
    setName('')
  }

  return (
    <div className="split">
      <aside className="split-list panel">
        <ul className="item-list">
          {tables.map((x) => (
            <li key={x.id}>
              <button className={x.id === selected?.id ? 'item active' : 'item'} onClick={() => setFocus({ tableId: x.id })}>
                <Icon name="tables" size={16} />
                <span className="item-title">{x.name}</span>
                <span className="small muted">{x.rows.length}</span>
              </button>
            </li>
          ))}
        </ul>
        <form
          className="stack new-item"
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
        >
          <input value={name} maxLength={100} placeholder={t('tableNamePlaceholder')} onChange={(e) => setName(e.target.value)} />
          <label className="field">
            {t('template')}
            <select value={template} onChange={(e) => setTemplate(e.target.value as TemplateId)}>
              {TEMPLATE_IDS.map((id) => (
                <option key={id} value={id}>{t(`tpl_${id}`)}</option>
              ))}
            </select>
          </label>
          <button className="primary" type="submit">+ {t('newTable')}</button>
        </form>
      </aside>
      <div className="split-main">
        {selected ? <TableEditor key={selected.id} table={selected} /> : <p className="muted empty">{t('noTables')}</p>}
      </div>
    </div>
  )
}
