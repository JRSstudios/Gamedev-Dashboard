import { listCheatRefs, listRefs } from './graph'
import type { Data } from './schema'
import { buildIndex, type SearchDoc, type SearchIndex } from './search'

/** Everything searchable for one project: its own content plus the whole cheat sheet. */
export function searchDocs(data: Data, projectId: string | null): SearchDoc[] {
  const refs = [...(projectId ? listRefs(data, projectId) : []), ...listCheatRefs(data)]
  return refs.map((r) => ({ type: r.type, id: r.id, title: r.title, text: `${r.subtitle}\n${r.text}` }))
}

let cache: { data: Data; projectId: string | null; index: SearchIndex } | null = null

/** Rebuilt only when the data or project changes (data is immutable, so identity is enough). */
export function projectIndex(data: Data, projectId: string | null): SearchIndex {
  if (cache && cache.data === data && cache.projectId === projectId) return cache.index
  const index = buildIndex(searchDocs(data, projectId))
  cache = { data, projectId, index }
  return index
}
