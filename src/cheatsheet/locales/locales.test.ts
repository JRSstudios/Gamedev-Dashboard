import { describe, expect, it } from 'vitest'
import { CHEATS, cheatsIn, getCheat, localizeCheat } from '..'
import { CHEAT_LOCALES } from '.'

describe('cheat sheet translations', () => {
  for (const [lang, locale] of Object.entries(CHEAT_LOCALES)) {
    it(`${lang} covers every entry with the same structure`, () => {
      expect(Object.keys(locale).sort()).toEqual(CHEATS.map((c) => c.id).sort())
      for (const c of CHEATS) {
        const tr = locale[c.id]
        expect(tr.title.trim(), `${lang}/${c.id}`).not.toBe('')
        expect(tr.summary.trim(), `${lang}/${c.id}`).not.toBe('')
        expect(tr.steps, `${lang}/${c.id} steps`).toHaveLength(c.steps.length)
        expect(tr.pitfalls, `${lang}/${c.id} pitfalls`).toHaveLength(c.pitfalls.length)
        for (const s of [...tr.steps, ...tr.pitfalls]) expect(s.trim(), `${lang}/${c.id}`).not.toBe('')
      }
    })
  }

  it('keeps code and metadata, swaps only texts', () => {
    const de = CHEATS[0]
    const ja = localizeCheat(de, 'ja')
    expect(ja.code).toBe(de.code)
    expect(ja.category).toBe(de.category)
    expect(ja.title).not.toBe(de.title)
    expect(localizeCheat(de, 'de')).toBe(de)
  })

  it('looks entries up per language', () => {
    expect(getCheat('cam-basics', 'en')?.title).toBe(CHEAT_LOCALES.en['cam-basics'].title)
    expect(getCheat('cam-basics')?.title).toBe(CHEATS.find((c) => c.id === 'cam-basics')?.title)
    expect(cheatsIn('ru')).toHaveLength(CHEATS.length)
  })
})
