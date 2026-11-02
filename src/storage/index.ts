import { isTauri, type StorageAdapter } from './adapter'
import { IndexedDbAdapter } from './indexedDb'
import { TauriFileAdapter } from './tauriFile'

export const createAdapter = (): StorageAdapter =>
  isTauri() ? new TauriFileAdapter() : new IndexedDbAdapter()
