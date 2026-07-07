import { Bookmark, Plus } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import Button from './Button.jsx'

/**
 * ModalFooter — molecule: the footer bar of a modal / panel shell. Three types (mirrors the
 * Figma `Type` variant on 3170:3649), each composed from the Button atom:
 *
 *  - `confirm` (ModalFooter1): Cancel (secondary, left) + Save (primary, right). Pass
 *    `tertiaryLabel` to add a "Clear all" (secondary) beside Save. RightPanel's footer.
 *  - `filters` (ModalFooter2): a "Save Filters" ButtonLink (bookmark) on the left + Clear all
 *    (secondary) + a primary results button on the right.
 *  - `link` (ModalFooter3): helper text on the left + an action ButtonLink (plus) on the right.
 *
 * API is just the `type` variant + the label text (and a click handler per action). Cancel /
 * Save / Clear / results are `Button`; the two link rows are `Button variant="link"` + icon.
 */
export default function ModalFooter({
  type = 'confirm',

  // confirm (ModalFooter1)
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  saveDisabled = false,
  onCancel,
  onSave,
  tertiaryLabel, // optional — pass it to show the "Clear all" button
  onTertiary,

  // filters (ModalFooter2)
  saveFiltersLabel = 'Save Filters',
  onSaveFilters,
  clearLabel = 'Clear all',
  onClear,
  resultsLabel = 'Show results',
  onResults,

  // link (ModalFooter3)
  text = "Don't see your address?",
  linkLabel = 'Add manually',
  onLink,

  className = '',
}) {
  const cls = `modal-footer modal-footer--${type} ${className}`.trim()

  if (type === 'filters') {
    return (
      <footer className={cls}>
        <Button variant="link" icon={<Bookmark {...ICON_LG} aria-hidden="true" />} onClick={onSaveFilters}>
          {saveFiltersLabel}
        </Button>
        <div className="modal-footer__group">
          <Button variant="secondary" size="md" onClick={onClear}>{clearLabel}</Button>
          <Button variant="primary" size="md" onClick={onResults}>{resultsLabel}</Button>
        </div>
      </footer>
    )
  }

  if (type === 'link') {
    return (
      <footer className={cls}>
        <span className="modal-footer__text">{text}</span>
        <Button variant="link" icon={<Plus {...ICON_LG} aria-hidden="true" />} onClick={onLink}>
          {linkLabel}
        </Button>
      </footer>
    )
  }

  // confirm (ModalFooter1) — default
  return (
    <footer className={cls}>
      <Button variant="secondary" size="md" onClick={onCancel}>{cancelLabel}</Button>
      <div className="modal-footer__group">
        {tertiaryLabel && <Button variant="secondary" size="md" onClick={onTertiary}>{tertiaryLabel}</Button>}
        <Button variant="primary" size="md" disabled={saveDisabled} onClick={onSave}>{saveLabel}</Button>
      </div>
    </footer>
  )
}
