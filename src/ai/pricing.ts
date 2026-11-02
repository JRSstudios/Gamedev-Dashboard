/**
 * Prices in US dollars per million tokens, from Anthropic's model overview (checked 2026-11).
 * Shown as an estimate only: the bill on the Anthropic console is what counts.
 * Cache writes (5-minute TTL) cost 1.25x the input price.
 */
interface Price {
  input: number
  output: number
  cacheRead: number
}

const PRICES: Record<string, Price> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  // Prompts up to 100K tokens; this app never sends more.
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
}

/** Model ids in responses can carry a date suffix; match on the family prefix. */
export function priceFor(model: string): Price | null {
  const key = Object.keys(PRICES).find((k) => model === k || model.startsWith(`${k}-`))
  return key ? PRICES[key] : null
}

export interface TokenCounts {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

/** Estimated cost in dollars, or null for a model without a known price. */
export function estimateCost(model: string, t: TokenCounts): number | null {
  const p = priceFor(model)
  if (!p) return null
  return (t.input * p.input + t.output * p.output + t.cacheRead * p.cacheRead + t.cacheWrite * p.input * 1.25) / 1_000_000
}

export const formatUsd = (usd: number): string => (usd < 0.01 && usd > 0 ? '< $0.01' : `$${usd.toFixed(2)}`)
