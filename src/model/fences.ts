export interface CodeBlock {
  lang: string
  code: string
}

/** Splits Markdown into text and fenced code blocks. */
export function splitFences(md: string): ({ kind: 'text'; text: string } | ({ kind: 'code' } & CodeBlock))[] {
  const parts: ({ kind: 'text'; text: string } | ({ kind: 'code' } & CodeBlock))[] = []
  const re = /```([\w#+-]*)\n([\s\S]*?)```/g
  let last = 0
  for (const m of md.matchAll(re)) {
    if (m.index > last) parts.push({ kind: 'text', text: md.slice(last, m.index) })
    parts.push({ kind: 'code', lang: m[1].toLowerCase(), code: m[2].replace(/\n$/, '') })
    last = m.index + m[0].length
  }
  if (last < md.length) parts.push({ kind: 'text', text: md.slice(last) })
  return parts
}
