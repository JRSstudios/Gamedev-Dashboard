import type { Object3D } from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { LoadingManager } from 'three'
import { readModelFile } from '../../platform'

export const VIEWABLE = ['glb', 'gltf', 'fbx', 'obj'] as const
export const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

export type ModelSource =
  | { kind: 'desktop'; path: string }
  | { kind: 'blob'; blob: Blob; name: string }

const dirOf = (path: string) => path.replace(/[\\/][^\\/]*$/, '')

/**
 * A .gltf references buffers and textures by relative path. They are read up front through Rust
 * (restricted to the model's folder) and handed to three.js as blob URLs.
 */
async function gltfResources(json: string, modelPath: string): Promise<{ map: Map<string, string>; urls: string[] }> {
  const map = new Map<string, string>()
  const urls: string[] = []
  let doc: { buffers?: { uri?: string }[]; images?: { uri?: string }[] }
  try {
    doc = JSON.parse(json)
  } catch {
    return { map, urls }
  }
  const refs = [...(doc.buffers ?? []), ...(doc.images ?? [])].map((x) => x.uri).filter((u): u is string => !!u && !/^(data|blob):/.test(u))
  for (const ref of new Set(refs)) {
    const bytes = await readModelFile(`${dirOf(modelPath)}/${decodeURIComponent(ref)}`, modelPath)
    const url = URL.createObjectURL(new Blob([bytes]))
    map.set(ref, url)
    urls.push(url)
  }
  return { map, urls }
}

/** Loads a model into a three.js object. The returned cleanup revokes temporary blob URLs. */
export async function loadModel(source: ModelSource): Promise<{ object: Object3D; cleanup: () => void }> {
  const name = source.kind === 'desktop' ? source.path : source.name
  const ext = extOf(name)
  const buffer = source.kind === 'desktop' ? await readModelFile(source.path) : await source.blob.arrayBuffer()
  const manager = new LoadingManager()
  let urls: string[] = []

  if (ext === 'gltf' && source.kind === 'desktop') {
    const res = await gltfResources(new TextDecoder().decode(buffer), source.path)
    urls = res.urls
    manager.setURLModifier((url) => {
      const key = [...res.map.keys()].find((k) => url.endsWith(k))
      return key ? (res.map.get(key) as string) : url
    })
  }
  const cleanup = () => urls.forEach((u) => URL.revokeObjectURL(u))

  try {
    if (ext === 'glb' || ext === 'gltf') {
      const gltf = await new GLTFLoader(manager).parseAsync(ext === 'gltf' ? new TextDecoder().decode(buffer) : buffer, '')
      return { object: gltf.scene, cleanup }
    }
    if (ext === 'fbx') return { object: new FBXLoader(manager).parse(buffer, ''), cleanup }
    if (ext === 'obj') return { object: new OBJLoader(manager).parse(new TextDecoder().decode(buffer)), cleanup }
  } catch (e) {
    cleanup()
    throw e
  }
  cleanup()
  throw new Error(`unsupported: .${ext}`)
}
