// Handoff export of the eight overflow emails (S138): renders every distinct
// kind from the gallery fixture, writes html/text twins + a contact sheet +
// source + logo asset, and zips it for PM/dev handoff.
// ponytail: system `zip` via execSync, no archiver dep.
import { mkdirSync, writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { SCENARIOS, emailsForScenario } from '../src/routes/spot-emails/fixture.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..') // apps/odyssey-one
const PROD_LOGO_URL = 'https://odyssey-one-stage.vercel.app/email/odyssey-one-logo.png'
// Staging dir lives outside the repo tree so only the script + zip get committed.
const OUT_DIR = path.join(process.env.TMPDIR ?? '/tmp', 'odyssey-overflow-emails-export')
const ZIP_PATH = path.resolve(ROOT, '../../docs/handoff/odyssey-overflow-emails-2026-09-03.zip')

const SLUGS = {
  'CE-1': 'request-for-quote',
  'CE-2': 'quote-awarded',
  'IE-1': 'no-bids-submitted',
  'IE-2': 'lowest-cost-carrier-out-of-tolerance',
  'IE-3': 'manual-review-required',
  'IE-4': 'consolidation-changed',
  'IE-5': 'no-costed-option',
  'IE-6': 'no-distance-found',
}
const KIND_ORDER = ['CE-1', 'CE-2', 'IE-1', 'IE-2', 'IE-3', 'IE-4', 'IE-5', 'IE-6']

// 1. Render every scenario, keep the first occurrence of each of the eight kinds.
const byKind = new Map()
for (const s of SCENARIOS) {
  for (const e of emailsForScenario(s.key)) {
    if (!byKind.has(e.kind)) byKind.set(e.kind, e)
  }
}
const missing = KIND_ORDER.filter((k) => !byKind.has(k))
if (missing.length) throw new Error(`Missing kinds from fixture: ${missing.join(', ')}`)

// 2. Reset output dir.
rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(path.join(OUT_DIR, 'assets'), { recursive: true })
mkdirSync(path.join(OUT_DIR, 'source'), { recursive: true })

// 3. Write each email's html/text twin, rewriting the logo src to the absolute prod URL.
const rows = []
for (const kind of KIND_ORDER) {
  const e = byKind.get(kind)
  const slug = SLUGS[kind]
  const html = e.html.replace(/src="[^"]*odyssey-one-logo\.png"/, `src="${PROD_LOGO_URL}"`)
  writeFileSync(path.join(OUT_DIR, `${kind}-${slug}.html`), html)
  writeFileSync(path.join(OUT_DIR, `${kind}-${slug}.txt`), e.text)
  rows.push({ kind, slug, subject: e.subject, to: e.recipientLabel, when: e.when })
}

// 4. Logo asset + source files.
copyFileSync(path.join(ROOT, 'public/email/odyssey-one-logo.png'), path.join(OUT_DIR, 'assets/odyssey-one-logo.png'))
const SOURCE_FILES = ['emailTheme.js', 'emailLayout.js', 'templates.js', 'alertKind.js', 'emailContext.js', 'emailsForQuote.js']
for (const f of SOURCE_FILES) {
  copyFileSync(path.join(ROOT, 'src/spotboard/email', f), path.join(OUT_DIR, 'source', f))
}

// 5. Contact sheet.
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const indexHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Overflow Emails — Contact Sheet</title>
<style>
body { font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1B2537; }
h1 { font-size: 20px; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #E4E6EB; font-size: 14px; vertical-align: top; }
th { color: #6B7280; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.03em; }
td.id { font-weight: 700; white-space: nowrap; }
a { color: #276DA2; }
.subject { color: #384253; }
</style>
</head>
<body>
<h1>Overflow Email Set — Contact Sheet</h1>
<p>Eight emails, one per row. Click a link to open the rendered HTML or plain-text twin.</p>
<table>
<tr><th>ID</th><th>Recipient</th><th>Trigger</th><th>Subject</th><th>Files</th></tr>
${rows.map((r) => `<tr>
<td class="id">${r.kind}</td>
<td>${escHtml(r.to)}</td>
<td>${escHtml(r.when)}</td>
<td class="subject">${escHtml(r.subject)}</td>
<td><a href="${r.kind}-${r.slug}.html">html</a> · <a href="${r.kind}-${r.slug}.txt">text</a></td>
</tr>`).join('\n')}
</table>
</body>
</html>
`
writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml)

// 6. README.
const readme = `# Overflow Email Set — Handoff

Eight emails produced by one overflow (spot-bid) quote lifecycle, exported from
the seeded sample in \`src/routes/spot-emails/fixture.js\` for test-send and
implementation reference.

## The eight emails

| ID | Recipient | Sent | Trigger condition |
|----|-----------|------|--------------------|
${rows.map((r) => `| ${r.kind} | ${r.to.startsWith('Planning') ? 'Planning group' : 'Carrier'} | ${r.when} | ${r.subject} |`).join('\n')}

**Carrier / planner split**: \`CE-1\` (Request for Quote) goes to every included
carrier when the planner sends the RFQ; one copy per carrier, each with its own
bid link. \`CE-2\` (Awarded) goes to the winning carrier only. The six \`IE-*\`
alerts (\`IE-1\`…\`IE-6\`) all go to the planning group when the quote closes —
they are the exception report a planner reads, not a lane summary. Precedence
between them (cancellation → no bids → cannot-evaluate-tolerance → tolerance
verdict) is in \`alertKind.js\`.

## Outlook safety

Every \`.html\` file here is Outlook-safe: table layout, inline styles only, no
CSS variables/flexbox/grid/\`border-radius\`/web fonts, fixed 600px width. Do not
"improve" the markup with modern CSS — Outlook's Word rendering engine will
silently drop it.

## Send as multipart

Each email has a plain-text twin (\`.txt\`). Send both together as a
\`multipart/alternative\` message (text first, then HTML) — never HTML-only.

## Sender / recipients

- **From**: the planning group's \`FROMEMAIL\` mailbox (a TMS system profile per
  planning group — SPB-77). This export's sample uses a seeded placeholder
  (\`planning-charlotte@odysseylogistics.com\`); production reads the real
  profile.
- **Carrier recipients** (\`CE-1\`, \`CE-2\`): come from the TMS carrier
  communications config, not this app.
- **Planner recipients** (\`IE-*\`): the planning group's \`FROMEMAIL\` mailbox
  (same one used as sender), so alerts land back with the group that owns the
  quote.

## Dynamic fields

The \`{{...}}\`-style values you'll see in these renders are seeded sample data
(one demo quote — see \`fixture.js\`), not live production values. Fields that
are dynamic per quote:

- Quote ID, Reference #, Order #
- Shipper name, Ship From / Ship To addresses
- Equipment, weight, hazmat flag, distance
- Pickup / delivery dates, stop-offs (multi-stop TL)
- Offer expiry timestamp
- Carrier name, SCAC, email (per \`CE-1\`/\`CE-2\` recipient)
- Lowest-bid block: carrier, amount, ship date, delivery date (\`IE-2\`/\`IE-3\`/\`IE-5\`/\`IE-6\`, and \`CE-2\`'s award rate)
- The carrier's token bid link (\`CE-1\` only — \`/spot-bid/:token\`)

## Logo

\`assets/odyssey-one-logo.png\` is included for self-hosting. The exported HTML
already points \`<img src>\` at the absolute production URL
(\`https://odyssey-one-stage.vercel.app/email/odyssey-one-logo.png\`) so the
files render correctly opened from disk or test-sent from anywhere.

## Source

\`source/\` holds the six files that produce these emails:
\`emailTheme.js\`, \`emailLayout.js\`, \`templates.js\`, \`alertKind.js\`,
\`emailContext.js\`, \`emailsForQuote.js\` — all under
\`apps/odyssey-one/src/spotboard/email/\` in the repo.

## Canon

\`vault/10-domains/spotboard/data/quote-model.md\` §7.1 (Doug's 2023 sample
send — the verbatim legacy text skeletons these templates mirror), and
decisions SPB-05 (carrier emails carry no Reference#/Order#), SPB-63,
SPB-77 (FROMEMAIL is a TMS per-planning-group profile), SPB-78 (planner
alert precedence / PRD Feature 11).
`
writeFileSync(path.join(OUT_DIR, 'README.md'), readme)

// 7. Zip.
if (existsSync(ZIP_PATH)) rmSync(ZIP_PATH)
mkdirSync(path.dirname(ZIP_PATH), { recursive: true })
execSync(`zip -r -X "${ZIP_PATH}" .`, { cwd: OUT_DIR, stdio: 'inherit' })

console.log(`Exported ${rows.length} emails to ${OUT_DIR}`)
console.log(`Zipped to ${ZIP_PATH}`)
