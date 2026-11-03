import { useState } from 'react'
import { issueUrl, newBug, recentErrors, systemInfo } from '../../features/bugs'
import { useT } from '../../i18n'
import type { Bug } from '../../model/schema'
import { confirmDialog, openLink } from '../../platform'
import { getData, mutate, notify, useStore } from '../../store'

const SEVERITIES: Bug['severity'][] = ['low', 'medium', 'high', 'crash']

const setBug = (id: string, patch: Partial<Bug>) => mutate((d) => ({ ...d, bugs: d.bugs.map((b) => (b.id === id ? { ...b, ...patch } : b)) }))

function BugForm({ bug }: { bug: Bug }) {
  const t = useT()
  const section = useStore((s) => s.section)
  const [showPreview, setShowPreview] = useState(false)
  const info = systemInfo(getData(), bug.section || section)
  const send = async () => {
    if (!bug.title.trim() || !bug.description.trim()) {
      notify(t('bugNeedText'))
      return
    }
    await openLink(issueUrl(bug, info))
    setBug(bug.id, { status: 'sent' })
    notify(t('bugOpened'))
  }
  const attachErrors = () => {
    const errors = recentErrors()
    if (!errors.length) return notify(t('bugNoErrors'))
    setBug(bug.id, { error: errors.slice(-5).map((e) => `${e.at} ${e.message}\n${e.stack}`).join('\n\n').slice(0, 8000) })
  }
  return (
    <article className="panel bug-form">
      <label className="field wide">
        <span className="field-label">{t('bugTitle')}</span>
        <input value={bug.title} maxLength={200} onChange={(e) => setBug(bug.id, { title: e.target.value })} />
      </label>
      <label className="field wide">
        <span className="field-label">{t('bugWhat')}</span>
        <textarea rows={4} value={bug.description} maxLength={5000} onChange={(e) => setBug(bug.id, { description: e.target.value })} />
      </label>
      <label className="field wide">
        <span className="field-label">{t('bugSteps')}</span>
        <textarea rows={3} value={bug.steps} maxLength={5000} onChange={(e) => setBug(bug.id, { steps: e.target.value })} />
      </label>
      <label className="field wide">
        <span className="field-label">{t('bugExpected')}</span>
        <textarea rows={2} value={bug.expected} maxLength={2000} onChange={(e) => setBug(bug.id, { expected: e.target.value })} />
      </label>
      <div className="row">
        <label className="field inline">
          <span className="field-label">{t('bugSeverity')}</span>
          <select value={bug.severity} onChange={(e) => setBug(bug.id, { severity: e.target.value as Bug['severity'] })}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{t(`bugSev_${s}`)}</option>)}
          </select>
        </label>
        <button onClick={attachErrors}>{t('bugAttachErrors')}</button>
        <button className="link" onClick={() => setShowPreview(!showPreview)}>{showPreview ? t('bugHidePreview') : t('bugPreview')}</button>
      </div>
      {bug.error && <pre className="code small">{bug.error}</pre>}
      {showPreview && <pre className="code small">{info}</pre>}
      <p className="small muted">{t('bugPrivacy')}</p>
      <div className="row">
        <button className="primary" onClick={() => void send()}>{bug.status === 'sent' ? t('bugSendAgain') : t('bugSend')}</button>
        {bug.status !== 'fixed' && <button onClick={() => setBug(bug.id, { status: 'fixed' })}>{t('bugMarkFixed')}</button>}
        <button
          className="link"
          onClick={async () => {
            if (await confirmDialog(t('bugDeleteConfirm'))) mutate((d) => ({ ...d, bugs: d.bugs.filter((b) => b.id !== bug.id) }))
          }}
        >
          {t('delete')}
        </button>
      </div>
    </article>
  )
}

/** Bugs: write a report and send it as a pre-filled GitHub issue; reports after errors land here too. */
export function BugsView() {
  const t = useT()
  const bugs = useStore((s) => s.data.bugs)
  const [selected, setSelected] = useState<string | null>(null)
  const current = bugs.find((b) => b.id === selected) ?? bugs[bugs.length - 1] ?? null
  const create = () => {
    const bug = newBug({})
    mutate((d) => ({ ...d, bugs: [...d.bugs, bug].slice(-500) }))
    setSelected(bug.id)
  }
  return (
    <div className="split">
      <aside className="split-list panel">
        <button className="primary" onClick={create}>+ {t('bugNew')}</button>
        <p className="small muted">{t('bugIntro')}</p>
        <ul className="item-list">
          {[...bugs].reverse().map((b) => (
            <li key={b.id}>
              <button className={b.id === current?.id ? 'item active' : 'item'} onClick={() => setSelected(b.id)}>
                <span className={`pill small sev-${b.severity}`}>{t(`bugStatus_${b.status}`)}</span>
                <span className="item-title">{b.title || t('bugUntitled')}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="split-main">{current ? <BugForm key={current.id} bug={current} /> : <p className="muted empty">{t('bugNone')}</p>}</div>
    </div>
  )
}
