import { useState } from 'react'
import { useLang, useT, type TFn } from '../../i18n'
import { dismissInbox } from '../../model/ops'
import { smartTexts } from '../../features/smartTexts'
import { applySmart, dataProposals, profileUnity, unityProposals, type SmartItem, type UnityProfile } from '../../model/smart'
import { IS_DESKTOP, scanUnityProject } from '../../platform'
import { getData, mutate, notify, useStore } from '../../store'

function describe(t: TFn, item: SmartItem): string {
  switch (item.kind) {
    case 'goal':
      return t('smartItemGoal', { title: item.title, n: item.steps.length })
    case 'table':
      return t('smartItemTable', { name: item.table.name, n: item.table.rows.length })
    case 'note':
      return t('smartItemNote', { text: item.text.split('\n')[0] })
    case 'cheats':
      return t('smartItemCheats', { n: item.ids.length })
  }
}

/** Project analysis: reads the Unity project (if linked) and the project data, proposes whole items. */
export function SmartPanel({ projectId }: { projectId: string }) {
  const t = useT()
  const lang = useLang()
  const data = useStore((s) => s.data)
  const project = data.projects.find((p) => p.id === projectId)
  const [profile, setProfile] = useState<UnityProfile | null>(null)
  const [busy, setBusy] = useState(false)
  if (!project) return null
  const unityDir = project.integrations.unityDir
  const tx = smartTexts(t)
  const dismissed = new Set(project.inboxDismissed)
  const items = [...(profile ? unityProposals(profile, tx) : []), ...dataProposals(data, projectId, tx)].filter((i) => !dismissed.has(i.id))

  const analyse = async () => {
    if (!unityDir) return
    setBusy(true)
    try {
      setProfile(profileUnity(await scanUnityProject(unityDir)))
    } catch (e) {
      notify(t('aiFailed', { reason: e instanceof Error ? e.message : String(e) }))
    }
    setBusy(false)
  }
  const apply = (item: SmartItem) => {
    mutate((d) => dismissInbox(applySmart(d, projectId, item, lang), projectId, item.id))
    notify(t('smartApplied'))
  }
  const facts = profile
    ? [
        t(`smartPersp_${profile.perspective}`),
        profile.pipeline.toUpperCase(),
        t('smartCountScripts', { n: profile.counts.scripts }),
        t('smartCountScenes', { n: profile.counts.scenes }),
        t('smartCountPrefabs', { n: profile.counts.prefabs }),
        ...(profile.has.inputSystem ? ['Input System'] : []),
        ...(profile.has.cinemachine ? ['Cinemachine'] : []),
      ]
    : []

  return (
    <section className="panel smart-panel" data-tour="smart">
      <div className="panel-head">
        <h2>✦ {t('smartTitle')}</h2>
        {IS_DESKTOP && unityDir && (
          <button onClick={() => void analyse()} disabled={busy}>{busy ? t('smartScanning') : profile ? t('smartRescan') : t('smartScan')}</button>
        )}
      </div>
      <p className="small muted">{unityDir || !IS_DESKTOP ? t('smartIntro') : t('smartNeedUnity')}</p>
      {facts.length > 0 && (
        <div className="chips">
          {facts.map((f) => <span key={f} className="pill">{f}</span>)}
        </div>
      )}
      {items.length === 0 && <p className="small muted">{profile || !(IS_DESKTOP && unityDir) ? t('smartNothing') : t('smartNothingYet')}</p>}
      <ul className="plain inbox">
        {items.map((item) => (
          <li key={item.id}>
            <span className="small">
              <strong>{describe(t, item)}</strong>
              <br />
              <span className="muted">{item.reason}</span>
            </span>
            <span className="row">
              <button className="link" onClick={() => apply(item)}>{t('sugApply')}</button>
              <button className="link" aria-label={t('dismiss')} title={t('dismiss')} onClick={() => mutate(() => dismissInbox(getData(), projectId, item.id))}>×</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
