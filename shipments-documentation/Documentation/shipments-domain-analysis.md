# Domain Analysis — Shipments

Sources: Jana (domain expert), David Johns (business stakeholder), Manuela Ramirez (designer)
Sessions: Feb 17, Mar 23, Mar 25 (x2 — David + Jana), Mar 30 (Jana)

---

## 1. Entity Hierarchy: Order → Load → Shipment

### Three-tier model

| Entity | Owner | Purpose |
|---|---|---|
| **Customer Order** | Customer ERP | Original request — source of truth, never modified by Odyssey |
| **Load** | Odyssey TMS | A working copy of the order that Odyssey manages internally |
| **Shipment** | Odyssey TMS | A concise synopsis grouping 1+ loads for carrier assignment |

> "Order is a copy of the load, but it is a record that we are managing. Odyssey is managing load and shipment. Customer order is what the customer manages." — Jana, Mar 25

> "Load is a copy of a ship order... You don't want to mess with that, so you keep that as a record. That is the order. But you create a copy and then you play with it." — Jana, Mar 25

> "Load cannot stand alone by itself. It needs a shipment." — Jana, Mar 25

> "Shipment is a synopsis of a load... I don't want to read the load every time because it's a lot of information." — Jana, Mar 25

### Key rules
- Every customer order creates exactly 1 load
- Every load must belong to a shipment (loads cannot exist alone)
- A shipment can contain 1+ loads (via consolidation)
- Every shipment has 1 **buy shipment** (AP/carrier side) + 1 **sell shipment** (AR/customer side), created simultaneously
- **Loads are hidden from users** — David explicitly does not want load numbers shown; users should think only about shipments and orders

> "That is why we are not putting the load number anywhere on that screen, because he doesn't want to tell the users there is a load for the shipment. They should think only about shipments." — Jana, Mar 25

### Relationships
- **~~Orders within a shipment share the same customer~~** → CORRECTED: Orders from **different customers** CAN be on the same shipment. Each customer may have a different markup percentage.

> "If those two orders are for two different customers, then we need to know how to charge each customer for that one buy shipment." — David, Mar 25

---

## 2. Shipment Lifecycle

```
Customer Order (ERP)
    │
    ▼
Load Created (1:1 with order)
    │
    ▼
Shipment Created (1+ loads grouped) ── Buy + Sell shipments created simultaneously
    │
    ▼
Planning / Consolidation (which loads can be combined?)
    │
    ▼
Carrier Selection (routing guide generates ranked options from contracts)
    │
    ▼
Tendering (send offer to carriers sequentially by rank)
    │
    ├── Carrier Accepted → Monitoring (Approved)
    │                         │
    │                         ▼
    │                    Update sent to Customer ERP (carrier + pickup date)
    │                         │
    │                         ▼
    │                    Customer picks, packs, stages, loads freight
    │                         │
    │                         ▼
    │                    PGI Message (actual quantities, weight, pickup date)
    │                         │
    │                         ├── Match succeeds → Re-rate → Freight Accrual to customer
    │                         └── Match fails → PGI Exception
    │
    ├── All Carriers Decline → Spot Bid / Overflow
    │                              │
    │                              ├── Carrier awarded → loops back to Tendering
    │                              └── No bids → manual intervention
    │
    └── Exception conditions (16 possible) → user must resolve
```

### Planning & Consolidation
Happens automatically before carrier selection. Determines which loads can be combined into a single shipment based on proximity of pickup/delivery locations, timing, truck capacity.

> "Which two loads can be combined? Can it be combined or should it go separate? That is what the planning is all about." — Jana, Mar 25

Cross-customer consolidation is not currently done but planned for the future.

### Customer ERP Integration (no UI)
After carrier acceptance, Odyssey sends an update to the customer ERP with carrier info and pickup date. The customer uses this to prepare freight in their warehouse. No UI needed for this — it's an automated message exchange.

---

## 3. Tendering

### What is it?
Tendering = offering a shipment to a carrier and waiting for their yes/no response.

> "You want to paint your entire home. You have identified 4 painters. You're contacting the first painter — give me a quote, will you be able to take this job?" — Jana, Feb 17

### How it works
1. Routing guide generates a ranked list of suitable carriers from pre-agreed contracts
2. System sends tender to carrier #1 (usually cheapest, unless overridden by "preferred carrier")
3. Wait for response within time limit
4. If **accepted** → shipment moves to Monitoring (Approved)
5. If **rejected/declined** → system tenders to carrier #2, and so on
6. If all carriers exhaust → goes to **Spot Bid** (overflow)
7. **16 exception conditions** can halt auto-tendering and put the shipment up for user review

### Tender statuses
| Status | Meaning |
|---|---|
| **Sent** | Tender has been sent, awaiting response |
| **Accepted** | Carrier accepted the tender |
| **Declined** | Carrier actively said they cannot take the load |
| **Rejected** | Carrier timed out (did not respond in time) |
| **Cancelled** | User manually cancelled the tender |

> "Decline means you sent the tender out, but they did not accept it." — Jana, Mar 25
> "Rejected means it timed out." — Jana, Mar 25

### Sequential tendering constraint
- Only ONE tender can be **pending/sent** or **accepted** at a time
- Carriers above the accepted one must show as declined/rejected
- Carriers below the accepted one should have no status (not yet tendered)

> "You can't have a pending tender if there's also an accepted tender." — David, Mar 25
> "We usually only go to the second carrier when the first one declines." — David, Mar 25

### Auto-tender vs Manual tender
- **Auto-tender:** System handles the full sequence — starts based on configurable lead time (e.g., 3 days before pickup). Different customers may have different lead times.
- **Manual tender:** User selects shipments and chooses an action:
  - "Tender to preferred carrier" — send to rank #1 carrier
  - "Cancel shipments" — cancel selected shipments
  - Multi-select supported for bulk operations
  - User can override timing (start tendering earlier than the system would)

> "System can only start maybe like 3 days before the pickup date... It could be 3 days, it could be 4 days for some customers." — Jana, Mar 25

### User actions on tender screen
- **Tender** — manually send to a selected carrier (override rank order or start early)
- **Cancel** — cancel an active tender
- **Decline** — manually mark a carrier as declined (e.g., carrier called but electronic message didn't arrive)
- **Tender to preferred carrier** — bulk action for selected shipments

> "You are overriding the system. You are starting it earlier." — Jana, Mar 25

### Re-tendering
When a shipment changes (new order added, stop changes, origin changes), the entire routing guide is scrapped and regenerated with a new set of carriers. The old set becomes **tender history**.

> "The complete routing changed. The first set of carriers generated was not the same as the second set because there was a new order added or a new stop came in or the origin changed." — Jana, Mar 25

### Routing guide
- A ranked list of carrier contract options looked up from pre-agreed contracts
- Displays: carrier name, cost, transit time, distance
- Ranking is system-generated from the rating engine — factors in price AND performance
- A "preferred carrier" designation can override price-based ranking
- **Read-only** from the shipments UI perspective — rankings come from the rating system

> "The routing guide is basically looking up contracts that we have agreed to with our carriers and displaying them for the users." — David, Mar 25
> "That's all controlled from rating. You're just displaying what they give you." — David, Mar 25

**Terminology note:** Jana suggested this tab might be better named "Tendering" rather than "Routing Guide."

---

## 4. Spot Bidding / Overflow

When ALL carriers from the routing guide have been exhausted, the system falls to a "spot put" / "overflow board."

### How it works
1. Shipment is broadcast to a broader pool of carriers simultaneously (e.g., ~10)
2. Carriers log into a **carrier portal** (separate system, managed by Kathleen's team) and submit price quotes
3. Carriers have a time limit to bid (e.g., 60 minutes)
4. Odyssey reviews bids and awards one carrier
5. After award, system loops back to tendering — a formal tender is sent at the bid price for acceptance

> "If we fail to find a carrier when we're tendering, then we'll do a spot put and that's where carriers can bid on the freight." — David, Mar 25
> "Even if the carrier bids $1000 and we say we're going to award it to them, then we send them a tender with that $1000 for them to accept." — David, Mar 25
> "Spot means you're going and shopping in the market to find a carrier and at one time you're getting quotes from everyone." — Jana, Mar 25

Spot bidding can be **automated or manual**, depending on the customer.

---

## 5. AP/AR Costs

### Definitions
- **AP (Accounts Payable)** = What Odyssey **pays the carrier** = "Buy side"
- **AR (Accounts Receivable)** = What Odyssey **charges the customer** = "Sell side"
- **Margin** = AR - AP = Odyssey's profit

> "AP cost is cost that we give to the carrier. When we charge to the customer, we might charge the same rate or we might charge more than that." — Jana, Mar 23

### Buy + Sell shipments created simultaneously
Recent business change: sell shipment is now created immediately with the buy shipment (not after carrier acceptance as before). At any point you have an AP cost, you also have an AR cost.

> "They wanted to create the sell side immediately on creation of the buy side." — Jana, Mar 23

### Cost breakdown structure
Both AP and AR have the same component structure (but they **don't have to** match exactly):

| Component | Always present? | Description |
|---|---|---|
| **Base rate** | Yes | Base freight cost |
| **Fuel surcharge** | Yes | Always charged |
| **Discount** | Maybe | Customer/volume discount |
| **HZC** (Hazmat charge) | Maybe | If hazardous materials present |
| **SOC** (Stop-off charge) | Maybe | Additional stop charges |

> "Base and fuel will 100% be there. Discount can be there, may not be there." — Jana, Feb 17
> "They'll usually be the same cost types. If there's base and fuel on the AP, there will be base and fuel in the AR, but it's not a requirement." — David, Mar 25

### Quote entry formula
- AP = base rate + charges
- AR = base rate + markup + charges

### Cost per load
Every load within a shipment has its own cost breakdown. Costs are distributed across loads based on **weight**.

> "You have base rate, fuel, discount, HZC, SOC. All this will be appearing on load 1. All this will be appearing on load 2." — Jana, Mar 25

### Planned vs Completed cost
Two sub-views within cost allocation:
- **Planned cost** — available from carrier selection onward
- **Completed cost** — only populated after PGI receipt; show as grayed-out/disabled until then

> "You can mark the completed right now as grey because completed happens only when you receive a PGI." — Jana, Mar 23

### AP/AR display preference
Jana confirmed AP and AR should be shown **side by side** on the same screen for comparison.

> "Comparing cost, having it on the same, this one will be better. It will be better for them to see both at the same time." — Jana, Mar 23

### Cost availability timing
Open question: AP/AR costs may not be known until the shipment is tendered. Not a UI blocker — affects backend.

> "I don't know if we'll know the AP cost or the AR cost until it's tendered." — David, Mar 25

### Margin is new to the business
The AR cost and margin visibility is a brand-new capability. The business hasn't had this before and may not yet know exactly how they want it displayed.

> "This is so new to the business. It's one of the big things we're getting out of this project." — David, Mar 25

---

## 6. Cost Allocation

### What is it?
When a shipment carries multiple orders, the total shipment cost must be **allocated back to each order** proportionally by **weight**.

### Two purposes
1. **Customer accounting:** So customers can tie freight costs back to cost-of-goods per order
2. **Multi-customer shipments:** When orders belong to different customers with different markup percentages, each customer's charge must be based on their allocated portion

> "If I have two orders on a single shipment and that shipment cost $1000, I want to allocate the cost back to each order. I can do it by weight. If order one is 60% of the weight, then it'll represent $600 of the cost." — David, Mar 25

### Direct cost (consolidation savings)
- **Direct cost** = what it would cost to ship each order individually (without consolidation)
- **Direct cost saving** = direct cost − AR cost = savings from consolidating
- Only relevant when 2+ loads in a shipment (not for single-order shipments)
- Direct cost is per ORDER, not per shipment

> "Direct cost saving is how much they saved. If it has been shipped separately, what will be the cost? And if it went in a consolidation, what is the saving?" — Jana, Mar 25
> "We need direct shipping cost only if the two loads is in the shipment." — Jana, Mar 23

### UI feedback (David, Mar 25)
- Order-level summary (AP total, AR total, margin) should be expanded by default
- Load-level detail can be **collapsed** by default — users rarely need deeper than order level

> "The summary level works fine. A lot of times they're not going to need to go any more detailed than the order level." — David, Mar 25

---

## 7. PGI / PGR (Post Goods Issue / Receipt)

### PGI flow
1. Customer picks, packs, stages freight in warehouse, loads onto truck
2. Customer ERP sends **PGI message** to Odyssey with actual data (product count, weight, actual pickup date) — these may differ from the original order
3. Odyssey must **match the PGI file to the shipment** — failure to match is an **exception**
4. PGI data is **validated** (correct codes, proper formats, matching carrier, etc.)
5. Changed data may impact cost → Odyssey **re-rates the shipment**
6. Odyssey sends a **freight accrual** message back to the customer

> "When they load it onto a truck, that sends us a message. The whole purpose is to say we know what they ordered — that could have changed. This message says, hey, we told you we're going to have 5 products and 30,000 lbs. One got damaged. So there's only four products." — David, Mar 25
> "You planned 10 boxes, they shipped 11 boxes — you want to record it properly." — Jana, Mar 25

### PGI validation errors
- Quantities don't match plan
- Carrier mismatch (wrong carrier loaded the freight)
- Invalid codes (e.g., "Lt." instead of "LTL")
- Cannot match PGI file to existing shipment

> "There are like 16 conditions. One of the conditions fails, it won't auto tender to the next carrier. It'll put it for user review." — Jana, Mar 25

### Freight accrual (no UI)
Accruals are sent **to the customer** (not for Odyssey's use). They let the customer know what to expect to be invoiced for freight that has left the building but hasn't been invoiced yet.

> "The accrual's not for us, it's for our customer. It's just for their accounting to say these orders have all physically left the building and I can expect an invoice for them at some point." — David, Mar 25

No user interface needed for accruals — it's automated backend messaging.

### PGI triggers completed cost
When PGI is successfully processed, it populates the **Completed Cost** section on the sell side. Without PGI, completed cost is blank.

### Billing is separate
Odyssey billing and payment is NOT in Odyssey One (the TMS). Shipment data is sent to a separate financial system that waits for carrier invoices to match. This is why "Invoice" is not a valid document type in the shipments UI.

---

## 8. Exceptions & Monitoring

### Exceptions = System is STUCK, user must act
> "The system is not able to proceed by itself. It would require someone's intervention to guide the system." — Jana, Mar 23

| Category | When it happens |
|---|---|
| **Date Issues** | Pickup/delivery date problems |
| **Routing Review** | No routes found for the lane |
| **Tender Issues** | System tried to tender but couldn't |
| **Tender Review** | Needs manual user intervention to select carrier |
| **Bid Review** | Spot bids received that need user evaluation |

~16 exception conditions can halt auto-tendering and push shipments to user review.

### Monitoring = System is WORKING, user just watches
> "If the system can do everything by itself, it will go in monitoring. It is just for the user to monitor." — Jana, Mar 23

| Category | Description |
|---|---|
| **Hold** | Temporarily paused |
| **Consolidation** | Being optimized |
| **SpotBid** | Competitive bidding in progress |
| **Approved** | Carrier accepted the tender |

### Key insight: Same screen template
Monitoring screens look **exactly the same** as exception screens — same layout, just different data/statuses. Design once, reuse across all categories.

> "Once you design all these screens, all these screens are going to look exactly the same. You're just tweaking the same information a little bit in different stages." — Jana, Mar 23

### Dynamic actions per tab
The action buttons change depending on which exception/monitoring category is selected.

> "Maybe this one can change depending on the place we are right now" / Jana: "Exactly which tab we are, exactly." — Jana, Mar 23

---

## 9. History — Two Distinct Types

### Shipment History (Audit trail)
All changes made to the shipment over time.
- Format: **date, time, person, action** (e.g., weight changed from X to Y)
- Shows: quantity changes, orders added/removed, pickup date changes, etc.

> "The history is the overall changes made to the shipment. If a quantity changed..." — Jana, Mar 25

### Tender History
Record of **previous routing option sets**. When a shipment is re-tendered (e.g., because an order was added), the old routing options become tender history.

> "The first one becomes a history. The first set becomes a tender history and then the second one, third one, you can generate many more." — Jana, Mar 25

These are **different** from each other. Jana initially deprioritized both ("forget about this for now") but later clarified their distinct purposes. Both should exist as tabs — potentially grayed-out for initial build.

---

## 10. UI Feedback from Stakeholders

### From David (Mar 25)

| Item | Feedback | Impact |
|---|---|---|
| **Products tab** | Default to expanded, not collapsed. "When it's closed, it doesn't have any value." | Change default state |
| **Order dropdown** | Show origin, destination, and weight — not just order IDs. "Just looking at 4 order IDs doesn't tell me which order I want to look at." | Enhance dropdown content |
| **Stops tab** | Move between Product and Routing Guide in tab sequence | Reorder tabs |
| **Stops layout** | Make vertically compact. "Internal users prefer seeing data without scrolling over having the fancy screen." | Reduce spacing |
| **Stop naming** | Use P1/P2/D1/D2 convention (P=Pickup, D=Delivery) | Update labels |
| **Stops data priority** | Location and date are most important | Visual hierarchy |
| **Instruction type** | Remove for now. Business pushed back — they don't use typed instructions today. | Remove field |
| **Document types** | Remove "Invoice" (never valid), replace with "POD" (Proof of Delivery). David will provide full list. | Update data |
| **Routing guide data** | Fix demo: accepted carrier should be rank 3+ (not #1), to reflect sequential logic | Fix generator |
| **Cost allocation** | Summary expanded, load detail collapsed by default | Change defaults |
| **Export modal** | Should be "all columns" vs "current columns" (not "all records" vs "filtered records"). Both export the same filtered records — the choice is about which columns. | Fix export labels |
| **Tab name** | Consider renaming "Routing Guide" to "Tendering" | Naming change |

### From Jana (Mar 23 + Mar 25)

| Item | Feedback | Impact |
|---|---|---|
| **AP/AR display** | Show side by side on same screen for comparison | Already implemented |
| **Completed cost** | Grayed out/disabled until PGI | Already implemented |
| **Collapsed rows** | Show only first line with "+" indicator. Pattern applies to Products and Instructions. | UI pattern rule |
| **Unit consistency** | Don't mix weight units (lbs vs kgs) or package types within a shipment | Data constraint |
| **Shipment totals** | Must aggregate from order totals (e.g., 105 + 80 = 185 packages at shipment level) | Data integrity |
| **Notes** | Internal only | Scope confirmation |
| **Platform consistency** | Search, column management, export should be reusable across all Odyssey domains | Architecture note |

### From Jana + Manuela (Mar 30) — Corrections to implemented work

| Item | Feedback | Impact |
|---|---|---|
| **AP/AR cost data** | Values must be DISTRIBUTED across orders by weight, not repeated. Sum of order rows = total. | Generator fix |
| **AP/AR layout** | Remove AP/AR toggle tabs. Stack AP table on top, AR table below — now that order count is limited, vertical space is sufficient. (Manuela proposed, Jana confirmed) | Component rewrite |
| **Compare modal** | Add order tabs/dropdown inside modal to switch between orders. Max 5 orders so tabs fit. Overall margin stays on top. (Jana proposed dropdown, Manuela suggested tabs, Jana agreed) | Modal enhancement |
| **Document types** | "Other" should NOT have been removed — keep it for emails, images, misc attachments | Add back "Other" |
| **Tab name** | "Routing Guide" must become "Tender" everywhere — Jana explicit: "Everywhere it is going to be tender." | Global rename |
| **Export modal** | Confirmed working correctly | No change |
| **Tab reorder** | Confirmed correct | No change |
| **Products expanded** | Confirmed: start expanded, users can collapse with minus signs | No change |

### From Jana + Manuela (Mar 30) — New requirements (for future)

| Item | Feedback | Impact |
|---|---|---|
| **Products tab** | Add order number label/separator between order groups for visual clarity | UI enhancement |
| **Documents** | Add file preview (Outlook-style) with download button, not immediate download | New feature |
| **Tender tab content** | Should match PPT2 layout: shipment order, initial pickup, final delivery, action buttons. Summary on top, details below. | Content redesign |
| **Tender tab reuse** | Same screen in Planning Exceptions AND Planning Monitoring | Architecture |
| **History tab** | Populate with Jira-style audit entries: username, date/time, change type (order update, shipment update) | New content |
| **Tender History** | Leave blank for now | Deprioritized |
| **Three-dot menu** | Actions: "Edit by Shipment" + "Tender to Preferred Carrier" | New actions |

---

## 11. User Personas

| Persona | When they use shipments | What they care about |
|---|---|---|
| **Planners** | During planning/tendering phase | Carrier options, costs, timing |
| **Operations** | During monitoring | Status, location, exceptions |
| **Audit team / Accountants** | After PGI | Costs, carrier invoices, history, rate comparisons |

> "The planner is going to use it. The same screens, at some point, the accountants or audit team will use it." — Jana, Mar 25

---

## 12. Data Model

### Main table row
buyShipment, sellShipment, orders[], customerId, customerName, origin, destination, pickupDate, deliveryDate, mode, scac, tenderStatus, shipmentStatus, grossWeight, equipmentCode

### Order tab
orderNumber, shipDirection, orderDate, paymentTerms, shipmentMode, equipment, shipFrom, shipTo, schedule, products, totals, references, contacts

**Order sections** (from Orders domain): header, general, consigner/consignee, bill-to, product, instruction, additional accessorial. Shipment view pulls a subset.

### Stops tab
summary (distance, weight, volume, carrier, equipment, utilization), stops[] (type P/D, stopNumber, location, address, date, appointment, weight, volume, packageCount)

### Product tab
orders[] → lines[] (lineNumber, shipItem, description, packageCount, grossWeight, volume, hazmat, tareWeight, netWeight, hazmatClass, productClass, countryOfOrigin, dimensions)

### Routing guide / Tendering tab
options[] (rank, scac, carrierName, rate, cost, status [Sent/Accepted/Declined/Rejected/Cancelled], pickupDateTime, deliveryDateTime, transit, distance, SL, routeGroup, api, responseMethod)

### Cost allocation tab
planned { summary, orders[] (orderNumber, directCost, apCost, arCost, margin, apBase, apFuel, apDiscount, apHzc, apSoc, arBase, arFuel, arDiscount, arHzc, arSoc) }
completed { same structure, only populated after PGI }

**Cost distribution rule (Mar 30):** Each cost component (base, fuel, discount, HZC, SOC) is distributed across orders by **weight proportion** — not repeated. Sum of all order portions must equal the shipment total. Applies to both AP and AR sides.

**Additional charges (Mar 30):** Jana noted charge types can be extended. E.g., "driver help at load" could be an additional charge. Charges keep adding as columns to the right.

### Instructions tab
instructions[] (seq, text) — **type field removed** per business feedback

### Documents tab
documents[] (type [BoL/MBoL/POD/SL/Packing List/Other], description, fileName)
- **Invoice removed**, **POD** (Proof of Delivery), **SL** (Shipping List), **Packing List** added (David, Mar 25)
- **Other kept** — for emails, images, misc attachments (Jana, Mar 30)
- Supported file types: Excel, PDF, images (JPEG), etc. — no validation on attachments (Jana, Mar 30)

### Notes tab
notes[] (author, authorInitials, avatarClass, date, body) — internal only

### Data constraints
- ~~Orders within a shipment share the same customer~~ → Orders from different customers can be on the same shipment
- Stops pickup locations match shipment origin, delivery matches destination
- Product package types and weight units are consistent within a shipment
- Shipment totals = sum of order totals
- AP cost breakdown: base + fuel (always), discount + HZC + SOC (conditional)
- AR cost ≈ AP × 1.25-1.35 (margin 20-35%), but per-customer markups may differ
- Routing options: 3-6 per shipment, sequential status logic applies
- Direct cost only relevant for multi-load shipments
- Mode: FTL, LTL, INTERMODAL
- Tender status: Sent, Accepted, Declined, Rejected, Cancelled
- Shipment status: Tender, In Transit, Delivered, Booked

### Generated dataset
- 200 shipments, ~500 total orders
- Correlated across all tabs per shipment
- Reproducible via faker seed 42
- Generator: `tools/generate.mjs`

---

## 13. Remaining Open Questions

### ~~Q1: Full list of document types~~ — RESOLVED (Mar 30)
Final list: BoL, MBoL, POD, SL (Shipping List), Packing List, Other.

### Q2: History tab scope
Both history types (shipment audit + tender history) are defined but deprioritized. Build as grayed-out placeholders or implement later?

### Q3: Routing guide sub-tabs
Jana mentioned the routing guide has 4-5 sub-tabs within it. Need clarification on what those are.

### Q4: Actions per exception category
Need specific action lists per exception/monitoring tab. Known so far:
- Tender Review: "Tender to preferred carrier", "Cancel shipments"
- General: Tender, Retender, Cancel, Accept, Decline

### Q5: Cost display before tendering
AP/AR costs may not be available until tendered. How should the UI handle shipments in pre-tender state?

### Q6: Cross-customer consolidation
Not currently done but planned. When implemented, how should multi-customer shipments display in the main table (which customer shows)?

---

## Changelog

| Date | Session | Key additions |
|---|---|---|
| Feb 17 | Jana grooming #1 | Initial domain model, tender flow, AP/AR structure, exceptions vs monitoring |
| Mar 23 | Jana grooming #2 | Sell side simultaneous creation, margin definition, completed cost trigger, dynamic actions, monitoring = same layout as exceptions |
| Mar 25 | David grooming | Spot bidding flow, PGI data flow, freight accruals, cost allocation by weight, multi-customer shipments (correction), routing guide status logic, UI feedback (products, stops, instructions, documents) |
| Mar 25 | Jana grooming #2 | Order→Load→Shipment hierarchy, loads hidden from users, tender statuses (5 states), tender history vs shipment history distinction, re-tendering triggers, 16 exception conditions, spot bid overflow, user personas, planning/consolidation |
| Mar 30 | Jana + Manuela review | Cost distribution by weight (correction), AP/AR stacked layout (Manuela), compare modal order tabs, doc types keep "Other", "Routing Guide" → "Tender" rename, products order separators, document preview, history tab content, three-dot menu actions |
