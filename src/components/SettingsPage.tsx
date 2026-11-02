import { useT } from '../i18n'
import { updateSettings } from '../model/ops'
import { IS_DESKTOP } from '../platform'
import { mutate, useStore } from '../store'
import { ProjectsManager } from './ProjectsManager'

export function SettingsPage({ onOpenAi }: { onOpenAi: () => void }) {
  const t = useT()
  const settings = useStore((s) => s.data.settings)

  return (
    <div className="settings">
      <ProjectsManager />

      <section className="panel">
        <h2>{t('settingsAppearance')}</h2>
        <label className="field">
          {t('theme')}
          <select value={settings.theme} onChange={(e) => mutate((d) => updateSettings(d, { theme: e.target.value as typeof settings.theme }))}>
            <option value="light">{t('themeLight')}</option>
            <option value="dark">{t('themeDark')}</option>
            <option value="auto">{t('themeAuto')}</option>
          </select>
        </label>
        <label className="field">
          {t('language')}
          <select value={settings.language} onChange={(e) => mutate((d) => updateSettings(d, { language: e.target.value as typeof settings.language }))}>
            <option value="auto">Auto</option>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </label>
      </section>

      <section className="panel">
        <h2>{t('ai')}</h2>
        <p className="muted small">{t('aiIntro')}</p>
        <div>
          <button onClick={onOpenAi}>{settings.ai.enabled ? t('aiConnected', { model: settings.ai.model }) : t('aiConnect')}</button>
        </div>
      </section>

      <section className="panel">
        <h2>{t('settingsData')}</h2>
        <p className="muted small">{IS_DESKTOP ? t('dataDesktop') : t('dataBrowser')}</p>
      </section>
    </div>
  )
}
