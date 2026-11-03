import type { Lang } from '../i18n/languages'
import type { TutorialLocale } from './content'
import { en } from './locales/en'

/** English is always present; the others are filled in by `loadLanguage` (src/i18n/load.ts). */
export const TUTORIAL_LOCALES: { en: TutorialLocale } & Partial<Record<Lang, TutorialLocale>> = { en }

export const tutorialText = (lang: Lang): TutorialLocale => TUTORIAL_LOCALES[lang] ?? en

/** Starts the guided tour; App listens for this event. */
export const startTour = () => window.dispatchEvent(new CustomEvent('gd-tour'))
