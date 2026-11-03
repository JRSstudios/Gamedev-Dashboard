import type { ReactNode } from 'react'
import { isHttpUrl } from '../model/schema'
import { openLink } from '../platform'
import { splitFences, type CodeBlock } from '../model/fences'

/**
 * Inline Markdown for plain text: **bold**, *italic*, `code`, [label](https://…) and [[Title]].
 * Built from React elements only (no HTML strings), so nothing in the text can run.
 */
const TOKEN = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[\[[^\]\n]+\]\]|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\n]+\*|_[^_\n]+_)/g

export function Inline({ text, onWikiLink }: { text: string; onWikiLink?: (title: string) => void }) {
  const out: ReactNode[] = []
  let last = 0
  let key = 0
  for (const m of text.matchAll(TOKEN)) {
    const tok = m[0]
    if (m.index > last) out.push(text.slice(last, m.index))
    last = m.index + tok.length
    if (tok.startsWith('**')) out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`')) out.push(<code key={key++}>{tok.slice(1, -1)}</code>)
    else if (tok.startsWith('[[')) {
      const title = tok.slice(2, -2)
      out.push(
        onWikiLink ? (
          <button key={key++} className="link wiki" onClick={() => onWikiLink(title)}>{title}</button>
        ) : (
          <span key={key++} className="wiki">{title}</span>
        ),
      )
    } else if (tok.startsWith('[')) {
      const label = tok.slice(1, tok.indexOf(']('))
      const url = tok.slice(tok.indexOf('](') + 2, -1)
      out.push(
        isHttpUrl(url) ? (
          <a key={key++} href={url} onClick={(e) => (e.preventDefault(), void openLink(url))}>{label}</a>
        ) : (
          tok
        ),
      )
    } else out.push(<em key={key++}>{tok.slice(1, -1)}</em>)
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}

/** Paragraphs, list lines and headings of a Markdown answer, with inline formatting. */
export function MarkdownText({ text, renderCode }: { text: string; renderCode?: (block: CodeBlock, i: number) => ReactNode }) {
  return (
    <>
      {splitFences(text).map((part, i) =>
        part.kind === 'code' ? (
          (renderCode?.(part, i) ?? <pre key={i} className="code small">{part.code}</pre>)
        ) : (
          part.text
            .split(/\n{2,}/)
            .filter((p) => p.trim())
            .map((p, j) => {
              const lines = p.split('\n')
              if (lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l)))
                return (
                  <ul key={`${i}-${j}`}>
                    {lines.map((l, k) => <li key={k}><Inline text={l.replace(/^\s*([-*]|\d+\.)\s+/, '')} /></li>)}
                  </ul>
                )
              const h = /^#{1,4}\s+(.*)$/.exec(p)
              if (h && lines.length === 1) return <h4 key={`${i}-${j}`}><Inline text={h[1]} /></h4>
              return (
                <p key={`${i}-${j}`}>
                  {lines.map((l, k) => (
                    <span key={k}>
                      {k > 0 && <br />}
                      <Inline text={l} />
                    </span>
                  ))}
                </p>
              )
            })
        ),
      )}
    </>
  )
}
