import { describe, expect, it } from 'vitest'
import { CHEATS } from '../cheatsheet'
import { LANGUAGES } from '../i18n/languages'
import { FIRST_GAME, LESSONS, TOUR } from './content'
import { TUTORIAL_LOCALES } from '.'

describe('tutorial', () => {
  it('every language has every lesson and tour step, with the same number of steps as English', () => {
    const en = TUTORIAL_LOCALES.en
    for (const lang of LANGUAGES) {
      const loc = TUTORIAL_LOCALES[lang]!
      expect(Object.keys(loc.lessons).sort(), lang).toEqual(LESSONS.map((l) => l.id).sort())
      expect(Object.keys(loc.tour).sort(), lang).toEqual(TOUR.map((s) => s.id).sort())
      for (const l of LESSONS) {
        const x = loc.lessons[l.id]
        expect(x.steps.length, `${lang}.${l.id}`).toBe(en.lessons[l.id].steps.length)
        for (const s of [x.title, x.intro, x.tip, ...x.steps]) expect(s.trim().length, `${lang}.${l.id}`).toBeGreaterThan(0)
        if (lang !== 'en') expect(x.intro, `${lang}.${l.id}`).not.toBe(en.lessons[l.id].intro)
      }
    }
  })

  it('the first game course only uses existing cheat sheet entries', () => {
    const ids = new Set(CHEATS.map((c) => c.id))
    for (const id of FIRST_GAME) expect(ids.has(id), id).toBe(true)
  })
})
