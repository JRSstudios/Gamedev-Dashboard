import type { Lang } from '../../i18n/languages'
import type { CheatEntry } from '../types'
import { en } from './en'
import { es } from './es'
import { it } from './it'
import { ja } from './ja'
import { ru } from './ru'
import type { CheatLocale } from './types'
import { zh } from './zh'

export type { CheatLocale, CheatText } from './types'

/** Translations of the built-in entries. German is the source text in the entries themselves. */
export const CHEAT_LOCALES: Record<Exclude<Lang, 'de'>, CheatLocale> = { en, it, zh, ja, es, ru }

/** The entry with its texts in the given language; falls back to English, then to the German original. */
export function localizeCheat(entry: CheatEntry, lang: Lang): CheatEntry {
  if (lang === 'de') return entry
  const text = CHEAT_LOCALES[lang][entry.id] ?? CHEAT_LOCALES.en[entry.id]
  return text ? { ...entry, ...text } : entry
}
