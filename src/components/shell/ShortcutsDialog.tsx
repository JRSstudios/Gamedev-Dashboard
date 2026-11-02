import { useEffect } from 'react'
import { useT } from '../../i18n'

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const t = useT()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rows: [string, string][] = [
    ['Ctrl K', t('shortcutPalette')],
    ['Ctrl N', t('shortcutNote')],
    ['Ctrl T', t('shortcutTimer')],
    ['Esc', t('shortcutEsc')],
  ]
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('shortcutsTitle')} onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>{t('shortcutsTitle')}</h2>
          <button onClick={onClose}>{t('close')}</button>
        </div>
        <dl className="shortcuts">
          {rows.map(([keys, label]) => (
            <div key={keys}>
              <dt><kbd>{keys}</kbd></dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
