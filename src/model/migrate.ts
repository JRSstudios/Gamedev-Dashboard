import { CURRENT_VERSION, DataSchema, type Data } from './schema'

export class DataError extends Error {}

/**
 * Parses untrusted JSON (a data file or an import) into current-version data.
 * Add a `case` per old version when the schema changes; never mutate in place.
 */
export function parseData(json: string): Data {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new DataError('Not valid JSON')
  }
  return migrate(raw)
}

export function migrate(raw: unknown): Data {
  if (typeof raw !== 'object' || raw === null || !('version' in raw)) {
    throw new DataError('Missing version field')
  }
  const version = (raw as { version: unknown }).version
  if (typeof version === 'number' && version > CURRENT_VERSION) {
    throw new DataError(`Data was written by a newer app version (v${version})`)
  }
  // Future: if (version === 1) raw = v1ToV2(raw)
  const result = DataSchema.safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new DataError(`Invalid data at ${issue?.path.join('.') ?? '?'}: ${issue?.message ?? ''}`)
  }
  return result.data
}
