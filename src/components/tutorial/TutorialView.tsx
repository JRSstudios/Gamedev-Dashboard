import { useState } from 'react'
import { getCheat } from '../../cheatsheet'
import { useLang, useT } from '../../i18n'
import { addGoal, addSteps, updateSettings } from '../../model/ops'
import { getActiveProjectId, mutate, notify, openItem, setSection, useStore } from '../../store'
import { FIRST_GAME, LESSONS, type LessonId } from '../../tutorial/content'
import { startTour, tutorialText } from '../../tutorial'
import { Confetti } from './Confetti'
import { LessonAnimation } from './LessonAnimation'

/** Lessons with "try it" buttons, progress, the guided tour and the first-game course. */
export function TutorialView() {
  const t = useT()
  const lang = useLang()
  const done = useStore((s) => s.data.settings.tutorial.done)
  const [current, setCurrent] = useState<LessonId>(() => LESSONS.find((l) => !done.includes(l.id))?.id ?? 'start')
  const text = tutorialText(lang)
  const lesson = LESSONS.find((l) => l.id === current)!
  const body = text.lessons[current]
  const isDone = done.includes(current)

  const markDone = (value: boolean) =>
    mutate((d) => {
      const list = d.settings.tutorial.done.filter((x) => x !== current)
      return updateSettings(d, { tutorial: { ...d.settings.tutorial, done: value ? [...list, current] : list } })
    })
  const [party, setParty] = useState(0)
  const next = () => {
    markDone(true)
    if (done.filter((d) => d !== current && LESSONS.some((l) => l.id === d)).length === LESSONS.length - 1) setParty((n) => n + 1)
    const i = LESSONS.findIndex((l) => l.id === current)
    if (i < LESSONS.length - 1) setCurrent(LESSONS[i + 1].id)
  }
  const courseGoal = () => {
    const projectId = getActiveProjectId()
    if (!projectId) return
    const titles = FIRST_GAME.map((id) => getCheat(id, lang)?.title ?? id)
    mutate((d) => {
      const withGoal = addGoal(d, projectId, text.lessons.firstgame.title)
      return addSteps(withGoal, withGoal.goals[withGoal.goals.length - 1].id, titles)
    })
    notify(t('tutGoalCreated'), { label: t('nav_goals'), run: () => setSection('goals') })
  }

  return (
    <div className="tutorial">
      {party > 0 && <Confetti key={party} />}
      <aside className="panel tut-list">
        <div className="panel-head">
          <h2>{t('tutLessons')}</h2>
          <span className="small muted">{t('tutProgress', { done: done.filter((d) => LESSONS.some((l) => l.id === d)).length, total: LESSONS.length })}</span>
        </div>
        <div className="tut-progress" aria-hidden="true">
          <span style={{ width: `${(done.filter((d) => LESSONS.some((l) => l.id === d)).length / LESSONS.length) * 100}%` }} />
        </div>
        <ol className="plain">
          {LESSONS.map((l, i) => (
            <li key={l.id}>
              <button className={`nav-item${l.id === current ? ' active' : ''}`} onClick={() => setCurrent(l.id)}>
                <span className={`tut-dot${done.includes(l.id) ? ' done' : ''}`} aria-hidden="true">{done.includes(l.id) ? '✓' : i + 1}</span>
                {text.lessons[l.id].title}
              </button>
            </li>
          ))}
        </ol>
        <button onClick={startTour}>▶ {t('tutStartTour')}</button>
      </aside>

      <article className="panel tut-lesson">
        <h2>{body.title}</h2>
        <LessonAnimation key={current} lesson={current} />
        <p>{body.intro}</p>
        <ol className="tut-steps" key={`steps-${current}`}>
          {body.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <p className="callout small">💡 {body.tip}</p>

        {current === 'firstgame' && (
          <>
            <ol className="tut-course">
              {FIRST_GAME.map((id) => (
                <li key={id}>
                  <button className="link" onClick={() => openItem('cheat', id)}>{getCheat(id, lang)?.title ?? id}</button>
                </li>
              ))}
            </ol>
            <button onClick={courseGoal} disabled={!getActiveProjectId()}>{t('tutCreateGoal')}</button>
          </>
        )}

        <div className="row">
          <button onClick={() => setSection(lesson.section)}>{t('tutTry')}</button>
          {isDone ? (
            <button className="link" onClick={() => markDone(false)}>{t('tutUndone')}</button>
          ) : (
            <button className="primary" onClick={next}>{t('tutDoneNext')}</button>
          )}
        </div>
      </article>
    </div>
  )
}
