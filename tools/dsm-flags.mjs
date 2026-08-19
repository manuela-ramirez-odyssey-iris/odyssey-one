// DSM staging-flag lifecycle over BOTH repos' demo metas (React .demo.jsx +
// Angular .demo.meta.ts). Targeted string surgery on the meta object literal
// only — everything outside the touched field lines is preserved verbatim.
//
//   node tools/dsm-flags.mjs <Component...> --approve|--port|--demote|--release <ver>
//                            [--react-only|--angular-only|--both] [--dry-run]
//
// Lifecycle (playground/figma-component-routine.md + angular-port-routine.md):
//   approve         → approved: true (keep normalizing: true). React-side by default.
//   port            → ported: true in BOTH repos (keep normalizing + approved).
//   demote          → BOTH repos: remove approved/ported, set normalizing: true.
//                     Modification-reset — a released/approved/ported component was
//                     changed and goes back into staging (feedback_modified_component_
//                     back_to_normalizing). Never touches version/createdVersion.
//   release <ver>   → BOTH repos: remove approved/ported, set normalizing: false,
//                     stamp version; stamp createdVersion ONLY if absent/null
//                     (never overwrite — it marks the release a component FIRST shipped in).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const REACT_DEMOS = join(REPO_ROOT, 'apps/odyssey-one/src/routes/design-system/demos');
export const ANGULAR_ROOT = join(REPO_ROOT, '..', 'odyssey-one-library-ui');
const ANGULAR_DEMOS = join(ANGULAR_ROOT, 'src/app/demos');

// React demo FILE name → Angular kebab dir/selector, for the odd cases where a
// straight PascalCase→kebab conversion doesn't match the Angular repo.
// (meta.name is irrelevant here — components are addressed by React file name.)
export const KEBAB_ALIASES = {
  OdysseyLogo: 'logo', // selector `odyssey-logo`, folder `logo`
};

export const toKebab = (name) =>
  KEBAB_ALIASES[name] ?? name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// ── meta-block parsing ───────────────────────────────────────────────────────

/** Skip a quoted string starting at src[i]; returns index AFTER the close quote. */
function skipString(src, i) {
  const q = src[i];
  for (i++; i < src.length; i++) {
    if (src[i] === '\\') i++;
    else if (src[i] === q) return i + 1;
  }
  throw new Error('unterminated string while scanning meta block');
}

/**
 * Locate the exported meta object literal.
 * React:   `export const meta = {`
 * Angular: `export const <x>Meta: DemoMeta = {`
 * Returns { start, end } — indices of the opening and closing braces (inclusive).
 */
export function findMetaBlock(source) {
  const decl = source.match(/export const (?:meta|\w+Meta)\s*(?::\s*DemoMeta)?\s*=\s*\{/);
  if (!decl) throw new Error('meta object literal not found (expected `export const meta = {` or `export const <x>Meta: DemoMeta = {`)');
  const start = decl.index + decl[0].length - 1;
  let depth = 0;
  for (let i = start; i < source.length; ) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '/') {
      const nl = source.indexOf('\n', i);
      i = nl === -1 ? source.length : nl;
    } else if (c === '/' && source[i + 1] === '*') {
      const close = source.indexOf('*/', i + 2);
      if (close === -1) throw new Error('unterminated block comment in meta block');
      i = close + 2;
    } else if (c === "'" || c === '"' || c === '`') {
      i = skipString(source, i);
    } else {
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) return { start, end: i };
      i++;
    }
  }
  throw new Error('meta block opening brace never closes — cannot parse');
}

// ── field surgery (line-based; a field with an inline comment loses the comment,
//    which the routine explicitly allows) ─────────────────────────────────────

const fieldRe = (key) => new RegExp(`^([ \\t]*)${key}\\s*:\\s*(.*?),?\\s*(?://.*)?$`, 'm');

function getField(block, key) {
  const m = block.match(fieldRe(key));
  return m ? m[2].trim() : undefined;
}

function setField(block, key, value) {
  const re = fieldRe(key);
  const m = block.match(re);
  if (m) {
    if (m[2].trim() === value) return { block, change: null }; // already there
    return {
      block: block.replace(re, `${m[1]}${key}: ${value},`),
      change: { field: key, from: m[2].trim(), to: value },
    };
  }
  // insert before the closing brace, matching the block's field indentation
  const indent = block.match(/\n([ \t]+)\w+\s*:/)?.[1] ?? '  ';
  const closing = block.lastIndexOf('}');
  const before = block.slice(0, closing).replace(/\n?$/, '\n');
  return {
    block: `${before}${indent}${key}: ${value},\n${block.slice(closing)}`,
    change: { field: key, from: '(absent)', to: value },
  };
}

function removeField(block, key) {
  const re = new RegExp(`\\n[ \\t]*${key}\\s*:\\s*.*?,?[ \\t]*(?://[^\\n]*)?(?=\\n)`);
  const m = block.match(re);
  if (!m) return { block, change: null };
  const value = getField(block, key);
  return { block: block.replace(re, ''), change: { field: key, from: value, to: '(removed)' } };
}

// ── lifecycle transforms (pure: source in → { source, changes } out) ─────────

/**
 * @param {string} source  full demo-file contents (.jsx or .ts — same handling)
 * @param {'approve'|'port'|'demote'|'release'} action
 * @param {string} [version]  required for release
 */
export function applyAction(source, action, version) {
  const { start, end } = findMetaBlock(source);
  let block = source.slice(start, end + 1);
  const changes = [];
  const apply = ({ block: b, change }) => { block = b; if (change) changes.push(change); };

  if (action === 'approve') {
    if (getField(block, 'normalizing') !== 'true') apply(setField(block, 'normalizing', 'true'));
    apply(setField(block, 'approved', 'true'));
  } else if (action === 'port') {
    apply(setField(block, 'ported', 'true'));
  } else if (action === 'demote') {
    // Modification-reset: a released/approved/ported component was changed →
    // back to NORMALIZING in BOTH DSMs until re-approval (memory:
    // feedback_modified_component_back_to_normalizing).
    apply(removeField(block, 'approved'));
    apply(removeField(block, 'ported'));
    apply(setField(block, 'normalizing', 'true'));
  } else if (action === 'release') {
    if (!version) throw new Error('release requires a version');
    apply(removeField(block, 'approved'));
    apply(removeField(block, 'ported'));
    apply(setField(block, 'normalizing', 'false'));
    apply(setField(block, 'version', `'${version}'`));
    const created = getField(block, 'createdVersion');
    const createdStamped = created === undefined || created === 'null';
    if (createdStamped) apply(setField(block, 'createdVersion', `'${version}'`));
    return {
      source: source.slice(0, start) + block + source.slice(end + 1),
      changes,
      createdVersionStamped: createdStamped,
    };
  } else {
    throw new Error(`unknown action '${action}'`);
  }
  return { source: source.slice(0, start) + block + source.slice(end + 1), changes };
}

// ── file location ────────────────────────────────────────────────────────────

/** Resolve both repos' demo files for a component. Missing files stay null. */
export function locate(component) {
  const kebab = toKebab(component);
  const react = join(REACT_DEMOS, `${component}.demo.jsx`);
  // Angular metas live flat in src/app/demos/ today; tolerate a per-component subdir too.
  const angularCandidates = [
    join(ANGULAR_DEMOS, `${kebab}.demo.meta.ts`),
    join(ANGULAR_DEMOS, kebab, `${kebab}.demo.meta.ts`),
  ];
  return {
    kebab,
    react: existsSync(react) ? react : null,
    angular: angularCandidates.find(existsSync) ?? null,
    searched: { react: [react], angular: angularCandidates },
  };
}

// ── per-component driver (shared with release.mjs) ───────────────────────────

/**
 * @param {string[]} components  React demo file names (PascalCase)
 * @param {'approve'|'port'|'demote'|'release'} action
 * @param {{version?: string, sides?: 'react'|'angular'|'both', dryRun?: boolean}} opts
 * @returns per-component results: { component, kebab, files: [{repo, path, changes}], createdVersionStamped }
 */
export function runAction(components, action, { version, sides, dryRun = false } = {}) {
  // approve is a React-side gate by default; port/release span both repos.
  sides ??= action === 'approve' ? 'react' : 'both';
  const results = [];
  for (const component of components) {
    const loc = locate(component);
    const targets = [];
    if (sides !== 'angular') targets.push(['react', loc.react, loc.searched.react]);
    if (sides !== 'react') targets.push(['angular', loc.angular, loc.searched.angular]);
    const missing = targets.filter(([, path]) => !path);
    if (missing.length) {
      throw new Error(
        `demo file for '${component}' not found (${missing.map(([r]) => r).join(' + ')} side). Searched:\n` +
        missing.map(([r, , s]) => s.map((sp) => `  [${r}] ${sp}`).join('\n')).join('\n'),
      );
    }
    const result = { component, kebab: loc.kebab, files: [], createdVersionStamped: false };
    for (const [repo, path] of targets) {
      const before = readFileSync(path, 'utf8');
      const out = applyAction(before, action, version);
      if (out.createdVersionStamped) result.createdVersionStamped = true;
      if (out.changes.length && !dryRun) writeFileSync(path, out.source);
      result.files.push({ repo, path, changes: out.changes });
    }
    results.push(result);
  }
  return results;
}

export function printResults(results, { dryRun = false } = {}) {
  const tag = dryRun ? ' [dry-run — nothing written]' : '';
  for (const r of results) {
    for (const f of r.files) {
      const rel = relative(process.cwd(), f.path);
      if (!f.changes.length) {
        console.log(`✓ ${r.component} [${f.repo}] ${rel} — no change needed${tag}`);
        continue;
      }
      console.log(`✓ ${r.component} [${f.repo}] ${rel}${tag}`);
      for (const c of f.changes) console.log(`    - ${c.field}: ${c.from} → ${c.to}`);
    }
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const components = [];
  let action = null, version, sides, dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--approve' || a === '--port' || a === '--demote') action = a.slice(2);
    else if (a === '--release') { action = 'release'; version = args[++i]; }
    else if (a === '--react-only') sides = 'react';
    else if (a === '--angular-only') sides = 'angular';
    else if (a === '--both') sides = 'both';
    else if (a === '--dry-run') dryRun = true;
    else if (a.startsWith('--')) { console.error(`unknown flag ${a}`); process.exit(1); }
    else components.push(a);
  }
  if (!components.length || !action || (action === 'release' && !/^\d+\.\d+\.\d+$/.test(version ?? ''))) {
    console.error('usage: node tools/dsm-flags.mjs <Component...> --approve|--port|--demote|--release <x.y.z> [--react-only|--angular-only|--both] [--dry-run]');
    process.exit(1);
  }
  try {
    printResults(runAction(components, action, { version, sides, dryRun }), { dryRun });
  } catch (e) {
    console.error(`✖ ${e.message}`);
    process.exit(1);
  }
}
