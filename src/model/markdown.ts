import type { Data } from './schema'
import { pageToMarkdown } from './pages'
import { goalProgress, projectProgress } from './progress'
import { tableToMarkdown } from './tables'
import { dayKey, dayOf, formatMinutes, startOfWeek } from './time'

/** Plain-Markdown snapshot of a project, handy for Claude Code, Obsidian or a devlog. */
export function projectToMarkdown(data: Data, projectId: string): string {
  const project = data.projects.find((p) => p.id === projectId)
  if (!project) return ''
  const p = projectProgress(data, projectId)
  const lines: string[] = [`# ${project.name}`, '', `Progress: ${p.done}/${p.total} steps (${p.pct}%)`, '']

  lines.push('## Goals', '')
  for (const goal of data.goals.filter((g) => g.projectId === projectId && !g.archived)) {
    const gp = goalProgress(goal)
    lines.push(`### ${goal.title} (${gp.pct}%)${goal.deadline ? ` — due ${goal.deadline}` : ''}`)
    for (const s of goal.steps) lines.push(`- [${s.done ? 'x' : ' '}] ${s.title}`)
    lines.push('')
  }

  lines.push('## Assets', '', '| Category | Name | Tags | Path |', '|---|---|---|---|')
  for (const a of data.assets.filter((x) => x.projectId === projectId)) {
    const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
    lines.push(`| ${a.category} | ${cell(a.name)} | ${a.tags.map((t) => `#${t}`).join(' ')} | ${cell(a.path ?? '(browser demo)')} |`)
  }

  lines.push('', '## Notes', '')
  for (const n of data.notes.filter((x) => x.projectId === projectId)) {
    lines.push(`- ${n.createdAt.slice(0, 10)}: ${n.text.replace(/\r?\n/g, ' ')}`)
  }

  const pages = data.pages.filter((x) => x.projectId === projectId)
  if (pages.length) {
    lines.push('', '## Pages', '')
    for (const page of pages) lines.push(pageToMarkdown(page, data), '')
  }
  const tables = data.tables.filter((x) => x.projectId === projectId)
  if (tables.length) {
    lines.push('', '## Tables', '')
    for (const table of tables) lines.push(tableToMarkdown(table), '')
  }
  return lines.join('\n').trimEnd() + '\n'
}

/** Devlog-style summary of the week (Monday to Sunday) containing `now`. */
export function weekToMarkdown(data: Data, projectId: string, now: Date = new Date()): string {
  const project = data.projects.find((p) => p.id === projectId)
  if (!project) return ''
  const from = startOfWeek(now)
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7)
  const inWeek = (iso: string) => {
    const t = new Date(iso).getTime()
    return t >= from.getTime() && t < to.getTime()
  }
  const lines: string[] = [`# ${project.name} — week of ${dayKey(from)}`, '']

  const sessions = data.sessions.filter((s) => s.projectId === projectId && inWeek(s.start))
  const total = sessions.reduce((sum, s) => sum + s.minutes, 0)
  lines.push(`## Time (${formatMinutes(total)})`, '')
  const byDay = new Map<string, number>()
  for (const s of sessions) byDay.set(dayOf(s.start), (byDay.get(dayOf(s.start)) ?? 0) + s.minutes)
  for (const [day, minutes] of [...byDay].sort()) lines.push(`- ${day}: ${formatMinutes(minutes)}`)
  if (byDay.size === 0) lines.push('- –')

  lines.push('', '## Completed steps', '')
  let steps = 0
  for (const goal of data.goals.filter((g) => g.projectId === projectId)) {
    for (const s of goal.steps) {
      if (s.done && s.doneAt && inWeek(s.doneAt)) {
        lines.push(`- [x] ${s.title} (${goal.title})`)
        steps++
      }
    }
  }
  if (steps === 0) lines.push('- –')

  lines.push('', '## Notes', '')
  const notes = data.notes.filter((n) => n.projectId === projectId && inWeek(n.createdAt))
  for (const n of notes) lines.push(`- ${dayOf(n.createdAt)}: ${n.text.replace(/\r?\n/g, ' ')}`)
  if (notes.length === 0) lines.push('- –')
  return lines.join('\n') + '\n'
}
