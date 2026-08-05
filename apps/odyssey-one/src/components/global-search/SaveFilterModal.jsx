import { useState } from 'react'
import { ModalMedium, FormField, SearchChip, Button } from '@odyssey/ui'

/**
 * SaveFilterModal — S108 Phase 1b. Figma "New Saved Filter Confirmation"
 * (`1079:31179`); copy per vault canon (`20-cross-cutting/global-search/
 * global-search.md#Save Filter modal`): header "Save Filter", "Filter Title"
 * input, "Selected Filters" token list, footer Cancel / Save.
 *
 * Hosted as a SIBLING of `.shipments-results-panel` inside
 * `.shipments-global-search` (see ShipmentsGlobalSearch.jsx) — that panel has
 * `transform: translateX(-50%)`, which makes it the containing block for any
 * `position: fixed` descendant, trapping ModalMedium's overlay under the
 * panel's `z-index: 49` instead of covering the viewport (spec "Hosting").
 *
 * `chips` is the host's `barChips` (committed chips + the free-text/set query
 * badge folded in, S108 spec "Behaviour" 1) — reused as-is rather than
 * re-derived, since excluding the free-text chip would silently save nothing
 * for a pasted multi-code search. Copied into local state on mount so
 * removing a chip HERE never touches the live search bar.
 *
 * Every chip renders through `label` alone — even set/date chips carry a
 * string `label` already (attribute/date chips format it themselves;
 * `barChips` computes one for the free-text/set badge for its own overflow
 * measurer). Passing `codes`/`from`/`to` instead would flip SearchChip into
 * its expandable Set/date mode, dragging a CalendarPicker and a
 * document-level mousedown listener into the modal for no reason a saved
 * chip token needs (verified against SearchChip.jsx: `isSet`/`isDate` are
 * both false once `label` is non-null).
 */
export default function SaveFilterModal({ chips, onSave, onClose }) {
  // Default title = the first chip's own label ("<attrLabel>: <value>" for
  // the common attribute/date case) — reusing the label instead of
  // recomputing it keeps this in sync with however each chip kind already
  // formats itself (attribute, date, set-summary, quoted free text).
  const [title, setTitle] = useState(chips[0]?.label || '')
  const [modalChips, setModalChips] = useState(chips)

  const removeChip = (key) => setModalChips((cs) => cs.filter((c) => c.key !== key))
  const canSave = title.trim().length > 0 && modalChips.length > 0

  return (
    <ModalMedium
      title="Save Filter"
      onClose={onClose}
      ariaLabel="Save Filter"
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={!canSave}
            onClick={() => onSave(title.trim(), modalChips)}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="save-filter-modal__field">
        <FormField
          id="save-filter-title"
          label="Filter Title"
          showInfo={false}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name this filter"
        />
      </div>
      <div className="save-filter-modal__section-title text-label-sm-medium">Selected Filters</div>
      <div className="save-filter-modal__chips">
        {modalChips.map((chip) => (
          <SearchChip key={chip.key} label={chip.label} onRemove={() => removeChip(chip.key)} />
        ))}
      </div>
    </ModalMedium>
  )
}
