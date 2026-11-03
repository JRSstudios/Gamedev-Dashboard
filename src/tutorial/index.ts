import type { Lang } from '../i18n/languages'
import type { TutorialLocale } from './content'
import { de } from './locales/de'
import { en } from './locales/en'
import { es } from './locales/es'
import { it } from './locales/it'
import { ja } from './locales/ja'
import { ru } from './locales/ru'
import { zh } from './locales/zh'

export const TUTORIAL_LOCALES: Record<Lang, TutorialLocale> = { en, de, it, zh, ja, es, ru }

export const tutorialText = (lang: Lang): TutorialLocale => TUTORIAL_LOCALES[lang] ?? en

/** Starts the guided tour; App listens for this event. */
export const startTour = () => window.dispatchEvent(new CustomEvent('gd-tour'))
