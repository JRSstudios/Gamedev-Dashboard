import { useEffect, useRef, useState } from 'react'
import { ClaudeError, type ClaudeResult } from '../ai/claude'
import { claudeAvailable, LimitReachedError, runClaude } from '../ai/run'
import { buildProjectContext } from '../ai/context'
import { buildPrompt, PRESETS, splitTitle, SuggestionsSchema, type Preset, type Suggestion } from '../ai/prompts'
import { extractJson } from '../ai/client'
import { resolveLanguage, useT } from '../i18n'
import { addGoal, addNote, addResearch, addSteps } from '../model/ops'
import { getData, mutate, notify, setSection, useStore } from '../store'

export interface ClaudeRequest {
  preset: Preset
  topic: string
  /** Run immediately when the dialog opens (used by slash commands). */
  autorun: boolean
}

type Phase = { kind: 'idle' } | { kind: 'working' } | { kind: 'error'; message: string } | { kind: 'text'; result: ClaudeResult; topic: string } | { kind: 'suggest'; result: ClaudeResult; items: Suggestion[] }

export function ClaudeDialog({ projectId, initial, onClose }: { projectId: string; initial: ClaudeRequest; onClose: () => void }) {
  const t = useT()
  const settings = useStore((s) => s.data.settings)
  const [preset, setPreset] = useState<Preset>(initial.preset)
  const [topic, setTopic] = useState(initial.topic)
  const [webSearch, setWebSearch] = useState(settings.claude.webSearch)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  const started = useRef(false)
  const lang = resolveLanguage(settings.language)
  const ready = settings.claude.enabled && hasKey === true

  const context = buildProjectContext(useStore((s) => s.data), projectId)

  const run = async (p: Preset = preset, subject: string = topic) => {
    if (p !== 'suggest' && !subject.trim()) return
    setPhase({ kind: 'working' })
    setSkipped(new Set())
    try {
      const prompt = buildPrompt(p, subject.trim(), buildProjectContext(getData(), projectId), lang, webSearch)
      const result = await runClaude({
        command: p,
        system: prompt.system,
        user: prompt.user,
        webSearch: prompt.search && webSearch,
        maxTokens: prompt.expect === 'json' ? 3000 : 6000,
      })
      if (prompt.expect === 'json') {
        const parsed = SuggestionsSchema.safeParse(extractJson(result.text))
        if (!parsed.success) throw new ClaudeError(t('claudeBadJson'))
        setPhase({ kind: 'suggest', result, items: parsed.data.suggestions })
      } else {
        setPhase({ kind: 'text', result, topic: subject.trim() })
      }
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof LimitReachedError ? t('claudeLimitReached') : e instanceof Error ? e.message : String(e) })
    }
  }

  useEffect(() => {
    void claudeAvailable().then(setHasKey)
  }, [])

  useEffect(() => {
    if (started.current || !ready || !initial.autorun) return
    started.current = true
    void run(initial.preset, initial.topic)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when ready
  }, [ready])

  const saveResearch = (result: ClaudeResult, subject: string) => {
    const { title, body } = splitTitle(result.text)
    mutate((d) => addResearch(d, projectId, { title: title || subject, body, sources: result.sources, query: subject, model: result.model }))
    notify(t('claudeSavedResearch'))
    setSection('research')
    onClose()
  }

  const applySuggestions = (items: Suggestion[]) => {
    const chosen = items.filter((_, i) => !skipped.has(i))
    mutate((d) => {
      let next = d
      for (const s of chosen) {
        if (s.kind === 'goal') {
          next = addGoal(next, projectId, s.title)
          const goal = next.goals.at(-1)
          if (goal && s.steps?.length) next = addSteps(next, goal.id, s.steps)
        } else {
          next = addNote(next, projectId, `${s.title}${s.why ? ` — ${s.why}` : ''} #ai`, null)
        }
      }
      return next
    })
    notify(t('claudeApplied', { n: chosen.length }))
    setSection('goals')
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal wide"
        role="dialog"
        aria-modal="true"
        aria-label={t('claude')}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="panel-head">
          <h2>✦ {t('claude')}</h2>
          <button onClick={onClose}>{t('close')}</button>
        </div>

        {hasKey === false || !settings.claude.enabled ? (
          <>
            <p>{t('claudeNoKey')}</p>
            <div>
              <button
                className="primary"
                onClick={() => {
                  setSection('settings')
                  onClose()
                }}
              >
                {t('claudeOpenSettings')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="preset-tabs" role="tablist">
              {PRESETS.map((p) => (
                <button key={p} role="tab" aria-selected={p === preset} className={p === preset ? 'on' : ''} onClick={() => setPreset(p)}>
                  {t(`preset_${p}`)}
                </button>
              ))}
            </div>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault()
                void run()
              }}
            >
              <label className="field wide-field">
                {t('topicLabel')}
                <input autoFocus value={topic} maxLength={400} placeholder={t(`presetHint_${preset}`)} onChange={(e) => setTopic(e.target.value)} />
              </label>
              {preset !== 'suggest' && (
                <label className="check small muted">
                  <input type="checkbox" checked={webSearch} onChange={(e) => setWebSearch(e.target.checked)} />
                  {t('claudeWebSearch')}
                </label>
              )}
              <div>
                <button className="primary" type="submit" disabled={phase.kind === 'working' || (preset !== 'suggest' && !topic.trim())}>
                  {phase.kind === 'working' ? t('claudeWorking') : t('claudeRun')}
                </button>
              </div>
            </form>
            <details className="small muted">
              <summary>{t('claudePreview')}</summary>
              <p>{t('claudePrivacy')}</p>
              <pre className="claude-result">{context}</pre>
            </details>
          </>
        )}

        {phase.kind === 'error' && <p className="warn" role="alert">{t('aiFailed', { reason: phase.message })}</p>}

        {phase.kind === 'text' && (
          <>
            <div className="claude-result">{phase.result.text}</div>
            {phase.result.sources.length > 0 && (
              <p className="small muted">
                {t('researchSources')}: {phase.result.sources.map((s) => s.title || s.url).join(' · ')}
              </p>
            )}
            <div className="row-actions">
              <button className="primary" onClick={() => saveResearch(phase.result, phase.topic)}>{t('claudeSaveResearch')}</button>
              <span className="small muted">{t('claudeUsage', { input: phase.result.inputTokens, output: phase.result.outputTokens, model: phase.result.model })}</span>
            </div>
          </>
        )}

        {phase.kind === 'suggest' && (
          <div className="suggest">
            <h3>{t('aiReview')}</h3>
            <ul className="check-list">
              {phase.items.map((s, i) => (
                <li key={i}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={!skipped.has(i)}
                      onChange={(e) => {
                        const next = new Set(skipped)
                        if (e.target.checked) next.delete(i)
                        else next.add(i)
                        setSkipped(next)
                      }}
                    />
                    <span>
                      <strong>{s.kind === 'goal' ? t('nav_goals') : t('claudeNote')}: {s.title}</strong>
                      {s.steps && s.steps.length > 0 && <span className="small muted"> — {s.steps.join(' · ')}</span>}
                      {s.why && <span className="small muted"> ({s.why})</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="row-actions">
              <button className="primary" disabled={skipped.size === phase.items.length} onClick={() => applySuggestions(phase.items)}>{t('aiApply')}</button>
              <span className="small muted">{t('claudeUsage', { input: phase.result.inputTokens, output: phase.result.outputTokens, model: phase.result.model })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
