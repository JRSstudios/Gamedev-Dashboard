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
export default function ModelViewer({ source, wireframe, dark, autoRotate = false, bare = false }: { source: ModelSource | null; wireframe: boolean; dark: boolean; autoRotate?: boolean; bare?: boolean }) {
  const t = useT()
  const host = useRef<HTMLDivElement>(null)
  const ctx = useRef<{ renderer: WebGLRenderer; scene: Scene; camera: PerspectiveCamera; controls: OrbitControls; grid: GridHelper; model: Object3D | null; resetPan: () => void } | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  // One renderer for the lifetime of the viewer.
  useEffect(() => {
    const el = host.current
    if (!el) return
    const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)
    const scene = new Scene()
    const camera = new PerspectiveCamera(45, 1, 0.01, 1000)
    camera.position.set(3, 2, 4)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    // OrbitControls' pan moves the pivot along with the view, so the model would then swing around a
    // point beside it. Instead the picture is shifted (view offset) and the pivot stays in the model.
    controls.enablePan = false
    const pan = { x: 0, y: 0, active: false, lastX: 0, lastY: 0 }
    const applyPan = () => {
      const w = el.clientWidth || 1
      const h = el.clientHeight || 1
      if (pan.x === 0 && pan.y === 0) camera.clearViewOffset()
      else camera.setViewOffset(w, h, -pan.x, -pan.y, w, h)
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 2 && !(e.button === 0 && (e.shiftKey || e.ctrlKey))) return
      pan.active = true
      pan.lastX = e.clientX
      pan.lastY = e.clientY
      controls.enabled = false
      renderer.domElement.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!pan.active) return
      pan.x += e.clientX - pan.lastX
      pan.y += e.clientY - pan.lastY
      pan.lastX = e.clientX
      pan.lastY = e.clientY
      applyPan()
    }
    const onUp = () => {
      pan.active = false
      controls.enabled = true
    }
    const noMenu = (e: Event) => e.preventDefault()
    renderer.domElement.addEventListener('pointerdown', onDown, { capture: true })
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('contextmenu', noMenu)
    scene.add(new HemisphereLight(0xffffff, 0x444455, 1.6))
    scene.add(new AmbientLight(0xffffff, 0.4))
    const sun = new DirectionalLight(0xffffff, 2.2)
    sun.position.set(5, 10, 7)
    scene.add(sun)
    const grid = new GridHelper(10, 20, 0x888888, 0xcccccc)
    scene.add(grid)
    ctx.current = { renderer, scene, camera, controls, grid, model: null, resetPan: () => ((pan.x = 0), (pan.y = 0), applyPan()) }

    const resize = () => {
      const w = el.clientWidth || 1
      const h = el.clientHeight || 1
      renderer.setSize(w, h)
      camera.aspect = w / h
      applyPan()
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
      renderer.domElement.removeEventListener('pointerdown', onDown, { capture: true })
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('contextmenu', noMenu)
      controls.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      ctx.current = null
    }
  }, [])

  useEffect(() => {
    const c = ctx.current
    if (!c) return
    c.scene.background = bare ? null : new Color(dark ? 0x1b1e26 : 0xf3f4f7)
    c.grid.visible = !bare
  }, [dark, bare])

  useEffect(() => {
    const c = ctx.current
    if (!c) return
    c.controls.autoRotate = autoRotate
    c.controls.autoRotateSpeed = 2
  }, [autoRotate])

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
        c.resetPan()
        c.camera.updateProjectionMatrix()
        setStatus('idle')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        // Do not leave the previous model on screen behind the error message.
        if (c.model) c.scene.remove(c.model)
        c.model = null
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
