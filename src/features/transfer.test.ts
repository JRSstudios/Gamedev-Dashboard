import { describe, expect, it } from 'vitest'
import { addProject, updateIntegrations } from '../model/ops'
import { emptyData } from '../model/schema'
import { sendToBlender, sendToUnity, unitySubFolder } from './transfer'

function project() {
  const { data, project } = addProject(emptyData(), 'Game')
  return { data, id: project.id }
}

describe('unity folder mapping', () => {
  it('uses defaults and lets the user override a category', () => {
    let { data, id } = project()
    expect(unitySubFolder(data.projects[0], 'music')).toBe('Assets/Audio/Music')
    data = updateIntegrations(data, id, { unityMap: { music: 'Assets/Sound/BGM', sfx: '  ' } })
    expect(unitySubFolder(data.projects[0], 'music')).toBe('Assets/Sound/BGM')
    expect(unitySubFolder(data.projects[0], 'sfx')).toBe('Assets/Audio/SFX')
    expect(unitySubFolder(data.projects[0], 'unknown')).toBe('Assets')
  })
})

describe('transfer guards (no copy happens without a linked folder or a real file)', () => {
  it('reports browser-only files and missing links', async () => {
    const { data } = project()
    const p = data.projects[0]
    expect(await sendToUnity(p, null)).toEqual({ ok: false, reason: 'browserFile' })
    expect(await sendToBlender(p, 'D:/art/hero.fbx')).toEqual({ ok: false, reason: 'notLinked' })
    expect(await sendToUnity(p, 'D:/art/hero.png')).toEqual({ ok: false, reason: 'notLinked' })
  })
})
