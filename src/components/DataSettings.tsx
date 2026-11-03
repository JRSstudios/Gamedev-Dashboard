import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { importNotes, MAX_IMPORT_BYTES, MAX_IMPORT_FILES, type ImportFile } from '../model/importMd'
import { updateSettings } from '../model/ops'
import { confirmDialog, IS_DESKTOP, listSnapshots, pickFolder, readSnapshot, snapshotNow, type SnapshotInfo } from '../platform'
import { getActiveProjectId, mutate, notify, replaceData, setSection, undo, useStore } from '../store'
import { dayKey } from '../model/time'

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Reads picked files as text; folders keep their relative paths (webkitRelativePath). */
async function readFiles(list: FileList | null): Promise<ImportFile[]> {
  const files = [...(list ?? [])].filter((f) => /\.(md|markdown|txt|csv)$/i.test(f.name) && f.size <= MAX_IMPORT_BYTES).slice(0, MAX_IMPORT_FILES)
  return Promise.all(files.map(async (f) => ({ path: f.webkitRelativePath || f.name, text: await f.text() })))
}

function ImportNotes() {
  const t = useT()
  const folder = useRef<HTMLInputElement>(null)
  const single = useRef<HTMLInputElement>(null)
  useEffect(() => {
    // Not in React's input props: lets the file dialog pick a whole folder (Obsidian vault, Notion export).
    folder.current?.setAttribute('webkitdirectory', '')
  }, [])
  const run = async (list: FileList | null) => {
    const projectId = getActiveProjectId()
    if (!projectId) return
    const files = await readFiles(list)
    if (!files.length) return notify(t('importNone'))
    let counts = { pages: 0, tables: 0 }
    mutate((d) => {
      const r = importNotes(d, projectId, files)
      counts = r
      return r.data
    })
    notify(t('importDone', { pages: counts.pages, tables: counts.tables }), { label: t('nav_pages'), run: () => setSection('pages') })
  }
  return (
    <section className="panel">
      <h2>{t('importTitle')}</h2>
      <p className="small muted">{t('importHint')}</p>
      <div className="row">
        <button onClick={() => folder.current?.click()}>{t('importFolder')}</button>
        <button onClick={() => single.current?.click()}>{t('importFiles')}</button>
      </div>
      <p className="small muted">{t('importOneNote')}</p>
      <input ref={folder} type="file" multiple hidden onChange={(e) => void run(e.target.files).finally(() => (e.target.value = ''))} />
      <input ref={single} type="file" multiple accept=".md,.markdown,.txt,.csv" hidden onChange={(e) => void run(e.target.files).finally(() => (e.target.value = ''))} />
    </section>
  )
}

function Snapshots() {
  const t = useT()
  const backupDir = useStore((s) => s.data.settings.backupDir)
  const [list, setList] = useState<SnapshotInfo[] | null>(null)
  const refresh = () => void listSnapshots().then(setList).catch(() => setList([]))
  useEffect(refresh, [])

  const restore = async (date: string) => {
    if (!(await confirmDialog(t('snapRestoreConfirm', { date })))) return
    try {
      replaceData(await readSnapshot(date))
      notify(t('snapRestored', { date }), { label: t('undo'), run: () => void undo() })
    } catch (e) {
      notify(t('importFailed', { reason: errorText(e) }))
    }
  }
  const chooseBackup = async () => {
    const dir = await pickFolder()
    if (!dir) return
    mutate((d) => updateSettings(d, { backupDir: dir }))
    try {
      await snapshotNow(dayKey(new Date()), dir)
      notify(t('snapBackupDone'))
    } catch (e) {
      notify(t('aiFailed', { reason: errorText(e) }))
    }
  }

  return (
    <section className="panel">
      <h2>{t('snapTitle')}</h2>
      <p className="small muted">{t('snapHint')}</p>
      {list && list.length === 0 && <p className="small muted">{t('snapNone')}</p>}
      <ul className="plain recent-list">
        {(list ?? []).map((s) => (
          <li key={s.date}>
            <span>{s.date} <span className="small muted">· {Math.max(1, Math.round(s.size / 1024))} KB</span></span>
            <button className="link" onClick={() => void restore(s.date)}>{t('snapRestore')}</button>
          </li>
        ))}
      </ul>
      <h3>{t('snapBackup')}</h3>
      <p className="small muted">{backupDir ?? t('snapBackupNone')}</p>
      <div className="row">
        <button onClick={() => void chooseBackup()}>{backupDir ? t('snapBackupChange') : t('snapBackupChoose')}</button>
        {backupDir && <button className="link" onClick={() => mutate((d) => updateSettings(d, { backupDir: null }))}>{t('snapBackupOff')}</button>}
      </div>
    </section>
  )
}

/** Settings → Data: snapshots, backup folder and importing notes from other tools. */
export function DataSettings() {
  const t = useT()
  return (
    <>
      <section className="panel">
        <h2>{t('settingsData')}</h2>
        <p className="muted small">{IS_DESKTOP ? t('dataDesktop') : t('dataBrowser')}</p>
        <p className="small">{t('dataExportHint')}</p>
        <p className="small muted">{t('undoHint')}</p>
      </section>
      {IS_DESKTOP && <Snapshots />}
      <ImportNotes />
    </>
  )
}
