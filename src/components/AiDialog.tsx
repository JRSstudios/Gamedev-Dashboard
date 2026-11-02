import { useState } from 'react'
import {
  detectServers,
  pullModel,
  suggestAssets,
  suggestNoteTags,
  type AssetSuggestion,
  type DetectedServer,
  type NoteSuggestion,
} from '../ai/client'
import recommended from '../ai/recommended-models.json'
import { useT } from '../i18n'
import { setNoteTags, updateAsset, updateSettings } from '../model/ops'
import { mutate, notify, useStore } from '../store'
import { ProgressBar } from './ProgressBar'

type Suggestions =
  | { kind: 'assets'; items: AssetSuggestion[] }
  | { kind: 'notes'; items: NoteSuggestion[] }

export function AiDialog({ projectId, onClose }: { projectId: string | null; onClose: () => void }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const ai = data.settings.ai
  const [servers, setServers] = useState<DetectedServer[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [custom, setCustom] = useState('')
  const [chosen, setChosen] = useState<{ server: DetectedServer; model: string } | null>(null)
  const [pull, setPull] = useState<{ name: string; pct: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())

  const fail = (e: unknown) => notify(t('aiFailed', { reason: e instanceof Error ? e.message : String(e) }))

  const scan = async () => {
    setScanning(true)
    try {
      const found = await detectServers(custom || undefined)
      setServers(found)
      if (found[0]) setChosen({ server: found[0], model: found[0].models[0] ?? '' })
    } catch (e) {
      fail(e)
      setServers([])
    } finally {
      setScanning(false)
    }
  }

  const download = async (server: DetectedServer, name: string) => {
    setPull({ name, pct: 0 })
    try {
      await pullModel(server.baseUrl, name, (pct) => setPull({ name, pct }))
      await scan()
    } catch (e) {
      fail(e)
    } finally {
      setPull(null)
    }
  }

  const run = async (kind: Suggestions['kind']) => {
    setBusy(true)
    setSkipped(new Set())
    try {
      if (kind === 'assets') {
        const items = await suggestAssets(ai, data.assets.filter((a) => a.projectId === projectId))
        setSuggestions({ kind, items })
      } else {
        const items = await suggestNoteTags(ai, data.notes.filter((n) => n.projectId === projectId))
        setSuggestions({ kind, items })
      }
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const apply = () => {
    if (!suggestions) return
    mutate((d) => {
      let next = d
      if (suggestions.kind === 'assets') {
        for (const s of suggestions.items) {
          if (!skipped.has(s.id)) next = updateAsset(next, s.id, { category: s.category, tags: s.tags })
        }
      } else {
        for (const s of suggestions.items) if (!skipped.has(s.id)) next = setNoteTags(next, s.id, s.tags)
      }
      return next
    })
    setSuggestions(null)
  }

  const label = (id: string) =>
    data.assets.find((a) => a.id === id)?.name ?? data.notes.find((n) => n.id === id)?.text.slice(0, 60) ?? id

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('ai')} onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>🤖 {t('ai')}</h2>
          <button onClick={onClose}>{t('close')}</button>
        </div>
        <p className="muted small">{t('aiIntro')}</p>

        {ai.enabled ? (
          <>
            <p><strong>{t('aiConnected', { model: ai.model })}</strong> <span className="muted small">{ai.baseUrl}</span></p>
            {projectId && !suggestions && (
              <div className="stack">
                <button className="primary" disabled={busy} onClick={() => void run('assets')}>{busy ? t('aiWorking') : t('aiSortAssets')}</button>
                <button disabled={busy} onClick={() => void run('notes')}>{t('aiTagNotes')}</button>
              </div>
            )}
            {suggestions && (
              <div className="suggest">
                <h3>{t('aiReview')}</h3>
                {suggestions.items.length === 0 && <p className="muted">{t('aiNothing')}</p>}
                <ul className="check-list">
                  {suggestions.items.map((s) => (
                    <li key={s.id}>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={!skipped.has(s.id)}
                          onChange={(e) => {
                            const next = new Set(skipped)
                            if (e.target.checked) next.delete(s.id)
                            else next.add(s.id)
                            setSkipped(next)
                          }}
                        />
                        <span>
                          {label(s.id)} → {'category' in s && <strong>{t(`cat_${s.category}`)} </strong>}
                          {s.tags.map((x) => `#${x}`).join(' ')}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <button className="primary" disabled={suggestions.items.length === 0} onClick={apply}>{t('aiApply')}</button>
                <button onClick={() => setSuggestions(null)}>{t('cancel')}</button>
              </div>
            )}
            <button className="link danger" onClick={() => mutate((d) => updateSettings(d, { ai: { enabled: false, baseUrl: '', model: '' } }))}>
              {t('aiDisable')}
            </button>
          </>
        ) : (
          <>
            <div className="stack">
              <input value={custom} placeholder={`${t('aiUrl')} (optional)`} onChange={(e) => setCustom(e.target.value)} />
              <button className="primary" disabled={scanning} onClick={() => void scan()}>
                {scanning ? t('aiScanning') : servers ? t('aiRecheck') : t('aiConnect')}
              </button>
            </div>
            {servers?.length === 0 && <p className="warn">{t('aiNotFound')}</p>}
            {servers && servers.length > 0 && chosen && (
              <div className="stack">
                {servers.length > 1 && (
                  <select
                    value={chosen.server.baseUrl}
                    onChange={(e) => {
                      const server = servers.find((s) => s.baseUrl === e.target.value) ?? servers[0]
                      setChosen({ server, model: server.models[0] ?? '' })
                    }}
                  >
                    {servers.map((s) => <option key={s.baseUrl} value={s.baseUrl}>{s.kind} — {s.baseUrl}</option>)}
                  </select>
                )}
                {chosen.server.models.length > 0 ? (
                  <label>
                    {t('aiModel')}
                    <select value={chosen.model} onChange={(e) => setChosen({ ...chosen, model: e.target.value })}>
                      {chosen.server.models.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </label>
                ) : chosen.server.kind === 'ollama' ? (
                  <div className="stack">
                    <p>{t('aiNoModels')}</p>
                    {recommended.map((m) => (
                      <button key={m.name} disabled={pull !== null} title={`${m.note} · RAM ${m.ram}`} onClick={() => void download(chosen.server, m.name)}>
                        {t('aiPull', { name: m.name, size: m.size })}
                      </button>
                    ))}
                    {pull && (
                      <>
                        <p className="small">{t('aiPulling', { pct: pull.pct })}</p>
                        <ProgressBar pct={pull.pct} label={pull.name} />
                      </>
                    )}
                  </div>
                ) : null}
                <button
                  className="primary"
                  disabled={!chosen.model}
                  onClick={() => mutate((d) => updateSettings(d, { ai: { enabled: true, baseUrl: chosen.server.baseUrl, model: chosen.model } }))}
                >
                  {t('aiEnable')}
                </button>
              </div>
            )}
          </>
        )}
        <p className="muted small">{t('aiClaudeCode')}</p>
      </div>
    </div>
  )
}
