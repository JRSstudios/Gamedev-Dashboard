import { useEffect, useState } from 'react'
import { askClaudeCli, claudeClearKey, claudeCliStatus, claudeHasKey, claudeSetKey, CLAUDE_MODELS, friendlyError, type CliStatus } from '../ai/claude'
import { LANGUAGES, NATIVE_NAMES, useT } from '../i18n'
import { updateSettings } from '../model/ops'
import { IS_DESKTOP } from '../platform'
import { mutate, notify, useStore } from '../store'
import { ProjectsManager } from './ProjectsManager'
import { SectionsSettings } from './SectionsSettings'
import { UsagePanel } from './UsagePanel'

function ClaudeSettings() {
  const t = useT()
  const claude = useStore((s) => s.data.settings.claude)
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [key, setKey] = useState('')
  const set = (patch: Partial<typeof claude>) => mutate((d) => updateSettings(d, { claude: { ...d.settings.claude, ...patch } }))

  const [cli, setCli] = useState<CliStatus | null>(null)
  const [testing, setTesting] = useState(false)
  useEffect(() => {
    void claudeHasKey().then(setHasKey)
    void claudeCliStatus().then(setCli)
  }, [])
  const viaCli = claude.transport === 'cli'
  const ready = viaCli ? Boolean(cli?.found) : Boolean(hasKey)
  const testCli = async () => {
    setTesting(true)
    try {
      const r = await askClaudeCli({ model: claude.model, system: 'Reply with the single word OK.', user: 'Test' })
      notify(t('cliTestOk', { reply: r.text.slice(0, 40) }))
      set({ enabled: true })
    } catch (e) {
      notify(t('aiFailed', { reason: e instanceof Error ? e.message : String(e) }))
    }
    setTesting(false)
  }

  const save = async () => {
    try {
      await claudeSetKey(key)
      setKey('')
      setHasKey(true)
      set({ enabled: true })
      notify(t('claudeKeySavedNote'))
    } catch (e) {
      notify(t('aiFailed', { reason: friendlyError(e) }))
    }
  }

  const remove = async () => {
    try {
      await claudeClearKey()
      setHasKey(false)
      set({ enabled: false })
      notify(t('claudeKeyRemovedNote'))
    } catch (e) {
      notify(t('aiFailed', { reason: friendlyError(e) }))
    }
  }

  return (
    <section className="panel">
      <h2>{t('claude')}</h2>
      <p className="muted small">{IS_DESKTOP ? t('claudeIntro') : t('claudeDesktopOnly')}</p>
      {IS_DESKTOP && (
        <>
          <div className="seg transport" role="radiogroup" aria-label={t('claudeTransport')}>
            <button role="radio" aria-checked={!viaCli} className={viaCli ? '' : 'on'} onClick={() => set({ transport: 'api' })}>{t('claudeViaApi')}</button>
            <button role="radio" aria-checked={viaCli} className={viaCli ? 'on' : ''} onClick={() => set({ transport: 'cli' })}>{t('claudeViaCli')}</button>
          </div>
          <p className="small muted">{viaCli ? t('claudeViaCliHint') : t('claudeViaApiHint')}</p>
          {viaCli && (
            <div className="row">
              <span className={`pill ${cli?.found ? 'ok' : 'bad'}`}>{cli?.found ? t('cliFound', { version: cli.version ?? '?' }) : t('cliMissing')}</span>
              <button disabled={!cli?.found || testing} onClick={() => void testCli()}>{testing ? t('claudeWorking') : t('cliTest')}</button>
            </div>
          )}
          {!viaCli && <p className="small">{hasKey ? t('claudeKeyStored') : t('claudeKeyNone')}</p>}
          {!viaCli && <form
            className="key-form"
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              placeholder="sk-ant-…"
              aria-label={t('claudeKey')}
              onChange={(e) => setKey(e.target.value)}
            />
            <button className="primary" type="submit" disabled={!key.trim()}>{t('claudeSave')}</button>
            {hasKey && <button type="button" onClick={() => void remove()}>{t('claudeRemove')}</button>}
          </form>}
          <label className="field">
            {t('claudeModel')}
            <select value={claude.model} onChange={(e) => set({ model: e.target.value })}>
              {CLAUDE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={claude.enabled} disabled={!ready} onChange={(e) => set({ enabled: e.target.checked })} />
            {t('claudeEnable')}
          </label>
          <label className="check">
            <input type="checkbox" checked={claude.webSearch} onChange={(e) => set({ webSearch: e.target.checked })} />
            {t('claudeWebSearch')}
          </label>
        </>
      )}
    </section>
  )
}

const TABS = ['general', 'project', 'ai', 'data'] as const
type Tab = (typeof TABS)[number]
const TAB_KEY = 'gamedev-dashboard.settingsTab'

function readTab(): Tab {
  try {
    const v = localStorage.getItem(TAB_KEY)
    return TABS.find((x) => x === v) ?? 'general'
  } catch {
    return 'general'
  }
}

export function SettingsPage({ onOpenAi }: { onOpenAi: () => void }) {
  const t = useT()
  const settings = useStore((s) => s.data.settings)
  const [tab, setTab] = useState<Tab>(readTab)
  const choose = (next: Tab) => {
    setTab(next)
    try {
      localStorage.setItem(TAB_KEY, next)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="settings">
      <div className="tabs" role="tablist" aria-label={t('nav_settings')}>
        {TABS.map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} className={tab === x ? 'tab on' : 'tab'} onClick={() => choose(x)}>
            {t(`settingsTab_${x}`)}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <section className="panel">
          <h2>{t('settingsAppearance')}</h2>
          <label className="field">
            {t('language')}
            <select value={settings.language} onChange={(e) => mutate((d) => updateSettings(d, { language: e.target.value as typeof settings.language }))}>
              <option value="auto">{t('languageAuto')}</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{NATIVE_NAMES[l]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            {t('theme')}
            <select value={settings.theme} onChange={(e) => mutate((d) => updateSettings(d, { theme: e.target.value as typeof settings.theme }))}>
              <option value="light">{t('themeLight')}</option>
              <option value="dark">{t('themeDark')}</option>
              <option value="auto">{t('themeAuto')}</option>
            </select>
          </label>
          <p className="small muted">{t('translationNote')}</p>
          {IS_DESKTOP && (
            <>
              <label className="check">
                <input type="checkbox" checked={settings.bridgeEnabled} onChange={(e) => mutate((d) => updateSettings(d, { bridgeEnabled: e.target.checked }))} />
                {t('bridgeSetting')}
              </label>
              <p className="small muted">{t('bridgeSettingHint')}</p>
            </>
          )}
        </section>
      )}

      {tab === 'project' && (
        <>
          <ProjectsManager />
          <SectionsSettings />
        </>
      )}

      {tab === 'ai' && (
        <>
          <ClaudeSettings />
          {IS_DESKTOP && <UsagePanel />}
          <section className="panel">
            <h2>{t('ai')}</h2>
            <p className="muted small">{t('aiIntro')}</p>
            <div>
              <button onClick={onOpenAi}>{settings.ai.enabled ? t('aiConnected', { model: settings.ai.model }) : t('aiConnect')}</button>
            </div>
          </section>
        </>
      )}

      {tab === 'data' && (
        <section className="panel">
          <h2>{t('settingsData')}</h2>
          <p className="muted small">{IS_DESKTOP ? t('dataDesktop') : t('dataBrowser')}</p>
          <p className="small">{t('dataExportHint')}</p>
        </section>
      )}
    </div>
  )
}
