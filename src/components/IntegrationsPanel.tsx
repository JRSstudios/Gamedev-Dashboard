import { useT } from '../i18n'

/** Replaced by the real Unity / Blender panel in the integrations step. */
export function IntegrationsPanel({ projectId }: { projectId: string }) {
  const t = useT()
  return <p className="muted" data-project={projectId}>{t('desc_integrations')}</p>
}
