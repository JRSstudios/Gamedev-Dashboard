import type { Bug, Data } from '../model/schema'
import { newId } from '../model/ops'
import { IS_DESKTOP } from '../platform'

/**
 * Bug reports go to GitHub as a pre-filled issue that the user reviews and submits in the browser:
 * no token in the app. Everything personal is removed before it leaves the computer.
 */

export const ISSUES_URL = 'https://github.com/JRSstudios/Gamedev-Dashboard/issues/new'
/** GitHub rejects very long URLs; the body is cut to stay well below the limit. */
const MAX_BODY = 6000

export interface LoggedError {
  at: string
  message: string
  stack: string
}

const log: LoggedError[] = []
const listeners = new Set<(e: LoggedError) => void>()

/** Takes paths with user names, e-mail addresses and anything that looks like a key or token out. */
export function redact(text: string): string {
  return text
    .replace(/[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"'`]+/gi, '%USERPROFILE%')
    .replace(/\/(home|Users)\/[^/\s"'`]+/g, '~')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
    .replace(/sk-ant-[\w-]{6,}/g, '<api-key>')
    .replace(/\b(gh[pousr]_[A-Za-z0-9]{20,}|[A-Fa-f0-9]{40,})\b/g, '<token>')
}

export function recordError(message: string, stack = ''): LoggedError {
  const entry = { at: new Date().toISOString(), message: redact(message).slice(0, 1000), stack: redact(stack).slice(0, 4000) }
  log.push(entry)
  if (log.length > 30) log.shift()
  for (const l of listeners) l(entry)
  return entry
}

export const recentErrors = (): LoggedError[] => [...log]
export const onError = (fn: (e: LoggedError) => void): (() => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

let installed = false
/** Catches errors that no component handled (event handlers, promises). */
export function installErrorHandlers() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('error', (e) => recordError(e.message || String(e.error), e.error instanceof Error ? (e.error.stack ?? '') : ''))
  window.addEventListener('unhandledrejection', (e) => {
    const r: unknown = e.reason
    recordError(r instanceof Error ? r.message : String(r), r instanceof Error ? (r.stack ?? '') : '')
  })
}

export function systemInfo(data: Data, section: string): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const os = /Windows NT 10/.test(ua) ? 'Windows 10/11' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'other'
  return [
    `- Version: ${__APP_VERSION__} (${IS_DESKTOP ? 'desktop' : 'web'})`,
    `- OS: ${os}`,
    `- Language: ${data.settings.language}`,
    `- Section: ${section || '-'}`,
    `- Projects: ${data.projects.length}, assets: ${data.assets.length}, pages: ${data.pages.length}`,
  ].join('\n')
}

export function newBug(patch: Partial<Bug>): Bug {
  return {
    id: newId(),
    title: '',
    description: '',
    steps: '',
    expected: '',
    severity: 'medium',
    error: '',
    section: '',
    status: 'draft',
    auto: false,
    createdAt: new Date().toISOString(),
    ...patch,
  }
}

/** Markdown body of the GitHub issue. Only what the user wrote, the error and the system summary. */
export function issueBody(bug: Bug, info: string): string {
  const parts = [
    `**What happened**\n${bug.description || '-'}`,
    bug.steps && `**Steps to reproduce**\n${bug.steps}`,
    bug.expected && `**Expected**\n${bug.expected}`,
    `**Severity:** ${bug.severity}${bug.auto ? ' (reported after an error)' : ''}`,
    `**System**\n${info}`,
    bug.error && `**Error**\n\`\`\`\n${bug.error}\n\`\`\``,
  ].filter(Boolean)
  const body = redact(parts.join('\n\n'))
  return body.length > MAX_BODY ? `${body.slice(0, MAX_BODY)}\n\n…(cut)` : body
}

export function issueUrl(bug: Bug, info: string): string {
  const params = new URLSearchParams({ title: redact(bug.title || 'Bug report').slice(0, 200), body: issueBody(bug, info), labels: 'bug' })
  return `${ISSUES_URL}?${params.toString()}`
}
