import { createPortal } from 'react-dom'

// SheetLayer — one layer of the app-wide sheet stack (S158, docs/superpowers/
// plans/2026-09-23-slide-over-routes.md Part 1 §2). Portals to document.body
// at the same z-index (200) every other portal in the app already uses
// (ModalLarge/Medium, ActionMenu, ComboBox, useAnchoredPortal) — stacking is
// DOM order, so a sheet covers whatever was open before it (e.g. the shipment
// detail modal) and anything IT opens lands above it. No changes to @odyssey/ui
// portals.
//
// The layer root itself is transparent — each sheet still renders its own
// AppShell, so its navbar/sidebar appear instantly, as today; only `<main>`
// slides (sheet-layer.css), transform only, no fade (user, 2026-09-20).
//
// `inert` covers both cases App.jsx needs: a layer buried under another one,
// and a layer that's leaving (sliding off, about to unmount) — neither should
// be reachable by keyboard/AT while it's not the thing on screen.
export default function SheetLayer({ leaving, inert, children }) {
  return createPortal(
    <div className={`sheet-layer${leaving ? ' sheet-layer--leaving' : ''}`} inert={inert || undefined}>
      {children}
    </div>,
    document.body,
  )
}
