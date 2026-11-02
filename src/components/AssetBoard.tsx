import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useEffect, useRef, useState } from 'react'
import { loadAssetBlob, useImageUrl } from '../assetUrl'
import { useT } from '../i18n'
import {
  addAssets,
  deleteAsset,
  fileName,
  guessCategory,
  guessKind,
  moveAsset,
  newAsset,
  sanitizeTag,
  updateAsset,
} from '../model/ops'
import { sendToBlender, sendToUnity } from '../features/transfer'
import { ASSET_CATEGORIES, type Asset, type AssetCategory, type Integrations } from '../model/schema'
import { IS_DESKTOP, onNativeFileDrop, openLink, pathsExist, pickAssetPaths } from '../platform'
import { deleteBlob, MAX_DEMO_FILE_BYTES, putBlob } from '../storage/indexedDb'
import { mutate, notify, useStore } from '../store'

function AssetCard({ asset, missing }: { asset: Asset; missing: boolean }) {
  const t = useT()
  const [tag, setTag] = useState('')
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const audioUrl = useRef<string | null>(null)
  const thumb = useImageUrl(asset)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: asset.id })

  useEffect(
    () => () => {
      audio.current?.pause()
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current)
    },
    [],
  )

  const togglePlay = async () => {
    if (audio.current && playing) {
      audio.current.pause()
      return
    }
    if (!audio.current) {
      const blob = await loadAssetBlob(asset)
      if (!blob) return notify(t('missingFile'))
      audioUrl.current = URL.createObjectURL(blob)
      const el = new Audio(audioUrl.current)
      el.onplay = () => setPlaying(true)
      el.onpause = el.onended = () => setPlaying(false)
      audio.current = el
    }
    void audio.current.play()
  }

  const addTag = () => {
    const clean = sanitizeTag(tag)
    if (clean && !asset.tags.includes(clean)) mutate((d) => updateAsset(d, asset.id, { tags: [...asset.tags, clean].slice(0, 50) }))
    setTag('')
  }

  const remove = () => {
    mutate((d) => deleteAsset(d, asset.id))
    if (!asset.path) void deleteBlob(asset.id)
  }

  return (
    <li
      ref={setNodeRef}
      className={`asset${isDragging ? ' dragging' : ''}${missing ? ' missing' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {thumb && <img className="thumb" src={thumb} alt="" draggable={false} />}
      <div className="asset-head">
        <button className="grip" aria-label={t('dragToReorder')} title={t('dragToReorder')} {...attributes} {...listeners}>⋮⋮</button>
        {asset.kind === 'audio' && (
          <button className="icon" aria-label={playing ? t('pause') : t('play')} onClick={() => void togglePlay()}>
            {playing ? '⏸' : '▶'}
          </button>
        )}
        {asset.kind === 'link' && asset.url ? (
          <button className="link-btn asset-name" title={asset.url} onClick={() => void openLink(asset.url as string)}>
            🔗 {asset.name}
          </button>
        ) : (
          <span className="asset-name" title={asset.path ?? asset.name}>{asset.name}</span>
        )}
        <button className="icon" aria-label={t('remove')} onClick={remove}>×</button>
      </div>
      {missing && <p className="warn small">⚠ {t('missingFile')}</p>}
      <div className="tags">
        {asset.tags.map((x) => (
          <button
            key={x}
            className="tag"
            title={t('remove')}
            onClick={() => mutate((d) => updateAsset(d, asset.id, { tags: asset.tags.filter((y) => y !== x) }))}
          >
            #{x}
          </button>
        ))}
        <input
          className="tag-input"
          value={tag}
          maxLength={32}
          placeholder={t('addTag')}
          onChange={(e) => setTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTag()}
          onBlur={addTag}
        />
      </div>
    </li>
  )
}

function Column({ category, assets, missing, hideTitle }: { category: AssetCategory; assets: Asset[]; missing: Set<string>; hideTitle?: boolean }) {
  const t = useT()
  const { setNodeRef, isOver } = useDroppable({ id: `col:${category}` })
  return (
    <div ref={setNodeRef} className={isOver ? 'column over' : 'column'}>
      {!hideTitle && (
        <h3>
          {t(`cat_${category}`)} <span className="muted small">{assets.length}</span>
        </h3>
      )}
      <SortableContext items={assets.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <ul className={hideTitle ? 'asset-list gallery' : 'asset-list'}>
          {assets.map((a) => <AssetCard key={a.id} asset={a} missing={missing.has(a.id)} />)}
        </ul>
      </SortableContext>
    </div>
  )
}

/** Pointer position decides first (so the dock is easy to hit); corners handle card sorting. */
const collide: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length > 0 ? hits : closestCorners(args)
}

/** Appears while a card is dragged: drop on a target to copy the file into Unity or Blender. */
function TransferDock({ integrations }: { integrations: Integrations }) {
  const t = useT()
  const targets = [
    { id: 'unity', label: 'Unity', linked: Boolean(integrations.unityDir) },
    { id: 'blender', label: 'Blender', linked: Boolean(integrations.blenderDir) },
  ] as const
  return (
    <div className="dock" role="group" aria-label={t('integDock')}>
      {targets.map((x) => <DockTarget key={x.id} id={x.id} label={x.label} linked={x.linked} />)}
    </div>
  )
}

function DockTarget({ id, label, linked }: { id: 'unity' | 'blender'; label: string; linked: boolean }) {
  const t = useT()
  const { setNodeRef, isOver } = useDroppable({ id: `dock:${id}` })
  return (
    <div ref={setNodeRef} className={`dock-target${isOver ? ' over' : ''}${linked ? '' : ' unlinked'}`}>
      <strong>{label}</strong>
      <span className="small">{linked ? t('integDock') : t('integNotLinked')}</span>
    </div>
  )
}

interface BoardProps {
  projectId: string
  /** Categories shown (and used for newly added files). */
  categories?: readonly AssetCategory[]
  /** 'grid' renders a single large gallery, 'columns' one column per category. */
  layout?: 'columns' | 'grid'
  title?: string
  hint?: string
  /** Extra controls next to the search box (e.g. add-link form). */
  actions?: React.ReactNode
}

export function AssetBoard({ projectId, categories = ASSET_CATEGORIES, layout = 'columns', title, hint, actions }: BoardProps) {
  const t = useT()
  const allAssets = useStore((s) => s.data.assets)
  const project = useStore((s) => s.data.projects.find((p) => p.id === projectId))
  const [dragging, setDragging] = useState(false)
  const [query, setQuery] = useState('')
  const [hovering, setHovering] = useState(false)
  const [missing, setMissing] = useState<Set<string>>(new Set())
  const projectRef = useRef(projectId)
  projectRef.current = projectId
  const catsRef = useRef(categories)
  catsRef.current = categories
  const fit = (name: string): AssetCategory => {
    const guess = guessCategory(guessKind(name))
    return catsRef.current.includes(guess) ? guess : catsRef.current[0]
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const assets = allAssets.filter((a) => a.projectId === projectId && categories.includes(a.category))

  const addPaths = useCallback((paths: string[]) => {
    const created = paths.map((p) => newAsset(projectRef.current, fileName(p), p, fit(fileName(p))))
    if (created.length) mutate((d) => addAssets(d, created))
  }, [])

  const addBrowserFiles = useCallback(async (files: File[]) => {
    const created: Asset[] = []
    for (const file of files) {
      if (file.size > MAX_DEMO_FILE_BYTES) {
        notify(t('fileTooLarge', { name: file.name }))
        continue
      }
      const asset = newAsset(projectRef.current, file.name, null, fit(file.name))
      await putBlob(asset.id, file)
      created.push(asset)
    }
    if (created.length) mutate((d) => addAssets(d, created))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` only changes with the language
  }, [])

  // Desktop: files dropped from the OS file manager arrive as absolute paths.
  useEffect(() => {
    let unlisten: (() => void) | undefined
    let disposed = false
    void onNativeFileDrop(addPaths, setHovering).then((fn) => (disposed ? fn() : (unlisten = fn)))
    return () => {
      disposed = true
      unlisten?.()
    }
  }, [addPaths])

  // Flag linked files that were moved or deleted outside the app.
  const pathKey = assets.map((a) => a.path ?? '').join('\n')
  useEffect(() => {
    const check = async () => {
      const linked = assets.filter((a) => a.path)
      const exists = await pathsExist(linked.map((a) => a.path as string))
      setMissing(new Set(linked.filter((_, i) => !exists[i]).map((a) => a.id)))
    }
    void check()
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `pathKey` captures every path
  }, [pathKey])

  const q = query.trim().toLowerCase()
  const matches = (a: Asset) => {
    if (!q) return true
    return q.split(/\s+/).every((word) =>
      word.startsWith('#') ? a.tags.some((x) => x.startsWith(word.slice(1))) : a.name.toLowerCase().includes(word),
    )
  }
  const shown = assets.filter(matches)

  const transfer = async (assetId: string, target: 'unity' | 'blender') => {
    const asset = allAssets.find((a) => a.id === assetId)
    if (!asset || !project) return
    const result = target === 'unity' ? await sendToUnity(project, asset.path, asset.category) : await sendToBlender(project, asset.path)
    const where = target === 'unity' ? 'Unity' : 'Blender'
    if (result.ok) notify(t('integCopied', { where, name: result.name }))
    else if (result.reason === 'notLinked') notify(t('integNotLinked'))
    else if (result.reason === 'browserFile') notify(t('integBrowserFile'))
    else notify(t('integCopyFailed', { reason: result.detail ?? '' }))
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(false)
    if (!over || active.id === over.id) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (overId === 'dock:unity' || overId === 'dock:blender') {
      void transfer(activeId, overId === 'dock:unity' ? 'unity' : 'blender')
      return
    }
    if (overId.startsWith('col:')) {
      mutate((d) => moveAsset(d, activeId, overId.slice(4) as AssetCategory, null))
      return
    }
    const target = assets.find((a) => a.id === overId)
    const dragged = assets.find((a) => a.id === activeId)
    if (!target || !dragged) return
    const column = shown.filter((a) => a.category === target.category)
    const from = column.findIndex((a) => a.id === activeId)
    const to = column.findIndex((a) => a.id === overId)
    // Dragging down inside a column lands after the target, everything else lands before it.
    const before = from >= 0 && from < to ? (column[to + 1]?.id ?? null) : overId
    mutate((d) => moveAsset(d, activeId, target.category, before))
  }

  return (
    <section
      className={hovering ? 'panel assets drop-active' : 'panel assets'}
      aria-label={t('assets')}
      onDragOver={(e) => {
        if (IS_DESKTOP || !e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setHovering(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovering(false)
      }}
      onDrop={(e) => {
        if (IS_DESKTOP || e.dataTransfer.files.length === 0) return
        e.preventDefault()
        setHovering(false)
        void addBrowserFiles([...e.dataTransfer.files])
      }}
    >
      <div className="panel-head">
        <h2>{title ?? t('assets')}</h2>
        <input
          type="search"
          className="search"
          value={query}
          placeholder={t('searchAssets')}
          onChange={(e) => setQuery(e.target.value)}
        />
        {actions}
        {IS_DESKTOP ? (
          <button onClick={() => void pickAssetPaths().then(addPaths)}>{t('addFiles')}</button>
        ) : (
          <label className="button">
            {t('addFiles')}
            <input
              type="file"
              multiple
              hidden
              onChange={(e) => {
                void addBrowserFiles([...(e.target.files ?? [])])
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>
      {!IS_DESKTOP && <p className="muted small">{t('demoNote')}</p>}
      {assets.length === 0 && <p className="muted empty">{hint ?? t('noAssets')}</p>}
      <DndContext
        sensors={sensors}
        collisionDetection={collide}
        onDragStart={() => setDragging(true)}
        onDragCancel={() => setDragging(false)}
        onDragEnd={onDragEnd}
      >
        <div className={layout === 'grid' ? 'board grid' : 'board'}>
          {categories.map((c) => (
            <Column key={c} category={c} hideTitle={layout === 'grid'} assets={shown.filter((a) => a.category === c)} missing={missing} />
          ))}
        </div>
        {dragging && IS_DESKTOP && project && <TransferDock integrations={project.integrations} />}
      </DndContext>
      {hovering && <div className="drop-overlay">{t('dropActive')}</div>}
    </section>
  )
}
