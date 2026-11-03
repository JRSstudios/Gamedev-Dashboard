import { useEffect, useRef, useState } from 'react'
import { sendToBlender, sendToUnity } from '../../features/transfer'
import { useT } from '../../i18n'
import { updateIntegrations } from '../../model/ops'
import type { Integrations, Project } from '../../model/schema'
import { onNativeFileDrop, pickFolder, pickProgram } from '../../platform'
import { mutate } from '../../store'
import { useTransferReport } from './useTransferReport'

export type PathField = 'unityDir' | 'unityExe' | 'blenderDir' | 'blenderExe' | 'blenderExportDir' | 'kritaExe' | 'kritaDir'

export function PathRow({ label, value, buttonLabel, onPick, onClear }: { label: string; value: string | null; buttonLabel: string; onPick: () => void; onClear: () => void }) {
  const t = useT()
  return (
    <div className="path-row">
      <span className="small muted">{label}</span>
      <div className="path-line">
        <code className="clip" title={value ?? ''}>{value ?? t('notLinked')}</code>
        <button onClick={onPick}>{buttonLabel}</button>
        {value && <button className="link" onClick={onClear} aria-label="×">×</button>}
      </div>
    </div>
  )
}

/** Folder or program picker row bound to one integrations field of the project. */
export function IntegrationPath({ project, field, label, program = false }: { project: Project; field: PathField; label: string; program?: boolean }) {
  const t = useT()
  const set = (patch: Partial<Integrations>) => mutate((d) => updateIntegrations(d, project.id, patch))
  return (
    <PathRow
      label={label}
      value={project.integrations[field]}
      buttonLabel={program ? t('integPickExe') : t('integPick')}
      onPick={async () => {
        const value = program ? await pickProgram() : await pickFolder()
        if (value) set({ [field]: value })
      }}
      onClear={() => set({ [field]: null })}
    />
  )
}

/** Unity/Blender tiles that take files dragged in from the file manager. */
export function DropTiles({ project }: { project: Project }) {
  const t = useT()
  const report = useTransferReport()
  const [hover, setHover] = useState<'unity' | 'blender' | null>(null)
  const projectRef = useRef(project)
  useEffect(() => {
    projectRef.current = project
  }, [project])

  useEffect(() => {
    const targetAt = (x: number, y: number): 'unity' | 'blender' | null => {
      const value = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-target]')?.dataset.dropTarget
      return value === 'unity' || value === 'blender' ? value : null
    }
    let unlisten: (() => void) | undefined
    let disposed = false
    void onNativeFileDrop(
      async (paths, at) => {
        const target = targetAt(at.x, at.y)
        if (!target) return
        for (const p of paths) {
          report(target === 'unity' ? 'Unity' : 'Blender', target === 'unity' ? await sendToUnity(projectRef.current, p) : await sendToBlender(projectRef.current, p))
        }
      },
      (hovering, at) => setHover(hovering && at ? targetAt(at.x, at.y) : null),
    ).then((fn) => (disposed ? fn() : (unlisten = fn)))
    return () => {
      disposed = true
      unlisten?.()
    }
  }, [report])

  return (
    <div className="drop-tiles" data-own-drop>
      {(['unity', 'blender'] as const).map((target) => (
        <div key={target} data-drop-target={target} className={hover === target ? 'panel drop-tile over' : 'panel drop-tile'}>
          <strong>{target === 'unity' ? 'Unity' : 'Blender'}</strong>
          <span className="small muted">{target === 'unity' ? t('integDropUnity') : t('integDropBlender')}</span>
        </div>
      ))}
    </div>
  )
}
