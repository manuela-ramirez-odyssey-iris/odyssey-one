#!/usr/bin/env node
/**
 * token-check — /normalize Phase 1 token-validation classifier.
 *
 * Classifies raw Figma-extracted values (colors, px, radii, font size/weight,
 * shadows) against the two sources of truth:
 *   - packages/tokens/tokens.css                    (code tokens)
 *   - packages/tokens/figma-tokens.snapshot.json    (committed Figma snapshot)
 *
 * Classes:
 *   LEGAL            — resolves to an existing tokens.css var (var names shown)
 *   LEGAL-FIGMA-ONLY — exists in the Figma snapshot but not tokens.css (mirror candidate)
 *   UNKNOWN          — no token resolves to it; nearest 1-2 tokens suggested
 *
 * Usage:
 *   node tools/token-check.mjs '{"card bg":"#FFFFFF","pad":"16px","title":"14px/600"}'
 *   node tools/token-check.mjs --file <path.json>
 *
 * Exits 1 if any value is UNKNOWN (same convention as tokens-audit.mjs).
 * Parsing conventions reused from tools/tokens-audit.mjs.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS = readFileSync(join(ROOT, 'packages/tokens/tokens.css'), 'utf8')
const SNAP = JSON.parse(readFileSync(join(ROOT, 'packages/tokens/figma-tokens.snapshot.json'), 'utf8'))

// --- input ---
const usage = () => {
  console.error("usage: node tools/token-check.mjs '<json>' | --file <path.json>")
  process.exit(2)
}
let input
try {
  const args = process.argv.slice(2)
  if (args[0] === '--file') input = JSON.parse(readFileSync(args[1], 'utf8'))
  else if (args[0]) input = JSON.parse(args[0])
  else usage()
} catch (e) {
  console.error(`invalid JSON input: ${e.message}`)
  usage()
}

// --- parse tokens.css → Map<--name, rawValue> (same regex as tokens-audit.mjs) ---
const cssVars = new Map()
for (const m of CSS.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) cssVars.set(m[1].trim(), m[2].trim())

// resolve var(--x) alias chains to raw values
function resolve(name, seen = new Set()) {
  if (seen.has(name)) return null
  seen.add(name)
  const v = cssVars.get(name)
  if (v == null) return null
  const ref = v.match(/^var\(\s*(--[\w-]+)\s*\)$/)
  return ref ? resolve(ref[1], seen) : v
}

// --- value normalizers ---
function toHex(v) {
  v = String(v).trim()
  let m = /^#([0-9a-f]{3})$/i.exec(v)
  if (m) return ('#' + [...m[1]].map((c) => c + c).join('')).toUpperCase()
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toUpperCase()
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(?:1|1\.0+)\s*)?\)$/i.exec(v)
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0').toUpperCase()).join('')
  return null
}
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const dist = (a, b) => Math.hypot(...rgb(a).map((c, i) => c - rgb(b)[i]))
// canonical shadow string: lowercase, tight commas, numbers via parseFloat, 0px→0
const normShadow = (v) =>
  String(v).toLowerCase().replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ')
    .replace(/-?\d*\.?\d+/g, (n) => String(parseFloat(n)))
    .replace(/\b0px\b/g, '0').trim()

// --- indexes ---
const cssColors = new Map() // normalized hex → [var names] (declaration order: primitives first)
const pxVars = []           // { name, px } — every pure-px var
for (const name of cssVars.keys()) {
  const val = resolve(name)
  if (val == null) continue
  const h = toHex(val)
  if (h) {
    if (!cssColors.has(h)) cssColors.set(h, [])
    cssColors.get(h).push(name)
  }
  const px = /^(\d+(?:\.\d+)?)px$/.exec(val.trim())
  if (px) pxVars.push({ name, px: +px[1] })
}
const shadowTokens = [...cssVars].filter(([n]) => n.startsWith('--shadow-')).map(([n, v]) => [n, normShadow(v)])
const weightVars = [...cssVars].filter(([n]) => n.startsWith('--font-weight-'))

const figmaColors = new Map() // hex → "Collection → Name"
const figmaNums = new Map()   // number → [names]
for (const [coll, toks] of Object.entries(SNAP.collections)) {
  for (const [fname, fval] of Object.entries(toks)) {
    if (typeof fval === 'string' && fval.startsWith('#')) figmaColors.set(toHex(fval), `${coll} → ${fname}`)
    else if (typeof fval === 'number') {
      if (!figmaNums.has(fval)) figmaNums.set(fval, [])
      figmaNums.get(fval).push(fname)
    }
  }
}

// suggestion pool for px = the design scales only
const SCALE = /^--(spacing|radius|font-size)-/
const suggestPx = (n, prefix = SCALE) => {
  const pool = pxVars.filter((t) => prefix.test?.(t.name) ?? t.name.startsWith(prefix)).filter((t) => t.px < 9000)
  return pool
    .sort((a, b) => Math.abs(a.px - n) - Math.abs(b.px - n))
    .slice(0, 2)
    .map((t) => `${t.name} (${t.px}px)`)
    .join(', ')
}

// --- classifier ---
function classify(raw) {
  const v = String(raw).trim()

  // font shorthand "14px/600"
  const font = /^(\d+(?:\.\d+)?)px\s*\/\s*(\d{3})$/.exec(v)
  if (font) {
    const size = pxVars.find((t) => t.name.startsWith('--font-size-') && t.px === +font[1])
    const weight = weightVars.find(([, val]) => val.trim() === font[2])
    if (size && weight) return { cls: 'LEGAL', detail: `${size.name} + ${weight[0]}` }
    const parts = []
    parts.push(size ? `size ok: ${size.name}` : `size? nearest: ${suggestPx(+font[1], /^--font-size-/)}`)
    parts.push(weight ? `weight ok: ${weight[0]}` : `no --font-weight-* = ${font[2]}`)
    return { cls: 'UNKNOWN', detail: parts.join('; ') }
  }

  // shadow (multi-part value with rgb/rgba + px offsets)
  if (/rgba?\(/.test(v) && /px/.test(v)) {
    const nv = normShadow(v)
    const hit = shadowTokens.find(([, tv]) => tv === nv)
    if (hit) return { cls: 'LEGAL', detail: hit[0] }
    // ponytail: no numeric "distance" for shadows — list the palette to rebind against
    return { cls: 'UNKNOWN', detail: `no --shadow-* match; rebind to one of: ${shadowTokens.map(([n]) => n).join(', ')}` }
  }

  // color
  const h = toHex(v)
  if (h) {
    const names = cssColors.get(h)
    if (names) return { cls: 'LEGAL', detail: names.slice(0, 3).join(', ') }
    if (figmaColors.has(h)) return { cls: 'LEGAL-FIGMA-ONLY', detail: `Figma: ${figmaColors.get(h)} — mirror into tokens.css` }
    const nearest = [...cssColors.keys()]
      .map((k) => [k, dist(h, k)])
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
    return {
      cls: 'UNKNOWN',
      detail: 'nearest: ' + nearest.map(([k, d]) => `${cssColors.get(k)[0]} (${k}, Δ${Math.round(d)})`).join(', '),
    }
  }

  // px / bare number
  const px = /^(\d+(?:\.\d+)?)(px)?$/.exec(v)
  if (px) {
    const n = +px[1]
    const hits = pxVars.filter((t) => t.px === n)
    if (hits.length) return { cls: 'LEGAL', detail: hits.slice(0, 4).map((t) => t.name).join(', ') }
    if (figmaNums.has(n)) return { cls: 'LEGAL-FIGMA-ONLY', detail: `Figma: ${figmaNums.get(n).join(', ')} — mirror into tokens.css` }
    return { cls: 'UNKNOWN', detail: `nearest: ${suggestPx(n)}` }
  }

  // fallback: exact raw string match against any var (font-family, transitions, …)
  const exact = [...cssVars].filter(([, val]) => val.trim().toLowerCase() === v.toLowerCase())
  if (exact.length) return { cls: 'LEGAL', detail: exact.slice(0, 3).map(([n]) => n).join(', ') }
  return { cls: 'UNKNOWN', detail: 'unrecognized value shape — classify manually' }
}

// --- table ---
const rows = Object.entries(input).map(([prop, raw]) => ({ prop, raw: String(raw), ...classify(raw) }))
const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', reset: '\x1b[0m', bold: '\x1b[1m' }
const color = { LEGAL: C.green, 'LEGAL-FIGMA-ONLY': C.yellow, UNKNOWN: C.red }
const w = (k) => Math.max(...rows.map((r) => r[k].length), k.length)
const [wp, wr, wc] = [w('prop'), w('raw'), w('cls')]

console.log(`${C.bold}token-check${C.reset} — tokens.css + Figma snapshot (${SNAP._meta.pulledOn})\n`)
console.log(`${C.dim}${'prop'.padEnd(wp)}  ${'raw'.padEnd(wr)}  ${'cls'.padEnd(wc)}  detail${C.reset}`)
for (const r of rows) {
  console.log(`${r.prop.padEnd(wp)}  ${r.raw.padEnd(wr)}  ${color[r.cls]}${r.cls.padEnd(wc)}${C.reset}  ${r.detail}`)
}
const unknown = rows.filter((r) => r.cls === 'UNKNOWN').length
const figmaOnly = rows.filter((r) => r.cls === 'LEGAL-FIGMA-ONLY').length
console.log(`\n${rows.length - unknown - figmaOnly} legal · ${figmaOnly} figma-only · ${unknown} unknown`)
process.exit(unknown ? 1 : 0)
