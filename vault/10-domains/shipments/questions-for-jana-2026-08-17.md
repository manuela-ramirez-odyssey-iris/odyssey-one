---
title: Questions for Jana — Dropped Carrier and Process SCAC
domain: shipments
type: question-set
tags: [shipments, questions, jana, dropped-carrier, process-scac, tender]
status: answered
date: 2026-08-17
---

# ✅ ANSWERED 2026-08-17 — Jana

**Jana's overall response: *"all of those questions are already answered in the stories."*
Verified — he is right on every question that the tickets actually cover.** The one we escalated
hardest (#1, routing returning five fields) is handled by 13953's own blanket Null Handling rule:
*"If Routing does not return a value for **any** field displayed within the Dropped Carrier
section, Odyssey One shall display `--`"*, plus seven fields individually marked *"(if returned
by Routing)"*. **We under-read the ticket; it was never a spec gap.**

## Rulings

| # | Question | Answer |
|---|---|---|
| 1 | Routing returns 5 fields, ticket asks for 23 | **Not a gap.** Payload is **CURRENT**; absent fields render `--` per the ticket's own rule. Build all 23 slots, seed sparsely. |
| 2 | Rating on the routing-success path | **Follow the ticket** — failure branch only. |
| 3 | Copy or move | **COPY.** *"yes shows in both, that's why he said copy and add, means add it to the normal routing list."* The dropped row stays. |
| 4 | Prohibited Carrier processable? | **"There's no such thing as prohibited."** Read as: no special case — every dropped carrier is processable regardless of reason. ⚠️ See the note below. |
| 5 | Pickup-in-the-past | Per the story — hard block. |
| 6 | Both lists after processing | **Yes, shows in both.** Same ruling as #3. |
| 7 | Reason descriptions | **From TMS**, looked up by `drop-code`. Exact table still owed (Dave). |
| 8 | Is the payload current | **YES, CURRENT.** |
| 9 | `service="LTL"` = Equipment? | Per the story — Equipment Type. |
| 10 | Section open or closed | **OPEN.** |

## What changed in the build as a result

- **13954 needs no storage change** (#3). "Copy" means nothing has to persist that a carrier was
  processed — the *move* reading would have forced an overlay on `shipments.detail`.
- **The duplicate rule is now load-bearing, not defensive** (#3/#6). The row stays, so its
  Process SCAC gets pressed again; *"Carrier and Equipment combination already in the list"* is
  the routine path.
- **Seed sparsely** (#1/#8). The generator emits only what routing really returns; everything
  else is `null` → `--`. Seeding rich values would flatter the prototype past what the real
  screen can show.
- **Real drop codes replace our invented catalog** — `1 = No Rates`, `2 = Prohibited Carrier`,
  `23 = Missing Transit Time`, weighted to the sample's own 4 / 1 / 6 mix. Descriptions are still
  ours until Dave's table lands.

## ⚠️ Q4 — "there's no such thing as prohibited" vs the payload

Jana's answer to *"should a carrier dropped as Prohibited be processable at all?"* was
**"there's no such thing as prohibited."**

**How we are reading it:** as an answer to the question actually asked — there is **no special
case**. A dropped carrier is processable regardless of why it was dropped, and Process SCAC
should not branch on the drop reason. That is what we will build in LINX-13954, and it matches
what 13953/13954 already say (neither ticket distinguishes reasons anywhere).

**The tension, recorded rather than resolved:** taken literally, "no such thing as prohibited"
is contradicted by Jana's own routing payload, which he confirmed as current the same day:

```xml
<d-option seq="8" service="LTL" carrier="RLCA" drop-code="2" drop-reason="Prohibited Carrier"/>
```

`Prohibited Carrier` is one of only three drop reasons in that sample. So either the phrase means
"no special handling" (our reading), or the reason label itself is something he does not consider
real — which his own data contradicts.

**What we did about it:** nothing to the code. `drop-code 2 / Prohibited Carrier` **stays** in the
seeded reason catalog, because it is verbatim in the confirmed-current payload and removing it
would make our fixture less faithful than the source. Worth one clarifying sentence next time
he is available — it costs nothing today, since LINX-13953 only displays the reason and
LINX-13954 is not being built yet.

---

## The one thing still worth raising, and it is not a blocker

**"No Rates" is a drop reason** (`drop-code=1`, 4 of 11 in the sample). Such a carrier routes
fine — nothing stops date calculation — so under the ticket's failure-only rating rule (#2),
rating never runs and the carrier lands in the Tender List with an empty cost and **no prompt**.
That is the *"you should not leave it empty"* outcome Jana described designing against.

Building it per the ticket as ruled. Flagging it as a **behaviour to review once it is visible on
screen** rather than re-litigating it now — it is an afternoon to flip if the demo makes the case
better than the argument did.

**Design question for the VD, not for Jana:** with current routing data most of the 23 columns
are dashes. Whether that is the right presentation is Manuela's call — and building it sparse
means Jana can be shown the real thing.

---

# Original question set (for the record)

**Tickets:** LINX-13953 (display the dropped carriers) · LINX-13954 (Process SCAC) ·
LINX-13397 (the TMS lookups both depend on)

**Sources read:** all three tickets including their full Acceptance Criteria, the 2026-08-11
call recording, and the routing sample payload.

Ten questions. They are ordered so that **if we only get through the first three, we can
still build something.** Everything from #4 down has a working assumption already in place.

> **One correction to earlier notes:** we had LINX-13397 recorded as an empty blocker. It
> isn't — it has all eleven lookups fully written. That was our misreading, and it means
> less is blocked than we thought.

---

## A · Blocks the design — we can't pick an answer ourselves

### 1. Routing returns 5 pieces of information per dropped carrier. The ticket asks for 23. Which is right?

**What we see in the routing response.** A carrier that *qualified* comes back with eighteen
attributes. A carrier that was *dropped* comes back with five:

```xml
<option   seq="1" service="LTL" carrier="TAXA" cost="69.6" curr="USD" transit="1"
          t-source="SMC" distance="31" d-source="PCMPCL*" route-rank="9"
          indirect-point="N" break-point="0.0" rpc-id="4457785"/>

<d-option seq="8" service="LTL" carrier="RLCA" drop-code="2" drop-reason="Prohibited Carrier"/>
```

All eleven dropped carriers in the sample look like that second line. It reads as deliberate,
not as a missing value in one row.

**So of the 23 fields LINX-13953 lists, routing gives us three** — SCAC, Equipment and Reason.
Two more we can look up (Carrier Name from the SCAC, and the reason description). The remaining
eighteen have no source we can find.

**The part that has no workaround.** LINX-13953 says to get **Start Date, Stop Date and Route
Group** by looking them up on the RPC-ID, and LINX-13397 §7/§8 confirm it — both queries are
`where rpc_id = :rpc_id`. But **RPC-ID is one of the fields routing does not return for a
dropped carrier.** There is no key to look up with.

**This also affects LINX-13954**, which says:

> *"If adding from the dropped carrier list → use the route rank from the dropped carrier list.
> Use the RPC-ID from the dropped carrier list."*

Neither value is on the dropped carrier list in this payload.

**What we need from you:** is the sample out of date, or does routing genuinely return only
this much? If it's genuine, the Dropped Carrier section is realistically a **five-column
table** — SCAC, Carrier Name, Equipment, Reason, Reason description — and most of 13953's
field list needs removing rather than designing around.

**Why we're stopping rather than guessing:** we can build 23 columns and show a dash in
eighteen of them, but then the design is wrong and the prototype will look far richer than the
real screen ever will.

---

### 2. A carrier can be dropped *because* it has no rate. So when we process it, does the user get told?

**What we see.** One of the drop reasons routing returns is literally **"No Rates"**
(`drop-code="1"`). Four of the eleven dropped carriers in the sample have it.

That means: a carrier dropped for No Rates has no rate, by definition. If the user processes it
into the Tender List, rating will fail again — every time, predictably.

**Where the tickets and the call disagree.** LINX-13954 puts the rating call **only** on the
routing-failure branch. Its heading says so:

> *"Rating Processing (only in the case of Routing failed)"*

On the call you described both calls always running, including the exact combination the ticket
rules out:

> *"it is calling the routing and the rating… The routing was successful. It was able to find a
> date, but could not calculate the rate because the rate was not available."*

**Why this matters more than it looked.** A No-Rates carrier would route perfectly well — there
is nothing stopping the dates being calculated. So under the ticket as written, rating never
runs, and the carrier lands in the Tender List with an **empty cost and no message at all**.

That is the outcome you said you were designing against:

> *"You need to fill a quote for it because you should not leave it empty. That's the reminder."*

And it wouldn't be rare — it's 4 of 11 carriers in this one sample.

**What we need from you:** should the "No rate is available for the carrier — you may obtain
and enter a quote if needed" message also appear when routing succeeded? Our reading is yes,
and that the ticket's heading is a drafting leftover.

---

### 3. After a successful Process SCAC, does the carrier disappear from the Dropped Carrier list?

**The plain question:** the user processes a dropped carrier, it succeeds, it's now in the
Tender List. Does its row vanish from the Dropped Carrier section above, or stay there?

**Why we're asking.** LINX-13954 says the carrier is *"copied"*, every time it mentions it. On
the call you said *"move"* — *"I want to take this carrier and move it here."* We think you use
the two words interchangeably, so the wording itself isn't the answer.

**Why it isn't just cosmetic.** "Move" means the system has to *remember* that a carrier was
already processed, which is a change to how we store the data. "Copy" means we store nothing
extra. It's also immediately visible to the user either way.

**Our reading, and it's weak:** *move*. The failure branches go out of their way to say the
carrier *"shall remain in the Dropped Carrier section"* — a sentence you'd only need if success
removed it.

---

## B · We have an answer, but it might be the wrong one

### 4. Should a carrier that was dropped as **Prohibited** be processable at all?

**What we see.** `drop-code="2"` is *"Prohibited Carrier"*. That is a different kind of reason
from the others — the rest are data problems (no rate, no transit time), but this one is a
deliberate policy exclusion. Someone decided this carrier should not be used.

LINX-13954 lets the user Process SCAC on **any** carrier in the dropped list, without
distinguishing between them.

**The question:** should Process SCAC be blocked, or at least warn differently, for a
prohibited carrier? Pulling a carrier that was deliberately prohibited into a live tender feels
like something that shouldn't be one click.

**Our assumption if we don't hear back:** treat all drop reasons the same, exactly as the
ticket says.

---

### 5. "Pickup Date/Time cannot be in the past" — should that block the user, or just warn them?

**Where it appears.** In the dialog where the user types the dates in by hand, which opens when
routing couldn't work them out. That dialog checks two things:

| Rule | Where it comes from |
|---|---|
| Delivery must be later than Pickup | Ticket **and** the call — you walked through a 07:27 vs 07:28 example |
| Pickup cannot be in the past | **Ticket only** — never mentioned on the call |

Both are currently *hard blocks*: the OK button stays disabled and the user cannot continue.

**Why we're asking about the second one.** A delivery before its pickup is impossible — always
a typo, always worth blocking. A pickup date in the past isn't impossible, it's just late.
Legitimate cases: the load already left and someone is catching the system up; someone is
reworking a shipment from last week.

**And the timing is awkward.** The most common drop reason in the sample is *Missing Transit
Time* — 6 of 11 — which is exactly the condition that stops routing calculating dates. So this
dialog will open often, and on older shipments the block could stop the user with no way
through.

**Our assumption if we don't hear back:** build it as a hard block, as written.

---

### 6. When routing options refresh, a processed carrier will show up in *both* lists. Is that OK?

**What happens.** LINX-13953 says the Dropped Carrier section refreshes whenever Routing
Options refresh. But processing a carrier doesn't change anything routing looks at — every drop
reason in the sample (No Rates, Missing Transit Time, Prohibited Carrier) is a fixed property
of the carrier and the lane.

So on the next refresh routing drops that same carrier again, and it appears in the Dropped
Carrier list **while also sitting in the Tender List**. Its Process SCAC button would then be
permanently blocked by the duplicate-carrier rule.

**Our assumption if we don't hear back:** let it reappear and let the duplicate rule stop it —
but it will probably look like a bug to a user, so it's worth a deliberate decision.

---

## C · Quick ones

### 7. Where does the list of drop reasons and their descriptions live?

Routing gives us both a code and a short label — `1 = No Rates`, `2 = Prohibited Carrier`,
`23 = Missing Transit Time`. So the **Reason** column needs no lookup at all, which is simpler
than we thought.

What we still need is the **long description** — LINX-13953 says to look it up in a master
table, and the field is still flagged in the ticket as *"require code from Dave"*. We now know
the lookup key is `drop-code`. The fact that 23 exists suggests the real catalog is at least
that long.

⚠️ **Worth flagging for demos:** in the meantime our prototype uses **invented** reason
descriptions. If anyone who knows the real TMS reason codes sees the screen, that column will
look wrong — that's our placeholder, not a spec problem.

### 8. Is the routing sample you shared still current?

Everything in question 1 rests on it. One sentence is enough.

### 9. In the payload, does `service="LTL"` mean Equipment, or Service Level?

LINX-13953 calls the field *Equipment Type* with `LTL` as the example, so we've read `service`
as equipment. Every option in the sample is LTL, so the sample can't tell us. Low risk.

### 10. Should the Dropped Carrier section start open or closed?

You asked for it to be collapsible but didn't say which state it starts in. **We're going with
open.** Flagging one consequence: in the sample there are more dropped carriers (11) than
qualified ones (7), so an open section can be taller than the Tender List above it.

---

## Not a question — the story you said you'd write

LINX-13954's route-rank rule has a red-flagged `Refer Story xxxx` for adding a carrier *"from
scratch"* on the tendering screen. You identified it on the call and said it's yours:

> *"There are two ways to process SCAC. We saw from drop carrier list, and the other one is you
> will see here Process SCAC… Both are same. Steps are the same. But in the drop carrier list,
> it is returned by routing. Here, the user is going and adding it."*

> *"Adding from scratch from the tender screen, I have to write the story, leave the route rank
> empty and leave the RPC-ID empty."*

It doesn't block LINX-13954. Raising it because the two share the same flow end to end, so
they're worth designing together — and because your description of the **load board** return
path lands in the same place: *"you go and add that carrier to the list here."*

---

## Three things the payload answered without needing you

Recorded here so they don't get re-asked. Detail:
[[data/routing-payload-analysis|routing payload analysis]].

- **CVC ID is not returned by routing.** No `cvc-id` attribute anywhere in the response.
  LINX-13953 says it is *"returned by Routing for each carrier"* — that note is wrong. The
  source is LINX-13397 §10's `get_cvc_id(...)` function.
- **UoM comes from the commitment lookup, not routing.** The AC says both; the payload has no
  commitment data at all, so §11's `cvc_cd_flag_weight_based` / `cvc_uom_wgt` is the source.
- **Transit Source and Distance Source are two different fields, and both exist** —
  `t-source="SMC"` and `d-source="PCMPCL*"` sit side by side on every qualified option. So
  LINX-13397 §4's description lookup belongs to *Distance* Source; LINX-13953's *Transit
  Source* displays raw, with no lookup.

---

## Internal — how the positions held up

Not for Jana. Manuela ruled on the original seven, the payload then arrived, and Jana ruled the
same day. Scoring our own calls, because the pattern is worth keeping:

| Q | Our position going in | Outcome |
|---|---|---|
| 1 | "Genuinely blocked, cannot pick" | **Wrong.** The ticket's own Null Handling rule answers it. We escalated instead of finishing the re-read. |
| 2 | Follow the ticket (Manuela) | **Confirmed** by Jana. |
| 3 | Move (weak, structural) | **Wrong — it is COPY.** Our reasoning (*"shall remain"* on the failure branches implies success removes it) was a plausible inference from an absence, and absences are weak evidence. |
| 4 | Treat all reasons alike | **Confirmed** — per the story. |
| 5 | Hard block, as written | **Confirmed** — per the story. |
| 6 | Let it reappear | **Confirmed**, and stronger than we thought: it is in both lists immediately, not only after a refresh. |
| 7 | Invented descriptions | Source is **TMS**, keyed on `drop-code`. Ours stay until Dave's table lands. |
| 10 | Open (Manuela) | **Confirmed** by Jana. |

**The lesson, and it is the same one as S121's DEC-97:** two of our three strongest positions
(#1, #3) were inferences built on what a document *didn't* say. #1 was answered by a rule we had
already transcribed into `vault-sources/`; #3 was answered by a word Jana had used consistently
and which we had explicitly decided to discount. Reading the artifact fully beats reasoning
about its gaps.

**What the payload genuinely earned:** OQ-3, OQ-4 and OQ-5 (CVC ID, UoM and Transit-vs-Distance
Source), which no amount of ticket-reading would have settled, plus the real drop codes and the
sparseness the generator now models. That part was worth the detour.

Build plan: `docs/superpowers/plans/2026-08-17-dropped-carrier-display.md` — **all nine tasks
unblocked**, Task 2 amended to seed sparsely with the real drop codes, Task 8 (reseed) still
gated on explicit approval.
