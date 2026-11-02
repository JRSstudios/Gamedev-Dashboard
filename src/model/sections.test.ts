import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import {
  addAssets,
  addProject,
  addResearch,
  deleteProject,
  guessCategory,
  newLink,
  updateIntegrations,
} from './ops'
import { emptyData } from './schema'

const base = () => {
  const { data, project } = addProject(emptyData(), 'Game')
  return { data, id: project.id }
}

describe('inspiration links', () => {
  it('accepts http(s) and derives a title from the host', () => {
    const link = newLink('p', 'https://www.example.com/path', '')
    expect(link?.kind).toBe('link')
    expect(link?.name).toBe('example.com')
    expect(link?.category).toBe('inspiration')
  })

  it('rejects other schemes', () => {
    for (const url of ['javascript:alert(1)', 'file:///C:/secret.txt', 'data:text/html,hi', 'not a url', '']) {
      expect(newLink('p', url, 'x')).toBeNull()
    }
  })

  it('refuses a stored non-http url when loading data', () => {
    const { data, id } = base()
    const bad = addAssets(data, [{ ...newLink(id, 'https://a.b', 'x')!, url: 'javascript:alert(1)' }])
    expect(() => migrate(JSON.parse(JSON.stringify(bad)))).toThrow()
  })
})

describe('research', () => {
  it('adds entries, drops non-http sources and removes them with the project', () => {
    let { data, id } = base()
    data = addResearch(data, id, {
      title: '',
      body: 'Coyote time basics\nmore',
      sources: [
        { title: 'ok', url: 'https://gdc.example/talk' },
        { title: 'bad', url: 'javascript:alert(1)' },
      ],
    })
    expect(data.research[0].title).toBe('Coyote time basics')
    expect(data.research[0].sources).toHaveLength(1)
    expect(addResearch(data, id, { title: ' ', body: ' ' })).toBe(data)
    expect(deleteProject(data, id).research).toHaveLength(0)
  })
})

describe('schema additions are backward compatible', () => {
  it('loads a file written before research, integrations and claude settings existed', () => {
    const old = JSON.parse(JSON.stringify(emptyData()))
    delete old.research
    delete old.settings.claude
    old.projects = [{ id: 'p', name: 'Old', color: '#6366f1', archived: false, createdAt: '2026-01-01T00:00:00Z' }]
    old.assets = [{ id: 'a', projectId: 'p', kind: 'image', path: 'C:/a.png', name: 'a.png', category: 'concept', tags: [], note: '', addedAt: '2026-01-01T00:00:00Z' }]
    const data = migrate(old)
    expect(data.research).toEqual([])
    expect(data.projects[0].integrations.unityDir).toBeNull()
    expect(data.assets[0].url).toBeNull()
    expect(data.settings.claude.enabled).toBe(false)
  })

  it('stores integration folders per project', () => {
    let { data, id } = base()
    data = updateIntegrations(data, id, { unityDir: 'D:/Unity/Game' })
    expect(data.projects[0].integrations.unityDir).toBe('D:/Unity/Game')
    expect(data.projects[0].integrations.blenderDir).toBeNull()
  })

  it('routes models to their own category', () => {
    expect(guessCategory('model')).toBe('model')
  })
})
