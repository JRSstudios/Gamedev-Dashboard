import { addPage, MAX_BLOCKS } from './pages'
import { COLUMN_TYPES, type Block, type ColumnType, type Data } from './schema'
import { addTable, sanitizeCell, type ColumnSpec } from './tables'

/**
 * Plain Markdown and CSV to pages and tables: used by templates and by the Obsidian / Notion
 * import. Only text is read; links stay as text, embedded files are not followed.
 */

const uid = (): string => crypto.randomUUID()
const clip = (s: string, n: number) => s.slice(0, n)

/** Markdown to page blocks: headings, lists, checklists, quotes as callouts, rules, paragraphs. */
export function mdToBlocks(md: string): Block[] {
  const blocks: Block[] = []
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  let para: string[] = []
  let list: string[] | null = null
  let checks: { text: string; done: boolean }[] | null = null
  let quote: string[] | null = null
  let inCode = false
  let code: string[] = []

  const flush = () => {
    if (para.length) blocks.push({ id: uid(), type: 'paragraph', text: clip(para.join('\n').trim(), 5000) })
    if (list) blocks.push({ id: uid(), type: 'list', items: list.slice(0, 200).map((i) => clip(i, 500)) })
    if (checks) blocks.push({ id: uid(), type: 'checklist', items: checks.slice(0, 200).map((i) => ({ text: clip(i.text, 500), done: i.done })) })
    if (quote) blocks.push({ id: uid(), type: 'callout', text: clip(quote.join('\n').trim(), 5000) })
    para = []
    list = checks = quote = null
  }

  for (const raw of lines) {
    if (raw.trim().startsWith('```')) {
      if (inCode) {
        blocks.push({ id: uid(), type: 'paragraph', text: clip('`' + code.join('\n') + '`', 5000) })
        code = []
      } else flush()
      inCode = !inCode
      continue
    }
    if (inCode) {
      code.push(raw)
      continue
    }
    const line = raw.trimEnd()
    if (!line.trim()) {
      flush()
      continue
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    const check = /^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line)
    const item = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ id: uid(), type: 'heading', text: clip(heading[2].trim(), 5000), level: heading[1].length <= 1 ? 1 : 2 })
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush()
      blocks.push({ id: uid(), type: 'divider' })
    } else if (check) {
      if (!checks) flush()
      checks ??= []
      checks.push({ text: check[2].trim(), done: check[1] !== ' ' })
    } else if (item) {
      if (!list) flush()
      list ??= []
      list.push(item[1].trim())
    } else if (line.startsWith('>')) {
      if (!quote) flush()
      quote ??= []
      quote.push(line.replace(/^>\s?/, ''))
    } else {
      if (list || checks || quote) flush()
      para.push(line)
    }
  }
  if (inCode && code.length) blocks.push({ id: uid(), type: 'paragraph', text: clip('`' + code.join('\n') + '`', 5000) })
  flush()
  return blocks.slice(0, MAX_BLOCKS)
}

/** Title from front matter, the first heading, or the file name; the rest becomes the body. */
export function splitMarkdown(md: string, fileName: string): { title: string; body: string } {
  let text = md.replace(/^﻿/, '')
  const front = /^---\n([\s\S]*?)\n---\n?/.exec(text.replace(/\r\n?/g, '\n'))
  let title = ''
  if (front) {
    title = /^title:\s*["']?(.*?)["']?\s*$/m.exec(front[1])?.[1] ?? ''
    text = text.replace(/\r\n?/g, '\n').slice(front[0].length)
  }
  const h1 = /^#\s+(.+)$/m.exec(text)
  if (!title && h1 && text.trimStart().startsWith(h1[0])) {
    title = h1[1]
    text = text.replace(h1[0], '')
  }
  // Notion adds a 32-character id to exported file names.
  const fromName = fileName.replace(/\.(md|markdown|txt)$/i, '').replace(/\s+[0-9a-f]{32}$/i, '')
  return { title: clip((title || fromName).trim() || 'Untitled', 200), body: text }
}

/** RFC 4180 style CSV: quotes, doubled quotes, commas or semicolons, line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const firstLine = src.split('\n')[0] ?? ''
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === sep) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x.trim()))
}

const looksLike = (values: string[], test: (v: string) => boolean) => values.length > 0 && values.every(test)

/** Picks a column type from the values: numbers, dates, yes/no, links, otherwise text. */
export function guessColumnType(values: string[]): ColumnType {
  const v = values.map((x) => x.trim()).filter(Boolean)
  if (looksLike(v, (x) => /^-?\d+([.,]\d+)?$/.test(x))) return 'number'
  if (looksLike(v, (x) => /^\d{4}-\d{2}-\d{2}/.test(x))) return 'date'
  if (looksLike(v, (x) => /^(yes|no|true|false|ja|nein|x|✓|☑|☐)$/i.test(x))) return 'checkbox'
  if (looksLike(v, (x) => /^https?:\/\//i.test(x))) return 'url'
  if (v.length >= 4 && new Set(v).size <= Math.min(8, v.length / 2)) return 'select'
  return 'text'
}

/** CSV text to column specs and rows of raw values (sanitized later per column type). */
export function csvToTable(text: string): { columns: ColumnSpec[]; rows: (string | boolean)[][] } {
  const [head = [], ...body] = parseCsv(text)
  const columns = head.slice(0, 30).map((name, i): ColumnSpec => {
    const values = body.map((r) => r[i] ?? '')
    const type = guessColumnType(values)
    const options = type === 'select' ? [...new Set(values.map((x) => x.trim()).filter(Boolean))].slice(0, 30) : undefined
    return { name: clip(name.trim() || `Column ${i + 1}`, 60), type: COLUMN_TYPES.includes(type) ? type : 'text', ...(options ? { options } : {}) }
  })
  const rows = body.slice(0, 2000).map((r) =>
    columns.map((c, i) => {
      const v = (r[i] ?? '').trim()
      return c.type === 'checkbox' ? /^(yes|true|ja|x|✓|☑)$/i.test(v) : v
    }),
  )
  return { columns, rows }
}

export interface ImportFile {
  /** Path inside the picked folder, e.g. "Vault/Levels/Forest.md". */
  path: string
  text: string
}

export const MAX_IMPORT_FILES = 500
export const MAX_IMPORT_BYTES = 1024 * 1024

/**
 * Markdown files become pages and CSV files become tables. The folder structure becomes the page
 * tree: "Levels/Forest.md" lands under a page "Levels" (created when no Levels.md exists).
 */
export function importNotes(data: Data, projectId: string, files: ImportFile[]): { data: Data; pages: number; tables: number } {
  let d = data
  let pages = 0
  let tables = 0
  const folders = new Map<string, string>()
  const clean = files
    .filter((f) => /\.(md|markdown|txt|csv)$/i.test(f.path) && f.text.length <= MAX_IMPORT_BYTES)
    .slice(0, MAX_IMPORT_FILES)
    .map((f) => ({ ...f, parts: f.path.replace(/\\/g, '/').split('/').filter(Boolean) }))
    // Skip Obsidian's own settings and trash.
    .filter((f) => !f.parts.some((p) => p === '.obsidian' || p === '.trash'))
  const depth = Math.min(...clean.map((f) => f.parts.length))
  const parentFor = (parts: string[]): string | null => {
    // The picked folder itself is not a page.
    const dirs = parts.slice(depth - 1, -1)
    let parent: string | null = null
    for (let i = 0; i < dirs.length; i++) {
      const key = dirs.slice(0, i + 1).join('/')
      let id = folders.get(key)
      if (!id) {
        const r = addPage(d, projectId, dirs[i], [], parent)
        d = r.data
        id = r.page.id
        folders.set(key, id)
        pages++
      }
      parent = id
    }
    return parent
  }
  for (const f of clean.sort((a, b) => a.parts.length - b.parts.length)) {
    const name = f.parts[f.parts.length - 1]
    if (/\.csv$/i.test(name)) {
      const { columns, rows } = csvToTable(f.text)
      if (!columns.length) continue
      const r = addTable(d, projectId, name.replace(/\.csv$/i, '').replace(/\s+[0-9a-f]{32}$/i, ''))
      const cols = columns.map((c) => ({ id: crypto.randomUUID(), name: c.name, type: c.type, options: c.options ?? [] }))
      const tableRows = rows.map((values) => ({ id: crypto.randomUUID(), cells: Object.fromEntries(cols.map((c, i) => [c.id, sanitizeCell(c, values[i])])) }))
      d = { ...r.data, tables: r.data.tables.map((x) => (x.id === r.table.id ? { ...x, columns: cols, rows: tableRows } : x)) }
      tables++
    } else {
      const { title, body } = splitMarkdown(f.text, name)
      const parent = parentFor(f.parts)
      // A note named like its folder (Notion: "Levels.md" next to "Levels/") fills that folder page.
      const folderKey = [...f.parts.slice(depth - 1, -1), title].join('/')
      const existing = folders.get(folderKey)
      if (existing) {
        d = { ...d, pages: d.pages.map((p) => (p.id === existing ? { ...p, blocks: mdToBlocks(body) } : p)) }
        continue
      }
      const r = addPage(d, projectId, title, mdToBlocks(body), parent)
      d = r.data
      folders.set(folderKey, r.page.id)
      pages++
    }
  }
  return { data: d, pages, tables }
}
