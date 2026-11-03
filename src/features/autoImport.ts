import { resolveLanguage, translate, type TFn } from '../i18n'
import { addAssets, fileName, guessCategory, guessKind, newAsset } from '../model/ops'
import type { AssetCategory, Data } from '../model/schema'
import type { BridgeEvent } from '../platform'
import { getActiveProjectId, getData, mutate, notify } from '../store'
import { samePath } from './hub'
import { sendToUnity } from './transfer'

export type ExportOutcome = 'ignored' | 'notified' | 'added' | 'updated'

/** Category for a file exported by a plugin: Krita art is concept art, Blender files go by type. */
export const exportCategory = (app: string, path: string): AssetCategory => (app === 'krita' ? 'concept' : guessCategory(guessKind(fileName(path))))

/**
 * What an export event means for the project. With auto import on, the file is linked as an asset
 * (once; a re-export of the same file only refreshes it). Pure, so it can be tested.
 */
export function planExport(data: Data, projectId: string | null, e: BridgeEvent): { outcome: ExportOutcome; next: Data; path: string; category: AssetCategory } {
  const path = typeof e.data.path === 'string' ? e.data.path.slice(0, 2000) : ''
  const category = exportCategory(e.app, path)
  const project = data.projects.find((p) => p.id === projectId && !p.archived)
  if (e.type !== 'exported' || !path || !project) return { outcome: 'ignored', next: data, path, category }
  if (!project.integrations.autoImport) return { outcome: 'notified', next: data, path, category }
  const existing = data.assets.find((a) => a.projectId === project.id && a.path && samePath(a.path) === samePath(path))
  if (existing) {
    const next = { ...data, assets: data.assets.map((a) => (a.id === existing.id ? { ...a, addedAt: new Date().toISOString() } : a)) }
    return { outcome: 'updated', next, path, category }
  }
  return { outcome: 'added', next: addAssets(data, [newAsset(project.id, fileName(path), path, category)]), path, category }
}

/** Handles export events from the Blender add-on and the Krita plugin. */
export function handleExportEvent(e: BridgeEvent): void {
  // Read the language when the event arrives, so toasts follow a language switch.
  const t: TFn = (key, params) => translate(resolveLanguage(getData().settings.language), key, params)
  const projectId = getActiveProjectId()
  const plan = planExport(getData(), projectId, e)
  if (plan.outcome === 'ignored') return
  const app = e.app === 'krita' ? 'Krita' : 'Blender'
  const name = fileName(plan.path)
  if (plan.outcome === 'notified') return notify(t('bridgeExported', { app, name }))
  mutate(() => plan.next)
  notify(t(plan.outcome === 'added' ? 'bridgeAutoAdded' : 'bridgeAutoUpdated', { app, name }))
  const project = getData().projects.find((p) => p.id === projectId)
  if (project?.integrations.autoToUnity && project.integrations.unityDir) {
    void sendToUnity(project, plan.path, plan.category, true).then((r) => r.ok && notify(t('integCopied', { where: 'Unity', name: r.name })))
  }
}
