// Builds the bundled templates and templates/index.json from templates/src/*.json.
// C# scripts are taken from the built-in cheat sheet (already compiled in Unity 6000.6),
// so a template lists them by file name: "unityScripts": ["PlatformerController2D.cs"].
// Usage: node templates/build.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const cheatDir = path.join(root, '..', 'src', 'cheatsheet')

const scripts = new Map()
for (const f of fs.readdirSync(cheatDir).filter((f) => f.endsWith('.ts'))) {
  const src = fs.readFileSync(path.join(cheatDir, f), 'utf8')
  for (const m of src.matchAll(/file: '([A-Za-z0-9_]+\.cs)',\s*text: `([\s\S]*?)`,?\s*\n\s*\}/g)) scripts.set(m[1], m[2].replace(/\\`/g, '`').replace(/\\\$/g, '$'))
}

const index = []
for (const f of fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.json')).sort()) {
  const tpl = JSON.parse(fs.readFileSync(path.join(root, 'src', f), 'utf8'))
  tpl.contents.unityScripts = (tpl.contents.unityScripts ?? []).map((file) => {
    if (!scripts.has(file)) throw new Error(`${f}: unknown script ${file}`)
    return { file, text: scripts.get(file) }
  })
  const out = `${tpl.id}.gdtemplate.json`
  fs.writeFileSync(path.join(root, out), JSON.stringify(tpl, null, 2) + '\n')
  index.push({ file: out, id: tpl.id, name: tpl.name, description: tpl.description, author: tpl.author, tags: tpl.tags, perspective: tpl.perspective, languages: tpl.languages })
}
fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify({ templates: index }, null, 2) + '\n')
console.log(`built ${index.length} templates`)
