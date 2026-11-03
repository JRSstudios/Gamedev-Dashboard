import { useSyncExternalStore } from 'react'
import { useStore } from '../store'
import { en, type Dict } from './en'
import { resolveLanguage, type Lang } from './languages'

export { ENGLISH_NAMES, LANGUAGES, NATIVE_NAMES, resolveLanguage, type Lang } from './languages'

/** English ships in the main bundle as the fallback; the other languages are loaded on demand (./load.ts). */
export const DICTS: { en: Dict } & Partial<Record<Lang, Dict>> = { en }

export type TFn = (key: keyof Dict, params?: Record<string, string | number>) => string

export function translate(lang: Lang, key: keyof Dict, params?: Record<string, string | number>): string {
  return (DICTS[lang] ?? en)[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? `{${name}}`))
}

let version = 0
const listeners = new Set<() => void>()

/** Called by the loader once a language pack is in place, so components re-render with it. */
export function languageLoaded() {
  version++
  for (const l of listeners) l()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

export function useLang(): Lang {
  useSyncExternalStore(subscribe, () => version)
  return resolveLanguage(useStore((s) => s.data.settings.language))
}

export function useT(): TFn {
  const lang = useLang()
  return (key, params) => translate(lang, key, params)
}
