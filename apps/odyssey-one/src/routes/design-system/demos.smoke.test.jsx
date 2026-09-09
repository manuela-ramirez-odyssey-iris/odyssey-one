// @vitest-environment jsdom
/**
 * Every demo must RENDER.
 *
 * `collectDemos.test.js` validates each demo's `meta`, and the build compiles
 * them — but nothing ever rendered one, so a demo could throw at runtime and
 * take the explorer's page down while the suite and the build both stayed
 * green. That is exactly what happened on 2026-09-09: a Schematic referenced a
 * `showButtonToggle` state that only existed in the Playground, and the crash
 * was found by opening the page, not by CI.
 *
 * This is a smoke test on purpose — it asserts nothing about what a demo looks
 * like, only that mounting it does not throw. Per-demo behaviour belongs in the
 * component's own tests.
 */
import { render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

const modules = import.meta.glob('./demos/*.demo.jsx', { eager: true })
const entries = Object.entries(modules)

describe('design-system demos', () => {
  afterEach(cleanup)

  test('the glob actually found the demos', () => {
    // A broken glob would make every test below vacuously pass.
    expect(entries.length).toBeGreaterThan(50)
  })

  test.each(entries.map(([path, mod]) => [path.replace('./demos/', ''), mod]))(
    '%s mounts without throwing',
    (_name, mod) => {
      expect(mod.default).toBeTypeOf('function')
      const Demo = mod.default
      render(<Demo />)
    },
  )
})
