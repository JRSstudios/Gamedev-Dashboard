import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './storage/adapter'

/** Everything that differs between the desktop app and the browser demo. */

export const IS_DESKTOP = isTauri()

function downloadInBrowser(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function saveTextFile(defaultName: string, content: string): Promise<void> {
  const ext = defaultName.split('.').pop() ?? 'txt'
  if (!IS_DESKTOP) {
    downloadInBrowser(defaultName, content, ext === 'json' ? 'application/json' : 'text/markdown')
    return
  }
  const { save } = await import('@tauri-apps/plugin-dialog')
  const path = await save({ defaultPath: defaultName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
  if (path) await invoke('write_text_file', { path, contents: content })
}

export async function pickTextFile(ext: string): Promise<string | null> {
  if (!IS_DESKTOP) {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = `.${ext}`
      input.onchange = async () => {
        const file = input.files?.[0]
        resolve(file && file.size <= 64 * 1024 * 1024 ? await file.text() : null)
      }
      input.oncancel = () => resolve(null)
      input.click()
    })
  }
  const { open } = await import('@tauri-apps/plugin-dialog')
  const path = await open({ multiple: false, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
  return typeof path === 'string' ? invoke<string>('read_text_file', { path }) : null
}

/** Desktop only: native file picker returning absolute paths. */
export async function pickAssetPaths(): Promise<string[]> {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const picked = await open({ multiple: true })
  return Array.isArray(picked) ? picked : picked ? [picked] : []
}

export async function pathsExist(paths: string[]): Promise<boolean[]> {
  if (!IS_DESKTOP || paths.length === 0) return paths.map(() => true)
  return invoke<boolean[]>('paths_exist', { paths })
}

/** Position in CSS pixels, converted from the physical pixels the OS reports. */
export interface DropPoint {
  x: number
  y: number
}

/** Desktop only: subscribe to files dropped onto the window from the OS file manager. */
export async function onNativeFileDrop(
  handler: (paths: string[], at: DropPoint) => void,
  onHover: (hovering: boolean, at?: DropPoint) => void,
): Promise<() => void> {
  if (!IS_DESKTOP) return () => {}
  const { getCurrentWebview } = await import('@tauri-apps/api/webview')
  const css = (pos: { x: number; y: number }): DropPoint => ({ x: pos.x / window.devicePixelRatio, y: pos.y / window.devicePixelRatio })
  return getCurrentWebview().onDragDropEvent((event) => {
    const p = event.payload
    if (p.type === 'enter' || p.type === 'over') onHover(true, css(p.position))
    else if (p.type === 'leave') onHover(false)
    else if (p.type === 'drop') {
      onHover(false)
      handler(p.paths, css(p.position))
    }
  })
}

export async function confirmDialog(message: string): Promise<boolean> {
  if (!IS_DESKTOP) return window.confirm(message)
  const { ask } = await import('@tauri-apps/plugin-dialog')
  return ask(message, { kind: 'warning' })
}

/** Opens an http(s) link in the system browser. Anything else is refused. */
export async function openLink(url: string): Promise<void> {
  let ok = false
  try {
    const u = new URL(url)
    ok = u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    /* invalid */
  }
  if (!ok) return
  if (!IS_DESKTOP) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  const { openUrl } = await import('@tauri-apps/plugin-opener')
  await openUrl(url)
}

// ---- Unity / Blender transfer (desktop only) ---------------------------------

export interface FolderEntry {
  path: string
  name: string
  size: number
  /** Seconds since the Unix epoch. */
  modified: number
}

export async function pickFolder(): Promise<string | null> {
  if (!IS_DESKTOP) return null
  const { open } = await import('@tauri-apps/plugin-dialog')
  const picked = await open({ directory: true, multiple: false })
  return typeof picked === 'string' ? picked : null
}

export async function pickProgram(): Promise<string | null> {
  if (!IS_DESKTOP) return null
  const { open } = await import('@tauri-apps/plugin-dialog')
  const picked = await open({ multiple: false })
  return typeof picked === 'string' ? picked : null
}

export const inspectUnityProject = (dir: string): Promise<boolean> => invoke<boolean>('inspect_unity_project', { dir })

export const copyIntoFolder = (src: string, destDir: string, sub: string, kind: 'unity' | 'blender'): Promise<string> =>
  invoke<string>('copy_into_folder', { src, destDir, sub, kind })

export const listFolder = (dir: string, exts: string[], limit: number, depth?: number): Promise<FolderEntry[]> =>
  invoke<FolderEntry[]>('list_folder', { dir, exts, limit, depth: depth ?? null })

export type ExternalApp = 'unity' | 'blender' | 'krita'

export const openInApp = (kind: ExternalApp, exe: string, target?: string): Promise<void> =>
  invoke('open_in_app', { kind, exe, target: target ?? null })

/** Bytes of a model file (or a texture/buffer next to `base`), restricted by type, size and folder in Rust. */
export const readModelFile = (path: string, base?: string): Promise<ArrayBuffer> =>
  invoke<ArrayBuffer>('read_model_file', { path, base: base ?? null })

/** Converts a .blend to .glb with the user's Blender; returns the cached .glb path. */
export const blendToGlb = (blend: string, exe: string): Promise<string> => invoke<string>('blend_to_glb', { blend, exe })

/** Last path segment without the extension (folder or file name). */
export const baseName = (path: string): string => (path.split(/[\\/]/).filter(Boolean).pop() ?? path).replace(/\.[^.]+$/, '')
