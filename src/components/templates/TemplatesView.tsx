import { useState } from 'react'
import { sendJob } from '../../features/bridge'
import { useT } from '../../i18n'
import { addProject } from '../../model/ops'
import { CatalogSchema, exportTemplate, installTemplate, parseTemplate, templateSummary, uninstallTemplate, type Catalog, type Template } from '../../model/templates'
import { confirmDialog, IS_DESKTOP, openLink, pickTextFile, saveTextFile, templatesFetch, writeUnityScript } from '../../platform'
import { getData, mutate, notify, setActiveProject, useStore } from '../../store'
import { BUNDLED_TEMPLATES } from '../../templates/bundled'

const SUBMIT_URL = 'https://github.com/JRSstudios/Gamedev-Dashboard/tree/main/templates'
type Entry = { id: string; name: string; description: string; author: string; tags: string[]; perspective: Template['perspective']; source: 'bundled' | 'online' | 'file'; file?: string; template?: Template }

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Preview of everything a template creates, with the C# scripts readable before they go to Unity. */
function Preview({ tpl, projectId, onClose }: { tpl: Template; projectId: string; onClose: () => void }) {
  const t = useT()
  const unityDir = useStore((s) => s.data.projects.find((p) => p.id === projectId)?.integrations.unityDir ?? null)
  const [open, setOpen] = useState<string | null>(null)
  const sum = templateSummary(tpl)

  const install = (target: 'current' | 'new') => {
    let pid = projectId
    if (target === 'new') {
      const created = addProject(getData(), tpl.name)
      mutate(() => created.data)
      pid = created.project.id
    }
    const result = installTemplate(getData(), pid, tpl)
    mutate(() => result.data)
    if (target === 'new') setActiveProject(pid)
    notify(t('tplInstalled', { name: tpl.name }), { label: t('undo'), run: () => mutate((d) => uninstallTemplate(d, result.install.id)) })
    onClose()
  }
  const toUnity = async (file: string, text: string) => {
    if (!unityDir) return
    try {
      await writeUnityScript(unityDir, file, text)
      void sendJob('unity', { type: 'refresh' })
      notify(t('tplScriptCopied', { file }))
    } catch (e) {
      notify(errorText(e) === 'exists' ? t('tplScriptExists', { file }) : t('aiFailed', { reason: errorText(e) }))
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-label={tpl.name} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="panel-head">
          <h2>{tpl.name}</h2>
          <button onClick={onClose}>{t('close')}</button>
        </div>
        <p>{tpl.description}</p>
        <p className="small muted">
          {tpl.author && `${t('tplBy', { author: tpl.author })} · `}v{tpl.version}
          {tpl.languages.length > 0 && ` · ${tpl.languages.join(', ')}`}
        </p>
        <p className="small">{t('tplContains', sum)}</p>
        {tpl.contents.goals.length > 0 && (
          <>
            <h3>{t('nav_goals')}</h3>
            <ul className="small">
              {tpl.contents.goals.map((g, i) => (
                <li key={i}>
                  <strong>{g.title}</strong> <span className="muted">({g.steps.length}{g.estimateHours !== null ? ` · ${g.estimateHours} h` : ''})</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {(tpl.contents.pages.length > 0 || tpl.contents.tables.length > 0) && (
          <p className="small">
            {[...tpl.contents.pages.map((p) => `${p.icon} ${p.title}`), ...tpl.contents.tables.map((x) => `▦ ${x.name}`)].join(' · ')}
          </p>
        )}
        {tpl.contents.unityScripts.length > 0 && (
          <>
            <h3>{t('tplScripts')}</h3>
            <p className="small muted">{t('tplScriptsHint')}</p>
            <ul className="plain tpl-scripts">
              {tpl.contents.unityScripts.map((s) => (
                <li key={s.file}>
                  <div className="row-between">
                    <button className="link" onClick={() => setOpen(open === s.file ? null : s.file)}>{open === s.file ? '▾' : '▸'} {s.file}</button>
                    {IS_DESKTOP && (
                      <button className="link" disabled={!unityDir} title={unityDir ? '' : t('tplNeedUnity')} onClick={() => void toUnity(s.file, s.text)}>
                        {t('tplToUnity')}
                      </button>
                    )}
                  </div>
                  {open === s.file && <pre className="code small">{s.text}</pre>}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="row">
          <button className="primary" onClick={() => install('current')}>{t('tplInstallHere')}</button>
          <button onClick={() => install('new')}>{t('tplInstallNew')}</button>
        </div>
      </div>
    </div>
  )
}

function ExportDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const t = useT()
  const project = useStore((s) => s.data.projects.find((p) => p.id === projectId))
  const [choice, setChoice] = useState({ goals: true, pages: true, tables: true, budgets: true })
  const [meta, setMeta] = useState({ name: project?.name ?? '', description: '', author: '' })
  const save = async () => {
    const tpl = exportTemplate(getData(), projectId, choice, meta)
    await saveTextFile(`${tpl.id}.gdtemplate.json`, JSON.stringify(tpl, null, 2))
    onClose()
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('tplExport')} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <h2>{t('tplExport')}</h2>
        <p className="small muted">{t('tplExportHint')}</p>
        <label className="field">
          <span className="small muted">{t('tplName')}</span>
          <input value={meta.name} maxLength={100} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
        </label>
        <label className="field">
          <span className="small muted">{t('tplDescription')}</span>
          <textarea rows={3} value={meta.description} maxLength={1000} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
        </label>
        <label className="field">
          <span className="small muted">{t('tplAuthor')}</span>
          <input value={meta.author} maxLength={100} onChange={(e) => setMeta({ ...meta, author: e.target.value })} />
        </label>
        <div className="switches">
          {(['goals', 'pages', 'tables', 'budgets'] as const).map((k) => (
            <label key={k} className="check">
              <input type="checkbox" checked={choice[k]} onChange={(e) => setChoice({ ...choice, [k]: e.target.checked })} />
              {t(`tplPart_${k}`)}
            </label>
          ))}
        </div>
        <div className="row">
          <button className="primary" disabled={!meta.name.trim()} onClick={() => void save()}>{t('tplSave')}</button>
          <button onClick={onClose}>{t('cancel')}</button>
          <button className="link" onClick={() => void openLink(SUBMIT_URL)}>{t('tplSubmit')}</button>
        </div>
      </div>
    </div>
  )
}

/** Template gallery: bundled, online catalog and files; installed templates can be removed again. */
export function TemplatesView({ projectId }: { projectId: string }) {
  const t = useT()
  const allInstalls = useStore((s) => s.data.installs)
  const installs = allInstalls.filter((i) => i.projectId === projectId)
  const [online, setOnline] = useState<Catalog['templates'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [fromFile, setFromFile] = useState<Template[]>([])
  const [filter, setFilter] = useState<'all' | '2d' | '3d'>('all')
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<Template | null>(null)
  const [exporting, setExporting] = useState(false)

  const entries: Entry[] = [
    ...fromFile.map((x): Entry => ({ ...x, source: 'file', template: x })),
    ...BUNDLED_TEMPLATES.map((x): Entry => ({ ...x, source: 'bundled', template: x })),
    ...(online ?? []).filter((o) => !BUNDLED_TEMPLATES.some((b) => b.id === o.id)).map((o): Entry => ({ ...o, source: 'online', file: o.file })),
  ].filter((e) => (filter === 'all' || e.perspective === filter || e.perspective === 'any') && `${e.name} ${e.description} ${e.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))

  const loadCatalog = async () => {
    setLoading(true)
    try {
      setOnline(CatalogSchema.parse(JSON.parse(await templatesFetch('index.json'))).templates)
    } catch (e) {
      notify(t('tplCatalogFailed', { reason: errorText(e) }))
    }
    setLoading(false)
  }
  const open = async (e: Entry) => {
    try {
      setPreview(e.template ?? parseTemplate(await templatesFetch(e.file!)))
    } catch (err) {
      notify(t('tplInvalid', { reason: errorText(err) }))
    }
  }
  const importFile = async () => {
    const json = await pickTextFile('json')
    if (!json) return
    try {
      const tpl = parseTemplate(json)
      setFromFile((list) => [tpl, ...list.filter((x) => x.id !== tpl.id)])
      setPreview(tpl)
    } catch (e) {
      notify(t('tplInvalid', { reason: errorText(e).slice(0, 200) }))
    }
  }
  const remove = async (id: string, name: string) => {
    if (await confirmDialog(t('tplRemoveConfirm', { name }))) mutate((d) => uninstallTemplate(d, id))
  }

  return (
    <div className="templates-view">
      <div className="toolbar">
        <input type="search" placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('search')} />
        <div className="seg" role="group">
          {(['all', '2d', '3d'] as const).map((f) => (
            <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f === 'all' ? t('tplAll') : f.toUpperCase()}</button>
          ))}
        </div>
        {IS_DESKTOP && online === null && (
          <button disabled={loading} onClick={() => void loadCatalog()}>{loading ? t('loading') : t('tplLoadCatalog')}</button>
        )}
        <button onClick={() => void importFile()}>{t('tplImportFile')}</button>
        <button onClick={() => setExporting(true)}>{t('tplExport')}</button>
      </div>
      <p className="small muted">{t('tplSafety')}</p>

      <div className="tpl-grid">
        {entries.map((e) => (
          <button key={`${e.source}-${e.id}`} className="panel tpl-card" onClick={() => void open(e)}>
            <span className="row-between">
              <strong>{e.name}</strong>
              <span className="pill small">{e.perspective === 'any' ? t('tplAny') : e.perspective.toUpperCase()}</span>
            </span>
            <span className="small muted clamp">{e.description}</span>
            <span className="small muted">
              {t(`tplSource_${e.source}`)}
              {e.author && ` · ${e.author}`}
            </span>
          </button>
        ))}
        {entries.length === 0 && <p className="muted">{t('tplNone')}</p>}
      </div>

      {installs.length > 0 && (
        <section className="panel">
          <h2>{t('tplInstalledList')}</h2>
          <ul className="plain recent-list">
            {installs.map((i) => (
              <li key={i.id}>
                <span>{i.name} <span className="small muted">· {i.at.slice(0, 10)} · {t('tplItems', { n: i.created.length })}</span></span>
                <button className="link" onClick={() => void remove(i.id, i.name)}>{t('tplRemove')}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {preview && <Preview tpl={preview} projectId={projectId} onClose={() => setPreview(null)} />}
      {exporting && <ExportDialog projectId={projectId} onClose={() => setExporting(false)} />}
    </div>
  )
}
