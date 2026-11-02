/**
 * Small full-text search (BM25) over everything the app knows: cheat sheet, pages, notes,
 * research, goals and table names. Runs locally; the Brainstorm planner sends only the top hits to Claude.
 */

export interface SearchDoc {
  type: string
  id: string
  title: string
  text: string
}

export interface SearchHit {
  doc: SearchDoc
  score: number
}

const STOP = new Set(
  'der die das und oder ein eine einen einem einer ist sind mit für fur von zu im in am an auf aus bei wie was wer wo nicht auch als dass es ich du man the a an and or of to in on for with is are be how what this that it you your my'.split(' '),
)

/** Lower-case words of 2+ letters/digits; German umlauts are kept, common stop words dropped. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []).filter((w) => !STOP.has(w))
}

interface Indexed {
  doc: SearchDoc
  tf: Map<string, number>
  len: number
}

export interface SearchIndex {
  docs: Indexed[]
  df: Map<string, number>
  avgLen: number
}

/** Title words count three times, so a match in the title ranks above one in the body. */
export function buildIndex(docs: SearchDoc[]): SearchIndex {
  const df = new Map<string, number>()
  const indexed = docs.map((doc) => {
    const words = [...tokenize(doc.title), ...tokenize(doc.title), ...tokenize(doc.title), ...tokenize(doc.text)]
    const tf = new Map<string, number>()
    for (const w of words) tf.set(w, (tf.get(w) ?? 0) + 1)
    for (const w of tf.keys()) df.set(w, (df.get(w) ?? 0) + 1)
    return { doc, tf, len: words.length }
  })
  const avgLen = indexed.reduce((s, d) => s + d.len, 0) / Math.max(1, indexed.length)
  return { docs: indexed, df, avgLen }
}

const K1 = 1.2
const B = 0.75

/** Words also match as prefixes ("jump" finds "jumping"), at a lower weight than exact matches. */
export function search(index: SearchIndex, query: string, limit = 10, types?: string[]): SearchHit[] {
  const terms = [...new Set(tokenize(query))]
  if (terms.length === 0) return []
  const n = index.docs.length
  const hits: SearchHit[] = []
  for (const d of index.docs) {
    if (types && !types.includes(d.doc.type)) continue
    let score = 0
    for (const term of terms) {
      let best = 0
      for (const [word, freq] of d.tf) {
        const weight = word === term ? 1 : term.length >= 3 && word.startsWith(term) ? 0.6 : 0
        if (!weight) continue
        const idf = Math.log(1 + (n - (index.df.get(word) ?? 0) + 0.5) / ((index.df.get(word) ?? 0) + 0.5))
        const s = weight * idf * ((freq * (K1 + 1)) / (freq + K1 * (1 - B + (B * d.len) / (index.avgLen || 1))))
        if (s > best) best = s
      }
      score += best
    }
    if (score > 0) hits.push({ doc: d.doc, score })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** A short excerpt around the first query word, for result lists and for the Brainstorm prompt. */
export function snippet(text: string, query: string, max = 220): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const lower = flat.toLowerCase()
  const at = tokenize(query).map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0
  const start = Math.max(0, at - Math.floor(max / 3))
  return `${start > 0 ? '…' : ''}${flat.slice(start, start + max)}${start + max < flat.length ? '…' : ''}`
}
