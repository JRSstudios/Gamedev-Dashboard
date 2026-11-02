import type { RefType } from './model/schema'
import { getData, openItem, setSection } from './store'

/** Jumps to the section that shows an object (used by the canvas and page links). */
export function openRef(type: RefType, id: string) {
  switch (type) {
    case 'goal':
      return setSection('goals')
    case 'note':
      return setSection('notes')
    case 'research':
      return setSection('research')
    case 'table':
      return openItem('table', id)
    case 'page':
      return openItem('page', id)
    case 'asset': {
      const category = getData().assets.find((a) => a.id === id)?.category
      if (category === 'concept' || category === 'inspiration') return setSection(category)
      if (category === 'music' || category === 'sfx') return setSection('audio')
      return setSection('assets')
    }
  }
}
