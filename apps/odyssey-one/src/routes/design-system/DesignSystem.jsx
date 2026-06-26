import { useState, useEffect } from 'react'
import { SearchField } from '@odyssey/ui'
import { TIERS, groupDemosByTier, collectNormalizing, DOMAINS, filterTiersByDomain, filterDemosByDomain, latestVersion, filterTiersByLatest, filterTiersBySearch, filterDemosBySearch } from './collectDemos.js'
import domainUsage from './domain-usage.json'
import './DesignSystem.css'

// Eagerly collect every co-located demo. Adding a new component to the
// explorer = adding one ./demos/<Component>.demo.jsx — no edit here.
const modules = import.meta.glob('./demos/*.demo.jsx', { eager: true })
const tiers = groupDemosByTier(modules)
const normalizing = collectNormalizing(modules)
// Newest library version across all demos — drives the "Latest only" filter.
const latestVer = latestVersion([...tiers.flatMap((t) => t.demos), ...normalizing])

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
function DemoSection({ meta, props, tokens, Component, open, onToggle, collapsed, onToggleCollapse, normalizing: isNormalizing }) {
  return (
    <section className={`ds-comp${collapsed ? ' ds-comp--collapsed' : ''}`}>
      <div
        className="ds-comp__head"
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={onToggleCollapse}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse() } }}
      >
        <div className="ds-comp__heading">
          <span className="ds-comp__chevron" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
          <h2 className="ds-comp__name">{meta.name}</h2>
          {isNormalizing && <span className="ds-comp__pill">NORMALIZING</span>}
          {meta.deprecated && <span className="ds-comp__pill ds-comp__pill--deprecated">DEPRECATED</span>}
          {meta.codeOnly && <span className="ds-comp__pill ds-comp__pill--code-only">CODE-ONLY</span>}
        </div>
        <button
          type="button"
          className="ds-comp__toggle"
          onClick={(e) => { e.stopPropagation(); onToggle() }}
        >
          Details
        </button>
      </div>

      {!collapsed && (
        <div className="ds-comp__demo">
          <Component />
        </div>
      )}
    </section>
  )
}

export default function DesignSystem() {
  const hasNormalizing = normalizing.length > 0
  // When something is in progress, open the Normalize panel by default so it's
  // immediately visible; otherwise fall back to the first tier (Atoms).
  const [activeTier, setActiveTier] = useState(hasNormalizing ? NORMALIZE_KEY : TIERS[0].key)
  const [openDetails, setOpenDetails] = useState(null) // meta.name | null
  const [activeDomain, setActiveDomain] = useState('all')
  const [latestOnly, setLatestOnly] = useState(false)
  const [query, setQuery] = useState('')
  // Section collapse state — a set of expanded component names. Empty = all
  // collapsed (the default, on load and whenever the page re-mounts).
  const [expanded, setExpanded] = useState(() => new Set())
  // The three filters compose, in order: domain → "Latest only" → search. The
  // search is just a third query layer on top of the other two — it narrows each
  // tier in place, so the tab structure stays and the tab counts reflect it.
  const domainTiers = filterTiersByDomain(tiers, domainUsage, activeDomain)
  const latestTiers = latestOnly ? filterTiersByLatest(domainTiers, latestVer) : domainTiers
  const viewTiers = filterTiersBySearch(latestTiers, query)
  const viewNormalizing = filterDemosBySearch(
    filterDemosByDomain(normalizing, domainUsage, activeDomain),
    query
  )
  const onNormalize = activeTier === NORMALIZE_KEY
  const active = onNormalize ? null : viewTiers.find((t) => t.key === activeTier)
  const searching = query.trim().length > 0

  // Sections shown in the active tab (already domain + latest + search filtered).
  const visibleDemos = onNormalize ? viewNormalizing : (active?.demos ?? [])
  const allExpanded = visibleDemos.length > 0 && visibleDemos.every((d) => expanded.has(d.meta.name))
  const toggleCollapse = (name) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  const toggleAll = () =>
    setExpanded((prev) => {
      const next = new Set(prev)
      visibleDemos.forEach((d) => (allExpanded ? next.delete(d.meta.name) : next.add(d.meta.name)))
      return next
    })

  const allDemos = [...tiers.flatMap((t) => t.demos), ...normalizing]
  const detailsDemo = openDetails ? allDemos.find((d) => d.meta.name === openDetails) : null

  useEffect(() => {
    if (!openDetails) return
    const onKey = (e) => { if (e.key === 'Escape') setOpenDetails(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openDetails])

  // When any filter (domain / latest / search) empties the active tab, never
  // strand the user — jump to the first tab that still has components (tiers
  // first, then Normalizing).
  useEffect(() => {
    const activeEmpty = onNormalize
      ? viewNormalizing.length === 0
      : (active?.demos.length ?? 0) === 0
    if (!activeEmpty) return
    const firstTier = viewTiers.find((t) => t.demos.length > 0)
    if (firstTier) setActiveTier(firstTier.key)
    else if (viewNormalizing.length > 0) setActiveTier(NORMALIZE_KEY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDomain, latestOnly, query])

  const renderSection = (demo) => (
    <DemoSection
      key={demo.meta.name}
      {...demo}
      open={openDetails === demo.meta.name}
      onToggle={() => setOpenDetails(demo.meta.name)}
      collapsed={!expanded.has(demo.meta.name)}
      onToggleCollapse={() => toggleCollapse(demo.meta.name)}
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
          {/* Filter row: the search query (left) sits alongside the Domain +
              "Latest only" filters (right). All three compose — search is a
              third query layer on top of the dropdown + button filters, applied
              within the current tab. */}
          <div className="ds-header__filters">
            <div className="ds-header__search">
              <SearchField
                className="ds-header__search-field"
                value={query}
                onChange={setQuery}
                onClear={() => setQuery('')}
                placeholder="Search components"
                showLabel={false}
              />
            </div>
            <div className="ds-header__controls">
              <label className="ds-domain">
                <span className="ds-domain__label">Domain</span>
                <select
                  className="ds-domain__select"
                  value={activeDomain}
                  onChange={(e) => setActiveDomain(e.target.value)}
                >
                  {DOMAINS.flatMap((d) =>
                    // Divider before the cross-cutting domains (Global Search, Shared)
                    // to set them apart from the product domains.
                    d.key === 'global-search'
                      ? [
                          <option key="__sep" disabled>──────────</option>,
                          <option key={d.key} value={d.key}>{d.label}</option>,
                        ]
                      : [<option key={d.key} value={d.key}>{d.label}</option>]
                  )}
                </select>
              </label>
              <button
                type="button"
                className={`ds-latest-toggle${latestOnly ? ' is-on' : ''}`}
                aria-pressed={latestOnly}
                onClick={() => setLatestOnly((v) => !v)}
              >
                Latest only
              </button>
            </div>
          </div>
        </header>

        <nav className="ds-tabs" role="tablist" aria-label="Component tiers">
          {viewTiers.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === activeTier}
              disabled={t.demos.length === 0}
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
            disabled={viewNormalizing.length === 0}
            className={
              `ds-tab${onNormalize ? ' ds-tab--active' : ''}` +
              (hasNormalizing ? ' ds-tab--pulse' : '')
            }
            onClick={() => setActiveTier(NORMALIZE_KEY)}
          >
            Normalizing
            <span className="ds-tab__count">{viewNormalizing.length}</span>
          </button>
        </nav>

        <div className="ds-list">
          {visibleDemos.length > 0 && (
            <div className="ds-list__toolbar">
              <button type="button" className="ds-collapse-all" onClick={toggleAll}>
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
          )}
          {visibleDemos.length > 0 ? (
            visibleDemos.map(renderSection)
          ) : searching ? (
            <p className="ds-empty">No components match "{query}".</p>
          ) : onNormalize ? (
            <p className="ds-empty">
              Nothing in progress — components appear here during a /normalize cycle.
            </p>
          ) : (
            <p className="ds-empty">No {(active?.label ?? 'component').toLowerCase()} demos yet.</p>
          )}
        </div>
      </main>
      {detailsDemo && (
        <div className="ds-modal__backdrop" onClick={() => setOpenDetails(null)}>
          <div className="ds-modal" role="dialog" aria-modal="true" aria-label={`${detailsDemo.meta.name} details`} onClick={(e) => e.stopPropagation()}>
            <div className="ds-modal__head">
              <h2 className="ds-modal__title">{detailsDemo.meta.name}</h2>
              <button type="button" className="ds-modal__close" aria-label="Close" onClick={() => setOpenDetails(null)}>✕</button>
            </div>
            <div className="ds-modal__body">
              <DetailsPanel meta={detailsDemo.meta} props={detailsDemo.props} tokens={detailsDemo.tokens} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
