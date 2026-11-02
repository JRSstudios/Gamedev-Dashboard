import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { projectToMarkdown } from './markdown'
import { DataError, migrate, parseData } from './migrate'
import {
  addAssets,
  addGoal,
  addNote,
  addProject,
  addSteps,
  deleteProject,
  extractTags,
  guessKind,
  moveAsset,
  newAsset,
  reorderGoals,
  toggleStep,
} from './ops'
import { goalProgress, projectProgress, totalProgress } from './progress'
import { emptyData, type Data } from './schema'
import { IndexedDbAdapter } from '../storage/indexedDb'

function seeded(): { data: Data; projectId: string } {
  const { data, project } = addProject(emptyData(), 'Space Game')
  return { data, projectId: project.id }
}

describe('progress', () => {
  it('counts 3 goals x 4 steps with 5 done', () => {
    let { data } = seeded()
    const projectId = data.projects[0].id
    for (const name of ['A', 'B', 'C']) {
      data = addGoal(data, projectId, name)
      const goal = data.goals.at(-1)!
      data = addSteps(data, goal.id, ['1', '2', '3', '4'])
    }
    const steps = data.goals.flatMap((g) => g.steps.map((s) => [g.id, s.id] as const))
    for (const [g, s] of steps.slice(0, 5)) data = toggleStep(data, g, s)
    expect(projectProgress(data, projectId)).toEqual({ done: 5, total: 12, pct: 42 })
    expect(totalProgress(data).done).toBe(5)
    expect(goalProgress(data.goals[0]).pct).toBe(100)
  })

  it('ignores archived goals and empty goals', () => {
    let { data, projectId } = seeded()
    data = addGoal(data, projectId, 'Empty')
    expect(projectProgress(data, projectId).pct).toBe(0)
  })
})

describe('ops', () => {
  it('extracts unique lowercase tags', () => {
    expect(extractTags('Raycasts #Unity for ground #unity #fix_1')).toEqual(['unity', 'fix_1'])
    expect(extractTags('no#tag here')).toEqual([])
  })

  it('classifies files by extension', () => {
    expect(guessKind('theme.MP3')).toBe('audio')
    expect(guessKind('hero.png')).toBe('image')
    expect(guessKind('readme')).toBe('other')
  })

  it('reorders goals and moves assets between categories', () => {
    let { data, projectId } = seeded()
    data = addGoal(addGoal(data, projectId, 'one'), projectId, 'two')
    data = reorderGoals(data, data.goals[1].id, data.goals[0].id)
    expect(data.goals.map((g) => g.title)).toEqual(['two', 'one'])

    const a = newAsset(projectId, 'a.png', '/x/a.png')
    const b = newAsset(projectId, 'b.mp3', '/x/b.mp3')
    data = addAssets(data, [a, b])
    expect(a.category).toBe('concept')
    data = moveAsset(data, a.id, 'sfx', b.id)
    expect(data.assets.map((x) => [x.name, x.category])).toEqual([['a.png', 'sfx'], ['b.mp3', 'music']])
  })

  it('deleting a project removes its content only', () => {
    let { data, projectId } = seeded()
    const other = addProject(data, 'Other')
    data = other.data
    data = addNote(addGoal(data, projectId, 'g'), projectId, 'hello #x', null)
    data = addNote(data, other.project.id, 'keep', null)
    data = deleteProject(data, projectId)
    expect(data.goals).toHaveLength(0)
    expect(data.notes.map((n) => n.text)).toEqual(['keep'])
  })

  it('ignores blank notes', () => {
    const { data, projectId } = seeded()
    expect(addNote(data, projectId, '   ', null)).toBe(data)
  })
})

describe('migrate', () => {
  it('round-trips export and import', () => {
    let { data, projectId } = seeded()
    data = addNote(addGoal(data, projectId, 'g'), projectId, 'n #t', null)
    expect(parseData(JSON.stringify(data))).toEqual(data)
  })

  it('rejects garbage, newer versions and bad shapes', () => {
    expect(() => parseData('{nope')).toThrow(DataError)
    expect(() => migrate({ version: 99 })).toThrow(/newer/)
    expect(() => migrate({ version: 1, projects: 'x' })).toThrow(DataError)
    expect(() => migrate(null)).toThrow(DataError)
  })

  it('rejects hostile values', () => {
    const { data } = seeded()
    const bad = { ...data, projects: [{ ...data.projects[0], color: 'red;background:url(x)' }] }
    expect(() => migrate(bad)).toThrow(DataError)
  })
})

describe('markdown export', () => {
  it('lists goals, assets and notes and escapes table cells', () => {
    let { data, projectId } = seeded()
    data = addGoal(data, projectId, 'Ship')
    data = addSteps(data, data.goals[0].id, ['Build'])
    data = addAssets(data, [newAsset(projectId, 'a|b.png', 'C:\\art\\a|b.png')])
    const md = projectToMarkdown(data, projectId)
    expect(md).toContain('# Space Game')
    expect(md).toContain('- [ ] Build')
    expect(md).toContain('a\\|b.png')
  })
})

describe('IndexedDbAdapter', () => {
  it('persists and backs up only valid data', async () => {
    const adapter = new IndexedDbAdapter()
    expect(await adapter.load()).toBeNull()
    const json = JSON.stringify(emptyData())
    await adapter.save(json)
    expect(await adapter.load()).toBe(json)
  })
})
