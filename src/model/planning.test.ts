import { describe, expect, it } from 'vitest'
import { availableBetween, deadlineRisks, gamedevMinutes, plan, setException, setWeekly, AVAILABILITY_TEMPLATES } from './availability'
import { classify, learn, tokens } from './classify'
import { addGoal, addProject, addAssets, moveAsset, newAsset, updateAsset } from './ops'
import { emptyData, type Data } from './schema'
import { suggestions } from './suggest'

describe('classifier', () => {
  it('splits file names into words', () => {
    expect(tokens('HeroJump_SFX-02.wav')).toEqual(['hero', 'jump', 'sfx'])
  })

  it('uses file type, keywords, folders and audio length', () => {
    expect(classify('ship.fbx', 'model').category).toBe('model')
    expect(classify('jump_01.wav', 'audio')).toMatchObject({ category: 'sfx', reason: 'jump' })
    expect(classify('boss_theme.ogg', 'audio').category).toBe('music')
    expect(classify('a.png', 'image', 'C:/Art/Moodboard/a.png').category).toBe('inspiration')
    expect(classify('take3.wav', 'audio', '', {}, { duration: 1.2 }).category).toBe('sfx')
    expect(classify('キャラ_コンセプト.png', 'image').category).toBe('concept')
  })

  it('learns from corrections and prefers learned words', () => {
    const learned = learn({}, 'castle_photo.png', 'concept')
    expect(learned).toMatchObject({ castle: 'concept', photo: 'concept' })
    expect(classify('photo_street.png', 'image', '', learned).category).toBe('concept')
  })

  it('learns when the user moves or edits an asset category', () => {
    const { data, project } = addProject(emptyData(), 'G')
    const asset = newAsset(project.id, 'forest_ambience.wav', 'C:/x/forest_ambience.wav', 'sfx')
    let d = addAssets(data, [asset])
    d = moveAsset(d, asset.id, 'music', null)
    expect(d.settings.learned.forest).toBe('music')
    d = updateAsset(d, asset.id, { category: 'sfx' })
    expect(d.settings.learned.ambience).toBe('sfx')
  })
})

const monday = new Date(2026, 10, 2) // 2 Nov 2026 is a Monday

function withWeek(): Data {
  return setWeekly(emptyData(), AVAILABILITY_TEMPLATES.fulltime())
}

describe('availability', () => {
  it('subtracts work that overlaps gamedev time', () => {
    expect(gamedevMinutes([{ from: '16:00', to: '20:00', kind: 'gamedev' }, { from: '15:00', to: '17:00', kind: 'work' }])).toBe(180)
    expect(gamedevMinutes([{ from: '22:00', to: '24:00', kind: 'gamedev' }])).toBe(120)
  })

  it('sums a week and a month and honours exceptions', () => {
    const d = withWeek()
    // 5 x 1.5 h + 3 h + 2 h
    expect(availableBetween(d.settings.availability, monday, new Date(2026, 10, 8)) / 60).toBe(12.5)
    const off = setException(d, '2026-11-03', [])
    expect(availableBetween(off.settings.availability, monday, new Date(2026, 10, 8)) / 60).toBe(11)
    const days = plan(off, null, new Date(2026, 10, 1), 30)
    expect(days).toHaveLength(30)
    expect(days.find((x) => x.key === '2026-11-03')?.available).toBe(0)
    expect(days.find((x) => x.key === '2026-11-02')?.work).toBe(540)
  })

  it('keeps wall-clock hours across the daylight saving change', () => {
    const d = setWeekly(emptyData(), AVAILABILITY_TEMPLATES.weekend())
    // 25 Oct 2026 is the last Sunday in October (clocks change in Europe)
    expect(availableBetween(d.settings.availability, new Date(2026, 9, 25), new Date(2026, 9, 25))).toBe(240)
  })

  it('flags goals whose estimate does not fit before the deadline', () => {
    let d = withWeek()
    const created = addProject(d, 'G')
    d = addGoal(created.data, created.project.id, 'Demo')
    const goal = d.goals[0]
    d = { ...d, goals: d.goals.map((g) => ({ ...g, deadline: '2026-11-08', estimateHours: 20 })) }
    const risks = deadlineRisks(d, created.project.id, monday)
    expect(risks).toHaveLength(1)
    expect(risks[0]).toMatchObject({ needed: 20, available: 12.5 })
    d = { ...d, goals: d.goals.map((g) => ({ ...g, estimateHours: 10 })) }
    expect(deadlineRisks(d, created.project.id, monday)).toHaveLength(0)
    expect(goal.estimateHours).toBeNull()
  })
})

describe('suggestions', () => {
  it('suggests steps, categories and hides dismissed hints', () => {
    const created = addProject(emptyData(), 'G')
    let d = addGoal(created.data, created.project.id, 'Menu')
    d = { ...d, goals: d.goals.map((g) => ({ ...g, createdAt: '2026-10-01T00:00:00Z' })) }
    d = addAssets(d, [newAsset(created.project.id, 'explosion_big.wav', 'C:/a/explosion_big.wav', 'music')])
    const list = suggestions(d, created.project.id, { now: monday })
    expect(list.map((s) => s.kind).sort()).toEqual(['category', 'noSteps'])
    expect(list.find((s) => s.kind === 'category')?.category).toBe('sfx')
    const dismissed = { ...d, projects: d.projects.map((p) => ({ ...p, inboxDismissed: list.map((s) => s.id) })) }
    expect(suggestions(dismissed, created.project.id, { now: monday })).toEqual([])
  })

  it('reports Unity errors and missing files from the context', () => {
    const created = addProject(emptyData(), 'G')
    const a = newAsset(created.project.id, 'x.png', 'C:/x.png', 'concept')
    const d = addAssets(created.data, [a])
    const list = suggestions(d, created.project.id, { now: monday, missing: new Set([a.id]), unityErrors: { count: 2, first: 'NullReferenceException' } })
    expect(list.map((s) => s.kind)).toEqual(['unityErrors', 'missing'])
  })
})

describe('templates', () => {
  it('installs every bundled template and removes it again', async () => {
    const { BUNDLED_TEMPLATES } = await import('../templates/bundled')
    const { installTemplate, uninstallTemplate } = await import('./templates')
    expect(BUNDLED_TEMPLATES.length).toBeGreaterThanOrEqual(5)
    for (const tpl of BUNDLED_TEMPLATES) {
      const created = addProject(emptyData(), 'G')
      const { data, install } = installTemplate(created.data, created.project.id, tpl)
      expect(data.goals.length).toBe(tpl.contents.goals.length)
      expect(data.pages.length).toBe(tpl.contents.pages.length)
      expect(data.tables.length).toBe(tpl.contents.tables.length)
      const back = uninstallTemplate(data, install.id)
      expect(back.goals).toEqual([])
      expect(back.pages).toEqual([])
      expect(back.tables).toEqual([])
      expect(back.installs).toEqual([])
    }
  })

  it('exports text only and rejects bad files', async () => {
    const { exportTemplate, parseTemplate } = await import('./templates')
    const created = addProject(emptyData(), 'My Game')
    let d = addGoal(created.data, created.project.id, 'Menu')
    d = addAssets(d, [newAsset(created.project.id, 'secret.png', 'C:/Users/me/secret.png', 'concept')])
    const tpl = exportTemplate(d, created.project.id, { goals: true, pages: true, tables: true, budgets: true }, { name: 'My Game', description: '', author: '' })
    expect(tpl.id).toBe('my-game')
    expect(JSON.stringify(tpl)).not.toContain('C:/Users')
    expect(parseTemplate(JSON.stringify(tpl)).contents.goals[0].title).toBe('Menu')
    expect(() => parseTemplate('{"format":"gdtemplate","formatVersion":1,"id":"../x","name":"x","contents":{}}')).toThrow()
    expect(() => parseTemplate(JSON.stringify({ ...tpl, contents: { ...tpl.contents, unityScripts: [{ file: '../evil.cs', text: '' }] } }))).toThrow()
  })
})

describe('markdown and csv import', () => {
  it('turns markdown into blocks', async () => {
    const { mdToBlocks, splitMarkdown, csvToTable } = await import('./importMd')
    const blocks = mdToBlocks('# Title\n\nSome **text**\nmore\n\n- a\n- b\n\n- [x] done\n- [ ] open\n\n> tip\n\n---\n')
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'checklist', 'callout', 'divider'])
    expect(splitMarkdown('---\ntitle: Hello\n---\nBody', 'x.md')).toEqual({ title: 'Hello', body: 'Body' })
    expect(splitMarkdown('Text', 'Level ideas 0123456789abcdef0123456789abcdef.md').title).toBe('Level ideas')
    const t = csvToTable('Name;Count;Done\n"A; b";2;yes\nC;3;no\n')
    expect(t.columns.map((c) => c.type)).toEqual(['text', 'number', 'checkbox'])
    expect(t.rows[0]).toEqual(['A; b', '2', true])
  })
})

describe('assistant answers', () => {
  it('separates text and proposed actions', async () => {
    const { splitAnswer } = await import('../ai/assistant')
    const r = splitAnswer('Do this.\n\n```json\n{"summary":"s","actions":[]}\n```')
    expect(r.text).toBe('Do this.')
    expect(r.json).toEqual({ summary: 's', actions: [] })
    expect(splitAnswer('Plain').json).toBeNull()
  })

  it('reads Claude Code results', async () => {
    const { parseCliResult } = await import('../ai/claude')
    const r = parseCliResult(JSON.stringify({ type: 'result', is_error: false, result: ' Hi ', usage: { input_tokens: 5, output_tokens: 2 } }), 'claude-sonnet-5-5')
    expect(r).toMatchObject({ text: 'Hi', inputTokens: 5, outputTokens: 2, model: 'claude-code/claude-sonnet-5-5' })
    expect(() => parseCliResult(JSON.stringify({ is_error: true, result: 'Not logged in' }), 'x')).toThrow(/Not logged in/)
  })
})
