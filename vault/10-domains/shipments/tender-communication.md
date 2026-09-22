---
title: Tender Communication
domain: shipments
type: canon
tags: [tender, tender-communication, email, edi, manual, carrier-review, linx-15795, linx-15796, linx-15800, linx-15789]
date: 2026-09-22
status: active
---

# Tender Communication

Canon for **how a tender reaches a carrier and how the carrier answers** — the communication
method on a shipping option, the tender email, the carrier-facing **Tender Review** page, and the
response that comes back. This is the outbound half of the tender process; the Tender tab's own
actions are in [[domain-analysis]] §4, the versions those actions produce in [[routing-history]],
and the carriers routing threw away in [[dropped-carrier]].

**Built in the prototype (S157).** Rulings live in [[decisions/decision-log|the Shipments decision
log]] as **DEC-177 … DEC-189**. Where this document says *ours*, it means the prototype invented a
rule the tickets do not state; those are the lines to groom.

## Sources

| Source | What it is | Weight |
|---|---|---|
| **LINX-15795** — Send a Tender Through Email | The story. Status `Final UX/UI Design`, Skybreakers Sprint 44, reporter Pappu Ram, assignee Manuela; labels `Approved, FUNCTIONAL_PHASE2, MVP, VD_Pending`; Adam Shingle *"approved."* 2026-09-22 | the rules for the email |
| **LINX-15796** — Provide Secure Accept and Decline Actions for Email Tenders | The story for the review page; same sprint, same reporter | the rules for the page |
| **LINX-15800** — Send a Tender Through Both Email and EDI | Skybreakers Sprint 45 | the rules for the informational copy |
| **LINX-15789** — Enable End-to-End Carrier Tender Communication and Response Management | Parent epic of all three | scope |
| **Dave Schultz, over email (quoted inside 15795 BR-5)** | The subject-line rule, the `From`/`To` sourcing, the customer short-name guess | outranks the stories on subject and recipients ([[../../20-cross-cutting/stakeholders/stakeholders|Dave = highest authority on shipments]]) |
| **Thomas Quaile (via 15795 Business Context)** | *"there will be email and in that email body, there will be response link"*; no attachment | the email's shape |
| **VD `2509:71686`, `2525:41529`, `2525:41993`, `2519:39552`, `2525:39252`** (Shipments — Odyssey One) | Our own visual design for the review page — review, decline form, decline reasons, declined, accepted | the layout; its **copy is not canon** (see §5) |
| **BR-11 "Manual Communication Method Requires User Follow-Up"** | Pasted by the user on 2026-09-22 from a story whose Jira id was **not** given — sibling of the three above under LINX-15789 | the rules for `Manual` |
| **User brief, 2026-09-22** | *"The email needs to look the same as the spotbid"*, *"the landing page tender review for carrier is based on the same design as the spotbid bidding page"* | the visual lineage → [[../spotboard/spotboard|SpotBoard]] §6 (CE-1, Screen 3) |

Raw exports archived to `vault-sources/10-domains/shipments/sources/LINX-1579{5,6}.doc`,
`LINX-15800.doc` (Jira HTML), VD screenshots to
`vault-sources/10-domains/shipments/screenshots/tender-review-vd-2026-09-22-*.png`.

### Precedence

Stories rule behaviour; Dave's quoted email rules the subject line and recipient sourcing; the VD
rules layout only — its text is a spotbid mock's text and is normalised to the stories' wording
(DEC-177). Jana rules domain behaviour, not presentation. Nothing here was groomed with Jana; the
grooming was Pappu ↔ Dave ↔ Thomas (15795 comments, Sep 2–22).

---

## 1. Where this sits in the tender process

The Tender tab tenders a **shipping option** (a routing-option row). Each option carries a
**communication method** — the Tender tab's *Notify Method* column (`apiSource` on the wire,
`api` on the VM). The *Tender Dispatcher* reads that method off a *standardized tender message*
and routes it:

> "The Email Communication Service shall be invoked when the communication method in the tender
> message is configured as: Email; Email & EDI (Email portion only)" — 15795 BR-1

> "The communication method shall be determined before the Tender Dispatcher receives the
> standardized tender request." — 15800 BR-1

So the method is **data on the option**, chosen upstream (carrier / customer configuration in
TMS), never picked by the planner at tender time. The planner's only method-specific moment is
`Manual` (§2).

## 2. Communication-method vocabulary

| Value | Meaning | Source |
|---|---|---|
| `API` | Carrier API tender | seeded value; LINX-5921 *"tender messages must be sent to carriers using API, email, EDI and Manual"* |
| `EDI` | Standardized payload to the Boomi endpoint, which builds the carrier's EDI transaction | 15800 BR-3 |
| `Email` | Human-readable email with a **Review & Respond** link; the carrier answers on the review page | 15795 |
| `Email & EDI` | Both, from one tender message, outcomes recorded independently; the email is **informational only** | 15800 |
| `Fax` | Legacy channel | seeded value; no story |
| `Manual` | No message is generated; the planner confirms they contacted the carrier themselves | BR-11 (story id unknown — see Sources) |

> "Manual is a valid communication method and must not be treated as a lookup or system error." — BR-11

**Manual, the dialog (BR-11, verbatim).** Title *Manual Carrier Communication Required*. Message
*"The selected carrier uses a Manual communication method. You must contact the carrier outside
of the system to complete the tender process. Please confirm whether the tender has been
communicated to the carrier."* Buttons *OK / Confirm* and *Cancel*. Confirm → status `Sent`,
history + audit stamped; Cancel → *"System behaves as though the user never initiated the tender
action."* Built as `ManualTenderConfirm` on the Tender tab (DEC-189).

**What the Tender tab's Decline/Cancel cascade does with a Manual next carrier** is not in BR-11
(*"When a user manually initiates tendering from the UI"*) — the prototype does not gate the
cascade (DEC-189). *Ours; to groom.*

## 3. The email (LINX-15795)

### 3.1 Subject — Dave, verbatim

> "The subject line is probably better done in the email service itself because it's built from
> data in the buyShipmentOut and isn't subject to alteration by the User."

Direct shipment:

```
Tender Notification to <<SCAC>> of Shipment ID:<<OdysseyShipmentIdentifier>>, for <<Customer>> delivery:<<OrderNo>>
e.g. Tender Notification to FFAJ of Shipment ID:L15653820, for GRACE delivery:0089391595
```

Consolidation — *"replaces the delivery section with ', multiple deliveries'"*:

```
Tender Notification to <<SCAC>> of Shipment ID:<<OdysseyShipmentIdentifier>>, for <<Customer>>, multiple deliveries
e.g. Tender Notification to CCNI of Shipment ID:C826972, for USALCO, multiple deliveries
```

Two of Dave's own caveats ride with it: *"(Note: TMS was sending the LOAD id; not the
OdysseyShipmentIdentifier)"*, and on `<<Customer>>` — *"I gotta do a little research … (I think
they are doing it with some string manipulation of the org_short_name from TMS…. Strip the leading
'\*' and remove from 'SYS' on…. e.g. \*USALCO_SYS_01 becomes USALCO."* The prototype implements
exactly that guess as `customerForSubject` (DEC-181) — a no-op on our already-clean
`customerName`. Dave's third note — *"I don't think we've defined what the OdysseyShipmentIdentifier
will be when the planning is being done in O2 instead of TMS"* — is answered by DEC-144…147
(`O`/`C` + sequence from 50,000,000).

### 3.2 Recipients — Dave, verbatim (15795 BR-3)

`To:` comes from a TMS function, one email per returned entry:

```
mf$get.load_tender_communication (
   p_scac_id              – SCAC of the Carrier being tendered
  ,p_business_trans_type  – 4 for Tender; 5 for Tender Cancel
  ,p_communication_method – 1
  ,p_delimiter            – just hard-code to ','
  ,p_org_operational_id   – TMS org id of the consignor
  ,p_se_equip_id          – equipment
  ,p_loc_dest_id          – TMS
  ,p_ctm_terminal         – "this might be a problem. I don't think Terminal currently comes back from the Routing calls"
  ,p_org_id               – leave null
) RETURN comm_addresses_format_tabtype
– "sometimes this array is more than one entry long … we just generate a separate email for each entry"
```

`CC` where configured; `From` = a sender address (the prototype uses the planning-group mailbox
stand-in from SpotBoard, SPB-77). Note the `5 for Tender Cancel` — a **Tender Cancel
communication exists in TMS** and none of the three stories covers it. *Open.*

### 3.3 Body

> "As per the latest confirmation, attachment will not be the part of Tender communication email
> as it is happening in current TMS implementation. As per the latest confirmation from Thomas,
> there will be email and in that email body, there will be response link (In form of 'Review &
> Respond' button)." — 15795 Business Context

> "It would be sort of tender summary with response tender link" — BR-4

The stories defer the content to *"the VD"* — which is this prototype's email (the VD request in
the 15795 comments is addressed to Manuela). The email is **CE-1's layout** (user: *"look the same
as the spotbid"*): tender eyebrow, `<SCAC> — Shipment <id>`, *Tendered <notify date>* notice,
Shipper / Carrier / Shipment ID / Equipment / Weight / Hazmat, origin → destination band, Ship
From / Ship To with Pickup / Deliver, Distance and **Offered Rate**, stop-offs, the one CTA
**Review & Respond**, and *"Opening it does not accept or decline the tender."* Offered Rate is the
carrier's AP rate — *"we send them a tender with that $1000 for them to accept"* (David,
[[domain-analysis]] §4) — never AR/markup.

Kinds: **TE-1** (`Email`), **TE-2** (`Email & EDI` copy — EDI notice instead of the Tendered
notice, CTA *Review Tender*, no accept/decline wording anywhere; 15800 AC-4). Gallery at
`/tender-emails`.

### 3.4 Delivery outcome (recorded, not built)

> "When the mail server accepts the email request … the email communication shall be considered
> successfully sent." — AC-8; *"In case of success, Tender Status should be 'Sent'"* — BR-9

> "When the mail server rejects or cannot accept the request, Then the tender status should be
> changed to **Tender Failed** And shipment status should be changed to **Use Review**" — AC-7

`Tender Failed` is a **fifth tender status** the Tender tab does not yet know (DEC-21 reduced the
set to four: Sent / Accepted / Declined / Cancelled). `Use Review` as a shipment status is new
too (a typo for *User Review*? — the same string appears in 15800 nowhere; *flag for Pappu*).
Retries: *"according to the configured retry policy"* (BR-10). For `Email & EDI`, **any** single
channel failure → `Tender Failed` (15800 AC-6/7/8), but *"A failure in one channel shall not
prevent the Tender Dispatcher from attempting the other"* (BR-6).

## 4. The Tender Review page (LINX-15796)

### 4.1 Why it exists

> "Historically, email links could directly trigger acceptance or rejection actions. However, many
> corporate email-security solutions automatically inspect email links by opening them in the
> background. … Dave Schultz explained that mail inspection programs were automatically following
> email links and causing tender responses to be submitted without user action." — 15796
> Business Context

Hence one link, one page, two explicit buttons:

> "The system shall not: update the tender status, record a tender response, generate a tender
> response message, when a user merely opens the review page." — BR-04

> "The Tender Review page shall be accessible externally without requiring carrier access to
> internal Odyssey One applications." — BR-09

Same access model as SpotBoard's carrier page ([[../spotboard/spotboard|SpotBoard]] §8): a token
link, no login, the token scoped to one shipping option.

### 4.2 What the page shows (BR-02)

Shipment Number · Tender Number · Carrier Information · Origin · Destination · Pickup Date ·
Delivery Date · Shipment Details · Special Instructions — *"Check VD for the details"*. The VD
sections: **Tender** (header card), **Lane**, **Equipment & Freight**, **Load References**,
**Pickup and delivery instructions**, **Your Response**.

### 4.3 States

| Condition | The page |
|---|---|
| Invalid / expired link | *"This link is invalid or has expired."* and **nothing else** — AC-08 *"shall not expose shipment information"* |
| `Sent` + `Email` | Full page, **Decline Tender** / **Accept Tender** |
| `Sent` + `Email & EDI` | Full page, no buttons: *"the review page of Email shall not contain Accept or Decline buttons or links And it shall be used only as an informational tender copy"* — 15800 AC-4 |
| `Accepted` / `Declined` (by any channel) | Full page, recorded banner, no buttons — AC-06 |
| Any other status | *"This tender is no longer open."* — *ours* |
| Second submission | *"This tender response has already been submitted and cannot be processed again."* — BR-07 verbatim |

### 4.4 The response

> "Responses submitted from the Tender Review page shall be identified as an Email response method
> … Tender Response Method should be **'Email Links Update'**." — BR-10 (verbatim value)

That value joins DEC-173's list (`API Update` / `EDI Update` / `Manual Update` / `Automatic
Update`): the carrier's own click, recorded by Odyssey, no Odyssey user — so `responseUser` stays
null (DEC-186). The standard Tender Response message (FR-08) carries Shipment Identifier, Tender
Identifier, Response Method, Decision, Timestamp, Decline Reason.

**Decline (BR-06).** *"the system will simply initiate the decline process. allow or require entry
of a decline reason based on configured business rules."* Examples given: *Capacity unavailable ·
Equipment unavailable · Pricing issue · Unable to meet schedule · Other.* The VD draws five
different labels (*No capacity available · Rate too low · Lane not served · Cannot meet pickup or
delivery window · Other*) plus optional comments (200 chars); the prototype builds the VD's list
(DEC-182) pending Dave.

**Idempotency (BR-07).** *"A carrier response shall only be processed once."* Built server-side:
the response write carries `expectStatus: 'Sent'` and the API answers 409 when the row has already
moved (DEC-187).

## 5. What the VD says that the stories do not — and what we changed

The VD is a spotbid page re-dressed. Its copy is **not** canon; the tickets' wording is:

| VD | Built | Why |
|---|---|---|
| *Request for quote*, *Quote #* | **Tender**, **Shipment ID** | spotbid mock text; the page is a tender — DEC-177 |
| *Offer expires 09/13/2026 12:39 EST* | **Tendered <notifyDateTime>** | no tender expiry exists in the three stories or on the VM — DEC-178, **ask Dave/Jana** |
| *Reference LCE17665976KCNTTL* | Odyssey Shipment ID | the VD string is a composite that exists nowhere — DEC-179 |
| *Mode*, *Freight terms* rows | omitted | not on the VM — DEC-180 |
| *manibhushanjha@odysseylogistics.com* | planning-group mailbox | the VD's address is a person; the sender is a group (SPB-77) |
| *Confirm Decline* red button | `Button variant="error"` | the VD's tint IS the DSM error variant |

## 6. What the stories leave open

| Question | Owner | Where it stands |
|---|---|---|
| Decline reason — mandatory or optional? which code table? | Dave | Pappu's email, 15796 comment 2026-09-02, unanswered; BR-06 itself says *"Need the following confirmation from Dave"* |
| *"Should carriers be allowed to propose alternate pickup and/or delivery dates from the tender review page? If yes, what are the business rules that determine when date changes are allowed? Is this capability required as part of MVP? Does the current system support this behavior today?"* | Dave | Pappu, verbatim, same email; not built (SpotBoard has the flexible-dates precedent, SPB-69/73) |
| *"Should it be recorded as Manual, or should a separate value such as Email be used?"* | Dave | **answered** in BR-10: `Email Links Update` |
| BR-05 *"Tender Response Must Be Generated Only After Confirmation — Debatable (Mani and Dave will confirm this)"* | Mani + Dave | open in the story text |
| Does an emailed Decline auto-tender the next carrier? | Dave / Jana | the Tender tab's planner Decline cascades (Fix 4, S114); FR-08 says the response goes *"through the common Tender Response workflow"*, which would own that — not built carrier-side (DEC-184) |
| Tender Cancel communication (`p_business_trans_type = 5`) | Pappu | exists in TMS, no story |
| `Tender Failed` / `Use Review` statuses | Pappu / Jana | new vocabulary, recorded §3.4, not built |
| Terminal not returned by routing (`p_ctm_terminal`) | Dave | Dave's own flag: *"we'll probably need it"* added to the extended section |

## 7. What the prototype builds vs. defers

**Built (S157):** the option carries `tenderToken` (minted on Tender / Re-Tender for `Email` and
`Email & EDI` rows; Re-Tender re-mints, which is what expires an old link), `declineReason` and
`responseComments` through the mapper whitelist; TE-1 / TE-2 emails + `/tender-emails` gallery;
`/tender-review/:token` with the states in §4.3; the 409 once-only guard; `Manual` and
`Email & EDI` in the seeded methods with deterministic seeded tokens (**Neon reseed owed**); the
BR-11 Manual dialog; a *Preview tender email* row action on the Tender tab (prototype-only — the
real system sends, it does not preview).

**Deferred, with the reason:** Tender History tab (still a stub — BR-11 and 15796 both say history
records the action); Shipment Trail events for the carrier response; mail delivery / retry /
`Tender Failed`; EDI dispatch to Boomi; the real `To:` list (synthesized `ops@<scac>` stands in,
DEC-183); carrier-side cascade (DEC-184); alternate dates (open, §6).

---

*Related:* [[routing-history]] · [[dropped-carrier]] · [[domain-analysis]] ·
[[../spotboard/spotboard]] (CE-1, the carrier bid page) · [[decisions/decision-log]]
