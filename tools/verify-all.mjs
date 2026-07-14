// verify-all: runs the full React↔Angular verification matrix and prints a compact
// scoreboard — nothing streams; each step's output is captured and summarized to a
// one-line stat (plus the last ~15 lines on failure). Token-cheap by design.
//
// Steps: react tests · react build · angular parity-lint · demo-parity-lint ·
//        angular lib build · angular tests (odyssey-ui + dsm-explorer).
// The Angular repo is the SIBLING checkout (../odyssey-one-library-ui); Angular
// steps are skipped with a note when it's absent.
//
// Usage: node tools/verify-all.mjs [--react-only] [--angular-only] [--skip-tests] [--skip-build]
// Exit 1 if any executed step failed.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REACT_ROOT = resolve(SCRIPT_DIR, '..');
const REACT_APP = resolve(REACT_ROOT, 'apps/odyssey-one');
const NG_ROOT = resolve(REACT_ROOT, '../odyssey-one-library-ui');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const reactOnly = has('--react-only');
const angularOnly = has('--angular-only');
const skipTests = has('--skip-tests');
const skipBuild = has('--skip-build');

/** @type {{name:string, cwd:string, cmd:string, side:'react'|'angular', kind:'test'|'build'|'lint', stat:(out:string)=>string|null}[]} */
const STEPS = [
  {
    name: 'react-tests', side: 'react', kind: 'test', cwd: REACT_APP, cmd: 'npx vitest run',
    stat: (o) => o.match(/Tests\s+(\d+ passed.*?)\n/)?.[1],
  },
  {
    // root build:odyssey-one = `turbo run build --filter=odyssey-one-app`
    name: 'react-build', side: 'react', kind: 'build', cwd: REACT_ROOT, cmd: 'npm run build:odyssey-one',
    stat: (o) => o.match(/Tasks:\s+(.*?)\n/)?.[1] ?? (o.includes('built in') ? 'built' : null),
  },
  {
    name: 'ng-parity-lint', side: 'angular', kind: 'lint', cwd: NG_ROOT, cmd: 'npm run lint:parity',
    stat: (o) => o.match(/parity-lint: (.*?)\n?$/m)?.[1],
  },
  {
    name: 'demo-parity-lint', side: 'angular', kind: 'lint', cwd: NG_ROOT, cmd: 'npm run lint:demo-parity',
    stat: (o) => o.match(/demo-parity-lint: (.*?)\n?$/m)?.[1],
  },
  {
    name: 'ng-lib-build', side: 'angular', kind: 'build', cwd: NG_ROOT, cmd: 'npx ng build odyssey-ui',
    stat: (o) => (o.match(/error/i) ? null : 'built'),
  },
  {
    name: 'ng-tests-lib', side: 'angular', kind: 'test', cwd: NG_ROOT,
    cmd: 'npx ng test odyssey-ui --watch=false --browsers=ChromeHeadless',
    stat: (o) => o.match(/Executed (\d+ of \d+[^\n]*)/)?.[1] ?? o.match(/TOTAL: ([^\n]*)/)?.[1],
  },
  {
    name: 'ng-tests-app', side: 'angular', kind: 'test', cwd: NG_ROOT,
    cmd: 'npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless',
    stat: (o) => o.match(/Executed (\d+ of \d+[^\n]*)/)?.[1] ?? o.match(/TOTAL: ([^\n]*)/)?.[1],
  },
];

function shouldRun(step) {
  if (reactOnly && step.side !== 'react') return false;
  if (angularOnly && step.side !== 'angular') return false;
  if (skipTests && step.kind === 'test') return false;
  if (skipBuild && step.kind === 'build') return false;
  return true;
}

const results = [];
for (const step of STEPS) {
  if (!shouldRun(step)) { results.push({ ...step, status: 'SKIP', stat: '(flag)' }); continue; }
  if (step.side === 'angular' && !existsSync(NG_ROOT)) {
    results.push({ ...step, status: 'SKIP', stat: 'sibling Angular repo not found' });
    continue;
  }
  const r = spawnSync(step.cmd, { cwd: step.cwd, shell: true, encoding: 'utf8', timeout: 600_000 });
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  const ok = r.status === 0;
  results.push({
    ...step,
    status: ok ? 'PASS' : 'FAIL',
    stat: step.stat(out) ?? (ok ? 'ok' : `exit ${r.status ?? 'signal'}`),
    tail: ok ? null : out.split('\n').filter((l) => l.trim()).slice(-15).join('\n'),
  });
}

console.log('\n=== verify-all scoreboard ===');
for (const r of results) {
  console.log(`${r.status.padEnd(4)}  ${r.name.padEnd(17)} ${r.stat}`);
  if (r.tail) console.log(r.tail.replace(/^/gm, '        ') + '\n');
}
const failed = results.filter((r) => r.status === 'FAIL').length;
console.log(`\n${failed ? `✖ ${failed} step(s) failed` : '✓ all executed steps passed'}`);
process.exit(failed ? 1 : 0);
