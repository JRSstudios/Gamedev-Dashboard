import { useT } from '../i18n'
import { openLink } from '../platform'

export const RELEASES_URL = 'https://github.com/JRSstudios/Gamedev-Dashboard/releases/latest'

/** Shown in the web demo where a feature needs the desktop app: says why and where to get it. */
export function DesktopOnly({ reason }: { reason: string }) {
  const t = useT()
  return (
    <div className="callout small desktop-only">
      <p>{reason}</p>
      <button onClick={() => void openLink(RELEASES_URL)}>{t('getDesktopApp')}</button>
    </div>
  )
}
