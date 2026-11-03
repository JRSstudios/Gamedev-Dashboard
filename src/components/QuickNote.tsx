import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { addNote } from '../model/ops'
import { onQuickNoteShortcut } from '../platform'
import { mutate, notify, useStore } from '../store'

/** Ctrl+Shift+Space (also from other programs) opens this; Enter saves the note to the active project. */
export function QuickNote() {
  const t = useT()
  const projectId = useStore((s) => s.activeProjectId)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  useEffect(() => {
    let unlisten: (() => void) | undefined
    let disposed = false
    void onQuickNoteShortcut(() => setOpen(true)).then((fn) => (disposed ? fn() : (unlisten = fn)))
    return () => {
      disposed = true
      unlisten?.()
    }
  }, [])

  if (!open || !projectId) return null
  const save = () => {
    if (text.trim()) {
      mutate((d) => addNote(d, projectId, text.trim(), null))
      notify(t('quickNoteSaved'))
    }
    setText('')
    setOpen(false)
  }
  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal quick-note" role="dialog" aria-modal="true" aria-label={t('quickNoteTitle')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('quickNoteTitle')}</h2>
        <label className="field">
          <span className="field-label">{t('quickNoteHint')}</span>
          <textarea
            autoFocus
            rows={4}
            value={text}
            maxLength={20000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                save()
              }
            }}
          />
        </label>
        <div className="row">
          <button className="primary" onClick={save}>{t('save')}</button>
          <button onClick={() => setOpen(false)}>{t('cancel')}</button>
        </div>
      </div>
    </div>
  )
}
