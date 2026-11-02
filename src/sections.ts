import type { TFn } from './i18n'
import type { Section } from './store'

/** A custom label set in Settings → Sections wins over the built-in name. */
export const sectionTitle = (t: TFn, s: Section, label = ''): string => label.trim() || t(`nav_${s}`)
export const sectionDescription = (t: TFn, s: Section): string => t(`desc_${s}`)

/** Navigation groups. Sections keep the order from the project layout inside their group. */
export const SECTION_GROUPS = [
  { id: 'plan', sections: ['overview', 'goals', 'brainstorm', 'planner'] },
  { id: 'knowledge', sections: ['cheats', 'research', 'notes', 'pages', 'tables', 'nodes'] },
  { id: 'assets', sections: ['concept', 'inspiration', 'models', 'audio', 'assets'] },
  { id: 'tools', sections: ['integrations'] },
] as const satisfies readonly { id: string; sections: readonly Section[] }[]

export type SectionGroupId = (typeof SECTION_GROUPS)[number]['id']

export const groupOf = (s: Section): SectionGroupId | null => SECTION_GROUPS.find((g) => (g.sections as readonly Section[]).includes(s))?.id ?? null
