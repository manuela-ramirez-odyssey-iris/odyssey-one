import { describe, test, expect } from 'vitest'
import { getAllShipments } from '../../data'
import { shipmentsSearchAdapter as adapter, panelForResults } from './adapter'
import { SHIPMENTS_PROGRESSION, FREE_TEXT_ATTRS } from './progression'
import { matchesFreeText, resolveBestMatch } from './criteria'
import { getShipmentErrorList, RELEVANCE_SORT } from '../../api/services/gridService'

// Regression guard for GlobalSearch composed-criteria behavior.
// Each case in vault/20-cross-cutting/global-search/composed-criteria.md gets a
// test here. Data-derived (seed-42 fixtures) — no magic IDs, survives regen.

const ALL = getAllShipments()

// A real shipment with >1 order, used to exercise the order-explosion path.
const MULTI = ALL.find((s) => Array.isArray(s.orders) && s.orders.length >= 2)

// Helper: build a chip the way useGlobalSearch commits them.
const chip = (key, dataKey, queryValue = '') => ({ key, dataKey, queryValue })

// Build a chip from a progression attribute (carries its group, like toItem does).
const groupChip = (groupIdx, attrIdx = 0, queryValue = '') => {
  const g = SHIPMENTS_PROGRESSION[groupIdx]
  const a = g.attributes[attrIdx]
  return { key: a.key, dataKey: a.dataKey, group: g.group, queryValue }
}

describe('searchShipments — invariants (must always hold)', () => {
  test('no chips + no query → empty results', async () => {
    expect(await adapter.searchShipments([])).toEqual({ results: [], total: 0 })
    expect(await adapter.searchShipments(null)).toEqual({ results: [], total: 0 })
    expect(await adapter.searchShipments([], '   ')).toEqual({ results: [], total: 0 })
  })

  test('leading shipment-scoped chip → one row per shipment (shipment entity)', async () => {
    const { results, total } = await adapter.searchShipments([
      chip('buy-shipment', 'buyShipment', MULTI.buyShipment),
    ])
    expect(total).toBe(1) // buyShipment is unique
    expect(results[0].matchId).toBe(MULTI.buyShipment) // bold = leading attr value
    expect(results[0].shipmentId).toBeUndefined() // shipment rows have no Shipment# meta cell
  })

  test('AND semantics — chips that cannot co-occur → no results', async () => {
    const other = ALL.find((s) => s.customerName !== MULTI.customerName)
    const { total } = await adapter.searchShipments([
      chip('buy-shipment', 'buyShipment', MULTI.buyShipment),
      chip('customer-name', 'customerName', other.customerName),
    ])
    expect(total).toBe(0)
  })

  test('exact chips (count fields) match by equality, not substring', async () => {
    // "2" must find shipments with orderCount 2 and NOT count 12/20/etc.
    const twos = ALL.filter((s) => String(s.orderCount) === '2').length
    const { total } = await adapter.searchShipments([
      { key: 'order-count', dataKey: 'orderCount', queryValue: '2', exact: true },
    ])
    expect(total).toBe(twos)
    expect(twos).toBeGreaterThan(0)
  })

  test('typing "2" suggests Order Count (obvious value match, S82)', async () => {
    const [{ items }] = await adapter.getSuggestions('2')
    const oc = items.find((i) => i.key === 'order-count')
    expect(oc).toBeDefined()
    expect(oc.exact).toBe(true) // the flag rides the committed chip
  })

  test('results are capped at 15 but total reflects the full match count', async () => {
    // A bare letter as a customer-name fragment matches many shipments.
    const { results, total } = await adapter.searchShipments([
      chip('customer-name', 'customerName', 'a'),
    ])
    expect(results.length).toBeLessThanOrEqual(15)
    expect(total).toBeGreaterThanOrEqual(results.length)
  })
})

describe('free-text query — the S79b results-panel glimpse (decision 5)', () => {
  test('query alone (no chips) finds shipments across free-text fields', async () => {
    const { results, total } = await adapter.searchShipments([], MULTI.buyShipment)
    expect(total).toBeGreaterThanOrEqual(1)
    // Bare-code rows are LABELLED with the attribute they matched (Case 3).
    expect(results.some((r) => r.matchId === `Buy Shipment #${MULTI.buyShipment}`)).toBe(true)
  })

  test('every row carries the SELECTION key (sellShipment) as data-shipment-key', async () => {
    const byQuery = await adapter.searchShipments([], MULTI.buyShipment)
    const hit = byQuery.results.find((r) => r.matchId === `Buy Shipment #${MULTI.buyShipment}`)
    expect(hit['data-shipment-key']).toBe(MULTI.sellShipment)

    // Order rows carry it too (parent shipment's sellShipment).
    const byOrder = await adapter.searchShipments([
      chip('order', 'orders', ''),
      chip('buy-shipment', 'buyShipment', MULTI.buyShipment),
    ])
    expect(byOrder.results.every((r) => r['data-shipment-key'] === MULTI.sellShipment)).toBe(true)
  })

  test('query is ANDed with committed chips', async () => {
    const other = ALL.find((s) => s.customerName !== MULTI.customerName)
    const { total } = await adapter.searchShipments(
      [chip('customer-name', 'customerName', other.customerName)],
      MULTI.buyShipment, // unique to MULTI → cannot co-occur with other's customer
    )
    expect(total).toBe(0)
  })

  test('chips-only calls are unchanged (query param optional)', async () => {
    const withQ = await adapter.searchShipments([chip('buy-shipment', 'buyShipment', MULTI.buyShipment)], '')
    const withoutQ = await adapter.searchShipments([chip('buy-shipment', 'buyShipment', MULTI.buyShipment)])
    expect(withQ).toEqual(withoutQ)
  })
})

describe('Case 1 — Order# (empty) + Buy Shipment# = X → that shipment\'s orders', () => {
  test('explodes the qualifying shipment into one row per order', async () => {
    const chips = [
      chip('order', 'orders', ''), // leading order chip, empty → entity = order
      chip('buy-shipment', 'buyShipment', MULTI.buyShipment),
    ]
    const { results, total } = await adapter.searchShipments(chips)

    // One row per order on that shipment.
    expect(total).toBe(MULTI.orders.length)
    expect(results).toHaveLength(MULTI.orders.length)

    // Bold field is the order #, and the rows cover exactly that shipment's orders.
    expect(new Set(results.map((r) => r.matchId))).toEqual(
      new Set(MULTI.orders.map(String)),
    )

    // Every row carries the parent shipment + order conventions.
    expect(results.every((r) => r.shipmentId === MULTI.buyShipment)).toBe(true)
    expect(results.every((r) => r.iconType === 'package')).toBe(true)
  })
})

describe('Case 2 — empty-input suggestions advance by progression group', () => {
  // Case 4 (S104) killed the 5 attribute entry points; Case 12 (GS-22) briefly
  // carved DATES back in for an untouched bar (S106). The user reversed that
  // carve-out (user, 2026-08-04 — reversal of the S106 carve-out: an empty bar
  // suggests nothing) — back to the plain GS-14 rule.
  test('no chips, nothing typed → NOTHING (Case 4, GS-14 plain rule restored)', async () => {
    for (const sections of [await adapter.getInitial([]), await adapter.getInitial()]) {
      expect(sections).toEqual([])
    }
    // An empty typed query routes to getInitial — same empty result.
    expect(await adapter.getSuggestions('')).toEqual([])
  })

  test('one chip in group 0 → suggests the NEXT group, never repeats the entry set', async () => {
    const g1 = SHIPMENTS_PROGRESSION[1]
    const lead = groupChip(0) // Shipment Identifiers
    const sections = await adapter.getInitial([lead])
    expect(sections[0].title).toBe(g1.label) // "Who it belongs to"
    expect(sections[0].items.map((i) => i.key)).toEqual(g1.attributes.map((a) => a.key))
    expect(sections[0].items.some((i) => i.key === lead.key)).toBe(false)
  })

  test('drill advances by the furthest group reached', async () => {
    const g2 = SHIPMENTS_PROGRESSION[2] // Route & Geography
    const chips = [groupChip(0, 0, '25'), groupChip(1, 0, 'Erco')] // shipment id + customer id
    const sections = await adapter.getInitial(chips)
    expect(sections[0].title).toBe(g2.label) // "Where it goes"
    expect(sections[0].items.map((i) => i.key)).toEqual(g2.attributes.map((a) => a.key))
  })

  test('on the last group → stays on it, minus the committed attribute', async () => {
    const lastIdx = SHIPMENTS_PROGRESSION.length - 1
    const last = SHIPMENTS_PROGRESSION[lastIdx]
    const sections = await adapter.getInitial([groupChip(lastIdx, 0)])
    expect(sections[0].title).toBe(last.label)
    expect(sections[0].items.map((i) => i.key)).toEqual(
      last.attributes.slice(1).map((a) => a.key),
    )
  })
})

describe('Customer scoping — the glimpse respects the selected customer list (S79c decision 10)', () => {
  // Every generated origin carries " US " — free text 'us' matches every row,
  // so the scope alone determines the total. Data-derived, survives regen.
  const SCOPE_ID = 'ERCO_SYS_01'

  test('customerIds pre-scope searchShipments (first-order, before chips/text)', async () => {
    const scopedRows = ALL.filter((s) => s.customerId === SCOPE_ID)
    expect(scopedRows.length).toBeGreaterThan(0)

    const unscoped = await adapter.searchShipments([], 'us')
    expect(unscoped.total).toBe(ALL.length)

    const scoped = await adapter.searchShipments([], 'us', [SCOPE_ID])
    expect(scoped.total).toBe(scopedRows.length)
    expect(scoped.results.every((r) => scopedRows.some((s) => s.buyShipment === r.id))).toBe(true)
  })

  test('empty scope ([]) → honest empty glimpse; undefined → unscoped (legacy)', async () => {
    expect(await adapter.searchShipments([], 'us', [])).toEqual({ results: [], total: 0 })
    const legacy = await adapter.searchShipments([], 'us', undefined)
    expect(legacy.total).toBe(ALL.length)
  })
})

// ---------------------------------------------------------------------------
// Case 3 (S104) — a bare code the user can't classify.
// "we type 00000001234, quick results should not assume that is a shipment"
// ---------------------------------------------------------------------------
describe('Case 3 — bare code resolves to WHAT IT IS, not to a shipment', () => {
  // Data-derived: a shipment whose order number is unique across the fixture, so
  // the expectation is unambiguous. Survives regen.
  const ORDER_HOST = ALL.find(
    (s) =>
      Array.isArray(s.orders) &&
      s.orders.length > 0 &&
      ALL.filter((x) => (x.orders || []).includes(s.orders[0])).length === 1,
  )

  test('a pasted ORDER number is labelled as an order, not as its shipment', async () => {
    const orderNo = String(ORDER_HOST.orders[0])
    const { results } = await adapter.searchShipments([], orderNo)

    expect(results[0].matchId).toBe(`Order #${orderNo}`)
    // The regression this guards: it used to render the SHIPMENT number.
    expect(results[0].matchId).not.toBe(ORDER_HOST.buyShipment)
    // Still the right row underneath — selection key is untouched.
    expect(results[0]['data-shipment-key']).toBe(ORDER_HOST.sellShipment)
  })

  test('a pasted PRO/BOL number finds anything at all (it returned 0 before)', async () => {
    const withPro = ALL.find((s) => s.pro)
    const { results, total } = await adapter.searchShipments([], String(withPro.pro))
    expect(total).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.matchId === `Pro#/Booking #${withPro.pro}`)).toBe(true)
  })

  test('load / equipment / seal are reachable by bare code too', async () => {
    for (const [dataKey, label] of [['load', 'Load #'], ['equipment', 'Equipment #'], ['seal', 'Seal Number']]) {
      const row = ALL.find((s) => s[dataKey])
      const { results, total } = await adapter.searchShipments([], String(row[dataKey]))
      expect(total, `${dataKey} matched nothing`).toBeGreaterThanOrEqual(1)
      expect(
        results.some((r) => r.matchId === `${label} ${row[dataKey]}`.replace('# ', '#')),
        `${dataKey} row was not labelled "${label}"`,
      ).toBe(true)
    }
  })

  test('EXACT matches outrank partial ones (the user\'s ordering rule)', async () => {
    // A short digit fragment that is SOME row's whole value and other rows' prefix.
    const exactRow = ALL.find((s) => String(s.equipment).length === 4)
    const q = String(exactRow.equipment)
    const { results } = await adapter.searchShipments([], q)
    // Whatever the winning attribute is, row 0's value must be an EXACT hit.
    const leadValue = results[0].matchId.split(/#| /).pop()
    expect(leadValue.toLowerCase()).toBe(q.toLowerCase())
  })

  test('the glimpse total still equals the table total (S79c decision 7 holds)', async () => {
    // Rows are labelled, NOT re-grained — one row per shipment, so `total` keeps
    // meaning "shipments the table will show".
    const withPro = ALL.find((s) => s.pro)
    const q = String(withPro.pro)
    const { total } = await adapter.searchShipments([], q)
    expect(total).toBe(ALL.filter((s) => matchesFreeText(s, q)).length)
  })
})

// ---------------------------------------------------------------------------
// Case 6 (S104) — "if i click on show all, is the table in the same order as
// the preview?" It is now. The glimpse and the grid compute relevance
// separately (the glimpse already holds the resolved match for labelling), so
// only an assertion keeps them from drifting.
// ---------------------------------------------------------------------------
describe('Case 6 — table order matches the results preview', () => {
  // A DISCRIMINATING query, derived: one whose exact match is NOT already first
  // in file order, so these tests fail if the relevance sort is removed. (A
  // query whose best hit happens to sort first anyway would pass vacuously.)
  const discriminating = (() => {
    for (const panel of ['monitoring', 'exceptions']) {
      const rows = ALL.filter((s) => s.panel === panel)
      for (const row of rows) {
        for (const key of ['equipment', 'load', 'pro', 'seal']) {
          const q = String(row[key] ?? '').toLowerCase()
          if (q.length < 4) continue
          const matches = rows.filter((s) => matchesFreeText(s, q))
          if (matches.length < 2) continue
          const scores = matches.map((s) => resolveBestMatch(s, q, FREE_TEXT_ATTRS)?.score ?? 0)
          const best = Math.max(...scores)
          if (best <= scores[0]) continue
          const exact = matches[scores.indexOf(best)]
          // S104 lesson: a passing order-assertion is worthless unless the two
          // orders provably differ. The DEFAULT-sort test below compares against
          // buyShipment-ASC, so the exact match must ALSO not be first there —
          // not just in natural (file) order — or that comparison is vacuous.
          const byBuyAsc = [...matches].sort((a, b) =>
            String(a.buyShipment).localeCompare(String(b.buyShipment), undefined, { numeric: true }))
          if (byBuyAsc[0].buyShipment === exact.buyShipment) continue
          return { q, panel, exact }
        }
      }
    }
    throw new Error('No discriminating query in the fixture — Case 6 cannot be tested honestly')
  })()

  test('the exact match leads the grid, though it is NOT first in natural order', async () => {
    const { q, panel, exact } = discriminating
    const grid = await getShipmentErrorList({
      panel, pageNumber: 0, pageSize: 100, searchCriteria: { chips: [], text: q },
    })
    expect(grid.rows[0].buyShipment).toBe(exact.buyShipment)
  })

  test('grid order == preview order, row for row (within the panel)', async () => {
    const { q, panel } = discriminating
    const preview = await adapter.searchShipments([], q)
    const grid = await getShipmentErrorList({
      panel, pageNumber: 0, pageSize: 100, searchCriteria: { chips: [], text: q },
    })
    // The preview spans panels; compare its in-panel subsequence to the grid.
    const inPanel = preview.results
      .map((r) => r.id)
      .filter((id) => ALL.some((s) => s.buyShipment === id && s.panel === panel))
    expect(inPanel.length).toBeGreaterThan(1)
    expect(grid.rows.slice(0, inPanel.length).map((r) => r.buyShipment)).toEqual(inPanel)
  })

  test('an explicit column sort still wins over relevance', async () => {
    const { q, panel } = discriminating
    const grid = await getShipmentErrorList({
      panel, pageNumber: 0, pageSize: 100,
      searchCriteria: { chips: [], text: q }, sortBy: 'customerName', orderBy: 'asc',
    })
    const names = grid.rows.map((r) => r.customerName)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })))
  })

  // The bug the user hit: the route ALWAYS sends a sortBy (the table is never
  // unsorted), so the relevance branch was dead in the app while these tests —
  // which omitted sortBy — passed. Relevance now travels as its own sort id.
  test('RELEVANCE_SORT reaches the grid the way the ROUTE sends it', async () => {
    const { q, panel, exact } = discriminating
    const grid = await getShipmentErrorList({
      panel, pageNumber: 0, pageSize: 100,
      searchCriteria: { chips: [], text: q },
      sortBy: RELEVANCE_SORT, orderBy: 'asc', // exactly what listParams builds
    })
    expect(grid.rows[0].buyShipment).toBe(exact.buyShipment)
  })

  test('the DEFAULT column sort does NOT silently override relevance', async () => {
    const { q, panel, exact } = discriminating
    // What the route used to send: the seeded buyShipment sort.
    const asBefore = await getShipmentErrorList({
      panel, pageNumber: 0, pageSize: 100,
      searchCriteria: { chips: [], text: q }, sortBy: 'buyShipment', orderBy: 'asc',
    })
    const asNow = await getShipmentErrorList({
      panel, pageNumber: 0, pageSize: 100,
      searchCriteria: { chips: [], text: q }, sortBy: RELEVANCE_SORT, orderBy: 'asc',
    })
    // The two must DIFFER — otherwise this fixture can't prove the sentinel works.
    expect(asNow.rows[0].buyShipment).not.toBe(asBefore.rows[0].buyShipment)
    expect(asNow.rows[0].buyShipment).toBe(exact.buyShipment)
  })
})

// ---------------------------------------------------------------------------
// Case 8 (S104) — the landing tab comes from the PREVIEW's leading group.
// "we should choose the group that shows first in the preview panel to pick the
// tab. The idea behind this is to give user eyes what they are seeing."
// ---------------------------------------------------------------------------
describe('Case 8 — landing tab follows the preview\'s first group', () => {
  const row = (attr, panel) => ({ 'data-attr': attr, 'data-panel': panel })

  test('picks the first group\'s majority panel, ignoring bigger later groups', () => {
    const results = [
      // leading group: buy-shipment, mostly in exceptions
      row('buy-shipment', 'exceptions'),
      row('buy-shipment', 'exceptions'),
      row('buy-shipment', 'monitoring'),
      // a LATER group that is bigger overall — must not win
      row('equipment', 'monitoring'), row('equipment', 'monitoring'),
      row('equipment', 'monitoring'), row('equipment', 'monitoring'),
      row('equipment', 'monitoring'), row('equipment', 'monitoring'),
    ]
    expect(panelForResults(results)).toBe('exceptions')
  })

  test('a single-row preview lands on that row\'s panel', () => {
    expect(panelForResults([row('order', 'monitoring')])).toBe('monitoring')
  })

  test('ties inside the group fall to the highest-relevance row (seen first)', () => {
    expect(panelForResults([
      row('load', 'monitoring'),
      row('load', 'exceptions'),
    ])).toBe('monitoring')
  })

  test('empty / unreadable preview → null, caller falls back', () => {
    expect(panelForResults([])).toBeNull()
    expect(panelForResults()).toBeNull()
    expect(panelForResults([{ 'data-attr': 'x' }])).toBeNull() // no panel on the row
  })

  test('real adapter rows carry the panel + group the rule needs', async () => {
    const s = ALL.find((x) => x.pro)
    const { results } = await adapter.searchShipments([], String(s.pro))
    expect(results[0]['data-panel']).toBeTruthy()
    expect(results[0]['data-attr']).toBe('pro') // the RESOLVED attribute
    expect(panelForResults(results)).toBe(s.panel)
  })
})

// ---------------------------------------------------------------------------
// Case 9 (S104, corrected 2026-08-01) — multiple codes, comma- or space-separated.
// UNION semantics: "show CODE123's results and CODE223's results". Each row
// matches ANY code and is labeled by its OWN matched code, so the per-code
// rankings interleave by match quality. A same-attribute list also offers ONE
// IN-list chip; a mixed list offers none.
// ---------------------------------------------------------------------------
describe('Case 9 — multi-code search (union)', () => {
  const A = ALL.find((s) => Array.isArray(s.orders) && s.orders.length > 0 && s.pro)
  const B = ALL.find((s) => s.buyShipment !== A.buyShipment && s.pro)
  const crossRowQ = `${A.pro}, ${B.pro}`

  test('union: BOTH rows come back, and comma == space', async () => {
    const byComma = await adapter.searchShipments([], crossRowQ)
    const bySpace = await adapter.searchShipments([], `${A.pro} ${B.pro}`)
    const keys = byComma.results.map((r) => r['data-shipment-key'])
    expect(keys).toContain(A.sellShipment)
    expect(keys).toContain(B.sellShipment)
    expect(bySpace.results.map((r) => r.id)).toEqual(byComma.results.map((r) => r.id))
  })

  test('union total = rows matching ANY code (superset of each alone)', async () => {
    const a = await adapter.searchShipments([], String(A.pro))
    const b = await adapter.searchShipments([], String(B.pro))
    const both = await adapter.searchShipments([], crossRowQ)
    expect(both.total).toBeGreaterThanOrEqual(Math.max(a.total, b.total))
    expect(both.total).toBeLessThanOrEqual(a.total + b.total) // overlaps dedupe
  })

  test('each row is labeled by ITS OWN matched code, not a shared leading one', async () => {
    const { results } = await adapter.searchShipments([], crossRowQ)
    const rowA = results.find((r) => r['data-shipment-key'] === A.sellShipment)
    const rowB = results.find((r) => r['data-shipment-key'] === B.sellShipment)
    expect(rowA.matchId).toContain(String(A.pro))
    expect(rowB.matchId).toContain(String(B.pro))
    expect(rowA.matchId).not.toContain(String(B.pro))
  })

  test('codes of DIFFERENT attributes mix in one result set', async () => {
    // An order number + a different row's SCAC — both contribute their rows.
    const scacRow = ALL.find((s) => s.scac && s.buyShipment !== A.buyShipment)
    const { results, total } = await adapter.searchShipments([], `${A.orders[0]} ${scacRow.scac}`)
    expect(total).toBeGreaterThanOrEqual(2)
    const labels = results.map((r) => r.matchId)
    expect(labels.some((l) => l === `Order #${A.orders[0]}`)).toBe(true)
    expect(labels.some((l) => l === `SCAC ${scacRow.scac}`)).toBe(true)
  })

  test('exact matches still lead the mixed ranking', async () => {
    const { results } = await adapter.searchShipments([], crossRowQ)
    // Row 1 must be an EXACT hit on one of the two codes.
    const lead = results[0].matchId.toLowerCase()
    expect(lead.endsWith(String(A.pro).toLowerCase()) || lead.endsWith(String(B.pro).toLowerCase())).toBe(true)
  })

  test('same-attribute list → ONE IN-list chip suggestion', async () => {
    const sections = await adapter.getSuggestions(crossRowQ)
    expect(sections).toHaveLength(1)
    expect(sections[0].title).toBe('What is it?')
    const pro = sections[0].items.find((i) => i.key === 'pro')
    expect(pro).toBeDefined()
    expect(pro.queryValue).toBe(`${A.pro}, ${B.pro}`)
  })

  test('mixed-attribute list → NO suggestions (user rule)', async () => {
    const sections = await adapter.getSuggestions(`${A.orders[0]} ${A.scac}`)
    expect(sections).toEqual([])
  })

  test('committed IN-list chip = OR within the attribute (batch lookup)', async () => {
    const { results, total } = await adapter.searchShipments([
      chip('pro', 'pro', `${A.pro}, ${B.pro}`),
    ])
    expect(total).toBeGreaterThanOrEqual(2)
    const keys = results.map((r) => r['data-shipment-key'])
    expect(keys).toContain(A.sellShipment)
    expect(keys).toContain(B.sellShipment)
  })

  // The regression union semantics could most easily cause: a multi-word value
  // must stay ONE phrase, or every row containing "company" floods in.
  test('multi-word values never tokenize when the phrase matches', async () => {
    const named = ALL.find((s) => s.customerName.includes(' '))
    const phraseRows = ALL.filter((s) => matchesFreeText(s, named.customerName.toLowerCase())).length
    const { total } = await adapter.searchShipments([], named.customerName)
    expect(total).toBe(phraseRows)
    // Sanity: the loose token would have matched far more.
    const looseWord = named.customerName.split(' ').pop().toLowerCase()
    const looseRows = ALL.filter((s) => matchesFreeText(s, looseWord)).length
    expect(looseRows).toBeGreaterThan(phraseRows)
  })

  test('grid parity: the table applies the same union and the same order', async () => {
    const preview = await adapter.searchShipments([], crossRowQ)
    const grid = await getShipmentErrorList({
      panel: A.panel, pageNumber: 0, pageSize: 100,
      searchCriteria: { chips: [], text: crossRowQ }, sortBy: RELEVANCE_SORT, orderBy: 'asc',
    })
    expect(grid.totalCount).toBeGreaterThanOrEqual(1)
    const inPanel = preview.results
      .map((r) => r.id)
      .filter((id) => ALL.some((s) => s.buyShipment === id && s.panel === A.panel))
    expect(grid.rows.slice(0, inPanel.length).map((r) => r.buyShipment)).toEqual(inPanel)
  })
})
