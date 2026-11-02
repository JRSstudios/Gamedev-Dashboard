import { useEffect, useRef, useState } from 'react'
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useT } from '../../i18n'
import { loadModel, type ModelSource } from './loadModel'

const materialsOf = (m: Mesh): Material[] => (Array.isArray(m.material) ? m.material : [m.material])

/** Interactive 3D preview: drag to rotate, wheel to zoom, right-drag to pan. */
export default function ModelViewer({ source, wireframe, dark }: { source: ModelSource | null; wireframe: boolean; dark: boolean }) {
  const t = useT()
  const host = useRef<HTMLDivElement>(null)
  const ctx = useRef<{ renderer: WebGLRenderer; scene: Scene; camera: PerspectiveCamera; controls: OrbitControls; grid: GridHelper; model: Object3D | null } | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  // One renderer for the lifetime of the viewer.
  useEffect(() => {
    const el = host.current
    if (!el) return
    const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)
    const scene = new Scene()
    const camera = new PerspectiveCamera(45, 1, 0.01, 1000)
    camera.position.set(3, 2, 4)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    scene.add(new HemisphereLight(0xffffff, 0x444455, 1.6))
    scene.add(new AmbientLight(0xffffff, 0.4))
    const sun = new DirectionalLight(0xffffff, 2.2)
    sun.position.set(5, 10, 7)
    scene.add(sun)
    const grid = new GridHelper(10, 20, 0x888888, 0xcccccc)
    scene.add(grid)
    ctx.current = { renderer, scene, camera, controls, grid, model: null }

    const resize = () => {
      const w = el.clientWidth || 1
      const h = el.clientHeight || 1
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    resize()
    let frame = 0
    const loop = () => {
      controls.update()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      ctx.current = null
    }
  }, [])

  useEffect(() => {
    const c = ctx.current
    if (!c) return
    c.scene.background = new Color(dark ? 0x1b1e26 : 0xf3f4f7)
  }, [dark])

  useEffect(() => {
    const c = ctx.current
    if (!c || !source) return
    let cancelled = false
    let cleanup = () => {}
    setStatus('loading')
    void loadModel(source)
      .then((res) => {
        cleanup = res.cleanup
        if (cancelled) return
        if (c.model) c.scene.remove(c.model)
        // Some exports (OBJ, minimal glTF) carry no normals; without them every face renders black.
        res.object.traverse((o) => {
          const mesh = o as Mesh
          if (mesh.isMesh && !mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals()
        })
        c.model = res.object
        c.scene.add(res.object)
        // Frame the model: centre it on the grid and move the camera to fit its size.
        const box = new Box3().setFromObject(res.object)
        const size = box.getSize(new Vector3())
        const centre = box.getCenter(new Vector3())
        const radius = Math.max(size.x, size.y, size.z, 0.001)
        res.object.position.sub(new Vector3(centre.x, box.min.y, centre.z))
        c.grid.scale.setScalar(Math.max(radius / 5, 0.2))
        c.controls.target.set(0, size.y / 2, 0)
        c.camera.near = radius / 1000
        c.camera.far = radius * 100
        c.camera.position.set(radius * 1.6, size.y / 2 + radius * 0.8, radius * 2.1)
        c.camera.updateProjectionMatrix()
        setStatus('idle')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      })
    return () => {
      cancelled = true
      cleanup()
    }
  }, [source])

  useEffect(() => {
    ctx.current?.model?.traverse((o) => {
      if ((o as Mesh).isMesh) for (const m of materialsOf(o as Mesh)) (m as Material & { wireframe?: boolean }).wireframe = wireframe
    })
  }, [wireframe, status])

  return (
    <div className="model-viewer" ref={host}>
      {status === 'loading' && <div className="viewer-msg muted">{t('modelsLoading')}</div>}
      {status === 'error' && <div className="viewer-msg warn">{t('modelsError', { reason: error })}</div>}
      {!source && <div className="viewer-msg muted">{t('modelsPick')}</div>}
    </div>
  )
}
