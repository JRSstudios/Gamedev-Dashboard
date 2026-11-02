import { describe, expect, it } from 'vitest'
import { addAssets, addProject, newAsset } from '../model/ops'
import { emptyData } from '../model/schema'
import { applyActions, PlanSchema, validActions } from './actions'
import { buildRequest, parseResponse } from './claude'

function seeded() {
  const { data, project } = addProject(emptyData(), 'Fox Game')
  const asset = newAsset(project.id, 'fox_idle.png', 'C:/art/fox_idle.png', 'other')
  return { data: addAssets(data, [asset]), projectId: project.id, assetId: asset.id }
}

describe('Claude actions', () => {
  it('keeps valid actions and drops malformed ones', () => {
    const plan = PlanSchema.parse({
      summary: 'Plan',
      actions: [
        { type: 'goal', title: 'Movement', steps: ['Rigidbody', 'Jump'] },
        { type: 'goal' },
        { type: 'delete_everything' },
        { type: 'note', text: 'Fuchs #design' },
      ],
    })
    expect(plan.actions.map((a) => a.type)).toEqual(['goal', 'note'])
  })

  it('rejects unknown cheat ids and assets of other projects', () => {
    const s = seeded()
    const actions = PlanSchema.parse({
      actions: [
        { type: 'cheat', id: 'move-2d-platformer' },
        { type: 'cheat', id: 'invented-entry' },
        { type: 'asset', id: s.assetId, category: 'concept' },
        { type: 'asset', id: 'other-asset', category: 'concept' },
      ],
    }).actions
    expect(validActions(s.data, s.projectId, actions).map((a) => (a.type === 'cheat' || a.type === 'asset' ? a.id : ''))).toEqual(['move-2d-platformer', s.assetId])
  })

  it('applies a whole plan, linking later actions to earlier ones', () => {
    const s = seeded()
    const { actions } = PlanSchema.parse({
      actions: [
        { type: 'goal', title: 'Fox movement', steps: ['Run', 'Jump', 'Dash'] },
        { type: 'page', title: 'Game Design', icon: '🦊', blocks: [{ kind: 'heading', text: 'Core loop' }, { kind: 'checklist', items: ['Prototype', 'Art'] }] },
        { type: 'table', name: 'Levels', columns: [{ name: 'Level', type: 'text' }, { name: 'Done', type: 'checkbox' }], rows: [['Forest', false], ['Cave', true]] },
        { type: 'cheat', id: 'move-2d-platformer', goal: 'Fox movement' },
        { type: 'connect', from: 'Game Design', to: 'Fox movement' },
        { type: 'asset', id: s.assetId, category: 'concept', tags: ['Fox', 'idle'] },
      ],
    })
    const d = applyActions(s.data, s.projectId, actions)
    expect(d.goals[0].steps.map((x) => x.title)).toEqual(['Run', 'Jump', 'Dash'])
    expect(d.pages[0]).toMatchObject({ title: 'Game Design', icon: '🦊' })
    expect(d.pages[0].blocks.map((b) => b.type)).toEqual(['heading', 'checklist'])
    expect(d.tables[0].columns.map((c) => c.name)).toEqual(['Level', 'Done'])
    expect(d.tables[0].rows).toHaveLength(2)
    expect(d.tables[0].rows[1].cells[d.tables[0].columns[1].id]).toBe(true)
    const graph = d.projects[0].graph
    expect(graph.nodes.map((n) => n.ref.type).sort()).toEqual(['cheat', 'goal', 'page'])
    expect(graph.edges).toHaveLength(2)
    expect(d.assets[0]).toMatchObject({ category: 'concept', tags: ['fox', 'idle'] })
  })
})

describe('Claude request with the app guide', () => {
  it('puts the cached guide first and reads cache usage', () => {
    const body = buildRequest({ model: 'claude-sonnet-5-5', system: 'task', messages: [], webSearch: false, guide: 'GUIDE' })
    expect(body.system).toEqual([
      { type: 'text', text: 'GUIDE', cache_control: { type: 'ephemeral' } },
      { type: 'text', text: 'task' },
    ])
    const parsed = parseResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 },
    })
    expect(parsed.cacheReadTokens).toBe(900)
  })
})
