import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { sendToBlender, sendToUnity, unitySubFolder, type TransferResult } from '../features/transfer'
import { addAssets, fileName, guessCategory, guessKind, newAsset, updateIntegrations } from '../model/ops'
import { ASSET_CATEGORIES, type Integrations } from '../model/schema'
import {
  inspectUnityProject,
  IS_DESKTOP,
  listFolder,
  onNativeFileDrop,
  openInApp,
  pickFolder,
  pickProgram,
  type ExternalApp,
  type FolderEntry,
} from '../platform'
import { mutate, notify, useStore } from '../store'

const INBOX_EXTS = ['blend', 'fbx', 'obj', 'glb', 'gltf', 'png', 'jpg', 'jpeg', 'wav', 'mp3', 'ogg']

type PathField = 'unityDir' | 'unityExe' | 'blenderDir' | 'blenderExe' | 'blenderExportDir' | 'kritaExe' | 'kritaDir'

const KRITA_EXTS = ['kra', 'png', 'jpg', 'jpeg', 'psd']

function PathRow({ label, value, buttonLabel, onPick, onClear }: { label: string; value: string | null; buttonLabel: string; onPick: () => void; onClear: () => void }) {
  return (
    <div className="path-row">
      <span className="small muted">{label}</span>
      <div className="path-line">
        <code className="clip" title={value ?? ''}>{value ?? '—'}</code>
        <button onClick={onPick}>{buttonLabel}</button>
        {value && <button className="link" onClick={onClear} aria-label="×">×</button>}
      </div>
    </div>
  )
}

export function IntegrationsPanel({ projectId }: { projectId: string }) {
  const t = useT()
  const project = useStore((s) => s.data.projects.find((p) => p.id === projectId))
  const [unityValid, setUnityValid] = useState<boolean | null>(null)
  const [inbox, setInbox] = useState<FolderEntry[]>([])
  const [kritaInbox, setKritaInbox] = useState<FolderEntry[]>([])
  const [hover, setHover] = useState<'unity' | 'blender' | null>(null)
  const projectRef = useRef(project)
  projectRef.current = project

  const unityDir = project?.integrations.unityDir ?? null
  const exportDir = project?.integrations.blenderExportDir ?? null
  const kritaDir = project?.integrations.kritaDir ?? null

  useEffect(() => {
    if (!IS_DESKTOP || !unityDir) return void setUnityValid(null)
    let live = true
    void inspectUnityProject(unityDir).then((ok) => live && setUnityValid(ok)).catch(() => live && setUnityValid(false))
    return () => {
      live = false
    }
  }, [unityDir])

  const refreshInbox = useCallback(async () => {
    setInbox(IS_DESKTOP && exportDir ? await listFolder(exportDir, INBOX_EXTS, 60).catch(() => []) : [])
    setKritaInbox(IS_DESKTOP && kritaDir ? await listFolder(kritaDir, KRITA_EXTS, 60).catch(() => []) : [])
  }, [exportDir, kritaDir])

  useEffect(() => {
    void refreshInbox()
    window.addEventListener('focus', refreshInbox)
    return () => window.removeEventListener('focus', refreshInbox)
  }, [refreshInbox])

  const report = useCallback((where: string, r: TransferResult) => {
    if (r.ok) notify(t('integCopied', { where, name: r.name }))
    else if (r.reason === 'notLinked') notify(t('integNotLinked'))
    else if (r.reason === 'browserFile') notify(t('integBrowserFile'))
    else notify(t('integCopyFailed', { reason: r.detail ?? '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` only changes with the language
  }, [])

  // Files dragged in from the OS: whichever target tile is under the pointer receives them.
  useEffect(() => {
    const targetAt = (x: number, y: number): 'unity' | 'blender' | null => {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-target]')
      const value = el?.dataset.dropTarget
      return value === 'unity' || value === 'blender' ? value : null
    }
    let unlisten: (() => void) | undefined
    let disposed = false
    void onNativeFileDrop(
      async (paths, at) => {
        const target = targetAt(at.x, at.y)
        const current = projectRef.current
        if (!target || !current) return
        for (const p of paths) {
          report(target === 'unity' ? 'Unity' : 'Blender', target === 'unity' ? await sendToUnity(current, p) : await sendToBlender(current, p))
        }
      },
      (hovering, at) => setHover(hovering && at ? targetAt(at.x, at.y) : null),
    ).then((fn) => (disposed ? fn() : (unlisten = fn)))
    return () => {
      disposed = true
      unlisten?.()
    }
  }, [report])

  if (!project) return null
  if (!IS_DESKTOP) return <p className="panel muted">{t('integDesktopOnly')}</p>

  const set = (patch: Partial<Integrations>) => mutate((d) => updateIntegrations(d, project.id, patch))
  const pickDir = async (field: PathField) => {
    const dir = await pickFolder()
    if (dir) set({ [field]: dir })
  }
  const pickExe = async (field: PathField) => {
    const exe = await pickProgram()
    if (exe) set({ [field]: exe })
  }
  const launch = async (kind: ExternalApp, file?: string) => {
    const exe = kind === 'unity' ? project.integrations.unityExe : kind === 'blender' ? project.integrations.blenderExe : project.integrations.kritaExe
    if (!exe) return notify(t('integNotLinked'))
    try {
      await openInApp(kind, exe, kind === 'unity' ? (unityDir ?? undefined) : file)
    } catch (e) {
      notify(t('integCopyFailed', { reason: e instanceof Error ? e.message : String(e) }))
    }
  }

  const addToProject = (entry: FolderEntry) =>
    mutate((d) => addAssets(d, [newAsset(project.id, entry.name, entry.path, guessCategory(guessKind(entry.name)))]))

  return (
    <div className="integrations" data-own-drop>
      <p className="muted small">{t('integIntro')}</p>

      <div className="drop-tiles">
        {(['unity', 'blender'] as const).map((target) => (
          <div key={target} data-drop-target={target} className={hover === target ? 'panel drop-tile over' : 'panel drop-tile'}>
            <strong>{target === 'unity' ? 'Unity' : 'Blender'}</strong>
            <span className="small muted">{target === 'unity' ? t('integDropUnity') : t('integDropBlender')}</span>
          </div>
        ))}
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>{t('integUnity')}</h2>
          <PathRow label={t('integUnityDir')} value={unityDir} buttonLabel={t('integPick')} onPick={() => void pickDir('unityDir')} onClear={() => set({ unityDir: null })} />
          {unityDir && unityValid !== null && <p className={unityValid ? 'small ok' : 'small warn'}>{unityValid ? t('integValid') : t('integInvalid')}</p>}
          <PathRow label={t('integExeUnity')} value={project.integrations.unityExe} buttonLabel={t('integPickExe')} onPick={() => void pickExe('unityExe')} onClear={() => set({ unityExe: null })} />
          <div>
            <button disabled={!project.integrations.unityExe || !unityValid} onClick={() => void launch('unity')}>{t('integOpenUnity')}</button>
          </div>
          <h3>{t('integMap')}</h3>
          <div className="map-grid">
            {ASSET_CATEGORIES.map((c) => (
              <label key={c} className="field">
                {t(`cat_${c}`)}
                <input
                  value={project.integrations.unityMap[c] ?? ''}
                  placeholder={unitySubFolder({ integrations: { ...project.integrations, unityMap: {} } }, c)}
                  maxLength={300}
                  onChange={(e) => set({ unityMap: { ...project.integrations.unityMap, [c]: e.target.value } })}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>{t('integBlender')}</h2>
          <PathRow label={t('integBlenderDir')} value={project.integrations.blenderDir} buttonLabel={t('integPick')} onPick={() => void pickDir('blenderDir')} onClear={() => set({ blenderDir: null })} />
          <PathRow label={t('integExport')} value={exportDir} buttonLabel={t('integPick')} onPick={() => void pickDir('blenderExportDir')} onClear={() => set({ blenderExportDir: null })} />
          <PathRow label={t('integExeBlender')} value={project.integrations.blenderExe} buttonLabel={t('integPickExe')} onPick={() => void pickExe('blenderExe')} onClear={() => set({ blenderExe: null })} />
          <div>
            <button disabled={!project.integrations.blenderExe} onClick={() => void launch('blender')}>{t('integOpenBlender')}</button>
          </div>

          <div className="panel-head">
            <h3>{t('integInbox')}</h3>
            <button className="link" onClick={() => void refreshInbox()}>{t('integRefresh')}</button>
          </div>
          {inbox.length === 0 && <p className="muted small">{t('integInboxEmpty')}</p>}
          <ul className="inbox">
            {inbox.map((f) => (
              <li key={f.path}>
                <span className="clip" title={f.path}>{fileName(f.path)}</span>
                <span className="small muted">{new Date(f.modified * 1000).toLocaleString()}</span>
                <button className="link" onClick={() => addToProject(f)}>{t('integToProject')}</button>
                <button className="link" onClick={async () => report('Unity', await sendToUnity(project, f.path))}>{t('integToUnity')}</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Krita</h2>
          <p className="small muted">{t('kritaIntro')}</p>
          <PathRow label={t('kritaDir')} value={kritaDir} buttonLabel={t('integPick')} onPick={() => void pickDir('kritaDir')} onClear={() => set({ kritaDir: null })} />
          <PathRow label={t('kritaExe')} value={project.integrations.kritaExe} buttonLabel={t('integPickExe')} onPick={() => void pickExe('kritaExe')} onClear={() => set({ kritaExe: null })} />
          <div>
            <button disabled={!project.integrations.kritaExe} onClick={() => void launch('krita')}>{t('kritaStart')}</button>
          </div>
          <div className="panel-head">
            <h3>{t('kritaInbox')}</h3>
            <button className="link" onClick={() => void refreshInbox()}>{t('integRefresh')}</button>
          </div>
          {kritaInbox.length === 0 && <p className="muted small">{kritaDir ? t('integInboxEmpty') : t('kritaNoDir')}</p>}
          <ul className="inbox">
            {kritaInbox.map((f) => (
              <li key={f.path}>
                <span className="clip" title={f.path}>{fileName(f.path)}</span>
                <span className="small muted">{new Date(f.modified * 1000).toLocaleString()}</span>
                <button className="link" onClick={() => mutate((d) => addAssets(d, [newAsset(project.id, f.name, f.path, 'concept')]))}>{t('integToProject')}</button>
                <button className="link" onClick={async () => report('Unity', await sendToUnity(project, f.path, 'concept'))}>{t('integToUnity')}</button>
                {project.integrations.kritaExe && <button className="link" onClick={() => void launch('krita', f.path)}>{t('kritaOpen')}</button>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
