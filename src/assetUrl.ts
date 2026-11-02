import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import type { Asset } from './model/schema'
import { IS_DESKTOP } from './platform'
import { getBlob } from './storage/indexedDb'

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
}

/** Loads the bytes of an asset as a Blob (desktop: via Rust, which restricts type and size). */
export async function loadAssetBlob(asset: Asset): Promise<Blob | null> {
  try {
    if (!IS_DESKTOP || !asset.path) return (await getBlob(asset.id)) ?? null
    const ext = asset.path.split('.').pop()?.toLowerCase() ?? ''
    const mime = MIME[ext]
    if (!mime) return null
    const bytes = await invoke<ArrayBuffer>('read_preview', { path: asset.path })
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

/** Object URL for an image asset's thumbnail; revoked automatically. */
export function useImageUrl(asset: Asset): string | null {
  const [url, setUrl] = useState<string | null>(null)
  const key = asset.kind === 'image' ? `${asset.id}|${asset.path}` : null
  useEffect(() => {
    if (!key) return
    let objectUrl: string | null = null
    let cancelled = false
    void loadAssetBlob(asset).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures id + path
  }, [key])
  return url
}
