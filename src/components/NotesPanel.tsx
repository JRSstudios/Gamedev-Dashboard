import { useState } from 'react'
import { useT } from '../i18n'
import { addNote, deleteNote } from '../model/ops'
import { mutate, useStore } from '../store'

export function NotesPanel({ projectId }: { projectId: string }) {
  const t = useT()
  const allNotes = useStore((s) => s.data.notes)
  const allGoals = useStore((s) => s.data.goals)
  const [text, setText] = useState('')
  const [goalId, setGoalId] = useState('')
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)

  const goals = allGoals.filter((g) => g.projectId === projectId && !g.archived)
  const notes = allNotes.filter((n) => n.projectId === projectId)
  const tags = [...new Set(notes.flatMap((n) => n.tags))].sort()
  const q = query.trim().toLowerCase()
  const shown = notes.filter((n) => (!tag || n.tags.includes(tag)) && (!q || n.text.toLowerCase().includes(q)))
  const goalTitle = (id: string | null) => allGoals.find((g) => g.id === id)?.title

  const save = () => {
    if (!text.trim()) return
    mutate((d) => addNote(d, projectId, text, goals.some((g) => g.id === goalId) ? goalId : null))
    setText('')
  }

  return (
    <section className="panel notes" aria-label={t('notes')}>
      <h2>{t('notes')}</h2>
      <textarea
        id="quick-note"
        value={text}
        rows={3}
        maxLength={20000}
        placeholder={t('quickNote')}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            save()
          }
        }}
      />
      <select value={goalId} onChange={(e) => setGoalId(e.target.value)} aria-label={t('linkedGoal')}>
        <option value="">{t('noGoal')}</option>
        {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
      </select>
      <input type="search" value={query} placeholder={t('searchNotes')} onChange={(e) => setQuery(e.target.value)} />
      {tags.length > 0 && (
        <div className="tags">
          <button className={tag === null ? 'tag active' : 'tag'} onClick={() => setTag(null)}>{t('allTags')}</button>
          {tags.map((x) => (
            <button key={x} className={tag === x ? 'tag active' : 'tag'} onClick={() => setTag(tag === x ? null : x)}>#{x}</button>
          ))}
        </div>
      )}
      {shown.length === 0 && <p className="muted empty">{t('noNotes')}</p>}
      <ul className="note-list">
        {shown.map((n) => (
          <li key={n.id} className="note">
            <div className="note-meta small muted">
              <time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleDateString()}</time>
              {goalTitle(n.goalId) && <span> · {goalTitle(n.goalId)}</span>}
              <button className="icon" aria-label={t('delete')} onClick={() => mutate((d) => deleteNote(d, n.id))}>×</button>
            </div>
            <p>{n.text}</p>
            {n.tags.length > 0 && (
              <div className="tags">{n.tags.map((x) => <span key={x} className="tag static">#{x}</span>)}</div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
