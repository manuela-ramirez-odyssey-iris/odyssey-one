// Release routine (angular-port-routine.md Phase 6, the mechanical part):
//   1. dsm-flags `release` on every component (BOTH repos' metas)
//   2. bump odyssey-one-library-ui/projects/odyssey-ui/package.json version
//   3. insert a new CHANGELOG section (TODO placeholder bullets — prose is filled in after)
//   4. print what was done + what stays manual (tracker/CHANGELOG prose, commits)
//
//   node tools/release.mjs <version> --components <A,B,C> [--date YYYY-MM-DD] [--dry-run]

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { runAction, printResults, ANGULAR_ROOT } from './dsm-flags.mjs';

const PKG_PATH = join(ANGULAR_ROOT, 'projects/odyssey-ui/package.json');
const CHANGELOG_PATH = join(ANGULAR_ROOT, 'CHANGELOG.md');

function buildChangelogSection(version, date, results) {
  // createdVersion stamped this release = new component → Added; otherwise Changed.
  const bullet = (r) => `- **${r.component}** (\`odyssey-${r.kebab}\`) — TODO: describe.`;
  const added = results.filter((r) => r.createdVersionStamped);
  const changed = results.filter((r) => !r.createdVersionStamped);
  let section = `## ${version} — ${date}\n`;
  if (added.length) section += `\n### Added\n${added.map(bullet).join('\n')}\n`;
  if (changed.length) section += `\n### Changed\n${changed.map(bullet).join('\n')}\n`;
  return section;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let version, components = [], date, dryRun = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--components') components = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
  else if (a === '--date') date = args[++i];
  else if (a === '--dry-run') dryRun = true;
  else if (a.startsWith('--')) { console.error(`unknown flag ${a}`); process.exit(1); }
  else version = a;
}
if (!/^\d+\.\d+\.\d+$/.test(version ?? '') || !components.length) {
  console.error('usage: node tools/release.mjs <x.y.z> --components <A,B,C> [--date YYYY-MM-DD] [--dry-run]');
  process.exit(1);
}
date ??= execSync('date +%F').toString().trim();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`--date must be YYYY-MM-DD (got '${date}')`);
  process.exit(1);
}

try {
  // 1. demo metas — both repos
  console.log(`— demo metas (release ${version}) —`);
  const results = runAction(components, 'release', { version, dryRun });
  printResults(results, { dryRun });

  // 2. library package.json version bump (string surgery — preserves formatting)
  const pkg = readFileSync(PKG_PATH, 'utf8');
  const oldVersion = pkg.match(/"version":\s*"([^"]+)"/)?.[1];
  if (!oldVersion) throw new Error(`no "version" field found in ${PKG_PATH}`);
  if (!dryRun) writeFileSync(PKG_PATH, pkg.replace(/("version":\s*)"[^"]+"/, `$1"${version}"`));
  console.log(`\n— package.json —\n✓ @oneodyssey/ui version: ${oldVersion} → ${version}${dryRun ? ' [dry-run — nothing written]' : ''}`);

  // 3. CHANGELOG section, inserted above the previous top entry
  const changelog = readFileSync(CHANGELOG_PATH, 'utf8');
  if (changelog.includes(`## ${version} `) || changelog.includes(`## ${version} —`)) {
    throw new Error(`CHANGELOG already has a ${version} section`);
  }
  const firstEntry = changelog.search(/^## /m);
  if (firstEntry === -1) throw new Error('no existing `## ` entry found in CHANGELOG.md');
  const section = buildChangelogSection(version, date, results);
  if (!dryRun) {
    writeFileSync(CHANGELOG_PATH, changelog.slice(0, firstEntry) + section + '\n' + changelog.slice(firstEntry));
  }
  console.log(`\n— CHANGELOG.md —${dryRun ? ' [dry-run — section below NOT inserted]' : ''}\n${section}`);

  // 4. checklist
  console.log('— done / remaining —');
  console.log(`  [${dryRun ? ' ' : 'x'}] demo metas released in both repos (${components.join(', ')})`);
  console.log(`  [${dryRun ? ' ' : 'x'}] projects/odyssey-ui/package.json bumped to ${version}`);
  console.log(`  [${dryRun ? ' ' : 'x'}] CHANGELOG ${version} section inserted (TODO placeholders)`);
  console.log('  [ ] MANUAL: fill CHANGELOG TODO bullets with real prose');
  console.log('  [ ] MANUAL: playground/normalization-tracker.md rows (Angular column, dates, notes)');
  console.log('  [ ] MANUAL: commit + push both repos (Angular via batch branch → PR; NO npm publish — Cognizant owns it)');
} catch (e) {
  console.error(`✖ ${e.message}`);
  process.exit(1);
}
