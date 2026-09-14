import { describe, it, expect } from 'vitest'
import { deriveAuditTrail, actorFor, CATEGORY_TYPE } from './auditTrail.js'
import ordersFixture from '../../../data/orders.json'
import detailsFixture from '../../../data/order-details.json'

const rows = ordersFixture
const enrichmentFor = (n) => detailsFixture[n] ?? null
const HEADER_ONLY = new Set([
  'Order Creation', 'Order Header Editing', 'Order Lifecycle Status Change',
  'Order Applied on Hold', 'Order Released from Hold (Header Level Editing)', 'Order Full Cancellation',
])
const BLANK_CHANGES = new Set([
  'Order Creation', 'Order Applied on Hold', 'Order Partial Cancellation', 'Order Full Cancellation',
])
const byStatus = (s) => rows.find((r) => r.orderNumber && r.orderStatus === s)

describe('deriveAuditTrail', () => {
  it('is deterministic and starts with Order Creation at the order’s own createdAt', () => {
    const row = rows.find((r) => r.orderNumber)
    const a = deriveAuditTrail(row, enrichmentFor(row.orderNumber))
    const b = deriveAuditTrail(row, enrichmentFor(row.orderNumber))
    expect(a).toEqual(b)
    expect(a[0].changeCategory).toBe('Order Creation')
    expect(a[0].changeType).toBe('Order Action')
    expect(a[0].timestamp).toBe(row.createdAt)
    expect(a[0].timeZoneCode).toBe(row.createdTimeZoneCode)
    expect(a[0].changes).toEqual([])
    expect(a[0].lineItemId).toBeNull()
  })

  it('creation actor follows the order source: Manual = User email · name, Integrated = System · ERP', () => {
    const manual = rows.find((r) => r.orderNumber && r.orderSource === 'MANUAL')
    const integrated = rows.find((r) => r.orderNumber && r.orderSource === 'INTEGRATED')
    const m = deriveAuditTrail(manual, enrichmentFor(manual.orderNumber))[0]
    const i = deriveAuditTrail(integrated, enrichmentFor(integrated.orderNumber))[0]
    expect(m.changedBy).toBe('User')
    expect(m.source).toBe(actorFor(manual.createdBy))
    expect(actorFor('ben.planner')).toBe('ben.planner@odyssey.local · Ben Planner')
    expect(i.changedBy).toBe('System')
    expect(i.source).toBe('ERP')
  })

  it('timestamps are non-decreasing and every row shares the order’s zone', () => {
    for (const row of rows.filter((r) => r.orderNumber).slice(0, 200)) {
      const trail = deriveAuditTrail(row, enrichmentFor(row.orderNumber))
      for (let k = 1; k < trail.length; k++) expect(trail[k].timestamp >= trail[k - 1].timestamp).toBe(true)
      for (const t of trail) expect(t.timeZoneCode).toBe(row.createdTimeZoneCode)
    }
  })

  it('applies the 9128 blank rules: header-level rows have no line item, event-only rows have no changes', () => {
    for (const row of rows.filter((r) => r.orderNumber).slice(0, 300)) {
      for (const t of deriveAuditTrail(row, enrichmentFor(row.orderNumber))) {
        if (HEADER_ONLY.has(t.changeCategory)) expect(t.lineItemId).toBeNull()
        else expect(t.lineItemId).not.toBeNull()
        if (BLANK_CHANGES.has(t.changeCategory)) expect(t.changes).toEqual([])
        else expect(t.changes.length).toBeGreaterThan(0)
        expect(t.changeType).toBe(CATEGORY_TYPE[t.changeCategory])
      }
    }
  })

  it('walks the order’s real lifecycle: the last status-change row lands on the current status', () => {
    for (const status of ['Planned Load', 'Planned Shipment', 'Planning Failed', 'Shipment Failed']) {
      const row = byStatus(status)
      if (!row) continue
      const changes = deriveAuditTrail(row, enrichmentFor(row.orderNumber))
        .filter((t) => t.changeCategory === 'Order Lifecycle Status Change')
      expect(changes.length).toBeGreaterThan(0)
      const last = changes[changes.length - 1].changes[0]
      expect(last.field).toBe('Status')
      expect(last.newValue).toBe(status)
      expect(changes[0].changes[0].oldValue).toBe('Ready for Planning')
    }
  })

  it('Hold orders end on Applied on Hold; Cancelled orders end on Full Cancellation; nothing else does', () => {
    const hold = byStatus('Hold'); const cancelled = byStatus('Cancelled'); const rfp = byStatus('Ready for Planning')
    const last = (r) => { const t = deriveAuditTrail(r, enrichmentFor(r.orderNumber)); return t[t.length - 1] }
    expect(last(hold).changeCategory).toBe('Order Applied on Hold')
    expect(last(cancelled).changeCategory).toBe('Order Full Cancellation')
    expect(last(cancelled).changedBy).toBe('User')
    expect(last(rfp).changeCategory).not.toBe('Order Full Cancellation')
  })

  it('edit rows only ever change fields to values the order actually holds now', () => {
    let seen = 0
    for (const row of rows.filter((r) => r.orderNumber).slice(0, 400)) {
      const trail = deriveAuditTrail(row, enrichmentFor(row.orderNumber))
      for (const t of trail.filter((x) => x.changeCategory === 'Order Header Editing')) {
        for (const c of t.changes) {
          seen++
          if (c.field === 'Gross Weight') expect(c.newValue).toBe(`${row.grossWeight.value.toLocaleString('en-US')} ${row.grossWeight.uom}`)
          if (c.field === 'Equipment') expect(c.newValue).toBe(row.equipment)
          if (c.field === 'Freight Terms') expect(c.newValue).toBe(row.freightTerms)
          if (c.field === 'Latest Pickup') expect(c.newValue).toBe(row.consignor.latestPickupDateTime)
          expect(c.oldValue).not.toBe(c.newValue)
        }
      }
      for (const t of trail.filter((x) => x.changeCategory === 'Order Line Item Editing')) {
        const line = (enrichmentFor(row.orderNumber)?.orderLines ?? []).find((l) => String(l.lineIdentifier) === t.lineItemId)
        expect(line).toBeTruthy()
        expect(t.changes[0].newValue).toBe(`${line.grossWeightValue.toLocaleString('en-US')} ${line.grossWeightUomCode}`)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('Draft rows yield the creation row only (a draft has no lifecycle yet)', () => {
    const draft = byStatus('Draft')
    expect(deriveAuditTrail(draft, enrichmentFor(draft.orderNumber))).toHaveLength(1)
  })
})
