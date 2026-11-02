import { DEFAULT_UNITY_MAP, fileName, guessCategory, guessKind } from '../model/ops'
import type { AssetCategory, Project } from '../model/schema'
import { copyIntoFolder } from '../platform'

export type TransferResult =
  | { ok: true; path: string; name: string }
  | { ok: false; reason: 'notLinked' | 'browserFile' | 'failed'; detail?: string }

/** Folder inside the Unity project for a category; the user's override wins over the default. */
export function unitySubFolder(project: Pick<Project, 'integrations'>, category: AssetCategory | string): string {
  const custom = project.integrations.unityMap[category]?.trim()
  return custom || DEFAULT_UNITY_MAP[category] || 'Assets'
}

async function copy(src: string | null, destDir: string | null, sub: string, kind: 'unity' | 'blender'): Promise<TransferResult> {
  if (!src) return { ok: false, reason: 'browserFile' }
  if (!destDir) return { ok: false, reason: 'notLinked' }
  try {
    const path = await copyIntoFolder(src, destDir, sub, kind)
    return { ok: true, path, name: fileName(path) }
  } catch (e) {
    return { ok: false, reason: 'failed', detail: e instanceof Error ? e.message : String(e) }
  }
}

export function sendToUnity(project: Project, src: string | null, category?: AssetCategory): Promise<TransferResult> {
  const cat = category ?? guessCategory(guessKind(src ? fileName(src) : ''))
  return copy(src, project.integrations.unityDir, unitySubFolder(project, cat), 'unity')
}

export function sendToBlender(project: Project, src: string | null): Promise<TransferResult> {
  return copy(src, project.integrations.blenderDir, '', 'blender')
}
