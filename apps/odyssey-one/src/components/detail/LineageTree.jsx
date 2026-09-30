import React from 'react'
import { Badge, Button, Tab } from '@odyssey/ui'
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

  const renderNode = (node, key, depth) => {
    const id = labelOf(node)
    const k = node.sources?.length ?? 0
    const isOpen = expanded.has(key)
    return (
      <React.Fragment key={key}>
        <div className="lineage-row" style={{ paddingLeft: `calc(var(--spacing-4) * ${depth + 1})` }}>
          {k > 0 ? (
            <button
              type="button"
              className="lineage-chevron"
              aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${id}`}
              aria-expanded={isOpen}
              onClick={() => onToggle(key)}
            >
              {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          ) : (
            <span className="lineage-chevron lineage-chevron--leaf" aria-hidden="true" />
          )}
          <DepthDot depth={depth} />
          <button type="button" className="lineage-id" onClick={() => onOpen(node, depth === 0)}>{id}</button>
          <span className="lineage-route">{node.origin} → {node.destination}</span>
          {node.hidden && <Badge variant="gray" leftIcon={<Lock size={12} />}>Preview only</Badge>}
          {k > 0 && <Badge variant="blue">{k} {k === 1 ? 'source' : 'sources'}</Badge>}
        </div>
        {isOpen && (
          <>
            <div className="lineage-strip" style={{ paddingLeft: `calc(var(--spacing-4) * ${depth + 2})` }}>
              <Merge size={16} aria-hidden="true" />
              Sources of {id}
            </div>
            {node.sources.map((s, i) => renderNode(s, `${key}/${i}`, depth + 1))}
          </>
        )}
      </React.Fragment>
    )
  }

  return (
    <div className="lineage-tree">
      <div className="lineage-header">
        <span className="lineage-header__title">Consolidation Lineage</span>
        <span className="lineage-header__id">{labelOf(root)}</span>
        <Badge variant="blue">{countShipments(root)} shipments</Badge>
        {keys.length > 0 && (
          <Button
            variant="link"
            className="lineage-header__toggle"
            icon={allExpanded ? <ListChevronsDownUp size={16} /> : <ListChevronsUpDown size={16} />}
            onClick={() => onToggleAll(!allExpanded, keys)}
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </Button>
        )}
      </div>
      {renderNode(root, 'r', 0)}
    </div>
  )
}

// Closable preview tab — APP-LOCAL, logged ad-hoc in playground/normalization-
// tracker.md (user ruling 2026-09-30): the normalized Tab has no close slot.
// Tab anatomy + a 16px lucide `x` after the label. The x is a SIBLING button
// (never nested in the Tab's <button>), laid over the label's reserved padding.
export function LineageTab({ label, current, onSelect, onClose }) {
  return (
    <span className="lineage-tab">
      <Tab label={label} current={current} onClick={onSelect} className="lineage-tab__label" />
      <button type="button" className="lineage-tab__close" aria-label={`Close ${label}`} onClick={onClose}>
        <X size={16} aria-hidden="true" />
      </button>
    </span>
  )
}
