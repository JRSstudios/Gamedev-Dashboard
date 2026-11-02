import { de } from './de'
import { en, type Dict } from './en'
import { useStore } from '../store'

const dicts = { en, de }

export type TFn = (key: keyof Dict, params?: Record<string, string | number>) => string

export function resolveLanguage(setting: 'auto' | 'de' | 'en'): 'de' | 'en' {
  if (setting !== 'auto') return setting
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
}

export function useT(): TFn {
  const setting = useStore((s) => s.data.settings.language)
  const dict = dicts[resolveLanguage(setting)]
  return (key, params) =>
    dict[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? `{${name}}`))
}
