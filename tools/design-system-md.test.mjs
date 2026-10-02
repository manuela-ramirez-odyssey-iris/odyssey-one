// node --test tools/design-system-md.test.mjs
// Fixture strings only — the real tokens.css / demos are exercised by `npm run ds:md:audit`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseTokens, resolve, condense, esc, extractLiteral, readDemos, rowNamesToken, usageFor, render, driftedSections, checkExitCode } from './design-system-md.mjs';

const CSS = `:root {
  /* --- Primitives: Ink --- */
  --ink-900: #111111;
  /* --- Semantic: Text --- */
  --text-primary: var(--ink-900);  /* Body copy. Second sentence. */
  --text-alias: var(--text-primary);
  --spacing-4: 16px;
}
`;

test('var() chains resolve to the final literal and record the chain', () => {
  const map = new Map(parseTokens(CSS).flatMap((s) => s.tokens.map((t) => [t.name, t.value])));
  const r = resolve('--text-alias', map);
  assert.equal(r.value, '#111111');
  assert.deepEqual(r.chain, ['--text-primary', '--ink-900']);
});

test('sections follow file order and inline comments attach to their token', () => {
  const s = parseTokens(CSS);
  assert.deepEqual(s.map((x) => x.name), ['Primitives: Ink', 'Semantic: Text']);
  assert.equal(s[1].tokens[0].comment, 'Body copy. Second sentence.');
});

test('one usage row can name several tokens; prefixes do not match', () => {
  assert.ok(rowNamesToken('--spacing-4 / --spacing-3', '--spacing-3'));
  assert.ok(!rowNamesToken('--spacing-40', '--spacing-4'));
  const demos = [{ name: 'SummaryStrip', tokens: [{ token: '--spacing-4 / --spacing-3', usage: 'cell padding' }] }];
  assert.deepEqual(usageFor('--spacing-3', demos), ['SummaryStrip: cell padding']);
});

test('condense keeps the first sentence and strips session ids, dates, Figma noise', () => {
  assert.equal(condense('Added S136. The ramp jumped (2026-06-22) from yellow to rust. More.'), 'The ramp jumped from yellow to rust.');
  assert.equal(condense('Pairs with Figma `a/b` surface (D17). Tail.'), 'Pairs with surface.');
});

test('pipes are escaped and cells stay single-line', () => {
  assert.equal(esc('a | b\nc'), 'a \\| b c');
});

test('extractLiteral is bracket- and string-aware', () => {
  const src = "export const meta = { name: 'A}', n: [1, 2] }\nexport const x = 1";
  assert.equal(new Function('return ' + extractLiteral(src, 'meta'))().name, 'A}');
});

test('render builds the table, the alias fallback and the type-styles section', () => {
  const md = render({
    sections: parseTokens(CSS), intro: '# Intro', date: '2026-10-01',
    demos: [{ name: 'Tag', tokens: [{ token: 'label/xs medium', usage: 'label' }] }],
  });
  assert.match(md, /_Generated 2026-10-01 from tokens.css \(4 tokens\) and 1 DSM token-usage rows\._/);
  assert.match(md, /`--text-primary` \| `var\(--ink-900\)` \| `#111111 \(Ink 900\)`/);
  assert.match(md, /Alias of --text-primary/);
  assert.match(md, /Palette primitive/);
  assert.match(md, /## Type styles/);
});

test('usage.json entry leads the cell and replaces the bare Alias fallback; comment + rows follow', () => {
  const sections = parseTokens(CSS);
  const demos = [{ name: 'Tag', tokens: [{ token: '--text-primary', usage: 'label' }] }];
  const md = render({ sections, demos, intro: '#', date: 'd', usage: { '--text-alias': 'Muted copy.', '--text-primary': 'Main text.' } });
  assert.match(md, /`--text-alias`.*\| Muted copy\. \|/);
  assert.doesNotMatch(md, /Alias of/);
  assert.match(md, /\| Main text\.; Body copy\.; Tag: label \|/);
});

test('a spread top-level constant in a demo tokens array is evaluated', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsmd-'));
  fs.writeFileSync(path.join(dir, 'X.demo.jsx'),
    "export const meta = { name: 'X' }\nconst FILLS = [{ token: '--a', usage: 'u' }]\nexport const tokens = [...FILLS.map((f) => ({ token: f.token, usage: f.usage }))]\n");
  assert.deepEqual(readDemos(dir)[0].tokens, [{ token: '--a', usage: 'u' }]);
});

test('--check: date line is ignored, drift names the section and exits 1', () => {
  const a = '## A\nx\n_Generated 2026-10-01 from_\n## B\ny\n';
  assert.deepEqual(driftedSections(a, a.replace('2026-10-01', '2026-11-02')), []);
  assert.equal(checkExitCode([]), 0);
  const drifted = driftedSections(a, a.replace('y', 'z'));
  assert.deepEqual(drifted, ['B']);
  assert.equal(checkExitCode(drifted), 1);
});
