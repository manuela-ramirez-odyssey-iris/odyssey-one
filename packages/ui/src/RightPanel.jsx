import { useEffect, useRef } from 'react'
import ModalHeader from './ModalHeader.jsx'
import ModalFooter from './ModalFooter.jsx'

/**
 * RightPanel — organism shell: a right-side drawer / panel card. Composes ModalHeader for its
 * header band and owns the rest of the chrome (content slot + veil, optional footer, the
 * slide-in-from-right animation, and outside-click dismissal).
 *
 * Render modes:
 *  - `open` omitted  → a static card (drop it wherever; the consumer owns visibility).
 *  - `open` boolean  → an animated right-dock drawer: a flex child that reserves its width
 *    and slides the card in/out from the window's right edge. Clip the off-screen slide at
 *    an app-level ancestor (`overflow:hidden`) to avoid a horizontal scrollbar.
 *
 * Header (delegated to ModalHeader): back (`onBack`) · title + editable name (`editableTitle`
 * / `editingTitle` / `onTitle*`) · subtitle · close (`onClose`). RightPanel wraps `onClose`
 * so closing cancels an in-progress title edit first, and veils the content while editing.
 *
 * Footer (mirrors the Figma `Footer` BOOLEAN → a baked ModalFooter, NOT a content slot):
 *  - `footer` (boolean) toggles the built-in footer = Cancel (secondary, md) + Save
 *    (primary, md), space-between. Handlers `onCancel` / `onSave`; labels `cancelLabel` /
 *    `saveLabel`. Separate from the content `Slot` (children).
 *
 * `closeOnOutsideClick` (opt-in): a mousedown outside the panel calls `onClose` (cancelling
 * any title edit first). Inactive while the drawer is closed.
 *
 * Mirrors Figma `RightPanel` (3449:10701): ModalHeader + Slot → children + Footer BOOLEAN.
 */
export default function RightPanel({
  open,
  title,
  subtitle,
  editableTitle = false,
  editingTitle = false,
  onEditTitle,
  onTitleChange,
  onTitleCommit,
  onTitleCancel,
  onBack,
  onClose,
  closeOnOutsideClick = false,
  footer = false,
  onCancel,
  onSave,
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  children,
  className = '',
  ariaLabel,
}) {
  const panelRef = useRef(null)

  // Closing the panel while editing cancels the edit (mirrors the X button). Catches a
  // programmatic drawer close (open → false) that didn't go through handleClose.
  useEffect(() => {
    if (open === false && editingTitle) onTitleCancel?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Close cancels an in-progress title edit, then dismisses.
  const handleClose = () => {
    if (editingTitle) onTitleCancel?.()
    onClose?.()
  }

  // Opt-in: a mousedown outside the panel dismisses it (a drawer convenience). Inactive when
  // the drawer is closed (`open === false`). The effect (re)attaches only once the panel is
  // shown, so the click that opened it doesn't immediately close it.
  useEffect(() => {
    if (!closeOnOutsideClick || !onClose || open === false) return
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) handleClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeOnOutsideClick, open, editingTitle])

  const label = ariaLabel || (typeof title === 'string' ? title : undefined)

  const panel = (
    <section ref={panelRef} className={`right-panel ${className}`.trim()} aria-label={label}>
      <ModalHeader
        title={title}
        subtitle={subtitle}
        editableTitle={editableTitle}
        editingTitle={editingTitle}
        onEditTitle={onEditTitle}
        onTitleChange={onTitleChange}
        onTitleCommit={onTitleCommit}
        onTitleCancel={onTitleCancel}
        onBack={onBack}
        onClose={handleClose}
      />

      <div className="right-panel__content">
        {children}
        {/* While editing the title, veil the content — a cue that focus lives in the header,
            and it blocks content interaction until the edit is committed/cancelled. */}
        {editingTitle && <div className="right-panel__content-veil" aria-hidden="true" />}
      </div>

      {footer && (
        <ModalFooter
          type="confirm"
          className="right-panel__footer"
          cancelLabel={cancelLabel}
          saveLabel={saveLabel}
          onCancel={onCancel}
          onSave={onSave}
        />
      )}
    </section>
  )

  // Static card mode (no `open` prop) — consumer owns placement / visibility.
  if (typeof open !== 'boolean') return panel

  // Drawer mode — the shell owns the right-dock slide-in.
  return (
    <div className={`right-panel-dock${open ? ' right-panel-dock--open' : ''}`} aria-hidden={!open}>
      {panel}
    </div>
  )
}
