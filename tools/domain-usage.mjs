// tools/domain-usage.mjs
// Extract the component names directly imported from '@odyssey/ui' in a source
// string. Handles single- and multi-line `import { ... } from '@odyssey/ui'`,
// strips `X as Y` aliases to the export name X, and unions repeated imports.
export function extractOdysseyImports(source) {
  // `[^{}]*` (not `[\s\S]*?`) so a match cannot span across other import
  // statements — otherwise a preceding `import { … } from 'react'` would be
  // swallowed up to the @odyssey/ui import and lose the real names.
  const re = /import\s*\{([^{}]*)\}\s*from\s*['"]@odyssey\/ui['"]/g
  const names = new Set()
  let m
  while ((m = re.exec(source)) !== null) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim()
      if (name) names.add(name)
    }
  }
  return [...names]
}

// --- CLI: walk domains, build map, write both JSONs ---
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const APP_SRC = path.join(REPO_ROOT, 'apps/odyssey-one/src')
const DEMOS_DIR = path.join(APP_SRC, 'routes/design-system/demos')
const REACT_OUT = path.join(APP_SRC, 'routes/design-system/domain-usage.json')
// Official Angular library repo (the local-only odyssey-angular-dsm is retired —
// see project_odyssey_ui_delivery). Keep this in sync with the DSM explorer's path.
const ANGULAR_OUT = path.resolve(REPO_ROOT, '../odyssey-one-library-ui/src/app/dsm/domain-usage.json')

// domain -> source roots under apps/odyssey-one/src. dirs walked recursively;
// files read directly. routes/design-system is NEVER a source. Globs for the
// fuzzier domains (home/users) are confirmed against the real dirs at build time
// (missing paths are skipped, so listing an absent dir is harmless).
const DOMAIN_SOURCES = {
  home: { dirs: ['components/home'], files: ['routes/Home.jsx'] },
  orders: { dirs: ['components/orders', 'routes/orders'], files: [] },
  shipments: { dirs: ['components/shipments', 'components/detail', 'routes/shipments'], files: [] },
  spotbid: { dirs: ['routes/spotbid', 'spotbid'], files: [] },
  carriers: { dirs: [], files: ['routes/Carriers.jsx'] },
  tracking: { dirs: [], files: ['routes/Tracking.jsx'] },
  users: { dirs: [], files: ['routes/Users.jsx', 'components/CustomersModal.jsx'] },
  'global-search': { dirs: ['components/global-search'], files: [] },
}

function walk(absDir, acc) {
  if (!fs.existsSync(absDir)) return acc
  for (const e of fs.readdirSync(absDir, { withFileTypes: true })) {
    const p = path.join(absDir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.(jsx?|tsx?)$/.test(e.name)) acc.push(p)
  }
  return acc
}

function demoNames() {
  return fs.readdirSync(DEMOS_DIR)
    .filter((f) => f.endsWith('.demo.jsx'))
    .map((f) => f.replace(/\.demo\.jsx$/, ''))
}

export function buildDomainMap() {
  const known = new Set(demoNames())
  const map = {}
  for (const [domain, { dirs = [], files = [] }] of Object.entries(DOMAIN_SOURCES)) {
    const fileList = []
    for (const d of dirs) walk(path.join(APP_SRC, d), fileList)
    for (const f of files) { const p = path.join(APP_SRC, f); if (fs.existsSync(p)) fileList.push(p) }
    const names = new Set()
    for (const f of fileList) {
      for (const name of extractOdysseyImports(fs.readFileSync(f, 'utf8'))) {
        if (known.has(name)) names.add(name)
      }
    }
    map[domain] = [...names].sort()
  }
  return map
}

function writeJson(target, data) {
  if (!fs.existsSync(path.dirname(target))) {
    console.log(`domain-usage: skipped (dir absent) ${target}`)
    return
  }
  fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n')
  console.log(`domain-usage: wrote ${target}`)
}

// CLI entry (only when run directly, not when imported by the test)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const map = buildDomainMap()
  writeJson(REACT_OUT, map)
  writeJson(ANGULAR_OUT, map)
}
