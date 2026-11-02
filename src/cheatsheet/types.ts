/** Camera/game perspectives an entry applies to; empty means "all". */
export const PERSPECTIVES = ['2d-side', '2d-top', '3d-third', '3d-first', '3d-top', 'iso'] as const
export type Perspective = (typeof PERSPECTIVES)[number]

export const CHEAT_CATEGORIES = ['start', 'csharp', 'input', 'movement', 'camera', 'physics', 'animation', '2d', 'ui', 'audio', 'systems', 'ai', 'import', 'build'] as const
export type CheatCategory = (typeof CHEAT_CATEGORIES)[number]

export interface CheatCode {
  /** File name the script should get in Unity (class name must match). */
  file: string
  text: string
}

export interface CheatEntry {
  id: string
  title: string
  category: CheatCategory
  perspectives: Perspective[]
  level: 1 | 2 | 3
  /** One or two sentences: what this is and when you need it. */
  summary: string
  /** Click-by-click instructions. */
  steps: string[]
  code: CheatCode[]
  /** Typical mistakes and how to spot them. */
  pitfalls: string[]
  /** Official documentation (https://docs.unity3d.com/...). */
  docs: string[]
}
