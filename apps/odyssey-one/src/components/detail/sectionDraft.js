// Draft/dirty helpers for the Shipment Details modal's section edit mode
// (2026-08-11). Pure so the dirty rule is testable without a DOM — it gates
// the Save Changes button AND the discard prompt, so a silent regression here
// would either strand the user or lose their work.

// ponytail: structural clone via JSON. These drafts are flat objects of
// strings and small arrays of {id,type,value} — no Dates, no undefined, no
// cycles. structuredClone if a draft ever holds something JSON can't carry.
const clone = (o) => JSON.parse(JSON.stringify(o))

/** Open a section for editing. Draft and baseline are independent copies. */
export function startEdit(section, initial) {
  return { section, draft: clone(initial), baseline: clone(initial) }
}

/**
 * Has anything actually changed? Key ORDER is irrelevant for the object-shaped
 * General Information draft but IS meaningful for reference arrays (the user
 * can reorder rows), and JSON.stringify honours both correctly: objects are
 * built from the same literal so their key order matches, arrays compare
 * positionally.
 */
export function isDirty(edit) {
  if (!edit) return false
  return JSON.stringify(edit.draft) !== JSON.stringify(edit.baseline)
}
