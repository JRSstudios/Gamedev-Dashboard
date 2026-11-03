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
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useImageUrl } from '../../assetUrl'
import { useT } from '../../i18n'
import { describeRef, listRefs, type RefInfo } from '../../model/graph'
import { extractLinks } from '../../model/links'
import { addBlock, BLOCK_TYPES, deleteBlock, deletePage, moveBlock, newBlock, setBlock, setParent, updatePage, type BlockType } from '../../model/pages'
import type { Asset, Block, Page } from '../../model/schema'
import { openRef } from '../../openRef'
import { confirmDialog } from '../../platform'
import { getData, mutate, useStore } from '../../store'
import { TableEditor } from '../tables/TableEditor'
import { Inline } from '../RichText'

/** Textarea that grows with its content, so a page reads like a document instead of a form. */
function AutoText({ value, onChange, className, onKeyDown, autoFocus, onBlur }: {
  value: string
  onChange: (v: string) => void
  className?: string
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  autoFocus?: boolean
  onBlur?: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      autoFocus={autoFocus}
      className={`auto-text ${className ?? ''}`}
      value={value}
      maxLength={5000}
     
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    />
  )
}

/** Shows **bold**, *italic*, `code`, links and [[Title]] formatted; a click switches to editing. */
function RichText({ value, onChange, className, autoFocus, projectId }: {
  value: string
  onChange: (v: string) => void
  className?: string
  autoFocus?: boolean
  projectId: string
}) {
  const [editing, setEditing] = useState(Boolean(autoFocus) || !value.trim())
  if (editing)
    return <AutoText autoFocus={autoFocus || Boolean(value)} className={className} value={value} onChange={onChange} onBlur={() => value.trim() && setEditing(false)} />
  const openTitle = (title: string) => {
    const hit = listRefs(getData(), projectId).find((r) => r.title.trim().toLowerCase() === title.trim().toLowerCase())
    if (hit) openRef(hit.type, hit.id)
  }
  return (
    <div
      className={`auto-text rendered ${className ?? ''}`}
      tabIndex={0}
      role="textbox"
      onClick={(e) => (e.target as HTMLElement).closest('a, button') || setEditing(true)}
      onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
    >
      {value.split('\n').map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          <Inline text={line} onWikiLink={openTitle} />
        </span>
      ))}
    </div>
  )
}

function ImagePreview({ asset }: { asset: Asset }) {
  const url = useImageUrl(asset)
  return url ? <img src={url} alt={asset.name} /> : <div className="img-missing muted small">{asset.name}</div>
}

function TypeMenu({ onPick, onClose }: { onPick: (type: BlockType) => void; onClose: () => void }) {
  const t = useT()
  return (
    <div className="type-menu" role="menu" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      {BLOCK_TYPES.map((type, i) => (
        <button key={type} role="menuitem" autoFocus={i === 0} onClick={() => onPick(type)}>
          {t(`block_${type}`)}
        </button>
      ))}
    </div>
  )
}

function BlockBody({ page, block, isNew }: { page: Page; block: Block; isNew: boolean }) {
  const t = useT()
  const assets = useStore((s) => s.data.assets)
  const tables = useStore((s) => s.data.tables)
  const set = (b: Block) => mutate((d) => setBlock(d, page.id, b))

  switch (block.type) {
    case 'paragraph':
    case 'callout':
      return (
        <RichText
          autoFocus={isNew}
          projectId={page.projectId}
          className={block.type}
          value={block.text}
          onChange={(text) => set({ ...block, text })}
        />
      )
    case 'heading':
      return (
        <div className="heading-block">
          <AutoText autoFocus={isNew} className={`h${block.level}`} value={block.text} onChange={(text) => set({ ...block, text })} />
          <button className="icon small" title={block.level === 1 ? t('headingSmall') : t('headingLarge')} onClick={() => set({ ...block, level: block.level === 1 ? 2 : 1 })}>
            H{block.level}
          </button>
        </div>
      )
    case 'list':
    case 'checklist': {
      const items = block.type === 'list' ? block.items.map((text) => ({ text, done: false })) : block.items
      const write = (next: { text: string; done: boolean }[]) =>
        set(block.type === 'list' ? { ...block, items: next.map((i) => i.text) } : { ...block, items: next })
      return (
        <ul className={block.type === 'list' ? 'list-block' : 'list-block checklist'}>
          {items.map((item, i) => (
            <li key={i}>
              {block.type === 'checklist' ? (
                <input type="checkbox" checked={item.done} aria-label={item.text} onChange={(e) => write(items.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))} />
              ) : (
                <span className="bullet" aria-hidden="true">•</span>
              )}
              <input
                autoFocus={isNew && i === 0}
                value={item.text}
                maxLength={500}
                className={item.done ? 'done' : undefined}
                onChange={(e) => write(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                onKeyDown={(e) => {
                  const li = e.currentTarget.closest('li')
                  if (e.key === 'Enter' && items.length < 200) {
                    e.preventDefault()
                    write([...items.slice(0, i + 1), { text: '', done: false }, ...items.slice(i + 1)])
                    setTimeout(() => (li?.nextElementSibling?.querySelector('input:not([type=checkbox])') as HTMLInputElement | null)?.focus(), 0)
                  } else if (e.key === 'Backspace' && !item.text && items.length > 1) {
                    e.preventDefault()
                    write(items.filter((_, j) => j !== i))
                    setTimeout(() => (li?.previousElementSibling?.querySelector('input:not([type=checkbox])') as HTMLInputElement | null)?.focus(), 0)
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )
    }
    case 'image': {
      const images = assets.filter((a) => a.projectId === page.projectId && a.kind === 'image')
      const asset = images.find((a) => a.id === block.assetId)
      return (
        <div className="image-block">
          {asset && <ImagePreview asset={asset} />}
          <select value={block.assetId ?? ''} aria-label={t('chooseAsset')} onChange={(e) => set({ ...block, assetId: e.target.value || null })}>
            <option value="">{t('chooseAsset')}</option>
            {images.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )
    }
    case 'table': {
      const mine = tables.filter((x) => x.projectId === page.projectId)
      const table = mine.find((x) => x.id === block.tableId)
      return (
        <div className="table-block">
          <select value={block.tableId ?? ''} aria-label={t('chooseTable')} onChange={(e) => set({ ...block, tableId: e.target.value || null })}>
            <option value="">{t('chooseTable')}</option>
            {mine.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
          {table && <TableEditor table={table} embedded />}
        </div>
      )
    }
    case 'divider':
      return <hr className="divider-block" />
  }
}

function BlockRow({ page, block, isNew, onAdded }: { page: Page; block: Block; isNew: boolean; onAdded: (id: string | null) => void }) {
  const t = useT()
  const [menu, setMenu] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  // Typing "/" into an empty text block opens the block menu, like in Notion.
  const slash = block.type === 'paragraph' && block.text === '/'

  const pick = (type: BlockType) => {
    setMenu(false)
    if (slash) {
      mutate((d) => setBlock(d, page.id, { ...newBlock(type), id: block.id }))
      onAdded(block.id)
    } else {
      const res = addBlock(getData(), page.id, type, block.id)
      mutate(() => res.data)
      onAdded(res.blockId)
    }
  }

  return (
    <div ref={setNodeRef} className={isDragging ? 'block dragging' : 'block'} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div className="block-gutter">
        <button className="icon small" aria-label={t('addBlock')} title={t('addBlock')} onClick={() => setMenu(!menu)}>+</button>
        <button className="grip" aria-label={t('dragToReorder')} title={t('dragToReorder')} {...attributes} {...listeners}>⋮⋮</button>
      </div>
      <div className="block-body">
        <BlockBody page={page} block={block} isNew={isNew} />
        {(menu || slash) && <TypeMenu onPick={pick} onClose={() => setMenu(false)} />}
      </div>
      <button className="icon small block-del" aria-label={t('deleteBlock')} title={t('deleteBlock')} onClick={() => mutate((d) => deleteBlock(d, page.id, block.id))}>×</button>
    </div>
  )
}

function LinkChips({ title, refs }: { title: string; refs: RefInfo[] }) {
  const t = useT()
  if (refs.length === 0) return null
  return (
    <div className="link-chips">
      <span className="small muted">{title}</span>
      {refs.map((r) => (
        <button key={`${r.type}:${r.id}`} className={`chip ref-${r.type}`} onClick={() => openRef(r.type, r.id)}>
          <span className="chip-kind">{t(`ref_${r.type}`)}</span> {r.title}
        </button>
      ))}
    </div>
  )
}

export function PageEditor({ page }: { page: Page }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const [fresh, setFresh] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) mutate((d) => moveBlock(d, page.id, String(active.id), String(over.id)))
  }

  // [[links]] out of this page, and other objects that link to it.
  const refs = listRefs(data, page.projectId)
  const own = describeRef(data, 'page', page.id)
  const wanted = new Set(extractLinks(own?.text ?? '').map((l) => l.toLowerCase()))
  const links = refs.filter((r) => wanted.has(r.title.trim().toLowerCase()) && !(r.type === 'page' && r.id === page.id))
  const me = page.title.trim().toLowerCase()
  const backlinks = me
    ? refs.filter((r) => !(r.type === 'page' && r.id === page.id) && extractLinks(r.text).some((l) => l.toLowerCase() === me))
    : []

  const addAtEnd = (type: BlockType) => {
    const res = addBlock(getData(), page.id, type)
    mutate(() => res.data)
    setFresh(res.blockId)
  }

  return (
    <article className="page-editor">
      <header className="page-title">
        <input
          className="page-icon"
          value={page.icon}
          maxLength={8}
          aria-label={t('pageIcon')}
          onChange={(e) => mutate((d) => updatePage(d, page.id, { icon: e.target.value }))}
        />
        <input
          className="title-input big"
          value={page.title}
          maxLength={200}
          aria-label={t('rename')}
          onChange={(e) => mutate((d) => updatePage(d, page.id, { title: e.target.value }))}
        />
        <button
          className="icon"
          aria-label={t('deletePage')}
          title={t('deletePage')}
          onClick={async () => {
            if (await confirmDialog(t('confirmDeletePage', { name: page.title }))) mutate((d) => deletePage(d, page.id))
          }}
        >
          ×
        </button>
      </header>
      <p className="small muted page-meta">
        {t('updated', { date: new Date(page.updatedAt).toLocaleString() })}
        <label>
          {t('pageParent')}{' '}
          <select value={page.parentId ?? ''} onChange={(e) => mutate((d) => setParent(d, page.id, e.target.value || null))}>
            <option value="">{t('pageTopLevel')}</option>
            {data.pages
              .filter((p) => p.projectId === page.projectId && p.id !== page.id)
              .map((p) => <option key={p.id} value={p.id}>{p.title || t('pageTitlePlaceholder')}</option>)}
          </select>
        </label>
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={page.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="blocks">
            {page.blocks.map((b) => (
              <BlockRow key={b.id} page={page} block={b} isNew={b.id === fresh} onAdded={setFresh} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="add-block-bar">
        {(['paragraph', 'heading', 'checklist', 'list', 'callout', 'image', 'table', 'divider'] as const).map((type) => (
          <button key={type} className="ghost small" onClick={() => addAtEnd(type)}>+ {t(`block_${type}`)}</button>
        ))}
      </div>

      <LinkChips title={t('pageLinks')} refs={links} />
      <LinkChips title={t('pageBacklinks')} refs={backlinks} />
    </article>
  )
}
