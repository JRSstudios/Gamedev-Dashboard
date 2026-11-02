import { launchApp, type InboxItem } from '../../features/hub'
import { sendToUnity } from '../../features/transfer'
import { useT } from '../../i18n'
import { addAssets, dismissInbox, newAsset } from '../../model/ops'
import type { Project } from '../../model/schema'
import { mutate, notify } from '../../store'
import { useTransferReport } from './useTransferReport'

/** Inbox rows with one-click actions: take into the project, copy to Unity, open in Krita, dismiss. */
export function InboxList({ project, items, limit }: { project: Project; items: InboxItem[]; limit?: number }) {
  const t = useT()
  const report = useTransferReport()
  const shown = limit ? items.slice(0, limit) : items

  const take = (item: InboxItem) => {
    mutate((d) => addAssets(d, [newAsset(project.id, item.name, item.path, item.category)]))
    notify(t('inboxTaken', { name: item.name }))
  }

  if (items.length === 0) return <p className="muted small">{t('inboxEmpty')}</p>
  return (
    <ul className="inbox">
      {shown.map((f) => (
        <li key={f.path}>
          <span className={`source-dot ${f.source}`} title={f.source === 'blender' ? 'Blender' : 'Krita'} aria-hidden="true" />
          <span className="clip" title={f.path}>{f.name}</span>
          <span className="small muted">{t(`cat_${f.category}`)}</span>
          <span className="small muted hide-narrow">{new Date(f.modified * 1000).toLocaleDateString()}</span>
          <button className="link" onClick={() => take(f)}>{t('integToProject')}</button>
          {project.integrations.unityDir && (
            <button className="link" onClick={async () => report('Unity', await sendToUnity(project, f.path, f.category))}>{t('integToUnity')}</button>
          )}
          {f.source === 'krita' && project.integrations.kritaExe && (
            <button className="link" onClick={() => void launchApp(project, 'krita', f.path).catch((e) => notify(String(e)))}>{t('kritaOpen')}</button>
          )}
          <button className="link" aria-label={t('inboxDismiss')} title={t('inboxDismiss')} onClick={() => mutate((d) => dismissInbox(d, project.id, f.path))}>×</button>
        </li>
      ))}
      {limit && items.length > limit && <li className="small muted">{t('inboxMore', { n: items.length - limit })}</li>}
    </ul>
  )
}
