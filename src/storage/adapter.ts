/**
 * Persistence boundary. Adapters move raw JSON strings only; validation and
 * migration live in `model/migrate.ts` so every backend behaves identically.
 */
export interface StorageAdapter {
  /** Returns the stored JSON, or null on first run. Also takes a backup of a healthy file. */
  load(): Promise<string | null>
  /** Must be atomic: a crash mid-write may never leave a half-written file. */
  save(json: string): Promise<void>
}

export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
