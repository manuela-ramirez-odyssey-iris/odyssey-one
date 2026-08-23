#!/usr/bin/env node
// Generates apps/odyssey-one/src/devmode/angular-map.json from the Angular
// twin repo's *.demo.meta.ts files (React name -> Angular selector/version).
//
// Run manually, commit the result:
//   node apps/odyssey-one/tools/gen-angular-names.mjs [path-to-odyssey-one-library-ui]
//
// ponytail: regex field extraction, not a TS parser — these are five plain
// string/bool literals in a hand-written object, a real parser buys nothing
// here. If a meta ever computes a field instead of literal-izing it, this
// breaks loudly (field comes back undefined) rather than silently.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..') // apps/odyssey-one/tools -> repo root
const OUT_PATH = join(__dirname, '..', 'src', 'devmode', 'angular-map.json')

const angularRepo = process.argv[2]
  ? join(process.cwd(), process.argv[2])
  : join(REPO_ROOT, '..', 'odyssey-one-library-ui')
const demosDir = join(angularRepo, 'src', 'app', 'demos')

// Replicates inspect.js's uiTypeToName dedup: `packages/ui/src/index.js` has
// one alias line (`SearchField` re-exports ComboBox.jsx's default) — Map
// key = component reference (== module file), so the LAST `export { default
// as X } from './File.jsx'` line for a given file wins. Parsed here from the
// plain-JS index (no bundler needed) so this script has zero build deps.
function loadReactNameSet() {
  const indexPath = join(REPO_ROOT, 'packages', 'ui', 'src', 'index.js')
  const src = readFileSync(indexPath, 'utf8')
  const byModule = new Map() // modulePath -> exported name (last wins)
  for (const m of src.matchAll(/^export \{ default as (\w+) \} from '(\.\/[^']+)';$/gm)) {
    byModule.set(m[2], m[1])
  }
  return new Set(byModule.values())
}

function extractField(block, field) {
  const m = block.match(new RegExp(`\\b${field}:\\s*'([^']*)'`))
  return m ? m[1] : null
}

function extractBool(block, field) {
  const m = block.match(new RegExp(`\\b${field}:\\s*(true|false)`))
  return m ? m[1] === 'true' : false
}

function parseMetaFile(path) {
  const src = readFileSync(path, 'utf8')
  const blockMatch = src.match(/:\s*DemoMeta\s*=\s*\{([\s\S]*?)\n\};/)
  if (!blockMatch) return { error: 'no DemoMeta block found' }
  const block = blockMatch[1]

  return {
    name: extractField(block, 'name'),
    angularName: extractField(block, 'angularName'),
    version: extractField(block, 'version'),
    normalizing: extractBool(block, 'normalizing'),
    deprecated: extractBool(block, 'deprecated'),
  }
}

function main() {
  const reactNames = loadReactNameSet()
  const files = readdirSync(demosDir).filter((f) => f.endsWith('.demo.meta.ts'))

  const map = {}
  const skippedNoFields = []
  const skippedDeprecated = []
  const excludedNotInReact = []

  for (const file of files) {
    const path = join(demosDir, file)
    const meta = parseMetaFile(path)

    if (meta.error) {
      skippedNoFields.push(`${file}: ${meta.error}`)
      continue
    }
    if (!meta.name || !meta.angularName) {
      skippedNoFields.push(`${file}: missing ${!meta.name ? 'name' : 'angularName'}`)
      continue
    }
    if (meta.deprecated) {
      skippedDeprecated.push(`${file} (${meta.name})`)
      continue
    }
    if (!reactNames.has(meta.name)) {
      excludedNotInReact.push(`${file}: name '${meta.name}' not in current @odyssey/ui exports`)
      continue
    }

    map[meta.name] = {
      selector: meta.angularName,
      version: meta.version,
      normalizing: meta.normalizing,
    }
  }

  const sorted = Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]))
  writeFileSync(OUT_PATH, JSON.stringify(sorted, null, 2) + '\n')

  console.error(`Parsed ${files.length} meta files -> ${Object.keys(sorted).length} mapped.`)
  if (skippedNoFields.length) {
    console.error(`Skipped (missing name/angularName/block) — ${skippedNoFields.length}:`)
    skippedNoFields.forEach((s) => console.error(`  - ${s}`))
  }
  if (skippedDeprecated.length) {
    console.error(`Skipped (deprecated: true) — ${skippedDeprecated.length}:`)
    skippedDeprecated.forEach((s) => console.error(`  - ${s}`))
  }
  if (excludedNotInReact.length) {
    console.error(`Excluded (React name not in current @odyssey/ui exports) — ${excludedNotInReact.length}:`)
    excludedNotInReact.forEach((s) => console.error(`  - ${s}`))
  }
  console.error(`Wrote ${OUT_PATH}`)
}

main()
