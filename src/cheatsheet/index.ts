import type { Lang } from '../i18n/languages'
import { CAMERA } from './camera'
import { INPUT } from './input'
import { localizeCheat } from './locales'
import { MOVEMENT } from './movement'
import { START } from './start'
import { SYSTEMS } from './systems'
import type { CheatEntry } from './types'
import { WORLD } from './world'

export * from './types'
export { CHEAT_LOCALES, localizeCheat } from './locales'

/** Built-in Unity 6.6 cheat sheet, in reading order (German source texts). */
export const CHEATS: CheatEntry[] = [...START, ...INPUT, ...MOVEMENT, ...CAMERA, ...WORLD, ...SYSTEMS]

const localized = new Map<Lang, CheatEntry[]>()

/** The whole cheat sheet in one language. */
export function cheatsIn(lang: Lang): CheatEntry[] {
  let list = localized.get(lang)
  if (!list) {
    list = CHEATS.map((c) => localizeCheat(c, lang))
    localized.set(lang, list)
  }
  return list
}

/** One built-in entry, translated when a language is given. */
export function getCheat(id: string, lang: Lang = 'de'): CheatEntry | undefined {
  return cheatsIn(lang).find((c) => c.id === id)
}

/** Plain text of an entry, for search and for the Brainstorm prompt. */
export function cheatText(c: CheatEntry): string {
  return [c.summary, ...c.steps, ...c.pitfalls, ...c.code.map((x) => x.file)].join('\n')
}
