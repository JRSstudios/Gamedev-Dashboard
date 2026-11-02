/** Small inline icon set (24x24, stroke based) so the UI needs no icon font or network. */
const PATHS = {
  overview: 'M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z',
  goals: 'M5 12l4 4 10-10M4 20h16',
  concept: 'M4 19l4-12 4 6 3-4 5 10zM8 7a1.5 1.5 0 100-.01',
  inspiration: 'M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z',
  research: 'M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l4 4',
  audio: 'M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11',
  assets: 'M4 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2z',
  notes: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  planner: 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4',
  integrations: 'M8 8h8v8H8zM3 12h5M16 12h5M12 3v5M12 16v5',
  settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  moon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l4 4',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M6 9l6 6 6-6',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
