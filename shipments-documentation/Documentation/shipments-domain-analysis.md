# Domain Analysis — Shipments

Sources: Jana (domain expert), David Johns (business stakeholder), Manuela Ramirez (designer)
Sessions: Feb 17, Mar 23, Mar 25 (x2 — David + Jana), Mar 30 (Jana), Apr 1 (Jana grooming #6)
Reference decks: `Shipments-Monitoring.pptx`, `Shipments-Exceptions.pptx` (Jana's original domain walkthroughs, referenced throughout grooming sessions)

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

### Conceptual model
Tendering is the **core decision point** of the shipment lifecycle — it's where Odyssey assigns a carrier to move the freight. Everything before tendering (planning, consolidation, routing) is preparation. Everything after (monitoring, PGI) is execution and verification.

The user's mental model: "I have freight that needs to move. Who's going to carry it, at what cost, and by when?"

### What is it?
Tendering = offering a shipment to a carrier and waiting for their yes/no response.

> "You want to paint your entire home. You have identified 4 painters. You're contacting the first painter — give me a quote, will you be able to take this job?" — Jana, Feb 17

### How it works
1. Routing guide generates a ranked list of suitable carriers from pre-agreed contracts
2. System sends tender to carrier #1 (usually cheapest, unless overridden by "preferred carrier")
3. Wait for response within time limit
4. If **accepted** → shipment moves to Monitoring (Approved)
5. If **declined** → system tenders to carrier #2, and so on
6. If all carriers exhaust → goes to **Spot Bid** (overflow)
7. **16 exception conditions** can halt auto-tendering and put the shipment up for user review

### Tender statuses
| Status | Meaning |
|---|---|
| **Sent** | Tender has been sent, awaiting response |
| **Accepted** | Carrier accepted the tender |
| **Declined** | Carrier actively said they cannot take the load (includes timeouts — "Rejected" was merged into Declined) |
| **Cancelled** | User manually cancelled the tender |

> "Decline means you sent the tender out, but they did not accept it." — Jana, Mar 25

**CORRECTED Apr 1:** Reduced from 5 to 4 statuses. "Rejected" (timeout) is no longer a separate status — it is covered by "Declined."

### Sequential tendering constraint
- Only ONE tender can be **Sent** at a time across all routing options for a shipment
- Only ONE tender can be **Accepted** at a time
- Multiple **Declined** are possible (all carriers that were tried and said no)
- **Accepted** and **Sent** cannot coexist — when a carrier accepts, Sent is replaced by Accepted
- From Sent: can transition to Accepted, Declined, or Cancelled
- Carriers below the accepted one should have no status (not yet tendered)

> "You can't have a pending tender if there's also an accepted tender." — David, Mar 25
> "We usually only go to the second carrier when the first one declines." — David, Mar 25
> "there could be only one sent. Similarly there can be only one accepted. But there can be multiple declines within a shipment." — Jana, Apr 1
> "accepted and sent cannot be in the same thing." — Jana, Apr 1

### Tender status drives shipment status

The tender status on the routing options determines the overall shipment status:

| Tender Status | Shipment Status |
|---|---|
| **Accepted** | Done |
| **Cancelled** | Review |
| **Declined** | Review |
| **Sent** | (blank/processing) |

> "The tender status drives the shipment status." — Jana, Apr 1

### Auto-tender vs Manual tender
- **Auto-tender:** System handles the full sequence — starts based on configurable lead time (e.g., 3 days before pickup). Different customers may have different lead times.
- **Manual tender:** User selects shipments and chooses an action:
  - "Tender to preferred carrier" — send to rank #1 carrier
  - "Cancel shipments" — cancel selected shipments
  - Multi-select supported for bulk operations
  - User can override timing (start tendering earlier than the system would)

> "System can only start maybe like 3 days before the pickup date... It could be 3 days, it could be 4 days for some customers." — Jana, Mar 25

### Tender summary header
When a user selects a shipment row (in either Planning Exceptions or Planning Monitoring views), a tender summary appears providing the shipment context needed for carrier decisions:

- **Shipment info:** Buy Shipment ID, Sell Shipment ID, Mode, Seed Equipment, Planning Date Type, Gross Weight, Pkg Count, Volume, Distance, Instructions, Hazardous
- **Order info:** Planning Date Type, Order Pickup/Delivery Date/Time, Order #, Direct Cost, Pickup #
- **Initial Pickup:** full address block (name, address, city, state, zip, country, date/time)
- **Final Delivery:** full address block

This summary is visible while the user reviews the routing options table below. The user needs to see weight, hazmat status, mode, equipment, and route details to evaluate whether a carrier's cost and transit time are acceptable.

> "Once you build a shipment, you know what is a pickup date, delivery date... the origin, destination, how many miles, what is the weight... But for this origin and destination, I know who are all the people who can carry that load." — Jana, Feb 17

> "This entire section should be there... Shipment order, pickup, final delivery." — Jana, Mar 25

> "The same screen will be available in planning exceptions and planning monitoring. Both the same screen tender screen." — Jana, Mar 30

Source: `Shipments-Monitoring.pptx`, Slide 4

### Routing options — full column set
The routing options table has a large number of columns. The Monitoring PPT (`Shipments-Monitoring.pptx`, Slides 4-8) split the full column set across multiple slides because they cannot fit on a single slide. These are NOT separate tabs or sub-views — they represent all columns of ONE table.

| Column group (from PPT) | Columns |
|---|---|
| **Routing Options** | Rank, SCAC, Carrier Name, Equipment, AP Cost, Tender Status, Pickup/Delivery Date/Time, Transit, Distance |
| **Notify & Response Method** | Notify Method, Notify Date, Response Method, Response Date, Response User, Carrier Quoted, Network Leverage |
| **Pro & Equipment Info** | Pro #, Transporting Carrier, Equip #, Route Group |
| **Additional Info** | Carrier Pickup #, Carrier API Tender ID, Break Point, Rate Source, Distance Source, Transit Time Source, TT ID, Loadboard Expiry, RCP ID, LCE PK_ID |
| **Others** | Modify User, Modify Date, Indirect Point, Round Trip, Customer Preferred, Order Equip, Contact Exped, Note |

**CORRECTED Apr 1:** These were previously described as "table-level tabs" / "sub-views" that swap visible columns. In reality, the PPT split one wide table across multiple slides for readability. They may become column-group tabs within the tender table in the future, but for now they represent the full column set of the routing options table.

> "The routing guide has 4-5 sub-tabs." — Jana, Mar 25
> "It is the same thing as that. It's just the view is like halfway." — Jana, Apr 1

Source: `Shipments-Monitoring.pptx`, Slides 4-8

### User actions on tender screen

**Tender actions** (applied to routing options / carrier selection):
- **Tender** — manually send to a selected carrier (override rank order or start early)
- **Re-Tender** — re-send after a shipment change
- **Accept** — confirm carrier acceptance
- **Decline** — manually mark a carrier as declined (e.g., carrier called but electronic message didn't arrive)
- **Cancel** — cancel an active tender

**Additional action buttons:**
- **Add Quote** — add a manual carrier quote
- **Show Rate Details (QCA)** — view rate breakdown
- **Routing Query (QCP)** — query routing engine
- **View Stops** — view stop details from tender context
- **View Volume Commitment** — view carrier commitment vs actual volumes

> "You are overriding the system. You are starting it earlier." — Jana, Mar 25

Source: `Shipments-Monitoring.pptx`, Slide 4

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

### Conceptual model
Spot bidding is the **fallback** when the normal tendering process fails — all pre-contracted carriers have declined or been rejected. Instead of sequential offers to known carriers, Odyssey broadcasts the shipment to the open market and lets carriers compete on price. It's the difference between calling your regular painter vs posting the job on a marketplace.

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

### Conceptual model
AP/AR is the **financial layer** of every shipment. Every shipment has two cost sides: what Odyssey pays the carrier (AP) and what Odyssey charges the customer (AR). The difference is margin — Odyssey's profit. This is a brand-new visibility capability; the business has never had AR and margin displayed alongside AP before.

The user's mental model: "What am I paying for this shipment, what am I charging, and what's my margin?"

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

### Conceptual model
Cost allocation answers: "When multiple orders share one truck, how much of the freight cost belongs to each order?" This matters for customer invoicing (especially when orders belong to different customers with different markup rates) and for the customer's own accounting (tying freight cost back to cost-of-goods per order).

The user's mental model: "How is this shipment's cost split across its orders?"

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

### Conceptual model
PGI is the **reality check** of the shipment lifecycle. Up until this point, everything has been based on the customer's original order — planned quantities, planned weights, planned dates. PGI is when the freight physically leaves the customer's warehouse and the actual data comes in. Did they ship what they said they would? The system must reconcile actual vs. planned and re-rate costs if anything changed.

The user's mental model: "Did what actually shipped match what was planned? If not, what needs to be fixed?"

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

### PGI sub-categories (panel view)
The PGI/PGR panel has three monitoring sub-categories:

| Category | Description |
|---|---|
| **PGI Errors** | Automated validation failures (invalid codes, data mismatches) |
| **Manual PGI/PGR** | Requires manual user intervention to resolve |
| **Rating Failure** | Re-rating failed after PGI data changed shipment parameters |

> "When I launch PGI, three of these PGI metrics will be available to the user." — Jana, Feb 17
> "PGI manual error and then this is related to rating error." — Jana, Feb 17

Source: `Shipments-Monitoring.pptx`, Slide 3

### PGI triggers completed cost
When PGI is successfully processed, it populates the **Completed Cost** section on the sell side. Without PGI, completed cost is blank.

### Billing is separate
Odyssey billing and payment is NOT in Odyssey One (the TMS). Shipment data is sent to a separate financial system that waits for carrier invoices to match. This is why "Invoice" is not a valid document type in the shipments UI.

---

## 8. Exceptions & Monitoring

### Conceptual model

The Shipments domain is organized around **three operational phases**, each representing a different relationship between the system and the user:

- **Planning Exceptions** — The system is **stuck**. Something went wrong that the system cannot resolve on its own. The user must **take action** to unblock the shipment. This is the primary workspace for planners.
- **Planning Monitoring** — The system is **working normally**. Shipments are progressing through active workflow stages (tenders sent, consolidation happening, bids in market). The user monitors progress and can still take actions when needed (e.g., cancel a tender when a customer cancels).
- **PGI/PGR** — **Post-shipment confirmation**. The freight has physically moved and the system is reconciling actual data (weights, quantities, pickup dates) against what was planned. Issues here are data/validation problems, not carrier selection problems.

**CORRECTED Apr 1:** Exceptions and Monitoring share the **exact same screen** — same layout, same tender tab, same action buttons. The only differences are (1) which high-level tabs appear above the main table (different row filters), and (2) which tender status values appear on the routing options. Both views are fully interactive.

> "the standard screen is common between the exception box and the monitoring box. It is just that the status inside it will be different." — Jana, Apr 1
> "Both the screens are same, it's just the small details inside it is different." — Jana, Apr 1
> "just replicate the same screen between monitoring as well as for exceptions." — Jana, Apr 1
> "The system is not able to proceed by itself. It would require someone's intervention to guide the system." — Jana, Mar 23
> "If the system can do everything by itself, it will go in monitoring. It is just for the user to monitor." — Jana, Mar 23

### Planning Exceptions — "What do I need to fix?"

The user's mental model: "These shipments need me. What's wrong and what can I do about it?"

| Category | When it happens | User action |
|---|---|---|
| **Date Issues** | Pickup/delivery date problems | Adjust dates, contact customer |
| **Routing Review** | No routes found for the lane | Review routing, adjust parameters |
| **Tender Issues** | System tried to tender but couldn't | Investigate tender failure, retry or override |
| **Tender Review** | Needs manual user intervention to select carrier | Select carrier from routing options (radio buttons) |
| **Bid Review** | Spot bids received that need user evaluation | Evaluate bids, award carrier |

~16 exception conditions can halt auto-tendering and push shipments to user review.

**Tender screen in Exceptions** — This is **action-oriented**. When a user selects a shipment, they see the tender summary header (shipment context) plus routing options with **radio buttons** — each row is a carrier option the user can select. The tab was originally called "Routing Options" / "Routing Guide" because its purpose is literally: pick from these options. Action buttons (Tender, Re-Tender, Accept, Decline, Cancel) are available.

### Planning Monitoring — "What's happening right now?"

The user's mental model: "These shipments are moving along. Let me check their status — and act if needed."

| Category | Description |
|---|---|
| **Hold** | Tender has not started. Shipment is waiting for the right time to begin tendering. |
| **Consolidation** | Jana said "forget about consolidation for you. It is not important. Just show the same data." Keep as placeholder with same data as other tabs. |
| **Sent** | One routing option has been sent to a carrier, awaiting response. Only one Sent at a time. |
| **Spot Bid** | Competitive bidding in progress in the market. |

**Tender screen in Monitoring** — This is the **same screen as Exceptions**. Same tender summary header, same routing options table with radio buttons for carrier selection, same action buttons (Tender, Re-Tender, Accept, Decline, Cancel). Actions ARE available — what the user acts on differs based on context (e.g., Cancel when a customer cancels a shipment that's already been tendered).

**Tender status values differ by view:**
- In **Exceptions**: Cancelled, Declined appear on routing options (never Accepted, never Sent)
- In **Monitoring**: Sent, Accepted appear on routing options (never Cancelled, never Declined)

> "Actions are still required, but what they are going to act will be different." — Jana, Apr 1

### Exceptions and Monitoring are the same screen

**CORRECTED Apr 1:** Previously documented as having different functional intents (action-oriented vs observation-oriented). In reality, Exceptions and Monitoring are the **exact same screen** with the **exact same layout**:

- Same tender summary header on top
- Same routing options table below (with radio buttons for carrier selection)
- Same action buttons (Tender, Re-Tender, Accept, Decline, Cancel)
- Same data structure

The ONLY differences:
1. **Different high-level tabs** above the main table (Exceptions: Date Issues, Routing Review, Tender Issues, Tender Review, Bid Review; Monitoring: Hold, Consolidation, Sent, Spot Bid) — both sets are ROW FILTERS
2. **Different tender status values** appear on routing options (see above)
3. **What the user acts on** differs based on context

> "The same screen will be available in planning exceptions and planning monitoring. Both the same screen tender screen." — Jana, Mar 30
> "Once you design all these screens, all these screens are going to look exactly the same. You're just tweaking the same information a little bit in different stages." — Jana, Mar 23
> "the standard screen is common between the exception box and the monitoring box. It is just that the status inside it will be different." — Jana, Apr 1
> "Both the screens are same, it's just the small details inside it is different." — Jana, Apr 1
> "just replicate the same screen between monitoring as well as for exceptions." — Jana, Apr 1

### Three-panel navigation architecture

| Panel | Sub-categories | Purpose | User intent |
|---|---|---|---|
| **Planning Exceptions** | Date Issues, Routing Review, Tender Issues, Tender Review, Bid Review | Shipments stuck — user must act | "What do I need to fix?" |
| **Planning Monitoring** | Hold, Consolidation, Sent, Spot Bid | Shipments in progress — user monitors and acts as needed | "What's happening right now?" |
| **PGI/PGR** | PGI Errors, Manual PGI/PGR, Rating Failure | Post-shipment confirmation issues | "Did the actual match the plan?" |

Source: `Shipments-Monitoring.pptx` Slide 3, `Shipments-Exceptions.pptx` Slide 2

### Table-level tabs per panel

Each panel has its own set of **table-level tabs**. All tabs across all panels are **row filters**:

- **Planning Exceptions** tabs: All, Date Issues, Routing Review, Tender Issues, Tender Review, Bid Review — these **filter rows** (show only shipments matching that exception category)
- **Planning Monitoring** tabs: Hold, Consolidation, Sent, Spot Bid — these **filter rows** (show only shipments in that monitoring stage)
- **PGI/PGR** tabs: PGI Errors, Manual PGI/PGR, Rating Failure — these **filter rows** by PGI issue type

**CORRECTED Apr 1:** Previously documented Monitoring tabs as "column filters" (Routing Options, Notify & Response Method, etc. that "swap visible columns"). This was incorrect — those PPT slide groupings represent columns of one wide table split across slides for readability (see Section 3). The actual Monitoring tabs are Hold, Consolidation, Sent, Spot Bid — and they are row filters, same as Exception tabs.

### Tender summary on shipment selection

When a user selects a shipment row in either Exceptions or Monitoring, a **tender summary header** appears showing the shipment context needed for carrier decisions. This header is shared — same layout and data in both panels. See Section 3 for the full field list.

> "This entire section should be there... Shipment order, pickup, final delivery." — Jana, Mar 25

### Dynamic actions per tab

The action buttons change depending on which exception/monitoring category is selected. Actions are available in BOTH Exceptions and Monitoring — what the user acts on differs based on context.

> "Maybe this one can change depending on the place we are right now" / Jana: "Exactly which tab we are, exactly." — Jana, Mar 23
> "Actions are still required, but what they are going to act will be different." — Jana, Apr 1

---

## 9. History — Two Distinct Types

### Conceptual model
History serves **accountability and traceability**. In logistics, knowing who changed what and when is critical — disputes over dates, weights, and costs are common. Two distinct histories exist because they track different things: shipment history tracks data changes (audit trail), while tender history tracks carrier selection attempts (routing changes).

The user's mental model: "What happened to this shipment over time?" (shipment history) vs. "What carriers were tried before this one?" (tender history)

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
| **Three-dot menu** | Actions: "Edit by Shipment", "Tender to Preferred Carrier", "Replan" | New actions |

---

## 11. Search, Filtering & Column Arrangement

### Conceptual model
Search, filtering, and column arrangement are the **navigation layer** of the shipments view. A planner managing hundreds of shipments daily needs to quickly find the ones that need attention. The design follows a **progressive narrowing** model — the user starts broad ("show me all shipments") and narrows through layers (panel tabs → search chips → column filters → saved profiles) until they're looking at exactly the shipments they need.

The user's mental model: "I have 200+ shipments. Help me find the ones I care about right now."

### Overview
Search, filtering, and column arrangement are **cross-cutting features** designed to be reusable across all Odyssey domains (not just Shipments).

> "Search, column management, export should be reusable across all Odyssey domains." — Jana, Mar 25

### Search Attributes
All shipment attributes are searchable. The full list is defined in `Attributes (Progression Grouping).csv`, organized by **search progression** — a hierarchy reflecting how users mentally narrow down a shipment:

| Progression | Group | Attributes | User intent |
|---|---|---|---|
| 1 — Find the shipment | Shipment Identifiers | Buy Shipment #, Sell Shipment #, Order #, Pro#/Booking # | Most common — identifying a specific shipment |
| 2 — Who it belongs to | Customers & Parties | Customer ID, Customer Name, Consignor, Consignee | Finding shipments by customer/party |
| 3 — Where it goes | Route & Geography | Origin, Destination, Distance, Stops, Ship Direction | Location-based search |
| 4 — When it moves | Schedule & Appointments | Pickup Date, Delivery Date, Earliest/Latest Pickup, Earliest/Latest Delivery | Date-based search |
| 5 — How it moves | Transport & Equipment | Mode, Equipment Code, Equipment #, Seal Number, Incoterm, Freight Terms | Transport details |
| 6 — Operational status | Carrier & Tender Status | SCAC, Tender Status, Shipment Status | Status-based filtering |
| 7 — Inspect cargo | Cargo & Handling | Gross Weight, Net Weight, Tare Weight, Pkg Count, Hazardous | Cargo inspection |
| 8 — Inspect financial | Rates & Costs | AP Freight Cost, Preferred AP Direct Cost, AR Freight Cost, Preferred AR Direct Cost | Financial review |
| 9 — Load logistics | Load Details | Load #, Load Count, Load Status | Load-level detail |
| 10 — Edge cases | Advanced / Rare Fields | Shipment Type, Shipment Sequence Leg, Next Shipment ID, Validation Message | Only experienced users |

The progression determines **chip priority** — when a user types a search value, the system suggests attribute chips starting from the most likely group. Only experienced users will search all the way down to edge cases.

### Smart Chip Search
When the user types in the search bar, the system analyzes the input and generates relevant attribute chip suggestions:
- Digits → number-text fields (Buy Shipment #, Order #, etc.)
- Letters → text fields (Customer Name, Origin, etc.)
- Known values → matching dropdown options (Mode, Status, etc.)

Selected chips become active filters applied to the table with real-time filtering (150ms debounce).

### Filter Panel
The filter panel is a **354px side drawer** with two tabs:
- **All tab** — shows filters corresponding to the **currently visible columns**. If the table displays 12 columns, only those 12 attribute filters are shown. Filters are visually grouped by their progression subtitle.
- **Saved tab** — saved search profiles that can be applied, copied, or managed.

**"More filters" expansion:** When the user needs filters beyond the visible columns, a "More filters" button at the bottom expands the panel to full view, revealing all available filters. Hidden by default: everything from "Inspect cargo details" (progression 7) through "Edge cases" (progression 10).

### Filter Layering
Filters are applied in layers, each narrowing the result set:

1. **Panel selection** (zero-order filter) — Exceptions, Monitoring, or PGI/PGR determines the shipment pool. Each panel contains only its shipments — they are separate pools, not three views of the same data.
2. **Panel tabs** (first-order filter) — within a panel, tabs narrow to a category (e.g., "Date Issues" within Exceptions, "Hold" within Monitoring). All panel tabs are row filters across all panels.
3. **Search chips** — attribute-based filtering
4. **Date range filters** — from the filter panel
5. **Saved search profiles** — pre-defined filter combinations that can be applied as a set

### Filtering vs. Column Visibility — Cross-Cutting Rule

**Problem:** Column Arrangement lets users hide columns. Tabs and search filter by data fields. What happens when a user filters by a field whose column is hidden?

**Three filter categories with different rules:**

#### 1. Panel & tab filtering — Always works, independent of column visibility
Panel selection (Exceptions/Monitoring/PGI/PGR) and tab selection (Date Issues, Routing Review, etc.) are **structural navigation**, not data filters. They operate on system-level fields (`panel`, `category`) that are not user columns. These always work regardless of which columns the user has visible.

The user's mental model: "I'm choosing WHICH shipments to look at" — this is navigation, not filtering.

#### 2. Search chips & filter panel — Scoped to visible columns by default, expandable
The filter panel shows only filters matching **currently visible columns**. This prevents confusion — the user filters by what they can see.

When the user needs to filter beyond visible columns, a **"More filters" button** expands to all available fields. If a user filters by a hidden field via "More filters", results show — the user opted in knowingly.

The user's mental model: "I'm narrowing WHAT I see within my current view" — default to visible, opt-in to advanced.

#### 3. Hidden filter indicator
When an active filter references a column that is not visible, the UI should show a subtle indicator (e.g., a badge or chip: "1 hidden filter active"). This prevents silent filtering — the user always knows why rows appear or disappear.

**Summary table:**

| Filter type | Tied to column visibility? | Behavior |
|---|---|---|
| Panel selection (Exceptions/Monitoring/PGI/PGR) | No | Always works — structural navigation |
| Tab selection (Date Issues, Hold, etc.) | No | Always works — category navigation |
| Filter panel (default) | Yes | Shows only visible column filters |
| Filter panel ("More filters") | No | Expands to all fields — user opts in |
| Search chips | Yes (default suggestions) | Chip suggestions prioritize visible columns, but all attributes remain searchable |
| Saved search profiles | No | May include hidden fields — show "hidden filter active" indicator |

**Impact on data model:** Each shipment in the generator needs a `panel` field (exceptions/monitoring/pgipgr) and a `category` field (date-issues, routing-review, hold, sent, etc.) to support panel/tab filtering independent of column visibility.

**Affects:** SHP-15 (exception tabs), SHP-16 (monitoring tabs), SHP-18 (column arrangement), SHP-19 (search & filtering)

### Column Arrangement (Change View)
The Column Panel controls which columns are visible and their order. It uses the **same UI pattern** for both the main shipment table and the selected shipment detail table (bottom bar):

**Panel flow:**
1. **Presets list** — saved column configurations (profiles)
2. **Chevron-right on a preset** → opens a sub-panel with the full column list
3. **Column list** — each column has a checkbox (visible/hidden) and is **draggable** (reorder)

**Column sources:**
- **Main shipment table** — columns from `Attributes (Progression Grouping).csv` (each attribute = a column)
- **Selected shipment detail table** — columns defined per tab (Product, Tender/Routing, etc.)

**Locked columns (always visible, not configurable):**
In the Planning Monitoring view, certain columns are always visible and cannot be hidden or reordered. These appear in the Change View as unselectable and undraggable:

*Routing Options table (all sub-tabs):*
Rank, SCAC, Carrier Name, Equipment, AP Cost, Tender Status, Pickup Date/Time, Delivery Date/Time

*Product table:*
Order #, Line #, Ship Item, Description, Package Count, Gross Weight, Volume, Hazmat, Hazmat Group, Product Class, Declared Value, BatchLot #

Source: Green-marked fields in `Shipments-Monitoring.pptx` Slides 4-8, `Shipments-Exceptions.pptx` Slide 7

**Column profiles:**
Column arrangements can be **saved as profiles** and **shared with other users**. This allows teams to standardize views across the organization.

> "I will be able to move the columns, I will be able to adjust my columns." — Jana, Mar 25
> "Even if you don't have exact information, just put some like two or three information to give them the idea." — Jana, Mar 30

### Export
Export respects the current column configuration:
- **Export all columns** — exports all available attributes regardless of visibility
- **Export visible columns** — exports only the currently configured columns

Both options export the same filtered record set. Limited to first 10,000 records.

---

## 12. User Personas

| Persona | When they use shipments | What they care about |
|---|---|---|
| **Planners** | During planning/tendering phase | Carrier options, costs, timing |
| **Operations** | During monitoring | Status, location, exceptions |
| **Audit team / Accountants** | After PGI | Costs, carrier invoices, history, rate comparisons |

> "The planner is going to use it. The same screens, at some point, the accountants or audit team will use it." — Jana, Mar 25

---

## 13. Data Model

### Main table row
buyShipment, sellShipment, orders[], customerId, customerName, origin, destination, pickupDate, deliveryDate, mode, scac, tenderStatus, shipmentStatus, grossWeight, equipmentCode

**Shipment status as main grid column (Apr 1):** Jana explicitly requested shipment status be visible as a column in the main table so users can see at a glance when a shipment is done (accepted) or needs review.

> "we should add status of the shipment here... in the table we should have the status of the shipment so you can show when it is accepted it is done." — Jana, Apr 1

### Order tab
orderNumber, shipDirection, orderDate, paymentTerms, shipmentMode, equipment, shipFrom, shipTo, schedule, products, totals, references, contacts

**Order sections** (from Orders domain): header, general, consigner/consignee, bill-to, product, instruction, additional accessorial. Shipment view pulls a subset.

### Stops tab
summary (distance, weight, volume, carrier, equipment, utilization), stops[] (type P/D, stopNumber, location, address, date, appointment, weight, volume, packageCount)

### Product tab
orders[] → lines[] (lineNumber, shipItem, description, packageCount, grossWeight, volume, hazmat, tareWeight, netWeight, hazmatClass, hazmatGroup, hazmatDescription, hazmatUnNumber, flashPoint, boilingPoint, marinePollutant, wgkClass, declaredValue, productClass, shippingClass, countryOfOrigin, dimensions, batchLot, tunnelCode, loadConstraints, toPartnerRef, thirdPartRef, thirdPartLine, thirdPartRefDate)

Source: `Shipments-Exceptions.pptx`, Slide 7

### Routing guide / Tendering tab
options[] (rank, scac, carrierName, rate, cost, status [Sent/Accepted/Declined/Cancelled], pickupDateTime, deliveryDateTime, transit, distance, SL, routeGroup, api, responseMethod)

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
- Mode: TL, LTL, RR, IMD, AIR (TL=Truckload, RR=Railroad, IMD=Intermodal, AIR=Air freight)
- Tender status: Sent, Accepted, Declined, Cancelled (4 values — "Rejected" merged into "Declined" per Apr 1 correction)
- Shipment status: Review, Done (for design purposes; full state machine includes Hold, Approved, Load Board, Spot Bid, Bid Review but not needed for current design)
- Planning Date Type: RDD (Requested Delivery Date), RSD (Requested Ship Date), SSD (Standard Shipping Date) — planning-related fields for pickup and delivery. Not in scope for UI implementation currently.

### Generated dataset
- 200 shipments, ~500 total orders
- Correlated across all tabs per shipment
- Reproducible via faker seed 42
- Generator: `tools/generate.mjs`

---

## 14. Remaining Open Questions

### ~~Q1: Full list of document types~~ — RESOLVED (Mar 30)
Final list: BoL, MBoL, POD, SL (Shipping List), Packing List, Other.

### Q2: History tab scope
Both history types (shipment audit + tender history) are defined but deprioritized. Build as grayed-out placeholders or implement later?

### ~~Q3: Routing guide sub-tabs~~ — RESOLVED (Mar 31, PPT analysis) — REFRAMED (Apr 1)
5 column groups confirmed from `Shipments-Monitoring.pptx` Slides 4-8: Routing Options, Notify & Response Method, Pro & Equipment Info, Additional Info, Others. **CORRECTED Apr 1:** These represent all columns of ONE table split across multiple PPT slides for readability — not separate sub-views or tabs. They may become column-group tabs in the future. See Section 3.

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
| Mar 31 | PPT analysis (`Shipments-Monitoring.pptx`, `Shipments-Exceptions.pptx`) | Three-panel navigation architecture, table-level tabs per panel, tender summary header on shipment selection, routing options 5 sub-views (Q3 resolved), tender action buttons, PGI/PGR sub-categories (3), missing product fields (~10), Mode values corrected (TL/LTL/RR/IMD/AIR), Planning Date Type (RDD/SSD/RSD) documented, "Replan" added to three-dot menu |
| Apr 1 | Jana grooming #6 | MAJOR CORRECTION: Monitoring = same screen as Exceptions (not column-group tabs). Tender tab identical in both (not read-only in Monitoring). Monitoring PPT slides = one table split across slides (not sub-views). Tender statuses simplified to 4 (Sent/Accepted/Declined/Cancelled). Shipment statuses corrected to Review/Done. Tender status drives shipment status. Shipment status added as main grid column. |
