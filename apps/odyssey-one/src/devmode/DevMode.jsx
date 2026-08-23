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
  const [inspected, setInspected] = useState(null)
  return (
    <>
      <DevToggle />
      <DevOverlay onInspect={setInspected} suppressed={Boolean(inspected)} />
      <DevDetailModal name={inspected} onClose={() => setInspected(null)} />
    </>
  )
}
