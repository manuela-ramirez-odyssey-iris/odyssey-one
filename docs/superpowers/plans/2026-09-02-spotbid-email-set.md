# SpotBid Email Set Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Design and render the eight overflow emails (CE-1 RFQ, CE-2 Awarded, IE-1…IE-6 planner alerts) as plain-text-first templates with a light, Outlook-safe HTML layer, previewed per quote inside the SpotBid tab exactly as they would be sent.

**Architecture:** Pure template functions (`subject`, `text`, `html`) live in `src/spotboard/email/`, fed by a context builder that reads the shipment + quote already on the tab. The HTML layer is a single 600px table shell with token values *baked in as hex* (Outlook cannot read CSS variables), a hosted PNG logo, and no app CSS. A standalone gallery at `/spot-emails` — deliberately outside the SpotBid tab so developers do not read it as app UI — lists every email against eight seeded scenarios and shows the chosen one in an isolated `<iframe srcdoc>` with a Text/HTML toggle, so what Vercel shows is the byte-for-byte message.

**Tech Stack:** React 18, Vite, vitest + @testing-library/react (jsdom), `@odyssey/ui` for the panel chrome only (never inside the email), `@odyssey/tokens` values copied into `emailTheme.js`.

**Canon:** `vault/10-domains/spotboard/data/quote-model.md` §7.1 (verbatim payloads), decisions SPB-05, SPB-63, SPB-77, SPB-78. Read §7.1 before Task 3.

**Rules that apply to every task**
- Email HTML: tables + inline styles only. No flexbox/grid, no `var(--…)`, no web fonts, no `border-radius`, no background images, width 600px, font stack `Arial, Helvetica, sans-serif`. Colors come from `emailTheme.js` only.
- Plain text is written first; HTML mirrors it line for line.
- No Order ID / Load ID in carrier emails (SPB-05). Planner alerts carry `Order#` only for single loads.
- Commit after each task with the session tag: `S138: …` (check `git log -1` for the current tag; use the next S-number if S138 is already used).
- Do not touch `packages/ui/src/CalendarPicker*` or `DatePicker*` (another session owns them).

---

## File structure

| File | Responsibility |
|---|---|
| `apps/odyssey-one/src/spotboard/email/emailTheme.js` | Hex values for the email, each annotated with the token it mirrors; logo URL |
| `apps/odyssey-one/public/email/odyssey-one-logo.png` | Hosted logo for `<img>` (Outlook drops inline SVG) |
| `apps/odyssey-one/src/spotboard/email/emailLayout.js` | `renderHtml({ title, blocks })` table shell + block helpers; `renderText(lines)` |
| `apps/odyssey-one/src/spotboard/email/templates.js` | `rfqEmail`, `awardEmail`, `alertEmail(kind, ctx)` → `{ id, subject, to, from, text, html }` |
| `apps/odyssey-one/src/spotboard/email/alertKind.js` | `alertKindFor({ quote, evaluation, benchmark, distanceMi })` → `'IE-1'…'IE-6' \| null` |
| `apps/odyssey-one/src/spotboard/email/emailContext.js` | `buildEmailContext({ shipmentDetails, quote, benchmark, distanceMi, evaluation })` → ctx |
| `apps/odyssey-one/src/spotboard/email/emailsForQuote.js` | `emailsForQuote(ctx)` → ordered list of every email the quote produces |
| `apps/odyssey-one/src/routes/spot-emails/fixture.js` | Eight seeded scenarios (one per email outcome) driving the gallery |
| `apps/odyssey-one/src/routes/spot-emails/SpotEmailsRoute.jsx` (+ `.css`) | `/spot-emails` gallery: scenario nav + email list + iframe preview + Text/HTML toggle |
| `apps/odyssey-one/src/App.jsx` | one route line beside `/design-system` |

---

### Task 1: Theme values and the hosted logo

**Files:**
- Create: `apps/odyssey-one/src/spotboard/email/emailTheme.js`
- Create: `apps/odyssey-one/public/email/odyssey-one-logo.png`
- Test: `apps/odyssey-one/src/spotboard/email/emailTheme.test.js`

- [ ] **Step 1: Write the failing test**

```js
// apps/odyssey-one/src/spotboard/email/emailTheme.test.js
import { THEME } from './emailTheme.js'

describe('emailTheme', () => {
  it('exposes only literal hex colors (Outlook cannot read CSS variables)', () => {
    for (const [k, v] of Object.entries(THEME.color)) {
      expect(v, k).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })
  it('names a hosted logo and a font stack', () => {
    expect(THEME.logoUrl).toMatch(/\/email\/odyssey-one-logo\.png$/)
    expect(THEME.font).toContain('Arial')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/spotboard/email/emailTheme`
Expected: FAIL — cannot find module `./emailTheme.js`

- [ ] **Step 3: Write the theme**

Values are copied from `packages/tokens/tokens.css`; the comment on each line names the token so drift is auditable.

```js
// apps/odyssey-one/src/spotboard/email/emailTheme.js
// Email-safe theme. Outlook (Word engine) cannot resolve CSS variables, so
// the token VALUES are baked here. Each line names the token it mirrors —
// when tokens.css changes, update the hex and keep the comment.
// ponytail: hand-copied; generate from tokens.css if this grows past a dozen.
export const THEME = {
  font: 'Arial, Helvetica, sans-serif',
  width: 600,
  logoUrl: 'https://odyssey-one-stage.vercel.app/email/odyssey-one-logo.png',
  logoAlt: 'Odyssey One',
  color: {
    headerBg: '#1B2537',   // --bg-inverse (deep-sea-neutral-900)
    text: '#1B2537',       // --text-primary
    textSecondary: '#384253', // --text-secondary
    textTertiary: '#6B7280',  // --text-tertiary
    pageBg: '#F7F8FA',     // --bg-secondary
    cardBg: '#FFFFFF',     // --bg-primary
    border: '#E4E6EB',     // --border-subtle
    link: '#276DA2',       // --text-link (carolina-blue-600)
    accent: '#5BA4D4',     // carolina-blue-400 (logo "ONE")
    warningBg: '#FFFBEB',  // --bg-warning
    warningText: '#B46E05', // --text-warning
    errorBg: '#FDE5E3',    // --bg-error
    errorText: '#D23930',  // --text-error
    successBg: '#D4F3EB',  // --bg-success
    successText: '#237E70', // --text-success
  },
}
```

- [ ] **Step 4: Produce the logo PNG**

The logo SVG lives in `packages/ui/src/OdysseyLogo.jsx` (172×24 viewBox, `light` variant = white wordmark + `#5BA4D4` "ONE"). Export it once at 2× for the dark header:

```bash
cd apps/odyssey-one && mkdir -p public/email
# 1. Write a standalone SVG with the light-variant fills resolved:
node -e "
const fs=require('fs');
let s=fs.readFileSync('../../packages/ui/src/OdysseyLogo.jsx','utf8');
const body=s.slice(s.indexOf('<g clipPath'), s.indexOf('</svg>'));
const svg='<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"344\" height=\"48\" viewBox=\"0 0 172 24\" fill=\"none\">'+
 body.replace(/fill=\{fills\.odyssey\}/g,'fill=\"#FFFFFF\"').replace(/fill=\{fills\.one\}/g,'fill=\"#5BA4D4\"').replace(/clipPath=/g,'clip-path=')+'</svg>';
fs.writeFileSync('public/email/odyssey-one-logo.svg',svg);
"
# 2. Rasterize with macOS QuickLook (no new dependency):
qlmanage -t -s 688 -o public/email public/email/odyssey-one-logo.svg >/dev/null 2>&1
mv public/email/odyssey-one-logo.svg.png public/email/odyssey-one-logo.png
ls -la public/email
```

Expected: `odyssey-one-logo.png` exists and is non-trivial in size. Open it (`open public/email/odyssey-one-logo.png`) — white wordmark on transparent, "ONE" in blue. If `qlmanage` produces a black box, keep the `.svg` and use `sips -s format png public/email/odyssey-one-logo.svg --out public/email/odyssey-one-logo.png` instead. Delete the intermediate `.svg` once the PNG is right.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/spotboard/email/emailTheme`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/spotboard/email/emailTheme.js apps/odyssey-one/src/spotboard/email/emailTheme.test.js apps/odyssey-one/public/email/odyssey-one-logo.png
git commit -m "S138: email theme (baked token values) + hosted logo for the SpotBid email set"
```

---

### Task 2: Layout shell — text renderer and Outlook-safe HTML table

**Files:**
- Create: `apps/odyssey-one/src/spotboard/email/emailLayout.js`
- Test: `apps/odyssey-one/src/spotboard/email/emailLayout.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// apps/odyssey-one/src/spotboard/email/emailLayout.test.js
import { renderText, renderHtml, blocks } from './emailLayout.js'

describe('renderText', () => {
  it('joins lines, drops null/undefined, keeps blank separators', () => {
    expect(renderText(['A', null, '', 'B'])).toBe('A\n\nB')
  })
})

describe('renderHtml', () => {
  const html = renderHtml({
    title: 'Quote Request 14903 Awarded',
    blocks: [
      blocks.headline('Great news!'),
      blocks.paragraph('Your all in rate has been approved.'),
      blocks.fields([['Quote#', '14903'], ['Shipper', 'Acme']]),
      blocks.address('Ship From', ['Acme Plant 1', '12345 N. Tryon', 'Charlotte NC 28217 US']),
      blocks.button('Open quote', 'https://example.test/q/1'),
      blocks.notice('Do not process any bids.', 'warning'),
    ],
  })
  it('is a 600px table document with no CSS variables and no flex/grid', () => {
    expect(html).toContain('<table')
    expect(html).toContain('width="600"')
    expect(html).not.toMatch(/var\(--/)
    expect(html).not.toMatch(/display:\s*(flex|grid)/)
    expect(html).not.toMatch(/border-radius/)
  })
  it('carries the logo, the title, every block, and a footer', () => {
    expect(html).toContain('odyssey-one-logo.png')
    expect(html).toContain('<title>Quote Request 14903 Awarded</title>')
    expect(html).toContain('Great news!')
    expect(html).toContain('Quote#')
    expect(html).toContain('Charlotte NC 28217 US')
    expect(html).toContain('href="https://example.test/q/1"')
    expect(html).toContain('Do not process any bids.')
    expect(html).toContain('Odyssey Logistics')
  })
  it('escapes HTML in values', () => {
    const out = renderHtml({ title: 'x', blocks: [blocks.paragraph('<b>hi</b> & bye')] })
    expect(out).toContain('&lt;b&gt;hi&lt;/b&gt; &amp; bye')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/spotboard/email/emailLayout`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write the layout**

```js
// apps/odyssey-one/src/spotboard/email/emailLayout.js
// Plain-text-first email layout with a LIGHT HTML layer that Outlook's Word
// engine renders faithfully: one 600px table, inline styles, hex colors from
// emailTheme, hosted PNG logo, no flex/grid/var()/border-radius/web fonts.
import { THEME } from './emailTheme.js'

const C = THEME.color
const FONT = `font-family:${THEME.font};`

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Lines: strings, or null/undefined to drop. Empty string = blank separator.
export function renderText(lines) {
  return lines.filter((l) => l != null).join('\n')
}

const cell = (inner, style = '') => `<td style="${FONT}${style}">${inner}</td>`
const row = (inner) => `<tr>${inner}</tr>`

export const blocks = {
  headline: (text) => row(cell(esc(text), `font-size:18px;font-weight:bold;color:${C.text};padding:0 0 12px 0;`)),
  paragraph: (text) => row(cell(esc(text), `font-size:14px;line-height:20px;color:${C.textSecondary};padding:0 0 12px 0;`)),
  // [[label, value], …] — two-column key/value table.
  fields: (pairs) => row(cell(
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">` +
    pairs.filter(([, v]) => v != null && v !== '').map(([k, v]) => row(
      cell(esc(k), `font-size:13px;color:${C.textTertiary};padding:3px 12px 3px 0;white-space:nowrap;vertical-align:top;`) +
      cell(esc(v), `font-size:13px;color:${C.text};padding:3px 0;vertical-align:top;`),
    )).join('') +
    `</table>`, 'padding:0 0 12px 0;')),
  // Address block: label + lines.
  address: (label, lines) => row(cell(
    `<div style="font-size:13px;color:${C.textTertiary};padding-bottom:2px;">${esc(label)}</div>` +
    lines.filter(Boolean).map((l) => `<div style="font-size:13px;line-height:18px;color:${C.text};">${esc(l)}</div>`).join(''),
    'padding:0 0 12px 0;')),
  button: (label, href) => row(cell(
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td style="${FONT}background:${C.link};padding:10px 18px;">` +
    `<a href="${esc(href)}" style="${FONT}font-size:14px;font-weight:bold;color:${C.cardBg};text-decoration:none;display:inline-block;">${esc(label)}</a>` +
    `</td></tr></table>` +
    `<div style="font-size:12px;color:${C.textTertiary};padding-top:8px;">If the button does not work, copy this link: <a href="${esc(href)}" style="color:${C.link};">${esc(href)}</a></div>`,
    'padding:4px 0 16px 0;')),
  // tone: 'warning' | 'error' | 'success' | 'info'
  notice: (text, tone = 'info') => {
    const bg = { warning: C.warningBg, error: C.errorBg, success: C.successBg, info: C.pageBg }[tone]
    const fg = { warning: C.warningText, error: C.errorText, success: C.successText, info: C.textSecondary }[tone]
    return row(cell(esc(text), `font-size:13px;line-height:18px;color:${fg};background:${bg};border:1px solid ${C.border};padding:10px 12px;`) )
      .replace('<tr>', '<tr><td style="padding:0 0 12px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">')
      .replace('</tr>', '</tr></table></td></tr>')
  },
  spacer: (px = 8) => row(cell('&nbsp;', `font-size:1px;line-height:${px}px;padding:0;`)),
}

export function renderHtml({ title, blocks: body, preheader = '' }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.pageBg};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.pageBg};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${THEME.width}" style="width:${THEME.width}px;max-width:100%;background:${C.cardBg};border:1px solid ${C.border};">
<tr><td style="background:${C.headerBg};padding:16px 24px;">
<img src="${THEME.logoUrl}" width="172" height="24" alt="${esc(THEME.logoAlt)}" style="display:block;border:0;" />
</td></tr>
<tr><td style="padding:24px 24px 8px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${body.join('\n')}
</table>
</td></tr>
<tr><td style="${FONT}font-size:11px;line-height:16px;color:${C.textTertiary};border-top:1px solid ${C.border};padding:16px 24px;">
Odyssey Logistics &amp; Technology Corporation &middot; 4235 South Stream Blvd, STE 300, Charlotte NC 28217 &middot; 1-888-352-4409<br />
This is a transactional message about a shipment you are configured to receive quotes for. It contains confidential information for the intended recipient only.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/spotboard/email/emailLayout`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/spotboard/email/emailLayout.js apps/odyssey-one/src/spotboard/email/emailLayout.test.js
git commit -m "S138: email layout — text renderer + Outlook-safe 600px table shell"
```

---

### Task 3: The eight templates

**Files:**
- Create: `apps/odyssey-one/src/spotboard/email/templates.js`
- Test: `apps/odyssey-one/src/spotboard/email/templates.test.js`

The **context** shape every template receives (built in Task 5):

```js
// ctx
{
  quoteId: '222617',                 // quote number (never Order/Load id in carrier mail)
  reference: 'C11562' | 'L31429',   // consolidation or load reference — planner alerts only
  orderNumber: '0000000091142' | null, // single loads only — planner alerts only
  shipper: 'Huntsman Refining LLC',
  from: { name, lines: ['800 Laney Field', 'Kansas City MO 64101 US'] },
  to:   { name, lines: [...] },
  equipment: 'TL - Truck Load',
  weight: '13,083 lb',
  hazmat: 'No',
  distance: '1,328 mi' | null,
  pickup: '03/23/2026', deliver: '03/25/2026',
  stops: [{ label: '1 - Spartanburg SC 29301 US', date: 'Drop-off: 09/22/2023' }],
  offerExpires: '09/02/2026 11:44 EST',
  sender: 'planning-group@odysseylogistics.com',   // FROMEMAIL (SPB-77)
  plannerGroup: 'planning-group@odysseylogistics.com',
  appOrigin: 'https://odyssey-one-stage.vercel.app',
  lowest: { carrier: 'CCNI - TL', amount: '$2,925.05 CAD', shipDate, deliveryDate } | null,
}
```

- [ ] **Step 1: Write the failing tests**

```js
// apps/odyssey-one/src/spotboard/email/templates.test.js
import { rfqEmail, awardEmail, alertEmail, ALERT_KINDS } from './templates.js'

const ctx = {
  quoteId: '14903', reference: 'C11562', orderNumber: null,
  shipper: 'Acme Chemical Company',
  from: { name: 'Acme Chemical Plant 1', lines: ['12345 N. Tryon', 'Charlotte NC 28217 US'] },
  to: { name: 'Acme Client Plant2', lines: ['123 Main St', 'New Orleans LA 70114 US'] },
  equipment: 'TL - Truck Load', weight: '10,500 lb', hazmat: 'No', distance: '727 mi',
  pickup: '09/20/2023', deliver: '09/25/2023',
  stops: [{ label: '1 - Spartanburg SC 29301 US', date: 'Drop-off: 09/22/2023' }],
  offerExpires: '09/08/2023 11:44 EST',
  sender: 'planning@odysseylogistics.com', plannerGroup: 'planning@odysseylogistics.com',
  appOrigin: 'https://odyssey-one-stage.vercel.app',
  lowest: { carrier: 'CCNI - TL', amount: '$2,925.05 CAD', shipDate: '09/20/2023', deliveryDate: '09/25/2023' },
}
const carrier = { scac: 'CCNI', name: 'Cardinal Freight', email: 'ops@ccni.example.com', token: 'tok-ccni' }

describe('CE-1 rfqEmail', () => {
  const m = rfqEmail(ctx, carrier)
  it('uses the legacy subject pattern and the planning-group sender', () => {
    expect(m.subject).toBe('Request for Quote to CCNI for Quote No: 14903, for ACME CHEMICAL COMPANY')
    expect(m.from).toBe('planning@odysseylogistics.com')
    expect(m.to).toBe('ops@ccni.example.com')
  })
  it('is a data sheet with the token link and NO order/load id', () => {
    expect(m.text).toContain('Offer Expires: 09/08/2023 11:44 EST')
    expect(m.text).toContain('Quote#: 14903')
    expect(m.text).toContain('Distance: 727 mi')
    expect(m.text).toContain('Stop Offs:')
    expect(m.text).toContain('https://odyssey-one-stage.vercel.app/spot-bid/tok-ccni')
    expect(m.text).not.toMatch(/Order#|Load#|Reference#/)
    expect(m.html).toContain('href="https://odyssey-one-stage.vercel.app/spot-bid/tok-ccni"')
    expect(m.html).not.toMatch(/Reference#/)
  })
})

describe('CE-2 awardEmail', () => {
  const m = awardEmail(ctx, carrier, '2259.05 CAD')
  it('matches the legacy wording and names the tender as a separate step', () => {
    expect(m.subject).toBe('Quote Request 14903 Awarded')
    expect(m.text).toContain('Great news! Your all in rate of 2259.05 CAD has been approved.')
    expect(m.text).toContain('Please accept the EDI or email tender at your earliest convenience.')
    expect(m.text).toContain('Quote#: 14903')
    expect(m.text).not.toMatch(/Order#|Load#/)
  })
})

describe('IE-* alertEmail', () => {
  it('knows six kinds', () => {
    expect(ALERT_KINDS).toEqual(['IE-1', 'IE-2', 'IE-3', 'IE-4', 'IE-5', 'IE-6'])
  })
  it('IE-1 uses the Attention skeleton with no bid block', () => {
    const m = alertEmail('IE-1', { ...ctx, lowest: null })
    expect(m.subject).toBe('Attention - Quote Request 14903 closed with no carrier bids submitted.')
    expect(m.to).toBe('planning@odysseylogistics.com')
    expect(m.text.split('\n')[0]).toBe(m.subject)
    expect(m.text).toContain('Reference#: C11562')
    expect(m.text).not.toContain('Order#')
    expect(m.text).not.toContain('Lowest Cost Carrier')
  })
  it('IE-2 appends the lowest-bid block when a bid exists', () => {
    const m = alertEmail('IE-2', ctx)
    expect(m.subject).toBe('Attention - Quote Request 14903 closed and the lowest cost carrier is out of tolerance.')
    expect(m.text).toContain('Lowest Cost Carrier: CCNI - TL')
    expect(m.text).toContain('Quoted Amount: $2,925.05 CAD')
    expect(m.text).toContain('Ship Date: 09/20/2023')
  })
  it('IE-3 has two shapes: with and without the bid block', () => {
    expect(alertEmail('IE-3', ctx).text).toContain('Lowest Cost Carrier')
    expect(alertEmail('IE-3', { ...ctx, lowest: null }).text).not.toContain('Lowest Cost Carrier')
    expect(alertEmail('IE-3', ctx).subject).toBe('Attention - Quote Request 14903 closed and Manual Review = Yes.  Please review quote responses immediately.')
  })
  it('IE-4 carries the cancellation body', () => {
    const m = alertEmail('IE-4', ctx)
    expect(m.subject).toBe('Attention - Quote Request 14903 Cancelled, Consolidation Impacted by Order Change')
    expect(m.text).toContain('Your consolidation has changed.')
    expect(m.text).toContain('Do not process any bids associated with this consolidation.')
  })
  it('IE-5 / IE-6 show Order# for single loads', () => {
    const single = { ...ctx, reference: 'L31429', orderNumber: 'ACME-09082023.001', lowest: null }
    expect(alertEmail('IE-5', single).text).toContain('Order#: ACME-09082023.001')
    expect(alertEmail('IE-6', single).subject).toBe('Attention - Quote Request 14903 closed and no distance was found to calculate an estimated costed LCE option.')
  })
  it('rejects unknown kinds', () => {
    expect(() => alertEmail('IE-9', ctx)).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/spotboard/email/templates`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write the templates**

```js
// apps/odyssey-one/src/spotboard/email/templates.js
// The eight overflow emails, plain-text first (verbatim skeletons from
// Doug's 2023 sends — vault quote-model.md §7.1), with the HTML layer
// mirroring the text line for line. CE-* go to carriers, IE-* to the
// planning group. Sender is the planning group's FROMEMAIL (SPB-77).
import { renderText, renderHtml, blocks } from './emailLayout.js'

const addr = (a) => [a?.name, ...(a?.lines ?? [])].filter(Boolean)
const addrText = (label, a) => [`${label}:`, ...addr(a).map((l) => `\t${l}`)]

// Shared tail of every message: shipper + from/to. Planner alerts prepend
// Reference#/Order#; carrier emails never carry them (SPB-05).
function partyText(ctx, { withReference }) {
  return [
    withReference ? `Reference#: ${ctx.reference}` : null,
    withReference && ctx.orderNumber ? `Order#: ${ctx.orderNumber}` : null,
    withReference ? '' : null,
    `Shipper: ${ctx.shipper}`,
    '',
    ...addrText('Ship From', ctx.from),
    '',
    ...addrText('Ship To', ctx.to),
  ]
}
function partyBlocks(ctx, { withReference }) {
  return [
    withReference ? blocks.fields([['Reference#', ctx.reference], ['Order#', ctx.orderNumber]]) : null,
    blocks.fields([['Shipper', ctx.shipper]]),
    blocks.address('Ship From', addr(ctx.from)),
    blocks.address('Ship To', addr(ctx.to)),
  ].filter(Boolean)
}

// ---------- CE-1 Request for Quote ----------
export function rfqEmail(ctx, carrier) {
  const link = `${ctx.appOrigin}/spot-bid/${carrier.token}`
  const subject = `Request for Quote to ${carrier.scac} for Quote No: ${ctx.quoteId}, for ${ctx.shipper.toUpperCase()}`
  const stopsText = ctx.stops?.length
    ? ['Stop Offs:', ...ctx.stops.map((s) => `\t${s.label}\t${s.date}`)]
    : []
  const text = renderText([
    'Request For Quote',
    `Offer Expires: ${ctx.offerExpires}`,
    '',
    `Shipper: ${ctx.shipper}`,
    `Carrier: ${carrier.scac} - ${carrier.name}`,
    `Quote#: ${ctx.quoteId}`,
    `Equipment: ${ctx.equipment}`,
    `Weight: ${ctx.weight}`,
    `Hazmat: ${ctx.hazmat}`,
    ctx.distance ? `Distance: ${ctx.distance}` : null,
    '',
    ...addrText('Ship From', ctx.from),
    '',
    ...addrText('Ship To', ctx.to),
    '',
    `Pickup: ${ctx.pickup}`,
    `Deliver: ${ctx.deliver}`,
    ...(stopsText.length ? ['', ...stopsText] : []),
    '',
    'Submit your quote here (this link is for your company only):',
    link,
  ])
  const html = renderHtml({
    title: subject,
    preheader: `Quote ${ctx.quoteId} · ${ctx.equipment} · offer expires ${ctx.offerExpires}`,
    blocks: [
      blocks.headline('Request for Quote'),
      blocks.notice(`Offer expires ${ctx.offerExpires}`, 'warning'),
      blocks.fields([
        ['Shipper', ctx.shipper], ['Carrier', `${carrier.scac} - ${carrier.name}`], ['Quote#', ctx.quoteId],
        ['Equipment', ctx.equipment], ['Weight', ctx.weight], ['Hazmat', ctx.hazmat], ['Distance', ctx.distance],
      ]),
      blocks.address('Ship From', addr(ctx.from)),
      blocks.address('Ship To', addr(ctx.to)),
      blocks.fields([['Pickup', ctx.pickup], ['Deliver', ctx.deliver]]),
      ctx.stops?.length ? blocks.fields(ctx.stops.map((s) => [s.label, s.date])) : null,
      blocks.button('Submit your quote', link),
      blocks.paragraph('This link is for your company only. Bidding closes at the offer expiry above.'),
    ].filter(Boolean),
  })
  return { id: 'CE-1', kind: 'CE-1', subject, from: ctx.sender, to: carrier.email, text, html }
}

// ---------- CE-2 Quote Awarded ----------
export function awardEmail(ctx, carrier, allInRate) {
  const subject = `Quote Request ${ctx.quoteId} Awarded`
  const lead = `Great news! Your all in rate of ${allInRate} has been approved. Please accept the EDI or email tender at your earliest convenience.`
  const text = renderText([
    lead, '',
    `Quote#: ${ctx.quoteId}`,
    ...partyText(ctx, { withReference: false }),
  ])
  const html = renderHtml({
    title: subject,
    preheader: `Your rate of ${allInRate} for quote ${ctx.quoteId} was approved`,
    blocks: [
      blocks.headline('Great news!'),
      blocks.paragraph(lead),
      blocks.fields([['Quote#', ctx.quoteId]]),
      ...partyBlocks(ctx, { withReference: false }),
      blocks.notice('The tender is a separate step. You are assigned to the load only once you accept it.', 'info'),
    ],
  })
  return { id: 'CE-2', kind: 'CE-2', subject, from: ctx.sender, to: carrier.email, text, html }
}

// ---------- IE-1…IE-6 planner alerts ----------
const ALERTS = {
  'IE-1': { cond: 'closed with no carrier bids submitted.', tone: 'error' },
  'IE-2': { cond: 'closed and the lowest cost carrier is out of tolerance.', tone: 'warning' },
  'IE-3': { cond: 'closed and Manual Review = Yes.  Please review quote responses immediately.', tone: 'warning' },
  'IE-4': { cond: 'Cancelled, Consolidation Impacted by Order Change', tone: 'error', cancelled: true },
  'IE-5': { cond: 'closed and no costed LCE option exists to determine quote tolerance.', tone: 'warning' },
  'IE-6': { cond: 'closed and no distance was found to calculate an estimated costed LCE option.', tone: 'warning' },
}
export const ALERT_KINDS = Object.keys(ALERTS)

export function alertEmail(kind, ctx) {
  const def = ALERTS[kind]
  if (!def) throw new Error(`Unknown alert kind ${kind}`)
  const subject = `Attention - Quote Request ${ctx.quoteId} ${def.cond}`
  const cancelledLead = def.cancelled
    ? ['Your consolidation has changed.', '', 'Your quote has been cancelled and is now invalid.  Do not process any bids associated with this consolidation.  Review shipment details to determine next steps.']
    : [subject]
  const bid = ctx.lowest && !def.cancelled
    ? ['', `Lowest Cost Carrier: ${ctx.lowest.carrier}`, `Quoted Amount: ${ctx.lowest.amount}`, `Ship Date: ${ctx.lowest.shipDate}`, `Delivery Date: ${ctx.lowest.deliveryDate}`]
    : []
  const text = renderText([
    ...cancelledLead, '',
    ...partyText(ctx, { withReference: true }),
    ...bid,
  ])
  const html = renderHtml({
    title: subject,
    preheader: subject,
    blocks: [
      blocks.notice(def.cancelled ? 'Your consolidation has changed. Your quote has been cancelled and is now invalid.' : subject, def.tone),
      def.cancelled ? blocks.paragraph('Do not process any bids associated with this consolidation. Review shipment details to determine next steps.') : null,
      ...partyBlocks(ctx, { withReference: true }),
      bid.length ? blocks.fields([
        ['Lowest Cost Carrier', ctx.lowest.carrier], ['Quoted Amount', ctx.lowest.amount],
        ['Ship Date', ctx.lowest.shipDate], ['Delivery Date', ctx.lowest.deliveryDate],
      ]) : null,
    ].filter(Boolean),
  })
  return { id: kind, kind, subject, from: ctx.sender, to: ctx.plannerGroup, text, html }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/spotboard/email/templates`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/spotboard/email/templates.js apps/odyssey-one/src/spotboard/email/templates.test.js
git commit -m "S138: the eight overflow email templates — CE-1/CE-2 + IE-1…IE-6, text-first"
```

---

### Task 4: Which planner alert a closed quote produces

**Files:**
- Create: `apps/odyssey-one/src/spotboard/email/alertKind.js`
- Test: `apps/odyssey-one/src/spotboard/email/alertKind.test.js`

`evaluateTolerance` (in `src/spotboard/tolerance.js`) returns `{ ceiling, withinTolerance, reason }` with `reason ∈ 'within' | 'manual-review' | 'total-cap' | 'out-of-tolerance'`. `benchmark()` returns `0` when no routed cost exists.

- [ ] **Step 1: Write the failing tests**

```js
// apps/odyssey-one/src/spotboard/email/alertKind.test.js
import { alertKindFor } from './alertKind.js'

const bid = { total: 1000, status: 'bid' }
const open = { status: 'open', carriers: [{ incl: true, bid }] }
const closedWith = { status: 'closed', carriers: [{ incl: true, bid }] }
const closedNone = { status: 'closed', carriers: [{ incl: true }, { incl: true, bid: { status: 'declined' } }] }

describe('alertKindFor', () => {
  it('is null while the quote is open or awarded', () => {
    expect(alertKindFor({ quote: open, benchmark: 900, distanceMi: 700 })).toBeNull()
    expect(alertKindFor({ quote: { ...closedWith, status: 'awarded' }, benchmark: 900, distanceMi: 700 })).toBeNull()
  })
  it('IE-4 when the quote was invalidated by an order change', () => {
    expect(alertKindFor({ quote: { ...closedWith, status: 'invalidated' } })).toBe('IE-4')
  })
  it('IE-1 when closed with zero bids', () => {
    expect(alertKindFor({ quote: closedNone, benchmark: 900, distanceMi: 700 })).toBe('IE-1')
  })
  it('IE-6 when no benchmark and no distance; IE-5 when no benchmark but distance exists', () => {
    expect(alertKindFor({ quote: closedWith, benchmark: 0, distanceMi: null })).toBe('IE-6')
    expect(alertKindFor({ quote: closedWith, benchmark: 0, distanceMi: 700 })).toBe('IE-5')
  })
  it('IE-3 on manual review, IE-2 out of tolerance, null when within', () => {
    expect(alertKindFor({ quote: closedWith, benchmark: 900, distanceMi: 700, evaluation: { reason: 'manual-review' } })).toBe('IE-3')
    expect(alertKindFor({ quote: closedWith, benchmark: 900, distanceMi: 700, evaluation: { reason: 'out-of-tolerance' } })).toBe('IE-2')
    expect(alertKindFor({ quote: closedWith, benchmark: 900, distanceMi: 700, evaluation: { reason: 'total-cap' } })).toBe('IE-2')
    expect(alertKindFor({ quote: closedWith, benchmark: 900, distanceMi: 700, evaluation: { reason: 'within' } })).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/spotboard/email/alertKind`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write it**

```js
// apps/odyssey-one/src/spotboard/email/alertKind.js
// Maps a closed quote's outcome to the planner alert it fires (PRD Feature 11,
// SPB-78). Precedence follows the legacy close routine: cancellation, then
// no bids, then "cannot evaluate tolerance" (no benchmark: no distance → IE-6,
// else IE-5), then the tolerance verdict. `within` fires nothing — auto-award.
export function alertKindFor({ quote, evaluation, benchmark, distanceMi }) {
  if (!quote) return null
  if (quote.status === 'invalidated') return 'IE-4'
  if (quote.status !== 'closed') return null
  const bids = (quote.carriers ?? []).filter((c) => c.incl && c.bid?.status === 'bid')
  if (bids.length === 0) return 'IE-1'
  if (!benchmark) return Number.isFinite(distanceMi) && distanceMi > 0 ? 'IE-5' : 'IE-6'
  switch (evaluation?.reason) {
    case 'manual-review': return 'IE-3'
    case 'out-of-tolerance':
    case 'total-cap': return 'IE-2'
    default: return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/spotboard/email/alertKind`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/spotboard/email/alertKind.js apps/odyssey-one/src/spotboard/email/alertKind.test.js
git commit -m "S138: alertKindFor — which IE-* a closed quote fires"
```

---

### Task 5: Context builder and the per-quote email list

**Files:**
- Create: `apps/odyssey-one/src/spotboard/email/emailContext.js`
- Create: `apps/odyssey-one/src/spotboard/email/emailsForQuote.js`
- Test: `apps/odyssey-one/src/spotboard/email/emailContext.test.js`
- Test: `apps/odyssey-one/src/spotboard/email/emailsForQuote.test.js`

What the tab already has (see `SpotBoardTab.jsx` ~line 196–230 and `buildHeader`): `shipmentDetails.stopsData.stops[]` (`type`, `location`, `facilityName`, `address1`, `city`, `region`, `postal`, `country`, `scheduledDateTime`), `shipmentDetails.orderDetails[0]` (`earliestPickup`, `latestPickup`, `grossWeightValue`, `grossWeightUomCode`, `hazmat`, `orderNumber`), `shipmentDetails.stopsData.summary.distance`, `shipmentDetails.summary.seedEquipment`, `shipment.sellShipment` (id), `shipment.customerName`, and `quote` (`quoteId` is `shipment.sellShipment`-derived — use `quote.id ?? sid`), `quote.closeAt`, `quote.carriers[]` (`scac`, `name`, `email`, `incl`, `token`, `plannedPickup`, `plannedDelivery`, `bid`). **Read `buildHeader` in `SpotBoardTab.jsx` first and reuse its field access rather than inventing new paths.** If a field is absent in `shipmentDetails`, fall back gracefully (empty string / null) — never throw.

- [ ] **Step 1: Write the failing tests**

```js
// apps/odyssey-one/src/spotboard/email/emailContext.test.js
import { buildEmailContext, fmtStamp } from './emailContext.js'

const shipmentDetails = {
  summary: { seedEquipment: 'TL' },
  stopsData: {
    summary: { distance: '727 mi' },
    stops: [
      { type: 'pickup', facilityName: 'Acme Chemical Plant 1', address1: '12345 N. Tryon', city: 'Charlotte', region: 'NC', postal: '28217', country: 'US', scheduledDateTime: 'September 20, 2023 08:00 EDT' },
      { type: 'delivery', facilityName: 'Spartanburg DC', address1: '1 Mill Rd', city: 'Spartanburg', region: 'SC', postal: '29301', country: 'US', scheduledDateTime: 'September 22, 2023 08:00 EDT' },
      { type: 'delivery', facilityName: 'Acme Client Plant2', address1: '123 Main St', city: 'New Orleans', region: 'LA', postal: '70114', country: 'US', scheduledDateTime: 'September 25, 2023 08:00 EDT' },
    ],
  },
  orderDetails: [{ orderNumber: '0000000091142', grossWeightValue: 10500, grossWeightUomCode: 'LB', hazmat: 'No' }],
}
const shipment = { sellShipment: '25000178', customerName: 'Acme Chemical Company' }
const quote = {
  status: 'closed', closeAt: Date.UTC(2023, 8, 8, 15, 44),
  carriers: [
    { scac: 'CCNI', name: 'Cardinal Freight', email: 'ops@ccni.example.com', incl: true, token: 't1', bid: { status: 'bid', total: 2925.05, currency: 'CAD' } },
    { scac: 'ZZZZ', name: 'Other', email: 'ops@zzzz.example.com', incl: true, token: 't2', bid: { status: 'bid', total: 3100, currency: 'CAD' } },
  ],
}

describe('buildEmailContext', () => {
  const ctx = buildEmailContext({ shipmentDetails, shipment, quote, benchmark: 2500, distanceMi: 727 })
  it('reads shipper, origin (first pickup), destination (last delivery), and intermediate stops', () => {
    expect(ctx.shipper).toBe('Acme Chemical Company')
    expect(ctx.from.name).toBe('Acme Chemical Plant 1')
    expect(ctx.from.lines).toEqual(['12345 N. Tryon', 'Charlotte NC 28217 US'])
    expect(ctx.to.name).toBe('Acme Client Plant2')
    expect(ctx.stops).toEqual([{ label: '1 - Spartanburg SC 29301 US', date: 'Drop-off: 09/22/2023' }])
  })
  it('formats equipment, weight, hazmat, distance, dates, expiry', () => {
    expect(ctx.equipment).toBe('TL')
    expect(ctx.weight).toBe('10,500 lb')
    expect(ctx.hazmat).toBe('No')
    expect(ctx.distance).toBe('727 mi')
    expect(ctx.pickup).toBe('09/20/2023')
    expect(ctx.deliver).toBe('09/25/2023')
    expect(ctx.offerExpires).toBe(fmtStamp(quote.closeAt))
  })
  it('derives the reference (L + id for single loads, with Order#) and the lowest bid block', () => {
    expect(ctx.reference).toBe('L25000178')
    expect(ctx.orderNumber).toBe('0000000091142')
    expect(ctx.lowest).toEqual({ carrier: 'CCNI - TL', amount: '$2,925.05 CAD', shipDate: '09/20/2023', deliveryDate: '09/25/2023' })
    expect(ctx.quoteId).toBe('25000178')
    expect(ctx.sender).toMatch(/@odysseylogistics\.com$/)
    expect(ctx.appOrigin).toMatch(/^https?:\/\//)
  })
  it('treats a multi-order shipment as a consolidation: C + id, no Order#', () => {
    const consol = { ...shipmentDetails, orderDetails: [shipmentDetails.orderDetails[0], { orderNumber: 'X' }] }
    const c = buildEmailContext({ shipmentDetails: consol, shipment, quote, benchmark: 2500, distanceMi: 727 })
    expect(c.reference).toBe('C25000178')
    expect(c.orderNumber).toBeNull()
  })
  it('never throws on missing details', () => {
    const c = buildEmailContext({ shipmentDetails: null, shipment, quote: null })
    expect(c.shipper).toBe('Acme Chemical Company')
    expect(c.lowest).toBeNull()
    expect(c.from.lines).toEqual([])
  })
})
```

```js
// apps/odyssey-one/src/spotboard/email/emailsForQuote.test.js
import { emailsForQuote } from './emailsForQuote.js'

const base = {
  quoteId: '1', reference: 'L1', orderNumber: 'O1', shipper: 'S',
  from: { name: 'A', lines: [] }, to: { name: 'B', lines: [] },
  equipment: 'TL', weight: '1 lb', hazmat: 'No', distance: '1 mi', pickup: '01/01/2026', deliver: '01/02/2026',
  stops: [], offerExpires: 'x', sender: 's@o.com', plannerGroup: 'p@o.com', appOrigin: 'https://x',
  lowest: { carrier: 'AAAA - TL', amount: '$1.00 USD', shipDate: '01/01/2026', deliveryDate: '01/02/2026' },
}
const carriers = [
  { scac: 'AAAA', name: 'A Co', email: 'a@a', incl: true, token: 'ta', bid: { status: 'bid', total: 1, currency: 'USD' } },
  { scac: 'BBBB', name: 'B Co', email: 'b@b', incl: true, token: 'tb' },
  { scac: 'CCCC', name: 'C Co', email: 'c@c', incl: false, token: 'tc' },
]

describe('emailsForQuote', () => {
  it('open quote: one RFQ per INCLUDED carrier, nothing else', () => {
    const list = emailsForQuote(base, { status: 'open', carriers }, { alertKind: null, awardedScac: null })
    expect(list.map((e) => [e.kind, e.to])).toEqual([['CE-1', 'a@a'], ['CE-1', 'b@b']])
  })
  it('closed out-of-tolerance: RFQs then the IE-2 alert', () => {
    const list = emailsForQuote(base, { status: 'closed', carriers }, { alertKind: 'IE-2', awardedScac: null })
    expect(list.map((e) => e.kind)).toEqual(['CE-1', 'CE-1', 'IE-2'])
  })
  it('awarded: RFQs then CE-2 to the winner with its all-in rate', () => {
    const list = emailsForQuote(base, { status: 'awarded', carriers }, { alertKind: null, awardedScac: 'AAAA' })
    const award = list.find((e) => e.kind === 'CE-2')
    expect(award.to).toBe('a@a')
    expect(award.text).toContain('Your all in rate of 1.00 USD')
  })
  it('every email has a stable id and a "when" label', () => {
    const list = emailsForQuote(base, { status: 'awarded', carriers }, { alertKind: null, awardedScac: 'AAAA' })
    expect(new Set(list.map((e) => e.id)).size).toBe(list.length)
    expect(list.every((e) => typeof e.when === 'string')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/spotboard/email/emailContext src/spotboard/email/emailsForQuote`
Expected: FAIL — cannot find modules

- [ ] **Step 3: Write the context builder**

```js
// apps/odyssey-one/src/spotboard/email/emailContext.js
// Builds the template context from what the SpotBid tab already holds.
// Field paths mirror buildHeader() in components/detail/SpotBoardTab.jsx —
// if that changes, change this. Every accessor tolerates missing data.
import { fmtDollar } from '../../utils/money.js'

// ponytail: FROMEMAIL is a TMS system profile per planning group (SPB-77);
// the prototype has no planning-group model, so one seeded mailbox stands in.
export const PLANNING_GROUP_MAILBOX = 'planning-charlotte@odysseylogistics.com'
export const APP_ORIGIN = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin
  : 'https://odyssey-one-stage.vercel.app'

const pad = (n) => String(n).padStart(2, '0')
export function fmtDate(d) {
  const t = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(t.getTime())) return ''
  return `${pad(t.getMonth() + 1)}/${pad(t.getDate())}/${t.getFullYear()}`
}
// "09/08/2023 11:44 EST" — legacy stamp shape; zone from the browser.
export function fmtStamp(ms) {
  if (!ms) return ''
  const t = new Date(ms)
  const zone = t.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop()
  return `${fmtDate(t)} ${pad(t.getHours())}:${pad(t.getMinutes())} ${zone}`
}

function stopAddress(s) {
  if (!s) return { name: '', lines: [] }
  const cityLine = [s.city, s.region, s.postal, s.country].filter(Boolean).join(' ')
  return { name: s.facilityName ?? s.location ?? '', lines: [s.address1, cityLine].filter(Boolean) }
}
function cityLine(s) {
  return [s.city, s.region, s.postal, s.country].filter(Boolean).join(' ')
}
function fmtWeight(order) {
  if (!order?.grossWeightValue) return ''
  return `${Number(order.grossWeightValue).toLocaleString('en-US')} ${String(order.grossWeightUomCode ?? 'lb').toLowerCase()}`
}

export function buildEmailContext({ shipmentDetails, shipment, quote, benchmark, distanceMi }) {
  const stops = shipmentDetails?.stopsData?.stops ?? []
  const pickups = stops.filter((s) => s.type === 'pickup')
  const deliveries = stops.filter((s) => s.type === 'delivery')
  const first = pickups[0]
  const last = deliveries[deliveries.length - 1]
  const middle = stops.filter((s) => s !== first && s !== last)
  const orders = shipmentDetails?.orderDetails ?? []
  const firstOrder = orders[0]
  const id = String(shipment?.sellShipment ?? quote?.id ?? '')
  const consolidation = orders.length > 1

  const bidding = (quote?.carriers ?? []).filter((c) => c.incl && c.bid?.status === 'bid')
  const lowestCarrier = bidding.length
    ? bidding.reduce((lo, c) => (c.bid.total < lo.bid.total ? c : lo))
    : null
  const equipment = shipmentDetails?.summary?.seedEquipment ?? firstOrder?.equipment ?? ''

  return {
    quoteId: id,
    reference: `${consolidation ? 'C' : 'L'}${id}`,
    orderNumber: consolidation ? null : (firstOrder?.orderNumber ?? null),
    shipper: shipment?.customerName ?? shipmentDetails?.summary?.customerName ?? '',
    from: stopAddress(first),
    to: stopAddress(last),
    equipment,
    weight: fmtWeight(firstOrder),
    hazmat: orders.some((o) => o.hazmat === 'Yes') ? 'Yes' : 'No',
    distance: shipmentDetails?.stopsData?.summary?.distance
      ?? (Number.isFinite(distanceMi) && distanceMi > 0 ? `${Math.round(distanceMi).toLocaleString('en-US')} mi` : null),
    pickup: fmtDate(first?.scheduledDateTime),
    deliver: fmtDate(last?.scheduledDateTime),
    stops: middle.map((s, i) => ({
      label: `${i + 1} - ${cityLine(s)}`,
      date: `${s.type === 'pickup' ? 'Pickup' : 'Drop-off'}: ${fmtDate(s.scheduledDateTime)}`,
    })),
    offerExpires: fmtStamp(quote?.closeAt),
    sender: PLANNING_GROUP_MAILBOX,
    plannerGroup: PLANNING_GROUP_MAILBOX,
    appOrigin: APP_ORIGIN,
    benchmark: benchmark ?? 0,
    lowest: lowestCarrier ? {
      carrier: `${lowestCarrier.scac} - ${equipment}`,
      amount: `${fmtDollar(lowestCarrier.bid.total)} ${lowestCarrier.bid.currency ?? 'USD'}`,
      shipDate: fmtDate(first?.scheduledDateTime),
      deliveryDate: fmtDate(last?.scheduledDateTime),
    } : null,
  }
}
```

Check `fmtDollar` exists in `src/utils/money.js` (LiveBids imports one — copy its import path). If `fmtDollar` is local to LiveBids, export it from `money.js` instead of duplicating.

- [ ] **Step 4: Write the per-quote list**

```js
// apps/odyssey-one/src/spotboard/email/emailsForQuote.js
// Every email one quote produces, in send order: CE-1 per included carrier
// at send, then either the IE-* alert at close or CE-2 to the winner.
import { rfqEmail, awardEmail, alertEmail } from './templates.js'

export function emailsForQuote(ctx, quote, { alertKind, awardedScac }) {
  const carriers = (quote?.carriers ?? []).filter((c) => c.incl)
  const list = carriers.map((c) => ({
    ...rfqEmail(ctx, c), id: `CE-1:${c.scac}`, when: 'On Send RFQ', recipientLabel: `${c.scac} · ${c.name}`,
  }))
  if (alertKind) {
    list.push({ ...alertEmail(alertKind, ctx), when: 'On close', recipientLabel: 'Planning group' })
  }
  if (awardedScac) {
    const w = carriers.find((c) => c.scac === awardedScac)
    if (w?.bid) {
      const rate = `${Number(w.bid.total).toFixed(2)} ${w.bid.currency ?? 'USD'}`
      list.push({ ...awardEmail(ctx, w, rate), id: `CE-2:${w.scac}`, when: 'On award', recipientLabel: `${w.scac} · ${w.name}` })
    }
  }
  return list
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/spotboard/email`
Expected: PASS — all email tests green (emailTheme 2, emailLayout 4, templates 9, alertKind 5, emailContext 5, emailsForQuote 4)

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/spotboard/email/
git commit -m "S138: email context builder + per-quote email list"
```

---

### Task 6: A standalone email gallery at `/spot-emails`

**Deliberately NOT inside the SpotBid tab** (user ruling, 2026-09-02): these emails are a design deliverable for Kathleen and the story writers, not app UI. Putting a preview panel inside OdysseyONE would read to developers as a screen to build. The gallery is a chrome-light showcase route in the same family as `/design-system` and `/button-demo`, driven by a fixture and a scenario switcher so all eight emails are reachable without running a live quote.

**Files:**
- Create: `apps/odyssey-one/src/routes/spot-emails/SpotEmailsRoute.jsx`
- Create: `apps/odyssey-one/src/routes/spot-emails/spotEmails.css`
- Create: `apps/odyssey-one/src/routes/spot-emails/fixture.js`
- Modify: `apps/odyssey-one/src/App.jsx` (add one route beside `/design-system`, ~line 92)
- Test: `apps/odyssey-one/src/routes/spot-emails/SpotEmailsRoute.test.jsx`
- Test: `apps/odyssey-one/src/routes/spot-emails/fixture.test.js`

Do **not** modify `SpotBoardTab.jsx`, `SUB_TABS`, or anything under `src/components/detail/`.

- [ ] **Step 1: Write the failing fixture test**

```js
// apps/odyssey-one/src/routes/spot-emails/fixture.test.js
import { SCENARIOS, emailsForScenario } from './fixture.js'

describe('spot-emails fixture', () => {
  it('offers one scenario per outcome, each with a label', () => {
    expect(SCENARIOS.map((s) => s.key)).toEqual([
      'sent', 'no-bids', 'out-of-tolerance', 'manual-review', 'cancelled', 'no-lce', 'no-distance', 'awarded',
    ])
    expect(SCENARIOS.every((s) => typeof s.label === 'string' && s.label.length > 0)).toBe(true)
  })
  it('sent: RFQs only', () => {
    expect(emailsForScenario('sent').map((e) => e.kind)).toEqual(['CE-1', 'CE-1', 'CE-1'])
  })
  it('each closed scenario adds exactly its own alert', () => {
    const kindOf = (k) => emailsForScenario(k).map((e) => e.kind).filter((x) => x.startsWith('IE'))
    expect(kindOf('no-bids')).toEqual(['IE-1'])
    expect(kindOf('out-of-tolerance')).toEqual(['IE-2'])
    expect(kindOf('manual-review')).toEqual(['IE-3'])
    expect(kindOf('cancelled')).toEqual(['IE-4'])
    expect(kindOf('no-lce')).toEqual(['IE-5'])
    expect(kindOf('no-distance')).toEqual(['IE-6'])
  })
  it('awarded: RFQs plus CE-2 to the winner', () => {
    const list = emailsForScenario('awarded')
    const award = list.find((e) => e.kind === 'CE-2')
    expect(award).toBeTruthy()
    expect(award.to).toContain('@')
  })
  it('every scenario together covers all eight emails', () => {
    const all = new Set(SCENARIOS.flatMap((s) => emailsForScenario(s.key).map((e) => e.kind)))
    expect([...all].sort()).toEqual(['CE-1', 'CE-2', 'IE-1', 'IE-2', 'IE-3', 'IE-4', 'IE-5', 'IE-6'])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/routes/spot-emails/fixture`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write the fixture**

Values mirror Doug's real 2023 sample (Acme Chemical, Charlotte NC → New Orleans LA, one Spartanburg stop-off) so the gallery reads against the artifact stakeholders already know.

```js
// apps/odyssey-one/src/routes/spot-emails/fixture.js
// One seeded quote, eight outcomes. The gallery is a design deliverable, so
// the data mirrors Doug's 2023 sample send (vault quote-model.md §7.1)
// rather than a live shipment — no API, no store, no shipment dependency.
import { emailsForQuote } from '../../spotboard/email/emailsForQuote.js'
import { PLANNING_GROUP_MAILBOX, APP_ORIGIN } from '../../spotboard/email/emailContext.js'

const CARRIERS = [
  { scac: 'CCNI', name: 'Cardinal Freight', email: 'dispatch@cardinalfreight.example.com', incl: true, token: 'demo-ccni',
    bid: { status: 'bid', total: 2925.05, currency: 'CAD' } },
  { scac: 'CNWY', name: 'Conway Transport', email: 'bids@conwaytransport.example.com', incl: true, token: 'demo-cnwy',
    bid: { status: 'bid', total: 3180.00, currency: 'CAD' } },
  { scac: 'SWFT', name: 'Swift Bulk Lines', email: 'quotes@swiftbulk.example.com', incl: true, token: 'demo-swft' },
]

const BASE_CTX = {
  quoteId: '14903',
  reference: 'C11562',
  orderNumber: null,
  shipper: 'Acme Chemical Company',
  from: { name: 'Acme Chemical Plant 1', lines: ['12345 N. Tryon', 'Charlotte NC 28217 US'] },
  to: { name: 'Acme Client Plant2', lines: ['123 Main St', 'New Orleans LA 70114 US'] },
  equipment: 'TL - Truck Load',
  weight: '10,500 lb',
  hazmat: 'No',
  distance: '727 mi',
  pickup: '09/20/2026',
  deliver: '09/25/2026',
  stops: [{ label: '1 - Spartanburg SC 29301 US', date: 'Drop-off: 09/22/2026' }],
  offerExpires: '09/08/2026 11:44 EST',
  sender: PLANNING_GROUP_MAILBOX,
  plannerGroup: PLANNING_GROUP_MAILBOX,
  appOrigin: APP_ORIGIN,
  lowest: {
    carrier: 'CCNI - TL',
    amount: '$2,925.05 CAD',
    shipDate: '09/20/2026',
    deliveryDate: '09/25/2026',
  },
}

// Each scenario says what the quote looks like and which alert it fires.
// `note` is shown in the gallery so a reader knows why this email exists.
export const SCENARIOS = [
  { key: 'sent', label: 'RFQ sent', kinds: ['CE-1'], alertKind: null, awardedScac: null,
    note: 'The planner pressed Send. One Request for Quote per included carrier, each with its own link.' },
  { key: 'no-bids', label: 'Closed — no bids', kinds: ['IE-1'], alertKind: 'IE-1', awardedScac: null, noBids: true,
    note: 'The window closed with nothing submitted. One of the two alerts planners say they see most.' },
  { key: 'out-of-tolerance', label: 'Closed — out of tolerance', kinds: ['IE-2'], alertKind: 'IE-2', awardedScac: null,
    note: 'Bids arrived but the lowest exceeds the ceiling. The other alert planners rely on.' },
  { key: 'manual-review', label: 'Closed — manual review', kinds: ['IE-3'], alertKind: 'IE-3', awardedScac: null,
    note: 'The client is configured to review every overflow quote, tolerant or not.' },
  { key: 'cancelled', label: 'Cancelled — order change', kinds: ['IE-4'], alertKind: 'IE-4', awardedScac: null, noLowest: true,
    note: 'An order change invalidated an open consolidation quote. Its bids must not be processed.' },
  { key: 'no-lce', label: 'Closed — no costed option', kinds: ['IE-5'], alertKind: 'IE-5', awardedScac: null,
    note: 'No routed cost and no fallback rule, so tolerance cannot be evaluated.' },
  { key: 'no-distance', label: 'Closed — no distance', kinds: ['IE-6'], alertKind: 'IE-6', awardedScac: null,
    note: 'No mileage, so even the estimated benchmark cannot be computed.' },
  { key: 'awarded', label: 'Awarded', kinds: ['CE-2'], alertKind: null, awardedScac: 'CCNI',
    note: 'The winner is told their rate was approved. The tender that follows is a separate message.' },
]

export function scenarioFor(key) {
  return SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0]
}

export function emailsForScenario(key) {
  const s = scenarioFor(key)
  const carriers = s.noBids ? CARRIERS.map(({ bid, ...c }) => c) : CARRIERS
  const ctx = { ...BASE_CTX, lowest: s.noBids || s.noLowest ? null : BASE_CTX.lowest }
  return emailsForQuote(ctx, { status: 'closed', carriers }, { alertKind: s.alertKind, awardedScac: s.awardedScac })
}
```

- [ ] **Step 4: Run the fixture test**

Run: `npx vitest run src/routes/spot-emails/fixture`
Expected: PASS (5 tests)

- [ ] **Step 5: Write the failing route test**

```jsx
// apps/odyssey-one/src/routes/spot-emails/SpotEmailsRoute.test.jsx
// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import SpotEmailsRoute from './SpotEmailsRoute.jsx'

afterEach(cleanup)

describe('SpotEmailsRoute', () => {
  it('names itself a reference gallery, not an app screen', () => {
    render(<SpotEmailsRoute />)
    expect(screen.getByRole('heading', { name: /Overflow email set/i })).toBeTruthy()
    expect(screen.getByText(/reference/i)).toBeTruthy()
  })
  it('offers every scenario and previews the first email in a sandboxed iframe', () => {
    render(<SpotEmailsRoute />)
    expect(screen.getByRole('button', { name: /Closed — out of tolerance/ })).toBeTruthy()
    const frame = screen.getByTitle('Email preview')
    expect(frame.getAttribute('sandbox')).toBe('')
    expect(frame.getAttribute('srcdoc')).toContain('Request for Quote')
  })
  it('switching scenario switches the email list', () => {
    render(<SpotEmailsRoute />)
    fireEvent.click(screen.getByRole('button', { name: /Closed — no bids/ }))
    expect(screen.getByText('IE-1')).toBeTruthy()
    expect(screen.getByText(/no carrier bids submitted/)).toBeTruthy()
  })
  it('toggles between the HTML and the plain-text version', () => {
    render(<SpotEmailsRoute />)
    fireEvent.click(screen.getByRole('button', { name: 'Text' }))
    expect(screen.queryByTitle('Email preview')).toBeNull()
    expect(screen.getByText(/Offer Expires:/)).toBeTruthy()
  })
  it('shows the envelope so the sender rule is legible', () => {
    render(<SpotEmailsRoute />)
    expect(screen.getByText(/planning-charlotte@odysseylogistics\.com/)).toBeTruthy()
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/routes/spot-emails/SpotEmailsRoute`
Expected: FAIL — cannot find module

- [ ] **Step 7: Write the route**

```jsx
// apps/odyssey-one/src/routes/spot-emails/SpotEmailsRoute.jsx
// /spot-emails — a REFERENCE GALLERY of the eight overflow emails, kept
// deliberately outside the SpotBid tab (user, 2026-09-02) so nobody reads it
// as a screen to build. Scenario on the left, the emails that scenario
// produces beside it, and the selected one rendered in a SANDBOXED iframe:
// the app's stylesheet cannot reach inside, so what is shown is the exact
// document that would be sent.
import { useState } from 'react'
import { Badge, Button } from '@odyssey/ui'
import { SCENARIOS, scenarioFor, emailsForScenario } from './fixture.js'
import './spotEmails.css'

const KIND_TONE = { 'CE-1': 'info', 'CE-2': 'success', 'IE-1': 'error', 'IE-4': 'error' }

export default function SpotEmailsRoute() {
  const [scenarioKey, setScenarioKey] = useState(SCENARIOS[0].key)
  const [mode, setMode] = useState('html')
  const scenario = scenarioFor(scenarioKey)
  const emails = emailsForScenario(scenarioKey)
  const [selectedId, setSelectedId] = useState(null)
  const selected = emails.find((e) => e.id === selectedId) ?? emails[0]

  const pickScenario = (key) => { setScenarioKey(key); setSelectedId(null) }

  return (
    <div className="spot-emails">
      <header className="spot-emails__header">
        <h1 className="spot-emails__title">Overflow email set</h1>
        <p className="spot-emails__lede">
          A reference for the eight messages overflow bidding sends: two to carriers, six to the planning group.
          Rendered exactly as an inbox would show them, from seeded sample data. Not a screen in OdysseyONE.
        </p>
      </header>

      <div className="spot-emails__body">
        <nav className="spot-emails__scenarios" aria-label="Scenarios">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`spot-emails__scenario${s.key === scenarioKey ? ' spot-emails__scenario--current' : ''}`}
              onClick={() => pickScenario(s.key)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="spot-emails__main">
          <p className="spot-emails__note">{scenario.note}</p>

          <ul className="spot-emails__list" aria-label="Emails in this scenario">
            {emails.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={`spot-emails__row${e.id === selected?.id ? ' spot-emails__row--current' : ''}`}
                  onClick={() => setSelectedId(e.id)}
                >
                  <Badge variant={KIND_TONE[e.kind] ?? 'warning'}>{e.kind}</Badge>
                  <span className="spot-emails__recipient">{e.recipientLabel}</span>
                  <span className="spot-emails__subject">{e.subject}</span>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <section className="spot-emails__pane" aria-label="Selected email">
              <dl className="spot-emails__envelope">
                <dt>From</dt><dd>{selected.from}</dd>
                <dt>To</dt><dd>{selected.to}</dd>
                <dt>Subject</dt><dd>{selected.subject}</dd>
              </dl>
              <div className="spot-emails__toolbar" role="group" aria-label="Preview mode">
                <Button size="sm" variant={mode === 'html' ? 'primary' : 'secondary'} onClick={() => setMode('html')}>HTML</Button>
                <Button size="sm" variant={mode === 'text' ? 'primary' : 'secondary'} onClick={() => setMode('text')}>Text</Button>
              </div>
              {mode === 'html' ? (
                <iframe className="spot-emails__frame" title="Email preview" sandbox="" srcDoc={selected.html} />
              ) : (
                <pre className="spot-emails__text">{selected.text}</pre>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
```

Confirm `Badge` and `Button` prop names against `packages/ui/src/Badge.jsx` and `Button.jsx` and conform to their real API — no escape hatches, no `className` overrides on them.

```css
/* apps/odyssey-one/src/routes/spot-emails/spotEmails.css */
.spot-emails { max-width: 1200px; margin: 0 auto; padding: var(--space-6) var(--space-5); color: var(--text-primary); }
.spot-emails__header { margin-bottom: var(--space-5); }
.spot-emails__title { margin: 0 0 var(--space-2) 0; font-size: var(--font-size-2xl); font-weight: 600; }
.spot-emails__lede { margin: 0; max-width: 68ch; color: var(--text-secondary); font-size: var(--font-size-sm); line-height: 1.5; }
.spot-emails__body { display: grid; grid-template-columns: minmax(190px, 220px) 1fr; gap: var(--space-5); align-items: start; }
.spot-emails__scenarios { display: flex; flex-direction: column; gap: var(--space-1); position: sticky; top: var(--space-4); }
.spot-emails__scenario { text-align: left; padding: var(--space-2) var(--space-3); background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); font: inherit; font-size: var(--font-size-sm); color: var(--text-secondary); cursor: pointer; }
.spot-emails__scenario:hover { background: var(--bg-secondary); }
.spot-emails__scenario--current { background: var(--bg-secondary); border-color: var(--border-subtle); color: var(--text-primary); font-weight: 600; }
.spot-emails__main { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
.spot-emails__note { margin: 0; color: var(--text-secondary); font-size: var(--font-size-sm); }
.spot-emails__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.spot-emails__row { display: flex; align-items: center; gap: var(--space-2); width: 100%; padding: var(--space-2) var(--space-3); text-align: left; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font: inherit; color: var(--text-primary); cursor: pointer; }
.spot-emails__row:hover { background: var(--bg-secondary); }
.spot-emails__row--current { border-color: var(--text-link); background: var(--bg-secondary); }
.spot-emails__recipient { white-space: nowrap; font-weight: 600; font-size: var(--font-size-sm); }
.spot-emails__subject { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-tertiary); font-size: var(--font-size-sm); }
.spot-emails__pane { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.spot-emails__envelope { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-1) var(--space-3); margin: 0; font-size: var(--font-size-sm); }
.spot-emails__envelope dt { color: var(--text-tertiary); }
.spot-emails__envelope dd { margin: 0; overflow-wrap: anywhere; }
.spot-emails__toolbar { display: flex; gap: var(--space-2); }
.spot-emails__frame { width: 100%; height: 760px; border: 1px solid var(--border-subtle); background: var(--bg-primary); }
.spot-emails__text { margin: 0; padding: var(--space-3); border: 1px solid var(--border-subtle); background: var(--bg-primary); font-family: var(--font-mono, monospace); font-size: var(--font-size-sm); white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 900px) { .spot-emails__body { grid-template-columns: 1fr; } .spot-emails__scenarios { position: static; flex-direction: row; flex-wrap: wrap; } }
```

Verify every token used here exists in `packages/tokens/tokens.css` (`--space-1…6`, `--radius-sm`, `--font-size-sm/2xl`, `--font-mono`). Replace any that does not with the nearest existing token; never a raw value.

- [ ] **Step 8: Add the route**

In `apps/odyssey-one/src/App.jsx`, beside the other showcase routes (after `/design-system`, ~line 92):

```jsx
import SpotEmailsRoute from './routes/spot-emails/SpotEmailsRoute.jsx'
```

```jsx
        <Route path="/spot-emails" element={<SpotEmailsRoute />} />
```

- [ ] **Step 9: Run the tests**

Run: `npx vitest run src/routes/spot-emails`
Expected: PASS (fixture 5 + route 5)

Then the full suite: `npx vitest run`
Expected: all green, ≥ 2,162 plus the new tests. `SpotBoardTab` must be untouched and its tests unchanged.

- [ ] **Step 10: Commit**

```bash
git add apps/odyssey-one/src/routes/spot-emails/ apps/odyssey-one/src/App.jsx
git commit -m "S138: /spot-emails — standalone reference gallery for the eight overflow emails"
```

---

### Task 7: Browser verification and real-client check

**Files:** none new. Produces screenshots in the scratchpad.

- [ ] **Step 1: Walk the gallery in a real browser**

```bash
npm run dev:odyssey-one
```

Open `http://localhost:5173/spot-emails` (use whatever port Vite prints) and check every scenario:

1. **RFQ sent** — three `CE-1` rows, one per carrier. The preview shows the dark header with the Odyssey One logo, "Request for Quote", the expiry notice, the data sheet, a solid blue "Submit your quote" button, and the footer. Each row's link ends in that carrier's own token.
2. **Closed — no bids** and **out of tolerance** — the two alerts planners actually see. Subjects must match `vault/10-domains/spotboard/data/quote-model.md` §7.1 character for character, including the double space in the manual-review subject.
3. **Cancelled — order change** — the consolidation warning body, no bid block.
4. **Awarded** — "Great news!…" to Cardinal Freight only.
5. **Text** toggle on each: the plain version, readable on its own, same lines as the HTML.

Screenshot each scenario into the scratchpad directory with playwright-core (the S137 pattern) or the OS tool.

- [ ] **Step 2: Real email client check (manual, outside the repo)**

From the browser devtools, copy the iframe's `srcdoc` for `CE-1`, `IE-2` and `CE-2`. Send each to an Outlook desktop, Outlook web, Gmail and iPhone Mail inbox, or paste into Litmus / Email on Acid. Confirm the hosted logo renders, the 600px card holds, the button is a solid block, and no font substitutes badly. Any Outlook-only fix (usually `mso-` conditional table widths) goes back into `emailLayout.js`, and Task 2's tests re-run.

- [ ] **Step 3: Deploy (only with the user's explicit go for THIS deploy)**

```bash
/opt/homebrew/bin/vercel --prod
curl -s -o /dev/null -w '%{http_code}
' https://odyssey-one-stage.vercel.app/email/odyssey-one-logo.png   # expect 200
curl -s https://odyssey-one-stage.vercel.app/ | grep -o 'assets/index-[^"]*\.js' | head -1 \
  | xargs -I{} sh -c 'curl -s https://odyssey-one-stage.vercel.app/{} | grep -c "Request for Quote to"'    # expect >= 1
```

Verify by grepping the LIVE bundle, never by comparing asset hashes.

---

## Self-review

- **Spec coverage.** Plain-text first ✔ (every template writes `text` before `html`). Light Outlook-safe HTML ✔ (Task 2 constraints + tests forbid `var(--`, flex/grid, radius). Colors and look ✔ (Task 1 theme mirrors tokens; dark header like the app shell). Logo ✔ (hosted PNG, Task 1). Eight emails ✔ (Task 3). Sender/recipient per SPB-77 ✔ (Task 5). Preview identical to the sent HTML ✔ (sandboxed `srcdoc`, Task 6), on its own URL outside the app surfaces (user ruling). Not built: the seventh "fuel uncalculable" planner notice (uncatalogued — YAGNI until Kathleen names it) and single-load IE-4 (unevidenced).
- **Placeholders.** None; two "check the real API" instructions in Tasks 5–6 are verification steps with the fallback stated.
- **Type consistency.** `ctx` shape is identical in Tasks 3, 5, 6; `alertKindFor` args match Task 6's call; `emailsForQuote(ctx, quote, { alertKind, awardedScac })` matches its test and its call; email objects carry `id, kind, subject, from, to, text, html, when, recipientLabel` everywhere the panel reads them.
