// scaffold-port.mjs — generates the mechanical boilerplate for a NEW Angular port
// in odyssey-one-library-ui (lib files + demo files + wiring edits).
// Usage: node tools/scaffold-port.mjs <Component> [--dry-run] [--force]
// The translation itself (template/logic/SCSS) stays a model task — every
// non-mechanical spot carries a `TODO(port)` marker. Pure generators are
// exported for unit tests (tools/scaffold-port.test.mjs).

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  ANGULAR_ROOT,
  REACT_ROOT,
  gather,
  kebabCase,
  pascalCase,
  camelCase,
} from './port-readiness.mjs';

// ── Angular repo paths ───────────────────────────────────────────────────────
export const NG = {
  libDir: (kebab) => join(ANGULAR_ROOT, 'projects/odyssey-ui/src/lib', kebab),
  demosDir: join(ANGULAR_ROOT, 'src/app/demos'),
  publicApi: join(ANGULAR_ROOT, 'projects/odyssey-ui/src/public-api.ts'),
  aggregateModule: join(ANGULAR_ROOT, 'projects/odyssey-ui/src/lib/odyssey-ui.module.ts'),
  registry: join(ANGULAR_ROOT, 'src/app/demos/demos.registry.ts'),
  appModule: join(ANGULAR_ROOT, 'src/app/app.module.ts'),
};

// single-quoted TS string literal
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

// ── prop → @Input()/@Output() stubs ─────────────────────────────────────────

/** Infer a TS type from a React default-value expression. null → needs a TODO. */
export function inferType(def) {
  if (def === undefined) return null;
  if (def === "''" || /^['"`]/.test(def)) return 'string';
  if (def === 'true' || def === 'false') return 'boolean';
  if (/^-?\d+(\.\d+)?$/.test(def)) return 'number';
  if (def === 'null') return null;
  if (def.startsWith('[')) return 'unknown[]';
  if (def.startsWith('{')) return 'Record<string, unknown>';
  return null;
}

/**
 * Classify React props into Angular members:
 *  - onFoo         → @Output() foo = new EventEmitter<unknown>()
 *  - children      → <ng-content> (no member)
 *  - className     → @Input() className = ''
 *  - everything else → typed @Input() stub (TODO on uninferable types)
 */
export function classifyProps(props) {
  const inputs = [];
  const outputs = [];
  let hasChildren = false;
  for (const p of props) {
    if (p.name === 'children') { hasChildren = true; continue; }
    const on = p.name.match(/^on([A-Z]\w*)$/);
    if (on) {
      const evt = on[1][0].toLowerCase() + on[1].slice(1);
      outputs.push({ name: evt, reactName: p.name });
      continue;
    }
    inputs.push({ name: p.name, default: p.default, type: inferType(p.default) });
  }
  return { inputs, outputs, hasChildren };
}

// ── lib file generators ──────────────────────────────────────────────────────

export function genComponentTs(ctx) {
  const { component, kebab, cssRoot, inputs, outputs } = ctx;
  const pascal = pascalCase(kebab);
  const ngImports = ['Component', 'Input'];
  if (outputs.length) ngImports.push('Output', 'EventEmitter');

  const lines = [];
  for (const i of inputs) {
    if (i.name === 'className') continue; // emitted last, always
    if (i.default !== undefined && i.type) {
      lines.push(`  @Input() ${i.name} = ${i.default};`);
    } else if (i.type) {
      lines.push(`  @Input() ${i.name}: ${i.type} | undefined;`);
    } else {
      const hint = i.default !== undefined ? ` (React default: ${i.default})` : '';
      lines.push(`  @Input() ${i.name}: unknown; // TODO(port): type this @Input${hint}`);
    }
  }
  lines.push(`  @Input() className = '';`);
  if (outputs.length) lines.push('');
  for (const o of outputs) {
    lines.push(`  @Output() ${o.name} = new EventEmitter<unknown>(); // TODO(port): type payload (React: ${o.reactName})`);
  }

  return `import { ${ngImports.join(', ')} } from '@angular/core';

/**
 * ${component} — TODO(port): port the doc comment from the React canonical.
 * Canonical React source: packages/ui/src/${component}.jsx
 */
@Component({
  selector: 'odyssey-${kebab}',
  templateUrl: './odyssey-${kebab}.component.html',
  styleUrls: ['./odyssey-${kebab}.component.scss'],
})
export class Odyssey${pascal}Component {
${lines.join('\n')}

  // TODO(port): implement component logic (state, getters, handlers) from the React source.

  /** G8 — className passthrough merged with the component base class. */
  get hostClass(): string {
    return ['${cssRoot}', this.className].filter(Boolean).join(' ');
  }
}
`;
}

export function genComponentHtml(ctx) {
  return `<!-- TODO(port): template — translate packages/ui/src/${ctx.component}.jsx JSX.
     Bind the root to [class]="hostClass" (G8). Named slots → <ng-content select="[slot=…]"> (G7). -->
`;
}

export function genComponentScss(ctx) {
  const { component, kebab, cssBlocks, roots } = ctx;
  const ref = cssBlocks
    .map((b) => {
      const rule = `${b.selector} {${b.body}}`;
      return b.media ? `${b.media} {\n${rule}\n}` : rule;
    })
    .join('\n\n')
    // comments were blanked to spaces during parsing (offset-preserving) — drop the residue
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
  return `/* ========================================
   ${component} — ported 1:1 from
   odyssey-one/apps/odyssey-one/src/styles/components.css (${roots.map((r) => '.' + r + '*').join(', ')} blocks).
   Canonical React: packages/ui/src/${component}.jsx
   All values via var(--token) only (G4). Descendant selectors for icons (G9).
   ::ng-deep scoped under the host for projected content (G7).
   ======================================== */

// TODO(port): translate the reference block below into the component SCSS
// (decide :host vs inner root element; see group-table for the :host pattern).

/* ── React CSS reference (verbatim from components.css) ─────────────────────

${ref.replace(/\*\//g, '*\\/')}

──────────────────────────────────────────────────────────────────────────── */
`;
}

export function genSpec(ctx) {
  const { kebab, cssRoot } = ctx;
  const pascal = pascalCase(kebab);
  return `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Odyssey${pascal}Component } from './odyssey-${kebab}.component';

describe('Odyssey${pascal}Component', () => {
  let component: Odyssey${pascal}Component;
  let fixture: ComponentFixture<Odyssey${pascal}Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Odyssey${pascal}Component],
      imports: [CommonModule],
    }).compileComponents();
    fixture = TestBed.createComponent(Odyssey${pascal}Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply className', () => {
    component.className = 'custom-class';
    expect(component.hostClass).toContain('custom-class');
  });

  it('should include the ${cssRoot} base class', () => {
    expect(component.hostClass).toContain('${cssRoot}');
  });

  // TODO(port): behavior tests mirroring the React component's states/interactions.
});
`;
}

export function genModule(ctx) {
  const { kebab, lucide, localDeps } = ctx;
  const pascal = pascalCase(kebab);
  const imports = [`import { NgModule } from '@angular/core';`, `import { CommonModule } from '@angular/common';`];
  const moduleImports = ['CommonModule'];
  if (lucide.length) {
    imports.push(`import { LucideAngularModule, ${lucide.join(', ')} } from 'lucide-angular';`);
    moduleImports.push(`LucideAngularModule.pick({ ${lucide.join(', ')} })`);
  }
  for (const dep of localDeps) {
    const depKebab = kebabCase(dep);
    imports.push(`import { Odyssey${dep}Module } from '../${depKebab}/odyssey-${depKebab}.module';`);
    moduleImports.push(`Odyssey${dep}Module`);
  }
  imports.push(`import { Odyssey${pascal}Component } from './odyssey-${kebab}.component';`);

  return `${imports.join('\n')}

@NgModule({
  declarations: [Odyssey${pascal}Component],
  imports: [${moduleImports.length > 2 ? '\n    ' + moduleImports.join(',\n    ') + ',\n  ' : moduleImports.join(', ')}],
  exports: [Odyssey${pascal}Component],
})
export class Odyssey${pascal}Module {}
`;
}

export function genFigmaLink(ctx) {
  const { component, meta } = ctx;
  return `# ${component} — Figma Link

- **figmaNode**: \`${meta?.figmaNode ?? 'TODO(port)'}\`
- **Canonical React source**: \`packages/ui/src/${component}.jsx\`
- **last_synced**: TODO(port) <!-- set to today's ISO date at Phase 5 -->

## Token bindings

TODO(port): token table (see the React demo's \`tokens\` export — already translated into the demo meta).

## Deviations from React canonical

TODO(port): document every deliberate divergence (callback→EventEmitter renames, slot mechanics, uid strategy, …).
`;
}

// ── demo file generators ─────────────────────────────────────────────────────

/** React demo prop → Angular DemoProp (mechanical rename rules; judgment spots keep TODO markers). */
export function translateDemoProps(reactProps) {
  return reactProps.map((p) => {
    const on = p.name.match(/^on([A-Z]\w*)$/);
    if (on) {
      const evt = on[1][0].toLowerCase() + on[1].slice(1);
      return { name: `(${evt})`, type: 'EventEmitter<unknown>', desc: `${p.desc} TODO(port): type + consider a past-tense event name.` };
    }
    if (p.name === 'children') return { name: '<ng-content>', type: 'projection', desc: p.desc };
    if (p.type === 'node') return { name: `[slot=${p.name.replace(/^DatePicker:\s*/, '')}]`, type: 'projection', desc: `${p.desc} TODO(port): confirm slot vs boolean-gated default (Angular cannot introspect empty projection).` };
    return { name: p.name, type: p.type, desc: p.desc };
  });
}

export function genDemoMeta(ctx) {
  const { kebab, meta, demoProps, demoTokens } = ctx;
  const camel = camelCase(kebab);
  const metaLines = [
    `  name: ${q(meta?.name ?? ctx.component)},`,
    `  angularName: 'odyssey-${kebab}',`,
    `  tier: ${q(meta?.tier ?? 'molecule')},`,
  ];
  if (meta?.figmaNode) metaLines.push(`  figmaNode: ${q(meta.figmaNode)},`);
  if (meta?.codeConnect) metaLines.push(`  codeConnect: ${q(meta.codeConnect)},`);
  metaLines.push('  normalizing: true,');

  const props = translateDemoProps(demoProps);
  const propLines = props.map((p) => `  { name: ${q(p.name)}, type: ${q(p.type)}, desc: ${q(p.desc)} },`);
  const tokenLines = demoTokens.map((t) => `  { token: ${q(t.token)}, resolves: ${q(t.resolves)}, usage: ${q(t.usage)} },`);

  return `import { DemoMeta, DemoProp, DemoToken } from '../dsm/demo.types';

export const ${camel}Meta: DemoMeta = {
${metaLines.join('\n')}
};

export const ${camel}Props: DemoProp[] = [
${propLines.join('\n')}
];

export const ${camel}Tokens: DemoToken[] = [
${tokenLines.join('\n')}
];
`;
}

/** Short scoped-class prefix from the kebab name (sub-accordion → sa, group-table → gt). */
export const demoPrefix = (kebab) => kebab.split('-').map((s) => s[0]).join('');

const escapeHtml = (s) => s.replace(/&(?![a-z]+;)/g, '&amp;');

/** The Angular demo HTML section skeleton translated from the React demo JSX. */
export function genDemoHtml(ctx) {
  const { component, kebab, demoSections, legendRows } = ctx;
  const pfx = demoPrefix(kebab);
  const out = [];
  out.push(`<p class="${pfx}-intro">`);
  out.push(`  <!-- TODO(port): intro paragraph from React ${component}.demo.jsx -->`);
  out.push('</p>');

  for (const title of demoSections) {
    out.push('');
    out.push('<!-- ============================================================');
    out.push(`     ${title}`);
    out.push('     ============================================================ -->');
    out.push('<div class="ds-demo-section">');
    out.push(`  <h4 class="ds-demo-section__title">${escapeHtml(title)}</h4>`);
    const isSchematic = /^schematic/i.test(title);
    if (isSchematic && legendRows.length) {
      out.push(`  <div class="${pfx}-schem">`);
      out.push(`    <div class="${pfx}-schem__panel">`);
      out.push(`      <!-- TODO(port): annotated odyssey-${kebab} instance(s) (mirror the React Schematic; pink SlotPlaceholder for content slots) -->`);
      out.push('    </div>');
      out.push(`    <ul class="${pfx}-schem__legend">`);
      for (const r of legendRows) {
        out.push(`      <li class="${pfx}-schem__row">`);
        const nested = r.nested ? `<span class="${pfx}-schem__nest" aria-hidden="true">└</span>` : '';
        const tier = r.tier ? `<span class="${pfx}-schem__tier">${r.tier}</span>` : '';
        out.push(`        <span class="${pfx}-schem__label${r.nested ? ` ${pfx}-schem__label--nested` : ''}">${nested}${escapeHtml(r.part)}${tier}</span>`);
        out.push(`        <span class="${pfx}-schem__desc">${escapeHtml(r.text)}</span>`);
        out.push('      </li>');
      }
      out.push('    </ul>');
      out.push('  </div>');
    } else {
      out.push('  <!-- TODO(port): playground — mirror the React demo controls + instance -->');
    }
    out.push('</div>');
  }
  out.push('');
  return out.join('\n');
}

export function genDemoTs(ctx) {
  const { component, kebab } = ctx;
  const pascal = pascalCase(kebab);
  return `import { Component } from '@angular/core';

/**
 * ${component} demo. Mirrors React ${component}.demo.jsx section-for-section
 * (Schematic — anatomy + legend, then Playground). TODO(port): playground state.
 */
@Component({
  selector: '${kebab}-demo',
  templateUrl: './${kebab}.demo.component.html',
  styleUrls: ['./${kebab}.demo.component.scss'],
})
export class ${pascal}DemoComponent {
  // TODO(port): playground state (mirror the React useState defaults).
}
`;
}

export function genDemoScss(ctx) {
  const { component, kebab } = ctx;
  const pfx = demoPrefix(kebab);
  return `/* ${component} demo — Schematic (anatomy) + Playground. Mirrors React ${component}.demo.jsx.
   All values via design tokens; copy the ${pfx}-schem__* legend pattern from
   sub-accordion.demo.component.scss / right-panel.demo.component.scss. */

.${pfx}-intro {
  margin-top: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

/* TODO(port): ${pfx}-schem / ${pfx}-schem__panel / ${pfx}-schem__legend / __row / __label / __tier / __desc
   + playground styles, ported from the React demo's inline styles. */
`;
}

// ── wiring edits (idempotent insert-if-missing) ──────────────────────────────

/** Insert `line` before the first line matching `beforeRe`. Throws if no anchor. */
function insertBefore(src, beforeRe, line, marker) {
  if (src.includes(marker)) return src; // idempotent
  const m = src.match(beforeRe);
  if (!m) throw new Error(`wiring anchor not found: ${beforeRe}`);
  return src.slice(0, m.index) + line + '\n' + src.slice(m.index);
}

/** Insert `line` after the LAST line matching `afterRe`. */
function insertAfterLast(src, afterRe, line, marker) {
  if (src.includes(marker)) return src;
  let last = null;
  for (const m of src.matchAll(afterRe)) last = m;
  if (!last) throw new Error(`wiring anchor not found: ${afterRe}`);
  const end = src.indexOf('\n', last.index) + 1;
  return src.slice(0, end) + line + '\n' + src.slice(end);
}

export function insertPublicApi(src, kebab) {
  const marker = `lib/${kebab}/odyssey-${kebab}.module`;
  if (src.includes(marker)) return src;
  return (
    src.trimEnd() +
    `\nexport * from './lib/${kebab}/odyssey-${kebab}.module';` +
    `\nexport * from './lib/${kebab}/odyssey-${kebab}.component';\n`
  );
}

export function insertAggregateModule(src, kebab) {
  const pascal = pascalCase(kebab);
  const mod = `Odyssey${pascal}Module`;
  if (src.includes(mod)) return src;
  let out = insertAfterLast(
    src,
    /^import \{ Odyssey\w+Module \} from '\.\/[^']+';$/gm,
    `import { ${mod} } from './${kebab}/odyssey-${kebab}.module';`,
    mod
  );
  // Append to BOTH imports:[] and exports:[] arrays — insert before each closing `  ],`
  // that follows the last OdysseyXModule entry.
  out = out.replace(/^( {4}Odyssey\w+Module,\n)( {2}\],)/gm, `$1    ${mod},\n$2`);
  return out;
}

export function insertRegistry(src, kebab) {
  const pascal = pascalCase(kebab);
  const camel = camelCase(kebab);
  const comp = `${pascal}DemoComponent`;
  if (src.includes(comp)) return src;
  let out = insertAfterLast(
    src,
    /^import \{ \w+Meta, \w+Props, \w+Tokens \} from '\.\/[^']+';$/gm,
    `import { ${comp} } from './${kebab}.demo.component';\nimport { ${camel}Meta, ${camel}Props, ${camel}Tokens } from './${kebab}.demo.meta';`,
    comp
  );
  out = insertBefore(
    out,
    /^\];/m,
    `  { meta: ${camel}Meta, props: ${camel}Props, tokens: ${camel}Tokens, component: ${comp} },`,
    `meta: ${camel}Meta`
  );
  return out;
}

export function insertAppModule(src, kebab) {
  const pascal = pascalCase(kebab);
  const mod = `Odyssey${pascal}Module`;
  const comp = `${pascal}DemoComponent`;
  let out = src;
  // 1. library module into the `} from 'odyssey-ui';` named-import block
  if (!out.includes(mod)) {
    out = insertBefore(out, /^\} from 'odyssey-ui';/m, `  ${mod},`, mod);
    // …and into the @NgModule imports array (before the LucideAngularModule.pick block)
    out = insertBefore(out, /^ {4}LucideAngularModule\.pick\(\{/m, `    ${mod},`, `    ${mod},\n`);
  }
  // 2. demo component import + declaration
  if (!out.includes(comp)) {
    out = insertAfterLast(
      out,
      /^import \{ \w+DemoComponent \} from '\.\/demos\/[^']+';$/gm,
      `import { ${comp} } from './demos/${kebab}.demo.component';`,
      comp
    );
    out = insertAfterLast(out, /^ {4}\w+DemoComponent,$/gm, `    ${comp},`, `    ${comp},`);
  }
  return out;
}

// ── plan + run ───────────────────────────────────────────────────────────────

/** Build the full scaffold plan: [{ path, content }] creates + [{ path, content }] wiring rewrites. */
export function buildPlan(component) {
  const g = gather(component);
  const kebab = g.kebab;
  const ctx = {
    component,
    kebab,
    meta: g.demoMeta,
    demoProps: g.demoProps,
    demoTokens: g.demoTokens,
    demoSections: g.demoSections,
    legendRows: g.legendRows,
    cssBlocks: g.cssBlocks,
    roots: g.roots,
    cssRoot: g.roots[0] ?? kebab,
    lucide: g.lucide,
    localDeps: g.localDeps,
    ...classifyProps(g.props),
  };
  const lib = NG.libDir(kebab);
  const pascal = pascalCase(kebab);
  const creates = [
    { path: join(lib, `odyssey-${kebab}.component.ts`), content: genComponentTs(ctx) },
    { path: join(lib, `odyssey-${kebab}.component.html`), content: genComponentHtml(ctx) },
    { path: join(lib, `odyssey-${kebab}.component.scss`), content: genComponentScss(ctx) },
    { path: join(lib, `odyssey-${kebab}.component.spec.ts`), content: genSpec(ctx) },
    { path: join(lib, `odyssey-${kebab}.module.ts`), content: genModule(ctx) },
    { path: join(lib, `${pascal}.figma-link.md`), content: genFigmaLink(ctx) },
    { path: join(NG.demosDir, `${kebab}.demo.meta.ts`), content: genDemoMeta(ctx) },
    { path: join(NG.demosDir, `${kebab}.demo.component.html`), content: genDemoHtml(ctx) },
    { path: join(NG.demosDir, `${kebab}.demo.component.ts`), content: genDemoTs(ctx) },
    { path: join(NG.demosDir, `${kebab}.demo.component.scss`), content: genDemoScss(ctx) },
  ];
  const wiring = [
    { path: NG.publicApi, apply: (s) => insertPublicApi(s, kebab) },
    { path: NG.aggregateModule, apply: (s) => insertAggregateModule(s, kebab) },
    { path: NG.registry, apply: (s) => insertRegistry(s, kebab) },
    { path: NG.appModule, apply: (s) => insertAppModule(s, kebab) },
  ].map(({ path, apply }) => {
    const before = readFileSync(path, 'utf8');
    return { path, before, after: apply(before) };
  });
  return { gathered: g, ctx, creates, wiring };
}

/** Added-lines diff (wiring edits are pure insertions). */
export function addedLines(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  const added = [];
  let i = 0;
  for (let j = 0; j < b.length; j++) {
    if (i < a.length && a[i] === b[j]) { i++; continue; }
    added.push({ line: j + 1, text: b[j] });
  }
  return added;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const component = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  if (!component) {
    console.error('Usage: node tools/scaffold-port.mjs <Component> [--dry-run] [--force]');
    process.exit(1);
  }
  const kebab = kebabCase(component);
  if (existsSync(NG.libDir(kebab)) && !force) {
    console.error(
      `✖ ${NG.libDir(kebab)} already exists — this scaffolds NEW ports only.\n` +
      `  Re-run with --force to overwrite (existing port work will be lost).`
    );
    process.exit(1);
  }

  const { gathered, creates, wiring } = buildPlan(component);
  if (gathered.missingTokens.length || gathered.missingTextUtils.length) {
    console.error(
      `⚠ readiness gaps — missing tokens: [${gathered.missingTokens.join(', ')}], ` +
      `missing .text-* utilities: [${gathered.missingTextUtils.join(', ')}] — resolve per G1/G4 (scaffold continues).`
    );
  }

  if (dryRun) {
    console.log(`scaffold-port ${component} — DRY RUN (nothing written)\n`);
    for (const f of creates) {
      console.log(`── would create: ${f.path.replace(ANGULAR_ROOT, 'odyssey-one-library-ui')} ${'─'.repeat(8)}`);
      console.log(f.content);
    }
    for (const w of wiring) {
      const added = addedLines(w.before, w.after);
      console.log(`── would edit: ${w.path.replace(ANGULAR_ROOT, 'odyssey-one-library-ui')} (+${added.length} line(s))`);
      for (const l of added) console.log(`  +${l.line}: ${l.text}`);
    }
    process.exit(0);
  }

  mkdirSync(dirname(creates[0].path), { recursive: true });
  for (const f of creates) {
    writeFileSync(f.path, f.content);
    console.log(`✓ created ${f.path.replace(ANGULAR_ROOT, 'odyssey-one-library-ui')}`);
  }
  for (const w of wiring) {
    if (w.before === w.after) { console.log(`= unchanged ${w.path.replace(ANGULAR_ROOT, 'odyssey-one-library-ui')}`); continue; }
    writeFileSync(w.path, w.after);
    console.log(`✓ wired ${w.path.replace(ANGULAR_ROOT, 'odyssey-one-library-ui')} (+${addedLines(w.before, w.after).length} line(s))`);
  }
  console.log(`\nScaffold complete — search for TODO(port) markers, then run the parity-lint + builds (Phase 3).`);
}
