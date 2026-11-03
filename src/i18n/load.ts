import { useEffect, useState } from 'react'
import { setCheatLocale } from '../cheatsheet'
import { TUTORIAL_LOCALES } from '../tutorial'
import { DICTS, languageLoaded, type Lang } from '.'

// Each language is its own chunk: interface texts, cheat sheet and tutorial together.
const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<void>> = {
  de: async () => {
    const [d, t] = await Promise.all([import('./de'), import('../tutorial/locales/de')])
    DICTS.de = d.de
    TUTORIAL_LOCALES.de = t.de
  },
  it: async () => {
    const [d, c, x, t] = await Promise.all([import('./it'), import('../cheatsheet/locales/it'), import('../cheatsheet/locales/extra-it'), import('../tutorial/locales/it')])
    DICTS.it = d.it
    setCheatLocale('it', { ...c.it, ...x.extraIt })
    TUTORIAL_LOCALES.it = t.it
  },
  zh: async () => {
    const [d, c, x, t] = await Promise.all([import('./zh'), import('../cheatsheet/locales/zh'), import('../cheatsheet/locales/extra-zh'), import('../tutorial/locales/zh')])
    DICTS.zh = d.zh
    setCheatLocale('zh', { ...c.zh, ...x.extraZh })
    TUTORIAL_LOCALES.zh = t.zh
  },
  ja: async () => {
    const [d, c, x, t] = await Promise.all([import('./ja'), import('../cheatsheet/locales/ja'), import('../cheatsheet/locales/extra-ja'), import('../tutorial/locales/ja')])
    DICTS.ja = d.ja
    setCheatLocale('ja', { ...c.ja, ...x.extraJa })
    TUTORIAL_LOCALES.ja = t.ja
  },
  es: async () => {
    const [d, c, x, t] = await Promise.all([import('./es'), import('../cheatsheet/locales/es'), import('../cheatsheet/locales/extra-es'), import('../tutorial/locales/es')])
    DICTS.es = d.es
    setCheatLocale('es', { ...c.es, ...x.extraEs })
    TUTORIAL_LOCALES.es = t.es
  },
  ru: async () => {
    const [d, c, x, t] = await Promise.all([import('./ru'), import('../cheatsheet/locales/ru'), import('../cheatsheet/locales/extra-ru'), import('../tutorial/locales/ru')])
    DICTS.ru = d.ru
    setCheatLocale('ru', { ...c.ru, ...x.extraRu })
    TUTORIAL_LOCALES.ru = t.ru
  },
}

const pending = new Map<Lang, Promise<void>>()

/** Loads a language pack once; later calls share the same promise. */
export function loadLanguage(lang: Lang): Promise<void> {
  if (lang === 'en' || DICTS[lang]) return Promise.resolve()
  let p = pending.get(lang)
  if (!p) {
    p = LOADERS[lang]().then(languageLoaded, (e: unknown) => {
      pending.delete(lang)
      throw e
    })
    pending.set(lang, p)
  }
  return p
}

/** True once the pack for `lang` is in place; starts loading it if needed. Falls back to English on failure. */
export function useLanguageReady(lang: Lang): boolean {
  const [failed, setFailed] = useState<Lang | null>(null)
  useEffect(() => {
    loadLanguage(lang).catch(() => setFailed(lang))
  }, [lang])
  return lang === 'en' || !!DICTS[lang] || failed === lang
}
