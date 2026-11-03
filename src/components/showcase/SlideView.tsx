import { lazy, Suspense } from 'react'
import { useImageUrl } from '../../assetUrl'
import { useT } from '../../i18n'
import { isModelAsset, showcaseStats } from '../../model/showcase'
import type { Asset, Showcase, Slide } from '../../model/schema'
import { useStore } from '../../store'

const ModelViewer = lazy(() => import('../models/ModelViewer'))

function Picture({ asset, className }: { asset: Asset; className?: string }) {
  const url = useImageUrl(asset)
  return url ? <img className={className} src={url} alt={asset.name} draggable={false} /> : <div className={`${className ?? ''} pic-missing`}>{asset.name}</div>
}

function Model({ asset }: { asset: Asset }) {
  if (!isModelAsset(asset) || !asset.path) return <div className="pic-missing">{asset.name}</div>
  return (
    <Suspense fallback={null}>
      <ModelViewer source={{ kind: 'desktop', path: asset.path }} wireframe={false} dark autoRotate bare />
    </Suspense>
  )
}

/** One slide, scaled to the showcase format. Used in the editor preview and in the presenter. */
export function SlideView({ show, slide, playing = false }: { show: Showcase; slide: Slide; playing?: boolean }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const assets = slide.assetIds.map((id) => data.assets.find((a) => a.id === id)).filter((a): a is Asset => Boolean(a))
  const [first, second] = assets
  const anim = playing ? ` anim-${slide.transition}` : ''
  const style = { ['--slide-seconds' as string]: `${slide.seconds}s` }

  let body: React.ReactNode
  switch (slide.kind) {
    case 'title':
      body = (
        <>
          {first?.kind === 'image' && <Picture asset={first} className="bg kenburns" />}
          <div className="slide-center">
            <h1 className="slide-big">{slide.title}</h1>
            {slide.text && <p className="slide-sub">{slide.text}</p>}
          </div>
        </>
      )
      break
    case 'image':
      body = (
        <>
          {first && <Picture asset={first} className="fill kenburns" />}
          {slide.title && <div className="slide-caption">{slide.title}</div>}
        </>
      )
      break
    case 'gallery':
      body = (
        <>
          <div className={`slide-gallery n${Math.min(assets.length, 6)}`}>
            {assets.slice(0, 6).map((a, i) => (
              <div key={a.id} className="tile" style={{ animationDelay: `${i * 0.12}s` }}>
                <Picture asset={a} />
              </div>
            ))}
          </div>
          {slide.title && <div className="slide-caption">{slide.title}</div>}
        </>
      )
      break
    case 'compare':
      body = (
        <>
          <div className="slide-compare">
            <div>{first && (first.kind === 'model' ? <Model asset={first} /> : <Picture asset={first} />)}</div>
            <div>{second && (second.kind === 'model' ? <Model asset={second} /> : <Picture asset={second} />)}</div>
          </div>
          {slide.title && <div className="slide-caption">{slide.title}</div>}
        </>
      )
      break
    case 'model':
      body = (
        <>
          <div className="slide-model">{first && <Model asset={first} />}</div>
          {slide.title && <div className="slide-caption">{slide.title}</div>}
        </>
      )
      break
    case 'stats': {
      const s = showcaseStats(data, show.projectId)
      body = (
        <div className="slide-center">
          <h2 className="slide-title">{slide.title}</h2>
          <div className="slide-stats">
            <div><strong>{s.pct}%</strong><span>{t('showStatProgress')}</span></div>
            <div><strong>{s.steps}</strong><span>{t('showStatSteps')}</span></div>
            <div><strong>{s.hours}</strong><span>{t('showStatHours')}</span></div>
            <div><strong>{s.assets}</strong><span>{t('showStatAssets')}</span></div>
          </div>
          {slide.text && <p className="slide-sub">{slide.text}</p>}
        </div>
      )
      break
    }
    case 'text':
    case 'end':
      body = (
        <div className="slide-center">
          <h2 className={slide.kind === 'end' ? 'slide-big' : 'slide-title'}>{slide.title}</h2>
          {slide.text && <p className="slide-sub pre">{slide.text}</p>}
        </div>
      )
      break
  }
  return (
    <div className={`slide fmt-${show.format.replace(':', 'x')} theme-${show.theme} kind-${slide.kind}${anim}`} style={style}>
      {body}
    </div>
  )
}
