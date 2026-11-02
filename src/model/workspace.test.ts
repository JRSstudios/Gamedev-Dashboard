import { describe, expect, it } from 'vitest'
import { addEdge, addNode, autoLayout, deleteNode, listRefs, removeRefs } from './graph'
import { moveSection, renameSection, resolveSections, setSectionVisible, SECTIONS } from './layout'
import { derivedEdges, extractLinks } from './links'
import { migrate } from './migrate'
import { addGoal, addNote, addProject, deleteGoal, deleteNote, deleteProject } from './ops'
import { addBlock, addPage, deletePage, moveBlock, noteToPage, pageToMarkdown, setBlock } from './pages'
import { emptyData, type Data } from './schema'
import { addColumn, addRow, addTable, deleteColumn, deleteTable, moveRow, sanitizeCell, setCell, sortedRows, tableToMarkdown, updateColumn } from './tables'

function seeded(): { data: Data; projectId: string } {
  const { data, project } = addProject(emptyData(), 'Space Game')
  return { data, projectId: project.id }
}

describe('migration', () => {
  it('loads v1 files written before tables, pages, layout and graph existed', () => {
    const old = {
      version: 1,
      projects: [{ id: 'p', name: 'Old', color: '#6366f1', archived: false, createdAt: '2026-01-01T00:00:00.000Z' }],
      goals: [],
      notes: [],
      assets: [],
      sessions: [],
      settings: { language: 'auto', theme: 'auto', ai: { enabled: false, baseUrl: '', model: '' } },
    }
    const data = migrate(old)
    expect(data.tables).toEqual([])
    expect(data.pages).toEqual([])
    expect(data.projects[0].layout).toEqual({ sections: [] })
    expect(data.projects[0].graph).toEqual({ nodes: [], edges: [] })
  })

  it('rejects malformed blocks and cells', () => {
    const { data, projectId } = seeded()
    const bad = { ...data, pages: [{ id: 'x', projectId, title: 't', blocks: [{ id: 'b', type: 'script', text: 'x' }], createdAt: '', updatedAt: '' }] }
    expect(() => migrate(bad)).toThrow()
    const badCell = { ...data, tables: [{ id: 't', projectId, name: 'T', columns: [], rows: [{ id: 'r', cells: { c: { nested: true } } }], createdAt: '' }] }
    expect(() => migrate(badCell)).toThrow()
  })
})

describe('tables', () => {
  it('coerces cells to the column type', () => {
    expect(sanitizeCell({ type: 'number', options: [] }, '3,5')).toBe(3.5)
    expect(sanitizeCell({ type: 'number', options: [] }, 'abc')).toBeNull()
    expect(sanitizeCell({ type: 'progress', options: [] }, 140)).toBe(100)
    expect(sanitizeCell({ type: 'select', options: ['A'] }, 'B')).toBeNull()
    expect(sanitizeCell({ type: 'select', options: ['A'] }, 'A')).toBe('A')
    expect(sanitizeCell({ type: 'date', options: [] }, '2026-11-02T10:00')).toBe('2026-11-02')
    expect(sanitizeCell({ type: 'url', options: [] }, 'javascript:alert(1)')).toBeNull()
    expect(sanitizeCell({ type: 'checkbox', options: [] }, true)).toBe(true)
    expect(sanitizeCell({ type: 'text', options: [] }, 'x'.repeat(3000))).toHaveLength(2000)
  })

  it('builds a table from a template, edits cells and keeps values consistent on type change', () => {
    const s = seeded()
    const created = addTable(s.data, s.projectId, 'Levels', 'levels')
    let data = created.data
    const t = () => data.tables[0]
    expect(t().columns.map((c) => c.name)).toEqual(['Level', 'Theme', 'Status', 'Progress'])
    data = addRow(data, t().id)
    data = addRow(data, t().id)
    const [r1, r2] = t().rows
    const [level, , status, progress] = t().columns
    data = setCell(data, t().id, r1.id, level.id, 'Forest')
    data = setCell(data, t().id, r2.id, level.id, 'Cave')
    data = setCell(data, t().id, r1.id, progress.id, 40)
    data = setCell(data, t().id, r1.id, status.id, 'Polish')
    expect(sortedRows(t(), level.id, 'asc').map((r) => r.cells[level.id])).toEqual(['Cave', 'Forest'])
    data = updateColumn(data, t().id, status.id, { options: ['Done'] })
    expect(t().rows[0].cells[status.id]).toBeNull()
    data = updateColumn(data, t().id, level.id, { type: 'number' })
    expect(t().rows[0].cells[level.id]).toBeNull()
    data = moveRow(data, t().id, r2.id, r1.id)
    expect(t().rows[0].id).toBe(r2.id)
    data = deleteColumn(data, t().id, progress.id)
    expect(t().rows.some((r) => progress.id in r.cells)).toBe(false)
    data = addColumn(data, t().id, { name: 'Link', type: 'url' })
    expect(tableToMarkdown(t())).toContain('| Level | Theme | Status | Link |')
  })

  it('clears page blocks and canvas nodes of a deleted table', () => {
    const s = seeded()
    let { data, table } = addTable(s.data, s.projectId, 'T')
    const { data: d2, page } = addPage(data, s.projectId, 'P')
    const added = addBlock(d2, page.id, 'table')
    data = setBlock(added.data, page.id, { id: added.blockId!, type: 'table', tableId: table.id })
    data = addNode(data, s.projectId, 'table', table.id, 0, 0)
    data = deleteTable(data, table.id)
    expect(data.pages[0].blocks.find((b) => b.type === 'table')).toMatchObject({ tableId: null })
    expect(data.projects[0].graph.nodes).toHaveLength(0)
  })
})

describe('pages', () => {
  it('adds, validates and moves blocks', () => {
    const s = seeded()
    let { data, page } = addPage(s.data, s.projectId, 'GDD')
    const first = page.blocks[0].id
    const h = addBlock(data, page.id, 'heading')
    data = h.data
    data = setBlock(data, page.id, { id: h.blockId!, type: 'heading', text: 'Core loop', level: 2 })
    // invalid change is ignored
    data = setBlock(data, page.id, { id: h.blockId!, type: 'heading', text: 'x'.repeat(6000), level: 1 })
    expect(data.pages[0].blocks[1]).toMatchObject({ text: 'Core loop', level: 2 })
    data = moveBlock(data, page.id, h.blockId!, first)
    expect(data.pages[0].blocks[0].id).toBe(h.blockId)
    expect(pageToMarkdown(data.pages[0], data)).toContain('#### Core loop')
  })

  it('turns a note into a page and removes the note', () => {
    const s = seeded()
    let data = addNote(s.data, s.projectId, 'Dash ability #movement\nShort burst.\n\nCooldown 1s.', null)
    const res = noteToPage(data, data.notes[0].id)!
    data = res.data
    expect(data.notes).toHaveLength(0)
    expect(res.page.title).toBe('Dash ability')
    expect(res.page.blocks.map((b) => ('text' in b ? b.text : ''))).toEqual(['Short burst.', 'Cooldown 1s.'])
  })
})

describe('layout', () => {
  it('merges stored order with defaults and keeps settings visible and last', () => {
    const s = seeded()
    let data = setSectionVisible(s.data, s.projectId, 'audio', false)
    data = setSectionVisible(data, s.projectId, 'settings', false)
    data = renameSection(data, s.projectId, 'concept', 'Art')
    data = moveSection(data, s.projectId, 'nodes', 'overview')
    const entries = resolveSections(data.projects[0])
    expect(entries[0].id).toBe('nodes')
    expect(entries.at(-1)).toEqual({ id: 'settings', label: '', visible: true })
    expect(entries.find((e) => e.id === 'audio')?.visible).toBe(false)
    expect(entries.find((e) => e.id === 'concept')?.label).toBe('Art')
    expect(entries).toHaveLength(SECTIONS.length)
  })

  it('ignores unknown or duplicate stored ids', () => {
    const entries = resolveSections({ layout: { sections: [{ id: 'evil', label: '', visible: true }, { id: 'goals', label: 'A', visible: true }, { id: 'goals', label: 'B', visible: false }] } })
    expect(entries.filter((e) => e.id === 'goals')).toEqual([{ id: 'goals', label: 'A', visible: true }])
    expect(entries.some((e) => (e.id as string) === 'evil')).toBe(false)
  })
})

describe('graph and links', () => {
  it('extracts [[links]] once each', () => {
    expect(extractLinks('see [[Dash]] and [[dash]] or [[ Level 1 ]] [[]]')).toEqual(['Dash', 'Level 1'])
  })

  it('adds nodes once, connects them and derives links from text', () => {
    const s = seeded()
    let data = addGoal(s.data, s.projectId, 'Dash')
    data = addNote(data, s.projectId, 'Tuning\nneeds [[Dash]] feedback', null)
    const goal = data.goals[0]
    const note = data.notes[0]
    data = addNode(data, s.projectId, 'goal', goal.id, 0, 0)
    data = addNode(data, s.projectId, 'goal', goal.id, 50, 50)
    data = addNode(data, s.projectId, 'note', note.id, 300, 0)
    const [gNode, nNode] = data.projects[0].graph.nodes
    expect(data.projects[0].graph.nodes).toHaveLength(2)
    expect(derivedEdges(data, s.projectId)).toEqual([{ from: nNode.id, to: gNode.id }])
    data = addEdge(data, s.projectId, gNode.id, nNode.id)
    data = addEdge(data, s.projectId, nNode.id, gNode.id)
    data = addEdge(data, s.projectId, gNode.id, gNode.id)
    expect(data.projects[0].graph.edges).toHaveLength(1)
    expect(listRefs(data, s.projectId).map((r) => r.title)).toEqual(['Dash', 'Tuning'])
    data = autoLayout(data, s.projectId)
    expect(data.projects[0].graph.nodes.map((n) => n.x)).toEqual([0, 280])
    data = deleteNode(data, s.projectId, gNode.id)
    expect(data.projects[0].graph.edges).toHaveLength(0)
  })

  it('removes canvas nodes when the object is deleted', () => {
    const s = seeded()
    let data = addGoal(s.data, s.projectId, 'G')
    data = addNote(data, s.projectId, 'N', null)
    const created = addPage(data, s.projectId, 'P')
    data = created.data
    data = addNode(data, s.projectId, 'goal', data.goals[0].id, 0, 0)
    data = addNode(data, s.projectId, 'note', data.notes[0].id, 0, 0)
    data = addNode(data, s.projectId, 'page', created.page.id, 0, 0)
    data = deleteGoal(data, data.goals[0].id)
    data = deleteNote(data, data.notes[0].id)
    data = deletePage(data, created.page.id)
    expect(data.projects[0].graph.nodes).toHaveLength(0)
    expect(removeRefs(data, 'goal', 'none')).toBe(data)
  })

  it('deleting a project removes its tables and pages', () => {
    const s = seeded()
    let data = addTable(s.data, s.projectId, 'T').data
    data = addPage(data, s.projectId, 'P').data
    data = deleteProject(data, s.projectId)
    expect(data.tables).toHaveLength(0)
    expect(data.pages).toHaveLength(0)
  })
})
