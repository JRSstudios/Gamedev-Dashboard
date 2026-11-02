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

/** Desktop only: subscribe to files dropped onto the window from the OS file manager. */
export async function onNativeFileDrop(
  handler: (paths: string[]) => void,
  onHover: (hovering: boolean) => void,
): Promise<() => void> {
  if (!IS_DESKTOP) return () => {}
  const { getCurrentWebview } = await import('@tauri-apps/api/webview')
  return getCurrentWebview().onDragDropEvent((event) => {
    const p = event.payload
    if (p.type === 'enter' || p.type === 'over') onHover(true)
    else if (p.type === 'leave') onHover(false)
    else if (p.type === 'drop') {
      onHover(false)
      handler(p.paths)
    }
  })
}

export async function confirmDialog(message: string): Promise<boolean> {
  if (!IS_DESKTOP) return window.confirm(message)
  const { ask } = await import('@tauri-apps/plugin-dialog')
  return ask(message, { kind: 'warning' })
}
