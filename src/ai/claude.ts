import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'
import { isHttpUrl } from '../model/schema'
import { IS_DESKTOP } from '../platform'

/**
 * Claude via the Messages API. The request is sent by the Rust side, which adds the API key from the
 * OS credential store, so the key never passes through this code.
 */

export const CLAUDE_MODELS = [
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 — balanced' },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 — most capable' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 — fast and cheap' },
] as const

export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-5-5'

export interface Source {
  title: string
  url: string
}

export interface ClaudeResult {
  text: string
  sources: Source[]
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export class ClaudeError extends Error {}

/** Haiku only has the basic web search; the newer models use the variant with dynamic filtering. */
export const webSearchTool = (model: string) => ({
  type: model.includes('haiku') ? 'web_search_20250305' : 'web_search_20260209',
  name: 'web_search',
  max_uses: 5,
})

type Message = { role: 'user' | 'assistant'; content: unknown }

export function buildRequest(opts: {
  model: string
  system: string
  messages: Message[]
  webSearch: boolean
  maxTokens?: number
  /** Long, unchanging instructions sent first and cached (APP_GUIDE). */
  guide?: string
}) {
  return {
    model: opts.model,
    max_tokens: opts.maxTokens ?? 6000,
    // The guide is identical on every request, so it is cached; the task-specific part follows it.
    system: opts.guide
      ? [
          { type: 'text', text: opts.guide, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: opts.system },
        ]
      : opts.system,
    messages: opts.messages,
    // No temperature/top_p: the 5.x models reject non-default sampling values.
    output_config: { effort: 'medium' },
    ...(opts.webSearch ? { tools: [webSearchTool(opts.model)] } : {}),
  }
}

const Block = z.object({ type: z.string() }).passthrough()
const ApiResponse = z
  .object({
    content: z.array(Block),
    stop_reason: z.string().nullable().optional(),
    model: z.string().optional(),
    usage: z
      .object({
        input_tokens: z.number(),
        output_tokens: z.number(),
        cache_read_input_tokens: z.number().nullish(),
        cache_creation_input_tokens: z.number().nullish(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

const Citation = z.object({ url: z.string(), title: z.string().nullish() }).passthrough()
const SearchResult = z.object({ type: z.literal('web_search_result'), url: z.string(), title: z.string().nullish() }).passthrough()

export interface Parsed extends ClaudeResult {
  stopReason: string | null
  blocks: z.infer<typeof Block>[]
}

/** Pulls text and sources out of a raw Messages API response. Unknown block types are ignored. */
export function parseResponse(raw: unknown): Parsed {
  const res = ApiResponse.parse(raw)
  let text = ''
  const sources = new Map<string, Source>()
  const addSource = (url: string, title?: string | null) => {
    if (isHttpUrl(url) && !sources.has(url) && sources.size < 30) sources.set(url, { url, title: (title ?? '').slice(0, 300) })
  }
  for (const block of res.content) {
    if (block.type === 'text' && typeof block.text === 'string') {
      text += block.text
      for (const c of z.array(Citation).catch([]).parse(block.citations ?? [])) addSource(c.url, c.title)
    } else if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      // An error result carries an object instead of a list.
      for (const r of block.content) {
        const hit = SearchResult.safeParse(r)
        if (hit.success) addSource(hit.data.url, hit.data.title)
      }
    }
  }
  return {
    text: text.trim(),
    sources: [...sources.values()],
    model: res.model ?? '',
    inputTokens: res.usage?.input_tokens ?? 0,
    outputTokens: res.usage?.output_tokens ?? 0,
    cacheReadTokens: res.usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: res.usage?.cache_creation_input_tokens ?? 0,
    stopReason: res.stop_reason ?? null,
    blocks: res.content,
  }
}

/** The Rust side reports `HTTP <code>: <json body>`; show the API's own message when there is one. */
export function friendlyError(raw: unknown): string {
  const message = raw instanceof Error ? raw.message : String(raw)
  const json = message.slice(message.indexOf('{'))
  try {
    const parsed = z.object({ error: z.object({ message: z.string() }) }).parse(JSON.parse(json))
    return `${message.slice(0, message.indexOf(':'))}: ${parsed.error.message}`
  } catch {
    return message.slice(0, 300)
  }
}

export type Sender = (body: string) => Promise<string>
const sendViaTauri: Sender = (body) => invoke<string>('claude_request', { body })

const MAX_CONTINUATIONS = 3

export async function askClaude(
  opts: { model: string; system: string; user: string; webSearch: boolean; maxTokens?: number; guide?: string },
  send: Sender = sendViaTauri,
): Promise<ClaudeResult> {
  if (!IS_DESKTOP && send === sendViaTauri) throw new ClaudeError('Claude is only available in the desktop app.')
  const messages: Message[] = [{ role: 'user', content: opts.user }]
  let inputTokens = 0
  let outputTokens = 0
  let cacheReadTokens = 0
  let cacheWriteTokens = 0
  const sources = new Map<string, Source>()
  let text = ''
  for (let turn = 0; turn <= MAX_CONTINUATIONS; turn++) {
    let parsed: Parsed
    try {
      parsed = parseResponse(JSON.parse(await send(JSON.stringify(buildRequest({ ...opts, messages })))))
    } catch (e) {
      throw new ClaudeError(friendlyError(e))
    }
    inputTokens += parsed.inputTokens
    outputTokens += parsed.outputTokens
    cacheReadTokens += parsed.cacheReadTokens
    cacheWriteTokens += parsed.cacheWriteTokens
    for (const s of parsed.sources) sources.set(s.url, s)
    text += parsed.text
    if (parsed.stopReason === 'refusal') throw new ClaudeError('Claude declined this request.')
    if (parsed.stopReason !== 'pause_turn') {
      if (!text) throw new ClaudeError('Claude returned no text.')
      return { text, sources: [...sources.values()], model: parsed.model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }
    }
    // A long server-side search turn pauses; send it back unchanged so Claude can continue.
    messages.push({ role: 'assistant', content: parsed.blocks })
  }
  if (!text) throw new ClaudeError('Claude took too long.')
  return { text, sources: [...sources.values()], model: opts.model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }
}

// ---- key management (desktop only) ----------------------------------------

export const claudeHasKey = (): Promise<boolean> => (IS_DESKTOP ? invoke<boolean>('claude_has_key') : Promise.resolve(false))
export const claudeSetKey = (key: string): Promise<void> => invoke('claude_set_key', { key })
export const claudeClearKey = (): Promise<void> => invoke('claude_clear_key')

// ---- Claude Code (the user's subscription) ---------------------------------

export interface CliStatus {
  found: boolean
  path: string | null
  version: string | null
}

export const claudeCliStatus = (): Promise<CliStatus> =>
  IS_DESKTOP ? invoke<CliStatus>('claude_cli_status') : Promise.resolve({ found: false, path: null, version: null })

const CliResult = z
  .object({
    is_error: z.boolean().optional(),
    subtype: z.string().optional(),
    result: z.string().optional(),
    usage: z
      .object({
        input_tokens: z.number().nullish(),
        output_tokens: z.number().nullish(),
        cache_read_input_tokens: z.number().nullish(),
        cache_creation_input_tokens: z.number().nullish(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

/** Usage from Claude Code is recorded under this prefix: it runs on the subscription, so no dollar estimate. */
export const CLI_MODEL_PREFIX = 'claude-code/'

/** Reads the JSON that `claude -p --output-format json` prints. */
export function parseCliResult(raw: string, model: string): ClaudeResult {
  let parsed: z.infer<typeof CliResult>
  try {
    parsed = CliResult.parse(JSON.parse(raw))
  } catch {
    throw new ClaudeError(`Claude Code: ${raw.slice(0, 300)}`)
  }
  if (parsed.is_error || !parsed.result) throw new ClaudeError(`Claude Code: ${(parsed.result ?? parsed.subtype ?? 'error').slice(0, 300)}`)
  return {
    text: parsed.result.trim(),
    sources: [],
    model: `${CLI_MODEL_PREFIX}${model}`,
    inputTokens: parsed.usage?.input_tokens ?? 0,
    outputTokens: parsed.usage?.output_tokens ?? 0,
    cacheReadTokens: parsed.usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: parsed.usage?.cache_creation_input_tokens ?? 0,
  }
}

export type CliSender = (model: string, system: string, prompt: string) => Promise<string>
const sendViaCli: CliSender = (model, system, prompt) => invoke<string>('claude_cli_request', { model, system, prompt })

/** Same contract as `askClaude`, through Claude Code. Web search is not available this way. */
export async function askClaudeCli(
  opts: { model: string; system: string; user: string; guide?: string },
  send: CliSender = sendViaCli,
): Promise<ClaudeResult> {
  if (!IS_DESKTOP && send === sendViaCli) throw new ClaudeError('Claude is only available in the desktop app.')
  const system = opts.guide ? `${opts.guide}\n\n${opts.system}` : opts.system
  let raw: string
  try {
    raw = await send(opts.model, system, opts.user)
  } catch (e) {
    throw new ClaudeError(e instanceof Error ? e.message : String(e))
  }
  return parseCliResult(raw, opts.model)
}
