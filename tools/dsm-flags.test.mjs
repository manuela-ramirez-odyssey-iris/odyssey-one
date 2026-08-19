// node --test tools/dsm-flags.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyAction, locate, toKebab, REACT_DEMOS, ANGULAR_ROOT } from './dsm-flags.mjs';

// Fixtures — copies of real meta shapes from both repos.

// React, staged (FieldSearchResults shape) — inline comment + ported: false
const JSX_STAGED = `import { useState } from 'react'
import { FieldSearchResults } from '@odyssey/ui'

export const meta = {
  name: 'FieldSearchResults',
  tier: 'organism',
  version: '0.6.0',
  createdVersion: '0.6.0',
  figmaNode: '3170:2989',
  codeConnect: 'packages/ui/src/FieldSearchResults.figma.tsx',
  normalizing: true,
  approved: true, // S85 — awaiting Angular port
  ported: false,
}

export const props = [
  { name: 'matches', type: 'FieldSearchMatch[]', desc: 'Rows. {a: 1}' },
]
`;

// React, mid-normalization with null versions (CalendarPicker shape — comment inside meta)
const JSX_NEW = `export const meta = {
  // One demo, two exports: CalendarPicker + DatePicker.
  name: 'CalendarPicker + DatePicker',
  tier: 'molecule',
  version: null,
  createdVersion: null,
  normalizing: true,
  approved: true,
  figmaNode: '4422:711',
  codeConnect: null,
}
`;

// React, released, meta with NO normalizing key at all (Badge shape)
const JSX_RELEASED_NO_FLAG = `export const meta = {
  name: 'Badge',
  tier: 'atom',
  version: '0.4.0',
  createdVersion: '0.2.0',
  figmaNode: '213:27',
  codeConnect: 'packages/ui/src/Badge.figma.tsx',
}
`;

// Angular DemoMeta (badge shape)
const TS_META = `import { DemoMeta, DemoProp, DemoToken } from '../dsm/demo.types';

export const badgeMeta: DemoMeta = {
  name: 'Badge',
  angularName: 'odyssey-badge',
  tier: 'atom',
  version: '0.4.0',
  createdVersion: '0.2.0',
  figmaNode: '213:27',
  codeConnect: 'packages/ui/src/Badge.figma.tsx',
  normalizing: true,
  approved: true,
  ported: true,
};

export const badgeProps: DemoProp[] = [
  { name: 'variant', type: 'amber|blue', desc: 'Color preset.' },
];
`;

test('approve sets approved: true, keeps normalizing: true', () => {
  const { source, changes } = applyAction(JSX_NEW.replace('  approved: true,\n', ''), 'approve');
  assert.match(source, /approved: true,/);
  assert.match(source, /normalizing: true,/);
  assert.deepEqual(changes, [{ field: 'approved', from: '(absent)', to: 'true' }]);
});

test('approve adds normalizing: true when the meta lacks it (backlog re-stage)', () => {
  const { source } = applyAction(JSX_RELEASED_NO_FLAG, 'approve');
  assert.match(source, /normalizing: true,/);
  assert.match(source, /approved: true,/);
});

test('port flips ported: false → true and preserves the rest', () => {
  const { source, changes } = applyAction(JSX_STAGED, 'port');
  assert.match(source, /ported: true,/);
  assert.match(source, /normalizing: true,/);
  assert.match(source, /approved: true,/); // inline comment on the line is dropped, value kept
  assert.deepEqual(changes, [{ field: 'ported', from: 'false', to: 'true' }]);
  // untouched regions preserved verbatim
  assert.match(source, /desc: 'Rows\. \{a: 1\}'/);
  assert.match(source, /import \{ useState \} from 'react'/);
});

test('demote removes approved/ported and restores normalizing: true (modification-reset)', () => {
  const released = applyAction(JSX_STAGED, 'release', '0.8.0').source;
  const { source, changes } = applyAction(released, 'demote');
  assert.match(source, /normalizing: true,/);
  assert.doesNotMatch(source, /approved:/);
  assert.doesNotMatch(source, /ported:/);
  // version/createdVersion stay — demote only resets the staging flags
  assert.match(source, /version: '0\.8\.0',/);
  assert.ok(changes.some(c => c.field === 'normalizing' && c.to === 'true'));
});

// These exercise the --demote CLI flag itself end-to-end (parsing,
// --react-only/--angular-only sides, --dry-run) against a disposable fixture
// component, never a real one — coverage the pure applyAction tests above
// don't reach (they call applyAction directly, bypassing the CLI/runAction).

const FIXTURE = 'DsmFlagsDemoteFixture';
const FIXTURE_KEBAB = toKebab(FIXTURE);
const fixtureReactPath = join(REACT_DEMOS, `${FIXTURE}.demo.jsx`);
const fixtureAngularPath = join(ANGULAR_ROOT, 'src/app/demos', `${FIXTURE_KEBAB}.demo.meta.ts`);
const SCRIPT = join(import.meta.dirname, 'dsm-flags.mjs');

const fixtureReactSrc = `export const meta = {
  name: '${FIXTURE}',
  tier: 'atom',
  version: '1.2.0',
  createdVersion: '1.0.0',
  figmaNode: '1:1',
  codeConnect: null,
  normalizing: false,
  approved: true,
  ported: true,
}
`;
const fixtureAngularSrc = `export const dsmFlagsDemoteFixtureMeta: DemoMeta = {
  name: '${FIXTURE}',
  angularName: 'odyssey-${FIXTURE_KEBAB}',
  tier: 'atom',
  version: '1.2.0',
  createdVersion: '1.0.0',
  figmaNode: '1:1',
  codeConnect: null,
  normalizing: false,
  approved: true,
  ported: true,
};
`;

function withFixture(fn) {
  mkdirSync(join(ANGULAR_ROOT, 'src/app/demos'), { recursive: true });
  writeFileSync(fixtureReactPath, fixtureReactSrc);
  writeFileSync(fixtureAngularPath, fixtureAngularSrc);
  try {
    fn();
  } finally {
    rmSync(fixtureReactPath, { force: true });
    rmSync(fixtureAngularPath, { force: true });
  }
}

test('--demote --dry-run writes nothing, in either repo', () => {
  withFixture(() => {
    execFileSync('node', [SCRIPT, FIXTURE, '--demote', '--dry-run'], { encoding: 'utf8' });
    assert.equal(readFileSync(fixtureReactPath, 'utf8'), fixtureReactSrc);
    assert.equal(readFileSync(fixtureAngularPath, 'utf8'), fixtureAngularSrc);
  });
});

test('--demote --react-only touches only the React meta', () => {
  withFixture(() => {
    execFileSync('node', [SCRIPT, FIXTURE, '--demote', '--react-only'], { encoding: 'utf8' });
    const react = readFileSync(fixtureReactPath, 'utf8');
    assert.match(react, /normalizing: true,/);
    assert.doesNotMatch(react, /approved:/);
    assert.doesNotMatch(react, /ported:/);
    assert.match(react, /version: '1\.2\.0',/); // untouched
    assert.match(react, /createdVersion: '1\.0\.0',/); // untouched
    assert.equal(readFileSync(fixtureAngularPath, 'utf8'), fixtureAngularSrc); // untouched
  });
});

test('--demote defaults to BOTH repos and clears approved/ported without touching version', () => {
  withFixture(() => {
    execFileSync('node', [SCRIPT, FIXTURE, '--demote'], { encoding: 'utf8' });
    for (const path of [fixtureReactPath, fixtureAngularPath]) {
      const out = readFileSync(path, 'utf8');
      assert.match(out, /normalizing: true,/);
      assert.doesNotMatch(out, /approved:/);
      assert.doesNotMatch(out, /ported:/);
      assert.match(out, /version: '1\.2\.0',/);
      assert.match(out, /createdVersion: '1\.0\.0',/);
    }
  });
});

test('port is a no-op when already ported', () => {
  const { changes } = applyAction(TS_META, 'port');
  assert.deepEqual(changes, []);
});

test('release removes approved/ported, sets normalizing: false, stamps version — existing createdVersion untouched', () => {
  const { source, changes, createdVersionStamped } = applyAction(JSX_STAGED, 'release', '0.8.0');
  assert.doesNotMatch(source, /approved/);
  assert.doesNotMatch(source, /ported/);
  assert.match(source, /normalizing: false,/);
  assert.match(source, /version: '0.8.0',/);
  assert.match(source, /createdVersion: '0.6.0',/); // NEVER overwritten
  assert.equal(createdVersionStamped, false);
  assert.equal(changes.length, 4); // approved-, ported-, normalizing, version
});

test('release stamps createdVersion when it is null', () => {
  const { source, createdVersionStamped } = applyAction(JSX_NEW, 'release', '0.8.0');
  assert.match(source, /version: '0.8.0',/);
  assert.match(source, /createdVersion: '0.8.0',/);
  assert.equal(createdVersionStamped, true);
  assert.match(source, /\/\/ One demo, two exports/); // comment inside meta preserved
});

test('release stamps createdVersion when the key is absent', () => {
  const noCreated = JSX_NEW.replace('  createdVersion: null,\n', '');
  const { source, createdVersionStamped } = applyAction(noCreated, 'release', '0.8.0');
  assert.match(source, /createdVersion: '0.8.0',/);
  assert.equal(createdVersionStamped, true);
});

test('release on Angular DemoMeta works identically', () => {
  const { source } = applyAction(TS_META, 'release', '0.8.0');
  assert.doesNotMatch(source, /approved|ported/);
  assert.match(source, /normalizing: false,/);
  assert.match(source, /version: '0.8.0',/);
  assert.match(source, /createdVersion: '0.2.0',/);
  assert.match(source, /angularName: 'odyssey-badge',/); // untouched
  assert.match(source, /export const badgeProps/); // rest of file intact
});

test('release is idempotent on an already-released meta', () => {
  const once = applyAction(TS_META, 'release', '0.8.0').source;
  const twice = applyAction(once, 'release', '0.8.0');
  assert.equal(twice.source, once);
  assert.deepEqual(twice.changes, []);
});

test('unparseable meta block throws', () => {
  assert.throws(() => applyAction('const x = 1;', 'approve'), /meta object literal not found/);
});

test('kebab mapping: default conversion + explicit alias', () => {
  assert.equal(toKebab('GroupTable'), 'group-table');
  assert.equal(toKebab('FieldSearchResults'), 'field-search-results');
  assert.equal(toKebab('OdysseyLogo'), 'logo'); // alias
});

test('unknown component: locate returns nulls with searched paths', () => {
  const loc = locate('NoSuchComponent');
  assert.equal(loc.react, null);
  assert.equal(loc.angular, null);
  assert.ok(loc.searched.react[0].endsWith('NoSuchComponent.demo.jsx'));
});

test('known component resolves in both repos', () => {
  const loc = locate('Badge');
  assert.ok(loc.react?.endsWith('Badge.demo.jsx'));
  assert.ok(loc.angular?.endsWith('badge.demo.meta.ts'));
});
