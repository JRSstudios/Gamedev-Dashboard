import { useEffect, useState } from 'react'
import { PlanSchema, validActions, type Plan } from '../../ai/actions'
import { claudeHasKey } from '../../ai/claude'
import { extractJson } from '../../ai/client'
import { LimitReachedError, runClaude } from '../../ai/run'
import { ENGLISH_NAMES, resolveLanguage, useT } from '../../i18n'
import type { AssetCategory } from '../../model/schema'
import { IS_DESKTOP } from '../../platform'
import { getData, useStore } from '../../store'
import { ActionsPreview } from './ActionsPreview'

const BATCH = 60

/** "Sort with Claude": proposes categories and tags for the assets shown on this board. */
export function ClaudeSortButton({ projectId, categories }: { projectId: string; categories: readonly AssetCategory[] }) {
  const t = useT()
  const enabled = useStore((s) => s.data.settings.claude.enabled)
  const [hasKey, setHasKey] = useState(false)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<{ kind: 'working'; batch: number; of: number } | { kind: 'error'; message: string } | { kind: 'plan'; plan: Plan } | null>(null)

  useEffect(() => {
    if (IS_DESKTOP) void claudeHasKey().then(setHasKey)
  }, [])
  if (!IS_DESKTOP || !enabled || !hasKey) return null

  const run = async () => {
    setOpen(true)
    setPhase({ kind: 'working', batch: 1, of: 1 })
    // Names, categories and tags only: no paths, no file contents.
    const assets = getData()
      .assets.filter((a) => a.projectId === projectId && categories.includes(a.category))
      .slice(0, 300)
      .map((a) => `${a.id} | ${a.name} | ${a.kind} | ${a.category} | ${a.tags.join(' ')}`)
    // Batches keep each answer short and reliable; one bad batch does not lose the others.
    const batches = Array.from({ length: Math.ceil(assets.length / BATCH) }, (_, i) => assets.slice(i * BATCH, (i + 1) * BATCH))
    const summaries: string[] = []
    const actions: Plan['actions'] = []
    try {
      for (const [i, batch] of batches.entries()) {
        setPhase({ kind: 'working', batch: i + 1, of: batches.length })
        const result = await runClaude({
          command: 'sort',
          maxTokens: 4000,
          system: `Task: sort the user's assets. For each asset that is in the wrong category or lacks useful tags, propose one "asset" action (allowed categories here: ${categories.join(', ')}). Tags are short lowercase words (character, enemy, ui, forest, loop, ...). Skip assets that are already fine. Write any summary text in ${ENGLISH_NAMES[resolveLanguage(getData().settings.language)]}; keep tags in English. Reply with the JSON object only.`,
          user: `Assets (id | name | kind | category | tags):\n${batch.join('\n')}`,
        })
        const parsed = PlanSchema.safeParse(extractJson(result.text))
        if (!parsed.success) throw new Error(t('claudeBadJson'))
        if (parsed.data.summary) summaries.push(parsed.data.summary)
        actions.push(...validActions(getData(), projectId, parsed.data.actions).filter((a) => a.type === 'asset' && (!a.category || categories.includes(a.category))))
      }
      setPhase({ kind: 'plan', plan: { summary: summaries.join(' '), actions } })
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof LimitReachedError ? t('claudeLimitReached') : e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <>
      <button onClick={() => void run()} title={t('sortClaudeHint')}>✦ {t('sortClaude')}</button>
      {open && phase && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal wide" role="dialog" aria-modal="true" aria-label={t('sortClaude')} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
            <div className="panel-head">
              <h2>✦ {t('sortClaude')}</h2>
              <button onClick={() => setOpen(false)}>{t('close')}</button>
            </div>
            {phase.kind === 'working' && <p className="muted">{t('claudeWorking')}{phase.of > 1 ? ` (${phase.batch}/${phase.of})` : ''}</p>}
            {phase.kind === 'error' && <p className="warn" role="alert">{t('aiFailed', { reason: phase.message })}</p>}
            {phase.kind === 'plan' && (
              <>
                {phase.plan.summary && <p>{phase.plan.summary}</p>}
                <ActionsPreview projectId={projectId} actions={phase.plan.actions} onApplied={() => setOpen(false)} />
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
