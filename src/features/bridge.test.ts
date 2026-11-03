import { describe, expect, it } from 'vitest'
import { addProject, updateIntegrations } from '../model/ops'
import { emptyData } from '../model/schema'
import type { BridgeEvent } from '../platform'
import { planExport } from './autoImport'
import { applyEvent, bridgeConfig, isConnected, pathKey, type BridgeState } from './bridge'

const empty: BridgeState = { seen: {}, unityLogs: [], compileErrors: null, scenes: [], checks: {}, exports: 0 }
const ev = (app: BridgeEvent['app'], type: string, data: Record<string, unknown>, at = 100): BridgeEvent => ({ app, type, data, at })

describe('bridge events', () => {
  it('keeps Unity errors newest first and bounded', () => {
    let s = empty
    for (let i = 0; i < 120; i++) s = applyEvent(s, ev('unity', 'log', { level: 'error', message: `e${i}`, stack: '' }, i))
    expect(s.unityLogs).toHaveLength(100)
    expect(s.unityLogs[0].message).toBe('e119')
    expect(s.seen.unity).toBe(119)
  })

  it('stores model checks by exported path and counts exports', () => {
    const s = applyEvent(empty, ev('blender', 'exported', { path: 'C:\\Exports\\Ship.fbx', triangles: 1200, objects: 2, issueCodes: [{ code: 'scale', object: 'Hull' }] }))
    expect(s.exports).toBe(1)
    expect(s.checks[pathKey('c:/exports/ship.fbx')]).toMatchObject({ triangles: 1200, issues: [{ code: 'scale', object: 'Hull' }] })
  })

  it('ignores malformed data', () => {
    const s = applyEvent(empty, ev('unity', 'scenes', { buildScenes: 'nope' }))
    expect(s.scenes).toEqual([])
    expect(applyEvent(empty, ev('unity', 'compiled', { errors: 'x' })).compileErrors).toBe(0)
  })

  it('counts a plugin as connected only for a short time', () => {
    expect(isConnected({ blender: 100 }, 'blender', 105)).toBe(true)
    expect(isConnected({ blender: 100 }, 'blender', 200)).toBe(false)
    expect(isConnected({}, 'krita', 100)).toBe(false)
  })
})

describe('auto import', () => {
  const setup = (auto: boolean) => {
    const { data, project } = addProject(emptyData(), 'Game')
    return { data: updateIntegrations(data, project.id, { autoImport: auto, blenderExportDir: 'C:/Exports' }), id: project.id }
  }

  it('only notifies when auto import is off', () => {
    const { data, id } = setup(false)
    expect(planExport(data, id, ev('blender', 'exported', { path: 'C:/Exports/ship.fbx' })).outcome).toBe('notified')
  })

  it('adds a new export once and refreshes it on the next export', () => {
    const { data, id } = setup(true)
    const first = planExport(data, id, ev('blender', 'exported', { path: 'C:/Exports/ship.fbx' }))
    expect(first.outcome).toBe('added')
    expect(first.next.assets[0]).toMatchObject({ name: 'ship.fbx', category: 'model', projectId: id })
    const again = planExport(first.next, id, ev('blender', 'exported', { path: 'c:\\exports\\SHIP.fbx' }))
    expect(again.outcome).toBe('updated')
    expect(again.next.assets).toHaveLength(1)
  })

  it('files Krita exports as concept art and ignores other events', () => {
    const { data, id } = setup(true)
    expect(planExport(data, id, ev('krita', 'exported', { path: 'C:/Art/fox.png' })).next.assets[0].category).toBe('concept')
    expect(planExport(data, id, ev('unity', 'log', { message: 'x' })).outcome).toBe('ignored')
    expect(planExport(data, null, ev('blender', 'exported', { path: 'a.fbx' })).outcome).toBe('ignored')
  })
})

describe('plugin config', () => {
  it('passes export folders and Unity folders', () => {
    const { data, project } = addProject(emptyData(), 'Game')
    const p = updateIntegrations(data, project.id, { kritaDir: 'C:/Art', pixelArt: true }).projects[0]
    const c = bridgeConfig(p) as { unity: { pixelArt: boolean; folders: Record<string, string> }; krita: { exportDir: string } }
    expect(c.krita.exportDir).toBe('C:/Art')
    expect(c.unity.pixelArt).toBe(true)
    expect(c.unity.folders.model).toMatch(/^Assets\//)
  })
})
