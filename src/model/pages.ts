import { noteTitle, removeRefs } from './graph'
import { BlockSchema, type Block, type Data, type Page } from './schema'

const uid = (): string => crypto.randomUUID()
const now = (): string => new Date().toISOString()

export const BLOCK_TYPES = ['paragraph', 'heading', 'list', 'checklist', 'callout', 'image', 'table', 'divider'] as const
export type BlockType = (typeof BLOCK_TYPES)[number]
export const MAX_BLOCKS = 500

export function newBlock(type: BlockType): Block {
  const id = uid()
  switch (type) {
    case 'heading':
      return { id, type, text: '', level: 1 }
    case 'paragraph':
    case 'callout':
      return { id, type, text: '' }
    case 'list':
      return { id, type, items: [''] }
    case 'checklist':
      return { id, type, items: [{ text: '', done: false }] }
    case 'image':
      return { id, type, assetId: null }
    case 'table':
      return { id, type, tableId: null }
    case 'divider':
      return { id, type }
  }
}

export function addPage(data: Data, projectId: string, title: string, blocks: Block[] = [newBlock('paragraph')]): { data: Data; page: Page } {
  const page: Page = {
    id: uid(),
    projectId,
    title: title.trim().slice(0, 200) || 'Untitled',
    icon: '',
    blocks: blocks.slice(0, MAX_BLOCKS),
    createdAt: now(),
    updatedAt: now(),
  }
  return { data: { ...data, pages: [...data.pages, page] }, page }
}

const mapPage = (data: Data, pageId: string, fn: (p: Page) => Page): Data => ({
  ...data,
  pages: data.pages.map((p) => (p.id === pageId ? { ...fn(p), updatedAt: now() } : p)),
})

export const updatePage = (data: Data, pageId: string, patch: Partial<Pick<Page, 'title' | 'icon'>>): Data =>
  mapPage(data, pageId, (p) => ({
    ...p,
    title: patch.title !== undefined ? patch.title.slice(0, 200) : p.title,
    icon: patch.icon !== undefined ? [...patch.icon.trim()].slice(0, 2).join('').slice(0, 8) : p.icon,
  }))

export const deletePage = (data: Data, pageId: string): Data =>
  removeRefs({ ...data, pages: data.pages.filter((p) => p.id !== pageId) }, 'page', pageId)

/** Inserts a block after `afterId` (or at the end) and returns its id. */
export function addBlock(data: Data, pageId: string, type: BlockType, afterId: string | null = null): { data: Data; blockId: string | null } {
  const block = newBlock(type)
  let added = false
  const next = mapPage(data, pageId, (p) => {
    if (p.blocks.length >= MAX_BLOCKS) return p
    added = true
    const at = afterId ? p.blocks.findIndex((b) => b.id === afterId) : -1
    const blocks = [...p.blocks]
    blocks.splice(at < 0 ? blocks.length : at + 1, 0, block)
    return { ...p, blocks }
  })
  return added ? { data: next, blockId: block.id } : { data, blockId: null }
}

/** Replaces a block; the new value is validated so the stored page always stays well-formed. */
export function setBlock(data: Data, pageId: string, block: Block): Data {
  const parsed = BlockSchema.safeParse(block)
  if (!parsed.success) return data
  return mapPage(data, pageId, (p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === block.id ? parsed.data : b)) }))
}

export const deleteBlock = (data: Data, pageId: string, blockId: string): Data =>
  mapPage(data, pageId, (p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== blockId) }))

export function moveBlock(data: Data, pageId: string, activeId: string, overId: string): Data {
  const page = data.pages.find((p) => p.id === pageId)
  if (!page) return data
  const from = page.blocks.findIndex((b) => b.id === activeId)
  const to = page.blocks.findIndex((b) => b.id === overId)
  if (from < 0 || to < 0 || from === to) return data
  return mapPage(data, pageId, (p) => {
    const blocks = [...p.blocks]
    const [moved] = blocks.splice(from, 1)
    blocks.splice(to, 0, moved)
    return { ...p, blocks }
  })
}

/** Turns a quick note into a page: first line becomes the title, the rest one paragraph per block. */
export function noteToPage(data: Data, noteId: string): { data: Data; page: Page } | null {
  const note = data.notes.find((n) => n.id === noteId)
  if (!note) return null
  const title = noteTitle(note.text)
  const lines = note.text.split('\n')
  const firstIdx = lines.findIndex((l) => l.trim())
  const body = lines.slice(firstIdx + 1).join('\n').trim()
  const blocks: Block[] = body
    ? body.split(/\n\s*\n/).map((chunk) => ({ id: uid(), type: 'paragraph' as const, text: chunk.trim().slice(0, 5000) }))
    : [newBlock('paragraph')]
  const created = addPage(data, note.projectId, title, blocks)
  const withoutNote = removeRefs({ ...created.data, notes: created.data.notes.filter((n) => n.id !== noteId) }, 'note', noteId)
  return { data: withoutNote, page: created.page }
}

export function pageToMarkdown(page: Page, data: Data): string {
  const out: string[] = [`## ${page.icon ? `${page.icon} ` : ''}${page.title}`, '']
  for (const b of page.blocks) {
    switch (b.type) {
      case 'heading':
        out.push(`${b.level === 1 ? '###' : '####'} ${b.text}`, '')
        break
      case 'paragraph':
        out.push(b.text, '')
        break
      case 'callout':
        out.push(`> ${b.text.replace(/\n/g, '\n> ')}`, '')
        break
      case 'list':
        out.push(...b.items.map((i) => `- ${i}`), '')
        break
      case 'checklist':
        out.push(...b.items.map((i) => `- [${i.done ? 'x' : ' '}] ${i.text}`), '')
        break
      case 'image': {
        const asset = data.assets.find((a) => a.id === b.assetId)
        if (asset) out.push(`*${asset.name}*`, '')
        break
      }
      case 'table': {
        const table = data.tables.find((t) => t.id === b.tableId)
        if (table) out.push(`*Table: ${table.name}*`, '')
        break
      }
      case 'divider':
        out.push('---', '')
        break
    }
  }
  return out.join('\n').trimEnd()
}
