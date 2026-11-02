import { z } from 'zod'

export const CURRENT_VERSION = 1

export const ASSET_CATEGORIES = ['concept', 'inspiration', 'music', 'sfx', 'model', 'reference', 'other'] as const
export const ASSET_KINDS = ['image', 'audio', 'model', 'doc', 'link', 'other'] as const

const id = z.string().min(1).max(64)
const iso = z.string().max(40)
const text = (max: number) => z.string().max(max)
const tags = z.array(text(40)).max(50)

/** Only http(s) links are ever stored or opened. */
export const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
const httpUrl = z.string().max(2000).refine(isHttpUrl, 'Only http(s) URLs are allowed')

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
  /** Inspiration links (kind 'link'); never fetched by the app. */
  url: httpUrl.nullable().default(null),
  addedAt: iso,
})

export const ResearchSchema = z.object({
  id,
  projectId: id,
  title: text(200),
  body: text(40000),
  sources: z.array(z.object({ title: text(300), url: httpUrl })).max(30),
  /** The question that produced this entry (empty when written by hand). */
  query: text(500),
  /** Model that wrote it, empty when written by hand. */
  model: text(100),
  createdAt: iso,
})

export const IntegrationsSchema = z.object({
  unityDir: text(2000).nullable().default(null),
  unityExe: text(2000).nullable().default(null),
  blenderDir: text(2000).nullable().default(null),
  blenderExe: text(2000).nullable().default(null),
  blenderExportDir: text(2000).nullable().default(null),
  kritaExe: text(2000).nullable().default(null),
  /** Folder with Krita files, shown as an inbox like the Blender export folder. */
  kritaDir: text(2000).nullable().default(null),
  /** Category -> sub folder inside the Unity project; falls back to DEFAULT_UNITY_MAP. */
  unityMap: z.record(z.string().max(40), text(300)).default({}),
})

export const COLUMN_TYPES = ['text', 'number', 'checkbox', 'select', 'date', 'progress', 'url'] as const

export const ColumnSchema = z.object({
  id,
  name: text(60),
  type: z.enum(COLUMN_TYPES),
  /** Choices of a `select` column. */
  options: z.array(text(40)).max(30).default([]),
})

export const CellSchema = z.union([text(2000), z.number(), z.boolean(), z.null()])

export const RowSchema = z.object({
  id,
  cells: z.record(id, CellSchema).default({}),
})

export const TableSchema = z.object({
  id,
  projectId: id,
  name: text(100),
  columns: z.array(ColumnSchema).max(30),
  rows: z.array(RowSchema).max(2000),
  createdAt: iso,
})

const blockText = text(5000)
export const BlockSchema = z.discriminatedUnion('type', [
  z.object({ id, type: z.literal('heading'), text: blockText, level: z.union([z.literal(1), z.literal(2)]).default(1) }),
  z.object({ id, type: z.literal('paragraph'), text: blockText }),
  z.object({ id, type: z.literal('callout'), text: blockText }),
  z.object({ id, type: z.literal('list'), items: z.array(text(500)).max(200) }),
  z.object({ id, type: z.literal('checklist'), items: z.array(z.object({ text: text(500), done: z.boolean() })).max(200) }),
  z.object({ id, type: z.literal('image'), assetId: id.nullable() }),
  z.object({ id, type: z.literal('table'), tableId: id.nullable() }),
  z.object({ id, type: z.literal('divider') }),
])

export const PageSchema = z.object({
  id,
  projectId: id,
  title: text(200),
  /** A single emoji or short mark; plain text only. */
  icon: text(8).default(''),
  blocks: z.array(BlockSchema).max(500),
  createdAt: iso,
  updatedAt: iso,
})

export const REF_TYPES = ['goal', 'note', 'asset', 'research', 'table', 'page', 'cheat'] as const

const coord = z.number().min(-100000).max(100000)
export const GraphSchema = z.object({
  nodes: z
    .array(z.object({ id, ref: z.object({ type: z.enum(REF_TYPES), id }), x: coord, y: coord }))
    .max(500),
  /** Hand-drawn connections between nodes (links written as [[Title]] are derived, not stored). */
  edges: z.array(z.object({ id, from: id, to: id })).max(2000),
})

/** A cheat sheet entry written by the user (the built-in ones live in src/cheatsheet). */
export const CheatSchema = z.object({
  id,
  title: text(200),
  category: text(60),
  tags: z.array(text(40)).max(20),
  body: text(20000),
  code: text(20000),
  createdAt: iso,
})

/** An idea from the Brainstorm section and, once planned, the plan Claude wrote for it. */
export const IdeaSchema = z.object({
  id,
  projectId: id,
  text: text(4000),
  perspective: text(40),
  plan: text(40000),
  createdAt: iso,
})

/** One Claude request, for the token and cost overview. Never contains prompt text. */
export const UsageSchema = z.object({
  at: iso,
  model: text(100),
  command: text(40),
  input: z.number().int().min(0),
  output: z.number().int().min(0),
  cacheRead: z.number().int().min(0).default(0),
  cacheWrite: z.number().int().min(0).default(0),
})

export const LayoutSchema = z.object({
  /** Order is the navigation order; sections missing here keep their default place. */
  sections: z.array(z.object({ id: text(40), label: text(60).default(''), visible: z.boolean().default(true) })).max(60),
})

export const ProjectSchema = z.object({
  id,
  name: text(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  archived: z.boolean(),
  createdAt: iso,
  integrations: IntegrationsSchema.default({ unityDir: null, unityExe: null, blenderDir: null, blenderExe: null, blenderExportDir: null, kritaExe: null, kritaDir: null, unityMap: {} }),
  layout: LayoutSchema.default({ sections: [] }),
  graph: GraphSchema.default({ nodes: [], edges: [] }),
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
  /** The API key lives in the OS credential store, never in this file. */
  claude: z
    .object({
      enabled: z.boolean(),
      model: text(100),
      webSearch: z.boolean(),
      /** Warn before sending when the estimated spend this month would pass this many dollars. */
      monthlyLimitUsd: z.number().min(0).max(100000).nullable().default(null),
      /** The "connect Claude?" question was answered once. */
      asked: z.boolean().default(false),
    })
    .default({ enabled: false, model: 'claude-sonnet-5-5', webSearch: false, monthlyLimitUsd: null, asked: false }),
})

export const DataSchema = z.object({
  version: z.literal(CURRENT_VERSION),
  projects: z.array(ProjectSchema).max(500),
  goals: z.array(GoalSchema).max(5000),
  notes: z.array(NoteSchema).max(20000),
  assets: z.array(AssetSchema).max(20000),
  research: z.array(ResearchSchema).max(5000).default([]),
  cheats: z.array(CheatSchema).max(2000).default([]),
  ideas: z.array(IdeaSchema).max(2000).default([]),
  usage: z.array(UsageSchema).max(6000).default([]),
  tables: z.array(TableSchema).max(2000).default([]),
  pages: z.array(PageSchema).max(5000).default([]),
  sessions: z.array(SessionSchema).max(50000),
  timer: TimerSchema.nullable().default(null),
  settings: SettingsSchema,
})

export type Step = z.infer<typeof StepSchema>
export type Goal = z.infer<typeof GoalSchema>
export type Note = z.infer<typeof NoteSchema>
export type Asset = z.infer<typeof AssetSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Research = z.infer<typeof ResearchSchema>
export type Integrations = z.infer<typeof IntegrationsSchema>
export type Column = z.infer<typeof ColumnSchema>
export type ColumnType = (typeof COLUMN_TYPES)[number]
export type Cell = z.infer<typeof CellSchema>
export type Row = z.infer<typeof RowSchema>
export type Table = z.infer<typeof TableSchema>
export type Block = z.infer<typeof BlockSchema>
export type Page = z.infer<typeof PageSchema>
export type Graph = z.infer<typeof GraphSchema>
export type RefType = (typeof REF_TYPES)[number]
export type Layout = z.infer<typeof LayoutSchema>
export type Cheat = z.infer<typeof CheatSchema>
export type Idea = z.infer<typeof IdeaSchema>
export type Usage = z.infer<typeof UsageSchema>
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
    research: [],
    cheats: [],
    ideas: [],
    usage: [],
    tables: [],
    pages: [],
    sessions: [],
    timer: null,
    settings: {
      language: 'auto',
      theme: 'light',
      ai: { enabled: false, baseUrl: '', model: '' },
      claude: { enabled: false, model: 'claude-sonnet-5-5', webSearch: false, monthlyLimitUsd: null, asked: false },
    },
  }
}
