/**
 * HeaderStrip — molecule. A 48px band: leading icon + bold title, trailing slot.
 *
 * Extracted from GroupTable's `header` prop (2026-08-28) so any surface that
 * needs the same band can compose it directly.
 *
 * Figma sources (two, reconciled — see below):
 * 1. GroupTable master `4183:773` "Header" frame (Design System - MCP): the
 *    48px band, `--bg-secondary`, 1px `--border-subtle` bottom hairline,
 *    leading icon + `label/base semibold` title + trailing slot, padding
 *    `--spacing-3` (block) / `--spacing-4` (inline). THIS is the padding
 *    used here.
 * 2. Standalone `TableSubheader` (Shipments file, node 1943:11132): same
 *    tint + hairline, title-only (no icon/trail), padding 12px top / 8px
 *    bottom / 16px sides — an asymmetric block padding that does NOT match
 *    source 1's even `--spacing-3`. FLAGGED DEVIATION, not silently
 *    averaged: source 1 is canon here because GroupTable (icon + trail) is
 *    the composing consumer; if a title-only 12/8 caller shows up, it needs
 *    its own override, not a change to this default.
 *
 * Source 2 also has a right border and the title truncates
 * (nowrap/ellipsis/overflow-hidden) — the truncation treatment IS applied
 * here (title is free text and must not break the band's height), but the
 * right border is NOT baked in: it exists there because the strip sits in a
 * grid cell, which is a layout fact of that context, not of this component.
 * Add it via `className` where needed.
 */
export default function HeaderStrip({
  title,
  icon,
  trail,
  // Lets an ancestor (e.g. GroupTable) put the `aria-labelledby` id on the
  // TITLE element itself rather than the root — the id needs to reach the
  // text node the table is labelled by, not the band around it.
  titleId,
  className = '',
  ...rest
}) {
  return (
    <div className={`header-strip${className ? ` ${className}` : ''}`} {...rest}>
      {icon}
      <span id={titleId} className="header-strip__title text-label-base-semibold">
        {title}
      </span>
      {trail != null && <span className="header-strip__trail">{trail}</span>}
    </div>
  )
}
