// Writes every C# script from the built-in cheat sheet into <unity-project>/Assets/CheatSheet,
// so they can be compiled by a real Unity editor (see CONTRIBUTING.md).
// Usage: node scripts/export-cheat-scripts.mjs <path-to-unity-project>
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'vite'

const project = process.argv[2]
if (!project) {
  console.error('usage: node scripts/export-cheat-scripts.mjs <path-to-unity-project>')
  process.exit(1)
}
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { CHEATS } = await server.ssrLoadModule('/src/cheatsheet/index.ts')
  const out = join(project, 'Assets', 'CheatSheet')
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  let count = 0
  for (const entry of CHEATS) {
    for (const code of entry.code) {
      writeFileSync(join(out, code.file), code.text.replace(/\r?\n/g, '\r\n'), 'utf8')
      count++
    }
  }
  console.log(`${count} scripts written to ${out}`)
} finally {
  await server.close()
}
