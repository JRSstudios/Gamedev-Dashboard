import { z } from 'zod'

export const CURRENT_VERSION = 1

export const ASSET_CATEGORIES = ['concept', 'music', 'sfx', 'reference', 'other'] as const
export const ASSET_KINDS = ['image', 'audio', 'model', 'doc', 'other'] as const

const id = z.string().min(1).max(64)
const iso = z.string().max(40)
const text = (max: number) => z.string().max(max)
const tags = z.array(text(40)).max(50)

export const StepSchema = z.object({
  id,
  title: text(300),
  done: z.boolean(),
  doneAt: iso.nullable(),
})

export const GoalSchema = z.object({
  id,
  projectId: id,
  title: text(200),
  deadline: iso.nullable(),
  archived: z.boolean(),
  createdAt: iso,
  steps: z.array(StepSchema).max(500),
})

export const NoteSchema = z.object({
  id,
  projectId: id,
  text: text(20000),
  tags,
  goalId: id.nullable(),
  assetId: id.nullable(),
  createdAt: iso,
})

export const AssetSchema = z.object({
  id,
  projectId: id,
  kind: z.enum(ASSET_KINDS),
  /** Absolute path on disk (desktop). Null for files kept inside the browser demo. */
  path: text(2000).nullable(),
  name: text(300),
  category: z.enum(ASSET_CATEGORIES),
  tags,
  note: text(2000),
  addedAt: iso,
})

export const ProjectSchema = z.object({
  id,
  name: text(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  archived: z.boolean(),
  createdAt: iso,
})

export const SessionSchema = z.object({
  id,
  /** Added after v1.0 of the schema; older files simply have no project on their sessions. */
  projectId: id.nullable().default(null),
  goalId: id.nullable(),
  start: iso,
  end: iso,
  minutes: z.number().min(0).max(100000),
})

/** A running timer. Persisted so it survives closing the app; elapsed time is derived from `startedAt`. */
export const TimerSchema = z.object({
  projectId: id,
  goalId: id.nullable(),
  mode: z.enum(['stopwatch', 'pomodoro']),
  /** Pomodoro length in minutes (ignored for the stopwatch). */
  minutes: z.number().int().min(1).max(240),
  startedAt: iso,
})

export const SettingsSchema = z.object({
  language: z.enum(['auto', 'de', 'en']),
  theme: z.enum(['auto', 'light', 'dark']),
  ai: z.object({
    enabled: z.boolean(),
    baseUrl: text(300),
    model: text(200),
  }),
})

export const DataSchema = z.object({
  version: z.literal(CURRENT_VERSION),
  projects: z.array(ProjectSchema).max(500),
  goals: z.array(GoalSchema).max(5000),
  notes: z.array(NoteSchema).max(20000),
  assets: z.array(AssetSchema).max(20000),
  sessions: z.array(SessionSchema).max(50000),
  timer: TimerSchema.nullable().default(null),
  settings: SettingsSchema,
})

export type Step = z.infer<typeof StepSchema>
export type Goal = z.infer<typeof GoalSchema>
export type Note = z.infer<typeof NoteSchema>
export type Asset = z.infer<typeof AssetSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Session = z.infer<typeof SessionSchema>
export type Timer = z.infer<typeof TimerSchema>
export type Settings = z.infer<typeof SettingsSchema>
export type Data = z.infer<typeof DataSchema>
export type AssetCategory = (typeof ASSET_CATEGORIES)[number]
export type AssetKind = (typeof ASSET_KINDS)[number]

export function emptyData(): Data {
  return {
    version: CURRENT_VERSION,
    projects: [],
    goals: [],
    notes: [],
    assets: [],
    sessions: [],
    timer: null,
    settings: {
      language: 'auto',
      theme: 'auto',
      ai: { enabled: false, baseUrl: '', model: '' },
    },
  }
}
