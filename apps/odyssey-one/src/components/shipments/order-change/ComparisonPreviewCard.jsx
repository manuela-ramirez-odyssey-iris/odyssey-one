import { SubAccordion } from '@odyssey/ui'

/**
 * ComparisonPreviewCard — shared shell for the "Additional Changes Preview"
 * sections on the Review Order Change screen (LINX-14510/14511): Preview
 * Tender List and Preview Tender Details. Each is read-only and shares one
 * visual pattern — title + difference count + collapse chevron — so the
 * chrome lives here once and each section owns only its own body.
 *
 * Built ON SubAccordion (@odyssey/ui) rather than reimplementing "collapsible
 * white card with a title + chevron" — that is exactly what SubAccordion
 * already is (card radius/shadow/padding, aria-expanded toggle, animated
 * reveal).
 *
 * S137 (Jana/designer): the sub-header row is GONE — the clickable
 * "Differences:" filter chips AND the List/Table ButtonToggle both removed.
 * Every section renders its list form only, unfiltered. What survives is the
 * one thing the row was really for: the difference COUNT, which already rode
 * the title as a purple "(N)" since S135 and now also states "(No
 * Differences)" there when nothing changed (previously a sub-header line).
 * With no mode/filter left to thread, `children` is a plain node again rather
 * than a render prop.
 *
 * @param title        string — card title, also the collapse button's a11y name
 * @param differences  string[] — the changed fields; only their COUNT is shown
 * @param defaultExpanded bool (default true) — Preview Tender List lands open
 *                     (it's the decision context); Tender Details lands
 *                     COLLAPSED (designer, S135 — matching Jana's own
 *                     walkthrough of the deck: "this is how the screen will
 *                     look like when the user comes, so it will be collapsed…
 *                     they can click and expand and see what it is").
 */
export default function ComparisonPreviewCard({ title, differences = [], defaultExpanded = true, children }) {
  const count = differences.length
  const heading = (
    <>
      {title}{' '}
      <span className={`comparison-preview__title-count${count ? '' : ' comparison-preview__title-count--none'}`}>
        {count ? `(${count})` : '(No Differences)'}
      </span>
    </>
  )

  return (
    <SubAccordion title={heading} showIcon={false} defaultExpanded={defaultExpanded}>
      <div className="comparison-preview__body">{children}</div>
    </SubAccordion>
  )
}
