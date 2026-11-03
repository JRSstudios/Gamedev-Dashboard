import type { Bug } from '../model/schema'
import { mutate, setSection } from '../store'
import { newBug } from './bugs'

/** Creates a draft report (after an error or a crash) and opens the Bugs section with it. */
export function reportBug(patch: Partial<Bug>) {
  const bug = newBug({ auto: true, ...patch })
  mutate((d) => ({ ...d, bugs: [...d.bugs, bug].slice(-500) }))
  setSection('bugs')
}
