// apps/odyssey-one/tools/seed-users.mjs — spec "Auth model": guest + 8 mock users.
// Passwords are deliberately fake/shared ('odyssey'); guest has NULL password —
// it cannot log in and is read-only (sees-all, writes-nothing, API-enforced).
// Customer ids are REAL ids from tools/data-pools.mjs CUSTOMERS. Planners mix
// 1/2/4 customers; managers hold larger sets; admin is unscoped ([] = all).
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
]
