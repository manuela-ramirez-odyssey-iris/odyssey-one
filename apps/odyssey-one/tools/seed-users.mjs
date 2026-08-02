// apps/odyssey-one/tools/seed-users.mjs — spec "Auth model": guest + 8 mock users.
// Passwords are deliberately fake/shared ('odyssey'); guest has NULL password —
// it cannot log in and is read-only (sees-all, writes-nothing, API-enforced).
// Customer ids are REAL ids from tools/data-pools.mjs CUSTOMERS. Planners mix
// 1/2/4 customers; managers hold larger sets; admin is unscoped ([] = all).

/**
 * The Odyssey USERNAME — the identity `orders.created_by` / `last_edited_by`
 * store (R2-4). Display names are ambiguous when two people share one, which is
 * exactly why the user ruled against storing the name.
 *
 * INVENTED for now: the real usernames come from the user-management domain,
 * which does not exist yet (user, 2026-08-02). Derived from the display name so
 * the whole set is consistent and regenerable — replace this function, not 13
 * hand-written strings, when that domain arrives.
 *
 *   'Amy Cook' → 'amy.cook' · 'Janardhana K.' → 'janardhana.k'
 */
export function usernameFor(name) {
  return String(name).toLowerCase().replace(/\./g, '').trim().split(/\s+/).join('.')
}

export const USERS = [
  { id: 'guest',        email: 'guest@odyssey.local', name: 'Guest',        password: null,      role: 'guest',   customers: [] }, // [] = sees all, writes nothing
  { id: 'planner-ava',  email: 'ava@odyssey.local',   name: 'Ava Planner',  password: 'odyssey', role: 'planner', customers: ['VALTRIS_01', 'ERCO_SYS_01'] },
  { id: 'planner-ben',  email: 'ben@odyssey.local',   name: 'Ben Planner',  password: 'odyssey', role: 'planner', customers: ['DOW_IND_01'] },
  { id: 'planner-cara', email: 'cara@odyssey.local',  name: 'Cara Planner', password: 'odyssey', role: 'planner', customers: ['VALTRIS_01', 'BASF_CHM_01', 'ERCO_SYS_01', 'SOLENIS_01'] },
  { id: 'planner-dan',  email: 'dan@odyssey.local',   name: 'Dan Planner',  password: 'odyssey', role: 'planner', customers: ['SHELL_OIL_01', 'HUNT_REF_01'] },
  { id: 'planner-eve',  email: 'eve@odyssey.local',   name: 'Eve Planner',  password: 'odyssey', role: 'planner', customers: ['KEMIRA_NA_01'] },
  { id: 'manager-mia',  email: 'mia@odyssey.local',   name: 'Mia Manager',  password: 'odyssey', role: 'manager', customers: ['VALTRIS_01', 'ERCO_SYS_01', 'BASF_CHM_01', 'DOW_IND_01', 'SOLENIS_01', 'GEON_01'] },
  { id: 'manager-noah', email: 'noah@odyssey.local',  name: 'Noah Manager', password: 'odyssey', role: 'manager', customers: ['SHELL_OIL_01', 'HUNT_REF_01', 'LYOND_PET_01', 'COVES_PLY_01'] },
  { id: 'admin-zoe',    email: 'zoe@odyssey.local',   name: 'Zoe Admin',    password: 'odyssey', role: 'admin',   customers: [] }, // admin: unscoped
  // sso-mock personas (src/data/sso-mock.js) — the navbar user switcher sends
  // these ids with preference writes; they must exist for the users FK.
  { id: 'u1', email: 'amy.cook@odyssey.com',        name: 'Amy Cook',        password: 'odyssey', role: 'admin',   customers: [] },
  { id: 'u2', email: 'david.johns@odyssey.com',     name: 'David Johns',     password: 'odyssey', role: 'manager', customers: [] },
  { id: 'u3', email: 'janardhana.k@odyssey.com',    name: 'Janardhana K.',   password: 'odyssey', role: 'manager', customers: [] },
  { id: 'u4', email: 'manuela.ramirez@odyssey.com', name: 'Manuela Ramirez', password: 'odyssey', role: 'admin',   customers: [] },
]

/**
 * The pool orders draw `created_by` / `last_edited_by` from — REAL seeded users,
 * so a created_by value always names a row in `users`. An identity that resolves
 * to nobody is not an identity, which was the point of the ruling.
 * Guest is excluded: it cannot log in and writes nothing, so it never authors.
 */
export const ORDER_AUTHOR_USERNAMES = USERS
  .filter((u) => u.role !== 'guest')
  .map((u) => usernameFor(u.name))
