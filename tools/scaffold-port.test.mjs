// Unit tests for the pure generators/extractors behind port-readiness.mjs +
// scaffold-port.mjs. Fixture strings are taken from the real repo files
// (CalendarPicker.jsx, GroupTable.jsx, CalendarPicker.demo.jsx, public-api.ts,
// odyssey-ui.module.ts, demos.registry.ts, app.module.ts) so the parsers are
// exercised against the exact syntax they must handle.
// Run: node --test tools/scaffold-port.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractProps,
  extractExportedHelpers,
  extractLucideImports,
  extractLocalDeps,
  extractHooks,
  parseCssBlocks,
  selectorMatchesRoot,
  detectCssRoots,
  cssBlocksForRoots,
  extractTokens,
  extractTextUtils,
  readDemoExport,
  extractDemoSections,
  extractLegendRows,
  missingTokens,
  missingTextUtils,
  kebabCase,
  pascalCase,
  camelCase,
} from './port-readiness.mjs';
import {
  inferType,
  classifyProps,
  translateDemoProps,
  genDemoMeta,
  genDemoHtml,
  genModule,
  demoPrefix,
  insertPublicApi,
  insertAggregateModule,
  insertRegistry,
  insertAppModule,
  addedLines,
} from './scaffold-port.mjs';

// ── naming ───────────────────────────────────────────────────────────────────

test('kebab/pascal/camel round-trips', () => {
  assert.equal(kebabCase('CalendarPicker'), 'calendar-picker');
  assert.equal(kebabCase('SubAccordion'), 'sub-accordion');
  assert.equal(pascalCase('group-table'), 'GroupTable');
  assert.equal(camelCase('calendar-picker'), 'calendarPicker');
  assert.equal(demoPrefix('sub-accordion'), 'sa');
});

// ── prop extraction (fixture: real CalendarPicker.jsx signature — defaults with
//    commas inside call expressions) ─────────────────────────────────────────

const CALENDAR_SIG = `import { useState } from 'react'
export default function CalendarPicker({
  mode = 'single',
  value = null,
  onChange,
  defaultMonth,
  minDate = new Date(1900, 0, 1),
  maxDate = new Date(2120, 0, 1),
  className = '',
}) {
  const [monthStart, setMonthStart] = useState(initialMonth)
}`;

test('extractProps handles commas inside default expressions', () => {
  const { componentName, props, rest } = extractProps(CALENDAR_SIG);
  assert.equal(componentName, 'CalendarPicker');
  assert.equal(rest, false);
  assert.deepEqual(
    props.map((p) => p.name),
    ['mode', 'value', 'onChange', 'defaultMonth', 'minDate', 'maxDate', 'className']
  );
  assert.equal(props.find((p) => p.name === 'minDate').default, 'new Date(1900, 0, 1)');
  assert.equal(props.find((p) => p.name === 'mode').default, "'single'");
  assert.equal(props.find((p) => p.name === 'onChange').default, undefined);
});

// fixture: real GroupTable.jsx signature (has ...rest + exported helpers)
const GROUPTABLE_SIG = `import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
export default function GroupTable({
  columns = [],
  groups = [],
  renderCell,
  striped = true,
  className = '',
  ...rest
}) {
  const uid = useId()
}
export function alignClass(align) {}
export function isGroupExpanded(overrides, defaultExpanded, id) {}`;

test('extractProps captures ...rest; helpers + lucide imports extracted', () => {
  const { props, rest } = extractProps(GROUPTABLE_SIG);
  assert.equal(rest, true);
  assert.equal(props.length, 5);
  assert.deepEqual(extractExportedHelpers(GROUPTABLE_SIG), ['alignClass', 'isGroupExpanded']);
  assert.deepEqual(extractLucideImports(GROUPTABLE_SIG), ['ChevronDown']);
});

test('extractLocalDeps finds ./X.jsx composition imports', () => {
  assert.deepEqual(extractLocalDeps(`import Button from './Button.jsx'\n`), ['Button']);
});

test('extractHooks flags DOM-measurement signals', () => {
  const src = `const ref = useRef(null)\nuseLayoutEffect(() => { ref.current.getBoundingClientRect() })`;
  const { hooks, flags } = extractHooks(src);
  assert.ok(hooks.includes('useRef'));
  assert.ok(flags.some((f) => f.startsWith('useLayoutEffect')));
  assert.ok(flags.some((f) => f.startsWith('getBoundingClientRect')));
  assert.equal(extractHooks(`const [a, b] = useState(0)`).flags.length, 0);
});

// ── CSS parsing (fixture: real components.css shapes incl. @media) ──────────

const CSS_FIXTURE = `/* comment with .fake-selector { } */
.sub-accordion {
  background: var(--bg-primary);
  border-radius: var(--radius-2xl);
}
.sub-accordion--static .sub-accordion__header { cursor: default; }
.sub-accordion__title { /* heading/lg semibold */ color: var(--text-primary); }
.subtle-accordion-x { color: red; }
@media (prefers-reduced-motion: reduce) {
  .sub-accordion__reveal,
  .sub-accordion__chevron {
    transition: none;
  }
}
.odyssey-group-table { overflow-x: auto; }
`;

test('parseCssBlocks flattens rules incl. @media, skips comments', () => {
  const blocks = parseCssBlocks(CSS_FIXTURE);
  const sels = blocks.map((b) => b.selector);
  assert.ok(sels.includes('.sub-accordion'));
  assert.ok(sels.includes('.sub-accordion--static .sub-accordion__header'));
  assert.ok(!sels.some((s) => s.includes('fake-selector')));
  const media = blocks.find((b) => b.media);
  assert.equal(media.media, '@media (prefers-reduced-motion: reduce)');
  assert.match(media.selector, /__reveal/);
});

test('selectorMatchesRoot: BEM boundaries, no cross-component bleed', () => {
  assert.ok(selectorMatchesRoot('.sub-accordion', 'sub-accordion'));
  assert.ok(selectorMatchesRoot('.sub-accordion--static', 'sub-accordion'));
  assert.ok(selectorMatchesRoot('.sub-accordion__header:hover', 'sub-accordion'));
  assert.ok(!selectorMatchesRoot('.sub-accordion-x', 'sub-accordion')); // different component
  assert.ok(!selectorMatchesRoot('.odyssey-group-table', 'group-table')); // needs the exact class
  assert.ok(selectorMatchesRoot('.odyssey-group-table th', 'odyssey-group-table'));
});

test('detectCssRoots prefers class strings found in the JSX', () => {
  const blocks = parseCssBlocks(CSS_FIXTURE);
  assert.deepEqual(detectCssRoots(`const c = 'odyssey-group-table'`, 'group-table', blocks), ['odyssey-group-table']);
  // not referenced in JSX → falls back to what exists in the CSS
  assert.deepEqual(detectCssRoots(`nothing here`, 'sub-accordion', blocks), ['sub-accordion']);
  const matched = cssBlocksForRoots(blocks, ['sub-accordion']);
  assert.equal(matched.length, 4); // base + static + title + media rule; NOT .subtle-accordion-x
});

test('extractTokens + extractTextUtils + missing diffs', () => {
  assert.deepEqual(extractTokens('a { color: var(--text-primary); b: var(--spacing-2) }'), ['--text-primary', '--spacing-2']);
  assert.deepEqual(extractTextUtils(`<span className="text-label-sm-medium x">`), ['text-label-sm-medium']);
  assert.deepEqual(missingTokens(['--a', '--b'], ':root { --a: 1; }'), ['--b']);
  assert.deepEqual(missingTextUtils(['text-label-sm-medium'], '.text-label-sm-medium { }'), []);
  assert.deepEqual(missingTextUtils(['text-heading-lg-semibold'], ''), ['text-heading-lg-semibold']);
});

// ── demo export reading (fixture: real CalendarPicker.demo.jsx meta) ─────────

const DEMO_FIXTURE = `import { useState } from 'react'
export const meta = {
  // One demo, two exports.
  name: 'CalendarPicker + DatePicker',
  tier: 'molecule',
  version: null,
  normalizing: true,
  approved: true,
  figmaNode: '4422:711',
  codeConnect: null,
}
export const props = [
  { name: 'mode', type: "'single' | 'range'", desc: "Selection mode. \`single\` (default) selects one date." },
  { name: 'onChange', type: '(next) => void', desc: 'Fires on select.' },
  { name: 'children', type: 'node', desc: 'Body.' },
  { name: 'icon', type: 'node', desc: 'Swaps the header icon.' },
]
export const tokens = [
  { token: '--white', resolves: '#FFFFFF', usage: 'card background' },
]
function Schematic() {
  return (
    <div>
      <h4 className="ds-demo-section__title">Schematic — anatomy (master sample data)</h4>
      <ul>
        <LegendRow part="container" tier="molecule">284px fixed-width card — <code>--white</code> bg.</LegendRow>
        <LegendRow part="header" nested>32px row with {'{ DatePicker }'} import.</LegendRow>
      </ul>
      <h4 className="ds-demo-section__title">Playground — DatePicker composite</h4>
    </div>
  )
}`;

test('readDemoExport evals meta/props/tokens literals (comments, nulls, quotes)', () => {
  const meta = readDemoExport(DEMO_FIXTURE, 'meta');
  assert.equal(meta.name, 'CalendarPicker + DatePicker');
  assert.equal(meta.normalizing, true);
  assert.equal(meta.figmaNode, '4422:711');
  const props = readDemoExport(DEMO_FIXTURE, 'props');
  assert.equal(props.length, 4);
  assert.equal(props[0].type, "'single' | 'range'");
  const tokens = readDemoExport(DEMO_FIXTURE, 'tokens');
  assert.equal(tokens[0].token, '--white');
  assert.equal(readDemoExport(DEMO_FIXTURE, 'nope'), null);
});

test('extractDemoSections + extractLegendRows', () => {
  assert.deepEqual(extractDemoSections(DEMO_FIXTURE), [
    'Schematic — anatomy (master sample data)',
    'Playground — DatePicker composite',
  ]);
  const rows = extractLegendRows(DEMO_FIXTURE);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { part: 'container', tier: 'molecule', nested: false, text: '284px fixed-width card — <code>--white</code> bg.' });
  assert.equal(rows[1].nested, true);
  assert.equal(rows[1].text, '32px row with { DatePicker } import.'); // JSX string expression unwrapped
});

// ── scaffold generators ──────────────────────────────────────────────────────

test('inferType + classifyProps', () => {
  assert.equal(inferType("''"), 'string');
  assert.equal(inferType('true'), 'boolean');
  assert.equal(inferType('42'), 'number');
  assert.equal(inferType('[]'), 'unknown[]');
  assert.equal(inferType('new Date(1900, 0, 1)'), null);
  assert.equal(inferType(undefined), null);

  const { inputs, outputs, hasChildren } = classifyProps([
    { name: 'title', default: undefined },
    { name: 'striped', default: 'true' },
    { name: 'onToggle', default: undefined },
    { name: 'children', default: undefined },
    { name: 'className', default: "''" },
  ]);
  assert.ok(hasChildren);
  assert.deepEqual(outputs, [{ name: 'toggle', reactName: 'onToggle' }]);
  assert.deepEqual(inputs.map((i) => i.name), ['title', 'striped', 'className']);
});

test('translateDemoProps: onX → (x), children → <ng-content>, node → slot', () => {
  const out = translateDemoProps(readDemoExport(DEMO_FIXTURE, 'props'));
  assert.equal(out[0].name, 'mode'); // passthrough
  assert.equal(out[1].name, '(change)');
  assert.equal(out[1].type, 'EventEmitter<unknown>');
  assert.equal(out[2].name, '<ng-content>');
  assert.equal(out[3].name, '[slot=icon]');
  assert.equal(out[3].type, 'projection');
});

test('genDemoMeta emits a valid DemoMeta module (angularName, normalizing, escaped quotes)', () => {
  const src = genDemoMeta({
    component: 'CalendarPicker',
    kebab: 'calendar-picker',
    meta: readDemoExport(DEMO_FIXTURE, 'meta'),
    demoProps: readDemoExport(DEMO_FIXTURE, 'props'),
    demoTokens: readDemoExport(DEMO_FIXTURE, 'tokens'),
  });
  assert.match(src, /export const calendarPickerMeta: DemoMeta = \{/);
  assert.match(src, /angularName: 'odyssey-calendar-picker',/);
  assert.match(src, /normalizing: true,/);
  assert.ok(!src.includes('codeConnect')); // null in the React meta → omitted
  assert.match(src, /'\\'single\\' \| \\'range\\''/); // quotes escaped
  assert.match(src, /export const calendarPickerTokens: DemoToken\[\] = \[/);
});

test('genDemoHtml: section skeleton + legend rows + TODO(port) markers', () => {
  const html = genDemoHtml({
    component: 'CalendarPicker',
    kebab: 'calendar-picker',
    demoSections: extractDemoSections(DEMO_FIXTURE),
    legendRows: extractLegendRows(DEMO_FIXTURE),
  });
  assert.equal((html.match(/class="ds-demo-section"/g) || []).length, 2);
  assert.match(html, /<h4 class="ds-demo-section__title">Schematic — anatomy \(master sample data\)<\/h4>/);
  assert.match(html, /cp-schem__legend/);
  assert.equal((html.match(/<\/li>/g) || []).length, 2);
  assert.match(html, /TODO\(port\): playground/);
  assert.match(html, /cp-schem__label--nested/);
});

test('genModule: CommonModule + lucide pick + composed dep modules', () => {
  const src = genModule({ kebab: 'calendar-picker', lucide: ['ArrowLeft', 'ArrowRight'], localDeps: ['Button'] });
  assert.match(src, /LucideAngularModule\.pick\(\{ ArrowLeft, ArrowRight \}\)/);
  assert.match(src, /import \{ OdysseyButtonModule \} from '\.\.\/button\/odyssey-button\.module';/);
  assert.match(src, /declarations: \[OdysseyCalendarPickerComponent\]/);
  assert.match(src, /export class OdysseyCalendarPickerModule \{\}/);
});

// ── wiring insertions (fixtures: real file shapes) ───────────────────────────

const PUBLIC_API_FIXTURE = `/*
 * Public API surface of odyssey-ui.
 */
export * from './lib/odyssey-ui.module';
export * from './lib/group-table/odyssey-group-table.module';
export * from './lib/group-table/odyssey-group-table.component';
`;

test('insertPublicApi appends both exports, idempotently', () => {
  const once = insertPublicApi(PUBLIC_API_FIXTURE, 'calendar-picker');
  assert.match(once, /export \* from '\.\/lib\/calendar-picker\/odyssey-calendar-picker\.module';\nexport \* from '\.\/lib\/calendar-picker\/odyssey-calendar-picker\.component';\n$/);
  assert.equal(insertPublicApi(once, 'calendar-picker'), once); // idempotent
});

const AGGREGATE_FIXTURE = `import { NgModule } from '@angular/core';
import { OdysseyButtonModule } from './button/odyssey-button.module';
import { OdysseyGroupTableModule } from './group-table/odyssey-group-table.module';

@NgModule({
  imports: [
    OdysseyButtonModule,
    OdysseyGroupTableModule,
  ],
  exports: [
    OdysseyButtonModule,
    OdysseyGroupTableModule,
  ],
})
export class OdysseyUiModule {}
`;

test('insertAggregateModule adds import + BOTH array entries (G12), idempotently', () => {
  const once = insertAggregateModule(AGGREGATE_FIXTURE, 'calendar-picker');
  assert.match(once, /import \{ OdysseyCalendarPickerModule \} from '\.\/calendar-picker\/odyssey-calendar-picker\.module';/);
  assert.equal((once.match(/^ {4}OdysseyCalendarPickerModule,$/gm) || []).length, 2);
  assert.equal(insertAggregateModule(once, 'calendar-picker'), once);
});

const REGISTRY_FIXTURE = `import { DemoEntry } from '../dsm/demo.types';
import { GroupTableDemoComponent } from './group-table.demo.component';
import { groupTableMeta, groupTableProps, groupTableTokens } from './group-table.demo.meta';

export const DEMOS: DemoEntry[] = [
  { meta: groupTableMeta, props: groupTableProps, tokens: groupTableTokens, component: GroupTableDemoComponent },
];
`;

test('insertRegistry adds imports + entry before the closing bracket, idempotently', () => {
  const once = insertRegistry(REGISTRY_FIXTURE, 'calendar-picker');
  assert.match(once, /import \{ CalendarPickerDemoComponent \} from '\.\/calendar-picker\.demo\.component';/);
  assert.match(once, /import \{ calendarPickerMeta, calendarPickerProps, calendarPickerTokens \} from '\.\/calendar-picker\.demo\.meta';/);
  assert.match(once, /\{ meta: calendarPickerMeta, props: calendarPickerProps, tokens: calendarPickerTokens, component: CalendarPickerDemoComponent \},\n\];/);
  assert.equal(insertRegistry(once, 'calendar-picker'), once);
});

const APP_MODULE_FIXTURE = `import { NgModule } from '@angular/core';
import {
  LucideAngularModule,
  Search, ArrowRight,
} from 'lucide-angular';
import {
  OdysseyUiModule,
  OdysseyGroupTableModule,
} from 'odyssey-ui';
import { AppComponent } from './app.component';
import { GroupTableDemoComponent } from './demos/group-table.demo.component';

@NgModule({
  declarations: [
    AppComponent,
    GroupTableDemoComponent,
  ],
  imports: [
    OdysseyUiModule,
    OdysseyGroupTableModule,
    LucideAngularModule.pick({
      Search, ArrowRight,
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
`;

test('insertAppModule wires lib module (named import + imports[]) and demo component (import + declarations[]), idempotently', () => {
  const once = insertAppModule(APP_MODULE_FIXTURE, 'calendar-picker');
  assert.match(once, /OdysseyCalendarPickerModule,\n\} from 'odyssey-ui';/);
  assert.match(once, /import \{ CalendarPickerDemoComponent \} from '\.\/demos\/calendar-picker\.demo\.component';/);
  assert.match(once, /GroupTableDemoComponent,\n {4}CalendarPickerDemoComponent,/);
  assert.match(once, /OdysseyCalendarPickerModule,\n {4}LucideAngularModule\.pick\(\{/);
  assert.equal(insertAppModule(once, 'calendar-picker'), once);
});

test('addedLines reports pure insertions with line numbers', () => {
  const before = 'a\nb\nc';
  const after = 'a\nX\nb\nc\nY';
  assert.deepEqual(addedLines(before, after), [
    { line: 2, text: 'X' },
    { line: 5, text: 'Y' },
  ]);
});
