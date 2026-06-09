#!/usr/bin/env node
/**
 * tokens:audit — diff packages/tokens/tokens.css against the committed Figma
 * variable snapshot (packages/tokens/figma-tokens.snapshot.json) and report:
 *   - GAPS    : a token exists in Figma but is missing from tokens.css
 *               (the "Efrain added Bittersweet/200 and we didn't notice" class)
 *   - DRIFT   : same token in both, but the value disagrees
 *   - aliases : semantic/badge tokens checked by name + that they point at the
 *               right primitive (var(--x) target matches the Figma alias target)
 *   - shadows : effect-style names present as --shadow-* (name-presence only)
 *
 * The Figma side is a SNAPSHOT (the Variables REST API is Enterprise-gated and the
 * Figma MCP is Claude-only). Refresh it by asking Claude to re-run the use_figma
 * dump after any token change in Figma, then re-run this. Exits 1 on gaps/drift.
 *
 * Scope note: component tokens (--btn-*, --control-*, --input-*, --navbar-*, --tab-*,
 * --panel-*, --dropdown-*, --alert-*), layout dims, --transition-*, --overlay-bg, and
 * --letter-spacing-wide are intentionally code-only (no Figma variable) and not checked.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS = readFileSync(join(ROOT, 'packages/tokens/tokens.css'), 'utf8')
const SNAP = JSON.parse(readFileSync(join(ROOT, 'packages/tokens/figma-tokens.snapshot.json'), 'utf8'))

// --- parse tokens.css → Map<--name, rawValue> ---
const cssVars = new Map()
for (const m of CSS.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  cssVars.set(m[1].trim(), m[2].trim())
}

// --- Figma var name → expected CSS custom-property name ---
function toVar(collection, name) {
  let base = name.toLowerCase().replace(/\s*\/\s*/g, '-').replace(/\s+/g, '-')
  if (collection.includes('Badge')) return `--badge-${base}`
  if (collection.includes('Icon')) return `--icon-${base}`
  base = base.replace(/^background-/, 'bg-') // Figma "Background/*" → code "--bg-*"
  return `--${base}`
}

const norm = (h) => String(h).trim().toUpperCase()
const num = (v) => parseFloat(String(v).replace(/[^0-9.]/g, ''))

const gaps = []
const drift = []
let checked = 0

for (const [collection, tokens] of Object.entries(SNAP.collections)) {
  for (const [figmaName, figmaVal] of Object.entries(tokens)) {
    const cssName = toVar(collection, figmaName)
    checked++
    if (!cssVars.has(cssName)) {
      gaps.push({ figmaName, cssName, figmaVal })
      continue
    }
    const cssVal = cssVars.get(cssName)
    if (typeof figmaVal === 'string' && figmaVal.startsWith('#')) {
      // primitive hex
      if (norm(cssVal) !== norm(figmaVal)) drift.push({ cssName, expected: norm(figmaVal), got: cssVal })
    } else if (typeof figmaVal === 'string' && figmaVal.startsWith('alias:')) {
      // semantic/badge alias → css should be var(--<target>)
      const target = toVar('', figmaVal.slice('alias:'.length))
      const ref = (cssVal.match(/var\(\s*(--[\w-]+)\s*\)/) || [])[1]
      if (ref !== target) drift.push({ cssName, expected: `var(${target})`, got: cssVal })
    } else if (typeof figmaVal === 'number') {
      if (num(cssVal) !== figmaVal) drift.push({ cssName, expected: figmaVal, got: cssVal })
    } else if (figmaName === 'Font/primary') {
      if (!/inter/i.test(cssVal)) drift.push({ cssName, expected: 'Inter', got: cssVal })
    }
  }
}

// --- shadows: name presence as --shadow-* ---
const shadowGaps = Object.keys(SNAP.effectStyles)
  .map((n) => n.toLowerCase().replace('/', '-'))
  .map((n) => `--${n}`)
  .filter((v) => !cssVars.has(v))

// --- report ---
const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', reset: '\x1b[0m', bold: '\x1b[1m' }
console.log(`${C.bold}tokens:audit${C.reset} — Figma snapshot (${SNAP._meta.pulledOn}) vs tokens.css`)
console.log(`${C.dim}checked ${checked} variables + ${Object.keys(SNAP.effectStyles).length} effect styles${C.reset}\n`)

if (gaps.length) {
  console.log(`${C.red}${C.bold}✗ ${gaps.length} GAP(S)${C.reset} — in Figma, missing from tokens.css:`)
  for (const g of gaps) console.log(`  ${C.red}+${C.reset} ${g.cssName}  ${C.dim}(Figma: ${g.figmaName} = ${g.figmaVal})${C.reset}`)
  console.log()
}
if (drift.length) {
  console.log(`${C.yellow}${C.bold}⚠ ${drift.length} DRIFT${C.reset} — value disagrees:`)
  for (const d of drift) console.log(`  ${C.yellow}~${C.reset} ${d.cssName}  expected ${C.green}${d.expected}${C.reset}  got ${C.red}${d.got}${C.reset}`)
  console.log()
}
if (shadowGaps.length) {
  console.log(`${C.red}✗ shadow effect styles missing from tokens.css:${C.reset} ${shadowGaps.join(', ')}\n`)
}

if (!gaps.length && !drift.length && !shadowGaps.length) {
  console.log(`${C.green}${C.bold}✓ aligned${C.reset} — every Figma variable + shadow is mirrored in tokens.css, values match.`)
  process.exit(0)
}
console.log(`${C.dim}Refresh the snapshot (ask Claude to re-run the use_figma dump) if Figma changed; otherwise add the missing/▲ tokens to packages/tokens/tokens.css.${C.reset}`)
process.exit(1)
