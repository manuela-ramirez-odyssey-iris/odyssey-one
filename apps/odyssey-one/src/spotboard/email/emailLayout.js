// apps/odyssey-one/src/spotboard/email/emailLayout.js
// Plain-text-first email layout with a LIGHT HTML layer that Outlook's Word
// engine renders faithfully: one 600px table, inline styles, hex colors from
// emailTheme, hosted PNG logo, no flex/grid/var()/border-radius/web fonts.
// Centering is done the Outlook-safe way: align="center" on td/table PLUS a
// matching text-align:center inline style, never CSS margin:auto alone.
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
// A td whose only job is centering an inner table — align= for Outlook, the
// inline style so every other client agrees.
const centerCell = (inner, style = '') =>
  `<td align="center" style="${FONT}text-align:center;${style}">${inner}</td>`

function routeLabel(a) {
  const lines = a?.lines ?? []
  return lines[lines.length - 1] || a?.name || ''
}

export const blocks = {
  headline: (text) => row(centerCell(
    esc(text), `font-size:22px;line-height:28px;font-weight:bold;color:${C.text};padding:4px 0 16px 0;`)),
  // Short uppercase kicker, centered, sits right under the header band.
  eyebrow: (text) => row(centerCell(
    esc(text), `font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${C.textTertiary};padding:0 0 8px 0;`)),
  paragraph: (text) => row(centerCell(
    esc(text), `font-size:14px;line-height:20px;color:${C.textSecondary};padding:0 0 16px 0;`)),
  // [[label, value], …] — plain list, kept for templates that don't want a grid.
  fields: (pairs) => row(cell(
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">` +
    pairs.filter(([, v]) => v != null && v !== '').map(([k, v]) => row(
      cell(esc(k), `font-size:13px;color:${C.textTertiary};padding:3px 12px 3px 0;white-space:nowrap;vertical-align:top;`) +
      cell(esc(v), `font-size:13px;color:${C.text};padding:3px 0;vertical-align:top;`),
    )).join('') +
    `</table>`, 'padding:0 0 16px 0;')),
  // [[label, value], …] — facts grid, `columns` per row (default 2),
  // `align` 'center' (default) or 'left', label above value.
  // `gapBottom` trims the trailing padding when this grid is immediately
  // followed by another factGrid, so the pair reads as one stacked block.
  factGrid: (pairs, { columns = 2, align = 'center', gapBottom = 16, padTop = 8 } = {}) => {
    const clean = pairs.filter(([, v]) => v != null && v !== '')
    const pct = Math.floor(100 / columns)
    const a = align === 'left' ? 'left' : 'center'
    const fact = ([k, v], span = 1) => `<td width="${span > 1 ? pct * span : pct}%" ${span > 1 ? `colspan="${span}" ` : ''}align="${a}" valign="top" style="${FONT}text-align:${a};padding:${padTop}px 10px 8px 10px;">` +
      `<div style="font-size:11px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;color:${C.textTertiary};padding:0 0 3px 0;">${esc(k)}</div>` +
      `<div style="font-size:15px;color:${C.text};">${esc(v)}</div></td>`
    const rows = []
    for (let i = 0; i < clean.length; i += columns) {
      const group = clean.slice(i, i + columns)
      const short = columns - group.length
      rows.push(row(group.map((p, idx) => fact(p, idx === group.length - 1 ? 1 + short : 1)).join('')))
    }
    return row(cell(
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows.join('')}</table>`,
      `padding:0 0 ${gapBottom}px 0;`))
  },
  // groups: [[label,value], …][] — one array of pairs per column, each
  // column stacked vertically (label above value, pair after pair) rather
  // than laid out as a row. Columns split the available width evenly; a
  // group left empty (e.g. no bid data yet) is dropped so a lone remaining
  // group renders full width instead of half-empty.
  columnStack: (groups, { gapBottom = 16 } = {}) => {
    const active = groups.map((g) => g.filter(([, v]) => v != null && v !== '')).filter((g) => g.length)
    if (!active.length) return ''
    const pct = Math.floor(100 / active.length)
    const stackCell = (pairs) => `<td width="${pct}%" align="left" valign="top" style="${FONT}text-align:left;padding:8px 10px;">` +
      pairs.map(([k, v], idx) => `<div style="padding:0 0 ${idx === pairs.length - 1 ? 0 : 8}px 0;">` +
        `<div style="font-size:11px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;color:${C.textTertiary};padding:0 0 3px 0;">${esc(k)}</div>` +
        `<div style="font-size:15px;color:${C.text};">${esc(v)}</div></div>`).join('') +
      `</td>`
    return row(cell(
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${row(active.map(stackCell).join(''))}</table>`,
      `padding:0 0 ${gapBottom}px 0;`))
  },
  // Origin → destination as a centered, tinted band read at a glance.
  route: (from, to) => row(cell(
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.pageBg};border:1px solid ${C.border};">` +
    row(
      `<td width="45%" align="center" style="${FONT}text-align:center;font-size:15px;font-weight:bold;color:${C.text};padding:12px 8px;">${esc(routeLabel(from))}</td>` +
      `<td width="10%" align="center" style="${FONT}text-align:center;font-size:16px;color:${C.textTertiary};padding:12px 0;">&rarr;</td>` +
      `<td width="45%" align="center" style="${FONT}text-align:center;font-size:15px;font-weight:bold;color:${C.text};padding:12px 8px;">${esc(routeLabel(to))}</td>`,
    ) +
    `</table>`,
    'padding:0 0 16px 0;')),
  // Address block: label + lines, centered under the route band.
  address: (label, lines) => row(centerCell(
    `<div style="font-size:12px;font-weight:bold;letter-spacing:0.4px;text-transform:uppercase;color:${C.textTertiary};padding-bottom:3px;">${esc(label)}</div>` +
    lines.filter(Boolean).map((l) => `<div style="font-size:13px;line-height:18px;color:${C.text};">${esc(l)}</div>`).join(''),
    'padding:0 0 12px 0;')),
  // Ship From / Ship To side by side, one column each. `footLabels` is an
  // optional [fromLabel, fromValue, toLabel, toValue] second row aligned to
  // the same two columns (e.g. Pickup under Ship From, Deliver under Ship To).
  // `gapBottom` (default 16) trims the trailing padding when a block right
  // after this one belongs to the same visual group (e.g. Distance under
  // Pickup/Deliver) rather than starting a new section.
  // A hairline vertical rule always separates Ship From/Ship To. Outlook-safe
  // technique: border-left on the RIGHT-hand td of both the address row and
  // the foot row, so the rule runs the full height of the block instead of
  // stopping between rows.
  addressPair: (fromLabel, fromLines, toLabel, toLines, footLabels, { gapBottom = 16 } = {}) => {
    const dividerStyle = `border-left:1px solid ${C.border};`
    const addrCell = (label, lines, right = false) => `<td width="50%" align="center" valign="top" style="${FONT}text-align:center;padding:0 10px 12px 10px;${right ? dividerStyle : ''}">` +
      `<div style="font-size:12px;font-weight:bold;letter-spacing:0.4px;text-transform:uppercase;color:${C.textTertiary};padding-bottom:3px;">${esc(label)}</div>` +
      lines.filter(Boolean).map((l) => `<div style="font-size:13px;line-height:18px;color:${C.text};">${esc(l)}</div>`).join('') +
      `</td>`
    const footCell = (label, value, right = false) => `<td width="50%" align="center" valign="top" style="${FONT}text-align:center;padding:0 10px 8px 10px;${right ? dividerStyle : ''}">` +
      `<div style="font-size:11px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;color:${C.textTertiary};padding:0 0 3px 0;">${esc(label)}</div>` +
      `<div style="font-size:15px;color:${C.text};">${esc(value)}</div></td>`
    const rows = [row(addrCell(fromLabel, fromLines) + addrCell(toLabel, toLines, true))]
    if (footLabels) {
      const [fLabel, fValue, tLabel, tValue] = footLabels
      rows.push(row(footCell(fLabel, fValue) + footCell(tLabel, tValue, true)))
    }
    return row(cell(
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows.join('')}</table>`,
      `padding:0 0 ${gapBottom}px 0;`))
  },
  button: (label, href) => row(cell(
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">` +
    row(centerCell(
      `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr>` +
      `<td align="center" style="${FONT}background:${C.ctaBg};padding:14px 32px;">` +
      `<a href="${esc(href)}" style="${FONT}font-size:14px;font-weight:bold;color:${C.ctaText};text-decoration:none;display:inline-block;">${esc(label)}</a>` +
      `</td></tr></table>`,
    )) +
    `</table>` +
    `<div style="${FONT}font-size:12px;color:${C.textTertiary};text-align:center;padding-top:10px;">If the button does not work, copy this link: <a href="${esc(href)}" style="color:${C.link};">${esc(href)}</a></div>`,
    'padding:8px 0 20px 0;')),
  // tone: 'warning' | 'error' | 'success' | 'info'
  // ponytail: nested table built directly (not via string surgery on
  // headline/paragraph output) — a naive replace('<tr>'/</tr>') on a
  // one-row string leaves the inner <table> holding a bare <td> with no
  // wrapping <tr>, which is invalid HTML.
  notice: (text, tone = 'info') => {
    const bg = { warning: C.warningBg, error: C.errorBg, success: C.successBg, info: C.pageBg }[tone]
    const fg = { warning: C.warningText, error: C.errorText, success: C.successText, info: C.textSecondary }[tone]
    return row(cell(
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">` +
      row(cell(esc(text), `font-size:13px;line-height:18px;text-align:center;color:${fg};background:${bg};border:1px solid ${C.border};padding:12px 16px;`)) +
      `</table>`,
      'padding:0 0 16px 0;'))
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
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${THEME.width}" style="width:${THEME.width}px;max-width:100%;background:${C.cardBg};border:1px solid ${C.border};">
<tr><td align="center" style="background:${C.headerBg};padding:28px 24px;text-align:center;">
<img src="${THEME.logoUrl}" width="172" height="24" alt="${esc(THEME.logoAlt)}" style="display:inline-block;border:0;" />
</td></tr>
<tr><td style="padding:32px 32px 8px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${body.join('\n')}
</table>
</td></tr>
<tr><td style="${FONT}font-size:11px;line-height:16px;text-align:center;color:${C.textTertiary};border-top:1px solid ${C.border};padding:20px 24px;">
Odyssey Logistics &amp; Technology Corporation &middot; 4235 South Stream Blvd, STE 300, Charlotte NC 28217 &middot; 1-888-352-4409<br />
This is a transactional message about a shipment you are configured to receive quotes for. It contains confidential information for the intended recipient only.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
