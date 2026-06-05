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
