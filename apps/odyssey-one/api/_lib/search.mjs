// Progressive-search query builders (S104). One ordered query serves BOTH the
// preview (LIMIT 15) and the table, so preview≡table holds by construction
// rather than by two implementations agreeing (GS-16 / Case 6).
import { REGISTRY } from './search-registry.mjs'

/** Trigram indexes cannot extract trigrams below 3 chars — the contains tier
 *  is skipped under this length. This is an architecture rule, not just UX. */
export const MIN_TRGM = 3

const quote = (s) => `'${String(s).replace(/'/g, "''")}'`

/** CASE arm mapping registry keys to their priority — the GS-15 tiebreaker. */
function priorityCase(domain) {
  const attrs = REGISTRY[domain].attrs
  const arms = Object.entries(attrs)
    .map(([k, cfg]) => `WHEN ${quote(k)} THEN ${cfg.priority}`)
    .join(' ')
  return `CASE attr ${arms} ELSE 99 END`
}

// Chip keys arrive from the wire (client-controlled) — never trust them as SQL
// attr names. Unknown keys are DROPPED silently rather than erroring or being
// interpolated, so a bad/stale chip key degrades to "no restriction from this
// chip" instead of a 500 or an injection surface.
function validChips(domain, chips) {
  const attrs = REGISTRY[domain]?.attrs ?? {}
  return (chips ?? []).filter((c) => c?.key && attrs[c.key])
}

// Chip value → tokens, normalized per THAT attr's rule (upper vs upperStrip) so
// they compare against search_index.value, which was normalized the SAME way
// at projection time (registryParity — search-registry.mjs). Mirrors the
// mock's tokenizeChipValue (criteria.js) split-on-comma, minus the lowercasing
// (the server compares against upper-cased index values instead).
// Empty queryValue → [''] → `LIKE '%%'`, matching any indexed (non-null) value
// for that attr — same "empty chip matches any non-null field" rule as the mock.
function chipTokens(queryValue, normalize) {
  const raw = String(queryValue ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return (raw.length ? raw : ['']).map(normalize)
}

// ONE chip as an entity-set restriction: `entity_id IN (SELECT ... WHERE attr
// = X AND (value CONTAINS tok1 OR tok2 ...))`. Multi-value chip tokens OR
// within the subquery (GS-12 IN-list semantics); multiple chips AND by each
// contributing its OWN `entity_id IN (...)` clause (scope decision 1) — never
// merged into one subquery, so two chips narrow independently.
function chipRestrictionSql(domain, chip, p) {
  const cfg = REGISTRY[domain].attrs[chip.key]
  const tokens = chipTokens(chip.queryValue, cfg.normalize)
  const ors = tokens.map((t) => `value LIKE '%' || ${p(t)} || '%'`).join(' OR ')
  return `entity_id IN (SELECT entity_id FROM search_index WHERE domain = ${p(domain)} AND attr = ${p(chip.key)} AND (${ors}))`
}

/**
 * The raw tiered hit set, shared by search and suggest so the two can never
 * disagree about what matched. Tiers: 0 exact · 1 prefix · 2 contains, each on
 * its own index. `needle_ix` is carried through because the GS-20 suggestion
 * gate ("offer an attribute only if it matches EVERY code") needs to count
 * DISTINCT needles per attribute — an entity count cannot answer that.
 *
 * Committed chips (S104 follow-up, GS-12) are entity-set INTERSECTION filters,
 * not part of ranking when text is present: every needle-tier branch gets each
 * valid chip ANDed on as its own `entity_id IN (...)` restriction, so "chips AND
 * text" narrows rather than unions.
 *
 * Chips-only (no text) has no needle to rank by, so the LEADING chip stands in
 * for it: its own contains-match rows become the hit set (flattened to a
 * single tier/needle_ix — the "tier-2-flat" option the spec allows in place of
 * mirroring the mock's exact/prefix/contains ladder for one field), further
 * restricted by the REMAINING chips. This is what fixes the blank-glimpse bug
 * (committing "Order #: 44237" cleared the text and returned nothing) — chips
 * alone now drive a real hit set instead of `needles.length === 0` short-
 * circuiting to empty.
 *
 * Known accepted deviation from the mock (documented, not built): the mock
 * explodes ORDER-entity rows — one row per matching order — when the LEADING
 * chip is order-scoped (adapter.js ORDER_KEYS branch). Live keeps one row per
 * shipment for every chip combination for now; closing this gap waits on
 * orders becoming their own search domain (composed-criteria.md).
 *
 * Returns { sql, values, p } — `p` is the running binder so callers can append
 * their own parameters (LIMIT) after the branches. Callers that already own a
 * parameter list (buildListQuery) pass their own `bind` instead, so the ranking
 * SQL can be embedded in a larger query without renumbering.
 */
function buildHits({ domain, needles, customerIds, chips, bind }) {
  const values = []
  const p = bind ?? ((v) => { values.push(v); return `$${values.length}` })
  const dom = p(domain)

  const scope = customerIds
    ? `AND entity_id IN (SELECT sell_shipment FROM shipments WHERE customer_id = ANY(${p(customerIds)}))`
    : ''

  const chipList = validChips(domain, chips)

  if (needles.length) {
    const chipSql = chipList.map((c) => `AND ${chipRestrictionSql(domain, c, p)}`).join(' ')
    const branches = []
    needles.forEach((n, ix) => {
      const needle = p(String(n).toUpperCase())
      branches.push(
        `SELECT entity_id, attr, display, 0 AS tier, ${ix} AS needle_ix FROM search_index
          WHERE domain = ${dom} AND value = ${needle} ${scope} ${chipSql}`,
        `SELECT entity_id, attr, display, 1, ${ix} FROM search_index
          WHERE domain = ${dom} AND value LIKE ${needle} || '%' AND value <> ${needle} ${scope} ${chipSql}`,
      )
      if (String(n).length >= MIN_TRGM) {
        branches.push(
          `SELECT entity_id, attr, display, 2, ${ix} FROM search_index
            WHERE domain = ${dom} AND value LIKE '%' || ${needle} || '%'
              AND value NOT LIKE ${needle} || '%' ${scope} ${chipSql}`,
        )
      }
    })
    return { sql: branches.join(' UNION ALL '), values, p }
  }

  if (chipList.length) {
    const [lead, ...rest] = chipList
    const leadCfg = REGISTRY[domain].attrs[lead.key]
    const leadTokens = chipTokens(lead.queryValue, leadCfg.normalize)
    const leadOrs = leadTokens.map((t) => `value LIKE '%' || ${p(t)} || '%'`).join(' OR ')
    const restSql = rest.map((c) => `AND ${chipRestrictionSql(domain, c, p)}`).join(' ')
    const sql = `SELECT entity_id, attr, display, 2 AS tier, 0 AS needle_ix FROM search_index
      WHERE domain = ${dom} AND attr = ${p(lead.key)} AND (${leadOrs}) ${scope} ${restSql}`
    return { sql, values, p }
  }

  return { sql: '', values, p }
}

/**
 * Ranked hits for N needles. Needles UNION (GS-20) and each entity keeps its
 * BEST tier, so a row matching two codes appears once at its best rank.
 * The ORDER BY is TOTAL — every tiebreak resolved down to entity_id — which is
 * what makes "the preview's first 15" and "the table's first 15" the same rows.
 */
export function buildSearchQuery({ domain, needles, limit = 15, customerIds, chips }) {
  const { sql, values, p } = buildHits({ domain, needles, customerIds, chips })
  return {
    text: `WITH hits AS (${sql}),
ranked AS (
  SELECT DISTINCT ON (entity_id) entity_id, attr, display, tier,
         ${priorityCase(domain)} AS priority
  FROM hits ORDER BY entity_id, tier, ${priorityCase(domain)}
)
SELECT entity_id, attr, display, tier, priority, count(*) OVER()::int AS __total
FROM ranked
ORDER BY tier, priority, display, entity_id
LIMIT ${p(limit)}`,
    values,
  }
}

/**
 * Suggestion panel: the same hits, grouped by attribute.
 *
 * Deliberately NOT built on buildSearchQuery — that collapses to one row per
 * entity, so an entity matching both `pro` and `load` would hide `load` from the
 * panel entirely and undercount every attribute after the first.
 *
 * Under multi-code, an attribute is offered ONLY if it matches EVERY code
 * (GS-20). That is a DISTINCT-needle count, not an entity count: one code
 * matching five entities must not pass a two-code gate.
 */
export function buildSuggestQuery({ domain, needles, customerIds, chips }) {
  const { sql, values } = buildHits({ domain, needles, customerIds, chips })
  // GS-20's gate counts TEXT needles only — chips never touch `needles`, so a
  // chips-only suggest call (needles.length === 0) never trips this HAVING.
  const having = needles.length > 1
    ? `HAVING count(DISTINCT needle_ix) = ${needles.length}`
    : ''
  return {
    text: `WITH hits AS (${sql})
SELECT attr, min(tier)::int AS best_tier, count(DISTINCT entity_id)::int AS n,
       (array_agg(display ORDER BY tier))[1:3] AS samples
FROM hits GROUP BY attr ${having}
ORDER BY min(tier), n DESC`,
    values,
  }
}

/**
 * The ranked hit set as an embeddable subquery — one row per entity, carrying
 * the tier/priority/display that the TOTAL order sorts on.
 *
 * This is what makes "Show all results" land on exactly the list the preview
 * showed (GS-16): the list query JOINs the SAME ranking the preview ordered by,
 * instead of a second hand-written copy of the tier SQL that has to be kept in
 * agreement. `bind` is the caller's parameter binder.
 */
export function buildRankedSubquery({ domain = 'shipments', needles, chips, bind }) {
  const { sql } = buildHits({ domain, needles, chips, bind })
  return `(SELECT DISTINCT ON (entity_id) entity_id, tier, display,
             ${priorityCase(domain)} AS priority
           FROM (${sql}) h
           ORDER BY entity_id, tier, ${priorityCase(domain)})`
}

/** Phrase-first, code-list fallback (GS-20). Decided ONCE per query against the
 *  full index — tokenizing a phrase like "WEYERHAEUSER COMPANY" would union in
 *  every row containing "COMPANY".
 *
 *  Deliberately CHIP-FREE: the mock's twin (criteria.js textNeedles) resolves
 *  `textNeedles(getAllShipments(), text)` against the FULL dataset, not the
 *  chip-filtered subset — a phrase that matches nothing WITHIN a chip
 *  restriction still needs the same phrase-vs-tokens decision every other
 *  surface makes, so this stays scoped only by customerIds, never by chips. */
export async function resolveNeedles(db, domain, text, customerIds) {
  const q = String(text ?? '').trim()
  if (!q) return []
  const tokens = q.split(/[\s,]+/).filter(Boolean)
  if (tokens.length < 2) return [q]
  const probe = buildSearchQuery({ domain, needles: [q], limit: 1, customerIds })
  const { rows } = await db.query(probe)
  return rows.length ? [q] : tokens
}

// POST /api/v1/search — QUERY-shaped (safe, idempotent, deterministic).
// RFC 10008 QUERY is the target verb; Vercel returns 400 for it today and
// CloudFront (our pending infra) hard-rejects it, so the method is POST and
// everything else already matches (spec §5).
export async function searchHandler({ body, db }) {
  const { domain = 'shipments', criteria = {}, scope = {}, page = {} } = body ?? {}
  if (!REGISTRY[domain]) return { results: [], total: 0 }
  const chips = criteria.chips ?? []
  const needles = await resolveNeedles(db, domain, criteria.text, scope.customerIds)
  // Chips-only queries (needles empty, chips non-empty) are valid — this guard
  // used to be `!needles.length`, which silently dropped every committed chip
  // (the "click Order # suggestion → blank glimpse" bug: the input clears on
  // commit, so criteria.text is empty and needles resolves to []).
  if (!needles.length && !chips.length) return { results: [], total: 0 }
  const { rows } = await db.query(
    buildSearchQuery({ domain, needles, chips, limit: page.limit ?? 15, customerIds: scope.customerIds }),
  )
  const results = rows.map(({ __total, ...r }) => r)
  return {
    total: rows[0]?.__total ?? 0,
    results: await hydrate(db, domain, results),
  }
}

/**
 * Attach the wide row fields to the ≤15 ranked hits. Without this the preview
 * renders a bare matched value with no route/customer/carrier, and GS-18 has no
 * `panel` to choose the landing tab from — the live preview would be visually
 * unlike the mock it is supposed to be behaviourally identical to.
 */
async function hydrate(db, domain, results) {
  const cfg = REGISTRY[domain]?.hydrate
  if (!cfg || !results.length) return results
  const { rows } = await db.query({
    text: `SELECT ${cfg.columns} FROM ${cfg.table} WHERE ${cfg.key} = ANY($1)`,
    values: [results.map((r) => r.entity_id)],
  })
  const byId = new Map(rows.map((r) => [String(r[REGISTRY[domain].entityKey]), r]))
  return results.map((r) => ({ ...r, entity: byId.get(String(r.entity_id)) ?? null }))
}

export async function suggestHandler({ body, db }) {
  const { domain = 'shipments', criteria = {}, scope = {} } = body ?? {}
  if (!REGISTRY[domain]) return { attributes: [] }
  const chips = criteria.chips ?? []
  const needles = await resolveNeedles(db, domain, criteria.text, scope.customerIds)
  if (!needles.length && !chips.length) return { attributes: [] }
  const { rows } = await db.query(buildSuggestQuery({ domain, needles, chips, customerIds: scope.customerIds }))
  // Multi-code gating is done in SQL (HAVING on DISTINCT needles). Samples still
  // arrive duplicated — the same display matches under several tier branches.
  return {
    attributes: rows.map((r) => ({ ...r, samples: [...new Set(r.samples ?? [])].slice(0, 3) })),
  }
}
