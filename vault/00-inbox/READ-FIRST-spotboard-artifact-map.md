---
title: SpotBoard intake — artifact map (READ FIRST)
domain: spotboard
type: source
tags: [spotboard, intake, artifact-map, kathleen, irina, carrier-portal]
date: 2026-08-10
status: inbox
---

# READ THIS FIRST — what each inbox artifact actually is

Provenance: **dictated by the user (Manuela) on 2026-08-10**, at the end of Session 114, describing
artifacts she had just dropped. Transcribed close to verbatim below. The images are screenshots
pasted into the Teams chat of the **2026-08-07 "Spotboard UX discussion"** call, so they are
companions to `Spotboard UX discussion.vtt` in the same intake — **they must be analysed together
with it, not separately** (multi-source triangulation rule).

> ⚠️ The S114 transcript analysis was completed WITHOUT these images. Both reader agents
> independently flagged the missing screenshots as blocking: they are the direct ancestors of
> `CarrierBid.jsx` and `SpotBoardDashboard.jsx`, and two authority-backed actions were being
> designed off a lossy auto-caption instead. **These images are the missing input.**

## The map

| Artifact | What it is |
|---|---|
| `image (1).png` | **The legacy TMS screen.** This is what Kathleen means by *"that's the screen today"* at **52:36** in the transcript. |
| `image (2).png` | **How quoting looks today** — sent by **Irina**. |
| `image (3).png` | **What the carrier sees today.** (Ancestor of our `CarrierBid.jsx`.) |
| `image (4).png` | **The cross-bid screen.** This is what becomes the **SpotBoard Dashboard**. See the note below — it is load-bearing. |
| `image (5).png` | **Kathleen's workflow diagram**, with her accompanying chat message quoted below. |
| `Carrier Portal — Spot Quotes (Ideal State, Live Auction).html` | Kathleen's chat: *"Here is a wireframe for the carrier portal dashboard, future state with auction like bid"* — i.e. **future state**, NOT V1. |

## Verbatim messages

**Kathleen, with `image (5).png`:**

> "Based on our crazy discussion today, I worked on a workflow. Outstanding is to figure out with
> Thomas IF the carrier token can permit them to see the carrier board and update their quote, or
> if it is a one time submit only...only phase 2."

**Kathleen, with the HTML wireframe:**

> "Here is a wireframe for the carrier portal dashboard, future state with auction like bid"

## The user's note on `image (4).png` — carries a judgement, flag it as such

Verbatim: *"Image 4 is the cross bid screen which is going to be whats in the SpotBoard Dashboard
which they were referring that in the future should be inside shipment spotbid tab instead of being
a separate domain but thanks to irina opinionated bluff is not...."*

Two separate things in that sentence — keep them apart when synthesising:

1. **Factual:** `image (4)` is the legacy cross-bid screen, and it is the intended content of our
   SpotBoard Dashboard. The stated direction is that it should **eventually live inside the
   shipment's spot tab**, not as a separate domain/route.
2. **The user's characterisation** that it ended up a separate domain because of Irina's
   "opinionated bluff" is **the user's read of the politics, not a ratified decision.** It aligns
   with what the S114 skeptic pass found independently — our `/spotboard` sidebar route implements
   **Irina's** placement, while **Kathleen** (the design authority) twice placed it *under
   Monitoring* — but do not write the motive into canon. Record the placement tension; leave the
   attribution of cause out.

## Directly relevant open items this material should help close

- **`Thomas` / carrier-token lifetime** — Kathleen's `image (5)` message names it explicitly as
  outstanding, and scopes revisable bidding to **phase 2**. This is `OQ-1` / **SPB-16** territory.
  It does NOT resolve SPB-16 (Thomas still hasn't spoken directly), but it is the clearest written
  statement yet that *one-time submit* is the V1 shape — which matches Kathleen's in-call ruling
  and contradicts what we currently ship (`CarrierBid.jsx` renders "Update Bid").
- **Where the cross-shipment board lives** — SPB-18 vs Kathleen's "under Monitoring" vs our
  `/spotboard` route. `image (4)` is the reference design.
- **Whether the cross-shipment dashboard is V1** — the two S114 readers disagreed on whether
  Kathleen reversed SPB-18 at 53:26 (scope change vs. merely describing navigation). Still needs
  David + Kathleen jointly; these artifacts may disambiguate.
- **The future-state auction view** — the HTML is explicitly *future state*. Do not let it leak
  into V1 scope; it is the thing Kathleen said returns *"once they can log in."*

## How to run the next intake

This is an **update cycle** on existing canon (`vault/10-domains/spotboard/`, SPB-01…SPB-22).
The S114 transcript analysis is complete but **was never written to the vault** — the user is the
canon-merge authority and approval was still pending at session end. So the next pass should:

1. Re-read the transcript **together with** these six artifacts.
2. Reconcile against the S114 findings (in `progress.md`, Session 114) rather than re-deriving them.
3. Write canon + `SPB-23…` decisions once approved.

Per `~/.claude/skills/analyze/SKILL.md` step 3 (updated 2026-08-10): **subagents for this skill
inherit the session's main model — do NOT downgrade analysis to a code-implementation tier.**
