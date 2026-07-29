// Test-env polyfills. The app targets modern browsers (Map.groupBy ships in
// Chrome/Safari/FF), but the test Node runtime may be < 22 where it's absent.
// Prod code is untouched; this only fills the gap for Vitest.
if (typeof Map.groupBy !== 'function') {
  Map.groupBy = function (items, keyFn) {
    const map = new Map()
    let i = 0
    for (const item of items) {
      const key = keyFn(item, i++)
      const arr = map.get(key)
      if (arr) arr.push(item)
      else map.set(key, [item])
    }
    return map
  }
}

// jsdom has no ResizeObserver; any test rendering AppShell (navbar → GlobalSearch)
// needs one. ponytail: no-op stub — nothing under test asserts on resize.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof Object.groupBy !== 'function') {
  Object.groupBy = function (items, keyFn) {
    const obj = Object.create(null)
    let i = 0
    for (const item of items) {
      const key = keyFn(item, i++)
      ;(obj[key] ??= []).push(item)
    }
    return obj
  }
}

// jsdom has no IntersectionObserver; the resolve-mode alert uses one to flip to
// its docked bar. ponytail: no-op stub — no test asserts on docking.
globalThis.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
