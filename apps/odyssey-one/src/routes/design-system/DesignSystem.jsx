import { useState } from 'react'
import { TIERS, groupDemosByTier, collectNormalizing } from './collectDemos.js'
import './DesignSystem.css'

// Eagerly collect every co-located demo. Adding a new component to the
// explorer = adding one ./demos/<Component>.demo.jsx — no edit here.
const modules = import.meta.glob('./demos/*.demo.jsx', { eager: true })
const tiers = groupDemosByTier(modules)
const normalizing = collectNormalizing(modules)

// The Normalize panel is a pseudo-tier appended after the real tiers.
const NORMALIZE_KEY = '__normalize__'

const FIGMA_FILE =
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP'

function figmaUrl(node) {
  if (!node) return null
  return `${FIGMA_FILE}?node-id=${node.replace(':', '-')}`
}

function DetailsPanel({ meta, props, tokens }) {
  const url = figmaUrl(meta.figmaNode)
  return (
    <div className="ds-details">
      <div className="ds-details__refs">
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer">
            Figma {meta.figmaNode}
          </a>
        )}
        {meta.codeConnect && <code>{meta.codeConnect}</code>}
      </div>

      {props.length > 0 && (
        <div className="ds-details__block">
          <h3 className="ds-details__title">Props</h3>
          <table className="ds-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              {props.map((p) => (
                <tr key={p.name}>
                  <td><code>{p.name}</code></td>
                  <td><code>{p.type}</code></td>
                  <td>{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tokens.length > 0 && (
        <div className="ds-details__block">
          <h3 className="ds-details__title">Token contract</h3>
          <table className="ds-table">
            <thead>
              <tr><th>Token</th><th>Resolves</th><th>Usage</th></tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.token}>
                  <td><code>{t.token}</code></td>
                  <td>{t.resolves}</td>
                  <td>{t.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// One component section — used by both the tier lists and the Normalize panel.
function DemoSection({ meta, props, tokens, Component, open, onToggle, normalizing: isNormalizing }) {
  return (
    <section className="ds-comp">
      <div className="ds-comp__head">
        <div className="ds-comp__heading">
          <h2 className="ds-comp__name">{meta.name}</h2>
          {isNormalizing && <span className="ds-comp__pill">NORMALIZING</span>}
        </div>
        <button
          type="button"
          className="ds-comp__toggle"
          aria-expanded={open}
          onClick={onToggle}
        >
          {open ? 'Hide details' : 'Details'}
        </button>
      </div>

      <div className="ds-comp__demo">
        <Component />
      </div>

      {open && <DetailsPanel meta={meta} props={props} tokens={tokens} />}
    </section>
  )
}

export default function DesignSystem() {
  const hasNormalizing = normalizing.length > 0
  // When something is in progress, open the Normalize panel by default so it's
  // immediately visible; otherwise fall back to the first tier (Atoms).
  const [activeTier, setActiveTier] = useState(hasNormalizing ? NORMALIZE_KEY : TIERS[0].key)
  const [openDetails, setOpenDetails] = useState(null) // meta.name | null
  const onNormalize = activeTier === NORMALIZE_KEY
  const active = onNormalize ? null : tiers.find((t) => t.key === activeTier)

  const renderSection = (demo) => (
    <DemoSection
      key={demo.meta.name}
      {...demo}
      open={openDetails === demo.meta.name}
      onToggle={() => setOpenDetails(openDetails === demo.meta.name ? null : demo.meta.name)}
      normalizing={demo.meta.normalizing === true}
    />
  )

  return (
    <div className="ds-root">
      <main className="ds-page">
        <header className="ds-header">
          <h1>Odyssey Design System</h1>
          <p>
            Live <code>@odyssey/ui</code> components — hover, focus, type. The real
            thing, not a static reproduction.
          </p>
        </header>

        <nav className="ds-tabs" role="tablist" aria-label="Component tiers">
          {tiers.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === activeTier}
              className={`ds-tab${t.key === activeTier ? ' ds-tab--active' : ''}`}
              onClick={() => setActiveTier(t.key)}
            >
              {t.label}
              <span className="ds-tab__count">{t.demos.length}</span>
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={onNormalize}
            className={
              `ds-tab${onNormalize ? ' ds-tab--active' : ''}` +
              (hasNormalizing ? ' ds-tab--pulse' : '')
            }
            onClick={() => setActiveTier(NORMALIZE_KEY)}
          >
            Normalizing
            <span className="ds-tab__count">{normalizing.length}</span>
          </button>
        </nav>

        <div className="ds-list">
          {onNormalize ? (
            normalizing.length === 0 ? (
              <p className="ds-empty">
                Nothing in progress — components appear here during a /normalize cycle.
              </p>
            ) : (
              normalizing.map(renderSection)
            )
          ) : (
            <>
              {active.demos.length === 0 && (
                <p className="ds-empty">No {active.label.toLowerCase()} demos yet.</p>
              )}
              {active.demos.map(renderSection)}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
