import { parseTemplate, type Template } from '../model/templates'

/** Templates shipped with the app (built from templates/src by templates/build.mjs). */
const files = import.meta.glob('../../templates/*.gdtemplate.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const BUNDLED_TEMPLATES: Template[] = Object.values(files).map(parseTemplate)
