import type { TFn } from './i18n'
import type { Section } from './store'

export const sectionTitle = (t: TFn, s: Section): string => t(`nav_${s}`)
export const sectionDescription = (t: TFn, s: Section): string => t(`desc_${s}`)
