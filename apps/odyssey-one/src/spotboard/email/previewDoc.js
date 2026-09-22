// S157 — email previews (TenderEmailPreview, EmailGallery) render the sent
// HTML in a sandboxed iframe so the CTA's landing page opens in the real
// tab instead of navigating (or being blocked) inside the tiny sandbox.
// `emailLayout.js`'s `renderHtml` output itself must NOT carry a <base> —
// that's the real sent email, read by tools/export-emails.mjs — so the tag
// is injected only here, in the preview path.
const BASE_TAG = '<base target="_blank">'

export function previewDoc(html) {
  const headIndex = html.indexOf('<head>')
  if (headIndex === -1) return html
  if (html.includes(BASE_TAG)) return html
  const insertAt = headIndex + '<head>'.length
  return html.slice(0, insertAt) + BASE_TAG + html.slice(insertAt)
}
