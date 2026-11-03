import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useT } from '../../i18n'
import { addEdge, addNode, autoLayout, deleteEdge, deleteNode, describeRef, listRefs, moveNode, NODE_H, NODE_W, type RefInfo } from '../../model/graph'
import { derivedEdges } from '../../model/links'
import type { RefType } from '../../model/schema'
import { openRef } from '../../openRef'
import { getData, mutate, useStore } from '../../store'
import { Icon } from '../shell/Icon'
import { NodeCard } from './NodeCard'

interface View {
  x: number
  y: number
  k: number
}
type Point = { x: number; y: number }

const MIN_K = 0.25
const MAX_K = 2
const TYPE_ORDER: RefType[] = ['goal', 'page', 'table', 'note', 'research', 'asset']

/** Curved connection between the facing sides of two cards. */
function edgePath(a: Point, b: Point): string {
  const ac = { x: a.x + NODE_W / 2, y: a.y + NODE_H / 2 }
  const bc = { x: b.x + NODE_W / 2, y: b.y + NODE_H / 2 }
  const right = bc.x >= ac.x
  const s = { x: right ? a.x + NODE_W : a.x, y: ac.y }
  const e = { x: right ? b.x : b.x + NODE_W, y: bc.y }
  const dx = Math.max(40, Math.abs(e.x - s.x) / 2) * (right ? 1 : -1)
  return `M${s.x},${s.y} C${s.x + dx},${s.y} ${e.x - dx},${e.y} ${e.x},${e.y}`
}

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2 + NODE_W / 2, y: (a.y + b.y) / 2 + NODE_H / 2 })

export function NodesView({ projectId }: { projectId: string }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const project = data.projects.find((p) => p.id === projectId)
  const graph = project?.graph ?? { nodes: [], edges: [] }

  const canvas = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ x: 40, y: 40, k: 1 })
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const [connect, setConnect] = useState<{ from: string; to: Point } | null>(null)
  const [libDrag, setLibDrag] = useState<{ info: RefInfo; client: Point; moved: boolean } | null>(null)
  const [selected, setSelected] = useState<{ kind: 'node' | 'edge'; id: string } | null>(null)
  const [query, setQuery] = useState('')
  const fitted = useRef(false)

  const refs = useMemo(() => listRefs(data, projectId), [data, projectId])
  const placed = new Set(graph.nodes.map((n) => `${n.ref.type}:${n.ref.id}`))
  const q = query.trim().toLowerCase()
  const library = refs.filter((r) => !placed.has(`${r.type}:${r.id}`) && (!q || r.title.toLowerCase().includes(q)))
  const derived = useMemo(() => derivedEdges(data, projectId), [data, projectId])

  const pos = (id: string): Point | null => {
    if (drag?.id === id) return drag
    const n = graph.nodes.find((x) => x.id === id)
    return n ? { x: n.x, y: n.y } : null
  }

  const toWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      const r = canvas.current?.getBoundingClientRect()
      return { x: (clientX - (r?.left ?? 0) - view.x) / view.k, y: (clientY - (r?.top ?? 0) - view.y) / view.k }
    },
    [view],
  )

  const fit = useCallback(() => {
    const el = canvas.current
    const nodes = getData().projects.find((p) => p.id === projectId)?.graph.nodes ?? []
    if (!el || nodes.length === 0) return setView({ x: 40, y: 40, k: 1 })
    const minX = Math.min(...nodes.map((n) => n.x))
    const minY = Math.min(...nodes.map((n) => n.y))
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W))
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_H))
    const pad = 48
    const k = Math.min(MAX_K, Math.max(MIN_K, Math.min((el.clientWidth - pad * 2) / (maxX - minX), (el.clientHeight - pad * 2) / (maxY - minY), 1.2)))
    setView({ k, x: (el.clientWidth - (maxX - minX) * k) / 2 - minX * k, y: (el.clientHeight - (maxY - minY) * k) / 2 - minY * k })
  }, [projectId])

  useEffect(() => {
    if (fitted.current) return
    fitted.current = true
    fit()
  }, [fit])

  // Zoom around the cursor. A non-passive listener is needed to stop the page from scrolling.
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const sx = e.clientX - r.left
      const sy = e.clientY - r.top
      setView((v) => {
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * Math.exp(-e.deltaY * 0.0015)))
        return { k, x: sx - ((sx - v.x) * k) / v.k, y: sy - ((sy - v.y) * k) / v.k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Dragging an item from the list onto the canvas (pointer based: HTML drag & drop is taken by the desktop file drop).
  useEffect(() => {
    if (!libDrag) return
    const move = (e: PointerEvent) =>
      setLibDrag((d) => (d ? { ...d, client: { x: e.clientX, y: e.clientY }, moved: d.moved || Math.hypot(e.clientX - d.client.x, e.clientY - d.client.y) > 4 } : d))
    const up = (e: PointerEvent) => {
      const r = canvas.current?.getBoundingClientRect()
      const d = libDrag
      setLibDrag(null)
      if (!d || !r || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return
      const w = toWorld(e.clientX, e.clientY)
      mutate((data) => addNode(data, projectId, d.info.type, d.info.id, w.x - NODE_W / 2, w.y - 24))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    // Only (re)subscribe when a drag starts or ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libDrag === null])

  const addAtCenter = (info: RefInfo) => {
    const el = canvas.current
    const r = el?.getBoundingClientRect()
    const w = r ? toWorld(r.left + r.width / 2, r.top + r.height / 2) : { x: 0, y: 0 }
    // Small offset per added card so several clicks do not stack exactly.
    const n = graph.nodes.length % 6
    mutate((d) => addNode(d, projectId, info.type, info.id, w.x - NODE_W / 2 + n * 24, w.y - NODE_H / 2 + n * 24))
  }

  // ---- background panning -------------------------------------------------
  const pan = useRef<{ start: Point; view: View } | null>(null)
  const onCanvasDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-node-id], .edge-del')) return
    pan.current = { start: { x: e.clientX, y: e.clientY }, view }
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelected(null)
  }
  const onCanvasMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = pan.current
    if (p) setView({ ...p.view, x: p.view.x + e.clientX - p.start.x, y: p.view.y + e.clientY - p.start.y })
  }
  const onCanvasUp = () => {
    pan.current = null
  }

  // ---- moving cards -------------------------------------------------------
  const nodeDrag = useRef<{ id: string; offset: Point; moved: boolean } | null>(null)
  const onNodeDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, .handle')) return
    e.stopPropagation()
    const p = pos(id)
    if (!p) return
    const w = toWorld(e.clientX, e.clientY)
    nodeDrag.current = { id, offset: { x: w.x - p.x, y: w.y - p.y }, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onNodeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = nodeDrag.current
    if (!d) return
    const w = toWorld(e.clientX, e.clientY)
    d.moved = true
    setDrag({ id: d.id, x: w.x - d.offset.x, y: w.y - d.offset.y })
  }
  const onNodeUp = (id: string) => {
    const d = nodeDrag.current
    nodeDrag.current = null
    if (d?.moved && drag) mutate((data) => moveNode(data, projectId, id, drag.x, drag.y))
    else setSelected({ kind: 'node', id })
    setDrag(null)
  }

  // ---- connecting ---------------------------------------------------------
  const onHandleDown = (e: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setConnect({ from: id, to: toWorld(e.clientX, e.clientY) })
  }
  const onHandleMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (connect) setConnect({ ...connect, to: toWorld(e.clientX, e.clientY) })
  }
  const onHandleUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const from = connect?.from
    setConnect(null)
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId
    if (from && target && target !== from) mutate((d) => addEdge(d, projectId, from, target))
  }

  const removeSelected = () => {
    if (!selected) return
    if (selected.kind === 'node') mutate((d) => deleteNode(d, projectId, selected.id))
    else mutate((d) => deleteEdge(d, projectId, selected.id))
    setSelected(null)
  }

  const selectedNode = selected?.kind === 'node' ? graph.nodes.find((n) => n.id === selected.id) : undefined
  const selectedInfo = selectedNode ? describeRef(data, selectedNode.ref.type, selectedNode.ref.id) : null
  const connectionCount = selectedNode
    ? graph.edges.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id).length +
      derived.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id).length
    : 0
  const manualPairs = new Set(graph.edges.map((e) => [e.from, e.to].sort().join('|')))

  return (
    <div className="nodes">
      <aside className="nodes-library panel">
        <h2>{t('nodesLibrary')}</h2>
        <label className="field">
          <span className="field-label">{t('nodesSearch')}</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {library.length === 0 && <p className="small muted">{t('nodesAllPlaced')}</p>}
        {TYPE_ORDER.map((type) => {
          const items = library.filter((r) => r.type === type)
          if (items.length === 0) return null
          return (
            <div key={type} className="lib-group">
              <h3 className={`lib-title ref-${type}`}>{t(`ref_${type}`)}</h3>
              <ul>
                {items.map((r) => (
                  <li key={r.id} className={`lib-item ref-${type}`}>
                    <span
                      className="lib-drag"
                      onPointerDown={(e) => {
                        if (e.button !== 0) return
                        e.preventDefault()
                        setLibDrag({ info: r, client: { x: e.clientX, y: e.clientY }, moved: false })
                      }}
                    >
                      {r.title || t('untitled')}
                    </span>
                    <button className="icon small" aria-label={`+ ${r.title}`} onClick={() => addAtCenter(r)}>+</button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </aside>

      <div className="nodes-stage">
        <div className="nodes-toolbar">
          <button
            onClick={() => {
              mutate((d) => autoLayout(d, projectId))
              setTimeout(fit, 0)
            }}
          >
            {t('nodesTidy')}
          </button>
          <button onClick={fit}>{t('nodesFit')}</button>
          <span className="small muted" aria-label={t('nodesZoom')}>{Math.round(view.k * 100)}%</span>
          <span className="legend small muted">
            <span className="legend-line solid" /> {t('nodesManual')}
            <span className="legend-line dashed" /> {t('nodesLinked')}
          </span>
        </div>

        <div
          ref={canvas}
          className="canvas"
          tabIndex={0}
          aria-label={t('nav_nodes')}
          onPointerDown={onCanvasDown}
          onPointerMove={onCanvasMove}
          onPointerUp={onCanvasUp}
          onKeyDown={(e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !(e.target as HTMLElement).closest('input, textarea')) removeSelected()
          }}
          style={{ backgroundPosition: `${view.x}px ${view.y}px`, backgroundSize: `${24 * view.k}px ${24 * view.k}px` }}
        >
          <div className="world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
            <svg className="edges" width="1" height="1" aria-hidden="true">
              {derived
                .filter((e) => !manualPairs.has([e.from, e.to].sort().join('|')))
                .map((e) => {
                  const a = pos(e.from)
                  const b = pos(e.to)
                  return a && b ? <path key={`d-${e.from}-${e.to}`} className="edge derived" d={edgePath(a, b)} /> : null
                })}
              {graph.edges.map((e) => {
                const a = pos(e.from)
                const b = pos(e.to)
                if (!a || !b) return null
                const d = edgePath(a, b)
                const on = selected?.kind === 'edge' && selected.id === e.id
                return (
                  <g key={e.id}>
                    <path className={on ? 'edge selected' : 'edge'} d={d} />
                    <path
                      className="edge-hit"
                      d={d}
                      onPointerDown={(ev) => {
                        ev.stopPropagation()
                        setSelected({ kind: 'edge', id: e.id })
                      }}
                    />
                  </g>
                )
              })}
              {connect && (() => {
                const a = pos(connect.from)
                return a ? <path className="edge pending" d={`M${a.x + NODE_W},${a.y + NODE_H / 2} L${connect.to.x},${connect.to.y}`} /> : null
              })()}
            </svg>

            {selected?.kind === 'edge' &&
              (() => {
                const e = graph.edges.find((x) => x.id === selected.id)
                const a = e && pos(e.from)
                const b = e && pos(e.to)
                if (!a || !b) return null
                const m = mid(a, b)
                return (
                  <button className="edge-del" style={{ left: m.x, top: m.y }} aria-label={t('nodesDeleteEdge')} title={t('nodesDeleteEdge')} onClick={removeSelected}>
                    ×
                  </button>
                )
              })()}

            {graph.nodes.map((n) => {
              const info = describeRef(data, n.ref.type, n.ref.id)
              if (!info) return null
              const p = pos(n.id) ?? n
              const match = q && info.title.toLowerCase().includes(q)
              const cls = [
                'node',
                `ref-${n.ref.type}`,
                selected?.kind === 'node' && selected.id === n.id ? 'selected' : '',
                drag?.id === n.id ? 'dragging' : '',
                q ? (match ? 'match' : 'dim') : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <div
                  key={n.id}
                  data-node-id={n.id}
                  className={cls}
                  style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
                  onPointerDown={(e) => onNodeDown(e, n.id)}
                  onPointerMove={onNodeMove}
                  onPointerUp={() => onNodeUp(n.id)}
                  onDoubleClick={() => openRef(n.ref.type, n.ref.id)}
                >
                  <NodeCard info={info} data={data} />
                  <button
                    className="handle"
                    aria-label={t('nodesManual')}
                    title={t('nodesManual')}
                    onPointerDown={(e) => onHandleDown(e, n.id)}
                    onPointerMove={onHandleMove}
                    onPointerUp={onHandleUp}
                  />
                </div>
              )
            })}
          </div>

          {graph.nodes.length === 0 && <p className="canvas-empty muted">{t('nodesEmpty')}</p>}
        </div>

        {selectedInfo && selectedNode && (
          <aside className="node-detail panel" aria-label={selectedInfo.title}>
            <div className="panel-head">
              <span className={`chip ref-${selectedInfo.type}`}>{t(`ref_${selectedInfo.type}`)}</span>
              <button className="icon" aria-label={t('close')} onClick={() => setSelected(null)}>×</button>
            </div>
            <h3>{selectedInfo.title || t('untitled')}</h3>
            {selectedInfo.text && <p className="node-detail-text">{selectedInfo.text.slice(0, 600)}</p>}
            <p className="small muted">{t('nodesConnections', { n: connectionCount })}</p>
            <div className="row-actions">
              <button className="primary" onClick={() => openRef(selectedInfo.type, selectedInfo.id)}>{t('nodesOpen')} ↗</button>
              <button onClick={removeSelected}>
                <Icon name="trash" size={14} /> {t('nodesRemove')}
              </button>
            </div>
          </aside>
        )}
      </div>

      {libDrag?.moved && (
        <div className={`lib-ghost ref-${libDrag.info.type}`} style={{ left: libDrag.client.x, top: libDrag.client.y }}>
          {libDrag.info.title}
        </div>
      )}
    </div>
  )
}
