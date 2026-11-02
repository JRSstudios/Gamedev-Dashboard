import { useEffect, useState } from 'react'
import { LANGUAGES, NATIVE_NAMES, useT } from '../../i18n'
import { projectToMarkdown, weekToMarkdown } from '../../model/markdown'
import { updateSettings } from '../../model/ops'
import { projectProgress, totalProgress } from '../../model/progress'
import { dayKey, formatMinutes, minutesOnDay, minutesThisWeek } from '../../model/time'
import { confirmDialog, pickTextFile, saveTextFile } from '../../platform'
import { mutate, notify, replaceData, setSection, useStore } from '../../store'
import { ProgressBar } from '../ProgressBar'
import { Icon } from './Icon'
import { MenuButton, type MenuItem } from './MenuButton'

const today = () => new Date().toISOString().slice(0, 10)
const slug = (name: string) => name.replace(/[^\p{L}\p{N}_-]+/gu, '-')

interface Props {
  onOpenPalette: () => void
  onOpenAi: () => void
  onOpenShortcuts: () => void
}

export function TopBar({ onOpenPalette, onOpenAi, onOpenShortcuts }: Props) {
  const t = useT()
  const data = useStore((s) => s.data)
  const activeId = useStore((s) => s.activeProjectId)
  const project = data.projects.find((p) => p.id === activeId)
  const total = totalProgress(data)
  const current = project ? projectProgress(data, project.id) : null
  const { language, theme } = data.settings
  const dark = theme === 'dark' || (theme === 'auto' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches)
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

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

  const setTheme = (value: typeof theme) => mutate((d) => updateSettings(d, { theme: value }))
  const setLanguage = (value: typeof language) => mutate((d) => updateSettings(d, { language: value }))

  const file: MenuItem[] = [
    { kind: 'item', label: t('exportJson'), onSelect: () => void saveTextFile(`gamedev-dashboard-${today()}.json`, JSON.stringify(data, null, 2)) },
    { kind: 'item', label: t('importJson'), onSelect: () => void importJson() },
    { kind: 'separator' },
    {
      kind: 'item',
      label: t('exportMarkdown'),
      disabled: !project,
      onSelect: () => project && void saveTextFile(`${slug(project.name)}-${today()}.md`, projectToMarkdown(data, project.id)),
    },
    {
      kind: 'item',
      label: t('exportWeek'),
      disabled: !project,
      onSelect: () => project && void saveTextFile(`${slug(project.name)}-week-${today()}.md`, weekToMarkdown(data, project.id)),
    },
  ]
  const view: MenuItem[] = [
    { kind: 'heading', label: t('theme') },
    { kind: 'item', label: t('themeLight'), checked: theme === 'light', onSelect: () => setTheme('light') },
    { kind: 'item', label: t('themeDark'), checked: theme === 'dark', onSelect: () => setTheme('dark') },
    { kind: 'item', label: t('themeAuto'), checked: theme === 'auto', onSelect: () => setTheme('auto') },
  ]
  const settingsMenu: MenuItem[] = [
    { kind: 'heading', label: t('language') },
    { kind: 'item', label: t('languageAuto'), checked: language === 'auto', onSelect: () => setLanguage('auto') },
    ...LANGUAGES.map((l): MenuItem => ({ kind: 'item', label: NATIVE_NAMES[l], checked: language === l, onSelect: () => setLanguage(l) })),
    { kind: 'separator' },
    { kind: 'heading', label: t('theme') },
    { kind: 'item', label: t('themeLight'), checked: theme === 'light', onSelect: () => setTheme('light') },
    { kind: 'item', label: t('themeDark'), checked: theme === 'dark', onSelect: () => setTheme('dark') },
    { kind: 'item', label: t('themeAuto'), checked: theme === 'auto', onSelect: () => setTheme('auto') },
    { kind: 'separator' },
    { kind: 'item', label: t('allSettings'), onSelect: () => setSection('settings') },
  ]
  const help: MenuItem[] = [{ kind: 'item', label: t('shortcutsTitle'), onSelect: onOpenShortcuts }]

  return (
    <header className="topbar">
      <div className="menubar" role="menubar" aria-label={t('menu')}>
        <MenuButton label={t('menu_file')} items={file} />
        <MenuButton label={t('menu_view')} items={view} />
        <MenuButton label={t('menu_help')} items={help} />
      </div>

      <button className="palette-trigger" onClick={onOpenPalette}>
        <Icon name="search" size={16} />
        <span>{t('paletteHint')}</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div
        className="status-pill small"
        title={`${t('today')} ${formatMinutes(minutesOnDay(data, dayKey(clock)))} · ${t('thisWeek')} ${formatMinutes(minutesThisWeek(data, clock))} · ${t('overall')} ${total.pct}%`}
      >
        <span className="muted">{t('today')}</span> <strong>{formatMinutes(minutesOnDay(data, dayKey(clock)))}</strong>
        <span className="status-sep" aria-hidden="true" />
        <span className="muted hide-narrow">{t('thisWeek')}</span> <strong className="hide-narrow">{formatMinutes(minutesThisWeek(data, clock))}</strong>
        {project && current && (
          <>
            <span className="status-sep" aria-hidden="true" />
            <span className="status-progress" aria-label={project.name}>
              <ProgressBar pct={current.pct} color={project.color} label={project.name} thin />
              <strong>{current.pct}%</strong>
            </span>
          </>
        )}
      </div>
      <div className="topbar-actions">
        <button className="icon-button" onClick={onOpenAi} aria-label={t('ai')} title={t('ai')}><Icon name="spark" /></button>
        <button className="icon-button" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={t('themeToggle')} title={t('themeToggle')}>
          <Icon name={dark ? 'sun' : 'moon'} />
        </button>
        <MenuButton label={t('settingsGear')} icon={<Icon name="settings" />} items={settingsMenu} />
      </div>
    </header>
  )
}
