# Odyssey-One Umbrella Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse `apps/shipments/` into a single umbrella app `apps/odyssey-one/` that serves all 6 domain routes under one Vite build, then rename the Vercel project in-place from `odyssey-shipments` to `odyssey-one` while preserving the existing `odyssey-shipments.vercel.app` URL.

**Architecture:** Pattern 1 — single React app, single Vite build, single Vercel project. React Router v6 with JSX-based routing. Existing shipments code stays in current locations; only `App.jsx` body moves to `routes/shipments/ShipmentsRoute.jsx`. Stub views for Home, Orders, Carriers, Tracking, Users. Vercel rename uses custom-domain pinning to keep both URLs alive.

**Tech Stack:** React 19, Vite 8, react-router-dom v6 (new), Tailwind 4, lucide-react, Turborepo, npm workspaces.

**Spec:** `docs/superpowers/specs/2026-04-28-odyssey-one-umbrella-design.md`

**Verification model:** No unit tests exist in this project; verification is done via dev server (manual browser check), `npm run build` (build success), and `npx vercel --prod` (deploy success). Each task ends with explicit verification commands and expected results.

**Solo-dev workflow:** Auto-deploy on `git push` is OFF. All deploys are manual via `npx vercel --prod` from the app directory.

---

## Phase 0 — Pre-flight

### Task 0: Confirm clean working tree

- [ ] **Step 1: Check git status**

Run: `git status`
Expected: `nothing to commit, working tree clean` and on branch `main`.

If dirty, stop and ask the user how to proceed. The migration touches many files; uncommitted changes mixed in would be hard to review.

- [ ] **Step 2: Confirm baseline build still works**

Run: `npm run build:shipments`
Expected: build succeeds; output ends with something like `✓ built in N seconds`.

If this fails on a clean tree, fix the underlying issue first — the migration assumes a working baseline.

---

## Phase 1 — Code refactor (still inside `apps/shipments/`)

We do all React-side work in the existing directory first, deploy to verify, THEN rename. This isolates the Vercel reconfiguration risk from the code refactor risk.

### Task 1: Add react-router-dom dependency

**Files:**
- Modify: `apps/shipments/package.json` (dependencies)

- [ ] **Step 1: Install react-router-dom**

Run: `npm install react-router-dom@6 --workspace=shipments`
Expected: installs successfully; `apps/shipments/package.json` gains `"react-router-dom": "^6.x.x"` in dependencies.

- [ ] **Step 2: Verify the install**

Run: `cat apps/shipments/package.json | grep react-router-dom`
Expected: prints the dependency line.

- [ ] **Step 3: Commit**

```bash
git add apps/shipments/package.json package-lock.json
git commit -m "deps: add react-router-dom for umbrella routing"
```

---

### Task 2: Create stub route files

Create five identical-shaped placeholder views. They're intentionally minimal — the goal is to prove routes work, not to design the placeholder UX.

**Files:**
- Create: `apps/shipments/src/routes/Home.jsx`
- Create: `apps/shipments/src/routes/Orders.jsx`
- Create: `apps/shipments/src/routes/Carriers.jsx`
- Create: `apps/shipments/src/routes/Tracking.jsx`
- Create: `apps/shipments/src/routes/Users.jsx`
- Create: `apps/shipments/src/routes/route-stub.css`

- [ ] **Step 1: Create the shared stub CSS**

Create `apps/shipments/src/routes/route-stub.css`:

```css
.route-stub {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
  height: 100%;
}

.route-stub h1 {
  font-family: var(--font-primary);
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.route-stub p {
  font-family: var(--font-primary);
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}
```

(Literal `8px` / `24px` / `14px` chosen because design-system spacing/typography tokens for these specific values aren't yet confirmed in `tokens.css` — these are temporary stubs and will be re-tokenized when the empty-state visual gets a real design pass.)

- [ ] **Step 2: Create `Home.jsx`**

```jsx
import './route-stub.css'

export default function Home() {
  return (
    <div className="route-stub">
      <h1>Home</h1>
      <p>Coming soon.</p>
    </div>
  )
}
```

- [ ] **Step 3: Create `Orders.jsx`**

```jsx
import './route-stub.css'

export default function Orders() {
  return (
    <div className="route-stub">
      <h1>Orders</h1>
      <p>Coming soon.</p>
    </div>
  )
}
```

- [ ] **Step 4: Create `Carriers.jsx`**

```jsx
import './route-stub.css'

export default function Carriers() {
  return (
    <div className="route-stub">
      <h1>Carriers</h1>
      <p>Coming soon.</p>
    </div>
  )
}
```

- [ ] **Step 5: Create `Tracking.jsx`**

```jsx
import './route-stub.css'

export default function Tracking() {
  return (
    <div className="route-stub">
      <h1>Tracking</h1>
      <p>Coming soon.</p>
    </div>
  )
}
```

- [ ] **Step 6: Create `Users.jsx`**

```jsx
import './route-stub.css'

export default function Users() {
  return (
    <div className="route-stub">
      <h1>Users</h1>
      <p>Coming soon.</p>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/shipments/src/routes/
git commit -m "feat: add 5 stub route components for umbrella domains"
```

---

### Task 3: Extract current `App.jsx` body into `ShipmentsRoute.jsx`

The existing `App.jsx` has all the shipments app logic. We extract everything except the top-level `AppShell` wrapper into a new file `ShipmentsRoute.jsx`. The new `App.jsx` will become a router shell in the next task.

**Files:**
- Create: `apps/shipments/src/routes/shipments/ShipmentsRoute.jsx` — receives the body
- Modify: `apps/shipments/src/App.jsx` — temporarily becomes a thin wrapper that just renders `<ShipmentsRoute />` so we can verify the move before adding routing

- [ ] **Step 1: Read current `App.jsx` carefully**

Run: `wc -l apps/shipments/src/App.jsx`
Expected: prints line count (likely several hundred).

Read it via the Read tool. Identify the JSX returned by `App()` — specifically locate where `<AppShell>` opens and closes. Everything *inside* `<AppShell>` is the shipments-specific body; that's what moves.

- [ ] **Step 2: Create `apps/shipments/src/routes/shipments/ShipmentsRoute.jsx`**

The new file should:
1. Contain all imports currently in `App.jsx` *except* `AppShell` (which stays in App.jsx for now).
2. Contain all helper functions currently in `App.jsx` (e.g., `parseSavedQuery`, `parseShipmentDate`).
3. Define `function ShipmentsRoute()` with the body of the current `App()` function — but where the JSX currently has `return <AppShell>...children...</AppShell>`, return only the children directly (drop the `<AppShell>` wrapper).
4. Default-export `ShipmentsRoute`.

Example of the structural transformation (using illustrative shape, not literal code from App.jsx):

```jsx
// Before, in App.jsx:
function App() {
  // ... lots of state, handlers ...
  return (
    <AppShell sidebar={<Sidebar />} navbar={<Navbar />}>
      <MonitorPanels ... />
      <ShipmentTabs ... />
      {/* etc */}
    </AppShell>
  )
}

// After, in routes/shipments/ShipmentsRoute.jsx:
function ShipmentsRoute() {
  // ... same state, handlers ...
  return (
    <>
      <MonitorPanels ... />
      <ShipmentTabs ... />
      {/* etc */}
    </>
  )
}
export default ShipmentsRoute
```

Move ALL the existing imports referenced inside the body. Imports stay relative — `./components/...`, `./data` etc. — because we're NOT moving the shipments-specific components yet. `apps/shipments/src/routes/shipments/ShipmentsRoute.jsx` reaches up two levels to import: `../../components/...` and `../../data`.

- [ ] **Step 3: Replace `App.jsx` with a thin wrapper**

Replace the contents of `apps/shipments/src/App.jsx` with:

```jsx
import AppShell from './components/layout/AppShell'
import Sidebar from './components/layout/Sidebar'
import Navbar from './components/layout/Navbar'
import ShipmentsRoute from './routes/shipments/ShipmentsRoute.jsx'

function App() {
  return (
    <AppShell sidebar={<Sidebar />} navbar={<Navbar />}>
      <ShipmentsRoute />
    </AppShell>
  )
}

export default App
```

If the actual `AppShell` API differs (e.g., children-only instead of sidebar/navbar slots), match the existing usage from the original `App.jsx`. The point is: `App.jsx` does `<AppShell>...<ShipmentsRoute />...</AppShell>`, nothing else.

- [ ] **Step 4: Run dev server and verify shipments route still works**

Run: `npm run dev:shipments`
Then open `http://localhost:5173/` (or whichever port Vite reports) in a browser.
Expected: the existing shipments app renders identically — sidebar, navbar, panels, table all visible. Click around to confirm no functional regression. The URL is still `/`.

If broken: stop. Likely an import path is wrong or a dependency was missed during the move.

- [ ] **Step 5: Commit**

```bash
git add apps/shipments/src/App.jsx apps/shipments/src/routes/shipments/ShipmentsRoute.jsx
git commit -m "refactor: extract App body into routes/shipments/ShipmentsRoute"
```

---

### Task 4: Wire the router

`App.jsx` becomes a router with 6 routes. `main.jsx` wraps the app in `<BrowserRouter>`. AppShell's children become the `<Outlet />` for the matched route.

**Files:**
- Modify: `apps/shipments/src/main.jsx`
- Modify: `apps/shipments/src/App.jsx`

- [ ] **Step 1: Wrap `<App />` in `<BrowserRouter>` in `main.jsx`**

Replace `apps/shipments/src/main.jsx` with:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
```

- [ ] **Step 2: Replace `App.jsx` with a router shell**

Replace `apps/shipments/src/App.jsx` with:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Sidebar from './components/layout/Sidebar'
import Navbar from './components/layout/Navbar'
import Home from './routes/Home.jsx'
import Orders from './routes/Orders.jsx'
import Carriers from './routes/Carriers.jsx'
import Tracking from './routes/Tracking.jsx'
import Users from './routes/Users.jsx'
import ShipmentsRoute from './routes/shipments/ShipmentsRoute.jsx'

function App() {
  return (
    <AppShell sidebar={<Sidebar />} navbar={<Navbar />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/carriers" element={<Carriers />} />
        <Route path="/shipments/*" element={<ShipmentsRoute />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/users" element={<Users />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default App
```

The `/shipments/*` path uses a wildcard so the existing shipments app's internal panel state (selected shipment id, active tab, etc.) doesn't conflict with router pathing — anything under `/shipments` renders the same component. The existing app uses internal state, not URL params, so this is fine.

The catch-all `<Route path="*">` redirects unknown URLs to home.

If `AppShell` doesn't take `sidebar`/`navbar` as named props, match its actual API as found in the codebase.

- [ ] **Step 3: Run dev server, verify all 6 routes work**

Run: `npm run dev:shipments`

Visit each URL in the browser:
- `http://localhost:5173/` — Home stub renders ("Home / Coming soon")
- `http://localhost:5173/orders` — Orders stub
- `http://localhost:5173/carriers` — Carriers stub
- `http://localhost:5173/shipments` — full shipments app (sidebar, navbar, panels, table)
- `http://localhost:5173/tracking` — Tracking stub
- `http://localhost:5173/users` — Users stub
- `http://localhost:5173/something-bogus` — redirects to home

For each: confirm sidebar and navbar are present, content area matches expectation.

If routing fails: confirm `<BrowserRouter>` wraps `<App />` in `main.jsx` and that `Routes` is imported from `react-router-dom`.

- [ ] **Step 4: Commit**

```bash
git add apps/shipments/src/App.jsx apps/shipments/src/main.jsx
git commit -m "feat: wire react-router with 6 umbrella routes"
```

---

### Task 5: Update Sidebar to use NavLink for the 5 sidebar domains

The current sidebar has a stale `topItems` list (Home, Shipments, Packages, Trucks, Routes) keyed to internal `active` state. Replace with the 5 confirmed domains; switch from internal-state highlighting to `NavLink`-based highlighting.

**Files:**
- Modify: `apps/shipments/src/components/layout/Sidebar.jsx`

- [ ] **Step 1: Replace `Sidebar.jsx`**

Replace the file's contents with:

```jsx
import { Home, ShoppingCart, Truck, ClipboardList, MapPin, Settings, Handshake } from 'lucide-react'
import React from 'react'
import { NavLink } from 'react-router-dom'

const topItems = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: ShoppingCart, label: 'Orders', to: '/orders' },
  { icon: Truck, label: 'Carriers', to: '/carriers' },
  { icon: ClipboardList, label: 'Shipments', to: '/shipments' },
  { icon: MapPin, label: 'Tracking', to: '/tracking' },
]

const bottomItems = [
  { icon: Settings, label: 'User Settings', to: null },
  { icon: Handshake, label: 'Partners', to: null },
]

const Sidebar = React.memo(function Sidebar() {
  return (
    <aside
      className="shrink-0 flex flex-col sticky top-0"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--deep-sea-neutral-200)',
        padding: 'var(--spacing-3)',
        height: 'calc(100vh - var(--navbar-height))',
      }}
    >
      <nav className="flex flex-col items-center flex-1" style={{ width: 40 }}>
        <div className="flex flex-col gap-2 pb-6">
          {topItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={label}
              className="flex items-center justify-center w-10 h-10 cursor-pointer transition-colors duration-150"
              style={({ isActive }) => ({
                borderRadius: 'var(--radius-lg)',
                background: isActive ? 'var(--deep-sea-neutral-300)' : 'transparent',
              })}
            >
              <Icon size={20} style={{ color: 'var(--text-tertiary)' }} />
            </NavLink>
          ))}
        </div>

        <div
          className="flex flex-col gap-2 pt-6 w-10"
          style={{ borderTop: '1px solid var(--deep-sea-neutral-300)' }}
        >
          {bottomItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              title={label}
              className="flex items-center justify-center w-10 h-10 border-none cursor-pointer transition-colors duration-150"
              style={{
                borderRadius: 'var(--radius-lg)',
                background: 'transparent',
              }}
            >
              <Icon size={20} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          ))}
        </div>
      </nav>
    </aside>
  )
})

export default Sidebar
```

Notes:
- `end={to === '/'}` makes the Home NavLink only match the exact `/` path, not all routes.
- Bottom items (User Settings, Partners) keep their original placeholder behavior — no route, just decorative buttons. They stay until the design system gets them in scope.
- Icon choices map to domain semantics: Home (Home), Orders (ShoppingCart), Carriers (Truck), Shipments (ClipboardList), Tracking (MapPin). If lucide-react doesn't export one of these, swap to the closest available — these names all exist in lucide-react v1.6.

- [ ] **Step 2: Verify in browser**

Run: `npm run dev:shipments`
Click each of the 5 sidebar icons; confirm:
- URL changes to the correct path
- The clicked icon's background highlights (NavLink active state)
- Page content shows the correct route

- [ ] **Step 3: Commit**

```bash
git add apps/shipments/src/components/layout/Sidebar.jsx
git commit -m "feat: sidebar nav for 5 umbrella domains via NavLink"
```

---

### Task 6: Add user-management dropdown to Navbar avatar

The avatar already renders with a `<ChevronDown>` next to it. Wire a click handler on the avatar block that opens a small dropdown with a "Manage Users" entry that navigates to `/users`.

**Files:**
- Modify: `apps/shipments/src/components/layout/Navbar.jsx`

- [ ] **Step 1: Update Navbar avatar block to a dropdown**

Find the `{/* Right: Bell + Profile */}` block at the bottom of the JSX in `Navbar.jsx`. Replace the `<div className="flex items-center gap-2">` block (the avatar wrapper) with this dropdown-enabled version.

Two changes are needed:
1. Add `useNavigate` import from react-router-dom and a new state hook for dropdown open/close.
2. Wrap the avatar block in a relative-positioned div that conditionally renders the dropdown.

Specifically:

In the imports at the top of the file:
```jsx
import { useNavigate } from 'react-router-dom'
```

Add to the existing `import { ... }` from lucide-react:
- ensure `ChevronDown` is already imported (it is, per the existing code).

Add a new state hook alongside the existing `dropdownOpen` for the search categories. Rename the existing one to be unambiguous:
```jsx
const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
const profileDropdownRef = useRef(null)
const navigate = useNavigate()
```

Update the existing `dropdownOpen`/`setDropdownOpen` references inside the search-bar block and its `useEffect` to use the renamed `categoryDropdownOpen`/`setCategoryDropdownOpen` (and rename `dropdownRef` to `categoryDropdownRef` for consistency).

Add a second `useEffect` for the profile dropdown click-outside:
```jsx
useEffect(() => {
  function handleClickOutside(e) {
    if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
      setProfileDropdownOpen(false)
    }
  }
  if (profileDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [profileDropdownOpen])
```

Replace the avatar block (currently a passive `<div className="flex items-center gap-2">...</div>`) with:

```jsx
<div className="relative" ref={profileDropdownRef}>
  <button
    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
    className="flex items-center gap-2 border-none bg-transparent cursor-pointer"
    style={{ padding: 0 }}
  >
    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-semibold"
      style={{ background: 'var(--deep-sea-neutral-600)', color: 'var(--text-inverse)' }}>
      AC
    </div>
    <div className="flex flex-col whitespace-nowrap items-start">
      <span className="text-sm font-medium" style={{ color: '#D0D4DB' }}>Amy Cook</span>
      <span className="text-xs" style={{ color: '#9DA3B0', lineHeight: '12px' }}>Admin</span>
    </div>
    <ChevronDown size={16} style={{ color: '#9DA3B0' }} />
  </button>

  {profileDropdownOpen && (
    <div
      className="absolute flex flex-col"
      style={{
        top: '100%',
        right: 0,
        marginTop: 4,
        width: 200,
        background: 'var(--dropdown-bg)',
        border: '1px solid var(--dropdown-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        zIndex: 9999,
        padding: '4px 0',
        overflow: 'hidden',
      }}
    >
      <button
        className="flex items-center w-full text-left text-sm border-none cursor-pointer"
        style={{
          padding: '8px 12px',
          minHeight: 36,
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-primary)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dropdown-hover-bg)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        disabled
      >
        Account
      </button>
      <button
        className="flex items-center w-full text-left text-sm border-none cursor-pointer"
        style={{
          padding: '8px 12px',
          minHeight: 36,
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-primary)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dropdown-hover-bg)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        onClick={() => {
          setProfileDropdownOpen(false)
          navigate('/users')
        }}
      >
        Manage Users
      </button>
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
      <button
        className="flex items-center w-full text-left text-sm border-none cursor-pointer"
        style={{
          padding: '8px 12px',
          minHeight: 36,
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-primary)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dropdown-hover-bg)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        disabled
      >
        Sign out
      </button>
    </div>
  )}
</div>
```

The "Account" and "Sign out" entries are placeholders (`disabled`) for future auth wiring. Only "Manage Users" is functional this round.

- [ ] **Step 2: Verify in browser**

Run: `npm run dev:shipments`
- Click the avatar block (top-right). Dropdown opens.
- Click "Manage Users". URL changes to `/users`, dropdown closes, Users stub renders.
- Click avatar again, click outside dropdown, dropdown closes.

- [ ] **Step 3: Commit**

```bash
git add apps/shipments/src/components/layout/Navbar.jsx
git commit -m "feat: avatar dropdown with Manage Users entry"
```

---

### Task 7: Update `index.html` title

**Files:**
- Modify: `apps/shipments/index.html`

- [ ] **Step 1: Find current title**

Run: `grep -n '<title>' apps/shipments/index.html`
Expected: prints the current title line.

- [ ] **Step 2: Update title**

Change the `<title>...</title>` to `<title>Odyssey-One</title>` (or keep with branding the user prefers, but `Odyssey-One` is the spec's choice).

- [ ] **Step 3: Commit**

```bash
git add apps/shipments/index.html
git commit -m "chore: update browser tab title to Odyssey-One"
```

---

### Task 8: Verify build succeeds before deploying

- [ ] **Step 1: Run build from root**

Run: `npm run build:shipments`
Expected: build succeeds. No type errors. Output `apps/shipments/dist/` is created.

If build fails: most likely a missing import or a typo in the router config. Fix before deploying.

- [ ] **Step 2: Run preview to sanity-check the production build**

Run: `cd apps/shipments && npm run preview`
Open the printed URL. Visit `/`, `/orders`, `/shipments`. Confirm all render.

If `/orders` returns a 404 in preview (instead of rendering Orders): Vite preview server doesn't serve SPA fallback by default. Add `--spa` flag if the script supports it, OR rely on Vercel's automatic SPA fallback during the actual deploy. Document this and proceed — production deploy will be tested separately in Task 10.

- [ ] **Step 3: Stop preview**

Ctrl-C the preview server.

(No commit; this task is verification only.)

---

## Phase 2 — Vercel pre-rename: pin both domains

This phase is operated by the user in the Vercel dashboard. Claude cannot execute it (MCP returned 403 on this account). Claude waits for confirmation between steps.

### Task 9: Add `odyssey-one.vercel.app` as a custom domain

**Files:** none (Vercel dashboard operation).

- [ ] **Step 1: User opens the project in Vercel dashboard**

Navigate to: https://vercel.com/dashboard → project named `odyssey-shipments` → Settings → Domains.

- [ ] **Step 2: User adds `odyssey-one.vercel.app`**

Click "Add Domain" → enter `odyssey-one.vercel.app` → Add.
Expected: domain appears in the list with status "Valid Configuration." If status is "Invalid": tell Claude what error appears.

- [ ] **Step 3: Verify both URLs serve the current deploy**

Open in browser:
- https://odyssey-shipments.vercel.app — should serve the current shipments app
- https://odyssey-one.vercel.app — should serve the same content

If `odyssey-one.vercel.app` returns 404 or a Vercel placeholder, give it ~1 minute (Vercel propagation) and retry. If still failing, stop here and ask Claude.

(No commit. State change is in the Vercel dashboard.)

---

### Task 10: Pin `odyssey-shipments.vercel.app` as an explicit custom domain

**Files:** none (Vercel dashboard operation).

- [ ] **Step 1: User attempts to add `odyssey-shipments.vercel.app` as a custom domain**

Settings → Domains → Add Domain → enter `odyssey-shipments.vercel.app` → Add.

Three possible outcomes:

  - **Outcome A (best case):** It is added successfully. Both URLs are now explicitly listed; the project name still derives the auto-domain but it is also pinned. Proceed to Task 11.

  - **Outcome B:** Vercel rejects with a duplicate-domain error. Then we cannot pin in advance. Skip to Task 11 with the fallback known: rename will release the auto-domain, and we'll re-add it immediately in Task 12.

  - **Outcome C:** Vercel rejects with a different error. Stop and report to Claude.

- [ ] **Step 2: User reports the outcome to Claude**

Tell Claude which of A / B / C happened and proceed accordingly.

(No commit.)

---

## Phase 3 — Deploy refactored app to existing project (verification deploy)

The refactor is done. Before doing the rename, deploy the refactored app to the still-named-`odyssey-shipments` project to verify nothing broke. This is the safety net: if the refactor has a bug, we catch it before complicating things with the rename.

### Task 11: Deploy from `apps/shipments/`

**Files:** none (CLI operation).

- [ ] **Step 1: Confirm `.vercel/project.json` exists at repo root**

Run: `cat .vercel/project.json`
Expected: prints JSON with `"projectId":"prj_d7bHwlscJ9ZfgcUiEBEv2LbvuGXf"` and `"projectName":"odyssey-shipments"`.

- [ ] **Step 2: Deploy production**

Run: `cd apps/shipments && npx vercel --prod`
Expected: build runs on Vercel, finishes successfully, prints a production URL.

If deploy fails on auth: `npx vercel login` first, then retry.
If deploy fails on git author check: see `progress.md` Phase 6.3 — the author email needs to match the Vercel account owner. Use `git -c user.email=manuyetilee@gmail.com commit --amend --no-edit` if needed (not skipping hooks; just changing author).

- [ ] **Step 3: Verify both URLs serve the new umbrella build**

Open in browser:
- https://odyssey-shipments.vercel.app — should now show Home stub at `/`, sidebar with 5 items
- https://odyssey-one.vercel.app — same as above
- https://odyssey-shipments.vercel.app/shipments — should show the existing shipments app
- https://odyssey-shipments.vercel.app/users — should show Users stub (via direct URL)

If any URL still serves the old single-route app: a rebuild may be needed. Run `npx vercel --prod --force`.

(No commit; this is a deploy verification.)

---

## Phase 4 — Vercel rename + directory rename

Now both URLs are confirmed working with the refactored app. Time to rename.

### Task 12: Rename Vercel project `odyssey-shipments` → `odyssey-one`

**Files:** none (Vercel dashboard operation).

- [ ] **Step 1: User renames the project in dashboard**

Settings → General → Project Name → change to `odyssey-one` → Save.

- [ ] **Step 2: Verify domain list after rename**

Settings → Domains. Expected:
- `odyssey-one.vercel.app` — listed (now also the auto-derived domain)
- `odyssey-shipments.vercel.app` — listed (custom-pinned, if Task 10 Outcome A; otherwise NOT listed yet)

If Outcome A happened in Task 10: proceed to Step 3 of this task.
If Outcome B happened: **immediately** click "Add Domain" and add `odyssey-shipments.vercel.app`. This is the race-window step. Should take seconds.

- [ ] **Step 3: Verify both URLs still serve content**

Open in browser:
- https://odyssey-one.vercel.app — should serve the umbrella build
- https://odyssey-shipments.vercel.app — should serve the same

- [ ] **Step 4: Set `odyssey-one.vercel.app` as primary**

Settings → Domains → click ⋯ menu next to `odyssey-one.vercel.app` → "Set as primary domain."
Expected: a "Primary" badge appears next to it.

(No commit yet. The directory rename and code-side updates happen in subsequent tasks.)

---

### Task 13: Rename directory `apps/shipments` → `apps/odyssey-one`

**Files:**
- Move: `apps/shipments/` → `apps/odyssey-one/`
- Modify: `apps/odyssey-one/package.json` (name field)

- [ ] **Step 1: Stop dev server if running**

Ctrl-C any running `npm run dev:shipments` process. We're moving the directory it's serving from.

- [ ] **Step 2: Rename the directory via `git mv`**

Run: `git mv apps/shipments apps/odyssey-one`
Expected: succeeds silently.

`git mv` preserves history per file. No untracked files inside `apps/shipments/dist/` (gitignored) interfere.

- [ ] **Step 3: Update package name in the moved package.json**

Open `apps/odyssey-one/package.json`. Change:

```json
"name": "shipments",
```

to:

```json
"name": "odyssey-one-app",
```

- [ ] **Step 4: Update root `package.json` script names**

Open `package.json` (repo root). Replace:

```json
"dev:shipments": "turbo run dev --filter=shipments",
"build:shipments": "turbo run build --filter=shipments"
```

with:

```json
"dev:odyssey-one": "turbo run dev --filter=odyssey-one-app",
"build:odyssey-one": "turbo run build --filter=odyssey-one-app"
```

(The filter must match the new package name.)

- [ ] **Step 5: Reinstall dependencies so npm workspaces pick up the move**

Run: `npm install`
Expected: completes without errors. `node_modules` symlinks reflect the new package name.

- [ ] **Step 6: Verify dev server boots from the new path**

Run: `npm run dev:odyssey-one`
Open `http://localhost:5173/`. Verify the umbrella renders, click through all 5 sidebar routes plus `/users`.

If something is broken (likely: an import path, or a script name mismatch): debug and fix before continuing.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: rename apps/shipments to apps/odyssey-one"
```

`-A` is acceptable here because the changes are scoped to the rename and the two package.json files; review the diff before committing if uncertain.

---

### Task 14: Update Vercel project Root Directory setting

**Files:** none (Vercel dashboard operation).

- [ ] **Step 1: User updates Root Directory setting**

Vercel dashboard → project `odyssey-one` → Settings → General → Build & Development Settings → Root Directory.
Currently set to: `apps/shipments`.
Change to: `apps/odyssey-one`.
Save.

- [ ] **Step 2: Confirm change saved**

Settings → General — Root Directory now shows `apps/odyssey-one`.

(No commit.)

---

### Task 15: Final production deploy from new directory

**Files:** none (CLI operation).

- [ ] **Step 1: Deploy from new directory**

Run: `cd apps/odyssey-one && npx vercel --prod`
Expected: deploy succeeds, prints production URL.

The first deploy after a Root Directory change sometimes requires `--force` to bust Vercel's build cache. If the deploy fails with a stale-cache error, run: `npx vercel --prod --force`.

- [ ] **Step 2: Verify both URLs serve the new build**

Open in browser:
- https://odyssey-one.vercel.app — umbrella build, all routes navigable
- https://odyssey-shipments.vercel.app — same content (alias)
- https://odyssey-one.vercel.app/shipments — existing shipments app
- https://odyssey-one.vercel.app/users — Users stub

(No commit; this is deploy verification.)

---

## Phase 5 — Documentation updates

The repo's docs and the user's memory currently reflect the OLD plan ("do not rename Vercel project," `apps/shipments/`, etc.). Flip them to match reality.

### Task 16: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the directory map**

Find the `## Directory map` section in `CLAUDE.md`. Update the tree to reflect:
- `apps/shipments/` → `apps/odyssey-one/`
- Add `apps/odyssey-one/src/routes/` mention
- Update the description from "the Shipments prototype — currently the only built app" to "the umbrella app — Home + Orders + Carriers + Shipments + Tracking + Users routes"

- [ ] **Step 2: Update the "Key commands" section**

Replace:
- `npm run dev:shipments` → `npm run dev:odyssey-one`
- `npm run build:shipments` → `npm run build:odyssey-one`
- `cd apps/shipments && node tools/generate.mjs` → `cd apps/odyssey-one && node tools/generate.mjs`

- [ ] **Step 3: Update the "Deploys" section**

Replace `cd apps/shipments && npx vercel --prod` → `cd apps/odyssey-one && npx vercel --prod`.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for apps/odyssey-one rename"
```

---

### Task 17: Update name-migration tracker

**Files:**
- Modify: `playground/name-migration-tracker.md`

- [ ] **Step 1: Read current tracker**

Read `playground/name-migration-tracker.md` for context.

- [ ] **Step 2: Mark "Vercel pass" steps as done**

Update step status icons:
- Step 9 ("Build `apps/home/`...") — replace with "Refactor `apps/shipments/` → `apps/odyssey-one/` umbrella with 6 routes" — ✅ (done in this session)
- Step 10 ("Create new Vercel project `odyssey-one`") — replace with "Rename existing Vercel project `odyssey-shipments` → `odyssey-one` (in-place, custom-domain pinned)" — ✅
- Step 11 ("Configure rewrites") — replace with "N/A — single-app architecture" — 🚫
- Step 12 ("Rewrites for orders/carriers/tracking") — replace with "N/A — single-app routes handle this" — 🚫
- Step 13 ("Communicate new URL") — ⏳ user-driven

- [ ] **Step 3: Update "Local pass" steps**

Steps 14–16 (local directory rename) — these are now obsolete because the directory was renamed in Task 13. Mark them ✅ (consolidated into Task 13).

- [ ] **Step 4: Update "Intentionally NOT changing" list**

Remove the line: "Vercel project name — stays `odyssey-shipments` so the prototype URL keeps working for current users."
Replace with a note in a new section "Architecture revision (2026-04-28)":

> The original "do not rename Vercel project" decision was reversed. New plan uses custom-domain pinning to preserve the old URL while renaming the project in place. See `docs/superpowers/specs/2026-04-28-odyssey-one-umbrella-design.md` for rationale.

Also remove the line about `apps/shipments/` being untouched and the line about its `package.json` being untouched, since both were touched.

- [ ] **Step 5: Commit**

```bash
git add playground/name-migration-tracker.md
git commit -m "docs: update name-migration tracker for completed rename"
```

---

### Task 18: Update memory `reference_vercel_deployment.md`

**Files:**
- Modify: `~/.claude/projects/-Users-manuelramirez-Documents-iris-Odyssey-Shipments-odyssey-shipments/memory/reference_vercel_deployment.md`

The exact path is the project's auto-memory directory referenced in CLAUDE.md context.

- [ ] **Step 1: Read current memory**

Read the file directly.

- [ ] **Step 2: Update content**

Replace the file's body with:

```markdown
**Live URLs (both serve the same deploy):**
- Primary: https://odyssey-one.vercel.app
- Alias: https://odyssey-shipments.vercel.app (preserved via custom-domain pinning during 2026-04-28 rename)

**Vercel project:** `odyssey-one` (renamed from `odyssey-shipments` on 2026-04-28). Project ID `prj_d7bHwlscJ9ZfgcUiEBEv2LbvuGXf`, team `team_A2F22JK5K8GXKHAih4WQMneq`.

**GitHub repo:** https://github.com/manuela-ramirez-odyssey-iris/odyssey-one (renamed 2026-04-28).

**Vercel account:** personal (`manuyetilee-6094` / manuyetilee@gmail.com).

**Deployment method:** manual via Vercel CLI from `apps/odyssey-one/`. Auto-deploy on `git push` is OFF (see `project_vercel_deploy_via_cli.md`).

**Build command:** `npm run build` (Vite, outputs `dist/`).

**Long-term plan:** all Vercel hosting is temporary — will move to CloudFront + S3 + SSO once Soni provisions company infrastructure.

**How to apply:**
- Canonical URL is now `odyssey-one.vercel.app`.
- For deploys: `cd apps/odyssey-one && npx vercel --prod`.
- The old `odyssey-shipments.vercel.app` URL stays alive indefinitely as an alias (custom-pinned to the same project).
```

Update the frontmatter `description` to reflect the new state:

```yaml
description: Live prototype URLs on Vercel; both odyssey-one.vercel.app (primary) and odyssey-shipments.vercel.app (alias) serve the same single-project umbrella build. Manual CLI deploys.
```

- [ ] **Step 3: No git commit needed**

Memory files are user-scoped, not in the repo.

---

### Task 19: Verify all entry points still work

Final smoke test before declaring the migration done.

- [ ] **Step 1: Run dev server**

Run: `npm run dev:odyssey-one`
Open localhost. Click through all 6 routes. Confirm no console errors.

- [ ] **Step 2: Visit production URLs**

Open in browser:
- https://odyssey-one.vercel.app/
- https://odyssey-one.vercel.app/orders
- https://odyssey-one.vercel.app/carriers
- https://odyssey-one.vercel.app/shipments
- https://odyssey-one.vercel.app/tracking
- https://odyssey-one.vercel.app/users
- https://odyssey-shipments.vercel.app/ (must still work)
- https://odyssey-shipments.vercel.app/shipments (must still work)

For each: confirm the expected route renders, sidebar highlights correctly.

- [ ] **Step 3: Push commits**

Run: `git push origin main`
Expected: all commits from this migration push to GitHub. (Pushing does NOT trigger an auto-deploy — confirmed in `project_vercel_deploy_via_cli.md`.)

- [ ] **Step 4: Check git tree is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean`.

---

## Done

After Task 19 succeeds:
- The umbrella exists with 6 routes; shipments app is preserved at `/shipments`.
- The Vercel project is named `odyssey-one`; both URLs are alive.
- All docs and memories reflect the new state.
- Future work (Home/Orders/Carriers/Tracking real content, Supabase, sidebar normalization, auth on Users) is captured in the spec's "Out of scope" and the existing `progress.md` What's Next list.

The `/wrap` skill (run by the user) appends a Session 15 entry to `progress.md`.

---

## Rollback notes

If anything goes catastrophically wrong:

- **Before Task 12 (Vercel rename):** revert all commits with `git reset --hard <sha-before-task-1>`. The Vercel project hasn't been renamed yet; nothing user-facing changed.
- **After Task 12, before Task 13 (Vercel renamed but directory not yet):** rename the project back in dashboard. Both URLs still work.
- **After Task 13 (directory renamed):** revert the directory-rename commit with `git revert <task-13-sha>`. Then redeploy. The Vercel rename can be undone separately if needed.
- **After Task 15 (full deploy on new structure):** the safest rollback is to rename the Vercel project back AND revert commits. Custom-pinned domains stay attached either way.
