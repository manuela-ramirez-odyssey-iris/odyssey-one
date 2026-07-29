import { describe, expect, it } from 'vitest'
import { convertMeasureDisplay, computeProductRollups } from './productMath'
import { orderFormValuesSample } from '../../../api/fixtures/orderFormValues.sample'

describe('convertMeasureDisplay (display only — stored values untouched)', () => {
  it('passes through when the stored UoM already matches the system', () => {
    expect(convertMeasureDisplay({ value: '100', uom: 'lb' }, 'us')).toBe('100.00 Lb')
    expect(convertMeasureDisplay({ value: '79', uom: 'cuft' }, 'us')).toBe('79.00 Cu ft')
  })

  it('converts lb→kg and cuft→m³ for metric display', () => {
    expect(convertMeasureDisplay({ value: '100', uom: 'lb' }, 'metric')).toBe('45.36 Kg')
    expect(convertMeasureDisplay({ value: '79', uom: 'cuft' }, 'metric')).toBe('2.24 m³')
  })

  it('converts kg→lb for US display', () => {
    expect(convertMeasureDisplay({ value: '45.359237', uom: 'kg' }, 'us')).toBe('100.00 Lb')
  })

  it('degrades gracefully on unknown UoMs and blank values', () => {
    expect(convertMeasureDisplay({ value: '5', uom: 'each' }, 'metric')).toBe('5.00 each')
    expect(convertMeasureDisplay({ value: '', uom: 'lb' }, 'us')).toBe('')
  })
})

describe('computeProductRollups (confirmation page, spec §3.3)', () => {
  it('counts, totals per display system, and derives hazmat from master data', () => {
    const us = computeProductRollups(orderFormValuesSample.products, 'us')
    expect(us.count).toBe(2)
    expect(us.totalWeight).toBe('4300.00 Lb')   // 100 + 4200
    expect(us.totalVolume).toBe('730.00 Cu ft') // 79 + 651
    expect(us.hazmat).toBe('Yes')               // 0000000100034 (Sulfuric Acid) is hazmat
  })

  it('totals convert in metric', () => {
    const metric = computeProductRollups(orderFormValuesSample.products, 'metric')
    expect(metric.totalWeight).toBe('1950.45 Kg') // 4300 lb → kg
  })

  it('non-hazmat-only lists report No', () => {
    const only = [orderFormValuesSample.products[0]] // 0000000100037 Polyethylene — not hazmat
    expect(computeProductRollups(only, 'us').hazmat).toBe('No')
  })
})
