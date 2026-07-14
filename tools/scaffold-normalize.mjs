#!/usr/bin/env node
// scaffold-normalize.mjs — generate the boilerplate artifacts for a NEW /normalize cycle.
// The model fills only the real design content afterwards.
//
// Usage:
//   node tools/scaffold-normalize.mjs <ComponentName> --tier atom|molecule|organism \
//     [--figma-node 1234:567] [--dry-run] [--force]
//
// Generates:
//   1. packages/ui/src/<C>.jsx                 (component skeleton)
//   2. packages/ui/src/<C>.figma.tsx           (Code Connect stub)
//   3. packages/ui/src/index.js                (export line in the tier group, idempotent)
//   4. apps/odyssey-one/src/styles/components.css  (stub block appended)
//   5. apps/odyssey-one/src/routes/design-system/demos/<C>.demo.jsx (demo skeleton)

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const FIGMA_FILE = 'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP'
const TIERS = ['atom', 'molecule', 'organism']
// index.js group headers per tier (see packages/ui/src/index.js)
const TIER_HEADERS = { atom: '── Atoms', molecule: '── Molecules', organism: '── Organisms' }

// ── Pure generators ──────────────────────────────────────────────

export function toKebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase()
}

export function isPascal(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name)
}

export function figmaUrl(node) {
  // Node ids come in "1234:567" form; URLs use "1234-567".
  return node ? `${FIGMA_FILE}?node-id=${node.replace(':', '-')}` : `${FIGMA_FILE}?node-id=TODO`
}

export function genComponent(name, tier, node) {
  const kebab = toKebab(name)
  return `/**
 * ${name} — ${tier}. TODO(normalize): one-line description per Figma spec.
 *
 * Figma master: \`${name}\` ${node || 'TODO'} on Components-${tier[0].toUpperCase() + tier.slice(1)}s.
 */
export default function ${name}({
  className = '',
  ...rest
}) {
  // TODO(normalize): implement per Figma spec
  return (
    <div className={\`${kebab} \${className}\`.trim()} {...rest}>
      {/* TODO(normalize) */}
    </div>
  )
}
`
}

export function genFigma(name, node) {
  return `import figma from '@figma/code-connect'
import ${name} from './${name}'

// Master: \`${name}\` at ${node || 'TODO'}.
figma.connect(
  ${name},
  '${figmaUrl(node)}',
  {
    imports: ["import { ${name} } from '@odyssey/ui'"],
    props: {
      // TODO(normalize): map Figma properties
    },
    example: () => <${name} />,
  },
)
`
}

// Insert the export line at the end of the tier's group. Idempotent.
export function insertIndexExport(indexSrc, name, tier) {
  const line = `export { default as ${name} } from './${name}.jsx';`
  if (indexSrc.includes(line)) return { src: indexSrc, changed: false, line }
  const lines = indexSrc.split('\n')
  const headerIdx = lines.findIndex(l => l.includes(TIER_HEADERS[tier]))
  if (headerIdx === -1) throw new Error(`index.js: tier group "${TIER_HEADERS[tier]}" not found`)
  // Exports are contiguous after the header; insert before the first non-export line.
  let i = headerIdx + 1
  while (i < lines.length && lines[i].startsWith('export {')) i++
  lines.splice(i, 0, line)
  return { src: lines.join('\n'), changed: true, line, at: i + 1 }
}

export function genCss(name, tier, node) {
  const kebab = toKebab(name)
  const today = new Date().toISOString().slice(0, 10)
  return `
/* === ${name} (${tier}) — Figma ${node || 'TODO'}, normalizing ${today} ===========
   TODO(normalize): one-line anatomy description. */
.${kebab} {
  /* TODO(normalize): tokens only */
}
`
}

export function genDemo(name, tier, node) {
  return `import { useState } from 'react'
import { ${name} } from '@odyssey/ui'

export const meta = {
  name: '${name}',
  tier: '${tier}',
  version: null,
  createdVersion: null,
  normalizing: true,
  figmaNode: '${node || 'TODO'}',
  codeConnect: 'packages/ui/src/${name}.figma.tsx',
}

export const props = [
  // { name: 'className', type: 'string', desc: 'Additional CSS classes for the root element.' },
]

export const tokens = [
  // { token: '--deep-sea-neutral-100', resolves: 'DSN/100', usage: 'surface background' },
]

// ── Schematic ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function LegendRow({ part, tier, nested = false, children }) {
  const cell = { padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }
  return (
    <li style={{ display: 'contents' }}>
      <span style={{ ...cell, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', whiteSpace: 'nowrap', paddingLeft: nested ? 'var(--spacing-6)' : 0, color: 'var(--text-primary)', fontWeight: nested ? 'var(--font-weight-medium)' : 'var(--font-weight-semibold)' }}>
        {nested && <span style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">└</span>}
        {part}{tier && <TierBadge tier={tier} />}
      </span>
      <span style={{ ...cell, color: 'var(--text-secondary)' }}>{children}</span>
    </li>
  )
}

function Schematic() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)', alignItems: 'flex-start' }}>
      <${name} />
      <ul style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0, width: '100%' }}>
        <LegendRow part="container" tier="${tier}">TODO(normalize): root anatomy — tokens, dimensions.</LegendRow>
        <LegendRow part="TODO" nested>TODO(normalize): nested part anatomy.</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Playground() {
  const [value, setValue] = useState(null) // TODO(normalize): real playground state

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)' }}>
        <${name} />
      </div>
    </div>
  )
}

export default function ${name}Demo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        TODO(normalize): prose intro — what the component is, when to use it.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy (master sample data)</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground</h4>
        <Playground />
      </div>
    </div>
  )
}
`
}

// ── CLI ──────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)
  const flags = { dryRun: args.includes('--dry-run'), force: args.includes('--force') }
  const name = args.find(a => !a.startsWith('--'))
  const flagVal = f => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : undefined }
  const tier = flagVal('--tier')
  const node = flagVal('--figma-node')

  if (!name || !isPascal(name) || !TIERS.includes(tier)) {
    console.error('Usage: node tools/scaffold-normalize.mjs <PascalCaseName> --tier atom|molecule|organism [--figma-node 1234:567] [--dry-run] [--force]')
    process.exit(1)
  }

  const root = dirname(dirname(fileURLToPath(import.meta.url)))
  const files = {
    component: join(root, `packages/ui/src/${name}.jsx`),
    figma: join(root, `packages/ui/src/${name}.figma.tsx`),
    index: join(root, 'packages/ui/src/index.js'),
    css: join(root, 'apps/odyssey-one/src/styles/components.css'),
    demo: join(root, `apps/odyssey-one/src/routes/design-system/demos/${name}.demo.jsx`),
  }

  if (existsSync(files.component) && !flags.force) {
    console.error(`Refusing: ${files.component} already exists (use --force to override).`)
    process.exit(1)
  }

  const component = genComponent(name, tier, node)
  const figmaStub = genFigma(name, node)
  const css = genCss(name, tier, node)
  const demo = genDemo(name, tier, node)
  const indexResult = insertIndexExport(readFileSync(files.index, 'utf8'), name, tier)

  if (flags.dryRun) {
    const dump = (path, content) => console.log(`\n${'═'.repeat(70)}\n▸ ${path}\n${'═'.repeat(70)}\n${content}`)
    dump(files.component, component)
    dump(files.figma, figmaStub)
    console.log(`\n${'═'.repeat(70)}\n▸ ${files.index} (insertion diff)\n${'═'.repeat(70)}`)
    console.log(indexResult.changed
      ? `@ line ${indexResult.at} (${TIER_HEADERS[tier]} group)\n+ ${indexResult.line}`
      : `(no change — export already present)`)
    dump(`${files.css} (appended)`, css)
    dump(files.demo, demo)
    console.log('\n--dry-run: nothing written.')
    return
  }

  writeFileSync(files.component, component)
  writeFileSync(files.figma, figmaStub)
  if (indexResult.changed) writeFileSync(files.index, indexResult.src)
  appendFileSync(files.css, css)
  writeFileSync(files.demo, demo)
  console.log(`Scaffolded ${name} (${tier}):`)
  for (const [k, p] of Object.entries(files)) {
    console.log(`  ${k === 'index' && !indexResult.changed ? '(unchanged)' : '✓'} ${p}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
