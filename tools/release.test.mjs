// node --test tools/release.test.mjs
// Covers the pure string-surgery in release.mjs — the two edits that mutate the
// Angular repo's external-format files (package.json + CHANGELOG). S87 flagged
// these as the clearest un-tested safety gap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChangelogSection, bumpPkgVersion, insertChangelogSection } from './release.mjs';

const results = [
  { component: 'DataTable', kebab: 'data-table', createdVersionStamped: false }, // existing → Changed
  { component: 'CalendarPicker', kebab: 'calendar-picker', createdVersionStamped: true }, // new → Added
];

test('buildChangelogSection buckets new components under Added, existing under Changed', () => {
  const s = buildChangelogSection('0.8.0', '2026-07-14', results);
  assert.match(s, /^## 0\.8\.0 — 2026-07-14/);
  assert.match(s, /### Added\n- \*\*CalendarPicker\*\* \(`odyssey-calendar-picker`\)/);
  assert.match(s, /### Changed\n- \*\*DataTable\*\* \(`odyssey-data-table`\)/);
});

test('buildChangelogSection omits an empty bucket', () => {
  const s = buildChangelogSection('0.8.0', '2026-07-14', [results[0]]); // Changed only
  assert.doesNotMatch(s, /### Added/);
  assert.match(s, /### Changed/);
});

test('bumpPkgVersion swaps the version and reports the old one, preserving formatting', () => {
  const pkg = '{\n  "name": "@oneodyssey/ui",\n  "version": "0.7.0",\n  "peerDependencies": {}\n}\n';
  const { text, oldVersion } = bumpPkgVersion(pkg, '0.8.0');
  assert.equal(oldVersion, '0.7.0');
  assert.match(text, /"version": "0\.8\.0"/);
  assert.doesNotMatch(text, /0\.7\.0/); // only the version field changed
  assert.match(text, /"name": "@oneodyssey\/ui"/); // rest intact
});

test('bumpPkgVersion throws when there is no version field', () => {
  assert.throws(() => bumpPkgVersion('{"name":"x"}', '0.8.0'), /no "version" field/);
});

test('insertChangelogSection inserts the section above the previous top entry', () => {
  const changelog = '# Changelog\n\n## 0.7.0 — 2026-07-01\n\n### Added\n- Thing.\n';
  const section = buildChangelogSection('0.8.0', '2026-07-14', results);
  const out = insertChangelogSection(changelog, section, '0.8.0');
  assert.ok(out.indexOf('## 0.8.0') < out.indexOf('## 0.7.0')); // new entry on top
  assert.match(out, /^# Changelog/); // preamble preserved
  assert.match(out, /## 0\.7\.0 — 2026-07-01/); // old entry preserved
});

test('insertChangelogSection refuses to duplicate an existing version', () => {
  const changelog = '# Changelog\n\n## 0.8.0 — 2026-07-14\n\n### Added\n- Thing.\n';
  assert.throws(() => insertChangelogSection(changelog, 'x', '0.8.0'), /already has a 0\.8\.0 section/);
});

test('insertChangelogSection throws when there is no existing entry to anchor on', () => {
  assert.throws(() => insertChangelogSection('# Changelog\n\n(nothing yet)\n', 'x', '0.8.0'), /no existing `## ` entry/);
});
