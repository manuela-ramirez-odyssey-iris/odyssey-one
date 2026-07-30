// @vitest-environment jsdom
import { describe, test, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FormField, { applyFormat } from './FormField.jsx'

describe('FormField char counter', () => {
  test('renders and counts when showCounter + maxLength (basic variant)', () => {
    const { container } = render(
      <FormField label="Name" value="abc" onChange={() => {}} showCounter maxLength={10} />,
    )
    const counter = container.querySelector('.form-field__counter')
    expect(counter).toBeTruthy()
    expect(counter.textContent).toBe('3/10')
  })

  test('empty value counts 0', () => {
    const { container } = render(
      <FormField label="Name" value="" onChange={() => {}} showCounter maxLength={10} />,
    )
    expect(container.querySelector('.form-field__counter').textContent).toBe('0/10')
  })

  test('suppressed without maxLength', () => {
    const { container } = render(
      <FormField label="Name" value="abc" onChange={() => {}} showCounter />,
    )
    expect(container.querySelector('.form-field__counter')).toBeNull()
  })

  test('suppressed when a leadingSelect is present', () => {
    const { container } = render(
      <FormField
        label="Name"
        value="abc"
        onChange={() => {}}
        showCounter
        maxLength={10}
        leadingSelect={{ label: '+1', onClick: () => {} }}
      />,
    )
    expect(container.querySelector('.form-field__counter')).toBeNull()
  })

  test('suppressed when a trailingSelect is present', () => {
    const { container } = render(
      <FormField
        label="Name"
        value="abc"
        onChange={() => {}}
        showCounter
        maxLength={10}
        trailingSelect={{ label: 'kg', onClick: () => {} }}
      />,
    )
    expect(container.querySelector('.form-field__counter')).toBeNull()
  })

  test('maxLength reaches the native input', () => {
    const { container } = render(
      <FormField label="Name" value="" onChange={() => {}} maxLength={5} />,
    )
    expect(container.querySelector('input').maxLength).toBe(5)
  })
})

describe('FormField required', () => {
  test('renders the marker + sets native required + aria-required', () => {
    const { container } = render(
      <FormField label="Name" value="" onChange={() => {}} required />,
    )
    const marker = container.querySelector('.form-field__required')
    expect(marker).toBeTruthy()
    expect(marker.textContent.trim()).toBe('*')
    const input = container.querySelector('input')
    expect(input.required).toBe(true)
    expect(input.getAttribute('aria-required')).toBe('true')
  })

  test('no marker when not required', () => {
    const { container } = render(
      <FormField label="Name" value="" onChange={() => {}} />,
    )
    expect(container.querySelector('.form-field__required')).toBeNull()
    expect(container.querySelector('input').getAttribute('aria-required')).toBeNull()
  })
})

describe('FormField validated', () => {
  test('validated renders success class, check icon, and Validated line', () => {
    const { container } = render(
      <FormField label="Ship Direction" value="Outbound" onChange={() => {}} validated />,
    )
    expect(container.querySelector('.form-field--validated')).toBeTruthy()
    const helper = container.querySelector('.form-field__validated')
    expect(helper).toBeTruthy()
    expect(helper.textContent).toBe('Validated')
    expect(container.querySelector('.form-field__icon svg')).toBeTruthy()
  })

  test('error wins over validated', () => {
    const { container } = render(
      <FormField label="Ship Direction" value="x" onChange={() => {}} validated error="Missing Mandatory" />,
    )
    expect(container.querySelector('.form-field--validated')).toBeNull()
    expect(container.querySelector('.form-field__validated')).toBeNull()
    expect(container.querySelector('.form-field--error')).toBeTruthy()
    expect(container.querySelector('.form-field__error').textContent).toBe('Missing Mandatory')
  })
})

describe('FormField format (input content policy)', () => {
  test('decimal drops letters and keeps only the first dot', () => {
    expect(applyFormat('12ab.3', 'decimal')).toBe('12.3')
    expect(applyFormat('1.2.3', 'decimal')).toBe('1.23')
    expect(applyFormat('abc', 'decimal')).toBe('')
  })

  test('integer drops dots and letters; phone keeps dialling punctuation', () => {
    expect(applyFormat('12.9x', 'integer')).toBe('129')
    expect(applyFormat('+1 (713) 555-0134', 'phone')).toBe('+1 (713) 555-0134')
    expect(applyFormat('+1abc713', 'phone')).toBe('+1713')
  })

  test('text is untouched, unknown formats pass through', () => {
    expect(applyFormat('ACME Corp.', 'text')).toBe('ACME Corp.')
    expect(applyFormat('ACME Corp.', 'nope')).toBe('ACME Corp.')
  })

  // The bug this closes: a rejected character never reaches the value, so the
  // field can't get wedged (Number('abc') → NaN → every keystroke re-parses NaN).
  test('a typed letter never reaches onChange in a decimal field', () => {
    const seen = []
    const { container } = render(
      <FormField label="Amount" format="decimal" value="" onChange={(e) => seen.push(e.target.value)} />,
    )
    const input = container.querySelector('input')
    fireEvent.change(input, { target: { value: '12a' } })
    expect(seen).toEqual(['12'])
  })
})
