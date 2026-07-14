// port-readiness.mjs — automates Angular-port Phase 1 (Gather). READ-ONLY.
// Usage: node tools/port-readiness.mjs <Component>
// Parses the React canonical (component + CSS + demo), diffs tokens/typography
// utilities against the Angular library, and prints a readiness report.
// Pure extractors are exported for reuse by scaffold-port.mjs and unit tests
// (same pattern as odyssey-one-library-ui/tools/angular-parity-lint.mjs).

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── paths ────────────────────────────────────────────────────────────────────
export const REACT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ANGULAR_ROOT = resolve(REACT_ROOT, '..', 'odyssey-one-library-ui');
export const PATHS = {
  component: (c) => join(REACT_ROOT, 'packages/ui/src', `${c}.jsx`),
  componentsCss: join(REACT_ROOT, 'apps/odyssey-one/src/styles/components.css'),
  demosDir: join(REACT_ROOT, 'apps/odyssey-one/src/routes/design-system/demos'),
  demo: (c) => join(REACT_ROOT, 'apps/odyssey-one/src/routes/design-system/demos', `${c}.demo.jsx`),
  ngTokens: join(ANGULAR_ROOT, 'projects/odyssey-ui/src/styles/_tokens.scss'),
  ngTypography: join(ANGULAR_ROOT, 'projects/odyssey-ui/src/styles/_typography.scss'),
};

// ── naming ───────────────────────────────────────────────────────────────────
export const kebabCase = (name) =>
  name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').toLowerCase();
export const pascalCase = (kebab) =>
  kebab.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
export const camelCase = (kebab) => {
  const p = pascalCase(kebab);
  return p[0].toLowerCase() + p.slice(1);
};

// ── generic parsing helpers ──────────────────────────────────────────────────

/** Return the substring balanced from src[start] (which must be `open`), inclusive. */
export function extractBalanced(src, start, open = '{', close = '}') {
  let depth = 0;
  let inStr = null; // ', ", `
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    const prev = src[i - 1];
    if (inStr) {
      if (ch === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i === -1) break; continue; }
    if (ch === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

/** Split a destructure/arg body on top-level commas (string/bracket aware). */
export function splitTopLevel(body) {
  const parts = [];
  let depth = 0, inStr = null, cur = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      cur += ch;
      if (ch === inStr && body[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

// ── React component extraction ───────────────────────────────────────────────

/**
 * Parse `export default function <Name>({ a, b = x, ...rest })` →
 * { componentName, props: [{ name, default }], rest }.
 */
export function extractProps(jsxSrc) {
  const m = jsxSrc.match(/export default function\s+(\w+)\s*\(/);
  if (!m) return { componentName: null, props: [], rest: false };
  const parenStart = m.index + m[0].length - 1;
  const args = extractBalanced(jsxSrc, parenStart, '(', ')');
  if (!args) return { componentName: m[1], props: [], rest: false };
  const braceIdx = args.indexOf('{');
  if (braceIdx === -1) return { componentName: m[1], props: [], rest: false };
  const destructure = extractBalanced(args, braceIdx, '{', '}');
  const entries = splitTopLevel(destructure.slice(1, -1));
  const props = [];
  let rest = false;
  for (const e of entries) {
    if (!e || e.startsWith('//')) continue;
    if (e.startsWith('...')) { rest = true; continue; }
    const eq = e.indexOf('=');
    if (eq === -1) props.push({ name: e.trim(), default: undefined });
    else props.push({ name: e.slice(0, eq).trim(), default: e.slice(eq + 1).trim() });
  }
  return { componentName: m[1], props, rest };
}

/** Named `export function foo` helpers. */
export function extractExportedHelpers(src) {
  return [...src.matchAll(/^export function\s+(\w+)/gm)].map((m) => m[1]);
}

/** Lucide icon names imported from 'lucide-react'. */
export function extractLucideImports(src) {
  const m = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  if (!m) return [];
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

/** Relative `./X.jsx` @odyssey/ui composition imports (→ Odyssey<X>Module deps). */
export function extractLocalDeps(src) {
  return [...src.matchAll(/import\s+\w+[^'"]*from\s*['"]\.\/(\w+)\.jsx['"]/g)].map((m) => m[1]);
}

const COMPLEXITY_SIGNALS = [
  ['useRef', 'DOM ref (→ @ViewChild)'],
  ['useLayoutEffect', 'measure-before-paint (→ ngAfterViewInit + detectChanges)'],
  ['ResizeObserver', 'observer (→ ngAfterViewInit/ngOnDestroy wiring)'],
  ['IntersectionObserver', 'observer (→ service/directive)'],
  ['createPortal', 'portal (→ CDK overlay / body-append judgment)'],
  ['getBoundingClientRect', 'DOM measurement'],
  ['addEventListener', 'manual DOM listener (→ @HostListener + cleanup)'],
];

/** Hooks used + tier-3/4 complexity flags (per the port routine's model gateway). */
export function extractHooks(src) {
  const hooks = [...new Set([...src.matchAll(/\buse[A-Z]\w*/g)].map((m) => m[0]))];
  const flags = COMPLEXITY_SIGNALS.filter(([sig]) => src.includes(sig)).map(([sig, why]) => `${sig} — ${why}`);
  return { hooks, flags };
}

// ── CSS extraction ───────────────────────────────────────────────────────────

/** Flatten components.css into [{ selector, body, media }] (media = enclosing @media condition or null). */
export function parseCssBlocks(css, media = null) {
  const blocks = [];
  const src = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')); // blank comments, keep offsets
  let i = 0;
  while (i < src.length) {
    const brace = src.indexOf('{', i);
    if (brace === -1) break;
    const selector = src.slice(i, brace).trim();
    const block = extractBalanced(src, brace, '{', '}');
    if (!block) break;
    const body = block.slice(1, -1);
    if (selector.startsWith('@media') || selector.startsWith('@supports')) {
      blocks.push(...parseCssBlocks(body, selector));
    } else if (selector.startsWith('@')) {
      // @keyframes etc — keep as one opaque block
      blocks.push({ selector, body, media });
    } else if (selector) {
      blocks.push({ selector, body, media });
    }
    i = brace + block.length;
  }
  return blocks;
}

/** True when `selector` references `.root` as a full class (BEM __/-- allowed). */
export function selectorMatchesRoot(selector, root) {
  return new RegExp(`\\.${root}($|__|--|[^a-zA-Z0-9-])`).test(selector);
}

/** Candidate CSS roots for a component — `.odyssey-<kebab>` and `.<kebab>`, kept if referenced in the JSX or present in the CSS. */
export function detectCssRoots(jsxSrc, kebab, cssBlocks) {
  const candidates = [`odyssey-${kebab}`, kebab];
  const roots = candidates.filter(
    (c) => jsxSrc.includes(`'${c}`) || jsxSrc.includes(`"${c}`) || jsxSrc.includes(`\`${c}`)
  );
  if (roots.length) return roots;
  return candidates.filter((c) => cssBlocks.some((b) => selectorMatchesRoot(b.selector, c)));
}

export function cssBlocksForRoots(blocks, roots) {
  return blocks.filter((b) => roots.some((r) => selectorMatchesRoot(b.selector, r)));
}

/** Every var(--token) name in a string. */
export function extractTokens(text) {
  return [...new Set([...text.matchAll(/var\((--[a-zA-Z0-9-]+)/g)].map((m) => m[1]))];
}

/** Every .text-* typography utility referenced (in JSX className strings or CSS selectors). */
export function extractTextUtils(...texts) {
  const found = new Set();
  for (const t of texts) {
    for (const m of t.matchAll(/\btext-(?:display|heading|label|body|paragraph)[a-z0-9-]*/g)) found.add(m[0]);
  }
  return [...found];
}

// ── React demo extraction ────────────────────────────────────────────────────

/** Eval a top-level `export const <name> = {…}|[…]` literal out of a demo file. */
export function readDemoExport(demoSrc, name) {
  const m = demoSrc.match(new RegExp(`export const ${name}\\s*=\\s*`));
  if (!m) return null;
  const start = m.index + m[0].length;
  const open = demoSrc[start];
  if (open !== '{' && open !== '[') return null;
  const literal = extractBalanced(demoSrc, start, open, open === '{' ? '}' : ']');
  if (!literal) return null;
  try {
    return new Function(`return (${literal})`)();
  } catch {
    return null; // JSX or non-literal content — caller falls back
  }
}

/** meta/props/tokens from a React demo source. */
export function readDemoExports(demoSrc) {
  return {
    meta: readDemoExport(demoSrc, 'meta'),
    props: readDemoExport(demoSrc, 'props') || [],
    tokens: readDemoExport(demoSrc, 'tokens') || [],
  };
}

/**
 * Find the demo file for a component. Exact `<C>.demo.jsx` first; otherwise scan
 * all demos for a `meta.name` mentioning the component (handles e.g. file
 * CalendarPicker.demo.jsx with meta.name 'CalendarPicker + DatePicker' — and the
 * reverse, a demo file named after the combined meta).
 */
export function findDemoFile(component) {
  const exact = PATHS.demo(component);
  if (existsSync(exact)) return exact;
  for (const f of readdirSync(PATHS.demosDir).filter((f) => f.endsWith('.demo.jsx'))) {
    const src = readFileSync(join(PATHS.demosDir, f), 'utf8');
    const meta = readDemoExport(src, 'meta');
    if (meta?.name && meta.name.split(/[\s+/]+/).includes(component)) return join(PATHS.demosDir, f);
  }
  return null;
}

/** ds-demo-section titles, in order. */
export function extractDemoSections(demoSrc) {
  return [...demoSrc.matchAll(/<h4 className="ds-demo-section__title">([\s\S]*?)<\/h4>/g)].map((m) =>
    m[1].replace(/\s+/g, ' ').trim()
  );
}

/** LegendRow entries: { part, tier, nested, text }. Text keeps <code> tags; JSX string expressions are unwrapped. */
export function extractLegendRows(demoSrc) {
  const rows = [];
  for (const m of demoSrc.matchAll(/<LegendRow\s+([^>]*?)>([\s\S]*?)<\/LegendRow>/g)) {
    const attrs = m[1];
    const part = attrs.match(/part="([^"]*)"/)?.[1] ?? '';
    const tier = attrs.match(/tier=(?:"([^"]*)"|\{["'`]([^"'`]*)["'`]\})/);
    const text = m[2]
      .replace(/\{\s*['"`]([\s\S]*?)['"`]\s*\}/g, '$1') // {'literal'} → literal
      .replace(/\s+/g, ' ')
      .trim();
    rows.push({ part, tier: tier ? (tier[1] ?? tier[2]) : null, nested: /\bnested\b/.test(attrs), text });
  }
  return rows;
}

// ── Angular-side diffs ───────────────────────────────────────────────────────

export function missingTokens(tokens, tokensScss) {
  return tokens.filter((t) => !new RegExp(`${t}\\s*:`).test(tokensScss));
}

export function missingTextUtils(utils, typographyScss) {
  return utils.filter((u) => !typographyScss.includes(`.${u}`));
}

// ── gather (orchestration over the disk) ────────────────────────────────────

export function gather(component) {
  const jsxPath = PATHS.component(component);
  if (!existsSync(jsxPath)) throw new Error(`No React component at ${jsxPath}`);
  const jsx = readFileSync(jsxPath, 'utf8');
  const css = readFileSync(PATHS.componentsCss, 'utf8');
  const kebab = kebabCase(component);

  const allBlocks = parseCssBlocks(css);
  const roots = detectCssRoots(jsx, kebab, allBlocks);
  const cssBlocks = cssBlocksForRoots(allBlocks, roots);
  const cssText = cssBlocks.map((b) => `${b.selector} {${b.body}}`).join('\n');

  const tokens = [...new Set([...extractTokens(cssText), ...extractTokens(jsx)])];
  const textUtils = extractTextUtils(jsx, cssText);

  const demoPath = findDemoFile(component);
  const demoSrc = demoPath ? readFileSync(demoPath, 'utf8') : '';
  const demo = demoPath ? readDemoExports(demoSrc) : { meta: null, props: [], tokens: [] };

  const ngTokens = existsSync(PATHS.ngTokens) ? readFileSync(PATHS.ngTokens, 'utf8') : '';
  const ngTypo = existsSync(PATHS.ngTypography) ? readFileSync(PATHS.ngTypography, 'utf8') : '';

  return {
    component,
    kebab,
    jsx,
    jsxPath,
    ...extractProps(jsx),
    helpers: extractExportedHelpers(jsx),
    lucide: extractLucideImports(jsx),
    localDeps: extractLocalDeps(jsx),
    ...extractHooks(jsx),
    roots,
    cssBlocks,
    tokens,
    textUtils,
    missingTokens: missingTokens(tokens, ngTokens),
    missingTextUtils: missingTextUtils(textUtils, ngTypo),
    demoPath,
    demoSrc,
    demoMeta: demo.meta,
    demoProps: demo.props,
    demoTokens: demo.tokens,
    demoSections: demoPath ? extractDemoSections(demoSrc) : [],
    legendRows: demoPath ? extractLegendRows(demoSrc) : [],
  };
}

// ── report ───────────────────────────────────────────────────────────────────

export function report(g) {
  const out = [];
  const pad = (s, n) => String(s).padEnd(n);
  out.push(`Port readiness — ${g.component} (odyssey-${g.kebab})`);
  out.push('='.repeat(60));

  const tier = g.demoMeta?.tier ?? '?';
  out.push(`Demo: ${g.demoPath ? g.demoPath.replace(REACT_ROOT + '/', '') : '✖ NOT FOUND'}`);
  if (g.demoMeta) {
    out.push(`Meta: name='${g.demoMeta.name}' tier=${tier} figmaNode=${g.demoMeta.figmaNode ?? '—'} normalizing=${!!g.demoMeta.normalizing}`);
    if (g.demoMeta.name !== g.component) out.push(`  note: meta.name differs from component/file name ('${g.demoMeta.name}' vs '${g.component}')`);
  }

  out.push('');
  out.push(`Props (${g.props.length}${g.rest ? ' + ...rest' : ''}) — from ${g.componentName ?? '?'}() signature:`);
  for (const p of g.props) out.push(`  ${pad(p.name, 20)} default: ${p.default ?? '(required/undefined)'}`);
  if (g.helpers.length) out.push(`Exported helpers: ${g.helpers.join(', ')}`);
  if (g.lucide.length) out.push(`Lucide icons: ${g.lucide.join(', ')}`);
  if (g.localDeps.length) out.push(`Composes (local @odyssey/ui deps): ${g.localDeps.join(', ')} — verify these are already ported`);

  out.push('');
  const stateRules = g.cssBlocks.filter((b) => /(:hover|:focus|:active|:disabled|--[a-z])/.test(b.selector)).length;
  out.push(`CSS: roots [${g.roots.map((r) => '.' + r).join(', ')}] — ${g.cssBlocks.length} block(s), ${stateRules} state/modifier rule(s)`);
  const mediaBlocks = g.cssBlocks.filter((b) => b.media);
  if (mediaBlocks.length) out.push(`  incl. ${mediaBlocks.length} inside @media (${[...new Set(mediaBlocks.map((b) => b.media))].join('; ')})`);

  out.push('');
  out.push(`Tokens referenced (${g.tokens.length}): ${g.tokens.join(', ') || '—'}`);
  out.push(
    g.missingTokens.length
      ? `✖ MISSING from _tokens.scss (${g.missingTokens.length}): ${g.missingTokens.join(', ')} — add per G4 before generating`
      : '✓ all tokens present in _tokens.scss (G4)'
  );
  out.push(`.text-* utilities (${g.textUtils.length}): ${g.textUtils.join(', ') || '—'}`);
  out.push(
    g.missingTextUtils.length
      ? `✖ MISSING from _typography.scss (${g.missingTextUtils.length}): ${g.missingTextUtils.join(', ')} — port per G1 before generating`
      : '✓ all typography utilities present in _typography.scss (G1)'
  );

  out.push('');
  out.push(`Hooks: ${g.hooks.join(', ') || '—'}`);
  if (g.flags.length) {
    out.push(`⚠ Complexity flags (suggests Tier 3–4 → Opus subagent for Phase 2):`);
    for (const f of g.flags) out.push(`  - ${f}`);
  } else {
    out.push('✓ no DOM-measurement/observer/portal signals — Tier 1–2 (Sonnet subagent)');
  }

  out.push('');
  out.push(`Demo sections (${g.demoSections.length}):`);
  for (const s of g.demoSections) out.push(`  - ${s}`);
  if (g.legendRows.length) out.push(`Legend rows: ${g.legendRows.map((r) => r.part).join(', ')}`);

  return out.join('\n');
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const component = process.argv[2];
  if (!component) {
    console.error('Usage: node tools/port-readiness.mjs <Component>');
    process.exit(1);
  }
  try {
    console.log(report(gather(component)));
  } catch (e) {
    console.error(`✖ ${e.message}`);
    process.exit(1);
  }
}
