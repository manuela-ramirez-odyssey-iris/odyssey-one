#!/usr/bin/env node
// Generates docs/design-system/odyssey-design-system.md — tokens + literal usage, for
// external agents (D22, spec 2026-10-01-design-system-md-download). Reads tokens.css and the
// DSM demo files' `tokens` rows; no JSX executed, no dependencies.
//   node tools/design-system-md.mjs           write all outputs
//   node tools/design-system-md.mjs --check   exit 1 if the committed doc drifted
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = path.join(ROOT, 'packages/tokens/tokens.css');
const DEMOS = path.join(ROOT, 'apps/odyssey-one/src/routes/design-system/demos');
const INTRO = path.join(ROOT, 'tools/design-system-md.intro.md');
const USAGE = path.join(ROOT, 'tools/design-system-md.usage.json');
const OUT = path.join(ROOT, 'docs/design-system/odyssey-design-system.md');
const COPIES = [
  path.join(ROOT, 'apps/odyssey-one/public/odyssey-design-system.md'),
  path.join(ROOT, '../odyssey-one-library-ui/src/assets/odyssey-design-system.md'),
];
const MAX_MENTIONS = 8;

// ── tokens.css ────────────────────────────────────────────────────────────
// Walks the :root block line by line. `/* --- X --- */` opens a section; any other comment
// (inline, or standing right above a declaration) documents the next token.
export function parseTokens(css) {
  const root = css.slice(css.indexOf(':root'), css.search(/^}/m));
  const sections = [];
  let cur = null, pending = '', inComment = false, buf = '', isHeader = false;
  const flushComment = (text) => {
    const t = text.replace(/\s+/g, ' ').trim();
    if (isHeader) isHeader = false; else pending = t;
  };
  for (const raw of root.split('\n')) {
    let line = raw;
    if (inComment) {
      const end = line.indexOf('*/');
      if (end < 0) { buf += ' ' + line; continue; }
      buf += ' ' + line.slice(0, end); inComment = false; flushComment(buf); line = line.slice(end + 2);
    }
    // standalone comment start (possibly multi-line)
    const open = line.match(/^\s*\/\*(.*)$/);
    if (open && !/^\s*--/.test(line)) {
      const body = open[1], end = body.indexOf('*/');
      const h = body.match(/^\s*---\s*(.*?)\s*(?:---|$)/);
      if (h) {
        cur = { name: h[1].replace(/\s*---.*$/, '').replace(/\s*\(.*$/, '').trim(), tokens: [] }; sections.push(cur); isHeader = true; pending = '';
      }
      if (end < 0) { inComment = true; buf = body; continue; }
      flushComment(body.slice(0, end));
      continue;
    }
    const d = line.match(/^\s*(--[\w-]+)\s*:\s*(.*?);\s*(?:\/\*(.*?)\*\/)?\s*$/);
    if (d && cur) {
      cur.tokens.push({ name: d[1], value: d[2].trim(), comment: (d[3] || pending).replace(/\s+/g, ' ').trim() });
      pending = '';
    }
  }
  return sections.filter((s) => s.tokens.length);
}

// Follow var() chains to the final literal. `chain` = token names visited when the value is a
// bare var() alias (used to name the palette primitive).
export function resolve(name, map, chain = []) {
  const v = map.get(name);
  if (v === undefined) return { value: `var(${name})`, chain };
  const bare = v.match(/^var\((--[\w-]+)\)$/);
  if (bare) return resolve(bare[1], map, [...chain, bare[1]]);
  const value = v.replace(/var\((--[\w-]+)(?:,[^)]*)?\)/g, (_, n) => resolve(n, map).value);
  return { value, chain };
}

const titleCase = (n) => n.replace(/^--/, '').split('-').map((w) => (/^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ');

// ── comment condensing ────────────────────────────────────────────────────
export function condense(c) {
  let t = c
    .replace(/\(?\b[SD]\d+(?:[–-][SD]?\d+)?\b\)?/g, '')                 // session ids
    .replace(/\(?\b\d{4}-\d{2}-\d{2}\b\)?/g, '')                          // dates
    .replace(/Figma\s+`[^`]*`/g, '')                                      // Figma `x/y` noise
    .replace(/\s+([.,;:)])/g, '$1').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
  // first sentence with real content ("Added S136." leaves a stub once the id is stripped)
  const sents = t.split(/(?<=[.!?])\s+(?=[A-Z`])/);
  t = (sents.find((x) => x.split(' ').length >= 3) || sents[0]).trim().replace(/^[—–-]\s*/, '');
  if (t.length > 200) t = t.slice(0, 197).trimEnd() + '…';
  return /[A-Za-z]{3}/.test(t) ? t : '';
}

export const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

// ── demos ─────────────────────────────────────────────────────────────────
// Bracket-balanced slice of the literal after `export const <name> =`, string-aware.
export function extractLiteral(src, name) {
  const m = src.match(new RegExp(`(?:export )?const ${name}\\s*=\\s*`));
  if (!m) return null;
  const start = m.index + m[0].length, open = src[start];
  const close = open === '[' ? ']' : open === '{' ? '}' : null;
  if (!close) return null;
  let depth = 0, q = null;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') q = ch;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

export function readDemos(dir, warn = console.warn) {
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.demo.jsx')).sort()) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    try {
      const meta = new Function('return ' + extractLiteral(src, 'meta'))();
      const tokenSrc = extractLiteral(src, 'tokens');
      // a `tokens` array may spread a top-level literal constant (TimelineDot's FILLS) —
      // evaluate those too and pass them in by name
      const consts = {};
      for (const id of new Set(tokenSrc?.match(/\b[A-Z][A-Z0-9_]{2,}\b/g) || [])) {
        const lit = extractLiteral(src, id);
        if (lit) consts[id] = new Function('return ' + lit)();
      }
      const tokens = tokenSrc ? new Function(...Object.keys(consts), 'return ' + tokenSrc)(...Object.values(consts)) : [];
      out.push({ name: meta.name, tokens });
    } catch (e) {
      warn(`design-system-md: could not parse ${f}: ${e.message}`);
      out.failed = [...(out.failed || []), f];
    }
  }
  return out;
}

export const rowNamesToken = (field, name) =>
  new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(field);

const STYLE_RE = /^([a-z]+)\/(\w+)\s+(regular|medium|semibold)$/i;

function mentions(rows) {
  const uniq = [...new Set(rows)];
  const shown = uniq.slice(0, MAX_MENTIONS).join('; ');
  return uniq.length > MAX_MENTIONS ? `${shown}; +${uniq.length - MAX_MENTIONS} more` : shown;
}

export function usageFor(name, demos) {
  const rows = [];
  for (const d of demos) for (const r of d.tokens) {
    if (r && typeof r.token === 'string' && rowNamesToken(r.token, name)) rows.push(`${d.name}: ${r.usage}`);
  }
  return rows;
}

// ── render ────────────────────────────────────────────────────────────────
export function render({ sections, demos, intro, date, usage = {} }) {
  const map = new Map();
  sections.forEach((s) => s.tokens.forEach((t) => map.set(t.name, t.value)));
  const prim = new Set(sections.filter((s) => s.name.startsWith('Primitives')).flatMap((s) => s.tokens.map((t) => t.name)));
  const nTokens = map.size;
  const nRows = demos.reduce((n, d) => n + d.tokens.length, 0);

  let md = intro.replace(/\s*$/, '\n') + '\n';
  md += `_Generated ${date} from tokens.css (${nTokens} tokens) and ${nRows} DSM token-usage rows._\n`;

  for (const s of sections) {
    md += `\n## ${s.name}\n\n| Token | Value | Resolves to | Used for |\n| --- | --- | --- | --- |\n`;
    for (const t of s.tokens) {
      const { value, chain } = resolve(t.name, map);
      let resolves = value === t.value ? '' : value;
      const last = chain[chain.length - 1];
      if (resolves && last && prim.has(last) && /^#|^rgb/i.test(value)) resolves += ` (${titleCase(last)})`;
      // the comment stays out of the 8-mention cap — the cap is for component rows only
      // hand-authored entry (tools/design-system-md.usage.json) leads the cell and supersedes the
      // bare "Alias of" fallback
      let used = [usage[t.name], condense(t.comment), mentions(usageFor(t.name, demos))].filter(Boolean).join('; ');
      if (!used) {
        const alias = t.value.match(/^var\((--[\w-]+)\)$/);
        if (/^(Semantic|Component)/.test(s.name) && alias) used = `Alias of ${alias[1]}`;
        else if (prim.has(t.name)) used = 'Palette primitive — not used directly by components';
      }
      md += `| ${esc('`' + t.name + '`')} | ${esc('`' + t.value + '`')} | ${resolves ? esc('`' + resolves + '`') : ''} | ${esc(used)} |\n`;
    }
  }

  // Named type styles (not CSS vars) referenced in demo rows.
  const styles = new Map();
  for (const d of demos) for (const r of d.tokens) {
    const m = typeof r?.token === 'string' && r.token.trim().match(STYLE_RE);
    if (!m) continue;
    const key = `${m[1].toLowerCase()}/${m[2].toLowerCase()} ${m[3].toLowerCase()}`;
    (styles.get(key) || styles.set(key, []).get(key)).push(`${d.name}: ${r.usage}`);
  }
  md += `\n## Type styles\n\n| Style | Size / line-height / weight | Used for |\n| --- | --- | --- |\n`;
  for (const key of [...styles.keys()].sort()) {
    const [, size, weight] = key.match(/^\w+\/(\w+) (\w+)$/);
    const g = (n) => resolve(n, map).value;
    const spec = map.has(`--font-size-${size}`)
      ? `${g(`--font-size-${size}`)} / ${g(`--line-height-${size}`)} / ${g(`--font-weight-${weight}`)}` : '';
    md += `| ${esc('`' + key + '`')} | ${esc(spec)} | ${esc(mentions(styles.get(key)))} |\n`;
  }
  return md;
}

// ── drift ─────────────────────────────────────────────────────────────────
const stripDate = (s) => s.replace(/^_Generated .*$/m, '');
const bySection = (s) => {
  const parts = stripDate(s).split(/^## /m);
  return new Map(parts.map((p, i) => [i === 0 ? '(intro)' : p.split('\n')[0], p]));
};
export function driftedSections(fresh, committed) {
  const a = bySection(fresh), b = bySection(committed);
  return [...new Set([...a.keys(), ...b.keys()])].filter((k) => a.get(k) !== b.get(k));
}
export const checkExitCode = (drifted) => (drifted.length ? 1 : 0);

// ── main ──────────────────────────────────────────────────────────────────
function main() {
  const demos = readDemos(DEMOS);
  const sections = parseTokens(fs.readFileSync(TOKENS, 'utf8'));
  const md = render({
    sections, demos, intro: fs.readFileSync(INTRO, 'utf8'), usage: JSON.parse(fs.readFileSync(USAGE, 'utf8')), date: new Date().toISOString().slice(0, 10),
  });
  const nTokens = sections.reduce((n, s) => n + s.tokens.length, 0);
  const nRows = demos.reduce((n, d) => n + d.tokens.length, 0);

  if (process.argv.includes('--check')) {
    const drifted = driftedSections(md, fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '');
    if (drifted.length) console.error(`design-system-md: drift in: ${drifted.join(', ')} — run npm run ds:md`);
    else console.log('design-system-md: up to date');
    process.exit(checkExitCode(drifted));
  }

  for (const p of [OUT, ...COPIES]) {
    if (!fs.existsSync(path.dirname(p))) {
      console.warn(`design-system-md: skipped ${p} (directory missing)`);
      continue;
    }
    fs.writeFileSync(p, md);
    console.log(`wrote ${path.relative(ROOT, p)}`);
  }
  console.log(`${nTokens} tokens, ${nRows} usage rows, ${demos.failed?.length || 0} demo(s) failed to parse`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
