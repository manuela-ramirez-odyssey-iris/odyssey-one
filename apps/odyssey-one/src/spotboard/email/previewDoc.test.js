import { describe, it, expect } from 'vitest'
import { previewDoc } from './previewDoc.js'

describe('previewDoc', () => {
  it('injects <base target="_blank"> right after <head>', () => {
    const html = '<html><head><title>x</title></head><body></body></html>'
    expect(previewDoc(html)).toBe(
      '<html><head><base target="_blank"><title>x</title></head><body></body></html>',
    )
  })

  it('is idempotent — does not double-inject on an already-previewed doc', () => {
    const once = previewDoc('<html><head><title>x</title></head></html>')
    expect(previewDoc(once)).toBe(once)
  })

  it('is a no-op when the doc has no <head>', () => {
    const html = '<div>no head here</div>'
    expect(previewDoc(html)).toBe(html)
  })
})
