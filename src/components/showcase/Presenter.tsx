import { useEffect, useRef, useState } from 'react'
import { loadAssetBlob } from '../../assetUrl'
import { useT } from '../../i18n'
import type { Showcase } from '../../model/schema'
import { useStore } from '../../store'
import { SlideView } from './SlideView'

/**
 * Full-screen playback for recording: slides advance on their own with transitions, the chosen music
 * plays, and controls fade out after a moment so a screen recording shows only the slides.
 */
export function Presenter({ show, onClose }: { show: Showcase; onClose: () => void }) {
  const t = useT()
  const assets = useStore((s) => s.data.assets)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [idle, setIdle] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const slide = show.slides[index]

  // Full screen while presenting; leaving full screen (Esc) closes the presenter.
  useEffect(() => {
    const el = root.current
    void el?.requestFullscreen?.().catch(() => {})
    const onChange = () => !document.fullscreenElement && onClose()
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per presentation
  }, [])

  // Music: the chosen track, looped, from the start of the presentation.
  useEffect(() => {
    const music = assets.find((a) => a.id === show.musicId)
    if (!music) return
    let url = ''
    let live = true
    void loadAssetBlob(music).then((blob) => {
      if (!blob || !live || !audio.current) return
      url = URL.createObjectURL(blob)
      audio.current.src = url
      void audio.current.play().catch(() => {})
    })
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- music is fixed for one run
  }, [])

  useEffect(() => {
    if (!playing || !slide) return
    const id = window.setTimeout(() => {
      if (index < show.slides.length - 1) setIndex(index + 1)
      else setPlaying(false)
    }, slide.seconds * 1000)
    return () => window.clearTimeout(id)
  }, [index, playing, slide, show.slides.length])

  useEffect(() => {
    if (audio.current) void (playing ? audio.current.play().catch(() => {}) : audio.current.pause())
  }, [playing])

  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), 1800)
    const wake = () => {
      setIdle(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), 1800)
    }
    const onKey = (e: KeyboardEvent) => {
      wake()
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(show.slides.length - 1, i + 1))
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
      else if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      } else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousemove', wake)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, show.slides.length])

  if (!slide) return null
  return (
    <div ref={root} className={`presenter${idle ? ' idle' : ''}`} role="dialog" aria-label={show.title}>
      <div className="presenter-stage">
        <SlideView key={`${slide.id}-${index}`} show={show} slide={slide} playing />
      </div>
      <div className="presenter-bar">
        <button onClick={() => setIndex(Math.max(0, index - 1))} aria-label={t('tutBack')}>‹</button>
        <button onClick={() => setPlaying(!playing)}>{playing ? t('showPause') : t('showPlay')}</button>
        <button onClick={() => setIndex(Math.min(show.slides.length - 1, index + 1))} aria-label={t('tutNext')}>›</button>
        <span className="small">{index + 1} / {show.slides.length}</span>
        <span className="small muted">{t('showKeys')}</span>
        <button onClick={onClose}>{t('close')}</button>
      </div>
      <div className="presenter-progress" aria-hidden="true">
        <span style={{ width: `${((index + 1) / show.slides.length) * 100}%` }} />
      </div>
      <audio ref={audio} loop />
    </div>
  )
}
