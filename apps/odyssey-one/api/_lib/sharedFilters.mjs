// api/_lib/sharedFilters.mjs — Save Filters sharing (shared_filters table:
// id PK, owner_user_id FK→users ON DELETE CASCADE, name, chips jsonb,
// created_at). Builders are pure ({ text, values }) so they test without a
// DB; all user input reaches SQL only through $N parameters — same discipline
// as preferences.mjs.
//
// Deliberate contrast with preferences.mjs: EVERY preference read there is
// hard-scoped to the calling user (`WHERE user_id = $1`). The list below is
// NOT scoped — GET returns every shared filter to every caller, because that
// is the entire point of sharing. Do not "fix" this into a
// `WHERE owner_user_id = $1` query; that would silently break sharing.
//
// Identity/authorization ceiling: nothing authenticates today — the client
// sends its mock-SSO userId in the request body, same as preferences.mjs.
// ponytail: the author checks below (requireOwner) compare owner_user_id to
// that client-supplied value, which is spoofable by construction (any caller
// can claim any userId). This is accident-prevention, not real authorization
// — it prevents an honest client from clobbering someone else's shared
// filter today, and becomes real enforcement the moment SSO (Soni) lands and
// userId comes from a verified session instead of client-supplied JSON.

export function buildListSharedFiltersQuery() {
  return {
    text: `SELECT sf.id, sf.owner_user_id AS "ownerId", u.username AS "ownerUsername",
                  sf.name, sf.chips, sf.created_at AS "createdAt"
           FROM shared_filters sf
           JOIN users u ON u.id = sf.owner_user_id
           ORDER BY sf.created_at DESC`,
    values: [],
  }
}

export function buildInsertSharedFilterQuery(id, ownerUserId, name, chips) {
  return {
    text: `INSERT INTO shared_filters (id, owner_user_id, name, chips)
           VALUES ($1, $2, $3, $4::jsonb)
           RETURNING id, owner_user_id AS "ownerId", name, chips, created_at AS "createdAt"`,
    values: [id, ownerUserId, name, JSON.stringify(chips)],
  }
}

export function buildGetOwnerQuery(id) {
  return {
    text: `SELECT owner_user_id AS "ownerId" FROM shared_filters WHERE id = $1`,
    values: [id],
  }
}

export function buildRenameSharedFilterQuery(id, name) {
  return {
    text: `UPDATE shared_filters SET name = $2 WHERE id = $1 RETURNING id, name`,
    values: [id, name],
  }
}

export function buildDeleteSharedFilterQuery(id) {
  return {
    text: `DELETE FROM shared_filters WHERE id = $1`,
    values: [id],
  }
}

// GET /filter-service/v1/shared-filters — unscoped by design (see header).
export async function listSharedFilters({ db }) {
  const { rows } = await db.query(buildListSharedFiltersQuery())
  return { filters: rows }
}

// POST /filter-service/v1/shared-filters — body { id, name, chips, userId? }.
// `id` is client-generated (crypto.randomUUID(), the SAME id the filter
// already carries as a Custom entry — sharing moves it, not copies it), so a
// hydrate on the Custom side and this row can be reconciled by id.
export async function createSharedFilter({ body, db }) {
  const id = body?.id
  const name = body?.name
  const chips = body?.chips
  if (!id) { const e = new Error('id required'); e.status = 400; throw e }
  if (!name) { const e = new Error('name required'); e.status = 400; throw e }
  if (!Array.isArray(chips) || chips.length === 0) { const e = new Error('chips required'); e.status = 400; throw e }
  const userId = body?.userId || 'guest'
  try {
    const { rows } = await db.query(buildInsertSharedFilterQuery(id, userId, name, chips))
    return { filter: rows[0] }
  } catch (err) {
    // FK violation = userId not in the seeded users table — honest 400, same
    // pattern preferences.mjs uses for its FK case, not a raw 500.
    if (err?.code === '23503') { const e = new Error(`Unknown user: ${userId}`); e.status = 400; throw e }
    // Unique violation = this id is already shared (double-share race) — 409,
    // not a 500; mirrors orders.mjs's 23505 handling for order_number.
    if (err?.code === '23505') { const e = new Error(`Already shared: ${id}`); e.status = 409; throw e }
    throw err
  }
}

// Author check shared by PATCH/DELETE. Two queries (lookup, then act) instead
// of folding the ownership check into a single `WHERE id = $1 AND
// owner_user_id = $2` so the two failure modes stay distinguishable to the
// client: 404 when the id doesn't exist at all, 403 when it exists but the
// caller isn't its author. Collapsing them would make "not yours" and
// "doesn't exist" indistinguishable, which is worse for debugging a prototype
// and buys no real security here anyway (see ceiling note above).
async function requireOwner(db, id, userId) {
  const { rows } = await db.query(buildGetOwnerQuery(id))
  if (rows.length === 0) { const e = new Error(`No shared filter: ${id}`); e.status = 404; throw e }
  if (rows[0].ownerId !== userId) {
    const e = new Error('Only the author can modify a shared filter'); e.status = 403; throw e
  }
}

// PATCH /filter-service/v1/shared-filters/:id — body { name, userId? }.
// Author only (403 for anyone else, 404 for an unknown id — see requireOwner).
export async function renameSharedFilter({ params, body, db }) {
  const id = params[0]
  const name = body?.name
  if (!name) { const e = new Error('name required'); e.status = 400; throw e }
  const userId = body?.userId || 'guest'
  await requireOwner(db, id, userId)
  const { rows } = await db.query(buildRenameSharedFilterQuery(id, name))
  return { filter: rows[0] }
}

// DELETE /filter-service/v1/shared-filters/:id — body { userId? }. Author
// only. This IS the "un-share" path (spec Behaviour 4: Odyssey → Custom drag)
// as well as a plain delete — both remove the row; the UI decides what to do
// with the id afterward (restore to Custom vs. drop it).
export async function deleteSharedFilter({ params, body, db }) {
  const id = params[0]
  const userId = body?.userId || 'guest'
  await requireOwner(db, id, userId)
  await db.query(buildDeleteSharedFilterQuery(id))
  return { success: true }
}
