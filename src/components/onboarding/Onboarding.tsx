import { useState } from 'react'
import { DesktopOnly } from '../DesktopOnly'
import { claudeSetKey, friendlyError } from '../../ai/claude'
import { useT } from '../../i18n'
import { askForClaude, openUnityProject } from '../../features/onboarding'
import { addProject, updateSettings } from '../../model/ops'
import { IS_DESKTOP } from '../../platform'
import { getData, mutate, notify, openDialog, setActiveProject, setSection, useStore } from '../../store'
import { Icon } from '../shell/Icon'

export function Welcome() {
  const t = useT()
  const [name, setName] = useState('')
  const [importFiles, setImportFiles] = useState(true)

  const createEmpty = () => {
    if (!name.trim()) return
    const { data: next, project } = addProject(getData(), name)
    mutate(() => next)
    setActiveProject(project.id)
    askForClaude()
  }

  return (
    <main className="welcome">
      <header>
        <h1>{t('noProjectsTitle')}</h1>
        <p className="muted">{t('onbIntro')}</p>
      </header>
      <div className="welcome-cards">
        <section className="panel welcome-card primary-card">
          <Icon name="integrations" size={28} />
          <h2>{t('onbUnityTitle')}</h2>
          {IS_DESKTOP ? <p className="small muted">{t('onbUnityBody')}</p> : <DesktopOnly reason={t('integDesktopOnly')} />}
          <label className="check small">
            <input type="checkbox" checked={importFiles} disabled={!IS_DESKTOP} onChange={(e) => setImportFiles(e.target.checked)} />
            {t('onbImport')}
          </label>
          <button className="primary" disabled={!IS_DESKTOP} onClick={() => void openUnityProject(t, importFiles)}>
            {t('onbUnityButton')}
          </button>
        </section>
        <section className="panel welcome-card">
          <Icon name="plus" size={28} />
          <h2>{t('onbEmptyTitle')}</h2>
          <p className="small muted">{t('noProjectsBody')}</p>
          <label className="field">
            <span className="field-label">{t('projectNamePlaceholder')}</span>
            <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createEmpty()} />
          </label>
          <button onClick={createEmpty} disabled={!name.trim()}>+ {t('newProject')}</button>
        </section>
      </div>
    </main>
  )
}

export function ConnectClaudeDialog() {
  const t = useT()
  const open = useStore((s) => s.dialog === 'connectClaude')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  if (!open) return null

  const close = (connected: boolean) => {
    mutate((d) => updateSettings(d, { claude: { ...d.settings.claude, asked: true, enabled: connected || d.settings.claude.enabled } }))
    openDialog(null)
  }
  const save = async () => {
    setBusy(true)
    try {
      await claudeSetKey(key)
      setKey('')
      close(true)
      notify(t('onbClaudeConnected'), { label: t('nav_brainstorm'), run: () => setSection('brainstorm') })
    } catch (e) {
      notify(t('aiFailed', { reason: friendlyError(e) }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('onbClaudeTitle')} onKeyDown={(e) => e.key === 'Escape' && close(false)}>
        <h2 className="dialog-title">✦ {t('onbClaudeTitle')}</h2>
        <p>{t('onbClaudeBody')}</p>
        <ul className="small muted bullets">
          <li>{t('onbClaudePoint1')}</li>
          <li>{t('onbClaudePoint2')}</li>
          <li>{t('onbClaudePoint3')}</li>
        </ul>
        <form
          className="key-form"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <input type="password" autoFocus autoComplete="off" spellCheck={false} value={key} aria-label={t('claudeKey')} onChange={(e) => setKey(e.target.value)} />
          <button className="primary" type="submit" disabled={!key.trim() || busy}>{t('onbClaudeConnect')}</button>
        </form>
        <div className="row-actions">
          <button className="ghost" onClick={() => close(false)}>{t('onbLater')}</button>
          <span className="small muted">{t('onbClaudeWhere')}</span>
        </div>
      </div>
    </div>
  )
}
