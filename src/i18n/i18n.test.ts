import { describe, expect, it } from 'vitest'
import { migrate } from '../model/migrate'
import { emptyData } from '../model/schema'
import { DICTS, LANGUAGES, resolveLanguage, translate } from '.'

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('translations', () => {
  it('every language has every key, non-empty, with the same placeholders as English', () => {
    const keys = Object.keys(DICTS.en) as (keyof typeof DICTS.en)[]
    for (const lang of LANGUAGES) {
      const dict = DICTS[lang]
      expect(Object.keys(dict).sort()).toEqual([...keys].sort())
      for (const key of keys) {
        expect(dict[key].trim().length, `${lang}.${key}`).toBeGreaterThan(0)
        expect(placeholders(dict[key]), `${lang}.${key}`).toEqual(placeholders(DICTS.en[key]))
      }
    }
  })

  it('non-English dictionaries are really translated', () => {
    // Product and program names stay the same in every language.
    const NAMES = new Set(['appName', 'paletteClaudeRun', 'nav_integrations', 'integExeUnity', 'integExeBlender', 'integUnity', 'kritaExe'])
    for (const lang of LANGUAGES.filter((l) => l !== 'en')) {
      const same = (Object.keys(DICTS.en) as (keyof typeof DICTS.en)[]).filter((k) => !NAMES.has(k) && DICTS[lang][k] === DICTS.en[k] && DICTS.en[k].length > 12)
      // Brand names and short technical terms may stay the same; long sentences must not.
      expect(same, lang).toEqual([])
    }
  })

  it('fills placeholders and resolves languages', () => {
    expect(translate('de', 'rowsCount', { n: 3 })).toBe('3 Zeilen')
    expect(translate('ja', 'stepsDone', { done: 1, total: 4 })).toBe('1/4 ステップ')
    expect(resolveLanguage('ru')).toBe('ru')
    expect(LANGUAGES).toContain(resolveLanguage('auto'))
  })

  it('accepts every language in saved settings and still loads old files', () => {
    for (const lang of ['auto', ...LANGUAGES]) {
      const d = emptyData()
      expect(migrate({ ...d, settings: { ...d.settings, language: lang } }).settings.language).toBe(lang)
    }
    expect(() => migrate({ ...emptyData(), settings: { ...emptyData().settings, language: 'xx' } })).toThrow()
  })
})
