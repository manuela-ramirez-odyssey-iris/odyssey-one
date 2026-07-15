// node --test tools/token-check.test.mjs
// Runs classify() against the REAL tokens.css + Figma snapshot (that's the whole
// point — the S87 bug was a bare font-weight misfiring on live data).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from './token-check.mjs';

test('bare font-weight resolves to --font-weight-* (S87 regression: was mislabelled LEGAL-FIGMA-ONLY)', () => {
  const r = classify('600');
  assert.equal(r.cls, 'LEGAL');
  assert.match(r.detail, /--font-weight-semibold/);
});

test('font shorthand size/weight is LEGAL when both halves resolve', () => {
  const r = classify('14px/600');
  assert.equal(r.cls, 'LEGAL');
  assert.match(r.detail, /--font-size-sm/);
  assert.match(r.detail, /--font-weight-semibold/);
});

test('px value that matches a spacing token is LEGAL', () => {
  const r = classify('16px');
  assert.equal(r.cls, 'LEGAL');
  assert.match(r.detail, /--spacing-4/);
});

test('unknown color reports nearest tokens, not a match', () => {
  const r = classify('#123456');
  assert.equal(r.cls, 'UNKNOWN');
  assert.match(r.detail, /nearest:/);
});

test('a real palette hex is LEGAL', () => {
  const r = classify('#283142'); // --deep-sea-neutral-800
  assert.equal(r.cls, 'LEGAL');
  assert.match(r.detail, /deep-sea-neutral-800/);
});

test('unrecognized value shape falls through to UNKNOWN', () => {
  assert.equal(classify('not a value').cls, 'UNKNOWN');
});
