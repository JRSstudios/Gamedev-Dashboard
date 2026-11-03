const COLORS = ['#5b5bd6', '#8a5cf6', '#ff7a59', '#22c55e', '#facc15', '#38bdf8']

/** A short burst of confetti for finishing the tour or all lessons. Decorative only. */
export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 60 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${(i % 12) * 0.05}s`,
            animationDuration: `${1.4 + (i % 5) * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}
