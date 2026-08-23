// Dev-mode toggle cluster: a draggable round button (pinned to a viewport
// corner) that flips `enabled` on click, plus a small chevron affordance
// that opens a flyout menu for Mode/Framework. Renders only once dev mode
// has ever been activated — normal users never see this.
//
// The flyout menu is hand-rolled with plain divs/buttons, NOT @odyssey/ui's
// DropdownMenu: the inspector (findUiComponent/DevOverlay) walks the DOM
// looking for @odyssey/ui components to outline/label, and this menu is
// devtool CHROME, not something the inspector should ever offer to inspect
// itself. A DropdownMenu instance here would show up as an inspectable
// target inside its own inspector.
import { useEffect, useRef, useState } from 'react'
import { useDevMode } from './useDevMode.js'
import './devmode.css'

const DRAG_THRESHOLD_PX = 5

// Pure + exported so drag-end behavior is testable without real layout
// (jsdom rects are always 0x0 — this is driven off clientX/clientY against
// window.innerWidth/innerHeight instead of any element's own geometry).
export function nearestCorner(x, y, viewportWidth, viewportHeight) {
  const vertical = y < viewportHeight / 2 ? 't' : 'b'
  const horizontal = x < viewportWidth / 2 ? 'l' : 'r'
  return `${vertical}${horizontal}`
}

const MODE_OPTIONS = [
  { value: 'hover', label: 'Hover' },
  { value: 'all', label: 'All' },
]
const FRAMEWORK_OPTIONS = [
  { value: 'react', label: 'React' },
  { value: 'angular', label: 'Angular' },
]

function DevMenu({ corner, mode, framework, setMode, setFramework, onClose }) {
  const menuRef = useRef(null)

  // Outside-click + Escape close the menu. Plain document listeners (same
  // idiom as PresetActionsMenu in components/common/presetChrome.jsx) — this
  // is a lightweight flyout, not a modal dialog, so it doesn't register with
  // useEscapeStack.
  useEffect(() => {
    function onPointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      // Stop here so this Escape doesn't ALSO reach useEscapeStack's
      // window-level listener (packages/ui/src/useEscapeStack.js) and close
      // a real product modal sitting underneath the flyout. The event is
      // dispatched on `document`, so this document-level listener runs
      // during the target phase — before it would bubble up to `window`.
      e.stopPropagation()
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div ref={menuRef} className={`devmode-menu devmode-menu--${corner}`} role="menu">
      <div className="devmode-menu__group" role="group" aria-label="Mode">
        <div className="devmode-menu__label">Mode</div>
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="menuitemradio"
            aria-checked={mode === opt.value}
            className={`devmode-menu__option${mode === opt.value ? ' devmode-menu__option--active' : ''}`}
            onClick={() => setMode(opt.value)}
          >
            {mode === opt.value ? '✓ ' : ''}
            {opt.label}
          </button>
        ))}
      </div>
      <div className="devmode-menu__group" role="group" aria-label="Framework">
        <div className="devmode-menu__label">Framework</div>
        {FRAMEWORK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="menuitemradio"
            aria-checked={framework === opt.value}
            className={`devmode-menu__option${framework === opt.value ? ' devmode-menu__option--active' : ''}`}
            onClick={() => setFramework(opt.value)}
          >
            {framework === opt.value ? '✓ ' : ''}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DevToggle() {
  const { enabled, everActivated, mode, framework, corner, setEnabled, setMode, setFramework, setCorner } = useDevMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dragOffset, setDragOffset] = useState(null)
  const startRef = useRef(null)
  const movedRef = useRef(false)

  if (!everActivated) return null

  function handlePointerDown(e) {
    startRef.current = { x: e.clientX, y: e.clientY }
    movedRef.current = false
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) movedRef.current = true
    if (movedRef.current) setDragOffset({ x: dx, y: dy })
  }

  function handlePointerUp(e) {
    if (!startRef.current) return
    if (movedRef.current) {
      setCorner(nearestCorner(e.clientX, e.clientY, window.innerWidth, window.innerHeight))
    } else {
      setEnabled(!enabled)
    }
    startRef.current = null
    movedRef.current = false
    setDragOffset(null)
  }

  // The browser can fire pointercancel mid-drag (e.g. a touch gesture the OS
  // reinterprets, window losing focus). Without this, dragOffset stays
  // frozen at its last value — the button visually stuck off its corner —
  // and the next plain tap's pointerdown/up would still read as a click.
  function handlePointerCancel() {
    startRef.current = null
    movedRef.current = false
    setDragOffset(null)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setEnabled(!enabled)
    }
  }

  const style = dragOffset ? { transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` } : undefined

  return (
    <div className={`devmode-toggle-cluster devmode-toggle-cluster--${corner}`}>
      <div
        className={`devmode-toggle${enabled ? ' devmode-toggle--on' : ''}`}
        style={style}
        role="button"
        tabIndex={0}
        aria-pressed={enabled}
        aria-label={enabled ? 'Disable dev mode' : 'Enable dev mode'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
      >
        DEV
        <button
          type="button"
          className="devmode-toggle__chevron"
          aria-label="Dev mode options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((o) => !o)
          }}
        >
          {'▾'}
        </button>
      </div>
      {menuOpen && (
        <DevMenu
          corner={corner}
          mode={mode}
          framework={framework}
          setMode={setMode}
          setFramework={setFramework}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  )
}
