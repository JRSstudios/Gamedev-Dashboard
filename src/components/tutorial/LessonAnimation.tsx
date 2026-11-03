import type { LessonId } from '../../tutorial/content'

type Scene = 'cards' | 'connect' | 'drop' | 'export' | 'bars' | 'grid' | 'check' | 'chat'

const SCENES: Record<LessonId, { scene: Scene; nav: number }> = {
  start: { scene: 'cards', nav: 0 },
  plugins: { scene: 'connect', nav: 6 },
  assets: { scene: 'drop', nav: 4 },
  blender: { scene: 'export', nav: 6 },
  krita: { scene: 'drop', nav: 4 },
  planning: { scene: 'bars', nav: 1 },
  workspace: { scene: 'grid', nav: 2 },
  knowledge: { scene: 'check', nav: 2 },
  claude: { scene: 'chat', nav: 0 },
  templates: { scene: 'cards', nav: 6 },
  backup: { scene: 'export', nav: 0 },
  firstgame: { scene: 'check', nav: 2 },
}

/** A small looping animation of the app for each lesson. Pure SVG + CSS, no images. */
export function LessonAnimation({ lesson }: { lesson: LessonId }) {
  const { scene, nav } = SCENES[lesson]
  return (
    <svg className={`lesson-anim scene-${scene}`} viewBox="0 0 320 180" role="img" aria-hidden="true">
      <rect className="win" x="10" y="10" width="300" height="160" rx="10" />
      <rect className="side" x="10" y="10" width="70" height="160" rx="10" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} className={i === nav ? 'nav on' : 'nav'} x="20" y={28 + i * 18} width="50" height="8" rx="4" />
      ))}
      {scene === 'cards' && [0, 1, 2, 3].map((i) => <rect key={i} className="card" style={{ animationDelay: `${i * 0.25}s` }} x={95 + (i % 2) * 105} y={28 + Math.floor(i / 2) * 70} width="95" height="60" rx="8" />)}
      {scene === 'connect' && (
        <>
          {[0, 1, 2].map((i) => <rect key={i} className="tile" x={100 + i * 70} y="40" width="56" height="40" rx="8" />)}
          {[0, 1, 2].map((i) => <path key={i} className="wire" style={{ animationDelay: `${i * 0.4}s` }} d={`M${128 + i * 70} 80 C ${128 + i * 70} 120, 195 110, 195 140`} />)}
          <circle className="hub" cx="195" cy="145" r="12" />
        </>
      )}
      {scene === 'drop' && (
        <>
          <rect className="board" x="95" y="28" width="200" height="130" rx="8" />
          <g className="file">
            <rect x="0" y="0" width="34" height="42" rx="5" />
            <path d="M8 26 l7-9 6 6 5-4 5 7z" />
          </g>
          <rect className="landed" x="110" y="45" width="50" height="40" rx="6" />
        </>
      )}
      {scene === 'export' && (
        <>
          <rect className="tile" x="100" y="65" width="50" height="50" rx="8" />
          <path className="arrow" d="M160 90 H230" />
          <path className="arrowhead" d="M224 83 l9 7 -9 7" />
          <rect className="tile target" x="240" y="65" width="50" height="50" rx="8" />
          <circle className="pulse" cx="265" cy="90" r="30" />
        </>
      )}
      {scene === 'bars' && [0.6, 0.9, 0.4, 0.75, 0.5, 0.3, 0.8].map((h, i) => <rect key={i} className="bar" style={{ animationDelay: `${i * 0.12}s`, ['--h' as string]: h }} x={100 + i * 27} y={150 - 110 * h} width="18" height={110 * h} rx="4" />)}
      {scene === 'grid' && (
        <>
          {[0, 1, 2].map((c) => <rect key={c} className="lane" x={95 + c * 68} y="28" width="60" height="130" rx="6" />)}
          <rect className="card move" x="101" y="40" width="48" height="24" rx="5" />
          <rect className="card" x="101" y="72" width="48" height="24" rx="5" />
          <rect className="card" x="169" y="40" width="48" height="24" rx="5" />
        </>
      )}
      {scene === 'check' && [0, 1, 2, 3].map((i) => (
        <g key={i} className="row" style={{ animationDelay: `${i * 0.5}s` }}>
          <rect className="box" x="100" y={36 + i * 30} width="16" height="16" rx="4" />
          <path className="tick" d={`M103 ${44 + i * 30} l4 4 7-8`} />
          <rect className="line" x="126" y={40 + i * 30} width={130 - i * 15} height="8" rx="4" />
        </g>
      ))}
      {scene === 'chat' && (
        <>
          <rect className="bubble me" x="190" y="32" width="100" height="24" rx="10" />
          <rect className="bubble ai" style={{ animationDelay: '0.8s' }} x="100" y="66" width="150" height="34" rx="10" />
          <rect className="bubble ai" style={{ animationDelay: '1.5s' }} x="100" y="108" width="120" height="24" rx="10" />
          <rect className="apply" x="226" y="140" width="64" height="18" rx="9" />
        </>
      )}
    </svg>
  )
}
