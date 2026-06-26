import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * PaginationButton — atom. A single segment of the Paginator molecule's joined
 * bar: `[ ‹ ][ 1 ][ 2 ]…[ › ]`. Segments share a right divider; the arrow
 * end-caps round the outer corners (prev = left cap, next = right cap, page =
 * square middle), so the Paginator just rows them.
 *
 * Three kinds (`variant`):
 *   - `page` — a numbered page button. `current` toggles the active look
 *     (Figma "Primary": DSN/900 fill + white text) vs inactive (Figma
 *     "Secondary": white fill + DSN/700 text). `aria-current="page"` when active.
 *   - `prev` — previous-page arrow (lucide chevron-left, Figma "Icon Left").
 *   - `next` — next-page arrow (lucide chevron-right, Figma "Icon Right").
 *
 * Color ladders mirror Button (primary/secondary) via the same DSN tokens.
 * Hover/pressed are CSS-driven (`:hover` / `:active`); `current` + native
 * `disabled` are the only props that change appearance. Icon-only variants
 * default a sensible `aria-label` (override via props).
 *
 * Figma: `PaginationButton` set `3234:3857` (Components-Atoms).
 */
export default function PaginationButton({
  variant = 'page',
  current = false,
  children,
  className = '',
  ...rest
}) {
  const isCurrent = variant === 'page' && current
  const cls = [
    'pagination-btn',
    `pagination-btn--${variant}`,
    isCurrent ? 'is-current' : '',
    className,
  ].filter(Boolean).join(' ')

  const defaultLabel =
    variant === 'prev' ? 'Previous page' : variant === 'next' ? 'Next page' : undefined

  return (
    <button
      type="button"
      className={cls}
      aria-current={isCurrent ? 'page' : undefined}
      aria-label={defaultLabel}
      {...rest}
    >
      {variant === 'prev' && <ChevronLeft size={20} aria-hidden="true" />}
      {variant === 'page' && children}
      {variant === 'next' && <ChevronRight size={20} aria-hidden="true" />}
    </button>
  )
}
