import type { ReactNode } from 'react'
import { DesktopOnly } from '../DesktopOnly'
import { launchApp, useInbox, useUnityValid } from '../../features/hub'
import { unitySubFolder } from '../../features/transfer'
import { useT } from '../../i18n'
import { updateIntegrations } from '../../model/ops'
import { ASSET_CATEGORIES, type Project } from '../../model/schema'
import { IS_DESKTOP, type ExternalApp } from '../../platform'
import { mutate, notify, useStore } from '../../store'
import { DropTiles, IntegrationPath } from './common'
import { InboxList } from './InboxList'
import { BlenderTools, KritaTools, PluginPanel, UnityConsole, UnityPresets } from './PluginPanel'

function useProject(projectId: string): Project | undefined {
  return useStore((s) => s.data.projects.find((p) => p.id === projectId))
}

function useLinkedPaths(projectId: string): string[] {
  return useStore((s) => s.data.assets).flatMap((a) => (a.projectId === projectId && a.path ? [a.path] : []))
}

/** Shared frame: desktop-only notice, a launch button and the page content. */
function AppFrame({ project, app, canLaunch, intro, children }: { project: Project | undefined; app: ExternalApp; canLaunch: boolean; intro: string; children: (p: Project) => ReactNode }) {
  const t = useT()
  if (!project) return null
  if (!IS_DESKTOP) return <DesktopOnly reason={t('integDesktopOnly')} />
  const label = app === 'unity' ? t('integOpenUnity') : app === 'blender' ? t('integOpenBlender') : t('kritaStart')
  return (
    <div className="app-page">
      <div className="app-page-head">
        <p className="muted small">{intro}</p>
        <button className="primary" disabled={!canLaunch} onClick={() => void launchApp(project, app).catch((e) => notify(t('integCopyFailed', { reason: String(e) })))}>
          {label}
        </button>
      </div>
      {children(project)}
    </div>
  )
}

export function UnityPage({ projectId }: { projectId: string }) {
  const t = useT()
  const project = useProject(projectId)
  const valid = useUnityValid(project?.integrations.unityDir ?? null)
  return (
    <AppFrame project={project} app="unity" canLaunch={Boolean(project?.integrations.unityExe && valid)} intro={t('hubUnityIntro')}>
      {(p) => (
        <>
          <DropTiles project={p} />
          <div className="two-col">
            <section className="panel">
              <h2>{t('hubConnection')}</h2>
              <IntegrationPath project={p} field="unityDir" label={t('integUnityDir')} />
              {p.integrations.unityDir && valid !== null && <p className={valid ? 'small ok' : 'small warn'}>{valid ? t('integValid') : t('integInvalid')}</p>}
              <IntegrationPath project={p} field="unityExe" label={t('integExeUnity')} program />
            </section>
            <PluginPanel project={p} app="unity" />
            <UnityConsole projectId={p.id} />
            <section className="panel">
              <h2>{t('integMap')}</h2>
              <UnityPresets project={p} />
              <div className="map-grid">
                {ASSET_CATEGORIES.map((c) => (
                  <label key={c} className="field">
                    {t(`cat_${c}`)}
                    <input
                      value={p.integrations.unityMap[c] ?? unitySubFolder({ integrations: { ...p.integrations, unityMap: {} } }, c)}
                      maxLength={300}
                      onChange={(e) => mutate((d) => updateIntegrations(d, p.id, { unityMap: { ...p.integrations.unityMap, [c]: e.target.value } }))}
                    />
                  </label>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </AppFrame>
  )
}

function AppInbox({ project, source }: { project: Project; source: 'blender' | 'krita' }) {
  const t = useT()
  const { items, refresh } = useInbox(project, useLinkedPaths(project.id))
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{source === 'blender' ? t('integInbox') : t('kritaInbox')}</h2>
        <button className="link" onClick={() => void refresh()}>{t('integRefresh')}</button>
      </div>
      <InboxList project={project} items={items.filter((i) => i.source === source)} />
    </section>
  )
}

export function BlenderPage({ projectId }: { projectId: string }) {
  const t = useT()
  const project = useProject(projectId)
  return (
    <AppFrame project={project} app="blender" canLaunch={Boolean(project?.integrations.blenderExe)} intro={t('hubBlenderIntro')}>
      {(p) => (
        <>
          <DropTiles project={p} />
          <div className="two-col">
            <section className="panel">
              <h2>{t('hubConnection')}</h2>
              <IntegrationPath project={p} field="blenderDir" label={t('integBlenderDir')} />
              <IntegrationPath project={p} field="blenderExportDir" label={t('integExport')} />
              <IntegrationPath project={p} field="blenderExe" label={t('integExeBlender')} program />
            </section>
            <AppInbox project={p} source="blender" />
            <PluginPanel project={p} app="blender" />
            <BlenderTools project={p} />
          </div>
        </>
      )}
    </AppFrame>
  )
}

export function KritaPage({ projectId }: { projectId: string }) {
  const t = useT()
  const project = useProject(projectId)
  return (
    <AppFrame project={project} app="krita" canLaunch={Boolean(project?.integrations.kritaExe)} intro={t('kritaIntro')}>
      {(p) => (
        <div className="two-col">
          <section className="panel">
            <h2>{t('hubConnection')}</h2>
            <IntegrationPath project={p} field="kritaDir" label={t('kritaDir')} />
            <IntegrationPath project={p} field="kritaExe" label={t('kritaExe')} program />
          </section>
          {p.integrations.kritaDir ? <AppInbox project={p} source="krita" /> : <p className="panel muted small">{t('kritaNoDir')}</p>}
          <PluginPanel project={p} app="krita" />
          <KritaTools project={p} />
        </div>
      )}
    </AppFrame>
  )
}
