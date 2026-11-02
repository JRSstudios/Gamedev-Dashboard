import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useImageUrl } from '../../assetUrl'
import { useT } from '../../i18n'
import { addAssets, newAsset } from '../../model/ops'
import type { Asset } from '../../model/schema'
import { blendToGlb, IS_DESKTOP, listFolder, type FolderEntry } from '../../platform'
import { getBlob } from '../../storage/indexedDb'
import { mutate, notify, setFocus, useStore } from '../../store'
import type { ModelSource } from './loadModel'

// three.js is large; it is only loaded when this section is opened.
const ModelViewer = lazy(() => import('./ModelViewer'))

const VIEWABLE = ['glb', 'gltf', 'fbx', 'obj']
const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

interface Item {
  key: string
  name: string
  path: string | null
  asset: Asset | null
}

function CompareImage({ asset, opacity }: { asset: Asset; opacity?: number }) {
  const url = useImageUrl(asset)
  return url ? <img className="compare-img" src={url} alt={asset.name} style={opacity === undefined ? undefined : { opacity }} draggable={false} /> : null
}

export function ModelsView({ projectId }: { projectId: string }) {
  const t = useT()
  const assets = useStore((s) => s.data.assets)
  const project = useStore((s) => s.data.projects.find((p) => p.id === projectId))
  const focusId = useStore((s) => s.focus.modelId)
  const theme = useStore((s) => s.data.settings.theme)
  const [inbox, setInbox] = useState<FolderEntry[]>([])
  const [selected, setSelected] = useState<string | null>(focusId)
  const [source, setSource] = useState<ModelSource | null>(null)
  const [wireframe, setWireframe] = useState(false)
  const [compare, setCompare] = useState<'off' | 'split' | 'overlay'>('off')
  const [compareId, setCompareId] = useState<string>('')
  const [opacity, setOpacity] = useState(0.5)
  const [converting, setConverting] = useState(false)

  const exportDir = project?.integrations.blenderExportDir ?? null
  const blenderExe = project?.integrations.blenderExe ?? null
  const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const refresh = useCallback(async () => {
    if (!IS_DESKTOP || !exportDir) return setInbox([])
    setInbox(await listFolder(exportDir, [...VIEWABLE, 'blend'], 100).catch(() => []))
  }, [exportDir])
  useEffect(() => {
    void refresh()
  }, [refresh])

  const items: Item[] = useMemo(() => {
    const own = assets.filter((a) => a.projectId === projectId && a.kind === 'model').map((a) => ({ key: a.id, name: a.name, path: a.path, asset: a }))
    const known = new Set(own.map((o) => o.path))
    const fromInbox = inbox.filter((f) => !known.has(f.path)).map((f) => ({ key: f.path, name: f.name, path: f.path, asset: null }))
    return [...own, ...fromInbox]
  }, [assets, inbox, projectId])

  const images = assets.filter((a) => a.projectId === projectId && a.kind === 'image')
  const compareAsset = images.find((a) => a.id === compareId) ?? null
  const current = items.find((i) => i.key === selected) ?? null

  // Turn the selected item into something the viewer can load (.blend goes through Blender first).
  useEffect(() => {
    let cancelled = false
    const pick = async () => {
      if (!current) return setSource(null)
      const ext = extOf(current.name)
      if (current.path && IS_DESKTOP) {
        if (ext === 'blend') {
          if (!blenderExe) return notify(t('modelsBlendNeedsBlender'))
          setConverting(true)
          try {
            const glb = await blendToGlb(current.path, blenderExe)
            if (!cancelled) setSource({ kind: 'desktop', path: glb })
          } catch (e) {
            notify(t('modelsError', { reason: String(e) }))
          } finally {
            setConverting(false)
          }
          return
        }
        if (VIEWABLE.includes(ext)) setSource({ kind: 'desktop', path: current.path })
        return
      }
      if (current.asset && !current.path) {
        const blob = await getBlob(current.asset.id)
        if (blob && !cancelled) setSource({ kind: 'blob', blob, name: current.name })
      }
    }
    void pick()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the selection changes
  }, [current?.key, blenderExe])

  const viewer = (
    <Suspense fallback={<div className="model-viewer"><div className="viewer-msg muted">{t('modelsLoading')}</div></div>}>
      <ModelViewer source={source} wireframe={wireframe} dark={dark} />
    </Suspense>
  )

  return (
    <div className="models">
      <aside className="panel models-list">
        <div className="panel-head">
          <h2>{t('modelsList')}</h2>
          {IS_DESKTOP && exportDir && <button className="link" onClick={() => void refresh()}>{t('integRefresh')}</button>}
        </div>
        {items.length === 0 && <p className="muted small">{t('modelsNone')}</p>}
        <ul className="item-list">
          {items.map((i) => (
            <li key={i.key}>
              <button
                className={i.key === selected ? 'item active' : 'item'}
                onClick={() => {
                  setSelected(i.key)
                  if (i.asset) setFocus({ modelId: i.asset.id })
                }}
              >
                <span className="item-icon">{extOf(i.name) === 'blend' ? '◇' : '◆'}</span>
                <span className="item-title" title={i.path ?? i.name}>{i.name}</span>
                {!i.asset && <span className="chip small">{t('modelsInbox')}</span>}
              </button>
            </li>
          ))}
        </ul>
        {current && !current.asset && current.path && (
          <button onClick={() => mutate((d) => addAssets(d, [newAsset(projectId, current.name, current.path, 'model')]))}>{t('integToProject')}</button>
        )}
      </aside>

      <section className="models-stage">
        <div className="toolbar">
          <label className="check small">
            <input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.target.checked)} />
            {t('modelsWireframe')}
          </label>
          <span className="small muted">{t('modelsControls')}</span>
          <span className="spacer" />
          <select value={compareId} aria-label={t('modelsCompareWith')} onChange={(e) => setCompareId(e.target.value)}>
            <option value="">{t('modelsCompareWith')}</option>
            {images.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <div className="seg" role="group" aria-label={t('modelsCompare')}>
            {(['off', 'split', 'overlay'] as const).map((m) => (
              <button key={m} className={compare === m ? 'on' : ''} disabled={m !== 'off' && !compareAsset} onClick={() => setCompare(m)}>
                {t(`modelsCompare_${m}`)}
              </button>
            ))}
          </div>
          {compare === 'overlay' && (
            <input type="range" min={0} max={1} step={0.05} value={opacity} aria-label={t('modelsOpacity')} onChange={(e) => setOpacity(Number(e.target.value))} />
          )}
        </div>
        {converting && <p className="small muted">{t('modelsConverting')}</p>}
        <div className={`compare compare-${compareAsset ? compare : 'off'}`}>
          {compareAsset && compare === 'split' && (
            <div className="compare-pane">
              <CompareImage asset={compareAsset} />
            </div>
          )}
          <div className="compare-pane viewer-pane">
            {viewer}
            {compareAsset && compare === 'overlay' && <CompareImage asset={compareAsset} opacity={opacity} />}
          </div>
        </div>
      </section>
    </div>
  )
}
