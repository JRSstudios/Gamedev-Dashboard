import { useState } from 'react'
import { useLang, useT } from '../../i18n'
import type { Column, Row, Table } from '../../model/schema'
import { addRow, cellText, setCell, setTableView, viewColumnOf, type TableView } from '../../model/tables'
import { dayKey, monthGrid } from '../../model/time'
import { getData, mutate } from '../../store'

const VIEWS: TableView[] = ['table', 'kanban', 'calendar', 'gallery']

/** Switch between table, kanban board, calendar and gallery for one table. */
export function ViewSwitch({ table }: { table: Table }) {
  const t = useT()
  const view = table.view
  const needed = view === 'kanban' ? 'select' : view === 'calendar' ? 'date' : null
  const candidates = needed ? table.columns.filter((c) => c.type === needed) : []
  const current = viewColumnOf(table, view)
  return (
    <div className="row view-switch">
      <div className="seg" role="tablist" aria-label={t('tableView')}>
        {VIEWS.map((v) => (
          <button key={v} role="tab" aria-selected={v === view} className={v === view ? 'on' : ''} onClick={() => mutate((d) => setTableView(d, table.id, v, table.viewColumn))}>
            {t(`view_${v}`)}
          </button>
        ))}
      </div>
      {candidates.length > 1 && (
        <select value={current?.id ?? ''} aria-label={t('viewColumn')} onChange={(e) => mutate((d) => setTableView(d, table.id, view, e.target.value))}>
          {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
    </div>
  )
}

/** Title of a row: its first text column, else its first non-empty cell. */
function rowTitle(table: Table, row: Row, untitled: string): string {
  const text = table.columns.find((c) => c.type === 'text')
  return cellText(text ? row.cells[text.id] : undefined) || table.columns.map((c) => cellText(row.cells[c.id])).find(Boolean) || untitled
}

function Fields({ table, row, skip }: { table: Table; row: Row; skip: (c: Column) => boolean }) {
  const titleCol = table.columns.find((c) => c.type === 'text')
  return (
    <dl className="card-fields small">
      {table.columns
        .filter((c) => c.id !== titleCol?.id && !skip(c) && cellText(row.cells[c.id]))
        .slice(0, 5)
        .map((c) => (
          <div key={c.id}>
            <dt className="muted">{c.name}</dt>
            <dd>{c.type === 'checkbox' ? (row.cells[c.id] ? '✓' : '○') : c.type === 'progress' ? `${cellText(row.cells[c.id])}%` : cellText(row.cells[c.id])}</dd>
          </div>
        ))}
    </dl>
  )
}

function Kanban({ table, column }: { table: Table; column: Column }) {
  const t = useT()
  const lanes = [...column.options, null]
  const move = (row: Row, value: string | null) => mutate((d) => setCell(d, table.id, row.id, column.id, value))
  const addTo = (value: string | null) => {
    const before = getData().tables.find((x) => x.id === table.id)?.rows.length ?? 0
    mutate((d) => addRow(d, table.id))
    const row = getData().tables.find((x) => x.id === table.id)?.rows[before]
    if (row && value) move(row, value)
  }
  return (
    <div className="kanban">
      {lanes.map((lane) => {
        const rows = table.rows.filter((r) => (r.cells[column.id] ?? null) === lane)
        if (lane === null && rows.length === 0) return null
        return (
          <section key={lane ?? '∅'} className="lane">
            <h3 className="row-between">
              <span>{lane ?? t('viewNoValue')}</span>
              <span className="small muted">{rows.length}</span>
            </h3>
            {rows.map((r) => (
              <article key={r.id} className="kcard">
                <strong>{rowTitle(table, r, t('untitledRow'))}</strong>
                <Fields table={table} row={r} skip={(c) => c.id === column.id} />
                <select value={(r.cells[column.id] as string | null) ?? ''} aria-label={column.name} onChange={(e) => move(r, e.target.value || null)}>
                  <option value="">{t('viewNoValue')}</option>
                  {column.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </article>
            ))}
            <button className="link" onClick={() => addTo(lane)}>+ {t('addRow')}</button>
          </section>
        )
      })}
    </div>
  )
}

function Calendar({ table, column }: { table: Table; column: Column }) {
  const lang = useLang()
  const t = useT()
  const [cursor, setCursor] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }))
  const byDay = new Map<string, Row[]>()
  for (const r of table.rows) {
    const v = r.cells[column.id]
    if (typeof v === 'string') byDay.set(v, [...(byDay.get(v) ?? []), r])
  }
  const undated = table.rows.filter((r) => typeof r.cells[column.id] !== 'string')
  const move = (delta: number) => setCursor((c) => ({ year: c.month + delta < 0 ? c.year - 1 : c.month + delta > 11 ? c.year + 1 : c.year, month: (c.month + delta + 12) % 12 }))
  return (
    <div className="table-calendar">
      <div className="row-between">
        <button className="link" aria-label={t('prevMonth')} onClick={() => move(-1)}>‹</button>
        <strong>{new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(new Date(cursor.year, cursor.month, 1))}</strong>
        <button className="link" aria-label={t('nextMonth')} onClick={() => move(1)}>›</button>
      </div>
      <div className="cal-grid">
        {monthGrid(cursor.year, cursor.month).map((date) => {
          const key = dayKey(date)
          return (
            <div key={key} className={`cal-cell${date.getMonth() !== cursor.month ? ' outside' : ''}`}>
              <span className="small muted">{date.getDate()}</span>
              {(byDay.get(key) ?? []).map((r) => <span key={r.id} className="cal-entry small clip">{rowTitle(table, r, t('untitledRow'))}</span>)}
            </div>
          )
        })}
      </div>
      {undated.length > 0 && <p className="small muted">{t('viewUndated', { n: undated.length })}</p>}
    </div>
  )
}

function Gallery({ table }: { table: Table }) {
  const t = useT()
  return (
    <div className="gallery">
      {table.rows.map((r) => (
        <article key={r.id} className="panel kcard">
          <strong>{rowTitle(table, r, t('untitledRow'))}</strong>
          <Fields table={table} row={r} skip={() => false} />
        </article>
      ))}
    </div>
  )
}

/** Kanban, calendar or gallery; null for the plain table view. */
export function TableAltView({ table }: { table: Table }) {
  const t = useT()
  if (table.view === 'table') return null
  if (table.view === 'gallery') return <Gallery table={table} />
  const column = viewColumnOf(table, table.view)
  if (!column) return <p className="muted small">{t(table.view === 'kanban' ? 'viewNeedSelect' : 'viewNeedDate')}</p>
  return table.view === 'kanban' ? <Kanban table={table} column={column} /> : <Calendar table={table} column={column} />
}
