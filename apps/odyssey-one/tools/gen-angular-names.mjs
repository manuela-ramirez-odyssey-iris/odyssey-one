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
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..') // apps/odyssey-one/tools -> repo root
const OUT_PATH = join(__dirname, '..', 'src', 'devmode', 'angular-map.json')

// resolve() (not join(cwd, ...)) so an absolute path argument passes through
// unchanged instead of getting prefixed with cwd again.
const angularRepo = process.argv[2]
  ? resolve(process.argv[2])
  : join(REPO_ROOT, '..', 'odyssey-one-library-ui')
if (!existsSync(angularRepo)) {
  console.error(`Angular repo not found at ${angularRepo}`)
  console.error('Usage: node gen-angular-names.mjs [path-to-odyssey-one-library-ui]')
  process.exit(1)
}
const demosDir = join(angularRepo, 'src', 'app', 'demos')

// Mirrors inspect.js's DEPRECATED_ALIASES exactly — keep the two in sync (see
// inspect.js for why: module namespace enumeration is alphabetical, not
// source order, so aliases must be excluded explicitly). This function parses
// genuine source declaration order from the plain-JS index (no bundler
// needed), so it doesn't need inspect.js's reference-dedup Map — just drop
// the known alias name.
const DEPRECATED_ALIASES = new Set(['SearchField'])

function loadReactNameSet() {
  const indexPath = join(REPO_ROOT, 'packages', 'ui', 'src', 'index.js')
  const src = readFileSync(indexPath, 'utf8')
  const names = new Set()
  for (const m of src.matchAll(/^export \{ default as (\w+) \} from '(\.\/[^']+)';$/gm)) {
    if (!DEPRECATED_ALIASES.has(m[1])) names.add(m[1])
  }
  return names
}

// ── Angular lib selector verification ───────────────────────────────────────
// Concatenated text of every .ts file under the Angular lib package, lazily
// loaded once. Used to VERIFY a derived selector actually exists rather than
// trusting the odyssey-<kebab-case> naming convention blindly.
let libText = null
function loadLibText(angularRepo) {
  if (libText === null) {
    const libDir = join(angularRepo, 'projects', 'odyssey-ui', 'src', 'lib')
    const files = readdirSync(libDir, { recursive: true }).filter((f) => f.endsWith('.ts'))
    libText = files.map((f) => readFileSync(join(libDir, f), 'utf8')).join('\n')
  }
  return libText
}

function selectorExists(angularRepo, selector) {
  const text = loadLibText(angularRepo)
  return text.includes(`'${selector}'`) || text.includes(`"${selector}"`)
}

function kebabCase(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function extractField(block, field) {
  const m = block.match(new RegExp(`\\b${field}:\\s*'([^']*)'`))
  return m ? m[1] : null
}

function extractBool(block, field) {
  const m = block.match(new RegExp(`\\b${field}:\\s*(true|false)`))
  return m ? m[1] === 'true' : false
}

// ── props array extraction ──────────────────────────────────────────────
// `export const fooProps: DemoProp[] = [{ name, type, desc }, …]`. A plain
// split-on-'},' can't be trusted here: desc text legitimately contains its
// own braces (e.g. "the action items ({ label, onSelect? })") and escaped
// quotes (e.g. "consumer\'s own affordance"), so entries are pulled out with
// a small brace/quote-aware scan instead — still not a TS parser, just far
// enough past regex to survive real desc prose.
function extractObjectLiterals(arrayBody) {
  const entries = []
  let i = 0
  const n = arrayBody.length
  while (i < n) {
    while (i < n && arrayBody[i] !== '{') i++
    if (i >= n) break
    const start = i
    let depth = 0
    let inString = null
    for (; i < n; i++) {
      const c = arrayBody[i]
      if (inString) {
        if (c === '\\') {
          i++
          continue
        }
        if (c === inString) inString = null
        continue
      }
      if (c === '"' || c === "'" || c === '`') {
        inString = c
        continue
      }
      if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) {
          i++
          break
        }
      }
    }
    entries.push(arrayBody.slice(start, i))
  }
  return entries
}

// Reads a quoted field value ('...' | "..." | `...`), honoring backslash
// escapes — a plain regex can't do this safely since desc text embeds its
// own quotes.
function extractQuotedField(objectText, field) {
  const m = objectText.match(new RegExp(`\\b${field}\\s*:\\s*(['"\`])`))
  if (!m) return null
  const quote = m[1]
  let i = m.index + m[0].length
  let value = ''
  while (i < objectText.length) {
    const c = objectText[i]
    if (c === '\\') {
      value += objectText[i + 1]
      i += 2
      continue
    }
    if (c === quote) break
    value += c
    i++
  }
  return value
}

function parsePropsArray(src, fileLabel) {
  const m = src.match(/export const \w+Props: DemoProp\[\] = \[([\s\S]*?)\n\];/)
  if (!m) {
    console.error(`WARNING: ${fileLabel}: no DemoProp[] array found — props: []`)
    return []
  }
  const props = []
  for (const entry of extractObjectLiterals(m[1])) {
    const name = extractQuotedField(entry, 'name')
    const type = extractQuotedField(entry, 'type')
    const desc = extractQuotedField(entry, 'desc')
    if (name === null || type === null || desc === null) {
      console.error(`WARNING: ${fileLabel}: could not parse a props entry — skipped (${entry.slice(0, 60).replace(/\s+/g, ' ')}…)`)
      continue
    }
    props.push({ name, type, desc })
  }
  return props
}

function parseMetaFile(path, fileLabel) {
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
    props: parsePropsArray(src, fileLabel),
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
    const meta = parseMetaFile(path, file)

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

    // ponytail special case: a handful of Angular demos document TWO React
    // components sharing one demo page (e.g. "CalendarPicker + DatePicker").
    // meta.angularName only names ONE of them, so it can't be trusted here —
    // derive each half's selector from the odyssey-<kebab-case> convention and
    // verify it's real (grep the lib) before emitting, don't just assume the
    // convention holds for every future joint meta.
    if (meta.name.includes(' + ')) {
      for (const part of meta.name.split(' + ').map((s) => s.trim())) {
        if (!reactNames.has(part)) {
          excludedNotInReact.push(`${file}: split name '${part}' (from '${meta.name}') not in current @odyssey/ui exports`)
          continue
        }
        const selector = `odyssey-${kebabCase(part)}`
        if (!selectorExists(angularRepo, selector)) {
          excludedNotInReact.push(`${file}: derived selector '${selector}' for '${part}' not found under projects/odyssey-ui/src/lib`)
          continue
        }
        map[part] = { selector, version: meta.version, normalizing: meta.normalizing, props: meta.props }
      }
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
      props: meta.props,
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
