/**
 * Field popovers rendered inside a search panel are DOM-outside it.
 *
 * Every one of them portals to `document.body` — `useAnchoredPortal` for the
 * Dropdown and the DatePicker calendar (its wrapper carries `data-placement`),
 * and ComboBox's own `createPortal` for the typeahead list (the card is
 * `.field-search-results`). To the user they are visually inside the panel, but
 * a host's outside-click listener tests raw DOM position
 * (`wrapperRef.contains(e.target)`), so a mousedown on an option reads as an
 * outside click: the panel closes and unmounts the popover BEFORE the option's
 * own click handler runs — the pick silently does nothing.
 *
 * This is the third appearance of the class: GS-24 hit it with the Saved-tab ⋮
 * menu (fixed by portaling into the panel instead), and the Orders host carried
 * a local copy of this selector. Both search hosts now share this one predicate,
 * so a new popover-bearing field is covered in both without a third copy.
 *
 * Not a `contains()` check on some popover ref: hosts have no handle on a
 * popover a library component owns privately. The marker attributes are what
 * those components already render.
 */
export const FIELD_POPOVER_SELECTOR = '[data-placement], .field-search-results'

/** True when a click landed inside a body-portalled field popover. */
export function inFieldPopover(target) {
  return !!target?.closest?.(FIELD_POPOVER_SELECTOR)
}
