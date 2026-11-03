import { CHEATS, getCheat } from '../cheatsheet'
import type { Lang } from '../i18n/languages'
import { addGoal, addNote, addSteps, newId } from './ops'
import { tokens } from './classify'
import type { Cell, Column, Data } from './schema'
import { search } from './search'
import { projectIndex } from './searchDocs'
import { addTable, sanitizeCell, type ColumnSpec, type TemplateId } from './tables'

/**
 * The "smart" layer: reads what is there (Unity project scan, assets, notes, goals) and proposes
 * whole goals, tables and notes, plus small autofills while typing. Local only, nothing is sent.
 */

// ---- Unity project profile ---------------------------------------------------

export interface UnityScanInput {
  packages: string[]
  files: string[]
  todos: { file: string; line: number; text: string }[]
}

export interface UnityProfile {
  perspective: '2d' | '3d' | 'mixed' | 'unknown'
  pipeline: 'urp' | 'hdrp' | 'builtin'
  has: { inputSystem: boolean; cinemachine: boolean; tilemap: boolean; navigation: boolean; textMeshPro: boolean; animation: boolean }
  counts: { scripts: number; scenes: number; prefabs: number; sprites: number; models: number; audio: number; materials: number; animations: number }
  missingFolders: string[]
  scripts: { name: string; folder: string }[]
  scenes: string[]
  todos: UnityScanInput['todos']
}

const ext = (f: string) => f.slice(f.lastIndexOf('.') + 1).toLowerCase()
const base = (f: string) => f.slice(f.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '')
const dirOf = (f: string) => f.slice(0, f.lastIndexOf('/'))

const STANDARD_FOLDERS = ['Scripts', 'Scenes', 'Prefabs', 'Art', 'Audio', 'Materials']

export function profileUnity(scan: UnityScanInput): UnityProfile {
  const pkg = (id: string) => scan.packages.some((p) => p === id || p.startsWith(`${id}.`))
  const count = (exts: string[]) => scan.files.filter((f) => exts.includes(ext(f))).length
  const sprites = count(['png', 'psd', 'aseprite', 'jpg', 'tga'])
  const models = count(['fbx', 'obj', 'blend', 'glb', 'gltf'])
  const tilemapFiles = scan.files.filter((f) => /tile|palette/i.test(f)).length
  const twoD = pkg('com.unity.2d') || pkg('com.unity.feature.2d') || tilemapFiles > 0
  const threeD = models > 0 || pkg('com.unity.probuilder') || pkg('com.unity.ai.navigation')
  const topFolders = new Set(scan.files.map((f) => f.split('/')[1]?.toLowerCase()).filter(Boolean))
  const scripts = scan.files.filter((f) => ext(f) === 'cs')
  return {
    perspective: twoD && threeD ? 'mixed' : twoD ? '2d' : threeD ? '3d' : sprites > 0 ? '2d' : 'unknown',
    pipeline: pkg('com.unity.render-pipelines.universal') ? 'urp' : pkg('com.unity.render-pipelines.high-definition') ? 'hdrp' : 'builtin',
    has: {
      inputSystem: pkg('com.unity.inputsystem'),
      cinemachine: pkg('com.unity.cinemachine'),
      tilemap: pkg('com.unity.2d.tilemap') || tilemapFiles > 0,
      navigation: pkg('com.unity.ai.navigation'),
      textMeshPro: pkg('com.unity.textmeshpro') || pkg('com.unity.ugui'),
      animation: count(['anim', 'controller']) > 0,
    },
    counts: {
      scripts: scripts.length,
      scenes: count(['unity']),
      prefabs: count(['prefab']),
      sprites,
      models,
      audio: count(['wav', 'mp3', 'ogg', 'aiff', 'flac']),
      materials: count(['mat']),
      animations: count(['anim']),
    },
    missingFolders: STANDARD_FOLDERS.filter((f) => !topFolders.has(f.toLowerCase())),
    scripts: scripts.slice(0, 500).map((f) => ({ name: base(f), folder: dirOf(f) })),
    scenes: scan.files.filter((f) => ext(f) === 'unity').slice(0, 200).map(base),
    todos: scan.todos,
  }
}

// ---- proposals -----------------------------------------------------------------

export interface TableProposal {
  name: string
  columns: ColumnSpec[]
  rows: (string | number | boolean | null)[][]
}

export type SmartItem =
  | { id: string; kind: 'goal'; title: string; steps: string[]; reason: string }
  | { id: string; kind: 'table'; table: TableProposal; reason: string }
  | { id: string; kind: 'note'; text: string; reason: string }
  | { id: string; kind: 'cheats'; ids: string[]; reason: string }

/** Built-in cheat sheet entries that fit the detected project, most useful first. */
export function recommendedCheats(p: UnityProfile): string[] {
  const ids: string[] = []
  if (p.counts.scenes === 0) ids.push('start-project', 'start-gameobjects')
  if (!p.has.inputSystem) ids.push('input-setup')
  if (p.perspective === '2d' || p.perspective === 'mixed') ids.push('move-2d-platformer', '2d-tilemap', 'cam-2d', 'anim-2d-sprites')
  if (p.perspective === '3d' || p.perspective === 'mixed') ids.push('move-3d-third', 'cam-third', 'import-blender', 'anim-animator')
  if (!p.has.cinemachine) ids.push('cam-basics')
  if (p.counts.audio > 0) ids.push('audio-basics')
  if (p.counts.scripts > 10) ids.push('sys-scriptable', 'sys-gamemanager')
  if (p.counts.scenes > 0) ids.push('build-game')
  const known = new Set(CHEATS.map((c) => c.id))
  return [...new Set(ids)].filter((id) => known.has(id)).slice(0, 8)
}

/** Words used for the proposals; the UI passes them translated. */
export interface SmartTexts {
  folderGoal: string
  folderStep: (folder: string) => string
  inputGoal: string
  inputSteps: string[]
  scriptsTable: string
  scenesTable: string
  assetsTable: string
  colScript: string
  colFolder: string
  colScene: string
  colStatus: string
  colAsset: string
  colCategory: string
  colDone: string
  statuses: [string, string, string]
  todoNote: (file: string, items: string[]) => string
  reasons: { folders: string; input: string; scripts: string; scenes: string; assets: string; todo: string; cheats: string }
}

export function unityProposals(p: UnityProfile, tx: SmartTexts): SmartItem[] {
  const out: SmartItem[] = []
  const [todo, wip] = tx.statuses
  if (p.missingFolders.length >= 2)
    out.push({ id: 'smart:folders', kind: 'goal', title: tx.folderGoal, steps: p.missingFolders.map(tx.folderStep), reason: tx.reasons.folders })
  if (!p.has.inputSystem) out.push({ id: 'smart:input', kind: 'goal', title: tx.inputGoal, steps: tx.inputSteps, reason: tx.reasons.input })
  if (p.scripts.length >= 3)
    out.push({
      id: 'smart:table:scripts',
      kind: 'table',
      reason: tx.reasons.scripts,
      table: {
        name: tx.scriptsTable,
        columns: [{ name: tx.colScript, type: 'text' }, { name: tx.colFolder, type: 'text' }, { name: tx.colStatus, type: 'select', options: [...tx.statuses] }],
        rows: p.scripts.slice(0, 300).map((s) => [s.name, s.folder.replace(/^Assets\/?/, ''), wip]),
      },
    })
  if (p.scenes.length >= 2)
    out.push({
      id: 'smart:table:scenes',
      kind: 'table',
      reason: tx.reasons.scenes,
      table: {
        name: tx.scenesTable,
        columns: [{ name: tx.colScene, type: 'text' }, { name: tx.colStatus, type: 'select', options: [...tx.statuses] }, { name: tx.colDone, type: 'progress' }],
        rows: p.scenes.map((s) => [s, todo, 0]),
      },
    })
  const byFile = new Map<string, string[]>()
  for (const t of p.todos) byFile.set(t.file, [...(byFile.get(t.file) ?? []), t.text])
  for (const [file, items] of [...byFile].slice(0, 10))
    out.push({ id: `smart:todo:${file}:${items.length}`, kind: 'note', text: tx.todoNote(base(file), items.slice(0, 20)), reason: tx.reasons.todo })
  const cheats = recommendedCheats(p)
  if (cheats.length) out.push({ id: `smart:cheats:${cheats.join(',')}`, kind: 'cheats', ids: cheats, reason: tx.reasons.cheats })
  return out
}

/** Proposals from the project itself, without Unity. */
export function dataProposals(data: Data, projectId: string, tx: SmartTexts): SmartItem[] {
  const out: SmartItem[] = []
  const assets = data.assets.filter((a) => a.projectId === projectId && a.kind !== 'link')
  const hasAssetTable = data.tables.some((t) => t.projectId === projectId && t.name === tx.assetsTable)
  if (assets.length >= 5 && !hasAssetTable)
    out.push({
      id: `smart:table:assets:${Math.floor(assets.length / 10)}`,
      kind: 'table',
      reason: tx.reasons.assets,
      table: {
        name: tx.assetsTable,
        columns: [{ name: tx.colAsset, type: 'text' }, { name: tx.colCategory, type: 'text' }, { name: tx.colStatus, type: 'select', options: [...tx.statuses] }],
        rows: assets.slice(0, 500).map((a) => [a.name, a.category, tx.statuses[1]]),
      },
    })
  return out
}

/** Applies one proposal to the data. */
export function applySmart(data: Data, projectId: string, item: SmartItem, lang: Lang): Data {
  switch (item.kind) {
    case 'goal': {
      const d = addGoal(data, projectId, item.title)
      return addSteps(d, d.goals[d.goals.length - 1].id, item.steps)
    }
    case 'note':
      return addNote(data, projectId, item.text, null)
    case 'table':
      return createTable(data, projectId, item.table)
    case 'cheats': {
      const d = addGoal(data, projectId, item.reason)
      const titles = item.ids.map((id) => getCheat(id, lang)?.title ?? id)
      return addSteps(d, d.goals[d.goals.length - 1].id, titles)
    }
  }
}

export function createTable(data: Data, projectId: string, t: TableProposal): Data {
  const r = addTable(data, projectId, t.name)
  const columns: Column[] = t.columns.slice(0, 30).map((c) => ({ id: newId(), name: c.name.slice(0, 60), type: c.type, options: (c.options ?? []).slice(0, 30) }))
  const rows = t.rows.slice(0, 2000).map((values) => ({ id: newId(), cells: Object.fromEntries(columns.map((c, i) => [c.id, sanitizeCell(c, values[i]) as Cell])) }))
  return { ...r.data, tables: r.data.tables.map((x) => (x.id === r.table.id ? { ...x, columns, rows } : x)) }
}

// ---- autofill while typing ------------------------------------------------------

/** Steps for a new goal, taken from the best matching cheat sheet entry (if it matches well). */
export function suggestSteps(data: Data, projectId: string, goalTitle: string, lang: Lang): { cheatId: string; title: string; steps: string[] } | null {
  if (tokens(goalTitle).length === 0) return null
  const hit = search(projectIndex(data, projectId), goalTitle, 1, ['cheat'])[0]
  if (!hit || hit.score < 2.5) return null
  const cheat = getCheat(hit.doc.id, lang)
  if (!cheat) return null
  return { cheatId: cheat.id, title: cheat.title, steps: cheat.steps.slice(0, 12).map((s) => s.slice(0, 300)) }
}

const TABLE_WORDS: [TemplateId, string[]][] = [
  ['tasks', ['bug', 'bugs', 'task', 'tasks', 'todo', 'aufgabe', 'aufgaben', 'fehler', 'compito', 'tarea', 'tareas', 'задачи', 'баги', '任务', '错误', 'タスク', 'バグ']],
  ['characters', ['character', 'characters', 'charakter', 'charaktere', 'figuren', 'npc', 'enemies', 'gegner', 'personaggi', 'personajes', 'персонажи', '角色', 'キャラクター']],
  ['levels', ['level', 'levels', 'stage', 'stages', 'welt', 'world', 'livelli', 'niveles', 'уровни', '关卡', 'ステージ']],
  ['assets', ['asset', 'assets', 'sprite', 'sprites', 'art', 'grafik', 'modelle', 'models', 'sounds', 'audio', 'risorse', 'recursos', 'ассеты', '素材', 'アセット']],
]

/** A table template that fits the name the user is typing, if any. */
export function suggestTableTemplate(name: string): TemplateId | null {
  const words = tokens(name)
  for (const [id, keys] of TABLE_WORDS) if (words.some((w) => keys.includes(w)) || keys.some((k) => name.toLowerCase().includes(k) && k.length > 3)) return id
  return null
}

const TAG_WORDS: Record<string, string[]> = {
  bug: ['bug', 'fehler', 'error', 'crash', 'absturz', 'broken', 'kaputt', 'errore', 'ошибка', '错误', 'バグ'],
  idea: ['idee', 'idea', 'maybe', 'vielleicht', 'könnte', 'could', 'idée', 'идея', '想法', 'アイデア'],
  art: ['sprite', 'art', 'farbe', 'color', 'grafik', 'zeichnen', 'draw', 'krita', 'concept'],
  audio: ['sound', 'musik', 'music', 'sfx', 'audio', 'ton'],
  level: ['level', 'map', 'karte', 'raum', 'room', 'tilemap'],
  ui: ['ui', 'menü', 'menu', 'hud', 'button', 'knopf'],
  todo: ['todo', 'muss', 'must', 'noch', 'later', 'später'],
}

/** Tags for a note: existing project tags that appear in the text, plus a few common topics. */
export function suggestTags(data: Data, projectId: string, text: string): string[] {
  const words = new Set(tokens(text))
  const already = new Set([...text.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((m) => m[1].toLowerCase()))
  const known = new Set(data.notes.filter((n) => n.projectId === projectId).flatMap((n) => n.tags))
  const out: string[] = []
  for (const tag of known) if (words.has(tag) && !already.has(tag)) out.push(tag)
  for (const [tag, keys] of Object.entries(TAG_WORDS)) if (!already.has(tag) && !out.includes(tag) && keys.some((k) => words.has(k))) out.push(tag)
  return out.slice(0, 5)
}
