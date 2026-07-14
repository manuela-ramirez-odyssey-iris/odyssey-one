import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toKebab, isPascal, figmaUrl, insertIndexExport, genComponent, genFigma, genDemo } from './scaffold-normalize.mjs'

test('toKebab', () => {
  assert.equal(toKebab('Badge'), 'badge')
  assert.equal(toKebab('TimePicker'), 'time-picker')
  assert.equal(toKebab('GlobalSearchPanel'), 'global-search-panel')
  assert.equal(toKebab('ABTest'), 'ab-test') // consecutive caps split before last
  assert.equal(toKebab('Widget2Row'), 'widget2-row')
})

test('isPascal', () => {
  assert.ok(isPascal('TimePicker'))
  assert.ok(isPascal('Badge'))
  assert.ok(!isPascal('timePicker'))
  assert.ok(!isPascal('time-picker'))
  assert.ok(!isPascal('Time Picker'))
})

test('figmaUrl', () => {
  assert.equal(
    figmaUrl('9999:1'),
    'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=9999-1',
  )
  assert.equal(
    figmaUrl(undefined),
    'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=TODO',
  )
})

const FIXTURE_INDEX = `// @odyssey/ui — normalized component library.

// ── Atoms ──────────────────────────────────────────────
export { default as Badge } from './Badge.jsx';
export { default as Tab } from './Tab.jsx';

// ── Molecules ──────────────────────────────────────────
export { default as PageHeader } from './PageHeader.jsx';

// ── Organisms ──────────────────────────────────────────
export { default as Navbar } from './Navbar.jsx';

// ── Hooks / positioning ────────────────────────────────
export { useAnchoredPortal } from './useAnchoredPortal.jsx';
`

test('insertIndexExport inserts at end of tier group', () => {
  const { src, changed } = insertIndexExport(FIXTURE_INDEX, 'TimePicker', 'molecule')
  assert.ok(changed)
  assert.match(src, /PageHeader\.jsx';\nexport { default as TimePicker } from '\.\/TimePicker\.jsx';\n\n\/\/ ── Organisms/)
})

test('insertIndexExport atom goes before Molecules header', () => {
  const { src } = insertIndexExport(FIXTURE_INDEX, 'Chip', 'atom')
  assert.match(src, /Tab\.jsx';\nexport { default as Chip } from '\.\/Chip\.jsx';\n\n\/\/ ── Molecules/)
})

test('insertIndexExport organism stays out of hooks section', () => {
  const { src } = insertIndexExport(FIXTURE_INDEX, 'BigPanel', 'organism')
  assert.match(src, /Navbar\.jsx';\nexport { default as BigPanel } from '\.\/BigPanel\.jsx';\n\n\/\/ ── Hooks/)
})

test('insertIndexExport is idempotent', () => {
  const first = insertIndexExport(FIXTURE_INDEX, 'TimePicker', 'molecule')
  const second = insertIndexExport(first.src, 'TimePicker', 'molecule')
  assert.ok(!second.changed)
  assert.equal(second.src, first.src)
  // exactly one occurrence
  assert.equal(second.src.split("TimePicker.jsx';").length - 1, 1)
})

test('insertIndexExport throws on unknown group', () => {
  assert.throws(() => insertIndexExport('// nothing here\n', 'X', 'atom'))
})

test('genComponent shape', () => {
  const src = genComponent('TimePicker', 'molecule', '9999:1')
  assert.match(src, /export default function TimePicker\(\{/)
  assert.match(src, /className = ''/)
  assert.match(src, /`time-picker \$\{className\}`\.trim\(\)/)
  assert.match(src, /TODO\(normalize\)/)
  assert.match(src, /9999:1/)
})

test('genFigma shape', () => {
  const src = genFigma('TimePicker', '9999:1')
  assert.match(src, /import figma from '@figma\/code-connect'/)
  assert.match(src, /figma\.connect\(\n  TimePicker,\n  'https:\/\/www\.figma\.com.*node-id=9999-1'/)
  assert.match(src, /example: \(\) => <TimePicker \/>/)
})

test('genDemo meta shape', () => {
  const src = genDemo('TimePicker', 'molecule', '9999:1')
  assert.match(src, /normalizing: true/)
  assert.match(src, /version: null/)
  assert.match(src, /createdVersion: null/)
  assert.match(src, /figmaNode: '9999:1'/)
  assert.match(src, /codeConnect: 'packages\/ui\/src\/TimePicker\.figma\.tsx'/)
  assert.match(src, /function TierBadge/)
  assert.match(src, /function LegendRow/)
  assert.match(src, /function Schematic/)
  assert.match(src, /function Playground/)
  assert.match(src, /export default function TimePickerDemo/)
})
