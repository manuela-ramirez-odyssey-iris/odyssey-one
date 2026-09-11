#!/usr/bin/env node
// tools/progression-sheets.mjs — generates the Shipments/Orders search-progression
// sibling deliverables (xlsx + csv) FROM THE CODE, so they cannot drift from what
// is deployed. See docs/superpowers/plans/progression-sheets-sibling-deliverable.md.
//
// MUST be run from the repo ROOT (that is where `vite` is hoisted). Loads the
// search modules through Vite's own resolver (ssrLoadModule) because
// src/search/** uses extensionless imports and pulls in a .ts file that plain
// `node` cannot import — do not substitute a node import here.
//
// Single-sheet "Progression Grouping" design (approved v4, user, 2026-09-11).
// Both the vault master and the docs/story-packs copy are the SAME workbook —
// written once by the Python renderer, then copied — so they cannot diverge.
// The vault CSV is written by the same Python renderer, from the same computed
// rows as the xlsx, so csv and workbook cannot disagree either.
//
// Usage:
//   node tools/progression-sheets.mjs           write the 6 committed outputs
//   node tools/progression-sheets.mjs --check   regenerate into a temp dir and
//                                                byte-compare against committed
import { createServer } from 'vite'
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'

const ROOT = process.cwd()
const APP_ROOT = 'apps/odyssey-one'
const PY = '/tmp/pptx_env/bin/python'
const RENDERER = path.join(ROOT, 'tools/progression-sheets.py')
const PROSE_PATH = path.join(ROOT, 'docs/progression/prose.json')
const CHECK = process.argv.includes('--check')

const OUT = {
  shipmentsVaultXlsx: 'vault/10-domains/shipments/data/attributes-progression-grouping.xlsx',
  ordersVaultXlsx: 'vault/10-domains/orders/data/attributes-progression-grouping.xlsx',
  shipmentsStoryXlsx: 'docs/story-packs/shipments-search-progression.xlsx',
  ordersStoryXlsx: 'docs/story-packs/orders-search-progression.xlsx',
  shipmentsCsv: 'vault/10-domains/shipments/data/attributes-progression-grouping.csv',
  ordersCsv: 'vault/10-domains/orders/data/attributes-progression-grouping.csv',
}

// ── Load code truth via Vite (verified working — do not substitute) ────────
async function loadCodeTruth() {
  const server = await createServer({
    root: APP_ROOT,
    configFile: `${APP_ROOT}/vite.config.js`,
    server: { middlewareMode: true },
    logLevel: 'error',
  })
  try {
    const shipProg = await server.ssrLoadModule('/src/search/shipments/progression.js')
    const shipCriteria = await server.ssrLoadModule('/src/search/shipments/criteria.js')
    const ordProg = await server.ssrLoadModule('/src/search/orders/progression.js')
    const ordReg = await server.ssrLoadModule('/src/search/orders/registry.js')
    return { shipProg, shipCriteria, ordProg, ordReg }
  } finally {
    await server.close()
  }
}

// ── Panel-control derivation ────────────────────────────────────────────────
// Shipments: derived from attr.match, exactly as ShipmentsFiltersView.renderControl does.
function shipmentsPanelControl(match) {
  if (match === 'enum') return 'enum chips (multi-select)'
  if (match === 'letters') return 'combobox (typable, lazy in live)'
  if (match === 'date') return 'date picker + date range'
  return 'text field' // digits, both
}

// Orders registry keys that name a different concept than the progression
// dataKey of the same field (only the location pair differs; everything else
// in ORDERS_FILTER_ATTRS shares its `key` with the progression `dataKey`).
const REGISTRY_KEY_TO_PROGRESSION_DATAKEY = {
  origin: 'shipperLocation',
  destination: 'destinationLocation',
}

function buildOrdersPanelMap(ORDERS_FILTER_ATTRS) {
  const map = new Map() // progression dataKey -> registry attr
  for (const reg of ORDERS_FILTER_ATTRS) {
    const dataKey = REGISTRY_KEY_TO_PROGRESSION_DATAKEY[reg.key] ?? reg.key
    map.set(dataKey, reg)
  }
  return map
}

// ── Sidecar validation ──────────────────────────────────────────────────────
function validateSidecar(domain, attrs, prose) {
  const errors = []
  const proseKeys = new Set(Object.keys(prose?.attributes ?? {}))
  const codeKeys = new Set(attrs.map((a) => a.dataKey))
  for (const a of attrs) {
    if (!proseKeys.has(a.dataKey)) {
      errors.push(`${domain}:${a.dataKey} — attribute exists in code but has no prose entry`)
    }
  }
  for (const key of proseKeys) {
    if (!codeKeys.has(key)) {
      errors.push(`${domain}:${key} — prose entry names an attribute key that no longer exists in code`)
    }
  }
  return errors
}

// ── Domain payload builder ──────────────────────────────────────────────────
// Produces exactly the columns the Python renderer's `ix` lookup needs, in the
// same shape as the sheet the design was ported from: {headers, rows}.
const ATTR_HEADERS = ['#', 'Group', 'Suggestions panel header', 'Attribute (bar label)', 'dataKey', 'Match',
  'Exact?', 'Enum values', 'Example (seeded)', 'Panel control', 'Panel label', 'Panel section', 'Free-text',
  'Status', 'Description', 'Notes']

function buildAttrsSheet({ PROGRESSION, ATTRIBUTES, freeTextKeys, panelControlFor, panelSectionFor, prose, notBuiltRows }) {
  const rows = ATTRIBUTES.map((a, i) => {
    const p = prose.attributes[a.dataKey] ?? { description: '', notes: '', example: '' }
    const { control, label } = panelControlFor(a)
    let notes = p.notes || ''
    if (a.match === 'date') {
      const rangeNote = `Also renders a second field labelled "${a.label} Range".`
      notes = notes ? `${notes} ${rangeNote}` : rangeNote
    }
    const suggestionsHeader = PROGRESSION.find((g) => g.group === a.group)?.label ?? ''
    const freeText = freeTextKeys === 'n/a' ? 'n/a' : (freeTextKeys.includes(a.dataKey) ? 'Yes' : '')
    return [i + 1, a.group, suggestionsHeader, a.label, a.dataKey, a.match, a.exact ? 'Yes' : '',
      a.values ? a.values.join(' · ') : '', p.example || '', control, label, panelSectionFor(a) || '',
      freeText, 'Implemented', p.description || '', notes]
  })
  for (const nb of notBuiltRows) {
    rows.push(['', nb.proposedGroup, '', nb.attribute, '', '', '', '', '', '', '', '', '', nb.status, '', nb.why])
  }
  return { headers: ATTR_HEADERS, rows }
}

async function main() {
  const { shipProg, shipCriteria, ordProg, ordReg } = await loadCodeTruth()
  const prose = JSON.parse(readFileSync(PROSE_PATH, 'utf8'))

  const sidecarErrors = [
    ...validateSidecar('shipments', shipProg.SHIPMENTS_ATTRIBUTES, prose.shipments),
    ...validateSidecar('orders', ordProg.ORDERS_ATTRIBUTES, prose.orders),
  ]
  if (sidecarErrors.length) {
    console.error('Sidecar validation failed:')
    for (const e of sidecarErrors) console.error(`  ${e}`)
    process.exit(1)
  }

  // Shipments: panel IS the progression — every attribute is a panel field.
  const shipmentsAttrs = buildAttrsSheet({
    PROGRESSION: shipProg.SHIPMENTS_PROGRESSION,
    ATTRIBUTES: shipProg.SHIPMENTS_ATTRIBUTES,
    freeTextKeys: shipCriteria.FREE_TEXT_KEYS,
    panelControlFor: (a) => ({ control: shipmentsPanelControl(a.match), label: a.label }),
    panelSectionFor: (a) => a.group, // panel IS the progression — same section header (group.group)
    prose: prose.shipments,
    notBuiltRows: prose.shipments.notBuilt,
  })

  const ordersPanelMap = buildOrdersPanelMap(ordReg.ORDERS_FILTER_ATTRS)
  const ordersAttrs = buildAttrsSheet({
    PROGRESSION: ordProg.ORDERS_PROGRESSION,
    ATTRIBUTES: ordProg.ORDERS_ATTRIBUTES,
    freeTextKeys: 'n/a',
    panelControlFor: (a) => {
      const reg = ordersPanelMap.get(a.dataKey)
      return reg ? { control: reg.control, label: reg.label } : { control: '— none', label: '' }
    },
    panelSectionFor: (a) => ordersPanelMap.get(a.dataKey)?.group ?? '',
    prose: prose.orders,
    notBuiltRows: prose.orders.notBuilt,
  })

  const writeDir = CHECK ? mkdtempSync(path.join(tmpdir(), 'progression-sheets-')) : ROOT
  const outPaths = Object.fromEntries(Object.entries(OUT).map(([k, rel]) => [k, path.join(writeDir, rel)]))
  for (const p of Object.values(outPaths)) mkdirSync(path.dirname(p), { recursive: true })

  const pyPayload = {
    shipments: { attrs: shipmentsAttrs, xlsxPath: outPaths.shipmentsVaultXlsx, csvPath: outPaths.shipmentsCsv },
    orders: { attrs: ordersAttrs, xlsxPath: outPaths.ordersVaultXlsx, csvPath: outPaths.ordersCsv },
  }
  const result = spawnSync(PY, [RENDERER], { input: JSON.stringify(pyPayload), encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(1)
  }
  if (result.stdout) process.stdout.write(result.stdout)

  // The story-pack copy is the SAME workbook as the vault master — copy rather
  // than re-render, so the two files cannot diverge.
  copyFileSync(outPaths.shipmentsVaultXlsx, outPaths.shipmentsStoryXlsx)
  copyFileSync(outPaths.ordersVaultXlsx, outPaths.ordersStoryXlsx)

  if (!CHECK) {
    console.log('Wrote:')
    for (const p of Object.values(OUT)) console.log(`  ${p}`)
    return
  }

  // --check: byte-compare temp dir against committed files.
  let drift = false
  for (const [name, relPath] of Object.entries(OUT)) {
    const committed = path.join(ROOT, relPath)
    const generated = path.join(writeDir, relPath)
    let same = false
    if (existsSync(committed) && existsSync(generated)) {
      same = Buffer.compare(readFileSync(committed), readFileSync(generated)) === 0
    }
    console.log(`${same ? 'ok' : 'DRIFT'}  ${relPath}`)
    if (!same) drift = true
  }
  rmSync(writeDir, { recursive: true, force: true })
  if (drift) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
