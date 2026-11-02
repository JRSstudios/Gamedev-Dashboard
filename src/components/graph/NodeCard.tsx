import type { ReactNode } from 'react'
import { useImageUrl } from '../../assetUrl'
import { useT } from '../../i18n'
import type { RefInfo } from '../../model/graph'
import { goalProgress } from '../../model/progress'
import type { Asset, Data } from '../../model/schema'
import { ProgressBar } from '../ProgressBar'

function Thumb({ asset }: { asset: Asset }) {
  const url = useImageUrl(asset)
  return url ? <img className="node-thumb" src={url} alt="" draggable={false} /> : null
}

/** Plain-text excerpt; [[links]] are shown without their brackets. */
const excerpt = (text: string, max = 140) => text.replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\s+/g, ' ').trim().slice(0, max)

/** The body of a card on the canvas. Each kind of object gets its own small summary. */
export function NodeCard({ info, data }: { info: RefInfo; data: Data }) {
  const t = useT()
  let body: ReactNode = null
  switch (info.type) {
    case 'goal': {
      const goal = data.goals.find((g) => g.id === info.id)
      const p = goal ? goalProgress(goal) : { pct: 0, done: 0, total: 0 }
      body = (
        <>
          <ProgressBar pct={p.pct} thin label={info.title} />
          <span className="small muted">{t('stepsDone', { done: p.done, total: p.total })}</span>
        </>
      )
      break
    }
    case 'asset': {
      const asset = data.assets.find((a) => a.id === info.id)
      body = (
        <div className="node-asset">
          {asset?.kind === 'image' && <Thumb asset={asset} />}
          <span className="small muted">{asset?.category}</span>
        </div>
      )
      break
    }
    case 'table': {
      const table = data.tables.find((x) => x.id === info.id)
      body = (
        <>
          <div className="node-cols">
            {table?.columns.slice(0, 4).map((c) => <span key={c.id}>{c.name}</span>)}
          </div>
          <span className="small muted">{t(table?.rows.length === 1 ? 'rowsCountOne' : 'rowsCount', { n: table?.rows.length ?? 0 })}</span>
        </>
      )
      break
    }
    case 'research':
      body = <p className="node-text">{excerpt(info.text)}</p>
      break
    case 'note':
      body = (
        <>
          <p className="node-text">{excerpt(info.text.split('\n').slice(1).join(' ') || info.text)}</p>
          {info.subtitle && <span className="small muted">{info.subtitle}</span>}
        </>
      )
      break
    case 'page':
      body = <p className="node-text">{excerpt(info.text)}</p>
      break
  }
  return (
    <>
      <div className="node-head">
        <span className="node-kind">{info.type === 'page' && info.subtitle ? `${info.subtitle} ` : ''}{t(`ref_${info.type}`)}</span>
      </div>
      <strong className="node-title">{info.title || '—'}</strong>
      <div className="node-body">{body}</div>
    </>
  )
}
