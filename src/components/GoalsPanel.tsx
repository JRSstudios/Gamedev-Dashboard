import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { splitGoal } from '../ai/client'
import { useLang, useT } from '../i18n'
import { suggestSteps } from '../model/smart'
import { addGoal, addSteps, deleteGoal, deleteStep, reorderGoals, toggleStep, updateGoal } from '../model/ops'
import { spentOnGoal } from '../model/availability'
import { goalProgress } from '../model/progress'
import type { Goal } from '../model/schema'
import { confirmDialog } from '../platform'
import { mutate, notify, useStore } from '../store'
import { ProgressBar } from './ProgressBar'

function GoalCard({ goal, color }: { goal: Goal; color: string }) {
  const t = useT()
  const ai = useStore((s) => s.data.settings.ai)
  const [step, setStep] = useState('')
  const [editing, setEditing] = useState(false)
  const [suggested, setSuggested] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id })
  const prog = goalProgress(goal)
  const lang = useLang()
  const data = useStore((s) => s.data)
  const fromCheat = goal.steps.length === 0 ? suggestSteps(data, goal.projectId, goal.title, lang) : null

  const askAi = async () => {
    setBusy(true)
    try {
      setSuggested(await splitGoal(ai, goal.title))
    } catch (e) {
      notify(t('aiFailed', { reason: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (await confirmDialog(t('confirmDeleteGoal', { name: goal.title }))) mutate((d) => deleteGoal(d, goal.id))
  }

  return (
    <li
      ref={setNodeRef}
      className={`goal${isDragging ? ' dragging' : ''}${goal.archived ? ' is-archived' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="goal-head">
        <button className="grip" aria-label={t('dragToReorder')} title={t('dragToReorder')} {...attributes} {...listeners}>⋮⋮</button>
        {editing ? (
          <input
            autoFocus
            defaultValue={goal.title}
            maxLength={200}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v) mutate((d) => updateGoal(d, goal.id, { title: v }))
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <h3 title={t('rename')} onDoubleClick={() => setEditing(true)}>{goal.title}</h3>
        )}
        <span className="pct">{prog.pct}%</span>
      </div>
      <ProgressBar pct={prog.pct} color={color} label={goal.title} />
      <div className="goal-meta small muted">
        <span>{t('stepsDone', { done: prog.done, total: prog.total })}</span>
        <label>
          {t('deadline')}{' '}
          <input
            type="date"
            value={goal.deadline ?? ''}
            onChange={(e) => mutate((d) => updateGoal(d, goal.id, { deadline: e.target.value || null }))}
          />
        </label>
        <GoalHours goal={goal} />
      </div>
      <ul className="steps">
        {goal.steps.map((s) => (
          <li key={s.id}>
            <label className={s.done ? 'check done' : 'check'}>
              <input type="checkbox" checked={s.done} onChange={() => mutate((d) => toggleStep(d, goal.id, s.id))} />
              <span>{s.title}</span>
            </label>
            <button className="icon" aria-label={t('remove')} onClick={() => mutate((d) => deleteStep(d, goal.id, s.id))}>×</button>
          </li>
        ))}
      </ul>
      {suggested && (
        <div className="suggest">
          <ul>{suggested.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <button className="primary" onClick={() => { mutate((d) => addSteps(d, goal.id, suggested)); setSuggested(null) }}>{t('aiApply')}</button>
          <button onClick={() => setSuggested(null)}>{t('cancel')}</button>
        </div>
      )}
      {fromCheat && (
        <div className="callout small autofill">
          {t('smartStepsHint', { title: fromCheat.title, n: fromCheat.steps.length })}{' '}
          <button className="link-btn" onClick={() => mutate((d) => addSteps(d, goal.id, fromCheat.steps))}>{t('sugApply')}</button>
        </div>
      )}
      <label className="field">
        <span className="field-label">{t('addStepPlaceholder')}</span>
        <input
          value={step}
          maxLength={300}
          onChange={(e) => setStep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && step.trim()) {
              mutate((d) => addSteps(d, goal.id, [step]))
              setStep('')
            }
          }}
        />
      </label>
      <div className="row-actions">
        {ai.enabled && <button className="link" disabled={busy} onClick={() => void askAi()}>{busy ? t('aiWorking') : `✨ ${t('aiSplitGoal')}`}</button>}
        <button className="link" onClick={() => mutate((d) => updateGoal(d, goal.id, { archived: !goal.archived }))}>
          {goal.archived ? t('unarchive') : t('archive')}
        </button>
        <button className="link danger" onClick={() => void remove()}>{t('delete')}</button>
      </div>
    </li>
  )
}

/** "3 h of 8 h": logged time against the estimate, the estimate edited in place. */
function GoalHours({ goal }: { goal: Goal }) {
  const t = useT()
  const spent = useStore((s) => spentOnGoal(s.data, goal.id))
  const over = goal.estimateHours !== null && spent > goal.estimateHours
  return (
    <label className={over ? 'warn' : ''} title={t('goalHoursHint')}>
      {t('goalHours', { spent: Math.round(spent * 10) / 10 })}{' '}
      <input
        type="number"
        className="hours"
        min={0}
        max={10000}
        step={0.5}
        value={goal.estimateHours ?? ''}
        aria-label={t('goalEstimate')}
        onChange={(e) => mutate((d) => updateGoal(d, goal.id, { estimateHours: e.target.value === '' ? null : Math.min(10000, Math.max(0, Number(e.target.value) || 0)) }))}
      />{' '}
      h
    </label>
  )
}

export function GoalsPanel({ projectId, color }: { projectId: string; color: string }) {
  const t = useT()
  const allGoals = useStore((s) => s.data.goals)
  const [title, setTitle] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const goals = allGoals.filter((g) => g.projectId === projectId)
  const shown = goals.filter((g) => showArchived || !g.archived)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) mutate((d) => reorderGoals(d, String(active.id), String(over.id)))
  }

  return (
    <section className="panel goals" aria-label={t('goals')}>
      <h2>{t('goals')}</h2>
      <label className="field">
        <span className="field-label">{t('addGoalPlaceholder')}</span>
        <input
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim()) {
              mutate((d) => addGoal(d, projectId, title))
              setTitle('')
            }
          }}
        />
      </label>
      {shown.length === 0 && <p className="muted empty">{t('noGoals')}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={shown.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          <ul className="goal-list">
            {shown.map((g) => <GoalCard key={g.id} goal={g} color={color} />)}
          </ul>
        </SortableContext>
      </DndContext>
      {goals.some((g) => g.archived) && (
        <label className="check small muted">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          {t('showArchived')}
        </label>
      )}
    </section>
  )
}
