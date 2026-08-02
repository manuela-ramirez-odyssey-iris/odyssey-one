# Progressive Search — Backend/API Architecture Design

**Date:** 2026-07-31 (S104)
**Status:** DRAFT — pending user approval; nothing here is implemented
**Sources:** user direction 2026-07-31 (research-first ruling; DB-saturation concern; multi-domain reuse; HTTP QUERY question) · S104 cases + decisions GS-14…GS-19 (`vault/20-cross-cutting/global-search/`) · two research reports 2026-07-31 (HTTP QUERY ecosystem; search-backend patterns — sources cited inline where load-bearing)
**Supersedes:** nothing — this is the first server-side search design. The S79c mock pipeline (shared `criteria.js` matcher) remains the behavioral reference.

---

## 1. What this must do (the contract, already settled by cases)

These are not open questions — each is a shipped, tested behavior in mock mode
(`composed-criteria.test.js`, 46 tests) that the live implementation must
reproduce:

| Requirement | Source |
|---|---|
| Chips ANDed; free text ORed across identifier fields; exact-flagged chips match by equality | S79c d.7, Case 1 |
| Bare code resolves to WHICH attribute matched; row labeled `Order #…` / `Pro#/Booking #…` | GS-15, Case 3 |
| Ranking exact > prefix > contains; attribute priority breaks ties | GS-15 |
| Preview rows 1–15 ≡ table rows 1–15 — same filter AND same order | GS-16/16a, Case 6 |
| Landing tab from the preview's leading group | GS-18, Case 8 |
| Panel tabs permanent; counts narrow, tabs never vanish | GS-19 |
| Criteria-filtered per-category counts (tab badges, pills) | S79c d.7 |
| Customer scope applied before everything | S79c d.10 |
| Multi-code lists: typed codes UNION (per-code rankings interleave, each row labeled by its own code); same-attribute list → one IN-list chip; mixed → no chip | GS-20, Case 9 |
| Natural-language mode reachable via explicit "intelligent" trigger — future scope, seam reserved | Case 10 |
| Typeahead: attributes ranked by how well REAL values match the input | S82 |

Non-functional (user, 2026-07-31): **search must not be able to saturate the
primary DB**, and the architecture must be **reusable across domains**
(shipments, orders, carriers, tracking, spotboard).

## 2. The gap today

Live mode (`VITE_API_MODE=live`) has **no search implementation at all**:
`buildListQuery` ignores `searchCriteria`, `buildCountsQuery` doesn't accept
criteria, and `SORT_MAP` has no relevance entry — the client sends criteria,
the SQL drops them (measured S104; this produced the "still showing all
results" report). The preview meanwhile runs on local JSON. The two surfaces
disagree by construction.

## 3. Core architecture: the search-projection table

> Research finding (verified): the pattern real TMS/ERP global search uses —
> whatever the engine — is a narrow keyword projection: identifier values
> indexed for exact/prefix/contains, keyed back to the entity. In Postgres
> that is a side table, not OR-across-15-columns on the wide row.

```sql
CREATE TABLE search_index (
  domain     text NOT NULL,          -- 'shipments' | 'orders' | ...
  entity_id  text NOT NULL,          -- sellShipment for shipments rows
  attr       text NOT NULL,          -- 'order' | 'pro' | 'seal' | 'scac' | ...
  value      text NOT NULL,          -- normalized (upper/trim; per-attr rules)
  display    text NOT NULL,          -- original casing for the UI
  PRIMARY KEY (domain, attr, entity_id, value)
);

-- exact + prefix tiers (tiny, cheap to write):
CREATE INDEX si_prefix ON search_index (domain, value text_pattern_ops)
  INCLUDE (attr, entity_id);
-- contains tier (only earns its cost for substring match):
CREATE INDEX si_trgm ON search_index USING gin (value gin_trgm_ops);
```

Why this shape (and not searching `shipments` directly):

1. **"Which attribute matched" is a column** — GS-15's row labeling falls out
   of the schema instead of being recomputed per row.
2. One index probe replaces a 14-field OR; the trigram write cost lands on a
   side table, not the OLTP row.
3. It **is** the multi-domain contract: orders/carriers/tracking are more rows
   in the same table; cross-domain search is dropping the `domain =` predicate.
4. Sync is trivial at our scale: the data is generator-owned, so the projection
   is rebuilt by `seed.mjs` in the same reseed motion. (Target-scale sync —
   triggers → CDC — documented in §8, not built now.)

This is the server-side twin of the client seam we already have: what
`searchIndex.js` memoizes per attribute locally, materialized as a table.

## 4. Ranking: three tiers, each on its own index

> Research finding: don't compute rank as a CASE over ILIKEs (forces evaluation
> across the whole match set). UNION the tiers; each branch is independently
> index-served; dedupe by best tier.

```sql
WITH q AS (SELECT upper($1) AS v),
hits AS (
  SELECT entity_id, attr, display, 0 AS tier            -- exact (btree)
    FROM search_index, q WHERE domain = $2 AND value = q.v
  UNION ALL
  SELECT entity_id, attr, display, 1                    -- prefix (text_pattern_ops)
    FROM search_index, q
   WHERE domain = $2 AND value LIKE q.v || '%' AND value <> q.v
  UNION ALL
  SELECT entity_id, attr, display, 2                    -- contains (trgm GIN)
    FROM search_index, q
   WHERE domain = $2 AND value LIKE '%' || q.v || '%'
     AND value NOT LIKE q.v || '%'
),
ranked AS (
  SELECT DISTINCT ON (entity_id) entity_id, attr, display, tier
  FROM hits ORDER BY entity_id, tier
)
SELECT * FROM ranked
ORDER BY tier, attr_priority(attr), display, entity_id   -- TOTAL, deterministic
LIMIT $3;
```

Rules that ride along:

- **Skip the contains branch when `length(q) < 3`** — trigram indexes can't
  serve shorter patterns (this is why the client min-length rule is an
  architecture decision, not just UX).
- API layer may run tiers serially and stop when the page fills — exact hits
  usually satisfy the 15-row preview alone.
- `attr_priority` = the progression order (`FREE_TEXT_ATTRS` index), same
  tiebreaker as the client today.
- **The preview and the table execute this same ordered query.** The order is
  total, so `LIMIT 15` is provably rows 1–15 of the table — Case 6 by
  construction, not by parallel implementations agreeing (the S104 lesson:
  they didn't).
- Deep pagination: keyset on `(tier, display, entity_id)`, not OFFSET.

**Consistency argument for staying in Postgres:** the moment ranking lives in
an external engine (Typesense/Meili/ES) and the table query stays in SQL,
preview≡table becomes a distributed-consistency problem. Our hardest invariant
is the strongest reason the ranking and the table read must live in one system.

### 4a. Multi-code lists (Case 9 / GS-20)

Each code runs the tiered CTE **independently** — the projection makes this the
cheap path, not the expensive one:

- **Free text, N codes** (UNION): `UNION` the per-code hit sets, then
  `DISTINCT ON (entity_id)` by best tier — a row that matches two codes appears
  once, at its best rank. No intersect, no join fan-out.
- **Row labeling**: the surviving hit row already carries `attr` and `display`,
  so each row is labeled by the code that produced it — GS-20's per-row labeling
  is free in this schema (it is the same column Case 3 uses).
- **IN-list chip** (same attribute, OR within): one branch per tier with
  `value = ANY($values)` — one probe, not N queries.
- **Suggestion gating**: `GROUP BY attr HAVING count(DISTINCT code_idx) = N`
  over the suggest CTE — attributes matching EVERY code, exactly the client rule.
- **Phrase-first is a server rule too**: run the whole string as one needle;
  tokenize only on zero hits. One extra round trip in the rare case, none in the
  common one — and it is what stops `"Weyerhaeuser Company"` from unioning in
  every row containing "company".
- **Parse once per query, not per row**: the phrase-vs-code-list decision is a
  property of the query against the full dataset. Server-side it is decided in
  the search function and passed to the list + counts queries together, mirroring
  `textNeedles()` client-side, so all three surfaces read the query identically.

## 5. Endpoint contract — and the HTTP QUERY answer

> Research findings (verified): **QUERY is now RFC 10008, Proposed Standard,
> June 2026** — safe, idempotent, cacheable, with the request body part of the
> cache key. Node ≥22 parses it natively and browser `fetch` sends it. **But
> Vercel returns 400 for QUERY requests** (vercel/next.js#77390, open,
> unresolved), and **CloudFront hard-rejects non-allowlisted methods** — which
> is our pending infra (Soni). Framework adoption is early (Tomcat 12 first);
> no major API gateway supports it yet.

**Decision proposed: document-QUERY, ship-POST.** A "QUERY with POST fallback"
would run the POST path 100% of the time on our exact stack while doubling the
code. Instead the endpoint is **QUERY-shaped in everything but the verb**, so
the flip is a one-line method change per side when Vercel routes it:

```
POST /api/v1/search            (future: QUERY /api/v1/search)
Content-Type: application/json   (mandatory — QUERY semantics)

{
  "domain": "shipments",
  "criteria": { "chips": [{ "key": "order", "value": "0000000091000" }],
                "text": "12" },
  "scope":   { "customerIds": ["WEYERH_01"] },   -- optional
  "page":    { "limit": 15, "cursor": null }
}
```

QUERY-shaped means: **no side effects, deterministic result for identical
bodies, body-as-cache-key friendly** (stable JSON key order client-side),
`Cache-Control: s-maxage=30, stale-while-revalidate=300` on responses. This is
also the contract we recommend to Cognizant for the real service — with the
RFC 10008 citation — since their gateway may adopt QUERY on its own schedule.

Three logical operations, one style:

| Operation | Endpoint | Returns |
|---|---|---|
| Resolve + rank | `POST /api/v1/search` | ranked entity hits `{entity_id, attr, display, tier}` + total |
| Suggestions | `POST /api/v1/search/suggest` | `GROUP BY attr` over the same hits CTE: `{attr, best_tier, count, samples[]}` |
| Counts | existing count endpoint gains `criteria` | per-category counts, criteria-filtered |

The list endpoint (`error/list`) gains `searchCriteria` handling by **joining
the ranked CTE** rather than re-implementing matching — one matcher server-side,
same single-source rule as `criteria.js` client-side (S79c d.7).

## 6. Load isolation: Neon read replica

> Research finding (verified): Neon read replicas are **compute-only** — same
> shared Pageserver storage, no data copy, no traditional replication lag,
> **available on the Free plan** (≤3/project), billed only as CU-hours while
> awake, scale-to-zero.

The search function gets `SEARCH_DATABASE_URL` pointing at a read-replica
endpoint. Search traffic then **structurally cannot** saturate the primary's
compute — the user's stated concern, answered by construction rather than by
tuning. Plus guardrails on the search role: `statement_timeout = 500ms`,
per-branch `LIMIT`s.

Client discipline (protects the replica too): 250ms debounce, min 2 chars
(3 to enable the contains tier), AbortController on superseded keystrokes,
client LRU per prefix. CDN caching via `s-maxage` dedupes identical queries
across users.

### 6a. The preview is an index probe — the "buffer zone", made explicit

> User (2026-08-01): *"the preview panel was not only meant to show quick
> clickable results but also to avoid fetching the whole database constantly
> for a query that might not be right … only fetch an index (minimum
> information for the preview panel and only ~12 relevant results) instead of
> the whole bulk."*

That instinct **is** this architecture — stating it as an explicit invariant so
no implementation phase regresses it:

1. **While typing, only `search_index` is ever touched.** The preview query
   returns narrow hit rows — `{entity_id, attr, display, tier}`, `LIMIT 15` —
   never the wide `shipments` row, never a `SELECT *`, never an unbounded scan.
   The wide-row fetch happens exactly twice: on a match-row **click** (one
   detail fetch, already the case) and on **commit** ("Show all results" → the
   paginated table query).
2. **A query that "might not be right" costs almost nothing**: an uncommitted
   keystroke's worst case is one index probe on a replica, bounded by `LIMIT`,
   `statement_timeout`, debounce, min-length and the CDN cache in front of it.
   The buffer zone is the stack of §6 disciplines + the projection's narrowness.
3. **Typing never touches the table pipeline at all** — S79b decision 5
   (typing never filters the table) is thereby also a load rule, not just UX:
   the expensive query only runs on explicit commit.

Preview payload budget: ≤15 hits × 4 short fields ≈ single-digit KB per
keystroke that survives the debounce.

## 7. Multi-domain reuse: registry, not per-domain endpoints

Each domain registers — this is `progression.js` moved server-side:

```js
{ domain: 'shipments',
  attrs: {
    order: { label: 'Order #',  normalize: upperStrip, tiers: ['exact','prefix','contains'], priority: 2 },
    scac:  { label: 'SCAC',     normalize: upper,      tiers: ['exact','prefix'],            priority: 17 },
    // trgm is deliberately NOT applied to 4-char codes like SCAC — prefix suffices
  },
  project: row => [ /* row → search_index entries */ ] }
```

The registry drives projection extraction, per-attr normalization (PRO numbers
strip separators; SCACs don't), which tiers apply, and labels. Per-domain
*endpoints* would duplicate the ranking query and drift — the exact class of
bug Case 6 exists to forbid.

The client keeps its adapter seam unchanged: `shipmentsSearchAdapter` swaps its
internals from local JSON to these endpoints, invisible to `useGlobalSearch`
and every component — the swap the seam was built for (S79).

## 8. Scale story + escalation ladder (documented target)

Same logical architecture at production scale — projection + tiered query +
registry — with: sync upgraded triggers→CDC/outbox, reads pinned to replicas,
keyset pagination, per-attr partial indexes if one attr dominates. Research
verdict: this serves **tens of millions of projection rows at p95 in the tens
of ms**.

Escalation ladder (written down so nobody designs for Elastic prematurely):

1. **Tune Postgres** — partial indexes, replica autoscaling.
2. **ParadeDB `pg_search`** (BM25 in-Postgres; verified available on Neon,
   actively maintained through 2026) — if relevance needs outgrow
   exact/prefix/contains. No second system; preview≡table survives.
3. **OpenSearch/Typesense fed by CDC** — only if search QPS or faceting
   outgrows the DB, accepting that BOTH the preview and the table query must
   move to the engine together.

Trigger: search p95 > 200ms sustained at current tier, or a relevance
requirement (typo tolerance, synonyms, multi-language) that trigram can't
express.

### 8a. Natural-language search (Case 10) — future scope, seam reserved

User direction (2026-08-01): vectorized/natural-language queries behind an
explicit **"intelligent" button** — deliberately NOT explored now. What this
spec reserves so it bolts on without rework:

- The endpoint body gains a `mode` field (`"criteria"` default; `"semantic"`
  later) — same URL, same QUERY-shaped semantics, different ranker.
- **pgvector is available on Neon** — embeddings would live beside
  `search_index` (an `embedding vector` column or sibling table), keeping the
  one-system consistency property. No engine decision is being made here.
- The explicit trigger matters architecturally: semantic search never runs on
  keystrokes, so the §6a load model is untouched.

Nothing else is designed, by user direction.

## 9. Implementation plan (after approval — nothing started)

| Phase | What | Where |
|---|---|---|
| 1 | `search_index` DDL + projection build in `seed.mjs`; registry module | `packages/db` migration, `apps/odyssey-one/tools/` |
| 2 | `/api/v1/search` + `/suggest` (tiered CTE); counts endpoint gains criteria; list endpoint joins ranked CTE; `RELEVANCE_SORT` mapped | `apps/odyssey-one/api/_lib/` |
| 3 | Neon read replica + `SEARCH_DATABASE_URL`; timeouts; cache headers | Neon console + env |
| 4 | Adapter swap behind the seam; mock stays as the fixture/reference path | `src/search/shipments/adapter.js`, `gridService.ts` |
| 5 | Acceptance: the 46 composed-criteria tests run against BOTH modes; add live-parity probes | test config |

Gates: Phase 1–2 need a **reseed** (projection table) — rides the next
user-gated reseed motion, or the Neon **dev branch** (copy-on-write, instant,
prod untouched) if we build before that motion. Phase 3 creates a Neon object —
user-gated. **Mock mode survives** as the case-discovery environment — cases
continue to be discovered there and become acceptance tests here.

## 10. Open questions

1. **Result grain server-side** — Case 1's order-explosion (order-scoped
   leading chip → order rows): explode in SQL (`attr='order'` hits are already
   per-order) or in the API layer? Leaning SQL — the projection makes it free.
2. **Date/enum attributes** in the projection: dates want range semantics, not
   text tiers — likely stay OUT of `search_index` (they're chip-only, never
   bare-pasted) and keep hitting typed columns. Flagged, not decided.
3. **`domain=all`** (cross-domain search): the table gives it for free; the UX
   (mixed-entity result list) is a design conversation with Efrain, not built.
4. **Cognizant handoff shape** — whether the registry lives in our repo or
   becomes an API-contract doc for their gateway team. Political, not
   technical (design-system ownership scope is visual-only).
