import { goalProgress, projectProgress } from '../model/progress'
import type { Data } from '../model/schema'

/**
 * Text summary of a project that is sent to Claude. It contains titles, names and notes only:
 * never file contents and never file paths.
 */
export function buildProjectContext(data: Data, projectId: string, maxChars = 6000): string {
  const project = data.projects.find((p) => p.id === projectId)
  if (!project) return ''
  const prog = projectProgress(data, projectId)
  const lines: string[] = [`Project: ${project.name} (${prog.done}/${prog.total} steps done, ${prog.pct}%)`]

  const goals = data.goals.filter((g) => g.projectId === projectId && !g.archived)
  if (goals.length) {
    lines.push('', 'Goals:')
    for (const g of goals) {
      lines.push(`- ${g.title} (${goalProgress(g).pct}%${g.deadline ? `, due ${g.deadline}` : ''})`)
      for (const s of g.steps.slice(0, 12)) lines.push(`  [${s.done ? 'x' : ' '}] ${s.title}`)
    }
  }

  const assets = data.assets.filter((a) => a.projectId === projectId)
  if (assets.length) {
    lines.push('', 'Assets by category:')
    const byCategory = new Map<string, string[]>()
    for (const a of assets) byCategory.set(a.category, [...(byCategory.get(a.category) ?? []), a.name])
    for (const [category, names] of byCategory) {
      lines.push(`- ${category} (${names.length}): ${names.slice(0, 12).join(', ')}${names.length > 12 ? ', …' : ''}`)
    }
  }

  const research = data.research.filter((r) => r.projectId === projectId).slice(0, 8)
  if (research.length) {
    lines.push('', 'Existing research entries:', ...research.map((r) => `- ${r.title}`))
  }

  // Only names of pages and tables, never their contents.
  const pages = data.pages.filter((p) => p.projectId === projectId).slice(0, 15)
  if (pages.length) lines.push('', 'Pages:', ...pages.map((p) => `- ${p.title}`))
  const tables = data.tables.filter((x) => x.projectId === projectId).slice(0, 15)
  if (tables.length) lines.push('', 'Tables:', ...tables.map((x) => `- ${x.name} (${x.rows.length} rows; columns: ${x.columns.map((c) => c.name).join(', ')})`))

  const notes = data.notes.filter((n) => n.projectId === projectId).slice(0, 10)
  if (notes.length) {
    lines.push('', 'Recent notes:', ...notes.map((n) => `- ${n.text.replace(/\s+/g, ' ').slice(0, 200)}`))
  }

  const text = lines.join('\n')
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text
}
