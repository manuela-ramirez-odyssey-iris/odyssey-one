import React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

// Filter trigger for GlobalSearch. Opens the filters drawer.
// States: Default / Hover (surface lift) / Pressed (color, CSS :active)
// / Active (Carolina Blue, persistent — `active` prop = drawer open).
// The applied-filter count Badge is owned by GlobalSearch (rendered as a
// sibling overlay), not by this atom.
export default function FilterButton({ active = false, onClick, label = 'Filter' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`filter-button${active ? ' is-active' : ''}`}
      aria-pressed={active}
    >
      <SlidersHorizontal {...ICON_MD} />
      <span className="filter-button__label text-label-sm-medium">{label}</span>
    </button>
  )
}
