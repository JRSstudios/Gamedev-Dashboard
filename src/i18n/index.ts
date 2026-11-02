import { useStore } from '../store'
import { de } from './de'
import { en, type Dict } from './en'
import { es } from './es'
import { it } from './it'
import { ja } from './ja'
import { resolveLanguage, type Lang } from './languages'
import { ru } from './ru'
import { zh } from './zh'

export { ENGLISH_NAMES, LANGUAGES, NATIVE_NAMES, resolveLanguage, type Lang } from './languages'

export const DICTS: Record<Lang, Dict> = { en, de, it, zh, ja, es, ru }

export type TFn = (key: keyof Dict, params?: Record<string, string | number>) => string

export function translate(lang: Lang, key: keyof Dict, params?: Record<string, string | number>): string {
  return DICTS[lang][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? `{${name}}`))
}

export function useLang(): Lang {
  return resolveLanguage(useStore((s) => s.data.settings.language))
}

export function useT(): TFn {
  const lang = useLang()
  return (key, params) => translate(lang, key, params)
}
