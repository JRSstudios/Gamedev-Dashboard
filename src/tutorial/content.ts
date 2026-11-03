import type { Section } from '../model/layout'

/** Lessons of the Tutorial section. Texts live in ./locales, one file per language. */
export const LESSONS = [
  { id: 'start', section: 'overview' },
  { id: 'plugins', section: 'unity' },
  { id: 'assets', section: 'assets' },
  { id: 'blender', section: 'blender' },
  { id: 'krita', section: 'krita' },
  { id: 'planning', section: 'planner' },
  { id: 'workspace', section: 'pages' },
  { id: 'knowledge', section: 'cheats' },
  { id: 'claude', section: 'settings' },
  { id: 'templates', section: 'templates' },
  { id: 'backup', section: 'settings' },
  { id: 'firstgame', section: 'cheats' },
] as const satisfies readonly { id: string; section: Section }[]

export type LessonId = (typeof LESSONS)[number]['id']

/** Steps of the guided tour; each points at an element marked with `data-tour`. */
export const TOUR = [
  { id: 'nav', target: 'nav', section: 'overview' },
  { id: 'hub', target: 'hub-tiles', section: 'overview' },
  { id: 'suggest', target: 'suggestions', section: 'overview' },
  { id: 'palette', target: 'palette', section: 'overview' },
  { id: 'planner', target: 'planner-tabs', section: 'planner' },
  { id: 'assistant', target: 'assistant', section: 'planner' },
  { id: 'settings', target: 'settings', section: 'planner' },
] as const satisfies readonly { id: string; target: string; section: Section }[]

export type TourId = (typeof TOUR)[number]['id']

/** "Your first game": cheat sheet entries in a sensible order; each becomes one step. */
export const FIRST_GAME = [
  'start-project',
  'start-editor',
  'start-gameobjects',
  'cs-first-script',
  'input-setup',
  'move-2d-platformer',
  'cam-2d',
  '2d-tilemap',
  'phys-collisions',
  'anim-2d-sprites',
  'ui-hud',
  'audio-basics',
  'sys-gamemanager',
  'ui-menu',
  'build-game',
] as const

export interface LessonText {
  title: string
  intro: string
  steps: string[]
  tip: string
}

export interface TutorialLocale {
  lessons: Record<LessonId, LessonText>
  tour: Record<TourId, { title: string; text: string }>
}
