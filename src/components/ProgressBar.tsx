interface Props {
  pct: number
  color?: string
  label?: string
  thin?: boolean
}

export function ProgressBar({ pct, color, label, thin }: Props) {
  return (
    <div
      className={thin ? 'bar bar-thin' : 'bar'}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}
