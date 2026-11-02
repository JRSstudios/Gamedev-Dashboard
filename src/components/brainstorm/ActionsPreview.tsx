import { useState } from 'react'
import { applyActions, type Action } from '../../ai/actions'
import { getCheat } from '../../cheatsheet'
import { useLang, useT, type Lang, type TFn } from '../../i18n'
import { mutate, notify, useStore } from '../../store'

function describe(t: TFn, lang: Lang, a: Action, assetName: (id: string) => string): { kind: string; title: string; detail: string } {
  switch (a.type) {
    case 'goal':
      return { kind: t('ref_goal'), title: a.title, detail: a.steps.join(' · ') }
    case 'page':
      return { kind: t('ref_page'), title: `${a.icon ? `${a.icon} ` : ''}${a.title}`, detail: t('actBlocks', { n: a.blocks.length }) }
    case 'table':
      return { kind: t('ref_table'), title: a.name, detail: `${a.columns.map((c) => c.name).join(', ')} · ${t('rowsCount', { n: a.rows.length })}` }
    case 'note':
      return { kind: t('claudeNote'), title: a.text.split('\n')[0].slice(0, 120), detail: '' }
    case 'cheat':
      return { kind: t('ref_cheat'), title: getCheat(a.id, lang)?.title ?? a.id, detail: a.goal ? t('actLinkedTo', { name: a.goal }) : '' }
    case 'asset':
      return { kind: t('ref_asset'), title: assetName(a.id), detail: [a.category ? t(`cat_${a.category}`) : '', ...(a.tags ?? []).map((x) => `#${x}`)].filter(Boolean).join(' ') }
    case 'connect':
      return { kind: t('actConnect'), title: `${a.from} → ${a.to}`, detail: '' }
  }
}

/** Shows proposed actions with a checkbox each; only the checked ones are applied. */
export function ActionsPreview({ projectId, actions, onApplied }: { projectId: string; actions: Action[]; onApplied: (count: number) => void }) {
  const t = useT()
  const lang = useLang()
  const assets = useStore((s) => s.data.assets)
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  const assetName = (id: string) => assets.find((a) => a.id === id)?.name ?? id

  const apply = () => {
    const chosen = actions.filter((_, i) => !skipped.has(i))
    mutate((d) => applyActions(d, projectId, chosen))
    notify(t('claudeApplied', { n: chosen.length }))
    onApplied(chosen.length)
  }

  if (actions.length === 0) return <p className="muted small">{t('actNone')}</p>

  return (
    <div className="actions-preview">
      <ul className="check-list">
        {actions.map((a, i) => {
          const d = describe(t, lang, a, assetName)
          return (
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
                  <span className={`chip ref-${a.type === 'note' ? 'note' : a.type === 'connect' ? 'goal' : a.type}`}>{d.kind}</span> <strong>{d.title}</strong>
                  {d.detail && <span className="small muted"> — {d.detail}</span>}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      <div className="row-actions">
        <button className="primary" disabled={skipped.size === actions.length} onClick={apply}>
          {t('actApply', { n: actions.length - skipped.size })}
        </button>
      </div>
    </div>
  )
}
