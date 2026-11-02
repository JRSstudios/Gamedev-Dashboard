import { invoke } from '@tauri-apps/api/core'
import type { StorageAdapter } from './adapter'

/** Desktop backend: data.json in the app data dir, written atomically by the Rust side. */
export class TauriFileAdapter implements StorageAdapter {
  load(): Promise<string | null> {
    return invoke<string | null>('load_data')
  }

  save(json: string): Promise<void> {
    return invoke('save_data', { contents: json })
  }
}
