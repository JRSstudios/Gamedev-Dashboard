import { useEffect, useMemo, useState } from 'react'
import { PlanSchema, validActions, type Plan } from '../../ai/actions'
import { claudeHasKey } from '../../ai/claude'
import { extractJson } from '../../ai/client'
import { buildProjectContext } from '../../ai/context'
import { LimitReachedError, runClaude } from '../../ai/run'
import { getCheat, PERSPECTIVES, type Perspective } from '../../cheatsheet'
import { resolveLanguage, useT } from '../../i18n'
import { newId } from '../../model/ops'
import type { Idea } from '../../model/schema'
import { search, snippet, type SearchHit } from '../../model/search'
import { projectIndex } from '../../model/searchDocs'
import { openRef } from '../../openRef'
import { IS_DESKTOP } from '../../platform'
import { getData, mutate, setSection, useStore } from '../../store'
import { ActionsPreview } from './ActionsPreview'

const MAX_CHEAT_CONTEXT = 7000

/** Cheat sheet excerpts for the prompt: ids, titles, summaries and steps of the best matches only. */
function cheatContext(hits: SearchHit[]): string {
  let out = ''
  for (const h of hits) {
    const c = getCheat(h.doc.id)
    const entry = c
      ? `[${c.id}] ${c.title}\n${c.summary}\nSteps: ${c.steps.join(' | ')}${c.code.length ? `\nScripts: ${c.code.map((x) => x.file).join(', ')}` : ''}\n\n`
      : `[${h.doc.id}] ${h.doc.title}\n${h.doc.text.slice(0, 600)}\n\n`
    if (out.length + entry.length > MAX_CHEAT_CONTEXT) break
    out += entry
  }
  return out
}

export function BrainstormView({ projectId }: { projectId: string }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const ideas = data.ideas.filter((i) => i.projectId === projectId)
  const [text, setText] = useState('')
  const [perspective, setPerspective] = useState<Perspective | ''>('')
  const [hasKey, setHasKey] = useState(false)
  const [phase, setPhase] = useState<{ kind: 'idle' } | { kind: 'working' } | { kind: 'error'; message: string } | { kind: 'plan'; plan: Plan }>({ kind: 'idle' })
  const ready = IS_DESKTOP && hasKey && data.settings.claude.enabled

  useEffect(() => {
    void claudeHasKey().then(setHasKey)
  }, [])

  const query = `${text} ${perspective ? t(`persp_${perspective}`) : ''}`
  const hits = useMemo(() => (text.trim().length > 2 ? search(projectIndex(data, projectId), query, 14) : []), [data, projectId, query, text])
  const cheatHits = hits.filter((h) => h.doc.type === 'cheat').slice(0, 8)
  const projectHits = hits.filter((h) => h.doc.type !== 'cheat').slice(0, 6)

  const saveIdea = (plan = ''): Idea => {
    const idea: Idea = { id: newId(), projectId, text: text.trim().slice(0, 4000), perspective, plan: plan.slice(0, 40000), createdAt: new Date().toISOString() }
    mutate((d) => ({ ...d, ideas: [idea, ...d.ideas] }))
    return idea
  }

  const plan = async () => {
    if (!text.trim()) return
    setPhase({ kind: 'working' })
    try {
      const lang = resolveLanguage(getData().settings.language) === 'de' ? 'German' : 'English'
      const persp = perspective ? t(`persp_${perspective}`) : 'not decided yet'
      const result = await runClaude({
        command: 'plan',
        maxTokens: 6000,
        system: `Task: turn the user's game idea into a concrete plan for this project, as JSON actions (see the action format above). Reply in ${lang}. Use the cheat sheet excerpts: link the matching entries with "cheat" actions tied to the goals they help with. Include: 3 to 6 goals with steps in a sensible order (setup first), one page "Game Design" with the core loop, controls and art style, and a table only if it really helps (e.g. a level or asset list). Perspective: ${persp}.`,
        user: `Idea:\n${text.trim()}\n\nProject context:\n${buildProjectContext(getData(), projectId)}\n\nCheat sheet excerpts (id in brackets):\n${cheatContext(search(projectIndex(getData(), projectId), query, 12, ['cheat']))}`,
      })
      const parsed = PlanSchema.safeParse(extractJson(result.text))
      if (!parsed.success) throw new Error(t('claudeBadJson'))
      const planned = { ...parsed.data, actions: validActions(getData(), projectId, parsed.data.actions) }
      saveIdea(planned.summary)
      setPhase({ kind: 'plan', plan: planned })
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof LimitReachedError ? t('claudeLimitReached') : e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <div className="brainstorm">
      <section className="panel brainstorm-input">
        <h2>{t('bsIdea')}</h2>
        <textarea rows={4} maxLength={4000} value={text} placeholder={t('bsPlaceholder')} onChange={(e) => setText(e.target.value)} />
        <div className="chip-row">
          <button className={perspective === '' ? 'chip-btn on' : 'chip-btn'} onClick={() => setPerspective('')}>{t('bsAnyPerspective')}</button>
          {PERSPECTIVES.map((p) => (
            <button key={p} className={perspective === p ? 'chip-btn on' : 'chip-btn'} onClick={() => setPerspective(p)}>
              {t(`persp_${p}`)}
            </button>
          ))}
        </div>
        <div className="row-actions">
          <button className="primary" disabled={!ready || !text.trim() || phase.kind === 'working'} onClick={() => void plan()}>
            {phase.kind === 'working' ? t('claudeWorking') : `✦ ${t('bsPlan')}`}
          </button>
          <button disabled={!text.trim()} onClick={() => saveIdea()}>{t('bsSave')}</button>
          {!ready && (
            <span className="small muted">
              {IS_DESKTOP ? t('bsNeedsClaude') : t('claudeDesktopOnly')}{' '}
              {IS_DESKTOP && <button className="link-btn" onClick={() => setSection('settings')}>{t('claudeOpenSettings')}</button>}
            </span>
          )}
        </div>
      </section>

      {phase.kind === 'error' && <p className="warn" role="alert">{t('aiFailed', { reason: phase.message })}</p>}

      {phase.kind === 'plan' && (
        <section className="panel">
          <h2>{t('bsPlanTitle')}</h2>
          {phase.plan.summary && <p>{phase.plan.summary}</p>}
          <ActionsPreview projectId={projectId} actions={phase.plan.actions} onApplied={() => setPhase({ kind: 'idle' })} />
        </section>
      )}

      {text.trim().length > 2 && (
        <div className="two-col">
          <section className="panel">
            <h2>{t('bsCheatHits')}</h2>
            {cheatHits.length === 0 && <p className="muted small">{t('cheatNone')}</p>}
            <ul className="hit-list">
              {cheatHits.map((h) => (
                <li key={h.doc.id}>
                  <button className="link-btn" onClick={() => openRef('cheat', h.doc.id)}>{h.doc.title}</button>
                  <span className="small muted">{snippet(h.doc.text, text, 140)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>{t('bsProjectHits')}</h2>
            {projectHits.length === 0 && <p className="muted small">{t('bsNoProjectHits')}</p>}
            <ul className="hit-list">
              {projectHits.map((h) => (
                <li key={`${h.doc.type}:${h.doc.id}`}>
                  <span className={`chip ref-${h.doc.type}`}>{t(`ref_${h.doc.type as 'goal'}`)}</span>{' '}
                  <button className="link-btn" onClick={() => openRef(h.doc.type as 'goal', h.doc.id)}>{h.doc.title}</button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {ideas.length > 0 && (
        <section className="panel">
          <h2>{t('bsSaved')}</h2>
          <ul className="idea-list">
            {ideas.map((i) => (
              <li key={i.id}>
                <div className="row-between">
                  <strong>{i.text.split('\n')[0].slice(0, 120)}</strong>
                  <span className="small muted">{new Date(i.createdAt).toLocaleDateString()}</span>
                </div>
                {i.perspective && <span className="chip persp">{t(`persp_${i.perspective as Perspective}`)}</span>}
                {i.plan && <p className="small muted">{i.plan}</p>}
                <div className="row-actions">
                  <button className="ghost small" onClick={() => setText(i.text)}>{t('bsReuse')}</button>
                  <button className="ghost small" onClick={() => mutate((d) => ({ ...d, ideas: d.ideas.filter((x) => x.id !== i.id) }))}>{t('delete')}</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
