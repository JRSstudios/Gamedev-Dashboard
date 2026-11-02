/** Translated texts of one cheat sheet entry. Code and docs links are shared by all languages. */
export interface CheatText {
  title: string
  summary: string
  steps: string[]
  pitfalls: string[]
}

/** Entry id → translated texts. */
export type CheatLocale = Record<string, CheatText>
