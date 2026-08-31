// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FieldSelect from './FieldSelect.jsx'
import FormField from './FormField.jsx'

describe('FieldSelect locked', () => {
  test('unlocked is a button with a chevron', () => {
    const { container } = render(<FieldSelect label="kg" onClick={() => {}} />)
    expect(container.querySelector('button.field-select')).toBeTruthy()
    expect(container.querySelector('.field-select svg')).toBeTruthy()
  })

  test('locked renders static text — no button, no chevron, keeps the divider ladder', () => {
    const onClick = vi.fn()
    const { container } = render(
      <FieldSelect variant="leading" state="error" label="kg" locked onClick={onClick} />,
    )
    const el = container.querySelector('.field-select')
    expect(el.tagName).toBe('SPAN')
    expect(el.textContent).toBe('kg')
    expect(container.querySelector('svg')).toBeNull()
    expect(el.className).toContain('field-select--error')
    fireEvent.click(el)
    expect(onClick).not.toHaveBeenCalled()
  })

  test('FormField forwards locked on either edge, input stays enabled', () => {
    const { container } = render(
      <FormField
        label="Weight"
        value="10"
        onChange={() => {}}
        leadingSelect={{ label: '+1', locked: true }}
        trailingSelect={{ label: 'kg', onClick: () => {} }}
      />,
    )
    const [lead, trail] = container.querySelectorAll('.field-select')
    expect(lead.tagName).toBe('SPAN')
    expect(trail.tagName).toBe('BUTTON')
    expect(container.querySelector('input').disabled).toBe(false)
  })
})
