// Dev-mode component detail modal — opened by clicking a DevOverlay chip.
// Renders nothing when `name` is null.
//
// Portaled to document.body (same pattern as DiscardChangesModal/QuoteModal/
// etc.) so it stacks above whatever route/dialog is on screen rather than
// inheriting that subtree's stacking context.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ModalMedium } from '@odyssey/ui'
import { getComponentInfo, dsmUrl } from './componentInfo.js'
import { describeChain, elementTypeName, isReactElement } from './inspect.js'
import { useDevMode } from './useDevMode.js'
import './devmode.css'

// Instance values are rendered small and flat — this modal answers "which
// variant is THIS button, is it disabled", not "dump the whole prop graph".
const MAX_VALUE_CHARS = 80

function truncate(text) {
  return text.length > MAX_VALUE_CHARS ? `${text.slice(0, MAX_VALUE_CHARS - 1)}…` : text
}

// Props hold whatever the app put there — circular objects, getters that
// throw, exotic wrappers. Never let a dev overlay throw during render.
function formatPropValue(propName, value) {
  try {
    // `children` is a whole subtree; expanding it would swamp the table and
    // the hierarchy section already shows what's inside.
    if (propName === 'children') return '<ReactNode>'
    if (typeof value === 'string') return truncate(JSON.stringify(value))
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value)
    // The prop NAME is the useful half of a handler ("has onClick"), not its body.
    if (typeof value === 'function') return 'ƒ'
    if (isReactElement(value)) return `<${elementTypeName(value.type)}/>`
    if (typeof value === 'object') {
      const json = JSON.stringify(value)
      return json === undefined ? '…' : truncate(json)
    }
    return truncate(String(value))
  } catch {
    return '…'
  }
}

// Rendered vocabulary for `relation`, keyed off what the evidence actually
// proves (see inspect.js's relationBetween comment) — NOT what a reader might
// assume from a shorter word. 'internal' in particular reads as "part of the
// parent's implementation" but the underlying check can't distinguish that
// from a render-prop callback (e.g. a DataTable column's `cell`) that the app
// supplied and the parent merely invoked — so the label says "rendered
// inside" and the title spells out the caveat.
const RELATION_LABELS = {
  slot: (parent) => ({
    text: 'in slot',
    title: `Passed into ${parent} as an element prop (children or another prop) — the parent doesn't own it.`,
  }),
  internal: (parent) => ({
    text: 'rendered inside',
    title: `Created during ${parent}'s render. Includes elements produced by render-prop callbacks the app supplies (e.g. table cell renderers), which the parent merely invokes — so this does not always mean the component is part of ${parent}'s own implementation.`,
  }),
  unknown: (parent) => ({
    text: 'unclear',
    title: `Could not be determined — the element was cloned or rebuilt between ${parent} and here.`,
  }),
}

// Live props of the clicked instance, ordered so the answer to "which variant
// / is it disabled" comes first: documented props in the API table's own
// order, then everything else (className, data-*, handlers) in a muted group.
// An absent documented prop is simply omitted — the API table already carries
// its default, and inventing one here would claim a value React never saw.
function instanceRows(props, apiProps = []) {
  if (!props) return []
  const documentedOrder = new Map(apiProps.map((p, i) => [p.name, i]))
  return Object.entries(props)
    .filter(([, value]) => value !== undefined)
    .map(([propName, value]) => ({
      name: propName,
      value: formatPropValue(propName, value),
      documented: documentedOrder.has(propName),
    }))
    .sort((a, b) => {
      if (a.documented !== b.documented) return a.documented ? -1 : 1
      // Array#sort is stable, so undocumented props keep their insertion order.
      return a.documented ? documentedOrder.get(a.name) - documentedOrder.get(b.name) : 0
    })
}

// Picks which side's API table to show, honoring the selected framework —
// but Angular ports don't all document props yet (or aren't ported at all),
// so an empty/missing Angular side falls back to React's table rather than
// showing nothing. `fallback: true` drives the visible note explaining why a
// React table is showing under an Angular framework selection.
function pickApiTable(info, framework) {
  if (framework === 'angular') {
    if (info.angular?.props?.length > 0) {
      return { label: 'Angular API', props: info.angular.props, fallback: false }
    }
    return info.react ? { label: 'React API', props: info.react.props || [], fallback: true } : null
  }
  return info.react ? { label: 'React API', props: info.react.props || [], fallback: false } : null
}

// Names that exist on only one side — the whole point of showing both
// frameworks is making this divergence visible, regardless of which table is
// currently on screen. Only meaningful when BOTH sides have a documented API
// (an unported/no-demo component isn't a "divergence", it's just missing).
function divergingPropNames(info) {
  if (!info.react || !info.angular) return null
  const reactNames = new Set((info.react.props || []).map((p) => p.name))
  const angularNames = new Set((info.angular.props || []).map((p) => p.name))
  const onlyReact = [...reactNames].filter((n) => !angularNames.has(n))
  const onlyAngular = [...angularNames].filter((n) => !reactNames.has(n))
  if (onlyReact.length === 0 && onlyAngular.length === 0) return null
  return { onlyReact, onlyAngular }
}

export default function DevDetailModal({ name, element = null, onInspect = () => {}, onClose }) {
  const { framework } = useDevMode()
  const [info, setInfo] = useState(null)
  // Ref so the load effect only depends on `name` — DevMode's onClose is a
  // fresh arrow fn every render, and re-running the fetch on every unrelated
  // re-render would be wrong; this always calls the LATEST onClose.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!name) {
      setInfo(null)
      return
    }
    let cancelled = false
    getComponentInfo(name)
      .then((result) => {
        if (!cancelled) setInfo(result)
      })
      .catch(() => {
        // componentInfo.js explicitly designs for this (e.g. a stale chunk
        // reference after a redeploy) and retries on the NEXT call — so
        // don't leave a dead, stuck-loading modal open. Close it; the chip
        // is still there to click again.
        if (!cancelled) onCloseRef.current()
      })
    return () => {
      cancelled = true
    }
  }, [name])

  // ponytail: a SNAPSHOT taken when the modal opens (or re-targets) — values
  // do not live-update while it's on screen. Re-opening the chip is the
  // refresh. Fibers are re-walked from the DOM element here rather than held
  // in state, because React swaps current/alternate on every re-render and a
  // stored fiber goes stale. Deliberately NOT on the hover path: this walks
  // the ancestors' whole props trees, and hover runs per animation frame.
  const chain = useMemo(() => (element ? describeChain(element) : []), [element])
  // Nearest entry carrying the inspected name — with a repeated component in
  // one chain (Button inside Button), the innermost one is what was clicked.
  const selectedIndex = chain.findLastIndex((entry) => entry.name === name)
  const rows = instanceRows(chain[selectedIndex]?.props, info?.react?.props)

  if (!name || !info) return null

  const reactUrl = dsmUrl(name, 'react')
  const angularUrl = dsmUrl(name, 'angular')
  const apiTable = pickApiTable(info, framework)
  const divergence = divergingPropNames(info)

  return createPortal(
    // data-devmode: marks this whole subtree as devtool chrome, not
    // inspectable product UI. DevOverlay's own guards (hover elementFromPoint
    // + all-mode walk) skip anything under this attribute — otherwise the
    // overlay would chip its own ModalMedium (e.g. landing a chip on the
    // close X, whose click re-opens this same modal for "ModalMedium").
    <div data-devmode="true">
    <ModalMedium
      title={`${name} · ${info.angular ? info.angular.selector : 'not ported'}`}
      onClose={onClose}
      ariaLabel={`${name} component details`}
      footer={
        <>
          <a className="devmode-detail__link" href={reactUrl}>
            Open in React DSM
          </a>
          {angularUrl ? (
            <a className="devmode-detail__link" href={angularUrl} target="_blank" rel="noopener">
              Open in Angular DSM
            </a>
          ) : (
            <span
              className="devmode-detail__link devmode-detail__link--disabled"
              title="Angular DSM not published yet"
            >
              Open in Angular DSM
            </span>
          )}
        </>
      }
    >
      <div className="devmode-detail__columns">
        <div className="devmode-detail__column">
          <h4 className="devmode-detail__column-title">React</h4>
          {info.react ? (
            <p className="devmode-detail__column-body">
              {info.react.tier} · {info.react.version}
              {info.react.normalizing && (
                <span className="devmode-badge-normalizing">NORMALIZING</span>
              )}
            </p>
          ) : (
            <p className="devmode-detail__muted">no React demo</p>
          )}
        </div>
        <div className="devmode-detail__column">
          <h4 className="devmode-detail__column-title">Angular</h4>
          {info.angular ? (
            <p className="devmode-detail__column-body">
              {info.angular.selector} · {info.angular.version}
              {info.angular.normalizing && (
                <span className="devmode-badge-normalizing">NORMALIZING</span>
              )}
            </p>
          ) : (
            <p className="devmode-detail__muted">not ported</p>
          )}
        </div>
      </div>

      {/* Hierarchy — where this instance sits, and HOW it got there. "in
          slot" means the parent was handed it (children / an element-valued
          prop); "rendered inside" means the parent's own render created it —
          which includes render-prop callbacks the app supplied (see
          RELATION_LABELS above), so it does NOT always mean "part of the
          parent's implementation". Each ancestor row re-targets this modal
          (the job the hover breadcrumb used to do, with room to actually
          read it). */}
      {chain.length > 0 && (
        <section className="devmode-detail__section">
          <h4 className="devmode-detail__column-title">Hierarchy</h4>
          <ol className="devmode-detail__chain">
            {chain.map((entry, i) => {
              const relation = i > 0 ? RELATION_LABELS[entry.relation](chain[i - 1].name) : null
              return (
              <li
                key={`${entry.name}-${i}`}
                className={
                  i === selectedIndex ? 'devmode-detail__chain-row devmode-detail__chain-row--current' : 'devmode-detail__chain-row'
                }
                style={{ paddingLeft: i * 12 }}
              >
                {relation && (
                  <span
                    className={`devmode-detail__relation devmode-detail__relation--${entry.relation}`}
                    title={relation.title}
                  >
                    {relation.text}
                  </span>
                )}
                {i === selectedIndex ? (
                  <span className="devmode-detail__chain-name">{entry.name}</span>
                ) : (
                  <button
                    type="button"
                    className="devmode-detail__chain-name devmode-detail__chain-link"
                    onClick={() => onInspect(entry.name, entry.element)}
                  >
                    {entry.name}
                  </button>
                )}
              </li>
              )
            })}
          </ol>
        </section>
      )}

      {rows.length > 0 && (
        <section className="devmode-detail__section">
          <h4 className="devmode-detail__column-title">This instance</h4>
          <table className="devmode-detail__props">
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className={row.documented ? undefined : 'devmode-detail__instance-row--other'}>
                  <td>{row.name}</td>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {apiTable && (
        <>
          <table className="devmode-detail__props">
            <caption className="devmode-detail__column-title devmode-detail__caption">{apiTable.label}</caption>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {apiTable.props.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.type}</td>
                  <td>{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {apiTable.fallback && (
            <p className="devmode-detail__muted devmode-detail__api-fallback">
              No Angular props documented — showing React API.
            </p>
          )}
        </>
      )}

      {/* Divergence hint — the point of showing both frameworks: a prop name
          that only exists on one side is exactly what a dev switching
          frameworks needs to know about, whether or not that side's table is
          the one currently on screen. */}
      {divergence && (
        <p className="devmode-detail__muted devmode-detail__divergence">
          {divergence.onlyReact.length > 0 && `Only in React: ${divergence.onlyReact.join(', ')}`}
          {divergence.onlyReact.length > 0 && divergence.onlyAngular.length > 0 && ' · '}
          {divergence.onlyAngular.length > 0 && `Only in Angular: ${divergence.onlyAngular.join(', ')}`}
        </p>
      )}
    </ModalMedium>
    </div>,
    document.body,
  )
}
