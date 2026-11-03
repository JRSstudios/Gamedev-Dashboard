/** Splits an assistant answer into readable text and the trailing ```json block with proposed actions. */
export function splitAnswer(text: string): { text: string; json: unknown } {
  const m = /```json\s*\n([\s\S]*?)```\s*$/.exec(text.trim())
  if (!m) return { text, json: null }
  try {
    return { text: text.trim().slice(0, m.index).trim(), json: JSON.parse(m[1]) }
  } catch {
    return { text, json: null }
  }
}
