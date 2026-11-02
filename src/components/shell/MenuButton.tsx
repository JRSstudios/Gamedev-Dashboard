import { useEffect, useRef, useState, type ReactNode } from 'react'

export type MenuItem =
  | { kind: 'item'; label: string; onSelect: () => void; checked?: boolean; disabled?: boolean }
  | { kind: 'separator' }
  | { kind: 'heading'; label: string }

/**
 * Accessible dropdown menu: arrow keys, Home/End, Esc, click outside.
 * With `icon`, the trigger shows only the icon (label becomes its accessible name) and the menu opens to the left.
 */
export function MenuButton({ label, items, icon }: { label: string; items: MenuItem[]; icon?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>('[role^="menuitem"]:not(:disabled)')?.focus()
  }, [open])

  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const nodes = [...(root.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)') ?? [])]
    const at = nodes.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      nodes[(at + 1) % nodes.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      nodes[(at - 1 + nodes.length) % nodes.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      nodes[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      nodes.at(-1)?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="menu" ref={root} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        className={icon ? 'icon-button' : 'menu-trigger'}
        aria-label={icon ? label : undefined}
        title={icon ? label : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        {icon ?? label}
      </button>
      {open && (
        <div className={icon ? 'menu-body align-right' : 'menu-body'} role="menu" aria-label={label}>
          {items.map((item, i) => {
            if (item.kind === 'separator') return <hr key={i} role="separator" />
            if (item.kind === 'heading') return <div key={i} className="menu-heading">{item.label}</div>
            return (
              <button
                key={i}
                role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={item.checked}
                disabled={item.disabled}
                className="menu-item"
                onClick={() => {
                  item.onSelect()
                  close()
                }}
              >
                <span className="menu-check">{item.checked ? '✓' : ''}</span>
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
