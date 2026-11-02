import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { useT } from '../../i18n'
import { COLUMN_TYPES, type Cell, type Column, type ColumnType, type Row, type Table } from '../../model/schema'
import {
  addColumn,
  addRow,
  cellText,
  deleteColumn,
  deleteRow,
  deleteTable,
  moveRow,
  renameTable,
  setCell,
  sortedRows,
  updateColumn,
} from '../../model/tables'
import { confirmDialog, openLink } from '../../platform'
import { mutate, openItem } from '../../store'
import { DraftInput } from '../DraftInput'
import { ProgressBar } from '../ProgressBar'

/** Stable colour per choice so the same value always looks the same. */
const CHIP_COLORS = 6
const chipIndex = (value: string, options: string[]) => {
  const i = options.indexOf(value)
  return (i < 0 ? 0 : i) % CHIP_COLORS
}

function CellEditor({ table, row, column }: { table: Table; row: Row; column: Column }) {
  const t = useT()
  const value: Cell | undefined = row.cells[column.id]
  const set = (v: unknown) => mutate((d) => setCell(d, table.id, row.id, column.id, v))
  const label = column.name

  switch (column.type) {
    case 'checkbox':
      return <input type="checkbox" aria-label={label} checked={value === true} onChange={(e) => set(e.target.checked)} />
    case 'select':
      return (
        <select
          aria-label={label}
          className={value ? `chip-select chip-${chipIndex(String(value), column.options)}` : 'chip-select'}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value)}
        >
          <option value="">—</option>
          {column.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )
    case 'date':
      return <input type="date" aria-label={label} value={typeof value === 'string' ? value : ''} onChange={(e) => set(e.target.value)} />
    case 'progress': {
      const pct = typeof value === 'number' ? value : 0
      return (
        <div className="cell-progress">
          <ProgressBar pct={pct} thin label={label} />
          <input type="range" min={0} max={100} step={5} aria-label={label} value={pct} onChange={(e) => set(Number(e.target.value))} />
          <span className="small muted">{pct}%</span>
        </div>
      )
    }
    case 'url':
      return (
        <div className="cell-url">
          <DraftInput type="url" aria-label={label} placeholder="https://" value={typeof value === 'string' ? value : ''} onCommit={set} />
          {typeof value === 'string' && (
            <button className="icon" aria-label={t('nodesOpen')} title={value} onClick={() => void openLink(value)}>↗</button>
          )}
        </div>
      )
    case 'number':
      return <DraftInput inputMode="decimal" aria-label={label} value={cellText(value)} onCommit={set} />
    case 'text':
      return <DraftInput aria-label={label} value={cellText(value)} maxLength={2000} onCommit={set} />
  }
}

function SortableRow({ table, row, sortable }: { table: Table; row: Row; sortable: boolean }) {
  const t = useT()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled: !sortable })
  return (
    <tr ref={setNodeRef} className={isDragging ? 'dragging' : undefined} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <td className="grip-cell">
        {sortable && (
          <button className="grip" aria-label={t('dragToReorder')} title={t('dragToReorder')} {...attributes} {...listeners}>⋮⋮</button>
        )}
      </td>
      {table.columns.map((c) => (
        <td key={c.id} className={`cell-${c.type}`}>
          <CellEditor table={table} row={row} column={c} />
        </td>
      ))}
      <td className="row-actions-cell">
        <button className="icon" aria-label={t('deleteRow')} title={t('deleteRow')} onClick={() => mutate((d) => deleteRow(d, table.id, row.id))}>×</button>
      </td>
    </tr>
  )
}

function ColumnForm({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: { name: string; type: ColumnType; options: string[] }
  onSave: (spec: { name: string; type: ColumnType; options: string[] }) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const t = useT()
  const [name, setName] = useState(initial.name)
  const [type, setType] = useState<ColumnType>(initial.type)
  const [options, setOptions] = useState(initial.options.join(', '))
  return (
    <form
      className="column-form panel"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ name, type, options: options.split(',').map((o) => o.trim()).filter(Boolean) })
      }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <label className="field">
        {t('columnName')}
        <input autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        {t('columnType')}
        <select value={type} onChange={(e) => setType(e.target.value as ColumnType)}>
          {COLUMN_TYPES.map((ct) => (
            <option key={ct} value={ct}>{t(`col_${ct}`)}</option>
          ))}
        </select>
      </label>
      {type === 'select' && (
        <label className="field">
          {t('columnOptions')}
          <input value={options} maxLength={1200} placeholder="Idea, WIP, Done" onChange={(e) => setOptions(e.target.value)} />
        </label>
      )}
      <div className="row-actions">
        <button className="primary" type="submit">OK</button>
        <button type="button" onClick={onClose}>{t('cancel')}</button>
        {onDelete && (
          <button type="button" className="danger" onClick={onDelete}>{t('deleteColumn')}</button>
        )}
      </div>
    </form>
  )
}

/** `embedded`: shown inside a page, without rename/delete and with a link to the full table. */
export function TableEditor({ table, embedded = false }: { table: Table; embedded?: boolean }) {
  const t = useT()
  const [filter, setFilter] = useState('')
  const [sortCol, setSortCol] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const q = filter.trim().toLowerCase()
  const rows = sortedRows(table, sortCol || null, sortDir).filter(
    (r) => !q || table.columns.some((c) => cellText(r.cells[c.id]).toLowerCase().includes(q)),
  )
  // Dragging only makes sense when the list shows the stored order.
  const sortable = !q && !sortCol

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) mutate((d) => moveRow(d, table.id, String(active.id), String(over.id)))
  }

  const editColumn = editing && editing !== 'new' ? table.columns.find((c) => c.id === editing) : null

  return (
    <section className="table-editor" aria-label={table.name}>
      {embedded ? (
        <div className="table-head">
          <strong>{table.name}</strong>
          <span className="small muted">{t('rowsCount', { n: table.rows.length })}</span>
          <button className="ghost small" onClick={() => openItem('table', table.id)}>{t('openTable')} ↗</button>
        </div>
      ) : (
      <div className="table-head">
        <DraftInput
          className="title-input"
          value={table.name}
          maxLength={100}
          aria-label={t('rename')}
          onCommit={(v) => mutate((d) => renameTable(d, table.id, v))}
        />
        <span className="small muted">{t('rowsCount', { n: table.rows.length })}</span>
        <button
          className="icon"
          aria-label={t('deleteTable')}
          title={t('deleteTable')}
          onClick={async () => {
            if (await confirmDialog(t('confirmDeleteTable', { name: table.name }))) mutate((d) => deleteTable(d, table.id))
          }}
        >
          ×
        </button>
      </div>
      )}

      {!embedded && (
      <div className="toolbar">
        <input type="search" value={filter} placeholder={t('filterRows')} onChange={(e) => setFilter(e.target.value)} />
        <select value={sortCol} aria-label={t('sortNone')} onChange={(e) => setSortCol(e.target.value)}>
          <option value="">{t('sortNone')}</option>
          {table.columns.map((c) => (
            <option key={c.id} value={c.id}>↕ {c.name}</option>
          ))}
        </select>
        {sortCol && (
          <button onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')} aria-label={sortDir}>{sortDir === 'asc' ? '↑' : '↓'}</button>
        )}
      </div>
      )}

      {editing === 'new' && (
        <ColumnForm
          initial={{ name: '', type: 'text', options: [] }}
          onClose={() => setEditing(null)}
          onSave={(spec) => {
            mutate((d) => addColumn(d, table.id, spec))
            setEditing(null)
          }}
        />
      )}
      {editColumn && (
        <ColumnForm
          key={editColumn.id}
          initial={editColumn}
          onClose={() => setEditing(null)}
          onSave={async (spec) => {
            if (spec.type !== editColumn.type && table.rows.some((r) => r.cells[editColumn.id] != null) && !(await confirmDialog(t('confirmTypeChange')))) return
            mutate((d) => updateColumn(d, table.id, editColumn.id, spec))
            setEditing(null)
          }}
          onDelete={() => {
            mutate((d) => deleteColumn(d, table.id, editColumn.id))
            setEditing(null)
          }}
        />
      )}

      <div className="table-scroll">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <table className="db-table">
          <thead>
            <tr>
              <th className="grip-cell" aria-hidden="true" />
              {table.columns.map((c) => (
                <th key={c.id}>
                  <button className="th-btn" title={t('editColumn')} onClick={() => setEditing(c.id)}>
                    <span className="th-type">{t(`col_${c.type}`)}</span>
                    {c.name}
                  </button>
                </th>
              ))}
              <th className="row-actions-cell">
                <button className="icon" aria-label={t('addColumn')} title={t('addColumn')} disabled={table.columns.length >= 30} onClick={() => setEditing('new')}>+</button>
              </th>
            </tr>
          </thead>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {rows.map((r) => (
                <SortableRow key={r.id} table={table} row={r} sortable={sortable} />
              ))}
            </tbody>
          </SortableContext>
        </table>
        </DndContext>
        {rows.length === 0 && <p className="muted empty">{t('emptyTable')}</p>}
      </div>
      <div>
        <button onClick={() => mutate((d) => addRow(d, table.id))} disabled={table.rows.length >= 2000}>+ {t('addRow')}</button>
      </div>
    </section>
  )
}
