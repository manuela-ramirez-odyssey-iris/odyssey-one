#!/usr/bin/env node
// GATE C — merge parity check.
//
// A release is cut at one instant; the Angular PR merges later. In between,
// a PARALLEL session can land a React change to a component in that batch —
// which is exactly what happened on 2026-09-07 (1.7.0 cut 12:22, S140 changed
// GroupTable 12:38, PR #17 still open). The twin in the PR was then already
// behind its canon, and the batch would have merged "clean" while being wrong.
//
// No pre-release check can see the future, so this runs BEFORE MERGING the
// library PR: for every component in the batch, list React commits that touched
// its source after the release commit. Anything reported must be folded into
// the same PR (while it is open) or the component pulled from the batch.
//
//   node tools/release-parity-check.mjs <release-commit> --components <A,B,C>
//
// Exits 1 if any drift is found, so it can gate a merge.

import { execFileSync } from 'node:child_process';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8' }).trim();

const argv = process.argv.slice(2);
const releaseRef = argv[0];
const ci = argv.indexOf('--components');
const components = ci !== -1 ? (argv[ci + 1] ?? '').split(',').filter(Boolean) : [];

if (!releaseRef || !components.length) {
  console.error('usage: node tools/release-parity-check.mjs <release-commit> --components <A,B,C>');
  process.exit(2);
}

// Per-component source. Deliberately NOT components.css: it is shared by every
// component, so it is checked once, separately, and reported as needs-eyeball
// rather than pretending the tool can attribute a CSS hunk to a component.
const pathsFor = (name) => [
  `packages/ui/src/${name}.jsx`,
  `packages/ui/src/${name}.tsx`,
  `packages/ui/src/${name}.figma.tsx`,
  `apps/odyssey-one/src/routes/design-system/demos/${name}.demo.jsx`,
];

let drift = false;

for (const name of components) {
  const log = git('log', '--oneline', `${releaseRef}..HEAD`, '--', ...pathsFor(name));
  if (log) {
    drift = true;
    console.log(`✖ ${name} — changed after the release:`);
    for (const line of log.split('\n')) console.log(`    ${line}`);
  } else {
    console.log(`✓ ${name} — untouched since ${releaseRef.slice(0, 7)}`);
  }
}

// Shared stylesheet: attribution is a human call, so report and let the
// reviewer decide rather than guessing which component a hunk belongs to.
const cssLog = git('log', '--oneline', `${releaseRef}..HEAD`, '--', 'apps/odyssey-one/src/styles/components.css');
if (cssLog) {
  console.log('\n⚠ components.css changed after the release — shared file, check by eye:');
  for (const line of cssLog.split('\n')) console.log(`    ${line}`);
  console.log('  (a hunk touching a batch component\'s classes is drift; anything else is not)');
}

console.log(
  drift
    ? '\n✖ GATE C FAILED — fold these into the open PR, or pull the component from the batch.'
    : '\n✓ GATE C passed — every batch component matches the release.'
);
process.exit(drift ? 1 : 0);
