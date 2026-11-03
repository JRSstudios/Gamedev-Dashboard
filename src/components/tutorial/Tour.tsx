import { useEffect, useLayoutEffect, useState } from 'react'
import { useLang, useT } from '../../i18n'
import { updateSettings } from '../../model/ops'
import { mutate, setSection } from '../../store'
import { tutorialText } from '../../tutorial'
import { TOUR } from '../../tutorial/content'

const PAD = 6

/** Guided tour: dims the window, highlights one element marked with `data-tour` and explains it. */
export function Tour({ onClose }: { onClose: () => void }) {
  const t = useT()
  const lang = useLang()
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = TOUR[index]
  const text = tutorialText(lang).tour[step.id]

  useEffect(() => setSection(step.section), [step.section])

  // Measure after the section rendered; elements may appear a frame later.
  useLayoutEffect(() => {
    let frame = 0
    let tries = 0
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) {
        el.scrollIntoView({ block: 'nearest' })
        setRect(el.getBoundingClientRect())
      } else if (tries++ < 20) frame = window.setTimeout(measure, 50)
      else setRect(null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(frame)
      window.removeEventListener('resize', measure)
    }
  }, [step.target, index])

  const finish = () => {
    mutate((d) => updateSettings(d, { tutorial: { ...d.settings.tutorial, tourDone: true } }))
    onClose()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') setIndex((i) => Math.min(TOUR.length - 1, i + 1))
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish only writes settings and closes
  }, [])

  // Card below the element when there is room, otherwise above; centred without a target.
  const cardStyle: React.CSSProperties = rect
    ? {
        left: Math.max(12, Math.min(window.innerWidth - 352, rect.left)),
        ...(rect.bottom + 200 < window.innerHeight ? { top: rect.bottom + PAD + 8 } : { bottom: window.innerHeight - rect.top + PAD + 8 }),
      }
    : { left: '50%', top: '40%', transform: 'translate(-50%, -50%)' }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={t('tutTour')}>
      {rect ? (
        <div className="tour-spot" style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
      ) : (
        <div className="tour-dim" />
      )}
      <div className="tour-card panel" style={cardStyle}>
        <span className="small muted">{t('tutStep', { n: index + 1, total: TOUR.length })}</span>
        <h3>{text.title}</h3>
        <p>{text.text}</p>
        <div className="row-between">
          <button className="link" onClick={finish}>{t('tutSkip')}</button>
          <span className="row">
            {index > 0 && <button onClick={() => setIndex(index - 1)}>{t('tutBack')}</button>}
            {index < TOUR.length - 1 ? (
              <button className="primary" autoFocus onClick={() => setIndex(index + 1)}>{t('tutNext')}</button>
            ) : (
              <button className="primary" autoFocus onClick={finish}>{t('tutFinish')}</button>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
