import { useMemo, useState } from 'react'
import { CHEAT_CATEGORIES, PERSPECTIVES, cheatsIn, getCheat, type CheatCategory, type CheatEntry, type Perspective } from '../../cheatsheet'
import { useLang, useT } from '../../i18n'
import { addNode } from '../../model/graph'
import { addGoal, addSteps, newId } from '../../model/ops'
import { search } from '../../model/search'
import { projectIndex } from '../../model/searchDocs'
import type { Cheat } from '../../model/schema'
import { confirmDialog, openLink } from '../../platform'
import { mutate, notify, setFocus, setSection, useStore } from '../../store'

function CodeBlock({ file, text }: { file: string; text: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  return (
    <figure className="code-block">
      <figcaption>
        <code>{file}</code>
        <button
          className="ghost small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            } catch {
              notify(t('cheatCopyFailed'))
            }
          }}
        >
          {copied ? t('cheatCopied') : t('cheatCopy')}
        </button>
      </figcaption>
      <pre>
        <code>{text}</code>
      </pre>
    </figure>
  )
}

function BuiltInEntry({ entry, projectId }: { entry: CheatEntry; projectId: string }) {
  const t = useT()
  const asGoal = () => {
    mutate((d) => {
      const next = addGoal(d, projectId, entry.title)
      const goal = next.goals.at(-1)
      return goal ? addSteps(next, goal.id, entry.steps.map((s) => s.slice(0, 300))) : next
    })
    notify(t('cheatGoalAdded'), { label: t('nav_goals'), run: () => setSection('goals') })
  }
  const toCanvas = () => {
    mutate((d) => addNode(d, projectId, 'cheat', entry.id, 0, 0))
    notify(t('cheatOnCanvas'), { label: t('nav_nodes'), run: () => setSection('nodes') })
  }
  return (
    <article className="cheat-entry">
      <header className="cheat-head">
        <h2 className="cheat-title">{entry.title}</h2>
        <div className="cheat-meta">
          <span className="chip">{t(`cheatCat_${entry.category}`)}</span>
          <span className="chip level">{t(`cheatLevel_${entry.level}`)}</span>
          {entry.perspectives.map((p) => (
            <span key={p} className="chip persp">{t(`persp_${p}`)}</span>
          ))}
        </div>
        <p className="cheat-summary">{entry.summary}</p>
        <div className="row-actions">
          <button className="primary" onClick={asGoal}>{t('cheatAsGoal')}</button>
          <button onClick={toCanvas}>{t('cheatToCanvas')}</button>
        </div>
      </header>

      <section>
        <h3>{t('cheatSteps')}</h3>
        <ol className="cheat-steps">
          {entry.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </section>

      {entry.code.length > 0 && (
        <section>
          <h3>{t('cheatCode')}</h3>
          {entry.code.map((c) => (
            <CodeBlock key={c.file} file={c.file} text={c.text} />
          ))}
        </section>
      )}

      {entry.pitfalls.length > 0 && (
        <section className="cheat-pitfalls">
          <h3>{t('cheatPitfalls')}</h3>
          <ul>
            {entry.pitfalls.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="cheat-docs small muted">
        {t('cheatDocs')}:{' '}
        {entry.docs.map((url) => (
          <button key={url} className="link-btn" title={url} onClick={() => void openLink(url)}>
            {url.replace(/^https:\/\/docs\.unity3d\.com\//, '').slice(0, 70)}
          </button>
        ))}
      </footer>
    </article>
  )
}

function OwnEntry({ entry }: { entry: Cheat }) {
  const t = useT()
  const set = (patch: Partial<Cheat>) => mutate((d) => ({ ...d, cheats: d.cheats.map((c) => (c.id === entry.id ? { ...c, ...patch } : c)) }))
  return (
    <article className="cheat-entry">
      <header className="cheat-head">
        <input className="title-input big" value={entry.title} maxLength={200} aria-label={t('rename')} onChange={(e) => set({ title: e.target.value })} />
        <label className="field">
          <span className="field-label">{t('cheatOwnCategory')}</span>
          <input value={entry.category} maxLength={60} aria-label={t('cheatOwnCategory')} onChange={(e) => set({ category: e.target.value })} />
        </label>
      </header>
      <label className="field wide-field">
        {t('cheatOwnBody')}
        <textarea rows={8} maxLength={20000} value={entry.body} onChange={(e) => set({ body: e.target.value })} />
      </label>
      <label className="field wide-field">
        {t('cheatCode')}
        <textarea className="mono" rows={10} maxLength={20000} value={entry.code} spellCheck={false} onChange={(e) => set({ code: e.target.value })} />
      </label>
      <div>
        <button
          className="danger"
          onClick={async () => {
            if (await confirmDialog(t('confirmDeleteGoal', { name: entry.title }))) {
              mutate((d) => ({ ...d, cheats: d.cheats.filter((c) => c.id !== entry.id) }))
              setFocus({ cheatId: null })
            }
          }}
        >
          {t('delete')}
        </button>
      </div>
    </article>
  )
}

export function CheatSheetView({ projectId }: { projectId: string }) {
  const t = useT()
  const lang = useLang()
  const data = useStore((s) => s.data)
  const focusId = useStore((s) => s.focus.cheatId)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CheatCategory | 'own' | null>(null)
  const [perspective, setPerspective] = useState<Perspective | null>(null)

  const own = data.cheats
  const hits = useMemo(() => {
    if (!query.trim()) return null
    return new Set(search(projectIndex(data, projectId), query, 40, ['cheat']).map((h) => h.doc.id))
  }, [data, projectId, query])

  const builtIn = cheatsIn(lang).filter(
    (c) =>
      (!hits || hits.has(c.id)) &&
      (!category || category === c.category) &&
      (!perspective || c.perspectives.length === 0 || c.perspectives.includes(perspective)),
  )
  const ownShown = own.filter((c) => (!hits || hits.has(c.id)) && (!category || category === 'own') && !perspective)
  if (hits) builtIn.sort((a, b) => [...hits].indexOf(a.id) - [...hits].indexOf(b.id))

  const selectedBuiltIn = focusId ? getCheat(focusId, lang) : undefined
  const selectedOwn = focusId ? own.find((c) => c.id === focusId) : undefined
  const fallback = builtIn[0] ?? null
  const showBuiltIn = selectedBuiltIn ?? (selectedOwn ? undefined : fallback ?? undefined)

  const addOwn = () => {
    const entry: Cheat = { id: newId(), title: t('cheatOwnNew'), category: t('cheatOwn'), tags: [], body: '', code: '', createdAt: new Date().toISOString() }
    mutate((d) => ({ ...d, cheats: [...d.cheats, entry] }))
    setFocus({ cheatId: entry.id })
  }

  return (
    <div className="split cheats">
      <aside className="split-list panel">
        <label className="field">
          <span className="field-label">{t('cheatSearch')}</span>
          <input type="search" value={query} aria-label={t('cheatSearch')} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="chip-row">
          {PERSPECTIVES.map((p) => (
            <button key={p} className={perspective === p ? 'chip-btn on' : 'chip-btn'} onClick={() => setPerspective(perspective === p ? null : p)}>
              {t(`persp_${p}`)}
            </button>
          ))}
        </div>
        <select value={category ?? ''} aria-label={t('cheatCategory')} onChange={(e) => setCategory((e.target.value || null) as CheatCategory | 'own' | null)}>
          <option value="">{t('cheatAllCategories')}</option>
          {CHEAT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(`cheatCat_${c}`)}</option>
          ))}
          <option value="own">{t('cheatOwn')}</option>
        </select>
        <ul className="item-list cheat-list">
          {builtIn.map((c) => (
            <li key={c.id}>
              <button className={c.id === showBuiltIn?.id ? 'item active' : 'item'} onClick={() => setFocus({ cheatId: c.id })}>
                <span className="item-title">{c.title}</span>
              </button>
            </li>
          ))}
          {ownShown.map((c) => (
            <li key={c.id}>
              <button className={c.id === selectedOwn?.id ? 'item active' : 'item'} onClick={() => setFocus({ cheatId: c.id })}>
                <span className="item-title">✎ {c.title}</span>
              </button>
            </li>
          ))}
          {builtIn.length + ownShown.length === 0 && <li className="muted small">{t('cheatNone')}</li>}
        </ul>
        <button onClick={addOwn}>+ {t('cheatOwnAdd')}</button>
      </aside>
      <div className="split-main">
        {selectedOwn ? <OwnEntry key={selectedOwn.id} entry={selectedOwn} /> : showBuiltIn ? <BuiltInEntry entry={showBuiltIn} projectId={projectId} /> : <p className="muted empty">{t('cheatNone')}</p>}
      </div>
    </div>
  )
}
