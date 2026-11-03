import { useState } from 'react'
import { useT } from '../i18n'
import { addAssets, newLink } from '../model/ops'
import { mutate, notify } from '../store'

/** Adds an inspiration link. The app never fetches the page; only the URL and your title are stored. */
export function LinkForm({ projectId }: { projectId: string }) {
  const t = useT()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')

  const add = () => {
    if (!url.trim()) return
    const link = newLink(projectId, url, title)
    if (!link) return notify(t('linkInvalid'))
    mutate((d) => addAssets(d, [link]))
    setUrl('')
    setTitle('')
  }

  return (
    <form
      className="link-form"
      onSubmit={(e) => {
        e.preventDefault()
        add()
      }}
    >
      <label className="field">
        <span className="field-label">{t('linkUrl')}</span>
        <input value={url} maxLength={2000} aria-label={t('linkUrl')} onChange={(e) => setUrl(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">{t('linkTitle')}</span>
        <input value={title} maxLength={300} aria-label={t('linkTitle')} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <button type="submit">{t('addLink')}</button>
    </form>
  )
}
