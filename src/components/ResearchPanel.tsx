import { useState } from 'react'
import { useT } from '../i18n'
import { addResearch, deleteResearch } from '../model/ops'
import { confirmDialog, openLink } from '../platform'
import { mutate, useStore } from '../store'

export function ResearchPanel({ projectId }: { projectId: string }) {
  const t = useT()
  const all = useStore((s) => s.data.research)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [query, setQuery] = useState('')

  const entries = all.filter((r) => r.projectId === projectId)
  const q = query.trim().toLowerCase()
  const shown = entries.filter((r) => !q || `${r.title} ${r.body}`.toLowerCase().includes(q))

  const save = () => {
    if (!title.trim() && !body.trim()) return
    mutate((d) => addResearch(d, projectId, { title, body }))
    setTitle('')
    setBody('')
  }

  return (
    <section className="research" aria-label={t('nav_research')}>
      <div className="panel">
        <h2>{t('researchNew')}</h2>
        <label className="field">
          <span className="field-label">{t('researchTitle')}</span>
          <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t('researchBody')}</span>
          <textarea value={body} rows={5} maxLength={40000} onChange={(e) => setBody(e.target.value)} />
        </label>
        <div>
          <button className="primary" onClick={save}>{t('researchSave')}</button>
        </div>
      </div>

      <label className="field">
        <span className="field-label">{t('researchSearch')}</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {shown.length === 0 && <p className="muted empty">{t('researchEmpty')}</p>}
      <ul className="research-list">
        {shown.map((r) => (
          <li key={r.id} className="panel research-entry">
            <div className="research-head">
              <h3>{r.title}</h3>
              <button
                className="icon"
                aria-label={t('delete')}
                onClick={async () => {
                  if (await confirmDialog(t('confirmDeleteGoal', { name: r.title }))) mutate((d) => deleteResearch(d, r.id))
                }}
              >
                ×
              </button>
            </div>
            <div className="small muted">
              {new Date(r.createdAt).toLocaleDateString()}
              {r.model && ` · ${t('researchBy', { model: r.model })}`}
              {r.query && ` · “${r.query}”`}
            </div>
            <p className="research-body">{r.body}</p>
            {r.sources.length > 0 && (
              <div className="sources">
                <span className="small muted">{t('researchSources')}</span>
                <ul>
                  {r.sources.map((s, i) => (
                    <li key={i}>
                      <button className="link-btn" title={s.url} onClick={() => void openLink(s.url)}>{s.title || s.url}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
