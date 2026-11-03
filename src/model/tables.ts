import { removeRefs } from './graph'
import { isHttpUrl, type Cell, type Column, type ColumnType, type Data, type Row, type Table } from './schema'

const uid = (): string => crypto.randomUUID()
const now = (): string => new Date().toISOString()

export const MAX_COLUMNS = 30
export const MAX_ROWS = 2000

/** Coerces a value to what the column type allows; anything else becomes null. */
export function sanitizeCell(column: Pick<Column, 'type' | 'options'>, value: unknown): Cell {
  if (value === null || value === undefined || value === '') return null
  switch (column.type) {
    case 'text':
      return String(value).slice(0, 2000)
    case 'number': {
      const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
      return Number.isFinite(n) ? n : null
    }
    case 'checkbox':
      return value === true || value === 'true'
    case 'select': {
      const s = String(value)
      return column.options.includes(s) ? s : null
    }
    case 'date': {
      const s = String(value).slice(0, 10)
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
    }
    case 'progress': {
      const n = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null
    }
    case 'url': {
      const s = String(value).trim()
      return isHttpUrl(s) ? s.slice(0, 2000) : null
    }
  }
}

export interface ColumnSpec {
  name: string
  type: ColumnType
  options?: string[]
}

export const TABLE_TEMPLATES = {
  blank: [{ name: 'Name', type: 'text' }],
  assets: [
    { name: 'Asset', type: 'text' },
    { name: 'Type', type: 'select', options: ['Sprite', 'Model', 'Music', 'SFX', 'UI'] },
    { name: 'Status', type: 'select', options: ['Idea', 'WIP', 'Done'] },
    { name: 'Progress', type: 'progress' },
    { name: 'Due', type: 'date' },
  ],
  tasks: [
    { name: 'Task', type: 'text' },
    { name: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
    { name: 'Done', type: 'checkbox' },
    { name: 'Due', type: 'date' },
  ],
  characters: [
    { name: 'Character', type: 'text' },
    { name: 'Role', type: 'select', options: ['Player', 'Enemy', 'NPC', 'Boss'] },
    { name: 'HP', type: 'number' },
    { name: 'Notes', type: 'text' },
  ],
  levels: [
    { name: 'Level', type: 'text' },
    { name: 'Theme', type: 'text' },
    { name: 'Status', type: 'select', options: ['Blockout', 'Art', 'Polish', 'Done'] },
    { name: 'Progress', type: 'progress' },
  ],
} satisfies Record<string, ColumnSpec[]>
export type TemplateId = keyof typeof TABLE_TEMPLATES

const column = (spec: ColumnSpec): Column => ({
  id: uid(),
  name: spec.name.trim().slice(0, 60) || 'Column',
  type: spec.type,
  options: (spec.options ?? []).map((o) => o.trim().slice(0, 40)).filter(Boolean).slice(0, 30),
})

export function addTable(data: Data, projectId: string, name: string, template: TemplateId = 'blank'): { data: Data; table: Table } {
  const table: Table = {
    id: uid(),
    projectId,
    name: name.trim().slice(0, 100) || 'Table',
    columns: ((TABLE_TEMPLATES[template] ?? TABLE_TEMPLATES.blank) as ColumnSpec[]).map(column),
    rows: [],
    createdAt: now(),
    view: 'table',
    viewColumn: null,
  }
  return { data: { ...data, tables: [...data.tables, table] }, table }
}

const mapTable = (data: Data, tableId: string, fn: (t: Table) => Table): Data => ({
  ...data,
  tables: data.tables.map((t) => (t.id === tableId ? fn(t) : t)),
})

export const renameTable = (data: Data, tableId: string, name: string): Data =>
  mapTable(data, tableId, (t) => ({ ...t, name: name.trim().slice(0, 100) || t.name }))

export function deleteTable(data: Data, tableId: string): Data {
  const next: Data = {
    ...data,
    tables: data.tables.filter((t) => t.id !== tableId),
    pages: data.pages.map((p) =>
      p.blocks.some((b) => b.type === 'table' && b.tableId === tableId)
        ? { ...p, blocks: p.blocks.map((b) => (b.type === 'table' && b.tableId === tableId ? { ...b, tableId: null } : b)) }
        : p,
    ),
  }
  return removeRefs(next, 'table', tableId)
}

export const addColumn = (data: Data, tableId: string, spec: ColumnSpec): Data =>
  mapTable(data, tableId, (t) => (t.columns.length >= MAX_COLUMNS ? t : { ...t, columns: [...t.columns, column(spec)] }))

/** Updates a column and re-checks every cell in it, so values that no longer fit are cleared. */
export function updateColumn(data: Data, tableId: string, columnId: string, patch: Partial<ColumnSpec>): Data {
  return mapTable(data, tableId, (t) => {
    const old = t.columns.find((c) => c.id === columnId)
    if (!old) return t
    const next = column({ name: patch.name ?? old.name, type: patch.type ?? old.type, options: patch.options ?? old.options })
    const updated: Column = { ...next, id: old.id }
    return {
      ...t,
      columns: t.columns.map((c) => (c.id === columnId ? updated : c)),
      rows: t.rows.map((r) => (columnId in r.cells ? { ...r, cells: { ...r.cells, [columnId]: sanitizeCell(updated, r.cells[columnId]) } } : r)),
    }
  })
}

export const deleteColumn = (data: Data, tableId: string, columnId: string): Data =>
  mapTable(data, tableId, (t) => ({
    ...t,
    columns: t.columns.filter((c) => c.id !== columnId),
    rows: t.rows.map((r) => {
      const { [columnId]: _gone, ...cells } = r.cells
      return { ...r, cells }
    }),
  }))

export const addRow = (data: Data, tableId: string): Data =>
  mapTable(data, tableId, (t) => (t.rows.length >= MAX_ROWS ? t : { ...t, rows: [...t.rows, { id: uid(), cells: {} }] }))

export const deleteRow = (data: Data, tableId: string, rowId: string): Data =>
  mapTable(data, tableId, (t) => ({ ...t, rows: t.rows.filter((r) => r.id !== rowId) }))

export function moveRow(data: Data, tableId: string, activeId: string, overId: string): Data {
  return mapTable(data, tableId, (t) => {
    const from = t.rows.findIndex((r) => r.id === activeId)
    const to = t.rows.findIndex((r) => r.id === overId)
    if (from < 0 || to < 0 || from === to) return t
    const rows = [...t.rows]
    const [moved] = rows.splice(from, 1)
    rows.splice(to, 0, moved)
    return { ...t, rows }
  })
}

export function setCell(data: Data, tableId: string, rowId: string, columnId: string, value: unknown): Data {
  return mapTable(data, tableId, (t) => {
    const col = t.columns.find((c) => c.id === columnId)
    if (!col) return t
    const cell = sanitizeCell(col, value)
    return { ...t, rows: t.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: cell } } : r)) }
  })
}

/** View helper: rows sorted by one column (empty cells last). Does not change the stored order. */
export function sortedRows(table: Table, columnId: string | null, dir: 'asc' | 'desc'): Row[] {
  if (!columnId) return table.rows
  const sign = dir === 'asc' ? 1 : -1
  return [...table.rows].sort((a, b) => {
    const x = a.cells[columnId] ?? null
    const y = b.cells[columnId] ?? null
    if (x === null && y === null) return 0
    if (x === null) return 1
    if (y === null) return -1
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign
    return String(x).localeCompare(String(y), undefined, { numeric: true }) * sign
  })
}

export function cellText(value: Cell | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? '✓' : ''
  return String(value)
}

export function tableToMarkdown(table: Table): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const head = `| ${table.columns.map((c) => esc(c.name)).join(' | ')} |`
  const sep = `| ${table.columns.map(() => '---').join(' | ')} |`
  const rows = table.rows.map((r) => `| ${table.columns.map((c) => esc(cellText(r.cells[c.id]))).join(' | ')} |`)
  return [`### ${table.name}`, '', head, sep, ...rows].join('\n')
}

export type TableView = Table['view']

/** Switches how a table is shown; the column groups the kanban board or places rows in the calendar. */
export const setTableView = (data: Data, tableId: string, view: TableView, viewColumn: string | null): Data =>
  mapTable(data, tableId, (t) => ({ ...t, view, viewColumn: viewColumn && t.columns.some((c) => c.id === viewColumn) ? viewColumn : null }))

/** The column a view uses: the chosen one if it still fits, else the first column of the right type. */
export function viewColumnOf(table: Table, view: TableView): Column | null {
  const type = view === 'kanban' ? 'select' : view === 'calendar' ? 'date' : null
  if (!type) return null
  return table.columns.find((c) => c.id === table.viewColumn && c.type === type) ?? table.columns.find((c) => c.type === type) ?? null
}
