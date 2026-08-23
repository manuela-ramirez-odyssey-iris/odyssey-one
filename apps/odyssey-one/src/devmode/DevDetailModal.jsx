// Dev-mode component detail modal — opened by clicking a DevOverlay chip.
// Renders nothing when `name` is null.
//
// Portaled to document.body (same pattern as DiscardChangesModal/QuoteModal/
// etc.) so it stacks above whatever route/dialog is on screen rather than
// inheriting that subtree's stacking context.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ModalMedium } from '@odyssey/ui'
import { getComponentInfo, dsmUrl } from './componentInfo.js'
import './devmode.css'

export default function DevDetailModal({ name, onClose }) {
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

      {info.react && (
        <table className="devmode-detail__props">
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
