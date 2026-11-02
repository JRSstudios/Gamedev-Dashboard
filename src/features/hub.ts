import { useCallback, useEffect, useState } from 'react'
import { fileName, guessCategory, guessKind } from '../model/ops'
import type { AssetCategory, Project } from '../model/schema'
import { inspectUnityProject, IS_DESKTOP, listFolder, openInApp, type ExternalApp } from '../platform'

export const BLENDER_EXTS = ['blend', 'fbx', 'obj', 'glb', 'gltf', 'png', 'jpg', 'jpeg', 'wav', 'mp3', 'ogg']
export const KRITA_EXTS = ['kra', 'png', 'jpg', 'jpeg', 'psd']

/** Windows paths compare case-insensitively and with either slash. */
export const samePath = (p: string): string => p.replace(/\\/g, '/').toLowerCase()

export type InboxSource = 'blender' | 'krita'

/** A file waiting in an app's export folder that is not part of the project yet. */
export interface InboxItem {
  path: string
  name: string
  source: InboxSource
  /** Seconds since the Unix epoch. */
  modified: number
  category: AssetCategory
}

export const appExe = (project: Project, app: ExternalApp): string | null =>
  app === 'unity' ? project.integrations.unityExe : app === 'blender' ? project.integrations.blenderExe : project.integrations.kritaExe

/** Starts Unity (with the linked project), Blender or Krita (optionally with a file). */
export async function launchApp(project: Project, app: ExternalApp, file?: string): Promise<void> {
  const exe = appExe(project, app)
  if (!exe) throw new Error('not linked')
  await openInApp(app, exe, app === 'unity' ? (project.integrations.unityDir ?? undefined) : file)
}

/** Whether the linked folder really is a Unity project; null while unknown or not linked. */
export function useUnityValid(unityDir: string | null): boolean | null {
  const [result, setResult] = useState<{ dir: string; ok: boolean } | null>(null)
  useEffect(() => {
    if (!IS_DESKTOP || !unityDir) return
    let live = true
    void inspectUnityProject(unityDir)
      .then((ok) => live && setResult({ dir: unityDir, ok }))
      .catch(() => live && setResult({ dir: unityDir, ok: false }))
    return () => {
      live = false
    }
  }, [unityDir])
  return unityDir && result?.dir === unityDir ? result.ok : null
}

/** New files in the Blender export folder and the Krita folder, minus linked and dismissed ones. Refreshes on window focus. */
export function useInbox(project: Project | undefined, linkedPaths: readonly string[]): { items: InboxItem[]; refresh: () => Promise<void> } {
  const [raw, setRaw] = useState<InboxItem[]>([])
  const exportDir = project?.integrations.blenderExportDir ?? null
  const kritaDir = project?.integrations.kritaDir ?? null

  const load = useCallback(async (): Promise<InboxItem[]> => {
    const read = async (dir: string | null, exts: string[], source: InboxSource): Promise<InboxItem[]> =>
      dir
        ? (await listFolder(dir, exts, 120).catch(() => [])).map((f) => ({
            path: f.path,
            name: fileName(f.path),
            source,
            modified: f.modified,
            category: source === 'krita' ? 'concept' : guessCategory(guessKind(f.name)),
          }))
        : []
    const all = [...(await read(exportDir, BLENDER_EXTS, 'blender')), ...(await read(kritaDir, KRITA_EXTS, 'krita'))]
    return all.sort((a, b) => b.modified - a.modified)
  }, [exportDir, kritaDir])
  const refresh = useCallback(() => load().then(setRaw), [load])

  useEffect(() => {
    if (!IS_DESKTOP) return
    let live = true
    const update = () => void load().then((items) => live && setRaw(items))
    update()
    window.addEventListener('focus', update)
    return () => {
      live = false
      window.removeEventListener('focus', update)
    }
  }, [load])

  const hidden = new Set([...linkedPaths, ...(project?.inboxDismissed ?? [])].map(samePath))
  return { items: raw.filter((i) => !hidden.has(samePath(i.path))), refresh }
}
