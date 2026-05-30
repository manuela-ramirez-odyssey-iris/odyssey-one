import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Search,
  CircleX,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Route,
  GripVertical,
  CirclePlus,
} from 'lucide-react'
import { Button } from '@odyssey/ui'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import { SEARCH_ATTRIBUTES } from '../../data'

// Quick-demo build of new GlobalSearch matching the 7-scenario screenshot flow,
// adapted for Shipments data. Lives in the dark navbar slot (via AppShell's
// searchSlot prop). Controlled by ShipmentsRoute — chips/query drive the table.

const LAST_DAYS_ENUM = ['Today', 'Yesterday', '7 Days', '30 Days', '60 Days', '90 Days', '180 Days', '365 Days']
const MULTI_VALUE_KEYS = new Set(['origin', 'destination', 'customer-id', 'consignor', 'consignee'])

// Default identifier set surfaced when bar is focused + empty (frames 211, 230).
const IDENTIFIER_KEYS = ['buy-shipment', 'sell-shipment', 'order', 'pro']

// Attributes whose enum is meaningful to surface as a context group when the
// query matches one of its values (drives frame-213 two-group behavior).
const ENUM_CONTEXT_ATTRS = ['tender-status', 'shipment-status', 'mode', 'equipment-code']

export function makeDefaultDurationChip() {
  return { key: 'last-days', label: 'Last Days', value: '30 Days', kind: 'duration', silent: true }
}

function chipId(c) {
  return c.kind === 'saved-filter' ? `saved:${c.value}` : `${c.key}:${c.value}`
}

function getAttr(key) {
  return SEARCH_ATTRIBUTES.find(a => a.key === key)
}

// ─── Match resolution ─────────────────────────────────────────────────────
// Produces a structured list of suggestions:
//   - type 'value':       an exact attribute value matched (top group, ranked)
//   - type 'enum-context': sibling enum values of an attribute the query hit
//                          (bottom group — pads out the context)
//   - type 'attr':         attribute-only header (no value)
function resolveSuggestions({ query, chips, shipments }) {
  const q = query.trim().toLowerCase()
  const usedSingleValueKeys = new Set(
    chips.filter(c => c.kind === 'standard' && !MULTI_VALUE_KEYS.has(c.key)).map(c => c.key)
  )

  // Date-like query (e.g. "2/6", "2/6/20") → surface Pickup + Delivery date-range suggestions
  // ahead of everything else (frames 228b, 243).
  const dateMatch = /^(\d{1,2})\/(\d{0,2})(?:\/(\d{0,4}))?$/.exec(q)
  if (dateMatch) {
    const m = parseInt(dateMatch[1], 10)
    const d = parseInt(dateMatch[2] || '1', 10)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const today = new Date()
      const yr = parseInt(dateMatch[3], 10) || today.getFullYear()
      const startDate = new Date(yr, m - 1, d)
      const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1)
      const fmt = (dt) => `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`
      const range = `${fmt(startDate)} - ${fmt(endDate)}`
      return [
        { type: 'value', attrKey: 'pickup-date-range', attrLabel: 'Pickup Date Range', value: range, rank: 0 },
        { type: 'value', attrKey: 'delivery-date-range', attrLabel: 'Delivery Date Range', value: range, rank: 0 },
      ]
    }
  }

  // Empty-focused / no query → default attribute list (frames 211, 230, 211).
  if (!q) {
    const baseKeys =
      chips.length <= 1
        ? IDENTIFIER_KEYS // empty focus: Buy/Sell Shipment + Order + Pro
        : SEARCH_ATTRIBUTES.map(a => a.key).filter(
            k => !usedSingleValueKeys.has(k) && k !== 'last-days'
          )
    return baseKeys
      .map(k => {
        const a = getAttr(k)
        if (!a) return null
        return { type: 'attr', attrKey: a.key, attrLabel: a.label, value: '' }
      })
      .filter(Boolean)
      .filter(m => !usedSingleValueKeys.has(m.attrKey))
      .slice(0, 12)
  }

  const matches = []
  const seen = new Set()
  const pushUnique = (m) => {
    const id = `${m.attrKey}::${m.value}::${m.type}`
    if (seen.has(id)) return
    seen.add(id)
    matches.push(m)
  }

  // Pass 1 — Last Days enum (typing "Last" or "day" or matching values)
  for (const d of LAST_DAYS_ENUM) {
    if (d.toLowerCase().includes(q) || 'last days'.includes(q)) {
      pushUnique({ type: 'value', attrKey: 'last-days', attrLabel: 'Last Days', value: d, rank: 5 })
    }
  }

  // Pass 2 — enum attribute value matches (top group, rank 0)
  for (const attr of SEARCH_ATTRIBUTES) {
    if (!attr.values) continue
    for (const v of attr.values) {
      if (v.toLowerCase().includes(q)) {
        const exactPrefix = v.toLowerCase().startsWith(q)
        pushUnique({
          type: 'value',
          attrKey: attr.key,
          attrLabel: attr.label,
          value: v,
          rank: exactPrefix ? 0 : 1,
        })
      }
    }
  }

  // Pass 3 — free-text value matches from data (carriers, customers, origins, …)
  const textAttrs = SEARCH_ATTRIBUTES.filter(a => !a.values)
  let textHits = 0
  for (const s of shipments) {
    for (const attr of textAttrs) {
      const raw = s[attr.dataKey]
      const vals = Array.isArray(raw) ? raw : [raw]
      for (const v of vals) {
        if (!v) continue
        const sv = String(v)
        if (sv.toLowerCase().includes(q)) {
          const exactPrefix = sv.toLowerCase().startsWith(q)
          pushUnique({
            type: 'value',
            attrKey: attr.key,
            attrLabel: attr.label,
            value: sv,
            rank: exactPrefix ? 2 : 3,
          })
          textHits += 1
          break
        }
      }
      if (textHits >= 12) break
    }
    if (textHits >= 12) break
  }

  // Pass 4 — typed query is a partial identifier → surface "ID: <query>" suggestions
  if (/^[a-z0-9\-]+$/i.test(q) && q.length >= 1) {
    for (const k of IDENTIFIER_KEYS) {
      const a = getAttr(k)
      if (!a) continue
      pushUnique({
        type: 'value',
        attrKey: a.key,
        attrLabel: a.label,
        value: query.trim(),
        rank: 4,
      })
    }
  }

  // Pass 5 — typed query matches an attribute LABEL (e.g. "carrier", "mode")
  for (const attr of SEARCH_ATTRIBUTES) {
    if (attr.label.toLowerCase().includes(q)) {
      pushUnique({
        type: 'attr',
        attrKey: attr.key,
        attrLabel: attr.label,
        value: '',
        rank: 6,
      })
    }
  }

  // Pass 6 — enum-context group: if any rank-0/1 value matched an enum
  // attribute, surface that attribute's full enum as the bottom group.
  const hitEnumKeys = new Set(
    matches
      .filter(m => m.type === 'value' && getAttr(m.attrKey)?.values)
      .map(m => m.attrKey)
  )
  for (const k of hitEnumKeys) {
    const a = getAttr(k)
    if (!a?.values) continue
    if (!ENUM_CONTEXT_ATTRS.includes(k)) continue
    for (const v of a.values) {
      pushUnique({
        type: 'enum-context',
        attrKey: a.key,
        attrLabel: a.label,
        value: v,
        rank: 9,
      })
    }
  }

  return matches
    .filter(m => !usedSingleValueKeys.has(m.attrKey))
    .sort((a, b) => (a.rank ?? 8) - (b.rank ?? 8))
    .slice(0, 16)
}

function applyChipsToShipments(shipments, chips, query) {
  let result = shipments
  for (const c of chips) {
    if (c.kind === 'duration' || c.kind === 'compound') continue
    if (c.kind === 'saved-filter') {
      for (const sub of c.payload ?? []) {
        const attr = getAttr(sub.key)
        if (!attr) continue
        const needle = String(sub.value).toLowerCase()
        result = result.filter(s => {
          const raw = s[attr.dataKey]
          const vals = Array.isArray(raw) ? raw : [raw]
          return vals.some(v => String(v ?? '').toLowerCase().includes(needle))
        })
      }
      continue
    }
    const attr = getAttr(c.key)
    if (!attr) continue
    const needle = String(c.value).toLowerCase()
    result = result.filter(s => {
      const raw = s[attr.dataKey]
      const vals = Array.isArray(raw) ? raw : [raw]
      return vals.some(v => String(v ?? '').toLowerCase().includes(needle))
    })
  }
  if (query.trim()) {
    const q = query.toLowerCase()
    result = result.filter(s =>
      s.buyShipment.toLowerCase().includes(q) ||
      (s.customerName || '').toLowerCase().includes(q) ||
      s.customerId.toLowerCase().includes(q) ||
      (s.origin || '').toLowerCase().includes(q) ||
      (s.destination || '').toLowerCase().includes(q) ||
      (s.scac || '').toLowerCase().includes(q)
    )
  }
  return result
}

// ─── In-bar chip (dark surface) ───────────────────────────────────────────
function InBarChip({ chip, onRemove, onCompoundToggle, compoundOpen }) {
  const isCompound = chip.kind === 'compound'
  const isDuration = chip.kind === 'duration'
  const isSaved = chip.kind === 'saved-filter'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        padding: '0 8px',
        background: isSaved ? 'var(--carolina-blue-800, #1F4E7A)' : 'var(--deep-sea-neutral-700)',
        border: '1px solid var(--deep-sea-neutral-600)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--white)',
        fontFamily: 'var(--font-primary)',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: '16px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {!isSaved && (
        <span style={{ color: 'var(--deep-sea-neutral-300)' }}>{chip.label}:</span>
      )}
      <span>{chip.value}</span>
      {isCompound && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCompoundToggle?.() }}
          aria-label="Expand list"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: 'var(--deep-sea-neutral-300)',
            transform: compoundOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 120ms ease',
          }}
        >
          <ChevronDown size={14} />
        </button>
      )}
      {!isDuration && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove?.() }}
          aria-label={`Remove ${chip.label}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: 'var(--deep-sea-neutral-300)',
          }}
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}

// ─── Drawer chip (light surface) ──────────────────────────────────────────
function DrawerChip({ chip, onRemove }) {
  const isDuration = chip.kind === 'duration'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        padding: '0 8px',
        background: 'var(--deep-sea-neutral-100)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-primary)',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      <span style={{ color: 'var(--text-tertiary)' }}>{chip.label}:</span>
      <span>{chip.value}</span>
      {!isDuration && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${chip.label}`}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: 'var(--text-tertiary)',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}

// ─── Suggested-Filter chip (click-to-apply) ───────────────────────────────
function SuggestionChip({ match, onClick }) {
  const hasValue = !!match.value
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 22,
        padding: '0 8px',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-primary)',
        fontSize: 11,
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--deep-sea-neutral-50)'
        e.currentTarget.style.borderColor = 'var(--deep-sea-neutral-400)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-primary)'
        e.currentTarget.style.borderColor = 'var(--border-default)'
      }}
    >
      <span style={{ color: 'var(--text-tertiary)' }}>{match.attrLabel}:</span>
      {hasValue && <span>{match.value}</span>}
    </button>
  )
}

// ─── Best Match row ───────────────────────────────────────────────────────
function BestMatchRow({ shipment, query, onSelect }) {
  const matched = (text) => {
    if (!query.trim() || !text) return text
    const needle = query.toLowerCase()
    const i = String(text).toLowerCase().indexOf(needle)
    if (i < 0) return text
    return (
      <>
        {String(text).slice(0, i)}
        <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          {String(text).slice(i, i + needle.length)}
        </strong>
        {String(text).slice(i + needle.length)}
      </>
    )
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-3)',
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--deep-sea-neutral-50)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-full)',
          background: 'var(--deep-sea-neutral-100)',
          color: 'var(--text-tertiary)',
          flexShrink: 0,
        }}
      >
        <Route size={14} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'var(--font-primary)',
            fontSize: 13,
            color: 'var(--text-primary)',
          }}
        >
          <strong style={{ fontWeight: 600 }}>{matched(shipment.buyShipment)}</strong>
          <span style={{ color: 'var(--text-tertiary)' }}>
            {matched(shipment.origin)}{' '}
            <span style={{ color: 'var(--text-placeholder)' }}>→</span>{' '}
            {matched(shipment.destination)}
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 11,
            color: 'var(--text-tertiary)',
            display: 'flex',
            gap: 12,
          }}
        >
          <span>
            <span style={{ color: 'var(--text-placeholder)' }}>Customer:</span>{' '}
            {matched(shipment.customerName || shipment.customerId)}
          </span>
          <span>
            <span style={{ color: 'var(--text-placeholder)' }}>Carrier:</span>{' '}
            {matched(shipment.scac)}
          </span>
          <span>
            <span style={{ color: 'var(--text-placeholder)' }}>Status:</span>{' '}
            {shipment.shipmentStatus}
          </span>
        </div>
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 20,
          padding: '0 8px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--badge-blue-bg)',
          color: 'var(--badge-blue-text)',
          fontFamily: 'var(--font-primary)',
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {shipment.mode}
      </span>
    </button>
  )
}

// ─── Date Range Picker (single-month calendar popover) ────────────────────
function DateRangePicker({ value, onChange, onCommit, onCancel }) {
  // value: { start: 'YYYY-MM-DD' | null, end: 'YYYY-MM-DD' | null }
  const today = useMemo(() => new Date(), [])
  const [monthDate, setMonthDate] = useState(() => {
    if (value?.start) {
      const [y, m] = value.start.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  while (days.length % 7) days.push(null)

  const toKey = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const inRange = (d) => {
    if (!d || !value?.start) return false
    const k = toKey(d)
    if (value.end) return k >= value.start && k <= value.end
    return k === value.start
  }
  const isStart = (d) => d && value?.start === toKey(d)
  const isEnd = (d) => d && value?.end === toKey(d)

  const handleDayClick = (d) => {
    if (!d) return
    const k = toKey(d)
    if (!value?.start || (value.start && value.end)) {
      onChange({ start: k, end: null })
    } else if (k < value.start) {
      onChange({ start: k, end: value.start })
    } else {
      onChange({ start: value.start, end: k })
    }
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        left: 200,
        width: 280,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-panel)',
        padding: '12px',
        zIndex: 70,
        fontFamily: 'var(--font-primary)',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setMonthDate(new Date(year, month - 1, 1))}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--text-secondary)',
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => setMonthDate(new Date(year, month + 1, 1))}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--text-secondary)',
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          fontSize: 11,
          color: 'var(--text-tertiary)',
          marginBottom: 6,
        }}
      >
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map((d, i) => {
          const selected = inRange(d)
          const start = isStart(d)
          const end = isEnd(d)
          return (
            <button
              key={i}
              type="button"
              disabled={!d}
              onClick={() => handleDayClick(d)}
              style={{
                height: 28,
                border: 'none',
                background: start || end
                  ? 'var(--deep-sea-neutral-900)'
                  : selected
                    ? 'var(--deep-sea-neutral-100)'
                    : 'transparent',
                color: start || end
                  ? 'var(--white)'
                  : !d
                    ? 'var(--text-placeholder)'
                    : 'var(--text-primary)',
                cursor: d ? 'pointer' : 'default',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: start || end ? 600 : 400,
              }}
            >
              {d ?? ''}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!value?.start || !value?.end}
          onClick={onCommit}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}

// ─── Save Filter modal ────────────────────────────────────────────────────
function SaveFilterModal({ chips, onCancel, onSave }) {
  const defaultTitle = useMemo(() => {
    const meaningful = chips.filter(c => c.kind === 'standard')
    if (meaningful.length === 0) return 'Untitled filter'
    return meaningful
      .slice(0, 3)
      .map(c => c.value)
      .join(' - ')
  }, [chips])
  const [title, setTitle] = useState(defaultTitle)
  const [activeChips, setActiveChips] = useState(() => chips.filter(c => c.kind === 'standard'))

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: '90vw',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          fontFamily: 'var(--font-primary)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Save Filter
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: 'var(--text-tertiary)',
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Filter Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                height: 36,
                padding: '0 10px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Selected Filters
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {activeChips.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--text-placeholder)' }}>None</span>
              ) : (
                activeChips.map(c => (
                  <DrawerChip
                    key={chipId(c)}
                    chip={c}
                    onRemove={() => setActiveChips(prev => prev.filter(p => chipId(p) !== chipId(c)))}
                  />
                ))
              )}
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 18px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!title.trim() || activeChips.length === 0}
            onClick={() => onSave({ title: title.trim(), conditions: activeChips })}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────
export default function NewGlobalSearch({
  chips,
  setChips,
  query,
  setQuery,
  shipments = [],
  filteredCount,
  onShowResults,
}) {
  const [focused, setFocused] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState('all')
  const [compoundOpenFor, setCompoundOpenFor] = useState(null)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [savedFilters, setSavedFilters] = useState([])
  const [dateChipBeingEdited, setDateChipBeingEdited] = useState(null) // {key, range}
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const handleAddChip = useCallback((m) => {
    // Special-case date-range attributes — open calendar instead of adding chip.
    if (m.attrKey === 'pickup-date-range' || m.attrKey === 'delivery-date-range') {
      setDateChipBeingEdited({ key: m.attrKey, label: m.attrLabel, range: { start: null, end: null } })
      return
    }
    setChips(prev => {
      if (prev.some(c => c.kind === 'standard' && c.key === m.attrKey && String(c.value) === String(m.value))) {
        return prev
      }
      return [...prev, { key: m.attrKey, label: m.attrLabel, value: m.value, kind: 'standard' }]
    })
    setQuery('')
    inputRef.current?.focus()
  }, [setChips, setQuery])

  const handleRemoveChip = useCallback((id) => {
    setChips(prev => prev.filter(c => chipId(c) !== id))
  }, [setChips])

  const handleClearAll = useCallback(() => {
    setChips([makeDefaultDurationChip()])
    setQuery('')
  }, [setChips, setQuery])

  const handlePaste = useCallback((e) => {
    const text = e.clipboardData?.getData('text') ?? ''
    const tokens = text.split(/[\s,]+/).filter(Boolean)
    if (tokens.length >= 4) {
      e.preventDefault()
      setChips(prev => [
        ...prev,
        {
          key: 'shipments-set',
          label: 'Shipments Set',
          value: `${tokens.length} IDs`,
          kind: 'compound',
          payload: tokens,
        },
      ])
      setQuery('')
    }
  }, [setChips, setQuery])

  const handleApplySaved = useCallback((sf) => {
    setChips([makeDefaultDurationChip(), {
      key: `saved-${sf.id}`,
      label: 'Saved',
      value: sf.title,
      kind: 'saved-filter',
      payload: sf.conditions,
    }])
    setQuery('')
    setDrawerOpen(false)
  }, [setChips, setQuery])

  const handleSaveCommit = useCallback((draft) => {
    const id = `sf-${Date.now()}`
    setSavedFilters(prev => [{ id, title: draft.title, conditions: draft.conditions }, ...prev])
    setSaveModalOpen(false)
  }, [])

  const handleDateRangeCommit = useCallback(() => {
    if (!dateChipBeingEdited) return
    const { key, label, range } = dateChipBeingEdited
    if (!range.start || !range.end) return
    const fmt = (k) => {
      const [y, m, d] = k.split('-').map(Number)
      return `${m}/${d}/${y}`
    }
    const value = `${fmt(range.start)}-${fmt(range.end)}`
    setChips(prev => {
      const next = prev.filter(c => c.key !== key)
      return [...next, { key, label, value, kind: 'standard' }]
    })
    setDateChipBeingEdited(null)
    setQuery('')
  }, [dateChipBeingEdited, setChips, setQuery])

  // Suggestions resolved against query + chips + shipments.
  const suggestions = useMemo(
    () => resolveSuggestions({ query, chips, shipments }),
    [query, chips, shipments]
  )

  // Best Match — top 4 from filtered shipments (only when there's signal).
  const bestMatches = useMemo(() => shipments.slice(0, 4), [shipments])
  const showBestMatch = chips.some(c => c.kind === 'standard' || c.kind === 'compound' || c.kind === 'saved-filter') || query.trim().length > 0

  // Two-group split: rank-based — `enum-context` items go in the bottom group.
  const topGroup = suggestions.filter(s => s.type !== 'enum-context')
  const bottomGroup = suggestions.filter(s => s.type === 'enum-context')

  const showDropdown = focused && !drawerOpen && !saveModalOpen
  const conditionsCount = chips.length

  useEffect(() => {
    if (!focused && !drawerOpen) return
    const handle = (e) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target)) {
        setFocused(false)
        setDrawerOpen(false)
        setCompoundOpenFor(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [focused, drawerOpen])

  return (
    <div
      ref={wrapRef}
      className="flex items-center"
      style={{ position: 'relative', gap: 'var(--spacing-2)', flex: 1, minWidth: 590, maxWidth: 900 }}
    >
      {/* ── Back/Forward nav (mirrors normalized GlobalSearch) ─────────── */}
      <div className="flex items-center" style={{ gap: 'var(--spacing-1)', height: 32 }}>
        <button
          type="button"
          className="flex items-center justify-center border-none bg-transparent cursor-pointer"
          style={{ padding: 'var(--spacing-1) 6px', color: focused ? 'var(--deep-sea-neutral-200)' : 'var(--deep-sea-neutral-400)' }}
          aria-label="Back"
        >
          <ChevronLeft {...ICON_LG} />
        </button>
        <button
          type="button"
          className="flex items-center justify-center border-none bg-transparent cursor-pointer"
          style={{ padding: 'var(--spacing-1) 6px', color: focused ? 'var(--deep-sea-neutral-200)' : 'var(--deep-sea-neutral-400)' }}
          aria-label="Forward"
        >
          <ChevronRight {...ICON_LG} />
        </button>
      </div>

      {/* ── Search bar (composes normalized GlobalSearch anatomy) ──────── */}
      <div
        className={`global-search-wrapper relative flex items-center overflow-visible${focused ? ' focused' : ''}`}
        onClick={() => inputRef.current?.focus()}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 32,
          background: 'var(--deep-sea-neutral-900)',
          boxShadow: 'var(--shadow-sm)',
          borderRadius: 'var(--radius-lg)',
          gap: 'var(--spacing-2)',
          padding: '4px var(--spacing-3)',
          cursor: 'text',
          flexWrap: 'wrap',
        }}
      >
        {/* Chip stream — additive */}
        {chips.map(c => (
          <InBarChip
            key={chipId(c)}
            chip={c}
            compoundOpen={compoundOpenFor === chipId(c)}
            onCompoundToggle={() =>
              setCompoundOpenFor(prev => (prev === chipId(c) ? null : chipId(c)))
            }
            onRemove={() => handleRemoveChip(chipId(c))}
          />
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={chips.length <= 1 ? 'Search' : ''}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onPaste={handlePaste}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="global-search-input flex-1 bg-transparent border-none outline-none min-w-0"
          style={{
            color: 'var(--text-inverse)',
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 'var(--line-height-sm)',
          }}
        />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation()
            if (chips.length > 1 || query) handleClearAll()
          }}
          className="global-search-clear flex items-center justify-center border-none bg-transparent cursor-pointer p-0 shrink-0"
          style={{ color: focused ? 'var(--deep-sea-neutral-200)' : 'var(--deep-sea-neutral-400)' }}
          aria-label="Clear search"
        >
          <CircleX {...ICON_MD} />
        </button>

        {/* Compound chip popover — dark surface, line-per-ID */}
        {compoundOpenFor && (() => {
          const chip = chips.find(c => chipId(c) === compoundOpenFor)
          if (!chip?.payload) return null
          return (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 120,
                width: 180,
                padding: '10px 12px',
                background: 'var(--deep-sea-neutral-800)',
                border: '1px solid var(--deep-sea-neutral-600)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                fontFamily: 'var(--font-primary)',
                fontSize: 12,
                color: 'var(--white)',
                lineHeight: '18px',
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 60,
              }}
            >
              {chip.payload.slice(0, 12).map((id, i) => (
                <div key={i}>{id}{i < chip.payload.length - 1 ? ',' : ''}</div>
              ))}
              {chip.payload.length > 12 && (
                <div style={{ color: 'var(--deep-sea-neutral-300)', marginTop: 4 }}>
                  +{chip.payload.length - 12} more
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ── Filter button (dark, outside the bar) ───────────────────── */}
      <button
        type="button"
        onClick={() => { setDrawerOpen(o => !o); setFocused(false) }}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: 36,
          padding: '0 14px',
          background: 'var(--deep-sea-neutral-800)',
          border: '1px solid var(--deep-sea-neutral-600)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          cursor: 'pointer',
          color: 'var(--white)',
          fontFamily: 'var(--font-primary)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        <SlidersHorizontal size={16} style={{ color: 'var(--deep-sea-neutral-300)' }} />
        <span>Filter</span>
        {conditionsCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              background: drawerOpen ? 'var(--carolina-blue-600)' : 'var(--bittersweet-600)',
              color: 'var(--white)',
              borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-primary)',
              fontSize: 10,
              fontWeight: 700,
              lineHeight: '18px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {conditionsCount}
          </span>
        )}
      </button>

      {/* ── Best Match panel (anchored to bar's left edge, below navbar) */}
      {showDropdown && showBestMatch && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: 0,
            width: 720,
            maxHeight: 480,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-panel)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: '12px 16px 6px',
              fontFamily: 'var(--font-primary)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Best Match
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {bestMatches.length > 0 ? (
              bestMatches.map(s => (
                <BestMatchRow
                  key={s.buyShipment}
                  shipment={s}
                  query={query}
                  onSelect={() => {
                    setFocused(false)
                    onShowResults?.()
                  }}
                />
              ))
            ) : (
              <div
                style={{
                  padding: '24px 16px',
                  color: 'var(--text-tertiary)',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                No matches.
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-primary)',
              gap: 12,
            }}
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setDrawerOpen(true); setFocused(false) }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px',
                fontFamily: 'var(--font-primary)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              <SlidersHorizontal size={16} style={{ color: 'var(--text-tertiary)' }} />
              All Filters
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={handleClearAll}>Clear all</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => { setFocused(false); onShowResults?.() }}
              >
                Show {filteredCount} results
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suggested Filters panel (overlays Best Match's right side) */}
      {showDropdown && suggestions.length > 0 && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 28px)',
            left: showBestMatch ? 500 : 0,
            width: 247,
            maxHeight: 440,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-panel)',
            padding: '12px 14px',
            zIndex: 55,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 10,
            }}
          >
            Suggested Filters
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
            {topGroup.map((m, i) => (
              <SuggestionChip
                key={`top-${m.attrKey}-${m.value}-${i}`}
                match={m}
                onClick={() => handleAddChip(m)}
              />
            ))}
            {bottomGroup.length > 0 && (
              <div style={{ height: 8, width: '100%' }} />
            )}
            {bottomGroup.map((m, i) => (
              <SuggestionChip
                key={`bot-${m.attrKey}-${m.value}-${i}`}
                match={m}
                onClick={() => handleAddChip(m)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Date Range Picker (popover) ──────────────────────────────── */}
      {dateChipBeingEdited && (
        <DateRangePicker
          value={dateChipBeingEdited.range}
          onChange={(r) => setDateChipBeingEdited(prev => ({ ...prev, range: r }))}
          onCancel={() => setDateChipBeingEdited(null)}
          onCommit={handleDateRangeCommit}
        />
      )}

      {/* ── Filters drawer (modal popover anchored below navbar) ─────── */}
      {drawerOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: 0,
            width: 700,
            maxHeight: 540,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-panel)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'var(--font-primary)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center" style={{ gap: 8 }}>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Back"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-tertiary)' }}
              >
                <ChevronLeft size={18} />
              </button>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                Filters
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close filters"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-tertiary)' }}
            >
              <X size={16} />
            </button>
          </div>
          {/* Tab strip */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '10px 18px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {[
              { key: 'all', label: 'All', count: conditionsCount },
              { key: 'saved', label: 'Saved', count: savedFilters.length },
            ].map(t => {
              const active = drawerTab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setDrawerTab(t.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 28,
                    padding: '0 12px',
                    background: active ? 'var(--bg-primary)' : 'transparent',
                    border: active ? '1px solid var(--deep-sea-neutral-400)' : '1px solid transparent',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {t.label}
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t.count}</span>
                </button>
              )
            })}
          </div>
          {/* Body */}
          <div
            style={{
              padding: '14px 18px',
              flex: 1,
              overflow: 'auto',
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            {drawerTab === 'all' ? (
              <DrawerAllTab
                chips={chips}
                onRemoveChip={(id) => handleRemoveChip(id)}
                onTogglePill={(attrKey, value) => {
                  const a = getAttr(attrKey)
                  if (!a) return
                  setChips(prev => {
                    const exists = prev.some(c => c.kind === 'standard' && c.key === attrKey && c.value === value)
                    if (exists) return prev.filter(c => !(c.kind === 'standard' && c.key === attrKey && c.value === value))
                    return [...prev, { key: attrKey, label: a.label, value, kind: 'standard' }]
                  })
                }}
              />
            ) : (
              <DrawerSavedTab
                savedFilters={savedFilters}
                onApply={handleApplySaved}
                onDelete={(id) => setSavedFilters(prev => prev.filter(s => s.id !== id))}
              />
            )}
          </div>
          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderTop: '1px solid var(--border-subtle)',
              gap: 12,
            }}
          >
            {drawerTab === 'all' ? (
              <>
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--carolina-blue-600)',
                    fontFamily: 'var(--font-primary)',
                    fontSize: 13,
                    fontWeight: 500,
                    padding: 0,
                  }}
                >
                  <CirclePlus size={16} />
                  Save Filters
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" size="sm" onClick={handleClearAll}>Clear all</Button>
                  <Button variant="primary" size="sm" onClick={() => setDrawerOpen(false)}>
                    Show {filteredCount} results
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="link" size="sm" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={() => setDrawerOpen(false)}>
                  Show {filteredCount} results
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {saveModalOpen && (
        <SaveFilterModal
          chips={chips}
          onCancel={() => setSaveModalOpen(false)}
          onSave={(draft) => {
            handleSaveCommit(draft)
            setDrawerTab('saved')
          }}
        />
      )}
    </div>
  )
}

// ─── Drawer All tab ──────────────────────────────────────────────────────
function DrawerAllTab({ chips, onRemoveChip, onTogglePill }) {
  const tenderStatusAttr = getAttr('tender-status')
  const shipmentStatusAttr = getAttr('shipment-status')
  const modeAttr = getAttr('mode')
  const equipmentAttr = getAttr('equipment-code')

  const isPillActive = (key, value) =>
    chips.some(c => c.kind === 'standard' && c.key === key && c.value === value)

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )

  const PillRow = ({ values, attrKey }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {values.map(v => {
        const active = isPillActive(attrKey, v)
        return (
          <button
            key={v}
            type="button"
            onClick={() => onTogglePill(attrKey, v)}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: active
                ? '1px solid var(--deep-sea-neutral-900)'
                : '1px solid var(--border-default)',
              background: active ? 'var(--deep-sea-neutral-900)' : 'var(--bg-primary)',
              color: active ? 'var(--white)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-primary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {v}
          </button>
        )
      })}
    </div>
  )

  return (
    <>
      <div style={{ marginBottom: 14, color: 'var(--text-tertiary)', fontSize: 12 }}>
        Active conditions ({chips.length})
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
        {chips.map(c => (
          <DrawerChip key={chipId(c)} chip={c} onRemove={() => onRemoveChip(chipId(c))} />
        ))}
      </div>
      <Section title="Tender Status">
        <PillRow values={tenderStatusAttr?.values || []} attrKey="tender-status" />
      </Section>
      <Section title="Shipment Status">
        <PillRow values={shipmentStatusAttr?.values || []} attrKey="shipment-status" />
      </Section>
      <Section title="Mode">
        <PillRow values={modeAttr?.values || []} attrKey="mode" />
      </Section>
      <Section title="Equipment">
        <PillRow values={equipmentAttr?.values || []} attrKey="equipment-code" />
      </Section>
    </>
  )
}

// ─── Drawer Saved tab ────────────────────────────────────────────────────
function DrawerSavedTab({ savedFilters, onApply, onDelete }) {
  if (savedFilters.length === 0) {
    return (
      <div
        style={{
          padding: '32px 16px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-placeholder)',
          textAlign: 'center',
          fontSize: 12,
        }}
      >
        No saved filters yet. Use “+ Save Filters” to create one.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {savedFilters.map(sf => (
        <div
          key={sf.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-primary)',
            cursor: 'pointer',
          }}
          onClick={() => onApply(sf)}
        >
          <GripVertical size={14} style={{ color: 'var(--text-placeholder)', flexShrink: 0 }} />
          <span
            style={{
              flex: 1,
              fontFamily: 'var(--font-primary)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            {sf.title}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(sf.id) }}
            aria-label="Delete saved filter"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: 'var(--text-tertiary)',
            }}
          >
            <X size={14} />
          </button>
          <ChevronRight size={14} style={{ color: 'var(--text-placeholder)' }} />
        </div>
      ))}
    </div>
  )
}

