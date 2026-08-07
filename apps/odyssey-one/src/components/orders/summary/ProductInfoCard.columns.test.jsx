// @vitest-environment jsdom
// Task 1 (2026-08-07 orders-fix-round, Phase 2): View Order's product table
// must mirror Create — same equipment-driven column set/order (ORD-08 /
// LINX-13893), reusing productColumns.js's canon case matrix rather than a
// fixed 7-column table. Covers both surfaces this file owns:
//   - ProductInfoCard (OrderPaneSections.jsx) — the equipment-aware render
//   - mapFormVmToOrderPane.js — the whitelist removal (fields that used to
//     be silently dropped must now reach the table)
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import { ProductInfoCard } from './OrderPaneSections'
import mapFormVmToOrderPane from './mapFormVmToOrderPane'
import { makeDefaultOrderFormValues } from '../../../api/types/orderFormVm'
import { CASE_COLUMNS, PRODUCT_COLUMNS } from '../create/productColumns'

afterEach(cleanup)

const labelsFor = (caseNum) => CASE_COLUMNS[caseNum].map((k) => PRODUCT_COLUMNS[k].label)

const headerTexts = (container) =>
  Array.from(container.querySelectorAll('.odyssey-table thead th'))
    .map((th) => th.textContent.trim())
    .filter(Boolean) // drop the decorative icon-only <th>

const line = (over = {}) => ({
  lineNumber: 1,
  shipItem: 'PID-1',
  description: 'Widget',
  grossWeight: '100.00 Lb',
  volume: '10.00 Cu ft',
  hazmat: false,
  productClass: 'Class C',
  ...over,
})

describe('ProductInfoCard — equipment-driven columns mirror Create', () => {
  test('Case 1 (LTL-family): column set and order match productColumns.js', () => {
    const { container } = render(
      <ProductInfoCard d={{ equipment: 'LTL' }} productLines={[line()]} expanded onToggle={() => {}} />,
    )
    expect(headerTexts(container)).toEqual(['Line #', ...labelsFor(1)])
  })

  test('Case 3 (LCL/FCL): column set and order match productColumns.js, and differs from Case 1', () => {
    const { container } = render(
      <ProductInfoCard d={{ equipment: 'LCL' }} productLines={[line()]} expanded onToggle={() => {}} />,
    )
    const headers = headerTexts(container)
    expect(headers).toEqual(['Line #', ...labelsFor(3)])
    expect(headers).not.toEqual(['Line #', ...labelsFor(1)])
  })

  test('FCL resolves to the same case family as LCL (Case 3)', () => {
    const { container } = render(
      <ProductInfoCard d={{ equipment: 'FCL' }} productLines={[line()]} expanded onToggle={() => {}} />,
    )
    expect(headerTexts(container)).toEqual(['Line #', ...labelsFor(3)])
  })

  test('Hazardous is immediately after Line # (regression guard, old placement was after Volume)', () => {
    const { container } = render(
      <ProductInfoCard d={{ equipment: 'LTL' }} productLines={[line()]} expanded onToggle={() => {}} />,
    )
    const headers = headerTexts(container)
    expect(headers[0]).toBe('Line #')
    expect(headers[1]).toBe('Hazardous?')
  })

  test('no equipment (undefined/blank) falls back to Case 1, exactly like Create', () => {
    const undef = render(
      <ProductInfoCard d={{}} productLines={[line()]} expanded onToggle={() => {}} />,
    )
    expect(headerTexts(undef.container)).toEqual(['Line #', ...labelsFor(1)])
    cleanup()
    const blank = render(
      <ProductInfoCard d={{ equipment: '' }} productLines={[line()]} expanded onToggle={() => {}} />,
    )
    expect(headerTexts(blank.container)).toEqual(['Line #', ...labelsFor(1)])
  })

  test('fields the old whitelist dropped (handlingUnit, handlingCount, harmonizedCode, stccCode, declaredValueCurrency, manufacturingCountry) reach rendered cells', () => {
    // Case 1 carries handlingUnit/handlingCount; Case 3 carries harmonizedCode/
    // declaredValue/declaredValueCurrency/manufacturingCountry; Case 4 carries
    // stccCode. Exercise one row per family.
    const case1 = render(
      <ProductInfoCard
        d={{ equipment: 'LTL' }}
        productLines={[line({ handlingUnit: 'Pallet', handlingCount: '4' })]}
        expanded
        onToggle={() => {}}
      />,
    )
    const case1Row = case1.container.querySelector('.odyssey-table tbody tr')
    expect(within(case1Row).getByText('Pallet')).toBeTruthy()
    expect(within(case1Row).getByText('4')).toBeTruthy()
    cleanup()

    const case3 = render(
      <ProductInfoCard
        d={{ equipment: 'LCL' }}
        productLines={[line({
          harmonizedCode: '3401.20.00.00',
          declaredValue: '500.00',
          declaredValueCurrency: 'USD',
          manufacturingCountry: 'MEX',
        })]}
        expanded
        onToggle={() => {}}
      />,
    )
    const case3Row = case3.container.querySelector('.odyssey-table tbody tr')
    expect(within(case3Row).getByText('3401.20.00.00')).toBeTruthy()
    expect(within(case3Row).getByText('500.00')).toBeTruthy()
    expect(within(case3Row).getByText('USD')).toBeTruthy()
    expect(within(case3Row).getByText('MEX')).toBeTruthy()
    cleanup()

    const case4 = render(
      <ProductInfoCard
        d={{ equipment: 'RR' }}
        productLines={[line({ stccCode: '20-123-45' })]}
        expanded
        onToggle={() => {}}
      />,
    )
    const case4Row = case4.container.querySelector('.odyssey-table tbody tr')
    expect(within(case4Row).getByText('20-123-45')).toBeTruthy()
  })

  test('absent fields render the DASH placeholder, never "undefined" or a blank cell', () => {
    const { container } = render(
      // handlingUnit/handlingCount/length/width/height all absent on this line
      <ProductInfoCard d={{ equipment: 'LTL' }} productLines={[line()]} expanded onToggle={() => {}} />,
    )
    const row = container.querySelector('.odyssey-table tbody tr')
    expect(row.textContent).not.toMatch(/undefined/)
    const cells = Array.from(row.querySelectorAll('td')).map((td) => td.textContent.trim())
    // handlingUnit/handlingCount/length/width/height columns (Case 1, after
    // Line#/Hazardous?/ProductID/Description/GrossWeight/Volume/ProductClass);
    // the very last <td> is the decorative aria-hidden icon cell, excluded.
    expect(cells.slice(-6, -1)).toEqual(['--', '--', '--', '--', '--'])
  })
})

describe('mapFormVmToOrderPane — whitelist removed, fields pass through', () => {
  const product = (over = {}) => ({
    id: 'r1',
    hazardous: false,
    productId: 'PID-1',
    description: 'Widget',
    grossWeight: { value: '100', uom: 'lb' },
    volume: { value: '10', uom: 'cuft' },
    shipClass: 'C',
    handlingUnit: 'PLT',
    handlingCount: '4',
    length: { value: '5', uom: 'ft' },
    width: { value: '3', uom: 'ft' },
    height: { value: '2', uom: 'ft' },
    harmonizedCode: '3401.20.00.00',
    declaredValue: '500.00',
    declaredValueCurrency: 'USD',
    manufacturingCountry: 'MEX',
    stccCode: '20-123-45',
    ...over,
  })

  const valuesWith = (over = {}) => ({ ...makeDefaultOrderFormValues(), ...over })

  test('every ProductRowValues field reaches productLines — nothing silently dropped', () => {
    const vm = mapFormVmToOrderPane(valuesWith({ products: [product()] }))
    const l = vm.productLines[0]
    expect(l.handlingUnit).toBe('Pallet') // code → label, HANDLING_UNITS lookup
    expect(l.handlingCount).toBe('4')
    expect(l.length).toBe('5.00 ft')
    expect(l.width).toBe('3.00 ft')
    expect(l.height).toBe('2.00 ft')
    expect(l.harmonizedCode).toBe('3401.20.00.00')
    expect(l.declaredValue).toBe('500.00')
    expect(l.declaredValueCurrency).toBe('USD')
    expect(l.manufacturingCountry).toBe('MEX')
    expect(l.stccCode).toBe('20-123-45')
  })

  test('blank optional fields pass through as empty string, not thrown / not "undefined"', () => {
    const vm = mapFormVmToOrderPane(valuesWith({
      products: [product({ handlingUnit: '', handlingCount: '', length: undefined, width: undefined, height: undefined, harmonizedCode: '', declaredValue: '', declaredValueCurrency: '', manufacturingCountry: '', stccCode: '' })],
    }))
    const l = vm.productLines[0]
    expect(l.handlingUnit).toBe('')
    expect(l.length).toBe('')
    expect(l.width).toBe('')
    expect(l.height).toBe('')
    expect(l.harmonizedCode).toBe('')
    expect(l.stccCode).toBe('')
  })
})
