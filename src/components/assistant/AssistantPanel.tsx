import { useEffect, useRef, useState } from 'react'
import { DesktopOnly } from '../DesktopOnly'
import { PlanSchema, validActions, type Action } from '../../ai/actions'
import { splitAnswer } from '../../ai/assistant'
import { buildProjectContext } from '../../ai/context'
import { claudeAvailable, LimitReachedError, runClaude } from '../../ai/run'
import { sendJob, useBridge } from '../../features/bridge'
import { ENGLISH_NAMES, resolveLanguage, useT } from '../../i18n'
import { newId } from '../../model/ops'
import type { Chat } from '../../model/schema'
import { IS_DESKTOP, writeUnityScript } from '../../platform'
import { getData, mutate, notify, setSection, useStore } from '../../store'
import { ActionsPreview } from '../brainstorm/ActionsPreview'
import type { CodeBlock } from '../../model/fences'
import { MarkdownText } from '../RichText'

const HISTORY = 12
const MAX_PER_PROJECT = 200

const TASK = `You are chatting with the user inside the dashboard. Answer in plain text with light Markdown
(short paragraphs, lists, **bold**, fenced code). C# scripts for Unity go into a \`\`\`csharp block with one
public class per block, named like the file. When the user asks you to create or change things in the app
(goals, pages, tables, notes, asset categories), add ONE fenced \`\`\`json block at the very end with
{"summary": "...", "actions": [...]} as described in the guide; the user reviews it before anything happens.`

function addChat(projectId: string, role: Chat['role'], text: string) {
  mutate((d) => {
    const mine = d.chats.filter((c) => c.projectId === projectId)
    const drop = new Set(mine.slice(0, Math.max(0, mine.length - MAX_PER_PROJECT + 1)).map((c) => c.id))
    return { ...d, chats: [...d.chats.filter((c) => !drop.has(c.id)), { id: newId(), projectId, role, text: text.slice(0, 40000), at: new Date().toISOString() }].slice(-5000) }
  })
}

function ScriptBlock({ block, unityDir }: { block: CodeBlock; unityDir: string | null }) {
  const t = useT()
  const cls = /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(block.code)?.[1]
  const toUnity = async () => {
    if (!unityDir || !cls) return
    try {
      await writeUnityScript(unityDir, `${cls}.cs`, block.code)
      void sendJob('unity', { type: 'refresh' })
      notify(t('tplScriptCopied', { file: `${cls}.cs` }))
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      notify(reason === 'exists' ? t('tplScriptExists', { file: `${cls}.cs` }) : t('aiFailed', { reason }))
    }
  }
  return (
    <div className="code-wrap">
      <pre className="code small">{block.code}</pre>
      <div className="row">
        <button className="link" onClick={() => void navigator.clipboard.writeText(block.code).then(() => notify(t('cheatCopied')))}>{t('copy')}</button>
        {IS_DESKTOP && (block.lang === 'csharp' || block.lang === 'cs' || block.lang === 'c#') && cls && (
          <button className="link" disabled={!unityDir} title={unityDir ? '' : t('tplNeedUnity')} onClick={() => void toUnity()}>{t('assistScriptToUnity', { file: `${cls}.cs` })}</button>
        )}
      </div>
    </div>
  )
}

/** Side panel chat with Claude that knows the project. Proposed changes are applied only after review. */
export function AssistantPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const t = useT()
  const chats = useStore((s) => s.data.chats)
  const unityDir = useStore((s) => s.data.projects.find((p) => p.id === projectId)?.integrations.unityDir ?? null)
  const logs = useBridge((s) => s.unityLogs)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState<boolean | null>(null)
  const [pending, setPending] = useState<{ chatId: string; actions: Action[] } | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const messages = chats.filter((c) => c.projectId === projectId)

  useEffect(() => {
    void claudeAvailable().then(setReady)
  }, [])
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight })
  }, [messages.length, busy])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || busy) return
    setInput('')
    addChat(projectId, 'user', question)
    setBusy(true)
    const data = getData()
    const errors = logs.filter((l) => l.level === 'error').slice(0, 5)
    const history = data.chats
      .filter((c) => c.projectId === projectId)
      .slice(-HISTORY)
      .map((c) => `${c.role === 'user' ? 'User' : 'Assistant'}: ${c.text.slice(0, 3000)}`)
      .join('\n\n')
    try {
      const result = await runClaude({
        command: 'assistant',
        maxTokens: 6000,
        system: `${TASK}\nAnswer in ${ENGLISH_NAMES[resolveLanguage(data.settings.language)]} unless the user writes in another language.`,
        user: [
          'Project context:',
          buildProjectContext(data, projectId),
          errors.length ? `\nCurrent Unity console errors:\n${errors.map((e) => `- ${e.message.slice(0, 300)}`).join('\n')}` : '',
          `\nConversation so far:\n${history}`,
        ].join('\n'),
      })
      const { text: answer, json } = splitAnswer(result.text)
      addChat(projectId, 'assistant', result.text)
      const plan = json ? PlanSchema.safeParse(json) : null
      const actions = plan?.success ? validActions(getData(), projectId, plan.data.actions) : []
      const last = getData().chats.filter((c) => c.projectId === projectId).pop()
      setPending(actions.length && last ? { chatId: last.id, actions } : null)
      if (!answer && !actions.length) notify(t('claudeBadJson'))
    } catch (e) {
      addChat(projectId, 'assistant', `⚠ ${e instanceof LimitReachedError ? t('claudeLimitReached') : e instanceof Error ? e.message : String(e)}`)
    }
    setBusy(false)
  }

  const clear = () => mutate((d) => ({ ...d, chats: d.chats.filter((c) => c.projectId !== projectId) }))
  const starters = [t('assistStart1'), t('assistStart2'), t('assistStart3')]

  return (
    <aside className="assistant" role="complementary" aria-label={t('assistant')} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="panel-head">
        <h2>✦ {t('assistant')}</h2>
        <div className="row">
          {messages.length > 0 && <button className="link" onClick={clear}>{t('assistClear')}</button>}
          <button onClick={onClose} aria-label={t('close')}>×</button>
        </div>
      </div>
      {ready === false && IS_DESKTOP && (
        <div className="callout small">
          {t('assistNotReady')} <button className="link" onClick={() => setSection('settings')}>{t('allSettings')}</button>
        </div>
      )}
      {!IS_DESKTOP && <DesktopOnly reason={t('claudeDesktopOnly')} />}
      <div className="assistant-log" ref={list}>
        {messages.length === 0 && (
          <div className="small muted">
            <p>{t('assistIntro')}</p>
            {starters.map((s) => (
              <button key={s} className="chip" disabled={!ready} onClick={() => void send(s)}>{s}</button>
            ))}
          </div>
        )}
        {messages.map((m) => {
          const body = m.role === 'assistant' ? splitAnswer(m.text).text : m.text
          return (
            <div key={m.id} className={`msg ${m.role}`}>
              {m.role === 'assistant' ? <MarkdownText text={body} renderCode={(b, i) => <ScriptBlock key={i} block={b} unityDir={unityDir} />} /> : <p>{body}</p>}
              {pending?.chatId === m.id && (
                <ActionsPreview projectId={projectId} actions={pending.actions} onApplied={() => setPending(null)} />
              )}
            </div>
          )
        })}
        {busy && <p className="muted small">{t('claudeWorking')}</p>}
      </div>
      <form
        className="assistant-input"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <label className="field">
          <span className="field-label">{t('assistPlaceholder')}</span>
          <textarea
            autoFocus
            rows={3}
            value={input}
            maxLength={4000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send(input)
              }
            }}
          />
        </label>
        <button className="primary" type="submit" disabled={!ready || busy || !input.trim()}>{t('assistSend')}</button>
      </form>
    </aside>
  )
}
