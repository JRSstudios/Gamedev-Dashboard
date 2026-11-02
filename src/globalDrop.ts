import { useEffect, useRef } from 'react'
import { useT } from './i18n'
import { addAssets, fileName, newAsset } from './model/ops'
import { onNativeFileDrop } from './platform'
import { mutate, notify } from './store'

/**
 * Files dropped anywhere in the window land in the active project, sorted by type
 * (images/.kra to concept art, audio, models ...). Views with their own drop handling
 * (asset boards, Unity/Blender tiles) mark themselves with `data-own-drop` and win.
 */
export function useGlobalDrop(projectId: string | null) {
  const t = useT()
  const project = useRef(projectId)
  const translate = useRef(t)
  useEffect(() => {
    project.current = projectId
    translate.current = t
  })

  useEffect(() => {
    let unlisten: (() => void) | undefined
    let disposed = false
    void onNativeFileDrop(
      (paths) => {
        const id = project.current
        if (!id || paths.length === 0 || document.querySelector('[data-own-drop]')) return
        const created = paths.map((p) => newAsset(id, fileName(p), p))
        const ids = new Set(created.map((a) => a.id))
        mutate((d) => addAssets(d, created))
        notify(translate.current('dropSorted', { n: created.length }), {
          label: translate.current('undo'),
          run: () => mutate((d) => ({ ...d, assets: d.assets.filter((a) => !ids.has(a.id)) })),
        })
      },
      () => {},
    ).then((fn) => (disposed ? fn() : (unlisten = fn)))
    return () => {
      disposed = true
      unlisten?.()
    }
  }, [])
}
