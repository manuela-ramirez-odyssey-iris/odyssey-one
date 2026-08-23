// @vitest-environment jsdom
import { beforeEach, describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDevMode, setEnabled, setMode, setFramework, setCorner, _resetForTests } from './useDevMode.js'

function setSearch(search) {
  window.history.pushState({}, '', `/${search}`)
}

beforeEach(() => {
  localStorage.clear()
  setSearch('')
  _resetForTests()
})

describe('useDevMode', () => {
  it('defaults to disabled with mode hover and framework react when no param and empty storage', () => {
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(false)
    expect(result.current.mode).toBe('hover')
    expect(result.current.framework).toBe('react')
    expect(result.current.everActivated).toBe(false)
    expect(result.current.corner).toBe('br')
  })

  it('setCorner updates the store and persists', () => {
    const { result } = renderHook(() => useDevMode())

    act(() => result.current.setCorner('tl'))

    expect(result.current.corner).toBe('tl')
    const stored = JSON.parse(localStorage.getItem('odyssey-devmode'))
    expect(stored.corner).toBe('tl')

    _resetForTests()
    const { result: second } = renderHook(() => useDevMode())
    expect(second.current.corner).toBe('tl')
  })

  it('raw setCorner works outside React', () => {
    setCorner('bl')
    const { result } = renderHook(() => useDevMode())
    expect(result.current.corner).toBe('bl')
  })

  it('?dev=1 enables dev mode and sets everActivated on first read', () => {
    setSearch('?dev=1')
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(true)
    expect(result.current.everActivated).toBe(true)
  })

  it('?dev=true also counts as truthy', () => {
    setSearch('?dev=true')
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(true)
  })

  it('?dev=0 force-disables and clears the persisted localStorage entry', () => {
    // seed storage as if a prior session left dev mode on
    localStorage.setItem('odyssey-devmode', JSON.stringify({ enabled: true, mode: 'all', framework: 'angular', everActivated: true }))
    setSearch('?dev=0')
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(false)
    expect(localStorage.getItem('odyssey-devmode')).toBeNull()
  })

  it('?dev=false also force-disables', () => {
    localStorage.setItem('odyssey-devmode', JSON.stringify({ enabled: true, mode: 'hover', framework: 'react', everActivated: true }))
    setSearch('?dev=false')
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(false)
    expect(localStorage.getItem('odyssey-devmode')).toBeNull()
  })

  it('with no param, state comes from localStorage', () => {
    localStorage.setItem('odyssey-devmode', JSON.stringify({ enabled: true, mode: 'all', framework: 'angular', everActivated: true }))
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(true)
    expect(result.current.mode).toBe('all')
    expect(result.current.framework).toBe('angular')
    expect(result.current.everActivated).toBe(true)
  })

  it('setEnabled/setMode/setFramework update the store, persist, and a fresh hook instance after reset sees them', () => {
    const { result } = renderHook(() => useDevMode())

    act(() => {
      result.current.setEnabled(true)
      result.current.setMode('all')
      result.current.setFramework('angular')
    })

    expect(result.current.enabled).toBe(true)
    expect(result.current.mode).toBe('all')
    expect(result.current.framework).toBe('angular')
    expect(result.current.everActivated).toBe(true)

    const stored = JSON.parse(localStorage.getItem('odyssey-devmode'))
    expect(stored).toMatchObject({ enabled: true, mode: 'all', framework: 'angular', everActivated: true })

    // simulate a fresh module read (new hook instance, module-state reset, storage intact)
    _resetForTests()
    const { result: second } = renderHook(() => useDevMode())
    expect(second.current.enabled).toBe(true)
    expect(second.current.mode).toBe('all')
    expect(second.current.framework).toBe('angular')
    expect(second.current.everActivated).toBe(true)
  })

  it('everActivated stays true after disabling once activated', () => {
    const { result } = renderHook(() => useDevMode())
    act(() => result.current.setEnabled(true))
    act(() => result.current.setEnabled(false))
    expect(result.current.enabled).toBe(false)
    expect(result.current.everActivated).toBe(true)
  })

  it('?dev=1 merges onto existing persisted state instead of clobbering it', () => {
    localStorage.setItem('odyssey-devmode', JSON.stringify({ mode: 'all', framework: 'angular', foo: 1 }))
    setSearch('?dev=1')
    const { result } = renderHook(() => useDevMode())

    expect(result.current.enabled).toBe(true)
    expect(result.current.everActivated).toBe(true)
    expect(result.current.mode).toBe('all')
    expect(result.current.framework).toBe('angular')

    act(() => result.current.setMode('all'))
    const stored = JSON.parse(localStorage.getItem('odyssey-devmode'))
    expect(stored.foo).toBe(1)
    expect(stored.mode).toBe('all')
    expect(stored.framework).toBe('angular')
  })

  it('raw store functions work outside React', () => {
    setEnabled(true)
    setMode('all')
    setFramework('angular')
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(true)
    expect(result.current.mode).toBe('all')
    expect(result.current.framework).toBe('angular')
  })
})
