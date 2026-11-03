import { describe, expect, it } from 'vitest'
import { addAssets, addProject, newAsset, addNote } from './ops'
import { emptyData } from './schema'
import { applySmart, dataProposals, profileUnity, recommendedCheats, suggestSteps, suggestTableTemplate, suggestTags, unityProposals, type SmartTexts } from './smart'

const tx: SmartTexts = {
  folderGoal: 'Folders', folderStep: (f) => `Create ${f}`, inputGoal: 'Input', inputSteps: ['Install'],
  scriptsTable: 'Scripts', scenesTable: 'Scenes', assetsTable: 'Assets',
  colScript: 'Script', colFolder: 'Folder', colScene: 'Scene', colStatus: 'Status', colAsset: 'Asset', colCategory: 'Category', colDone: 'Done',
  statuses: ['Todo', 'WIP', 'Done'], todoNote: (f, items) => `${f}: ${items.join('; ')}`,
  reasons: { folders: 'f', input: 'i', scripts: 's', scenes: 'c', assets: 'a', todo: 't', cheats: 'Recommended' },
}

const scan2d = {
  packages: ['com.unity.feature.2d', 'com.unity.render-pipelines.universal'],
  files: ['Assets/Scripts/Player.cs', 'Assets/Scripts/Enemy.cs', 'Assets/Scripts/UI/Hud.cs', 'Assets/Scenes/Menu.unity', 'Assets/Scenes/Level1.unity', 'Assets/Art/hero.png', 'Assets/Art/Tiles/grass_tile.png'],
  todos: [{ file: 'Assets/Scripts/Player.cs', line: 3, text: 'coyote time' }],
}

describe('smart suggestions', () => {
  it('profiles a 2D Unity project', () => {
    const p = profileUnity(scan2d)
    expect(p).toMatchObject({ perspective: '2d', pipeline: 'urp', has: { inputSystem: false, tilemap: true } })
    expect(p.counts).toMatchObject({ scripts: 3, scenes: 2, sprites: 2 })
    expect(p.missingFolders).toEqual(['Prefabs', 'Audio', 'Materials'])
    expect(recommendedCheats(p)).toContain('input-setup')
    expect(recommendedCheats(p)).toContain('move-2d-platformer')
  })

  it('proposes goals, filled tables and notes and applies them', () => {
    const items = unityProposals(profileUnity({ ...scan2d, files: [...scan2d.files, 'Assets/Models/ship.fbx'] }), tx)
    expect(items.map((i) => i.kind)).toEqual(['goal', 'goal', 'table', 'table', 'note', 'cheats'])
    const created = addProject(emptyData(), 'G')
    let d = created.data
    for (const item of items) d = applySmart(d, created.project.id, item, 'en')
    const scripts = d.tables.find((t) => t.name === 'Scripts')!
    expect(scripts.rows).toHaveLength(3)
    expect(Object.values(scripts.rows[0].cells)).toEqual(['Player', 'Scripts', 'WIP'])
    expect(d.notes[0].text).toBe('Player: coyote time')
    expect(d.goals.length).toBe(3)
  })

  it('proposes an asset table from the project', () => {
    const created = addProject(emptyData(), 'G')
    const d = addAssets(created.data, ['a.png', 'b.png', 'c.wav', 'd.fbx', 'e.png'].map((n) => newAsset(created.project.id, n, `C:/${n}`)))
    expect(dataProposals(d, created.project.id, tx)[0]).toMatchObject({ kind: 'table', table: { name: 'Assets' } })
  })

  it('autofills steps, table templates and tags', () => {
    const created = addProject(emptyData(), 'G')
    const steps = suggestSteps(created.data, created.project.id, 'coyote time jump buffer', 'en')
    expect(steps?.cheatId).toBe('move-2d-platformer')
    expect(steps?.steps.length).toBeGreaterThan(2)
    expect(suggestSteps(created.data, created.project.id, 'xyz', 'en')).toBeNull()
    expect(suggestTableTemplate('Bug-Liste')).toBe('tasks')
    expect(suggestTableTemplate('Gegner')).toBe('characters')
    expect(suggestTableTemplate('Shopping')).toBeNull()
    const d = addNote(created.data, created.project.id, 'boss fight #combat', null)
    expect(suggestTags(d, created.project.id, 'The combat feels broken, maybe more sound')).toEqual(['combat', 'bug', 'idea', 'audio'])
  })
})
