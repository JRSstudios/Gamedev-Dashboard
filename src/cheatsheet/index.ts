import { CAMERA } from './camera'
import { INPUT } from './input'
import { MOVEMENT } from './movement'
import { START } from './start'
import { SYSTEMS } from './systems'
import type { CheatEntry } from './types'
import { WORLD } from './world'

export * from './types'

/** Built-in Unity 6.6 cheat sheet, in reading order. */
export const CHEATS: CheatEntry[] = [...START, ...INPUT, ...MOVEMENT, ...CAMERA, ...WORLD, ...SYSTEMS]

const byId = new Map(CHEATS.map((c) => [c.id, c]))
export const getCheat = (id: string): CheatEntry | undefined => byId.get(id)

/** Plain text of an entry, for search and for the Brainstorm prompt. */
export function cheatText(c: CheatEntry): string {
  return [c.summary, ...c.steps, ...c.pitfalls, ...c.code.map((x) => x.file)].join('\n')
}
