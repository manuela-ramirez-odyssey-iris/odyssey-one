import ModalHeader from './ModalHeader.jsx'
import useEscapeStack from './useEscapeStack.js'

/**
 * ModalMedium — organism shell. Content-sized reusable modal (width auto, 350–780px,
 * height auto capped at 90vh — content slot scrolls past the cap) with a header (title + close X),
 * content slot (children), and footer slot. ESC + overlay-click dismiss; dialog click
 * does not propagate. No subtitle (unlike ModalLarge).
 *
 * Mirrors Figma component `ModalMedium` at 2032:915 — an instance of `ModalHeader`
 * (node 3447:7661), the same molecule composed by RightPanel. Content / Footer SLOT
 * properties map to React children / footer props respectively.
 *
 * `scrollableContent` — implementation-only flag (not in Figma): set true when the
 * content slot contains its own vertically-scrolling region. Removes the default
 * 20px bottom padding so the scroller runs flush against the footer divider.
 *
 * `onBack` — optional leading back control (chevron-left, lg), passed straight through
 * to ModalHeader. Used when a modal hosts a navigation flow between views rather than
 * a single view. `ariaLabel` names the DIALOG (outer `role="dialog"` element) — it is
 * deliberately not forwarded to ModalHeader, which would apply it to the `<header>`
 * landmark instead and produce a second, redundant accessible name.
 */
export default function ModalMedium({
  title,
  onClose,
  onBack,
  children,
  footer,
  scrollableContent = false,
  className = '',
  ariaLabel,
}) {
  useEscapeStack(onClose)

  return (
    <div className="modal-medium-overlay" onClick={onClose}>
      <div
        className={`modal-medium ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title={title}
          onBack={onBack}
          onClose={onClose}
          className="modal-medium__header"
        />
        <div className={`modal-medium__content${scrollableContent ? ' modal-medium__content--scroll' : ''}`}>
          {children}
        </div>
        {footer && <footer className="modal-medium__footer">{footer}</footer>}
      </div>
    </div>
  )
}
