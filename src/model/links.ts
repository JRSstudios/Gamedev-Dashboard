import { describeRef, listRefs } from './graph'
import type { Data } from './schema'

const LINK_RE = /\[\[([^[\]\n]{1,120})\]\]/g

/** Titles written as [[Title]], trimmed and without duplicates (compared case-insensitively). */
export function extractLinks(text: string): string[] {
  const seen = new Map<string, string>()
  for (const m of text.matchAll(LINK_RE)) {
    const title = m[1].trim()
    if (title && !seen.has(title.toLowerCase())) seen.set(title.toLowerCase(), title)
  }
  return [...seen.values()]
}

export interface DerivedEdge {
  from: string
  to: string
}

/**
 * Connections that come from [[Title]] links in the text of objects that are on the canvas.
 * Only links between two nodes that are both on the canvas are returned; they are never stored.
 */
export function derivedEdges(data: Data, projectId: string): DerivedEdge[] {
  const project = data.projects.find((p) => p.id === projectId)
  if (!project) return []
  const byTitle = new Map<string, string[]>()
  for (const ref of listRefs(data, projectId)) {
    const key = ref.title.trim().toLowerCase()
    if (!key) continue
    byTitle.set(key, [...(byTitle.get(key) ?? []), `${ref.type}:${ref.id}`])
  }
  const nodeOf = new Map(project.graph.nodes.map((n) => [`${n.ref.type}:${n.ref.id}`, n.id]))
  const seen = new Set<string>()
  const out: DerivedEdge[] = []
  for (const node of project.graph.nodes) {
    const info = describeRef(data, node.ref.type, node.ref.id)
    if (!info) continue
    for (const title of extractLinks(info.text)) {
      for (const target of byTitle.get(title.toLowerCase()) ?? []) {
        const to = nodeOf.get(target)
        if (!to || to === node.id) continue
        const key = [node.id, to].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ from: node.id, to })
      }
    }
  }
  return out
}
