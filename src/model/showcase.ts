import { newId } from './ops'
import { projectProgress } from './progress'
import type { Asset, Data, Showcase, Slide } from './schema'

/** Showcases: presentations made from a project's assets, for YouTube, TikTok and devlog posts. */

const MODEL_EXT = /\.(glb|gltf|fbx|obj)$/i

export const newSlide = (kind: Slide['kind'], patch: Partial<Slide> = {}): Slide => ({
  id: newId(),
  kind,
  title: '',
  text: '',
  assetIds: [],
  seconds: kind === 'model' ? 7 : kind === 'gallery' ? 6 : 4,
  transition: 'fade',
  ...patch,
})

const mapShowcase = (data: Data, id: string, fn: (s: Showcase) => Showcase): Data => ({
  ...data,
  showcases: data.showcases.map((s) => (s.id === id ? fn(s) : s)),
})

export function addShowcase(data: Data, projectId: string, title: string, slides: Slide[] = [newSlide('title', { title })]): { data: Data; showcase: Showcase } {
  const showcase: Showcase = {
    id: newId(),
    projectId,
    title: title.trim().slice(0, 200) || 'Showcase',
    format: '16:9',
    theme: 'dark',
    musicId: null,
    slides: slides.slice(0, 100),
    createdAt: new Date().toISOString(),
  }
  return { data: { ...data, showcases: [...data.showcases, showcase].slice(-500) }, showcase }
}

export const updateShowcase = (data: Data, id: string, patch: Partial<Pick<Showcase, 'title' | 'format' | 'theme' | 'musicId'>>): Data =>
  mapShowcase(data, id, (s) => ({ ...s, ...patch }))

export const deleteShowcase = (data: Data, id: string): Data => ({ ...data, showcases: data.showcases.filter((s) => s.id !== id) })

export const addSlide = (data: Data, id: string, slide: Slide, afterId: string | null = null): Data =>
  mapShowcase(data, id, (s) => {
    if (s.slides.length >= 100) return s
    const at = afterId ? s.slides.findIndex((x) => x.id === afterId) + 1 : s.slides.length
    const slides = [...s.slides]
    slides.splice(at > 0 ? at : slides.length, 0, slide)
    return { ...s, slides }
  })

export const updateSlide = (data: Data, id: string, slideId: string, patch: Partial<Slide>): Data =>
  mapShowcase(data, id, (s) => ({ ...s, slides: s.slides.map((x) => (x.id === slideId ? { ...x, ...patch, id: x.id } : x)) }))

export const deleteSlide = (data: Data, id: string, slideId: string): Data => mapShowcase(data, id, (s) => ({ ...s, slides: s.slides.filter((x) => x.id !== slideId) }))

export function moveSlide(data: Data, id: string, slideId: string, delta: -1 | 1): Data {
  return mapShowcase(data, id, (s) => {
    const i = s.slides.findIndex((x) => x.id === slideId)
    const j = i + delta
    if (i < 0 || j < 0 || j >= s.slides.length) return s
    const slides = [...s.slides]
    ;[slides[i], slides[j]] = [slides[j], slides[i]]
    return { ...s, slides }
  })
}

export const isModelAsset = (a: Asset) => a.kind === 'model' && Boolean(a.path && MODEL_EXT.test(a.path))

/** Numbers for the stats slide, worked out when it is shown. */
export function showcaseStats(data: Data, projectId: string) {
  const p = projectProgress(data, projectId)
  const minutes = data.sessions.filter((s) => s.projectId === projectId).reduce((m, s) => m + s.minutes, 0)
  return {
    steps: p.done,
    pct: p.pct,
    hours: Math.round(minutes / 6) / 10,
    assets: data.assets.filter((a) => a.projectId === projectId).length,
    goals: data.goals.filter((g) => g.projectId === projectId && g.steps.length > 0 && g.steps.every((s) => s.done)).length,
  }
}

export interface ShowcaseTexts {
  tagline: string
  artTitle: string
  progressTitle: string
  modelTitle: string
  compareTitle: string
  endTitle: string
  endText: string
}

/**
 * A first version from what the project has: title, the newest concept art, a concept-vs-model
 * comparison, a turning 3D model, progress numbers and an end card. Music: the newest track.
 */
export function autoShowcase(data: Data, projectId: string, tx: ShowcaseTexts): { data: Data; showcase: Showcase } {
  const project = data.projects.find((p) => p.id === projectId)
  const assets = data.assets.filter((a) => a.projectId === projectId).sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  const art = assets.filter((a) => a.kind === 'image' && (a.category === 'concept' || a.category === 'inspiration'))
  const models = assets.filter(isModelAsset)
  const music = assets.find((a) => a.category === 'music')
  const slides: Slide[] = [newSlide('title', { title: project?.name ?? 'Showcase', text: tx.tagline, assetIds: art.slice(0, 1).map((a) => a.id), transition: 'zoom' })]
  for (const a of art.slice(0, 3)) slides.push(newSlide('image', { title: a.name.replace(/\.[^.]+$/, ''), assetIds: [a.id], transition: 'zoom' }))
  if (art.length > 3) slides.push(newSlide('gallery', { title: tx.artTitle, assetIds: art.slice(3, 9).map((a) => a.id) }))
  if (art.length && models.length) slides.push(newSlide('compare', { title: tx.compareTitle, assetIds: [art[0].id, models[0].id], transition: 'slide' }))
  if (models.length) slides.push(newSlide('model', { title: tx.modelTitle, assetIds: [models[0].id] }))
  slides.push(newSlide('stats', { title: tx.progressTitle, transition: 'slide' }))
  slides.push(newSlide('end', { title: tx.endTitle, text: tx.endText }))
  const r = addShowcase(data, projectId, project?.name ?? 'Showcase', slides)
  return music ? { data: updateShowcase(r.data, r.showcase.id, { musicId: music.id }), showcase: { ...r.showcase, musicId: music.id } } : r
}
