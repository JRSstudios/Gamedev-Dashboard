import { describe, expect, it } from 'vitest'
import { estimateCost, priceFor } from '../ai/pricing'
import { CHEATS, CHEAT_CATEGORIES, PERSPECTIVES } from '../cheatsheet'
import { describeRef, listCheatRefs } from './graph'
import { migrate } from './migrate'
import { addGoal, addNote, addProject } from './ops'
import { emptyData } from './schema'
import { buildIndex, search, snippet, tokenize } from './search'
import { projectIndex, searchDocs } from './searchDocs'
import { addUsage, MAX_USAGE, overMonthlyLimit, summarizeUsage } from './usage'

describe('cheat sheet content', () => {
  it('has unique ids and well-formed entries', () => {
    const ids = CHEATS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of CHEATS) {
      expect(c.title.length).toBeGreaterThan(3)
      expect(CHEAT_CATEGORIES).toContain(c.category)
      for (const p of c.perspectives) expect(PERSPECTIVES).toContain(p)
      expect(c.steps.length).toBeGreaterThan(0)
      expect(c.docs.length).toBeGreaterThan(0)
      for (const url of c.docs) expect(url).toMatch(/^https:\/\/docs\.unity3d\.com\//)
      for (const code of c.code) {
        expect(code.file).toMatch(/^[A-Z][A-Za-z0-9]*\.cs$/)
        expect(code.text).toContain('using UnityEngine')
      }
    }
  })

  it('every script file name is unique and matches its class', () => {
    const files = CHEATS.flatMap((c) => c.code)
    expect(new Set(files.map((f) => f.file)).size).toBe(files.length)
    for (const f of files) {
      const name = f.file.replace(/\.cs$/, '')
      expect(f.text).toMatch(new RegExp(`(class|static class) ${name}\\b`))
    }
  })

  it('covers every perspective with at least one movement entry', () => {
    for (const p of PERSPECTIVES) {
      expect(CHEATS.some((c) => c.category === 'movement' && c.perspectives.includes(p))).toBe(true)
    }
  })
})

describe('search', () => {
  it('tokenizes without stop words and ranks title matches first', () => {
    expect(tokenize('Der Sprung und das Laufen')).toEqual(['sprung', 'laufen'])
    const index = buildIndex([
      { type: 'a', id: '1', title: 'Coyote time', text: 'jump grace period' },
      { type: 'a', id: '2', title: 'Camera', text: 'coyote mentioned once in passing' },
      { type: 'b', id: '3', title: 'Unrelated', text: 'nothing here' },
    ])
    const hits = search(index, 'coyote')
    expect(hits.map((h) => h.doc.id)).toEqual(['1', '2'])
    expect(search(index, 'jum').map((h) => h.doc.id)).toEqual(['1'])
    expect(search(index, 'coyote', 10, ['b'])).toEqual([])
    expect(search(index, '   ')).toEqual([])
  })

  it('finds cheat sheet entries and project content together', () => {
    const { data, project } = addProject(emptyData(), 'Hollow')
    let d = addGoal(data, project.id, 'Wall jump')
    d = addNote(d, project.id, 'Kamera soll beim Springen weich folgen', null)
    const docs = searchDocs(d, project.id)
    expect(docs.some((x) => x.type === 'goal')).toBe(true)
    expect(docs.filter((x) => x.type === 'cheat').length).toBe(CHEATS.length)
    const hits = search(projectIndex(d, project.id), 'coyote time jump buffer')
    expect(hits[0].doc.id).toBe('move-2d-platformer')
    expect(projectIndex(d, project.id)).toBe(projectIndex(d, project.id))
    expect(snippet('a '.repeat(200) + 'Coyote Time hier', 'coyote', 40)).toContain('Coyote')
  })

  it('describes built-in and own cheat entries', () => {
    const d = { ...emptyData(), cheats: [{ id: 'own-1', title: 'Mein Trick', category: 'eigene', tags: [], body: 'Text', code: '', createdAt: '' }] }
    expect(describeRef(d, 'cheat', 'cam-2d')?.title).toContain('2D-Kamera')
    expect(describeRef(d, 'cheat', 'own-1')?.title).toBe('Mein Trick')
    expect(describeRef(d, 'cheat', 'missing')).toBeNull()
    expect(listCheatRefs(d)).toHaveLength(CHEATS.length + 1)
  })
})

describe('usage and pricing', () => {
  it('knows the current prices and estimates cost including cache tokens', () => {
    expect(priceFor('claude-sonnet-5-5')?.input).toBe(2)
    expect(priceFor('claude-opus-5-5-20261001')?.output).toBe(20)
    expect(priceFor('gpt-x')).toBeNull()
    // 1M input + 1M output on Sonnet 5.5 = $2 + $10
    expect(estimateCost('claude-sonnet-5-5', { input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0 })).toBeCloseTo(12)
    // cache write 1.25x input, cache read $0.20
    expect(estimateCost('claude-sonnet-5-5', { input: 0, output: 0, cacheRead: 1_000_000, cacheWrite: 1_000_000 })).toBeCloseTo(0.2 + 2.5)
  })

  it('summarizes by day, month, model and command', () => {
    const now = new Date(2026, 10, 2, 12)
    let d = emptyData()
    d = addUsage(d, { at: new Date(2026, 10, 2, 9).toISOString(), model: 'claude-sonnet-5-5', command: 'research', input: 1000, output: 500, cacheRead: 0, cacheWrite: 0 })
    d = addUsage(d, { at: new Date(2026, 10, 1, 9).toISOString(), model: 'claude-haiku-5-5', command: 'plan', input: 2000, output: 100, cacheRead: 0, cacheWrite: 0 })
    d = addUsage(d, { at: new Date(2026, 9, 20, 9).toISOString(), model: 'claude-sonnet-5-5', command: 'research', input: 10, output: 10, cacheRead: 0, cacheWrite: 0 })
    const s = summarizeUsage(d.usage, now, 7)
    expect(s.today.requests).toBe(1)
    expect(s.month.requests).toBe(2)
    expect(s.total.input).toBe(3010)
    expect(s.byCommand.map(([c]) => c)).toEqual(['research', 'plan'])
    expect(s.byDay).toHaveLength(7)
    expect(s.byDay.at(-1)?.totals.requests).toBe(1)
    expect(overMonthlyLimit(d, now)).toBe(false)
    d = { ...d, settings: { ...d.settings, claude: { ...d.settings.claude, monthlyLimitUsd: 0.001 } } }
    expect(overMonthlyLimit(d, now)).toBe(true)
  })

  it('caps the usage log', () => {
    let d = emptyData()
    d = { ...d, usage: Array.from({ length: MAX_USAGE }, () => ({ at: '2026-01-01T00:00:00.000Z', model: 'm', command: 'c', input: 1, output: 1, cacheRead: 0, cacheWrite: 0 })) }
    d = addUsage(d, { model: 'claude-sonnet-5-5', command: 'new', input: 1, output: 1, cacheRead: 0, cacheWrite: 0 })
    expect(d.usage).toHaveLength(MAX_USAGE)
    expect(d.usage.at(-1)?.command).toBe('new')
  })

  it('old files without the new fields still load', () => {
    const old = {
      version: 1,
      projects: [{ id: 'p', name: 'Old', color: '#6366f1', archived: false, createdAt: '2026-01-01T00:00:00.000Z', integrations: { unityDir: null } }],
      goals: [],
      notes: [],
      assets: [],
      sessions: [],
      settings: { language: 'auto', theme: 'light', ai: { enabled: false, baseUrl: '', model: '' }, claude: { enabled: true, model: 'claude-sonnet-5-5', webSearch: false } },
    }
    const d = migrate(old)
    expect(d.cheats).toEqual([])
    expect(d.ideas).toEqual([])
    expect(d.usage).toEqual([])
    expect(d.settings.claude.monthlyLimitUsd).toBeNull()
    expect(d.settings.claude.asked).toBe(false)
    expect(d.projects[0].integrations.kritaDir).toBeNull()
  })
})
