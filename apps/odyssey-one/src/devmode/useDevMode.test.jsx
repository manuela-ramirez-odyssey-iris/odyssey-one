// @vitest-environment jsdom
import { beforeEach, describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDevMode, setEnabled, setMode, setFramework, setCorner, _resetForTests } from './useDevMode.js'

function setSearch(search) {
  window.history.pushState({}, '', `/${search}`)
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  setSearch('')
  _resetForTests()
})

describe('useDevMode', () => {
  it('defaults to disabled with mode hover and framework angular when no param and empty storage', () => {
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(false)
    expect(result.current.mode).toBe('hover')
    expect(result.current.framework).toBe('angular')
    expect(result.current.everActivated).toBe(false)
    expect(result.current.corner).toBe('br')
    // Nesting defaults to 'all': components composed into a parent's slots
    // are the thing people actually want to inspect.
    expect(result.current.nesting).toBe('all')
  })

  it('setNesting updates the store, persists, and survives a fresh read', () => {
    const { result } = renderHook(() => useDevMode())

    act(() => result.current.setNesting('outermost'))

    expect(result.current.nesting).toBe('outermost')
    const savedPrefs = localStorage.getItem('odyssey-devmode')
    expect(JSON.parse(savedPrefs).nesting).toBe('outermost')

    // _resetForTests wipes both stores for test isolation; re-seed localStorage
    // the way a real browser would still have it there across a fresh page load.
    _resetForTests()
    localStorage.setItem('odyssey-devmode', savedPrefs)
    const { result: second } = renderHook(() => useDevMode())
    expect(second.current.nesting).toBe('outermost')
  })

  it('setCorner updates the store and persists', () => {
    const { result } = renderHook(() => useDevMode())

    act(() => result.current.setCorner('tl'))

    expect(result.current.corner).toBe('tl')
    const savedPrefs = localStorage.getItem('odyssey-devmode')
    expect(JSON.parse(savedPrefs).corner).toBe('tl')

    _resetForTests()
    localStorage.setItem('odyssey-devmode', savedPrefs)
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

  it('?dev=0 force-disables and clears the persisted sessionStorage entry', () => {
    // seed sessionStorage as if a prior ?dev=1 left dev mode on this tab
    sessionStorage.setItem('odyssey-devmode-session', JSON.stringify({ enabled: true, everActivated: true }))
    localStorage.setItem('odyssey-devmode', JSON.stringify({ mode: 'all', framework: 'angular' }))
    setSearch('?dev=0')
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(false)
    expect(result.current.everActivated).toBe(false)
    expect(sessionStorage.getItem('odyssey-devmode-session')).toBeNull()
    // preferences are untouched by dev=0
    expect(result.current.mode).toBe('all')
    expect(result.current.framework).toBe('angular')
  })

  it('?dev=false also force-disables', () => {
    sessionStorage.setItem('odyssey-devmode-session', JSON.stringify({ enabled: true, everActivated: true }))
    setSearch('?dev=false')
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(false)
    expect(result.current.everActivated).toBe(false)
    expect(sessionStorage.getItem('odyssey-devmode-session')).toBeNull()
  })

  it('no param, empty sessionStorage, populated localStorage prefs → not activated', () => {
    localStorage.setItem('odyssey-devmode', JSON.stringify({ mode: 'all', framework: 'angular' }))
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(false)
    expect(result.current.everActivated).toBe(false)
    // preferences still come through
    expect(result.current.mode).toBe('all')
    expect(result.current.framework).toBe('angular')
  })

  it('a tampered/regressed localStorage enabled+everActivated cannot bypass the session gate', () => {
    localStorage.setItem('odyssey-devmode', JSON.stringify({ enabled: true, everActivated: true, mode: 'all' }))
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(false)
    expect(result.current.everActivated).toBe(false)
    // preference keys in the same blob still hydrate normally
    expect(result.current.mode).toBe('all')
  })

  it('a seeded session flag alone activates without the param', () => {
    sessionStorage.setItem('odyssey-devmode-session', JSON.stringify({ enabled: true, everActivated: true }))
    const { result } = renderHook(() => useDevMode())
    expect(result.current.enabled).toBe(true)
    expect(result.current.everActivated).toBe(true)
  })

  it('setEnabled/setMode/setFramework update the store, persist across each store, and a fresh hook instance after reset sees them', () => {
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

    const storedPrefs = JSON.parse(localStorage.getItem('odyssey-devmode'))
    expect(storedPrefs).toMatchObject({ mode: 'all', framework: 'angular' })
    expect(storedPrefs.enabled).toBeUndefined()
    expect(storedPrefs.everActivated).toBeUndefined()

    const savedSession = sessionStorage.getItem('odyssey-devmode-session')
    const storedSession = JSON.parse(savedSession)
    expect(storedSession).toMatchObject({ enabled: true, everActivated: true })

    // simulate a fresh module read (new hook instance, module-state reset) —
    // re-seed both stores the way a same-tab reload would still have them.
    const savedPrefs = localStorage.getItem('odyssey-devmode')
    _resetForTests()
    localStorage.setItem('odyssey-devmode', savedPrefs)
    sessionStorage.setItem('odyssey-devmode-session', savedSession)
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
