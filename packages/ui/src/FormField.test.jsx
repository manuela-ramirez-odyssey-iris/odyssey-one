// @vitest-environment jsdom
import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import FormField from './FormField.jsx'

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
