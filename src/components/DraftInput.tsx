import { useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string
  /** Called on blur or Enter, only when the text changed. */
  onCommit: (value: string) => void
}

/**
 * Text input that keeps what the user types locally and saves on blur/Enter.
 * Used where saving every keystroke would fight validation (links, numbers) or rename too eagerly.
 */
export function DraftInput({ value, onCommit, onKeyDown, onBlur, ...rest }: Props) {
  const [draft, setDraft] = useState(value)
  // When the stored value changes elsewhere, show it (React's "adjust state while rendering" pattern).
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    setDraft(value)
  }
  const commit = () => {
    if (draft !== value) onCommit(draft)
  }
  return (
    <input
      {...rest}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        commit()
        onBlur?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setDraft(value)
        }
        onKeyDown?.(e)
      }}
    />
  )
}
