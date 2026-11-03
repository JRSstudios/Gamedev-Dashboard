import { addUsage, overMonthlyLimit } from '../model/usage'
import { getData, mutate } from '../store'
import { APP_GUIDE } from './appGuide'
import { askClaude, askClaudeCli, claudeCliStatus, claudeHasKey, ClaudeError, DEFAULT_CLAUDE_MODEL, type ClaudeResult, type Sender } from './claude'

export class LimitReachedError extends ClaudeError {}

/**
 * Every Claude request from the UI goes through here: it adds the app guide (cached), checks the
 * monthly limit and records token usage for the overview. Prompt text is never stored.
 */
export async function runClaude(
  opts: { command: string; system: string; user: string; webSearch?: boolean; maxTokens?: number; ignoreLimit?: boolean },
  send?: Sender,
): Promise<ClaudeResult> {
  const data = getData()
  if (!opts.ignoreLimit && overMonthlyLimit(data)) throw new LimitReachedError('limit')
  const model = data.settings.claude.model || DEFAULT_CLAUDE_MODEL
  const result =
    data.settings.claude.transport === 'cli' && !send
      ? await askClaudeCli({ model, system: opts.system, user: opts.user, guide: APP_GUIDE })
      : await askClaude({ model, system: opts.system, user: opts.user, webSearch: opts.webSearch ?? false, maxTokens: opts.maxTokens, guide: APP_GUIDE }, send)
  mutate((d) =>
    addUsage(d, {
      model: result.model || model,
      command: opts.command,
      input: result.inputTokens,
      output: result.outputTokens,
      cacheRead: result.cacheReadTokens,
      cacheWrite: result.cacheWriteTokens,
    }),
  )
  return result
}

/** Whether Claude can be used with the chosen connection: a saved key, or Claude Code installed. */
export const claudeAvailable = (): Promise<boolean> =>
  getData().settings.claude.transport === 'cli' ? claudeCliStatus().then((s) => s.found) : claudeHasKey()
