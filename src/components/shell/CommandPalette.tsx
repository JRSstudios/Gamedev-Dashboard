import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../i18n'
import { parseSlash, type Preset } from '../../ai/prompts'
import { updateSettings } from '../../model/ops'
import { IS_DESKTOP } from '../../platform'
import { mutate, notify, openItem, SECTIONS, setActiveProject, setSection, useStore } from '../../store'
import { toggleTimer } from '../../timerActions'
import { sectionTitle } from '../../sections'

export interface PaletteCommand {
  id: string
  title: string
  hint?: string
  keywords?: string
  run: () => void
}

/** Ctrl+K palette. `extra` lets other features (AI quick commands) add entries. */
export function CommandPalette({
  onClose,
  onClaude,
  extra = [],
}: {
  onClose: () => void
  onClaude?: (preset: Preset, topic: string, autorun: boolean) => void
  extra?: PaletteCommand[]
}) {
  const t = useT()
  const data = useStore((s) => s.data)
  const projectId = useStore((s) => s.activeProjectId)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const list = useRef<HTMLUListElement>(null)

  const commands = useMemo<PaletteCommand[]>(() => {
    const nav = SECTIONS.map((s) => ({
      id: `go-${s}`,
      title: t('paletteGoTo', { name: sectionTitle(t, s) }),
      keywords: s,
      run: () => setSection(s),
    }))
    const items: PaletteCommand[] = [
      ...data.pages.filter((p) => p.projectId === projectId).map((p) => ({ id: `page-${p.id}`, title: t('paletteOpen', { name: p.title }), keywords: 'page seite', run: () => openItem('page', p.id) })),
      ...data.tables.filter((x) => x.projectId === projectId).map((x) => ({ id: `table-${x.id}`, title: t('paletteOpen', { name: x.name }), keywords: 'table tabelle', run: () => openItem('table', x.id) })),
    ]
    const projects = data.projects
      .filter((p) => !p.archived && p.id !== projectId)
      .map((p) => ({ id: `project-${p.id}`, title: t('paletteSwitch', { name: p.name }), keywords: p.name, run: () => setActiveProject(p.id) }))
    const misc: PaletteCommand[] = [
      {
        id: 'theme',
        title: t('themeToggle'),
        keywords: 'dark light theme',
        run: () => mutate((d) => updateSettings(d, { theme: d.settings.theme === 'dark' ? 'light' : 'dark' })),
      },
    ]
    if (projectId) {
      misc.push({
        id: 'timer',
        title: t('paletteTimer'),
        hint: 'Ctrl+T',
        keywords: 'timer pomodoro',
        run: () => {
          const saved = toggleTimer(projectId)
          if (saved) notify(t('timerSaved', { minutes: saved }))
        },
      })
    }
    const claude: PaletteCommand[] =
      IS_DESKTOP && onClaude && projectId
        ? [
            { id: 'claude-research', title: t('paletteClaudeResearch'), hint: '/research', keywords: 'claude ai recherche research', run: () => onClaude('research', '', false) },
            { id: 'claude-suggest', title: t('paletteClaudeSuggest'), hint: '/suggest', keywords: 'claude ai suggest vorschläge', run: () => onClaude('suggest', '', true) },
            { id: 'claude-unity', title: t('paletteClaudeUnity'), hint: '/unity', keywords: 'claude ai unity', run: () => onClaude('unity', '', false) },
          ]
        : []
    return [...extra, ...claude, ...misc, ...nav, ...items, ...projects]
  }, [data.projects, data.pages, data.tables, projectId, extra, onClaude, t])

  // "/research coyote time" becomes a ready-to-run command; everything else is a plain filter.
  const slash = onClaude && IS_DESKTOP && projectId ? parseSlash(query) : null
  const slashCommand: PaletteCommand[] = slash
    ? [
        {
          id: 'claude-slash',
          title: slash.topic ? t('paletteClaudeRun', { preset: t(`preset_${slash.preset}`), topic: slash.topic }) : t(`preset_${slash.preset}`),
          hint: '↵',
          run: () => onClaude?.(slash.preset, slash.topic, Boolean(slash.topic) || slash.preset === 'suggest'),
        },
      ]
    : []
  const shown = slash
    ? slashCommand
    : commands.filter((c) => `${c.title} ${c.keywords ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  const at = Math.min(index, Math.max(0, shown.length - 1))

  useEffect(() => {
    list.current?.children[at]?.scrollIntoView({ block: 'nearest' })
  }, [at])

  const run = (c: PaletteCommand | undefined) => {
    if (!c) return
    onClose()
    c.run()
  }

  return (
    <div className="modal-backdrop top" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label={t('palettePlaceholder')}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
          else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setIndex(Math.min(at + 1, shown.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setIndex(Math.max(at - 1, 0))
          } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            run(shown[at])
          }
        }}
      >
        <input
          autoFocus
          value={query}
          placeholder={t('palettePlaceholder')}
          aria-label={t('palettePlaceholder')}
          onChange={(e) => {
            setQuery(e.target.value)
            setIndex(0)
          }}
        />
        <ul ref={list} role="listbox">
          {shown.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === at} className={i === at ? 'on' : ''} onMouseMove={() => setIndex(i)} onClick={() => run(c)}>
              <span>{c.title}</span>
              {c.hint && <kbd>{c.hint}</kbd>}
            </li>
          ))}
          {shown.length === 0 && <li className="muted">{t('paletteEmpty')}</li>}
        </ul>
      </div>
    </div>
  )
}
