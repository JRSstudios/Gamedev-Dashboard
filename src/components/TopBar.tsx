import { useT } from '../i18n'
import { projectToMarkdown } from '../model/markdown'
import { updateSettings } from '../model/ops'
import { projectProgress, totalProgress } from '../model/progress'
import { confirmDialog, pickTextFile, saveTextFile } from '../platform'
import { mutate, notify, replaceData, useStore } from '../store'
import { ProgressBar } from './ProgressBar'

const today = () => new Date().toISOString().slice(0, 10)

export function TopBar({ onOpenAi }: { onOpenAi: () => void }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const activeId = useStore((s) => s.activeProjectId)
  const project = data.projects.find((p) => p.id === activeId)
  const total = totalProgress(data)
  const current = project ? projectProgress(data, project.id) : null
  const { language, theme } = data.settings

  const importJson = async () => {
    const text = await pickTextFile('json')
    if (text === null) return
    if (!(await confirmDialog(t('importConfirm')))) return
    try {
      replaceData(text)
    } catch (e) {
      notify(t('importFailed', { reason: e instanceof Error ? e.message : String(e) }))
    }
  }


  return (
    <header className="topbar">
      <h1>🎮 {t('appName')}</h1>
      <div className="overall" aria-label={t('overall')}>
        <span className="small muted">{t('overall')}</span>
        <ProgressBar pct={total.pct} label={t('overall')} />
        <strong>{total.pct}%</strong>
      </div>
      {project && current && (
        <div className="overall">
          <span className="small muted">{project.name}</span>
          <ProgressBar pct={current.pct} color={project.color} label={project.name} />
          <strong>{current.pct}%</strong>
        </div>
      )}
      <button onClick={onOpenAi}>🤖 {t('ai')}</button>
      <details className="menu">
        <summary>☰ {t('menu')}</summary>
        <div className="menu-body">
          <label>
            {t('language')}
            <select value={language} onChange={(e) => mutate((d) => updateSettings(d, { language: e.target.value as typeof language }))}>
              <option value="auto">Auto</option>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            {t('theme')}
            <select value={theme} onChange={(e) => mutate((d) => updateSettings(d, { theme: e.target.value as typeof theme }))}>
              <option value="auto">{t('themeAuto')}</option>
              <option value="light">{t('themeLight')}</option>
              <option value="dark">{t('themeDark')}</option>
            </select>
          </label>
          <button onClick={() => void saveTextFile(`gamedev-dashboard-${today()}.json`, JSON.stringify(data, null, 2))}>{t('exportJson')}</button>
          <button onClick={() => void importJson()}>{t('importJson')}</button>
          {project && (
            <button onClick={() => void saveTextFile(`${project.name.replace(/[^\p{L}\p{N}_-]+/gu, '-')}-${today()}.md`, projectToMarkdown(data, project.id))}>
              {t('exportMarkdown')}
            </button>
          )}
        </div>
      </details>
    </header>
  )
}
