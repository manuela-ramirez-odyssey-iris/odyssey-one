---
title: OCM Profile → Charges, Equipment & Flexible Windows
domain: spotboard
type: data
tags: [spotboard, ocm, charges, equipment, mffocm, mffoocc, mffcofl, flexible-dates, configuration]
date: 2026-08-19
status: active
---

# OCM Profile → Charges, Equipment & Flexible Windows

**New at canon v1.9.** The configuration structure behind the carrier bid page's Additional Charges section, the quote's equipment choice, and the flexible pickup/delivery window — from `Kathleen1.png` and `Kathleen3.png` (backing written answers #1, #3 and #6, 2026-08-19) read together with [[../data/quote-model|data/quote-model]] §5. Everything below is SHOWN in a screenshot or VERBATIM from a written answer unless marked INFERRED.

## 1. The profile chain — `MFFOCM` → `MFFOOCC`

**Ruling (Kathleen written answer #1, 2026-08-19):** *"the charges shown in the 'additional charges' section is **controlled by an OCM profile**."* [[../decisions/decision-log|SPB-55]].

**`MFFOCM` — Maintain Organization Carrier Mode Profile** (Kathleen1.png, SHOWN). One row per profile instance; the `Carrier Overflow` / `COFL Charges` rows are the ones that matter here.

| Column | Observed values / notes |
|---|---|
| `Owning Organization` (×2 — org + display) | `*ODYSSEY_NA`, `*CHEMTURA_CLT_01`, `*SOLENIS-EUR_EXP_01`, `*SWIFT-EUR_SYS_01`, `*ERCO_SYS_01`, `*NALCO_SYS_01`, `*AVANTOR_SYS_01`, `*MPM_SYS_01`, `*DNM-DSM_SYS_01`, `*DEP-DSM_SYS_01`, `*FIRMENICH_SYS_02`/`*ACME_SYS_02`… — many orgs, each with their own rows |
| `Fac` | checkbox |
| `Org Type` | `U` or `S` |
| `Profile Type` | `Carrier Overflow` |
| `Profile ID` | `COFL Charges` |
| `Ship Direction` / `Carrier` | blank in all visible rows |
| `Equip` | **`FB`, `TL`, `TLH`, `TLR`, `EXP`…** — the profile is keyed per equipment |
| `Ship Mode` | blank in visible rows |
| `Profile Value` | `YES` |
| `Currency` / `UOM` / `Note` / `Active` | `Active` checked on the live rows |
| `Parent Org` | e.g. `*MPM_CLT_01` — profiles sit in an org hierarchy (inheritance rule still undocumented — the Doug question, [[../_moc|MOC]] follow-up (3)) |

On-screen helper text, verbatim: *"Define this profile to specify overflow carrier quote charges. Click the Overflow Carriers button to define additional val…"*

**`MFFOOCC` — Maintain OCM Overflow Carrier Charges** (Kathleen1.png, the modal, SHOWN). Header: `Owning Organization` (`*MPM_SYS_01`), `SCAC` (blank), `Ship Mode` (blank), **`Equipment: FB | FLAT BED`**, `Ship Direction` (blank). Body — the ordered charge list for that org × equipment:

| Order | Charge | Description | Description Alias | Active |
|---|---|---|---|---|
| 1 | `HZC` | HAZARDOUS MATERIALS | Haz-Mat | ✓ |
| 2 | `TKM` | TANKERMAN | Tanker Endorsement | ✓ |
| 3 | `IHT` | HIGHWAY TOLL | Tolls | ✓ |
| 4 | `TAR` | TARPING CHARGE | Tarping | ✓ |
| 5 | `MSG` | MISC CHARGE | Miscellaneous | ✓ |

> ⚠️ **Code variance vs [[../data/quote-model|data/quote-model]] §5.6** (PRD p.33, read visually): that pass recorded `HT` HIGHWAY TOLL and `MSC` MISC CHARGE; this screenshot reads `IHT` and `MSG` at a **different org** (`MPM_SYS_01`). Per-profile code variance or a raster misread in one of the two passes — **both stand as written until a text export settles it.** The `Description Alias` column is confirmed either way, vindicating §5.6's shared-codes/per-profile-labels inference.

**What resolves the carrier's charge list (INFERRED chain, each link SHOWN separately):** quote equipment ([[../decisions/decision-log|SPB-57]]) → org × equipment selects the `COFL Charges` profile instance → `MFFOOCC` rows → the Additional Charges section, labeled by `Description Alias`. **A static charge catalog in code is therefore one profile's snapshot** — canon §21.9 row B.

## 2. Equipment choice — the `Overflow Seed Equipment` chooser

**Ruling (Kathleen written answer #3, 2026-08-19):** *"Today the planner can change it, although they rarely do."* [[../decisions/decision-log|SPB-57]].

`Kathleen3.png` (SHOWN): `MFFCOFL` with the **`Overflow Seed Equipment`** modal — *"Choose Overflow Seed Equipment"* — over a shipment (`O32021145`, `*DUBOIS_SYS_01`, `Equip TL`, `Status APPROVED`). One row per equipment, each already bound to its OCM pair:

| Owner | Equipment | Shipfrom | Shipto | `Ocmid` | `Oocid` |
|---|---|---|---|---|---|
| `*Dubois_Clt_01` | `EXP` | UNITED STATES | UNITED STATES | 17529 | 5624 |
| `*Dubois_Clt_01` | `FB` | UNITED STATES | UNITED STATES | 16420 | 5194 |
| `*Dubois_Clt_01` | `TL` | UNITED STATES | UNITED STATES | 16417 | 29479 |
| `*Dubois_Clt_01` | `TLH` | UNITED STATES | UNITED STATES | 16418 | 29482 |
| `*Dubois_Clt_01` | `TLR` | UNITED STATES | UNITED STATES | 16419 | 29485 |
| `*Dubois_Clt_01` | `TT` | UNITED STATES | UNITED STATES | 18284 | 13661 |

**Choosing the equipment chooses the `Ocmid`/`Oocid` pair** — which is what wires §1's charge list to the equipment choice. The shipment itself never mutates: *"the original shipment stay with the original mode"* (Irina, `Aug 18 call` 25:36). Live exhibit: `IrinaImage1.png`/`IrinaImage2.png` show shipment `Equip LTL` quoted as `FB Flat Bed`.

## 3. Flexible pickup/delivery windows — day-variance per client × equipment

**Ruling (Kathleen written answer #6, 2026-08-19), verbatim:** *"**Flexible pickup and delivery is configurable by CLIENT and by Equipment.** 23 configs for flexible pickup and 23 for flexible delivery are set up today (Not all clients are currently active only 9 active). The OCM setting is configurable by the **number of days permitted before the requested pickup and delivery dates**. For example, one client allows for 8-day variance."* [[../decisions/decision-log|SPB-60]].

- The setting is an **OCM day-count**, per client × equipment, applied *before* the requested dates.
- It is the configuration engine behind the `Earliest`/`Latest` window of [[../decisions/decision-log|SPB-13]] — any future date affordance on the bid page ([[../decisions/decision-log|SPB-33]]) derives its window from this, never a hardcoded span.
- Adoption today: 23 + 23 configs, **9 clients active**.
- **Time is a separate question:** *"time is not supported on the quote"* (answer #5) against OdysseyOne date+time fields — the tension is held in [[../decisions/decision-log|SPB-59]] and canon §21.5, not here.

## See also

- [[../spotboard|SpotBoard — Domain Canon]] §21 (the 2026-08-18/19 intake), §21.9 (build-delta addendum)
- [[../data/quote-model|Quote Data Model]] §5.4–5.6 (the OCM/system profile catalogues and the PRD-era charge lists)
- [[../decisions/decision-log|Decision Log]] — SPB-55, SPB-57, SPB-59, SPB-60
