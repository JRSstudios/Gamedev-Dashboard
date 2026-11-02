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
  pages: 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM9 8h6M9 12h6M9 16h3',
  tables: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  nodes: 'M6 4a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM18 4a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM12 15a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8 7.5l3 8M16 7.5l-3 8M8.5 6.5h7',
  cheats: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11M9 8h6',
  brainstorm: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z',
  models: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  integrations: 'M8 8h8v8H8zM3 12h5M16 12h5M12 3v5M12 16v5',
  unity: 'M12 3l7.5 4.3v8.4L12 20l-7.5-4.3V7.3zM12 3v8.6M12 11.6l7.5-4.3M12 11.6L4.5 7.3M12 11.6V20',
  blender: 'M14 8a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM14 11.5a2 2 0 100 4 2 2 0 000-4zM3 9h7M6 5l4.5 4',
  krita: 'M19 4l1 1-9 9-2-2zM9 12l2 2c0 3-2 5-6 5 1-1 1-2 1-3 0-2 1-4 3-4z',
  inbox: 'M4 13l2.5-8h11l2.5 8v6H4zM4 13h5l1 2h4l1-2h5',
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
