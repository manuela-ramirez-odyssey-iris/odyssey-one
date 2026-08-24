// Root-mounted dev-mode cluster: toggle button + overlay + detail modal,
// wired together via one piece of state (which component name is under
// inspection). Mounted once in App.jsx, as a sibling of <Routes> so it
// renders on every route — including the external /spot-bid/:token carrier
// bid page, which has no AppShell of its own.
import { useState } from 'react'
import DevToggle from './DevToggle.jsx'
import DevOverlay from './DevOverlay.jsx'
import DevDetailModal from './DevDetailModal.jsx'

export default function DevMode() {
  // { name, element } — the DOM element, never a fiber: React swaps
  // current/alternate on re-render, so a fiber held in state goes stale. The
  // modal re-walks from the element when it opens.
  //
  // The same setter is handed to the modal as `onInspect`, so a click on one
  // of its ancestry rows re-targets this one piece of state — no second
  // "which component is the modal showing" source of truth.
  const [inspected, setInspected] = useState(null)
  const inspect = (name, element = null) => setInspected(name ? { name, element } : null)
  return (
    <>
      <DevToggle />
      <DevOverlay onInspect={inspect} suppressed={Boolean(inspected)} />
      <DevDetailModal
        name={inspected?.name ?? null}
        element={inspected?.element ?? null}
        onInspect={inspect}
        onClose={() => setInspected(null)}
      />
    </>
  )
}
