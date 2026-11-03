import { describe, expect, it } from 'vitest'
import { weekToMarkdown } from './markdown'
import { addGoal, addProject, addSteps, startTimer, stopTimer, toggleStep } from './ops'
import { emptyData } from './schema'
import { formatClock, formatMinutes, intensity, minutesByDay, minutesOnDay, minutesThisWeek, monthGrid, startOfWeek } from './time'
import { migrate } from './migrate'

const at = (h: number, m: number, d = 4) => new Date(2026, 10, d, h, m, 0) // 4 Nov 2026 is a Wednesday

function withProject() {
  const { data, project } = addProject(emptyData(), 'Game')
  return { data, id: project.id }
}

describe('timer', () => {
  it('stores a 2 minute session and counts it', () => {
    const { data, id } = withProject()
    const running = startTimer(data, id, null, 'stopwatch', 25, at(10, 0))
    expect(running.timer?.projectId).toBe(id)
    const done = stopTimer(running, at(10, 2))
    expect(done.timer).toBeNull()
    expect(done.sessions).toHaveLength(1)
    expect(done.sessions[0].minutes).toBe(2)
    expect(minutesOnDay(done, '2026-11-04', id)).toBe(2)
    expect(minutesThisWeek(done, at(12, 0, 6))).toBe(2)
    expect(minutesThisWeek(done, at(12, 0, 9))).toBe(0) // next week
  })

  it('ignores a second start and discards tiny sessions', () => {
    const { data, id } = withProject()
    const a = startTimer(data, id, null, 'stopwatch', 25, at(10, 0))
    expect(startTimer(a, id, null, 'pomodoro', 10)).toBe(a)
    expect(stopTimer(a, new Date(at(10, 0).getTime() + 10_000)).sessions).toHaveLength(0)
  })

  it('caps pomodoro and forgotten stopwatch sessions', () => {
    const { data, id } = withProject()
    const p = stopTimer(startTimer(data, id, null, 'pomodoro', 25, at(9, 0)), at(12, 0))
    expect(p.sessions[0].minutes).toBe(25)
    const s = stopTimer(startTimer(data, id, null, 'stopwatch', 25, at(0, 0)), at(23, 0))
    expect(s.sessions[0].minutes).toBe(720)
  })

  it('survives a JSON round trip (running timer persists)', () => {
    const { data, id } = withProject()
    const running = startTimer(data, id, null, 'stopwatch', 25, at(10, 0))
    expect(migrate(JSON.parse(JSON.stringify(running))).timer).toEqual(running.timer)
  })

  it('loads old v1 files without timer or session projectId', () => {
    const old = JSON.parse(JSON.stringify(emptyData()))
    delete old.timer
    old.sessions = [{ id: 's', goalId: null, start: at(9, 0).toISOString(), end: at(9, 5).toISOString(), minutes: 5 }]
    const data = migrate(old)
    expect(data.timer).toBeNull()
    expect(data.sessions[0].projectId).toBeNull()
  })
})

describe('time helpers', () => {
  it('formats durations and clocks', () => {
    expect(formatMinutes(100)).toBe('1h40')
    expect(formatMinutes(5)).toBe('5 min')
    expect(formatClock(25 * 60)).toBe('25:00')
    expect(formatClock(3725)).toBe('1:02:05')
  })

  it('starts weeks on Monday and builds full month grids', () => {
    expect(startOfWeek(at(12, 0)).getDay()).toBe(1)
    expect(startOfWeek(new Date(2026, 10, 8)).getDate()).toBe(2) // Sunday 8 Nov -> Monday 2 Nov
    const grid = monthGrid(2026, 10)
    expect(grid.length % 7).toBe(0)
    expect(grid[0].getDay()).toBe(1)
    expect(grid.some((d) => d.getMonth() === 10 && d.getDate() === 30)).toBe(true)
  })

  it('maps minutes to intensity levels', () => {
    expect([0, 10, 45, 90, 300].map(intensity)).toEqual([0, 1, 2, 3, 4])
  })

  it('aggregates by day over two weeks', () => {
    const { data, id } = withProject()
    let d = data
    for (const day of [2, 3, 3, 11]) d = stopTimer(startTimer(d, id, null, 'stopwatch', 25, at(8, 0, day)), at(8, 30, day))
    const map = minutesByDay(d, id)
    expect(map.get('2026-11-03')).toBe(60)
    expect(map.get('2026-11-11')).toBe(30)
    expect(map.size).toBe(3)
  })
})

describe('weekly markdown', () => {
  it('summarises time, steps and notes of the week', () => {
    const { data, id } = withProject()
    let d = addGoal(data, id, 'Move')
    d = addSteps(d, d.goals[0].id, ['Jump'])
    d = toggleStep(d, d.goals[0].id, d.goals[0].steps[0].id)
    d = stopTimer(startTimer(d, id, null, 'stopwatch', 25, new Date()), new Date(Date.now() + 10 * 60000))
    const md = weekToMarkdown(d, id)
    expect(md).toContain('# Game — week of')
    expect(md).toContain('- [x] Jump (Move)')
    expect(md).toContain('## Time (10 min)')
  })
})
