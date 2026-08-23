// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import angularMap from './angular-map.json'
import { uiNameSet } from './inspect.js'
import { getComponentInfo, getComponentInfoSync, preloadComponentInfo, dsmUrl, ANGULAR_DSM_URL } from './componentInfo.js'

describe('angular-map.json', () => {
  it('parses to a plain object', () => {
    expect(typeof angularMap).toBe('object')
    expect(Object.keys(angularMap).length).toBeGreaterThan(0)
  })

  // Guards stale entries after a React rename/removal. If this fails on the
  // real generated file, the mismatched keys are REAL findings (report them,
  // don't filter this test to make it pass).
  it('every key is a real @odyssey/ui export name', () => {
    const stale = Object.keys(angularMap).filter((name) => !uiNameSet.has(name))
    expect(stale).toEqual([])
  })
})

// Must run before anything else in this file awaits getComponentInfo/
// preloadComponentInfo — the demo index is a module-level singleton, and this
// test's whole point is observing its state BEFORE it has resolved.
describe('getComponentInfoSync + preloadComponentInfo', () => {
  it('returns angular-side data synchronously before the demo index has loaded', () => {
    const info = getComponentInfoSync('Badge')
    expect(info.react).toBeNull()
    expect(info.angular).not.toBeNull()
    expect(info.angular.selector).toBe(angularMap.Badge.selector)
    expect(info.ported).toBe(true)
  })

  it('returns full merged data synchronously after preloadComponentInfo() resolves', async () => {
    await preloadComponentInfo()
    const info = getComponentInfoSync('Badge')
    expect(info.react).not.toBeNull()
    expect(info.react.version).toBeTruthy()
    expect(info.angular).not.toBeNull()
    expect(info.ported).toBe(true)
  })
})

describe('getComponentInfo', () => {
  it('merges react + angular for a component ported to both (Badge)', async () => {
    const info = await getComponentInfo('Badge')
    expect(info.name).toBe('Badge')
    expect(info.react).not.toBeNull()
    expect(info.react.version).toBeTruthy()
    expect(info.react.tier).toBe('atom')
    expect(Array.isArray(info.react.props)).toBe(true)
    expect(info.angular).not.toBeNull()
    expect(info.angular.selector).toBe(angularMap.Badge.selector)
    expect(info.angular.version).toBe(angularMap.Badge.version)
    expect(info.ported).toBe(true)
  })

  it('reports ported: false and angular: null for a React demo with no Angular entry (Cell)', async () => {
    const info = await getComponentInfo('Cell')
    expect(info.react).not.toBeNull()
    expect(info.angular).toBeNull()
    expect(info.ported).toBe(false)
  })

  it('returns react: null for a name with no demo', async () => {
    const info = await getComponentInfo('NotARealComponent')
    expect(info.react).toBeNull()
    expect(info.angular).toBeNull()
    expect(info.ported).toBe(false)
  })
})

describe('dsmUrl', () => {
  it('returns the React DSM deep-link for framework "react"', () => {
    expect(dsmUrl('Badge', 'react')).toBe('/design-system#comp-Badge')
  })

  it('returns the Angular DSM deep-link for framework "angular"', () => {
    expect(ANGULAR_DSM_URL).toBe('https://odyssey-dsm-angular-stage.vercel.app')
    expect(dsmUrl('Badge', 'angular')).toBe('https://odyssey-dsm-angular-stage.vercel.app#comp-Badge')
  })
})
