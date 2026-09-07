#!/usr/bin/env node
// Where every component sits on the batch ladder, read from the two DSMs' own
// metas — the single source of truth, instead of reconstructing it from git or
// from 500 lines of routine prose.
//
//   node tools/batch-status.mjs                      # everything in flight
//   node tools/batch-status.mjs --components A,B,C   # just these
//
// Also exports assertReleasable(), which release.mjs calls so a release
// physically CANNOT be cut for a component that has not finished the ladder.
// Written 2026-09-07 after a batch was released mid-flight and the routine's
// prose did not stop it.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename } from 'node:path';
import { locate, findMetaBlock, REACT_DEMOS } from './dsm-flags.mjs';

const flag = (block, key) => {
  const m = block.match(new RegExp(`^[ \\t]*${key}\\s*:\\s*(.*?),?\\s*(?://.*)?$`, 'm'));
  if (!m) return undefined;
  const v = m[1].trim().replace(/^['"]|['"]$/g, '');
  return v === 'true' ? true : v === 'false' ? false : v;
};

const readSide = (path) => {
  if (!path) return null;
  // findMetaBlock returns {start,end} offsets into the source, not the text.
  const src = readFileSync(path, 'utf8');
  const { start, end } = findMetaBlock(src);
  const block = src.slice(start, end + 1);
  return {
    normalizing: flag(block, 'normalizing') === true,
    approved: flag(block, 'approved') === true,
    ported: flag(block, 'ported') === true,
    version: flag(block, 'version'),
  };
};

// The ladder, in order. `next` is what the human/agent does NEXT — the whole
// point is that nobody has to remember the sequence.
function rung(react, angular) {
  if (!react) return { rung: 'no react demo', next: 'nothing to do' };
  if (!react.normalizing) return { rung: 'RELEASED', next: `none (v${react.version})` };
  if (!react.approved) return { rung: 'NORMALIZING', next: 'Figma master → Code Connect publish → GATE B (React approve)' };
  if (!react.ported) return { rung: 'APPROVED', next: 'port to Angular (approve batch)' };
  if (angular && !angular.approved) return { rung: 'PORTED', next: 'GATE C-twin — user reviews the Angular twin' };
  return { rung: 'TWIN APPROVED', next: 'release.mjs → PR → GATE C-merge (release-parity-check) → merge' };
}

export function status(components) {
  const names = components?.length
    ? components
    : readdirSync(REACT_DEMOS).filter((f) => f.endsWith('.demo.jsx')).map((f) => basename(f, '.demo.jsx'));

  return names.map((name) => {
    const { react: rp, angular: ap } = locate(name);
    const react = readSide(rp);
    const angular = readSide(ap);
    return { name, react, angular, ...rung(react, angular) };
  });
}

/**
 * Throws unless every named component has finished the ladder. release.mjs
 * calls this BEFORE touching anything, so an unfinished component cannot be
 * released by accident.
 */
export function assertReleasable(components) {
  const bad = status(components).filter(
    (c) => c.rung !== 'TWIN APPROVED' && c.rung !== 'RELEASED'
  );
  if (bad.length) {
    const lines = bad.map((c) => `  ✖ ${c.name} — at ${c.rung}; next: ${c.next}`);
    throw new Error(
      `not releasable — ${bad.length} component(s) have not finished the batch ladder:\n${lines.join('\n')}\n` +
        `  (run: node tools/batch-status.mjs --components ${components.join(',')})`
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const ci = argv.indexOf('--components');
  const components = ci !== -1 ? (argv[ci + 1] ?? '').split(',').filter(Boolean) : [];

  const rows = status(components).filter((r) => components.length || r.rung !== 'RELEASED');
  if (!rows.length) {
    console.log('nothing in flight — every component is RELEASED.');
    process.exit(0);
  }
  const pad = Math.max(...rows.map((r) => r.name.length));
  for (const r of rows) {
    const side = r.angular ? '' : '  (no angular twin)';
    console.log(`${r.name.padEnd(pad)}  ${r.rung.padEnd(14)}  → ${r.next}${side}`);
  }
}
