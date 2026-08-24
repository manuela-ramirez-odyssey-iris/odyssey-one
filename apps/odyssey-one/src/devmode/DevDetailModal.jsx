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

export default function DevDetailModal({ name, element = null, onInspect = () => {}, onClose }) {
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

      {/* Hierarchy — where this instance sits, and HOW it got there. `slot`
          means the parent was handed it (children / an element-valued prop);
          `internal` means the parent's own render created it. Each ancestor
          row re-targets this modal (the job the hover breadcrumb used to do,
          with room to actually read it). */}
      {chain.length > 0 && (
        <section className="devmode-detail__section">
          <h4 className="devmode-detail__column-title">Hierarchy</h4>
          <ol className="devmode-detail__chain">
            {chain.map((entry, i) => (
              <li
                key={`${entry.name}-${i}`}
                className={
                  i === selectedIndex ? 'devmode-detail__chain-row devmode-detail__chain-row--current' : 'devmode-detail__chain-row'
                }
                style={{ paddingLeft: i * 12 }}
              >
                {i > 0 && (
                  <span className={`devmode-detail__relation devmode-detail__relation--${entry.relation}`}>
                    {entry.relation}
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
            ))}
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

      {info.react && (
        <table className="devmode-detail__props">
          <caption className="devmode-detail__column-title devmode-detail__caption">API</caption>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {info.react.props.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{p.type}</td>
                <td>{p.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalMedium>
    </div>,
    document.body,
  )
}
