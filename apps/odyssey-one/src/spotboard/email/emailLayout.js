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
  // ponytail: nested table built directly (not via string surgery on
  // headline/paragraph output) — a naive replace('<tr>'/</tr>') on a
  // one-row string leaves the inner <table> holding a bare <td> with no
  // wrapping <tr>, which is invalid HTML.
  notice: (text, tone = 'info') => {
    const bg = { warning: C.warningBg, error: C.errorBg, success: C.successBg, info: C.pageBg }[tone]
    const fg = { warning: C.warningText, error: C.errorText, success: C.successText, info: C.textSecondary }[tone]
    return row(cell(
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">` +
      row(cell(esc(text), `font-size:13px;line-height:18px;color:${fg};background:${bg};border:1px solid ${C.border};padding:10px 12px;`)) +
      `</table>`,
      'padding:0 0 12px 0;'))
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
