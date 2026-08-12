import { useState } from 'react'
import { ModalMedium, Button } from '@odyssey/ui'

export const meta = {
  name: 'ModalMedium',
  tier: 'organism',
  version: '0.10.0',
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

function ChildLink({ to, children }) {
  return <a href={`#comp-${to}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'underline', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>{children}</a>
}

// Fake sections for the navigation rig — enough shape to feel like the real
// Shipment Details modal without importing it.
const FLOW_SECTIONS = [
  { key: 'general', title: 'General Information', rows: ['Mode — LTL', 'Gross Weight — 44,470 LB'] },
  { key: 'cost', title: 'Cost', rows: ['Base — $1,400.00', 'Markup — $100.00'], navigates: true },
  { key: 'refs', title: 'Customer Reference Values', rows: ['PO Number — PO-5512'] },
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
  // A second dialog that is a navigation DESTINATION rather than a decision —
  // so unlike the prompt, it carries a back control.
  const [stackedOpen, setStackedOpen] = useState(false)

  const closeFlow = () => { setFlowOpen(false); setView('details'); setConfirmOpen(false); setStackedOpen(false) }
  const overlays = (flowOpen ? 1 : 0) + (confirmOpen ? 1 : 0) + (stackedOpen ? 1 : 0)

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
          A push can also render as a <strong>real second dialog</strong> — <em>Open stacked view</em>{' '}
          inside the modal does that. It carries <code>onBack</code> for the same reason the swap does:
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
        <div className="ds-demo-row">
          <div className="ds-demo-col">
            <Button variant="secondary" onClick={() => { setView('details'); setFlowOpen(true) }}>
              Open Shipment Details
            </Button>
          </div>
          <div className="ds-demo-col">
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              stack:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {!flowOpen ? '—' : view === 'quote' ? 'Shipment Details › Edit Quote' : 'Shipment Details'}
              </strong>
              {'  ·  '}overlays:{' '}
              <strong style={{ color: overlays > 1 ? 'var(--text-error)' : 'var(--text-primary)' }}>{overlays}</strong>
            </span>
          </div>
        </div>
      </div>

      {flowOpen && (
        <ModalMedium
          title={view === 'quote' ? 'Edit Quote' : 'Shipment Details'}
          ariaLabel={view === 'quote' ? 'Edit Quote' : 'Shipment Details'}
          onClose={closeFlow}
          /* Presence-gated: only the nested view offers a way back. */
          onBack={view === 'quote' ? () => setView('details') : undefined}
          footer={view === 'quote' ? (
            <>
              <Button variant="secondary" onClick={() => setView('details')}>Cancel</Button>
              <Button variant="primary" onClick={() => setView('details')}>Save Quote</Button>
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
                      onClick={() => (s.navigates ? setView('quote') : setConfirmOpen(true))}
                    >
                      Edit
                    </Button>
                  </div>
                  {s.rows.map((r) => (
                    <div key={r} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{r}</div>
                  ))}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" onClick={() => setStackedOpen(true)}>
                  Open stacked view (has back)
                </Button>
              </div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                Three ways out of here, all on this page: Edit on <em>Cost</em> pushes by REPLACING
                (back, 1 overlay) · the button above pushes by STACKING (back, 2 overlays) · Edit on the
                other two raises the prompt (no back, 2 overlays).
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
      {stackedOpen && (
        <ModalMedium
          title="Stacked View"
          ariaLabel="Stacked View"
          onBack={() => setStackedOpen(false)}
          onClose={() => setStackedOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setStackedOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setStackedOpen(false)}>Save</Button>
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
              style={{
                padding: 'var(--spacing-2) var(--spacing-4)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
              }}
            >
              Open ModalMedium
            </button>
            <span className="ds-demo-label">scrollableContent = false</span>
          </div>
          <div className="ds-demo-col">
            <button
              type="button"
              onClick={() => { setScrollable(true); setOpen(true) }}
              style={{
                padding: 'var(--spacing-2) var(--spacing-4)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
              }}
            >
              Open ModalMedium (scrollable)
            </button>
            <span className="ds-demo-label">scrollableContent = true</span>
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
