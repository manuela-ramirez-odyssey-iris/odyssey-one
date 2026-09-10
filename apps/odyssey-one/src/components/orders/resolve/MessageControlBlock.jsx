import { Radio } from '@odyssey/ui'

/**
 * MessageControlBlock — Step 1 (LINX-16049) rules 8–11: the provenance of the
 * incoming message itself, not the order's data.
 *
 * Only `deleteFlag` (rule 10) is user-settable, and only as a boolean —
 * Ramesh, PO, 2026-09-10 #1: "The user can only write boolean, yes or no."
 * That ruling is the whole point of this component: the flag decides whether
 * the message CREATES an order (N) or CANCELS an existing one (Y), so a
 * free-text or a guessed value could process a customer's cancellation as a
 * brand-new order. Hence: two explicit radios, wire values 'Y' | 'N', and
 * NOTHING preselected — `deleteFlag` starts null and the block says so out
 * loud ("Not answered yet") rather than letting an unchecked pair read as an
 * implicit "No".
 *
 * COPY (deliberate, see the "Not answered yet" note above): the labels spell
 * out the CONSEQUENCE, not the agreement — "Yes" alone reads like assent, and
 * a planner nodding along to "Yes" would flip a create into a cancel. Every
 * option therefore names what the message DOES.
 *
 * rules 8/9/11 (relySourceId / sourceSystem / modifyTimestamp) are
 * display-only: the planner cannot fix them here and cannot Purge here either
 * (Purge exists only on Step 2). Their real exit is a backend decision that is
 * still an OPEN QUESTION (Venkat), so the UI shows the backend message plus a
 * contact-support line — no fake affordance.
 *
 * Rows come from `derived.messageControl` (interfaceErrors.js):
 * { id, rule, editable, fieldTree, field, message }.
 */
export default function MessageControlBlock({ rows = [], deleteFlag, onDeleteFlag, disabled = false }) {
  return (
    <div className="message-control">
      {rows.map((r) => (
        <div key={r.id} className={`message-control__row${r.editable ? '' : ' message-control__row--locked'}`}>
          <div className="message-control__what">
            <code className="message-control__tree text-label-xs-regular">{r.fieldTree}</code>
            <span className="message-control__message text-label-sm-regular">{r.message}</span>
          </div>
          {r.editable ? (
            // The group is named by its VISIBLE prompt (aria-labelledby) rather
            // than a hidden aria-label — one string, no chance of the two
            // drifting apart. The native shared `name` already gives arrow-key
            // navigation; role="radiogroup" is here only to carry that name.
            <div
              className="message-control__choice"
              role="radiogroup"
              aria-labelledby={`delete-flag-prompt-${r.id}`}
            >
              <span id={`delete-flag-prompt-${r.id}`} className="message-control__prompt text-label-sm-medium">
                Does this message cancel an existing order?
              </span>
              <Radio name={`delete-flag-${r.id}`} value="N" label="No — this message creates an order" checked={deleteFlag === 'N'} disabled={disabled} onChange={() => onDeleteFlag('N')} />
              <Radio name={`delete-flag-${r.id}`} value="Y" label="Yes — this message cancels the order" checked={deleteFlag === 'Y'} disabled={disabled} onChange={() => onDeleteFlag('Y')} />
              {deleteFlag == null && (
                <span className="message-control__unanswered text-label-xs-regular">Not answered yet</span>
              )}
            </div>
          ) : (
            <span className="message-control__support text-label-xs-regular">Message rejected by the integration — contact support.</span>
          )}
        </div>
      ))}
    </div>
  )
}
