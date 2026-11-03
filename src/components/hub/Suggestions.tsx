import { useEffect, useMemo, useState } from 'react'
import { useBridge } from '../../features/bridge'
import { askClaude } from '../../features/claudeEvents'
import { useT } from '../../i18n'
import { dismissInbox, updateAsset } from '../../model/ops'
import { suggestions, type Suggestion } from '../../model/suggest'
import { pathsExist } from '../../platform'
import { mutate, setSection, useStore } from '../../store'


function useMissing(projectId: string): Set<string> {
  const assets = useStore((s) => s.data.assets)
  const linked = useMemo(() => assets.filter((a) => a.projectId === projectId && a.path), [assets, projectId])
  const key = linked.map((a) => a.path).join('|')
  const [missing, setMissing] = useState<{ key: string; ids: Set<string> }>({ key: '', ids: new Set() })
  useEffect(() => {
    let live = true
    void pathsExist(linked.map((a) => a.path!))
      .then((ok) => live && setMissing({ key, ids: new Set(linked.filter((_, i) => !ok[i]).map((a) => a.id)) }))
      .catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for the linked paths
  }, [key])
  return missing.key === key ? missing.ids : new Set()
}

/** Automatic hints for the active project, worked out locally. */
export function Suggestions({ projectId }: { projectId: string }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const claudeOn = useStore((s) => s.data.settings.claude.enabled)
  const logs = useBridge((s) => s.unityLogs)
  const checks = useBridge((s) => s.checks)
  const missing = useMissing(projectId)
  const errors = logs.filter((l) => l.level === 'error')
  const modelIssues = Object.entries(checks)
    .filter(([, c]) => c.issues.length > 0)
    .map(([path, c]) => ({ name: path.split('/').pop() ?? path, count: c.issues.length }))
  const list = suggestions(data, projectId, {
    missing,
    unityErrors: errors.length ? { count: errors.length, first: errors[0].message } : undefined,
    modelIssues,
  })

  const act = (s: Suggestion) => {
    if (s.kind === 'category' && s.assetId && s.category) {
      mutate((d) => updateAsset(d, s.assetId!, { category: s.category }))
      return
    }
    const target = { deadline: 'planner', noEstimate: 'planner', noSteps: 'goals', stale: 'goals', missing: 'assets', unityErrors: 'unity', modelCheck: 'models' } as const
    setSection(target[s.kind as keyof typeof target])
  }
  const params = (s: Suggestion) => (s.kind === 'category' ? { ...s.params, category: t(`cat_${s.category!}`) } : s.params)

  return (
    <section className="panel hub-suggest" data-tour="suggestions">
      <div className="panel-head">
        <h2>{t('sugTitle')}</h2>
        {list.length > 0 && <span className="badge">{list.length}</span>}
      </div>
      {list.length === 0 && <p className="small muted">{t('sugNone')}</p>}
      <ul className="plain inbox">
        {list.map((s) => (
          <li key={s.id} className={`sug sug-${s.kind}`}>
            <span className="small">{t(`sug_${s.kind}`, params(s))}</span>
            <span className="row">
              <button className="link" onClick={() => act(s)}>{t(s.kind === 'category' ? 'sugApply' : 'sugOpen')}</button>
              <button className="link" aria-label={t('dismiss')} title={t('dismiss')} onClick={() => mutate((d) => dismissInbox(d, projectId, s.id))}>×</button>
            </span>
          </li>
        ))}
      </ul>
      {claudeOn && (
        <button className="link" onClick={() => askClaude('suggest')}>✦ {t('sugAskClaude')}</button>
      )}
    </section>
  )
}
