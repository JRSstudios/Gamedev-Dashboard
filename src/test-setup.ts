// Tests check every language, so all language packs are loaded up front.
import { LANGUAGES } from './i18n/languages'
import { loadLanguage } from './i18n/load'

await Promise.all(LANGUAGES.map(loadLanguage))
