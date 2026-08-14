import { useState } from 'react'
import { ModalMedium, Button } from '@odyssey/ui'

export const meta = {
  name: 'ModalMedium',
  tier: 'organism',
  version: '0.14.0',
  createdVersion: '0.2.0',
  figmaNode: '2032:915',
  codeConnect: 'packages/ui/src/ModalMedium.figma.tsx',
  normalizing: true,
}

export const props = [
  { name: 'title', type: 'string', desc: 'Header title text.' },
  { name: 'children', type: 'ReactNode', desc: 'Content slot — body area.' },
  { name: 'footer', type: 'ReactNode', desc: 'Footer slot — typically Cancel / Save action buttons.' },
  { name: 'onClose', type: '() => void', desc: 'Dismiss handler — wired to ESC key, overlay click, and the header X button.' },
  { name: 'onBack', type: '() => void', desc: 'Optional leading back chevron, rendered before the title when present. Mirrors ModalHeader’s onBack API.' },
  { name: 'scrollableContent', type: 'boolean', desc: 'Implementation-only: removes bottom padding so a scrolling content region runs flush to the footer divider. Default false.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the dialog element.' },
  { name: 'ariaLabel', type: 'string', desc: 'Accessible label override. Defaults to title.' },
]

// Not props on ModalMedium — the navigation-stack contract a CONSUMER implements
// on top of it. Surfaced here because the shell alone does not tell you how to
// build a multi-view modal, and the rig below is the reference implementation.
export const relatedApi = [
  { name: 'modalNavigationStack', type: 'boolean state', desc: 'Consumer state: a second ModalMedium opened over the first as a navigation destination. Gets onBack; pops back to its origin, which stays mounted behind it.' },
  { name: 'nav', type: "null | { dir: 'forward' | 'back', target: 'view' | 'stack' }", desc: 'The last stack transition. Null when none has happened, which keeps the initial open un-animated — opening a modal is not navigating within it. `target` names which surface moved, so a stack push does not hand the animation class to the shell behind it.' },
  { name: '.modal-nav-view', type: 'css class', desc: "Passed to ModalMedium's className so the DIALOG slides as one piece, not its body inside a static frame. Enters from the right; add --back to enter from the left. Needs a React key on the shell (key={view}) or the animation will not replay, since a CSS animation only runs on a fresh element." },
]

export const tokens = [
  { token: '--bg-primary', resolves: 'Background/primary', usage: 'dialog surface' },
  { token: '--bg-secondary', resolves: 'Background/secondary', usage: 'header background' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'header / footer divider lines' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'title text' },
  { token: '--radius-lg', resolves: 'Radius/lg', usage: 'dialog corner radius' },
  { token: '--shadow-lg', resolves: 'Shadow/lg', usage: 'dialog elevation' },
  { token: '--spacing-5', resolves: '20px', usage: 'header / footer / content padding' },
  { token: '--font-size-lg', resolves: '18px', usage: 'title font size (heading-lg)' },
]

// The demo-trigger look, shared by every "open a modal" button in this entry.
// Was copy-pasted inline twice; a third copy for the navigation rig is what
// made it worth naming.
const TRIGGER = {
  padding: 'var(--spacing-2) var(--spacing-4)',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-primary)',
  fontSize: 'var(--font-size-sm)',
  cursor: 'pointer',
}

function ChildLink({ to, children }) {
  return <a href={`#comp-${to}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'underline', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>{children}</a>
}

// Fake sections for the navigation rig — enough shape to feel like the real
// Shipment Details modal without importing it. `action` names which of the
// three exits each section's trailing control takes:
//   swap   — push by REPLACING the body in this shell (1 overlay)
//   stack  — push as a SECOND dialog (2 overlays)   ← modalNavigationStack
//   prompt — terminal decision, no way back
const FLOW_SECTIONS = [
  { key: 'general', title: 'General Information', rows: ['Mode — LTL', 'Gross Weight — 44,470 LB'], action: 'stack', label: 'Modal Navigation Stack' },
  { key: 'cost', title: 'Cost', rows: ['Base — $1,400.00', 'Markup — $100.00'], action: 'swap', label: 'Edit' },
  { key: 'refs', title: 'Customer Reference Values', rows: ['PO Number — PO-5512'], action: 'prompt', label: 'Edit' },
]

export default function ModalMediumDemo() {
  const [open, setOpen] = useState(false)
  const [scrollable, setScrollable] = useState(false)
  // Navigation rig — `view` is the SAME modal showing different content, while
  // `confirmOpen` is a genuinely second dialog. Kept as separate state on
  // purpose: conflating them is the mistake the rig exists to make visible.
  const [flowOpen, setFlowOpen] = useState(false)
  const [view, setView] = useState('details')
  const [confirmOpen, setConfirmOpen] = useState(false)
  // modalNavigationStack — a second dialog that is a navigation DESTINATION
  // rather than a decision, so unlike the prompt it carries a back control.
  const [modalNavigationStack, setModalNavigationStack] = useState(false)
  // The last stack transition: `{ dir, target }`, or null when none has
  // happened. Null is what keeps the initial open un-animated — opening a modal
  // is not navigating within it. `target` names WHICH surface moved, so a stack
  // push does not also hand the animation class to the shell sitting behind it.
  const [nav, setNav] = useState(null)

  const pushView = (next) => { setNav({ dir: 'forward', target: 'view' }); setView(next) }
  const popView = () => { setNav({ dir: 'back', target: 'view' }); setView('details') }
  const pushStack = () => { setNav({ dir: 'forward', target: 'stack' }); setModalNavigationStack(true) }
  const popStack = () => { setNav({ dir: 'back', target: 'stack' }); setModalNavigationStack(false) }

  // Fresh open clears the transition so the shell appears without sliding.
  const openFlow = () => { setNav(null); setView('details'); setFlowOpen(true) }
  const closeFlow = () => { setFlowOpen(false); setView('details'); setConfirmOpen(false); setModalNavigationStack(false); setNav(null) }

  // The live navigation stack, derived from the same state that drives the
  // dialogs — so the inspector below cannot drift from what is on screen.
  // `push` is how this level got here; `overlay` is whether it added one.
  const stack = []
  if (flowOpen) {
    stack.push({ title: 'Shipment Details', push: 'root', overlay: true, onBack: false, footer: false })
    if (view === 'quote') {
      stack.push({ title: 'Edit Quote', push: 'swap — body replaced in the same shell', overlay: false, onBack: true, footer: true })
    }
  }
  if (modalNavigationStack) stack.push({ title: 'Modal Navigation Stack', push: 'stack — second dialog, later sibling', overlay: true, onBack: true, footer: true })
  if (confirmOpen) stack.push({ title: 'Unsaved changes', push: 'stack — second dialog, later sibling', overlay: true, onBack: false, footer: true })
  const overlays = stack.filter((s) => s.overlay).length

  // Slide class for the MODAL entering a stack level — passed to ModalMedium's
  // `className`, so the dialog moves as one piece rather than its body sliding
  // inside a static frame. Returns '' unless THIS surface is the one that just
  // moved, so an untouched shell never carries a transition class it isn't part
  // of.
  const navClassFor = (target) => (nav?.target === target
    ? `modal-nav-view${nav.dir === 'back' ? ' modal-nav-view--back' : ''}`
    : '')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Content-sized confirmation and short-workflow dialog (width auto, min 350px / max 780px;
        height auto capped at 90vh — past the cap the content slot scrolls). Shares the same overlay + ESC / backdrop-dismiss
        pattern as ModalLarge but has no subtitle and uses a larger heading style. The
        <code>scrollableContent</code> flag removes body padding so a scrolling region seats flush
        against the footer divider.
      </p>

      {/* Header provenance (2026-08-12). Recorded here because two people in a row
          assumed the back chevron was missing from the design system — it never was;
          it was missing from THIS shell. Worth a dev seeing before they add the next
          header capability in the wrong place. */}
      <div
        className="ds-demo-section"
        style={{ borderLeft: '3px solid var(--border-default)', paddingLeft: 'var(--spacing-4)' }}
      >
        <h4 className="ds-demo-section__title">Header provenance — read before extending</h4>
        <p style={{ margin: '0 0 var(--spacing-3)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-md)' }}>
          <strong>Figma composes this shell from{' '}
          <ChildLink to="ModalHeader">ModalHeader</ChildLink></strong> (node <code>2032:915</code> ={' '}
          ModalHeader instance + Content slot + ModalFooter instance). <strong>The code does not.</strong>{' '}
          Both the React and Angular <code>ModalMedium</code> hand-roll a simpler header — title + close X —
          rather than composing the molecule.
        </p>
        <p style={{ margin: '0 0 var(--spacing-3)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-md)' }}>
          So the header capabilities below live in <ChildLink to="ModalHeader">ModalHeader</ChildLink> and are{' '}
          <strong>not reachable from this shell</strong>: an editable title (<code>editableTitle</code> → pencil,
          used by ColumnPanel's rename) and a <code>subtitle</code>. <code>onBack</code> was in the same
          position until 2026-08-12, when the Shipment Details modal needed in-modal navigation and it was
          added here directly — mirroring ModalHeader's API rather than composing it, to keep the change
          contained.
        </p>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-md)' }}>
          <strong>If you need a subtitle or an editable title, do not add them here.</strong> Use{' '}
          <ChildLink to="ModalHeader">ModalHeader</ChildLink> (see{' '}
          <ChildLink to="RightPanel">RightPanel</ChildLink>, which composes it properly) or resolve the
          drift by making this shell compose it too. Adding a third one-off prop deepens the duplication.
        </p>
        <p style={{ margin: 'var(--spacing-3) 0 0', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-md)' }}>
          <strong>Angular naming differs, deliberately.</strong> The Angular twin&apos;s ModalHeader already
          ships <code>[showBack]</code> + <code>(back)</code> — matching Figma&apos;s <code>Show Back</code>{' '}
          boolean. React&apos;s presence-gated <code>onBack</code> is the odd one out, and that divergence
          predates this change. <strong>Port <code>ModalMedium</code> using{' '}
          <code>[showBack]</code>/<code>(back)</code>, not <code>onBack</code></strong>, to stay consistent
          with the rest of the Angular library.
        </p>
      </div>

      {/* Navigation-stack rig (2026-08-12) — a working stand-in for the Shipment
          Details modal, which is what `onBack` was added for.

          The stack here is a NAVIGATION stack, not a visual one. Edit Quote is
          PUSHED on top of Shipment Details conceptually — that relationship is
          the entire reason the back chevron exists, it is what tells the user
          "you came from somewhere and can return". But it renders by REPLACING
          the body in the same shell (user, 2026-08-11: "replace, not overlap"),
          so there is one overlay, not two.

          That distinction is the thing to feel here: depth 2 in the stack does
          NOT mean two dialogs on screen. The unsaved-changes prompt is the only
          genuinely stacked dialog in the real modal, and it is included so the
          two are directly comparable. */}
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — the Shipment Details navigation stack</h4>
        <p style={{ margin: '0 0 var(--spacing-3)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-md)' }}>
          A stand-in for the real modal. <strong>Edit on <em>Cost</em> pushes <em>Edit Quote</em> onto the
          stack</strong> — the title changes and <code>onBack</code> appears, because the view on top has
          somewhere to return to. Back pops it. <strong>The push does not open a second dialog:</strong>{' '}
          the body is replaced in the same shell, so the backdrop darkens once and the X closes the whole
          thing from either depth.
        </p>
        <p style={{ margin: '0 0 var(--spacing-3)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-md)' }}>
          A push can also render as a <strong>real second dialog</strong> — the{' '}
          <em>Modal Navigation Stack</em> control on General Information does that. It carries{' '}
          <code>onBack</code> for the same reason the swap does:
          you navigated there and can return. <strong>The back chevron tracks the navigation
          relationship, not the rendering.</strong> Which rendering to choose is a design call about
          whether the origin should stay visible behind; Shipment Details chose the swap.
        </p>
        <p style={{ margin: '0 0 var(--spacing-3)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-md)' }}>
          The <strong>unsaved-changes prompt</strong> (Edit on the other two sections) is the counter-case:
          also stacked, but <strong>no back</strong> — it is a decision you must answer, not a place you
          went. Watch <code>overlays</code> below: <strong>1</strong> for the swap, <strong>2</strong> for
          either stack. Both overlays sit at <code>z-index: 200</code>, so DOM order alone decides which
          wins — there is no per-modal z-index to tune.
        </p>
        {/* Live stack inspector. Derived from the SAME state the dialogs render
            from, so it cannot claim something the screen contradicts. Exists
            because the API is the thing a dev needs to see: which level got
            `onBack`, and whether the push cost an overlay. */}
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-3)', padding: 'var(--spacing-2) var(--spacing-3)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-label-sm-semibold" style={{ color: 'var(--text-primary)' }}>Live navigation stack</span>
            <span style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
              depth <strong style={{ color: 'var(--text-primary)' }}>{stack.length}</strong>
              {'  ·  '}overlays{' '}
              <strong style={{ color: overlays > 1 ? 'var(--text-error)' : 'var(--text-primary)' }}>{overlays}</strong>
            </span>
          </div>

          {stack.length === 0 ? (
            <div style={{ padding: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
              Nothing open. Open Shipment Details from Interactive below, and the stack fills in as you navigate.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr max-content max-content', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
              {['', 'title / how it got here', 'onBack', 'overlay'].map((h) => (
                <span key={h} style={{ padding: 'var(--spacing-2) var(--spacing-3)', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</span>
              ))}
              {stack.map((s, i) => {
                const cell = { padding: 'var(--spacing-2) var(--spacing-3)', borderBottom: i === stack.length - 1 ? 'none' : '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }
                const top = i === stack.length - 1
                return (
                  <div key={s.title} style={{ display: 'contents' }}>
                    <span style={{ ...cell, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {i + 1}{top && stack.length > 1 ? ' ◀ top' : ''}
                    </span>
                    <span style={{ ...cell, color: 'var(--text-primary)' }}>
                      <strong>{s.title}</strong>
                      <span style={{ color: 'var(--text-tertiary)' }}>{'  —  '}{s.push}</span>
                    </span>
                    <span style={{ ...cell, textAlign: 'center', color: s.onBack ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      {s.onBack ? '✓ fn' : 'undefined'}
                    </span>
                    <span style={{ ...cell, textAlign: 'center', color: s.overlay ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      {s.overlay ? '+1' : 'reuses'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p style={{ margin: 'var(--spacing-3) 0 0', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-md)' }}>
          Read the two right-hand columns together — that is the whole API.{' '}
          <strong>Depth 2 with <code>overlay: reuses</code></strong> is the swap: a level in the stack that
          did <em>not</em> add a dialog. <strong>Depth 2 with <code>overlay: +1</code></strong> is a real
          stack. <code>onBack</code> is set on every level that has somewhere to return to, in both
          renderings — and left <code>undefined</code> on the prompt, which is terminal.
        </p>
      </div>

      {flowOpen && (
        <ModalMedium
          /* key on the view: a CSS animation only replays on a fresh element,
             and the shell is otherwise the same node across a swap. */
          key={view}
          className={navClassFor('view')}
          title={view === 'quote' ? 'Edit Quote' : 'Shipment Details'}
          ariaLabel={view === 'quote' ? 'Edit Quote' : 'Shipment Details'}
          onClose={closeFlow}
          /* Presence-gated: only the nested view offers a way back. */
          onBack={view === 'quote' ? popView : undefined}
          footer={view === 'quote' ? (
            <>
              <Button variant="secondary" onClick={popView}>Cancel</Button>
              <Button variant="primary" onClick={popView}>Save Quote</Button>
            </>
          ) : null}
        >
          {view === 'quote' ? (
            <div style={{ display: 'grid', gap: 'var(--spacing-3)', minWidth: 380 }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Stand-in for the quote form. The point of this view is the header: title changed,
                a back chevron appeared, and the X still closes everything.
              </span>
              {['Base Rate', 'Markup'].map((label) => (
                <div key={label} style={{ display: 'grid', gap: 'var(--spacing-1)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{label}</span>
                  <div style={{ height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--spacing-4)', minWidth: 380 }}>
              {FLOW_SECTIONS.map((s) => (
                <div key={s.key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-2)' }}>
                    <span className="text-label-base-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (s.action === 'swap') pushView('quote')
                        else if (s.action === 'stack') pushStack()
                        else setConfirmOpen(true)
                      }}
                    >
                      {s.label}
                    </Button>
                  </div>
                  {s.rows.map((r) => (
                    <div key={r} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{r}</div>
                  ))}
                </div>
              ))}
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                One control per section, one exit each: <strong>Modal Navigation Stack</strong> pushes a
                second dialog (back, 2 overlays) · <em>Cost</em>&apos;s Edit pushes by replacing this body
                (back, 1 overlay) · <em>Customer Reference Values</em>&apos; Edit raises the terminal
                prompt (no back, 2 overlays).
              </span>
            </div>
          )}
        </ModalMedium>
      )}

      {/* STACKED + BACK — the second dialog is a navigation DESTINATION, so it
          carries `onBack`. Back pops just this dialog and leaves the one behind
          it open; the X closes only this dialog too (the shell underneath owns
          its own close). This is the "modal on top knows where it came from"
          case — the same relationship as the Cost push, rendered the other way.
          Both renderings are legitimate; which one to use is a design call
          about whether the origin should stay visible behind. */}
      {modalNavigationStack && (
        <ModalMedium
          className={navClassFor('stack')}
          title="Modal Navigation Stack"
          ariaLabel="Modal Navigation Stack"
          onBack={popStack}
          onClose={popStack}
          footer={
            <>
              <Button variant="secondary" onClick={popStack}>Cancel</Button>
              <Button variant="primary" onClick={popStack}>Save</Button>
            </>
          }
        >
          <p style={{ margin: 0, maxWidth: 400, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-md)' }}>
            A <strong>second</strong> ModalMedium, opened on top of Shipment Details — which is still
            behind this one, and the backdrop has darkened twice. It carries a{' '}
            <strong>back chevron</strong> because it is somewhere you <em>navigated to</em>, not a
            decision you must answer: back pops this dialog and returns you to what you came from.
            Contrast the unsaved-changes prompt, which is terminal and has no back.
          </p>
        </ModalMedium>
      )}

      {/* The stacked dialog — a LATER SIBLING, which is the whole mechanism.
          Move it above the flow modal in this file and it renders behind. */}
      {confirmOpen && (
        <ModalMedium
          title="Unsaved changes"
          ariaLabel="Unsaved changes"
          onClose={() => setConfirmOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Discard Changes</Button>
              <Button variant="primary" onClick={() => setConfirmOpen(false)}>Save Changes</Button>
            </>
          }
        >
          <p style={{ margin: 0, maxWidth: 380, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-md)' }}>
            A second ModalMedium over the first. Note the backdrop has darkened twice — that is how
            you tell a stack from a navigation at a glance.
          </p>
        </ModalMedium>
      )}

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — open / close</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col">
            <button
              type="button"
              onClick={() => { setScrollable(false); setOpen(true) }}
              style={TRIGGER}
            >
              Open ModalMedium
            </button>
            <span className="ds-demo-label">scrollableContent = false</span>
          </div>
          <div className="ds-demo-col">
            <button
              type="button"
              onClick={() => { setScrollable(true); setOpen(true) }}
              style={TRIGGER}
            >
              Open ModalMedium (scrollable)
            </button>
            <span className="ds-demo-label">scrollableContent = true</span>
          </div>
          <div className="ds-demo-col">
            <button
              type="button"
              onClick={openFlow}
              style={TRIGGER}
            >
              Open Shipment Details
            </button>
            <span className="ds-demo-label">onBack + modalNavigationStack</span>
          </div>
        </div>
      </div>

      {open && (
        <ModalMedium
          title="Confirm Action"
          scrollableContent={scrollable}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>Save</Button>
            </>
          }
        >
          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-md)' }}>
            {scrollable ? (
              <div style={{ maxHeight: 180, overflowY: 'auto', paddingRight: 'var(--spacing-2)' }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <p key={i} style={{ margin: '0 0 var(--spacing-3)' }}>
                    Scrollable content row {i + 1} — this region scrolls independently while the header
                    and footer stay anchored.
                  </p>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0 }}>
                Are you sure you want to proceed? This action cannot be undone. Close via the X button,
                clicking outside the dialog, or pressing{' '}
                <kbd style={{ fontFamily: 'monospace', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 'var(--radius-sm)' }}>Esc</kbd>.
              </p>
            )}
          </div>
        </ModalMedium>
      )}
    </div>
  )
}
