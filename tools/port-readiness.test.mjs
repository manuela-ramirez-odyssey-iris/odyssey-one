import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingTokens } from './port-readiness.mjs';

// D16 — a component that DECLARES its own custom property is not missing a
// design token. Without this, ResolveTimeline's port was blocked on a lint
// rule whose only "fix" was promoting a private duration into the global
// token file.
test('a token absent from _tokens.scss is reported missing', () => {
  assert.deepEqual(missingTokens(['--text-primary'], '', ''), ['--text-primary']);
});

test('a token present in _tokens.scss is satisfied', () => {
  assert.deepEqual(missingTokens(['--text-primary'], '--text-primary: #111;', ''), []);
});

test('a property the component declares itself is NOT a missing token', () => {
  assert.deepEqual(
    missingTokens(['--resolve-timeline-fill'], '', '.resolve-timeline { --resolve-timeline-fill: 900ms; }'),
    [],
  );
});

test('self-declaration does not mask a genuinely absent token', () => {
  assert.deepEqual(
    missingTokens(['--text-primary', '--own'], '', '.x { --own: 1ms; }'),
    ['--text-primary'],
  );
});
