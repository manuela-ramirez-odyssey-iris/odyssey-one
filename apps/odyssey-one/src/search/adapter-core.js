/**
 * Adapter core — the domain-agnostic pieces every search adapter needs.
 *
 * Extracted from `shipments/adapter.js` when Orders got its own adapter (S130).
 * Both were going to be character-identical apart from which progression they
 * read, and a second copy is free to drift — the same reasoning `criteria-core`
 * and `searchIndex-core` already record.
 */

/**
 * One progression attribute as a suggestion ITEM (and, once clicked, a committed
 * chip). `queryValue` null = an entry-point item ("Customer"); a value present
 * makes it a ready-to-commit criterion ("Customer: WEYERH_01").
 */
export function toItem(attr, queryValue) {
  const label = queryValue ? `${attr.label}: ${queryValue}` : attr.label
  return {
    key: attr.key,
    label,
    attrLabel: attr.label,
    queryValue: queryValue || null,
    group: attr.group,
    dataKey: attr.dataKey,
    ...(attr.exact && { exact: true }),
    kind: 'attribute',
  }
}

/**
 * The progression group to suggest next given the committed chips: the group
 * AFTER the furthest group any chip belongs to. Past the end → stay on the last
 * group (user rule). Skips fully-committed groups so the panel is never empty;
 * if the tail is exhausted, falls back to any earlier group with room left.
 */
export function nextProgressionGroup(progression, chips) {
  const idxByGroup = new Map(progression.map((g, i) => [g.group, i]))
  const maxIdx = chips.reduce((m, c) => Math.max(m, idxByGroup.get(c.group) ?? -1), -1)
  const lastIdx = progression.length - 1
  const targetIdx = Math.min(maxIdx + 1, lastIdx)
  const committed = new Set(chips.map((c) => c.key))
  const hasRoom = (g) => g.attributes.some((a) => !committed.has(a.key))

  for (let i = targetIdx; i <= lastIdx; i++) {
    if (hasRoom(progression[i])) return progression[i]
  }
  for (let i = lastIdx; i >= 0; i--) {
    if (hasRoom(progression[i])) return progression[i]
  }
  return null
}
