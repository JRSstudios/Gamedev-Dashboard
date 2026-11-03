import type { AssetCategory, AssetKind } from './schema'

/**
 * Local asset sorting without any AI: file type, words in the file and folder names (several
 * languages), optional media facts, and keywords learned from the user's own corrections.
 */

const KEYWORDS: Record<AssetCategory, string[]> = {
  music: ['music', 'musik', 'song', 'theme', 'bgm', 'ost', 'soundtrack', 'loop', 'ambient', 'track', 'melody', 'musica', 'música', 'musique', 'музыка', 'песня', '音楽', '曲', '音乐', '歌'],
  sfx: ['sfx', 'fx', 'sound', 'hit', 'jump', 'click', 'step', 'footstep', 'explosion', 'shot', 'impact', 'coin', 'pickup', 'whoosh', 'swing', 'hurt', 'death', 'door', 'ui', 'beep', 'efecto', 'sonido', 'suono', 'effetto', 'звук', 'эффект', '効果音', '音效'],
  concept: ['concept', 'konzept', 'sketch', 'skizze', 'design', 'character', 'char', 'paint', 'painting', 'illustration', 'sprite', 'sprites', 'tileset', 'tiles', 'boceto', 'bozzetto', 'concetto', 'эскиз', 'концепт', 'コンセプト', '原画', '概念', '草图', '立ち絵'],
  inspiration: ['inspo', 'inspiration', 'mood', 'moodboard', 'pinterest', 'idea', 'idee', 'ispirazione', 'inspiración', 'вдохновение', '参考図', '灵感'],
  reference: ['ref', 'reference', 'referenz', 'photo', 'foto', 'screenshot', 'screen', 'pose', 'anatomy', 'anatomie', 'riferimento', 'referencia', 'референс', '資料', '参考'],
  model: ['model', 'mesh', 'rig', 'lowpoly', 'highpoly', 'modell', 'modello', 'modelo', 'модель', 'モデル', '模型'],
  other: [],
}

/** Which categories make sense for a file type. */
const ALLOWED: Record<AssetKind, AssetCategory[]> = {
  audio: ['music', 'sfx'],
  image: ['concept', 'inspiration', 'reference'],
  model: ['model'],
  doc: ['reference', 'other'],
  link: ['inspiration', 'reference'],
  other: ['other'],
}

const PRIOR: Record<AssetKind, AssetCategory> = { audio: 'music', image: 'concept', model: 'model', doc: 'other', link: 'inspiration', other: 'other' }

const STOP = new Set(['the', 'and', 'der', 'die', 'das', 'und', 'final', 'new', 'neu', 'copy', 'kopie', 'export', 'assets', 'asset', 'files', 'users', 'desktop', 'documents', 'downloads', 'img', 'image', 'file', 'untitled', 'unbenannt'])

/** Lower-case words of a file name: camelCase, separators and digits split it. Extensions are dropped. */
export function tokens(name: string): string[] {
  const base = name.replace(/\.[a-z0-9]{1,8}$/i, '')
  const words = base
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((w) => (w.length >= 2 || w.charCodeAt(0) > 127) && !STOP.has(w))
  return [...new Set(words)]
}

export interface Facts {
  /** Audio length in seconds. */
  duration?: number
  width?: number
  height?: number
}

export interface Classification {
  category: AssetCategory
  /** 0..1 */
  confidence: number
  /** Word that decided it, if any. */
  reason: string | null
}

/**
 * Suggests a category for a file. `path` may be empty; the last folders count as weaker hints.
 */
export function classify(name: string, kind: AssetKind, path = '', learned: Record<string, AssetCategory> = {}, facts: Facts = {}): Classification {
  const allowed = ALLOWED[kind]
  if (allowed.length === 1) return { category: allowed[0], confidence: 0.95, reason: null }
  const scores = new Map<AssetCategory, number>(allowed.map((c) => [c, c === PRIOR[kind] ? 0.5 : 0]))
  let best: { word: string; weight: number } | null = null
  const add = (cat: AssetCategory, weight: number, word: string) => {
    if (!scores.has(cat)) return
    scores.set(cat, (scores.get(cat) ?? 0) + weight)
    if (!best || weight > best.weight) best = { word, weight }
  }
  const folders = path.split(/[\\/]/).slice(-4, -1).flatMap(tokens)
  for (const [words, factor] of [[tokens(name), 1], [folders, 0.6]] as const) {
    for (const w of words) {
      const learnedCat = learned[w]
      if (learnedCat) add(learnedCat, 3 * factor, w)
      for (const cat of allowed) if (KEYWORDS[cat].some((k) => w === k || (k.length >= 4 && w.startsWith(k)))) add(cat, 2 * factor, w)
    }
  }
  if (kind === 'audio' && facts.duration !== undefined) add(facts.duration < 5 ? 'sfx' : 'music', 2, facts.duration < 5 ? 'short' : 'long')
  if (kind === 'image' && facts.width && facts.height && Math.max(facts.width, facts.height) <= 128) add('concept', 1, 'small')

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1])
  const total = ranked.reduce((s, [, v]) => s + v, 0)
  const [category, top] = ranked[0]
  const confidence = total > 0 ? Math.min(0.97, Math.max(0.34, top / total)) : 0.4
  return { category, confidence: Math.round(confidence * 100) / 100, reason: (best as { word: string } | null)?.word ?? null }
}

const MAX_LEARNED = 500

/** Remembers the words of a file name for a category the user chose. Oldest words drop out first. */
export function learn(learned: Record<string, AssetCategory>, name: string, category: AssetCategory): Record<string, AssetCategory> {
  if (category === 'other') return learned
  const words = tokens(name).filter((w) => w.length <= 40)
  if (words.length === 0) return learned
  const next = { ...learned }
  for (const w of words) {
    delete next[w]
    next[w] = category
  }
  const keys = Object.keys(next)
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_LEARNED))) delete next[k]
  return next
}
