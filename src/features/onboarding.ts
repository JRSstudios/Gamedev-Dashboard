import type { TFn } from '../i18n'
import { addAssets, addProject, newAsset, sortCategory, updateIntegrations } from '../model/ops'
import { inspectUnityProject, IS_DESKTOP, listFolder, pickFolder } from '../platform'
import { getData, mutate, notify, openDialog, setActiveProject, setSection } from '../store'

/** Files from an existing Unity project that are worth showing in the dashboard. */
const IMPORT_EXTS = ['png', 'jpg', 'jpeg', 'psd', 'kra', 'wav', 'mp3', 'ogg', 'fbx', 'obj', 'glb', 'gltf', 'blend']

const folderName = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() ?? path

/** Asks Claude to be connected once, after the first project exists (desktop only). */
export function askForClaude() {
  if (IS_DESKTOP && !getData().settings.claude.asked) openDialog('connectClaude')
}

/**
 * Creates a dashboard project from an existing Unity project folder and links it.
 * With `importFiles`, art/audio/models below Assets/ are linked as assets (up to 500, 6 folders deep).
 */
export async function openUnityProject(t: TFn, importFiles: boolean): Promise<boolean> {
  const dir = await pickFolder()
  if (!dir) return false
  if (!(await inspectUnityProject(dir).catch(() => false))) {
    notify(t('onbNotUnity'))
    return false
  }
  const { data, project } = addProject(getData(), folderName(dir))
  let next = updateIntegrations(data, project.id, { unityDir: dir })
  let imported = 0
  if (importFiles) {
    try {
      const files = await listFolder(`${dir}/Assets`, IMPORT_EXTS, 500, 6)
      next = addAssets(next, files.map((f) => newAsset(project.id, f.name, f.path, sortCategory(next, f.name, f.path))))
      imported = files.length
    } catch {
      /* the project is still usable without the import */
    }
  }
  mutate(() => next)
  setActiveProject(project.id)
  setSection('overview')
  notify(t('onbCreated', { name: project.name, n: imported }))
  askForClaude()
  return true
}

