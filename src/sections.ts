import type { TFn } from './i18n'
import type { Section } from './store'

/** A custom label set in Settings → Sections wins over the built-in name. */
export const sectionTitle = (t: TFn, s: Section, label = ''): string => label.trim() || t(`nav_${s}`)
export const sectionDescription = (t: TFn, s: Section): string => t(`desc_${s}`)
