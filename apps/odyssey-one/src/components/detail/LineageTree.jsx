import React from 'react'
import { Badge, Button } from '@odyssey/ui'
import { ICON_MD } from '@odyssey/tokens'
import { ChevronRight, ChevronDown, Merge, Lock, X, ListChevronsUpDown, ListChevronsDownUp } from 'lucide-react'

// Consolidation lineage — the tree + its closable preview tab (S164 / CNS-22,
// docs/superpowers/specs/2026-09-30-consolidation-lineage-history.md §4). The
// tree renders from ONE detail's `lineage` snapshot (§1), so there are no
// fetches here; only the preview tab's History pane fetches (HistoryTab.jsx).
// The Figma VDs set the LOOK only — ids/counts/labels come from our model.

export const labelOf = (n) => n.odysseyShipmentIdentifier || n.sellShipment

/** Unique shipments in the tree, root included ("{N} shipments"). The pull-out
 *  shape can list one original O under two parents, hence the Set. */
export function countShipments(root) {
  const seen = new Set()
  const walk = (n) => { seen.add(n.sellShipment); n.sources?.forEach(walk) }
  walk(root)
  return seen.size
}

/** Ancestry path root → … → target (first hit, depth-first), or null. */
export function findPath(root, sellShipment, trail = []) {
  const here = [...trail, root]
  if (root.sellShipment === sellShipment) return here
  for (const s of root.sources ?? []) {
    const hit = findPath(s, sellShipment, here)
    if (hit) return hit
  }
  return null
}

/** Index-path keys ("0", "0/1"…) of every node that has sources — the tree's
 *  expansion state is keyed by position, not id, since an id can repeat. */
export function expandableKeys(root, key = 'r', out = []) {
  if (root.sources?.length) {
    out.push(key)
    root.sources.forEach((s, i) => expandableKeys(s, `${key}/${i}`, out))
  }
  return out
}

// Depth dot — decorative (aria-hidden). Same colours in the tree and the
// "Merged from" chips: depth 0 blue, 1 green, >=2 yellow (badge text tokens).
export function DepthDot({ depth }) {
  return <span className={`lineage-dot lineage-dot--${Math.min(depth, 2)}`} aria-hidden="true" />
}

export function LineageTree({ root, expanded, onToggle, onToggleAll, onOpen }) {
  const keys = expandableKeys(root)
  const allExpanded = keys.length > 0 && keys.every((k) => expanded.has(k))

  // Indent model (Figma 3121:60616 / 3126:19694): dots must line up across
  // siblings. A chevron row starts at 16 + 16·d; a leaf has no chevron, so it
  // adds chevron(16) + gap(12) to land its dot where a sibling's dot lands.
  const indent = (depth, hasChevron) =>
    hasChevron || depth === 0
      ? `calc(var(--spacing-4) * ${depth + 1})`
      : `calc(var(--spacing-4) * ${depth + 1} + var(--icon-size-md) + var(--spacing-3))`

  // Flatten to rows so the LAST row can drop its border-bottom (the container's
  // border closes it) — a CSS :last-child can't see through the fragments.
  const rows = []
  const walk = (node, key, depth) => {
    const k = node.sources?.length ?? 0
    rows.push({ type: 'node', node, key, depth, k })
    if (k > 0 && expanded.has(key)) {
      rows.push({ type: 'strip', node, key: `${key}#strip`, depth })
      node.sources.forEach((s, i) => walk(s, `${key}/${i}`, depth + 1))
    }
  }
  walk(root, 'r', 0)

  const renderRow = (r, last) => {
    const { node, key, depth } = r
    const id = labelOf(node)
    const cls = last ? ' lineage-row--last' : ''
    if (r.type === 'strip') {
      // padding-left = the PARENT row's chevron x (root 16, d1 32, d2 48)
      return (
        <div key={r.key} className={`lineage-strip text-label-xs-medium-uppercase${cls}`} style={{ paddingLeft: `calc(var(--spacing-4) * ${depth + 1})` }}>
          <Merge {...ICON_MD} aria-hidden="true" />
          Sources of {id}
        </div>
      )
    }
    const isOpen = expanded.has(key)
    const Chevron = isOpen ? ChevronDown : ChevronRight
    return (
      <div key={key} className={`lineage-row${cls}`} style={{ paddingLeft: indent(depth, r.k > 0) }}>
        {r.k > 0 && (
          <button
            type="button"
            className="lineage-chevron"
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${id}`}
            aria-expanded={isOpen}
            onClick={() => onToggle(key)}
          >
            <Chevron size={depth === 0 ? 20 : 16} />
          </button>
        )}
        <DepthDot depth={depth} />
        <button type="button" className="lineage-id text-label-sm-semibold" onClick={() => onOpen(node, depth === 0)}>{id}</button>
        <span className="lineage-route text-label-xs-regular">{node.origin} → {node.destination}</span>
        <span className="lineage-badges">
          {node.hidden && <Badge variant="gray" leftIcon={<Lock {...ICON_MD} />}>Preview only</Badge>}
          {r.k > 0 && <Badge variant="blue">{r.k} {r.k === 1 ? 'source' : 'sources'}</Badge>}
        </span>
      </div>
    )
  }

  return (
    <div className="lineage-tree">
      <div className="lineage-header">
        <div className="lineage-header__group">
          <span className="lineage-header__title text-label-sm-semibold">Consolidation Lineage</span>
          <span className="lineage-header__id text-label-xs-regular">{labelOf(root)}</span>
          <Badge variant="blue">{countShipments(root)} shipments</Badge>
        </div>
        {keys.length > 0 && (
          <Button
            variant="link"
            size="sm"
            iconRight={allExpanded ? <ListChevronsDownUp {...ICON_MD} /> : <ListChevronsUpDown {...ICON_MD} />}
            onClick={() => onToggleAll(!allExpanded, keys)}
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </Button>
        )}
      </div>
      {rows.map((r, i) => renderRow(r, i === rows.length - 1))}
    </div>
  )
}

// Closable preview tab — APP-LOCAL, logged ad-hoc in playground/normalization-
// tracker.md (user ruling 2026-09-30): the normalized Tab has no close slot.
// Same anatomy as the Tab atom (Figma 3159:21323): `.tab__content` holds the
// label AND a 16px lucide `x` (gap 8), then the 2px underline; hover/current
// colours come from the `.tab` rules. The wrapper is a div (no nested buttons):
// label = select button, x = sibling close button.
export function LineageTab({ label, current, onSelect, onClose }) {
  return (
    <div className={`tab text-label-sm-medium lineage-tab${current ? ' tab--current' : ''}`}>
      <span className="tab__content">
        <button type="button" className="lineage-tab__label" aria-pressed={current} onClick={onSelect}>{label}</button>
        <button type="button" className="lineage-tab__close" aria-label={`Close ${label}`} onClick={onClose}>
          <X {...ICON_MD} aria-hidden="true" />
        </button>
      </span>
      <span className="tab__underline" aria-hidden="true" />
    </div>
  )
}
