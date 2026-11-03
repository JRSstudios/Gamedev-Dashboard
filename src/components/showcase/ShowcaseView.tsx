import { useState } from 'react'
import { useT } from '../../i18n'
import { SLIDE_KINDS, type Asset, type Showcase, type Slide } from '../../model/schema'
import { addShowcase, addSlide, autoShowcase, deleteShowcase, deleteSlide, isModelAsset, moveSlide, newSlide, updateShowcase, updateSlide } from '../../model/showcase'
import { confirmDialog } from '../../platform'
import { getData, mutate, useStore } from '../../store'
import { Presenter } from './Presenter'
import { SlideView } from './SlideView'

/** Assets a slide kind can use. */
function fits(kind: Slide['kind'], a: Asset): boolean {
  if (kind === 'model') return isModelAsset(a)
  if (kind === 'compare') return a.kind === 'image' || isModelAsset(a)
  return a.kind === 'image'
}
const MAX_ASSETS: Record<Slide['kind'], number> = { title: 1, image: 1, gallery: 6, compare: 2, model: 1, stats: 0, text: 0, end: 0 }

function SlideEditor({ show, slide }: { show: Showcase; slide: Slide }) {
  const t = useT()
  const assets = useStore((s) => s.data.assets).filter((a) => a.projectId === show.projectId && fits(slide.kind, a))
  const set = (patch: Partial<Slide>) => mutate((d) => updateSlide(d, show.id, slide.id, patch))
  const max = MAX_ASSETS[slide.kind]
  const toggle = (id: string) => {
    const has = slide.assetIds.includes(id)
    set({ assetIds: has ? slide.assetIds.filter((x) => x !== id) : [...slide.assetIds, id].slice(-max) })
  }
  return (
    <section className="panel slide-editor">
      <div className="row">
        <label className="field inline">
          <span className="field-label">{t('showKind')}</span>
          <select value={slide.kind} onChange={(e) => set({ kind: e.target.value as Slide['kind'], assetIds: [] })}>
            {SLIDE_KINDS.map((k) => <option key={k} value={k}>{t(`showKind_${k}`)}</option>)}
          </select>
        </label>
        <label className="field inline">
          <span className="field-label">{t('showSeconds')}</span>
          <input type="number" min={1} max={60} value={slide.seconds} onChange={(e) => set({ seconds: Math.min(60, Math.max(1, Number(e.target.value) || 4)) })} />
        </label>
        <label className="field inline">
          <span className="field-label">{t('showTransition')}</span>
          <select value={slide.transition} onChange={(e) => set({ transition: e.target.value as Slide['transition'] })}>
            {(['fade', 'slide', 'zoom'] as const).map((x) => <option key={x} value={x}>{t(`showTr_${x}`)}</option>)}
          </select>
        </label>
      </div>
      <label className="field wide">
        <span className="field-label">{t('showSlideTitle')}</span>
        <input value={slide.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} />
      </label>
      {slide.kind !== 'image' && slide.kind !== 'gallery' && slide.kind !== 'model' && slide.kind !== 'compare' && (
        <label className="field wide">
          <span className="field-label">{t('showSlideText')}</span>
          <textarea rows={2} value={slide.text} maxLength={2000} onChange={(e) => set({ text: e.target.value })} />
        </label>
      )}
      {max > 0 && (
        <>
          <span className="field-label">{t('showPickAssets', { n: max })}</span>
          {assets.length === 0 && <p className="small muted">{t(slide.kind === 'model' ? 'showNoModels' : 'showNoImages')}</p>}
          <div className="asset-picker">
            {assets.slice(0, 60).map((a) => (
              <button key={a.id} className={slide.assetIds.includes(a.id) ? 'chip on' : 'chip'} onClick={() => toggle(a.id)} title={a.name}>
                {a.name}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export function ShowcaseView({ projectId }: { projectId: string }) {
  const t = useT()
  const all = useStore((s) => s.data.showcases)
  const assets = useStore((s) => s.data.assets)
  const shows = all.filter((s) => s.projectId === projectId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [slideId, setSlideId] = useState<string | null>(null)
  const [presenting, setPresenting] = useState(false)
  const show = shows.find((s) => s.id === selectedId) ?? shows[shows.length - 1] ?? null
  const slide = show?.slides.find((s) => s.id === slideId) ?? show?.slides[0] ?? null
  const music = assets.filter((a) => a.projectId === projectId && (a.category === 'music' || a.category === 'sfx'))

  const auto = () => {
    const r = autoShowcase(getData(), projectId, {
      tagline: t('showTagline'),
      artTitle: t('showArtTitle'),
      progressTitle: t('showProgressTitle'),
      modelTitle: t('showModelTitle'),
      compareTitle: t('showCompareTitle'),
      endTitle: t('showEndTitle'),
      endText: t('showEndText'),
    })
    mutate(() => r.data)
    setSelectedId(r.showcase.id)
    setSlideId(null)
  }
  const blank = () => {
    const r = addShowcase(getData(), projectId, t('showNewTitle'))
    mutate(() => r.data)
    setSelectedId(r.showcase.id)
  }

  return (
    <div className="showcase">
      <div className="toolbar">
        <button className="primary" onClick={auto}>✦ {t('showAuto')}</button>
        <button onClick={blank}>+ {t('showBlank')}</button>
        {shows.length > 1 && (
          <select value={show?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)} aria-label={t('nav_showcase')}>
            {shows.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        )}
      </div>
      {!show && <p className="callout">{t('showEmpty')}</p>}
      {show && (
        <div className="showcase-grid">
          <aside className="panel slide-list">
            <label className="field wide">
              <span className="field-label">{t('showTitle')}</span>
              <input value={show.title} maxLength={200} onChange={(e) => mutate((d) => updateShowcase(d, show.id, { title: e.target.value }))} />
            </label>
            <div className="row">
              <label className="field inline">
                <span className="field-label">{t('showFormat')}</span>
                <select value={show.format} onChange={(e) => mutate((d) => updateShowcase(d, show.id, { format: e.target.value as Showcase['format'] }))}>
                  <option value="16:9">16:9 · YouTube</option>
                  <option value="9:16">9:16 · TikTok / Shorts</option>
                  <option value="1:1">1:1 · Instagram</option>
                </select>
              </label>
              <label className="field inline">
                <span className="field-label">{t('showTheme')}</span>
                <select value={show.theme} onChange={(e) => mutate((d) => updateShowcase(d, show.id, { theme: e.target.value as Showcase['theme'] }))}>
                  {(['dark', 'light', 'color'] as const).map((x) => <option key={x} value={x}>{t(`showTheme_${x}`)}</option>)}
                </select>
              </label>
            </div>
            <label className="field wide">
              <span className="field-label">{t('showMusic')}</span>
              <select value={show.musicId ?? ''} onChange={(e) => mutate((d) => updateShowcase(d, show.id, { musicId: e.target.value || null }))}>
                <option value="">{t('showNoMusic')}</option>
                {music.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <ol className="plain slides">
              {show.slides.map((s, i) => (
                <li key={s.id} className={s.id === slide?.id ? 'on' : ''}>
                  <button className="item" onClick={() => setSlideId(s.id)}>
                    <span className="muted small">{i + 1}</span> {t(`showKind_${s.kind}`)}{s.title ? ` · ${s.title}` : ''}
                  </button>
                  <span className="row">
                    <button className="link" aria-label={t('moveUp')} onClick={() => mutate((d) => moveSlide(d, show.id, s.id, -1))}>↑</button>
                    <button className="link" aria-label={t('moveDown')} onClick={() => mutate((d) => moveSlide(d, show.id, s.id, 1))}>↓</button>
                    <button className="link" aria-label={t('delete')} onClick={() => mutate((d) => deleteSlide(d, show.id, s.id))}>×</button>
                  </span>
                </li>
              ))}
            </ol>
            <button onClick={() => {
              const s = newSlide('image')
              mutate((d) => addSlide(d, show.id, s, slide?.id ?? null))
              setSlideId(s.id)
            }}>+ {t('showAddSlide')}</button>
            <button
              className="link"
              onClick={async () => {
                if (await confirmDialog(t('showDeleteConfirm', { name: show.title }))) mutate((d) => deleteShowcase(d, show.id))
              }}
            >
              {t('delete')}
            </button>
          </aside>
          <div className="slide-main">
            <div className="slide-preview">
              {slide ? <SlideView key={slide.id + slide.kind} show={show} slide={slide} playing /> : <p className="muted">{t('showNoSlides')}</p>}
            </div>
            <div className="row">
              <button className="primary" disabled={!show.slides.length} onClick={() => setPresenting(true)}>▶ {t('showPresent')}</button>
              <span className="small muted">{t('showRecordHint')}</span>
            </div>
            {slide && <SlideEditor key={slide.id} show={show} slide={slide} />}
          </div>
        </div>
      )}
      {presenting && show && <Presenter show={show} onClose={() => setPresenting(false)} />}
    </div>
  )
}
