// api/_lib/preferences.mjs — per-user UI preferences (user_preferences table:
// PK (user_id, key), value jsonb). Builders are pure ({ text, values }) so they
// test without a DB; all user input reaches SQL only through $N parameters.
// Identity: nothing authenticates today — the client sends its mock-SSO userId
// in query/body; absent, 'guest'. Replaced when real SSO lands (Soni).

export function buildGetPreferenceQuery(userId, key) {
  return {
    text: `SELECT value FROM user_preferences WHERE user_id = $1 AND key = $2`,
    values: [userId, key],
  }
}

export function buildPutPreferenceQuery(userId, key, value) {
  return {
    text: `INSERT INTO user_preferences (user_id, key, value, updated_at)
           VALUES ($1, $2, $3::jsonb, now())
           ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    values: [userId, key, JSON.stringify(value)],
  }
}

// GET /user-service/v1/preference?key=...&userId=...
export async function getPreference({ query, db }) {
  const key = query.get('key')
  if (!key) { const e = new Error('key required'); e.status = 400; throw e }
  const userId = query.get('userId') || 'guest'
  const { rows } = await db.query(buildGetPreferenceQuery(userId, key))
  return { key, value: rows[0]?.value ?? null }
}

// PUT /user-service/v1/preference — body { key, value, userId? }
export async function putPreference({ body, db }) {
  const key = body?.key
  if (!key) { const e = new Error('key required'); e.status = 400; throw e }
  if (body?.value === undefined) { const e = new Error('value required'); e.status = 400; throw e }
  const userId = body?.userId || 'guest'
  try {
    await db.query(buildPutPreferenceQuery(userId, String(key), body.value))
  } catch (err) {
    // FK violation = userId not in the seeded users table — honest 400, not a 500.
    if (err?.code === '23503') { const e = new Error(`Unknown user: ${userId}`); e.status = 400; throw e }
    throw err
  }
  return { success: true }
}
