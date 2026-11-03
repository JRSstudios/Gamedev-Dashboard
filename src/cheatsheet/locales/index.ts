import type { Lang } from '../../i18n/languages'
import type { CheatEntry } from '../types'
import { en } from './en'
import { extraEn } from './extra-en'
import type { CheatLocale } from './types'

export type { CheatLocale, CheatText } from './types'

/**
 * Translations of the built-in entries. German is the source text in the entries themselves.
 * English is always present; the others are filled in by `loadLanguage` (src/i18n/load.ts).
 */
export const CHEAT_LOCALES: { en: CheatLocale } & Partial<Record<Exclude<Lang, 'de'>, CheatLocale>> = { en: { ...en, ...extraEn } }

/** The entry with its texts in the given language; falls back to English, then to the German original. */
export function localizeCheat(entry: CheatEntry, lang: Lang): CheatEntry {
  if (lang === 'de') return entry
  const text = CHEAT_LOCALES[lang]?.[entry.id] ?? CHEAT_LOCALES.en[entry.id]
  return text ? { ...entry, ...text } : entry
}
