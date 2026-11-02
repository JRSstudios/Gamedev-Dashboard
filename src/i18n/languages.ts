/** Languages the interface and the cheat sheet are available in. */
export const LANGUAGES = ['en', 'de', 'it', 'zh', 'ja', 'es', 'ru'] as const
export type Lang = (typeof LANGUAGES)[number]

/** Each language in its own name, for the language picker. */
export const NATIVE_NAMES: Record<Lang, string> = {
  en: 'English',
  de: 'Deutsch',
  it: 'Italiano',
  zh: '中文',
  ja: '日本語',
  es: 'Español',
  ru: 'Русский',
}

/** English names, used to tell Claude which language to answer in. */
export const ENGLISH_NAMES: Record<Lang, string> = {
  en: 'English',
  de: 'German',
  it: 'Italian',
  zh: 'Simplified Chinese',
  ja: 'Japanese',
  es: 'Spanish',
  ru: 'Russian',
}

export const isLang = (value: string): value is Lang => (LANGUAGES as readonly string[]).includes(value)

/** "auto" follows the system language and falls back to English. */
export function resolveLanguage(setting: string): Lang {
  if (isLang(setting)) return setting
  const system = typeof navigator !== 'undefined' ? navigator.language.toLowerCase().slice(0, 2) : 'en'
  return isLang(system) ? system : 'en'
}
