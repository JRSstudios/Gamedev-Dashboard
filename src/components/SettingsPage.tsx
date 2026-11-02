import { useEffect, useState } from 'react'
import { claudeClearKey, claudeHasKey, claudeSetKey, CLAUDE_MODELS, friendlyError } from '../ai/claude'
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

  useEffect(() => {
    void claudeHasKey().then(setHasKey)
  }, [])

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
          <p className="small">{hasKey ? t('claudeKeyStored') : t('claudeKeyNone')}</p>
          <form
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
          </form>
          <label className="field">
            {t('claudeModel')}
            <select value={claude.model} onChange={(e) => set({ model: e.target.value })}>
              {CLAUDE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={claude.enabled} disabled={!hasKey} onChange={(e) => set({ enabled: e.target.checked })} />
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
