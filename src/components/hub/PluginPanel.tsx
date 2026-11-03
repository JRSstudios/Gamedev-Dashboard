import { useCallback, useEffect, useState } from 'react'
import { checkIssueText, clearUnityLogs, isConnected, sendJob, useBridge, type ModelCheck } from '../../features/bridge'
import { useT } from '../../i18n'
import { updateIntegrations } from '../../model/ops'
import type { Project } from '../../model/schema'
import {
  installBlenderAddon,
  installKritaPlugin,
  installUnityPlugin,
  pluginStatus,
  uninstallPlugin,
  type BridgeApp,
  type PluginStatus,
} from '../../platform'
import { mutate, notify, openItem, useStore } from '../../store'
import { search } from '../../model/search'
import { projectIndex } from '../../model/searchDocs'

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now() / 1000)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() / 1000), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

/** Install state of one plugin plus whether it is talking to the dashboard right now. */
export function PluginPanel({ project, app }: { project: Project; app: BridgeApp }) {
  const t = useT()
  const seen = useBridge((s) => s.seen)
  const enabled = useStore((s) => s.data.settings.bridgeEnabled)
  const now = useNow(4000)
  const [status, setStatus] = useState<PluginStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const unityDir = project.integrations.unityDir

  const refresh = useCallback(() => pluginStatus(unityDir).then(setStatus).catch(() => setStatus(null)), [unityDir])
  useEffect(() => {
    let live = true
    void pluginStatus(unityDir)
      .then((s) => live && setStatus(s))
      .catch(() => live && setStatus(null))
    return () => {
      live = false
    }
  }, [unityDir])

  const installed = status ? (app === 'unity' ? status.unity : app === 'blender' ? status.blender.length > 0 : status.krita) : false
  const connected = isConnected(seen, app, now)
  const canInstall = app === 'unity' ? Boolean(unityDir) : app === 'blender' ? Boolean(status?.blenderFound) : Boolean(status?.kritaFound)

  const install = async () => {
    setBusy(true)
    try {
      if (app === 'unity' && unityDir) await installUnityPlugin(unityDir)
      else if (app === 'blender') notify(t('pluginBlenderDone', { versions: (await installBlenderAddon()).join(', ') }))
      else if (app === 'krita') await installKritaPlugin()
      if (app !== 'blender') notify(t(app === 'unity' ? 'pluginUnityDone' : 'pluginKritaDone'))
    } catch (e) {
      notify(t('pluginFailed', { reason: errorText(e) }))
    }
    setBusy(false)
    void refresh()
  }
  const uninstall = async () => {
    setBusy(true)
    await uninstallPlugin(app, unityDir).catch((e) => notify(t('pluginFailed', { reason: errorText(e) })))
    setBusy(false)
    void refresh()
  }

  return (
    <section className="panel plugin-panel">
      <div className="panel-head">
        <h2>{t('pluginTitle')}</h2>
        <span className={`pill ${connected ? 'ok' : installed ? 'idle' : ''}`}>
          {!enabled ? t('pluginBridgeOff') : connected ? t('pluginConnected') : installed ? t('pluginInstalled') : t('pluginMissing')}
        </span>
      </div>
      <p className="small muted">{t(`pluginAbout_${app}`)}</p>
      {installed && !connected && <p className="small muted">{t(`pluginEnable_${app}`)}</p>}
      {!canInstall && <p className="small warn">{t(`pluginCannot_${app}`)}</p>}
      <div className="row">
        <button className={installed ? '' : 'primary'} disabled={busy || !canInstall} onClick={() => void install()}>
          {installed ? t('pluginUpdate') : t('pluginInstall')}
        </button>
        {installed && (
          <button className="link" disabled={busy} onClick={() => void uninstall()}>
            {t('pluginUninstall')}
          </button>
        )}
      </div>
    </section>
  )
}

/** Errors and warnings from the Unity console, with a search in the cheat sheet. */
export function UnityConsole({ projectId }: { projectId: string }) {
  const t = useT()
  const logs = useBridge((s) => s.unityLogs)
  const compileErrors = useBridge((s) => s.compileErrors)
  const scenes = useBridge((s) => s.scenes)
  const build = useBridge((s) => s.build)
  const data = useStore((s) => s.data)

  const lookUp = (message: string) => {
    const hit = search(projectIndex(data, projectId), message.slice(0, 200), 1, ['cheat'])[0]
    if (hit) openItem('cheat', hit.doc.id)
    else notify(t('unityNoCheat'))
  }

  return (
    <section className="panel unity-console">
      <div className="panel-head">
        <h2>{t('unityConsole')}</h2>
        <div className="row">
          {compileErrors !== null && <span className={`pill ${compileErrors ? 'bad' : 'ok'}`}>{t('unityCompiled', { n: compileErrors })}</span>}
          <button className="link" onClick={() => void sendJob('unity', { type: 'refresh' })}>{t('unityRefresh')}</button>
          <button className="link" onClick={() => void sendJob('unity', { type: 'build' }).then(() => notify(t('jobSent')))}>{t('unityBuild')}</button>
          {logs.length > 0 && <button className="link" onClick={clearUnityLogs}>{t('unityClear')}</button>}
        </div>
      </div>
      {build && (
        <p className={`small ${build.result === 'Succeeded' ? '' : 'warn'}`}>
          {build.result === 'Blocked'
            ? t(build.reason === 'no_scenes' ? 'unityBuildNoScenes' : 'unityBuildCompile')
            : t('unityBuildResult', { result: build.result, errors: build.errors, seconds: build.seconds })}
          {build.path && build.result === 'Succeeded' && <> · <span className="muted">{build.path}</span></>}
        </p>
      )}
      {logs.length === 0 && <p className="small muted">{t('unityNoLogs')}</p>}
      <ul className="log-list">
        {logs.slice(0, 30).map((l, i) => (
          <li key={`${l.at}-${i}`} className={l.level}>
            <span className="log-msg" title={l.stack}>{l.message}</span>
            <button className="link" onClick={() => lookUp(l.message)}>{t('unityLookUp')}</button>
          </li>
        ))}
      </ul>
      {scenes.length > 0 && (
        <>
          <h3>{t('unityScenes')}</h3>
          <ul className="plain small">
            {scenes.map((s) => (
              <li key={s.path} className="row-between">
                <span className={s.enabled ? '' : 'muted'}>{s.path}</span>
                <button className="link" onClick={() => void sendJob('unity', { type: 'open_scene', scene: s.path })}>{t('unityOpenScene')}</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export function CheckResult({ check }: { check: ModelCheck }) {
  const t = useT()
  return (
    <div className="check-result">
      <span className={`pill ${check.issues.length ? 'bad' : 'ok'}`}>
        {check.issues.length ? t('checkIssues', { n: check.issues.length }) : t('checkClean')} · {t('checkTriangles', { n: check.triangles.toLocaleString() })}
      </span>
      {check.issues.length > 0 && (
        <ul className="plain small">
          {check.issues.slice(0, 12).map((i, k) => (
            <li key={k}>{checkIssueText(t, i)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Blender: buttons for the add-on, the auto import switches and the latest model check. */
export function BlenderTools({ project }: { project: Project }) {
  const t = useT()
  const checks = useBridge((s) => s.checks)
  const latest = Object.values(checks).sort((a, b) => b.at - a.at)[0]
  return (
    <section className="panel">
      <h2>{t('blenderTools')}</h2>
      <div className="row">
        <button onClick={() => void sendJob('blender', { type: 'export' }).then(() => notify(t('jobSent')))}>{t('blenderExportNow')}</button>
        <button onClick={() => void sendJob('blender', { type: 'check' }).then(() => notify(t('jobSent')))}>{t('blenderCheckNow')}</button>
      </div>
      <h3>{t('blenderHelpers')}</h3>
      <p className="small muted">{t('blenderHelpersHint')}</p>
      <div className="row">
        {(['apply_transforms', 'origin_to_bottom', 'lods', 'batch_export'] as const).map((job) => (
          <button key={job} onClick={() => void sendJob('blender', { type: job, selectionOnly: job === 'lods' }).then(() => notify(t('jobSent')))}>{t(`blenderJob_${job}`)}</button>
        ))}
      </div>
      <AutoImportSwitches project={project} />
      {latest && (
        <>
          <h3>{t('checkLatest')}</h3>
          <CheckResult check={latest} />
        </>
      )}
    </section>
  )
}

export function KritaTools({ project }: { project: Project }) {
  const t = useT()
  return (
    <section className="panel">
      <h2>{t('kritaTools')}</h2>
      <div className="row">
        <button onClick={() => void sendJob('krita', { type: 'export_png' }).then(() => notify(t('jobSent')))}>{t('kritaExportNow')}</button>
        <button onClick={() => void sendJob('krita', { type: 'export_layers' }).then(() => notify(t('jobSent')))}>{t('kritaExportLayers')}</button>
        <button onClick={() => void sendJob('krita', { type: 'export_spritesheet' }).then(() => notify(t('jobSent')))}>{t('kritaSpritesheet')}</button>
      </div>
      <AutoImportSwitches project={project} />
    </section>
  )
}

export function AutoImportSwitches({ project }: { project: Project }) {
  const t = useT()
  const i = project.integrations
  const set = (patch: Partial<Project['integrations']>) => mutate((d) => updateIntegrations(d, project.id, patch))
  return (
    <div className="switches">
      <label className="check">
        <input type="checkbox" checked={i.autoImport} onChange={(e) => set({ autoImport: e.target.checked })} />
        {t('autoImport')}
      </label>
      <label className="check">
        <input type="checkbox" checked={i.autoToUnity} disabled={!i.autoImport || !i.unityDir} onChange={(e) => set({ autoToUnity: e.target.checked })} />
        {t('autoToUnity')}
      </label>
    </div>
  )
}

/** Unity import presets the plugin applies to new files. */
export function UnityPresets({ project }: { project: Project }) {
  const t = useT()
  const i = project.integrations
  const set = (patch: Partial<Project['integrations']>) => mutate((d) => updateIntegrations(d, project.id, patch))
  return (
    <div className="switches">
      <label className="check">
        <input type="checkbox" checked={i.pixelArt} onChange={(e) => set({ pixelArt: e.target.checked })} />
        {t('unityPixelArt')}
      </label>
      <label className="field inline">
        {t('unityPpu')}
        <input type="number" min={1} max={4096} value={i.pixelsPerUnit} onChange={(e) => set({ pixelsPerUnit: Math.min(4096, Math.max(1, Math.round(Number(e.target.value) || 100))) })} />
      </label>
    </div>
  )
}
