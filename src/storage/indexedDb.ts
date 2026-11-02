import { createStore, del, get, set } from 'idb-keyval'
import { parseData } from '../model/migrate'
import type { StorageAdapter } from './adapter'

const DATA_KEY = 'data'
const BACKUP_KEY = 'data.backup'

const getStore = () => createStore('gamedev-dashboard', 'kv')

/** Browser backend. A single `put` is atomic in IndexedDB. */
export class IndexedDbAdapter implements StorageAdapter {
  private store = getStore()

  async load(): Promise<string | null> {
    const json = await get<string>(DATA_KEY, this.store)
    if (!json) return null
    try {
      parseData(json)
      await set(BACKUP_KEY, json, this.store) // only back up data that is known-good
    } catch {
      /* keep the previous backup */
    }
    return json
  }

  async save(json: string): Promise<void> {
    await set(DATA_KEY, json, this.store)
  }
}

/** Binary files added in the browser demo (there are no real paths in a browser). */
const blobStore = () => createStore('gamedev-dashboard-blobs', 'kv')
export const MAX_DEMO_FILE_BYTES = 20 * 1024 * 1024

export const putBlob = (id: string, file: Blob) => set(id, file, blobStore())
export const getBlob = (id: string) => get<Blob>(id, blobStore())
export const deleteBlob = (id: string) => del(id, blobStore())
