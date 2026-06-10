---
domain: orders
type: analysis
tags: [orders, domain-analysis, jira-intake, order-service]
date: 2026-06-10
status: draft
source: "Jira LINX epics 7552, 7553, 8026, 7554, 7555, 7556, 7557, 7958, 5415 (852 stories, dumped 2026-06-10 to vault-sources/10-domains/orders/jira-stories/) + Efrain UX descriptions (vault-sources/10-domains/orders/efrain/) + David PRD Confluence 2366406657 + children (vault-sources/10-domains/orders/prd/), merged 2026-06-10 + 18 Angular UI captures (screenshots/, correlated 2026-06-10)"
---

# Domain Analysis — Orders

> Synthesized from Jira LINX epics covering the **already-built Angular** Orders capability in OdysseyONE. These stories document settled, implemented behavior. This document is the canon a React rebuild will be specced from. API cross-references point to [[order-service-api]]. Upstream/downstream relationship to Shipments: see [[10-domains/shipments/domain-analysis|Shipments domain analysis]].
>
> Citation convention: every factual claim carries its source inline. Jira stories, e.g. (LINX-10248). Efrain's per-section UX descriptions, e.g. (Efrain §General Information). David's PRD Confluence pages, e.g. (PRD 2365915159). Angular UI screen captures, e.g. (Screens: 4 Product Information) — the numbered captures in `screenshots/`, correlated in the [[10-domains/orders/screens-reference|screens reference]] note. `(inferred)` marks reasoning not directly stated in a source; unresolved items and source conflicts live in §10.

---

## 1. What Orders is

Orders is the OdysseyONE capability that **creates and manages customer orders** — the originating request that feeds shipment planning, execution, invoicing/payment, and customer visibility (LINX-5943). An order can be created two ways: **manually** through the UI (Quick or Long form) or **integrated** via inbound customer ERP systems through Boomi (LINX-5943, LINX-7552, LINX-7553).

- **Role in the platform.** Orders is the upstream source of truth for shipments. On creation/update an order is converted into a **Load**, and order changes are propagated downstream to the Shipments domain and to NN (LINX-7906, LINX-8800, LINX-9611). The order itself is the customer-managed record; Odyssey works the Load/Shipment copy of it — consistent with the three-tier Order → Load → Shipment model documented in [[10-domains/shipments/domain-analysis|Shipments domain analysis]].
- **Who uses it.** OdysseyONE internal users (operations/planners) for manual creation and for reviewing failed integrated orders; support teams and compliance consume the audit trail (LINX-7958). Default role assigned to internal users is **Admin** (LINX-7868). Access is via SSO; logout ends the application session, not the SSO session (LINX-5981, LINX-6059).
- **Explicit scope exclusions at order creation** (Managed Services orders): no credit check, no shipment creation on order creation, no rate-service calls, no notifications (LINX-7553, LINX-8026 epic descriptions). Note these are creation-time exclusions; QCP/QCA rating calls were later added — see §9.
- **Domain objectives** (PRD 2366406657): (1) build **feature parity with legacy TMS**; (2) integrate with the **CX Platform** so customers can view their orders and related shipments/loads. These frame the whole domain — the Angular build is a parity-first rebuild, not a greenfield design.
- **Consumers** (PRD 2366406657): **Legacy TMS** (post-renaps, must retain its current order-domain capabilities) and the **CX Platform** (customer-facing visibility, drill into each shipment on an order for status + tracking). The Order/Load/Shipment structure (§2 of [[10-domains/shipments/domain-analysis|Shipments]]) is preserved even when a customer only shares a shipment — see synthetic orders in §2.

---

## 2. Entity model

The order is a header with several nested collections. This maps directly to the `OrderHeader` / `manualOrder{}` model in [[order-service-api]] (the `/order/view` response in LINX-10700 is the canonical flat shape).

| Entity | Key fields | Source |
|---|---|---|
| **Order header** | `orderId`, `orderNumber`, `sourceOrderNumber`, `customerId`, `owningOrganizationId`, `poNumber`/`poDate`, `orderReleaseId`, ship direction, freight terms, requested ship/delivery/pickup dates (each paired with a `*TimeZoneCode`), flat origin/destination address blocks, gross/net weight, volume, net value, AP/AR cost totals, `orderStatus`, `sourceApplication` | LINX-10700, LINX-6204, [[order-service-api]] |
| **Order lines** (`orderLines[]`) | ~80 fields: product id/description, ship class + ship class id, gross/net/tare weight, volume, dimensions (L/W/H), package count, handling unit, full hazmat group (code, class, packing group, UN number, flashpoint, boiling point, tunnel code, WGK class, marine pollutant), reference codes, country of origin, declared value, AP/AR line charges, `isLoadConstraints`, EAV `userFieldListOrderLine[]` | LINX-10700, LINX-5995, LINX-6178 |
| **Involved parties** (`orderInvolvedPartyList[]`) | by `partyType`: Shipper/Consignor, Ship To/Consignee, Bill To, Seller, Buyer — name, full address, VAT number, `partyId`, source system | LINX-10700, LINX-7668, LINX-7771, LINX-9612 |
| **Instructions** (`orderInstructionList[]`) | `instructionNumber`, `instructionType`, `instructionDetail` | LINX-10700, LINX-8127, LINX-6201 |
| **Carrier/equipment** (`orderCarrierEquipDetailList[]`) | `scacCode`, `mode`, `modeDescription`, `equipmentCode`/description, carrier sequence | LINX-10700 |
| **Charges** | order-level `orderChargeList[]` + per-line `orderLineChargeList[]` + `orderAccessorialDetails[]`, each carrying AP and AR amounts with currency | LINX-10700, LINX-8292, LINX-8293 |
| **Audit** | `OrderAudit` snapshots stored as old/new JSON; field-level diff computed by a JSON-comparison component | LINX-6053, LINX-9730 |

**Derived flags.** `isConsolidateable` is set at the header level from the lines: `true` if **any** line has `isLoadConstraints = true`, else `false` (LINX-9473); however Efrain describes **Consolidatable as a user-facing checkbox in General Information, checked by default** (Efrain §General Information) — i.e. user-settable, not purely derived. **Unresolved** whether the checkbox writes the header flag directly or whether the line-derived value overrides it (see §10).

**Header origin/destination propagation (PRD).** The order table carries **Origin and Destination detail on the Order Header**, and entry at the header **auto-propagates to the lines on Create/Edit** (when not already present) (PRD 2365915159). PRD notes a future move to **remove Origin/Destination from Order Lines** entirely (PRD 2365915159 Future Functionality) — see §10. This explains the header-level flat origin/destination address blocks in the table above.

**TEMPLATE flag (PRD).** The order table gains a **`TEMPLATE` column, values Y/N, default N** (PRD 2365915159). See the future TEMPLATE=Y order mode in §10.

**Synthetic orders (CX Platform).** When a customer shares a **shipment** with Odyssey instead of an order, a **synthetic order** is created — "merely a copy of the shipment the customer shared" — so the Order → Load → Shipment structure and relationship are maintained for that customer (PRD 2366406657). This is a distinct creation origin from manual UI and integrated ERP (§3), and a likely fourth `sourceApplication` value. Customers then drill into each shipment on the order for status + tracking detail (PRD 2366406657).

**Identity rule (load-bearing).** `orderNumber` alone is **not** unique — it may repeat across records — but the combination **`orderNumber` + `owningOrganizationId` must be unique** in the LINX DB (LINX-9279). When the UI does not supply an order number, BE auto-generates it and `orderNumber = orderId`; similarly source order number auto-generates when neither UI nor ERP provides one (LINX-9742).

**Why the composite key — customer is the system of record** (Manuela, 2026-06-10): `owningOrganizationId` is the order's **customer owner** — the same customer concept users scope to via the navbar/Home **EntityChip** (handshake icon, customer selection). Every order ties back to exactly one customer; appending the org id to the order number ensures numbers are never reused *across* customers while customers remain free to use their own numbering. UI implication: the user's selected-customer scope is a first-class filter dimension on every Orders surface (overview grid, lookups default to the owning org's master data — LINX-6010 frequency-sorting is per-customer usage).

---

## 3. Order creation — three paths

All three converge on the same `manualOrder{}`/`OrderHeader` model. Manual creation has two form variants (Quick, Long); integrated is the inbound ERP path.

### 3.1 Common form sections

Both manual forms are organized into the same sections (Long Orders is a superset of Quick) (LINX-7553, LINX-8026):

1. **General Information** — Owning Organization (customer), Ship Direction, Freight Terms, Equipment, plus Long-only fields (Mode, SCAC, Country Call Code, additional info) (LINX-8118, LINX-6166, LINX-8126). Efrain re-scopes the Long-only content into **three collapsible subsections nested under General Information** — **Additional Information**, **Add Instructions**, **References** — all revealed by "Add More Details" (Efrain §General Information). This places Add Instructions and References *inside* General Information rather than as the separate top-level sections #6/#7 below — UI nesting clarification, not a contradiction of the underlying data.
2. **Pickup / Delivery** — Consignor and Consignee location lookups (LINX-8119, LINX-8042).
3. **Ship & Delivery Date and Time** — per Consignor/Consignee (LINX-8120, LINX-8028). Efrain places **Planning Date and Time as a third sub-section *inside* Pickup/Delivery** (one per Consignor/Consignee), alongside Location/Address and Contact Information (Efrain §Pickup and Delivery) — see §3.3a.
4. **Product Information** — line-item table, "Add Product" (LINX-8121, LINX-5998). *(Efrain marks this section "Under Construction" and did not describe it — Efrain §Product Information.)*
5. **Special Services** — Manage + Quick selection (LINX-8124, LINX-8125, LINX-8043, LINX-8044).
6. **References** (Long: a sub-section of General Information) (LINX-6085, LINX-8128). Efrain confirms References lives under General Information and was **simplified to two open text columns — Reference Type and Reference Number** — with dynamic add/delete rows (Efrain §General Information); see §3.3b. **Visually verified correction:** in the live UI, the References block appears in the **Quick (collapsed) view, above the "Add More Details" toggle** — it is **not** gated behind Add More Details (Screens: 1 Quick). Only **Additional Information** and **Add Instructions** are revealed by Add More Details. The two-column References table (Reference Type / Reference Value) is pre-seeded with **guided rows for Pickup Number and PO Number** (both shown as fixed-label rows in the Reference Type column), plus a free-form row below them (Screens: 1 Long). Efrain's description of purely two open text columns is partially correct — the UI mixes guided (pre-typed common types) and free-form rows. The add affordance is labeled **"+ Add New Reference Code"** in the Quick view and "+ Add New Reference Code" in the expanded Long view.
7. **Add Instructions** (LINX-8127, LINX-6201). Efrain nests this under General Information and notes the **Instruction Type dropdown was removed from the UI** to avoid confusion — backend defaults the instruction type code to `0012` and only free-text is captured, up to 2,000 chars per line, with "Add New Instruction" for multiple lines (Efrain §General Information). This **conflicts with §3.2's Instruction Type lookup (LINX-6195)** and the model's `instructionType` field — see §10.
8. **Confirmation page** after submit (LINX-9002, LINX-9004).

**Quick → Long is an in-place expansion, not two forms.** The UI opens in a **Quick Order** view showing only the essential fields; clicking **"Add More Details"** expands the *same* form in place into the **Long Order** view, revealing the additional General-Information subsections (and expanded detail in other sections) (Efrain §General Information). This refines §3.6: Quick and Long are two states of one form, not two separate forms.

### 3.2 Master-data lookups (form dropdowns)

Dropdowns are served by `order-service/v1/*` lookups (which internally call master-data / address services). A defining behavior: **list values are frequency-sorted** — most-used-in-prior-orders first, highest to lowest — and most support type-ahead search of 2–3+ characters, case-insensitive, alphanumeric + special chars + spaces (LINX-5999, LINX-6010, LINX-6099, LINX-6131). Catalog: Owning Organization (LINX-6010/6117), Freight Terms — static default "Pre-Paid" (LINX-6012); however Efrain specifies a **dynamic default keyed off Ship Direction: Outbound → Pre-Paid, Inbound → COL (Collect)** (Efrain §General Information) — the richer behavior, supersedes the static default. PRD lists payment terms PPD/COL/3RD with default PPD (PRD 2365915159). Ship Direction — defaults to "Outbound" (LINX-6108, PRD 2365915159), Equipment — searchable, **populated based on the selected Owning Organization** (LINX-6099; Efrain §General Information), Modes (LINX-6056), org-address lookups for Consignor/Consignee city/region/postal/country/address (LINX-6011 through LINX-6015, LINX-6057), Product ID + description (LINX-6024), Ship Class / Ship Class ID (LINX-6025), UoM (LINX-6110), Handling Units (LINX-6111), Reference Codes (LINX-6036), Packing Groups + WGK (LINX-6144, LINX-6162), Country of Origin (LINX-6094), Timezones (LINX-5999), Special Services (LINX-6038), Instruction Type (LINX-6195). See the v1 lookup catalog in [[order-service-api]].

### 3.3 Field-level validation rules (manual)

Captured most precisely in the date/time and product test-case stories — these are the implemented field rules:

- **Date/time format** `MM/DD/YYYY` and `HH:MM`, 24-hour; time defaults to `00:00` and is user-editable; dates may be past/current/future, single-selection, and can be left blank/null (LINX-7629, LINX-7628, LINX-7634).
- **Planning Date Type** is a radio: "Ship Date & Time" or "Delivery Date & Time" (LINX-7586; Efrain §Pickup and Delivery). When **Ship Date** is selected, **Late Pickup Date & Time is mandatory**; when **Delivery Date** is selected, **Late Delivery Date & Time is mandatory** (LINX-7587, LINX-7822; Efrain §Pickup and Delivery). PRD frames this as a **Date Anchor** field — Pickup / Deliver / Both, default Pickup — and states the underlying constraint as **"allow null, but one of Late Pickup or Late Delivery must be present"** (PRD 2365915159). The radio is a stricter UI rendering of the same rule (PRD allows "Both"; the radio does not — see §10).
- **Date ordering** Early Pickup ≤ Late Pickup, and Early Pickup < Late Delivery; violation raises an **error** message (LINX-7799, LINX-7800). Early ≤ Late within the calendar component (LINX-7651, LINX-7584). PRD states the same set plus **Early Delivery ≤ Late Delivery** (PRD 2365915159). Efrain corroborates: Early Pickup on or before Late Pickup, and Pickup before Delivery (Efrain §Pickup and Delivery).
- **Past/current date warning** (not error): "Past or current date selected. Please check and modify as needed" (LINX-7632, LINX-7830, LINX-7805).
- **Timezone** auto-populated as a 3-letter code (DST-aware) from City/Region/Postal/Country; if it can't be derived, user picks from dropdown; if manually set it locks to the selected zone; mismatch shows warning "Time zone selected is not aligned with the Address"; not populated if the date field is empty (LINX-7590, LINX-7588, LINX-7589, LINX-7591, LINX-7666).
- **Order Number** validated inline for uniqueness against owning org via `POST /order-service/v3/order/validation` → 409 `DUPLICATE_ORDER_NUMBER` with message "The Order Number for the selected Owning Organization already exists…" (LINX-9168, LINX-9279; see [[order-service-api]]).
- **Product line rule** Either (Product ID + Description) **OR** (Shipping Class + Shipping Class ID) must be entered; help text "Please select either Product ID or Shipping Class, to proceed…" (LINX-9874, LINX-9877). Shipping Class has 4 options: Product Class, Commodity, Harmonized, NMFC; clearing it clears Shipping Class ID (LINX-9877). Product Description: editable, 1–150 chars excluding spaces; disabled until Product ID chosen (LINX-9876).
- **Weight/Volume** numeric, up to 2 decimals; UoM toggle US (default) / Metric; **TL weight warning** when Equipment = Truckload and gross weight > 19,000 lb (or metric equivalent) (LINX-9878).
- **Order Identifier** (References) alphanumeric + special + space, 1–150 chars (LINX-6161).

### 3.3a Pickup / Delivery section detail (Efrain)

Efrain gives field-level structure the stories lacked. The section splits into **Consignor (pickup)** and **Consignee (delivery)**, structurally mirrored, each with three sub-sections (Efrain §Pickup and Delivery):

1. **Location & Address** — search a **Location ID** to auto-populate address from master data, or enter a new location manually. **Mandatory** (Quick): Location ID, ID / Org Name, Long Name, Address Line 1, City, State/Region, Postal Code, Country. **Optional**: Address Line 2. **Consignor and Consignee addresses (and Location IDs) cannot be identical** — the system flags an error if they match (Efrain §Pickup and Delivery; corroborates the cross-line identity validation in §3.7 from the manual-entry side).
2. **Contact Information** — revealed via "Add Contact Information"; all optional: Contact Name (free text), Contact Number (**E.164 international format**), E-Mail Address (basic `@`/`.` validation) (Efrain §Pickup and Delivery). *(New field-level UX detail — not in the Jira corpus.)*
3. **Planning Date & Time** — the radio + conditional-mandatory rules already in §3.3; **Time Zone** auto-populates from city/state/postal but **becomes a mandatory dropdown when it cannot be derived** (Efrain §Pickup and Delivery; aligns with LINX-7590/7588).

**Address validation rules** (Efrain §Pickup and Delivery, corroborating §3.7): geographic fields **City + State/Region + Postal + Country are validated in combination** — an invalid combination is rejected with a "ship / ship-to address is not valid" error; for integrated orders the **Shipping Site Identifier and Ship To Identifier must be non-blank and match master-data Site IDs**.

### 3.3b Additional Information & References simplification (Efrain)

Within the expanded General Information (Efrain §General Information):

- **Additional Information** sub-section (all optional): **Customer Required Carrier** (SCAC id/description dropdown; user may also type a carrier not in the list), **Equipment Reference Number** (free text, for dedicated container/tank IDs).
- **References** sub-section was **simplified by the business team from multiple specific date/time fields to two open text columns — Reference Type and Reference Number** (Efrain §General Information). Users type the type (e.g. "PO Number", "Pickup Number") and the value, and **add/delete rows dynamically** (trash-can icon). This refines §3.1 #6 and the references model in §2; note the legacy `poNumber`/`poDate` header fields (§2) now map onto generic Reference rows in the UI — **possible model/UI mismatch, flagged in §10**. **Visually verified addendum:** the UI pre-seeds two guided rows — **Pickup Number** and **PO Number** — with fixed labels in the Reference Type column; a third free-form row (editable Reference Type + Reference Value) is also present (Screens: 1 Long). This confirms that PO Number maps onto a guided Reference row rather than a dedicated header date field, partially resolving the legacy `poNumber`/`poDate` mapping question. The References block appears in the Quick form **above** Add More Details; Additional Information and Add Instructions appear **below/inside** it after expansion — correcting the sub-section ordering implied by canon §3.1 (which listed Additional Information first).

### 3.4 Product Information table behavior

Columns: Line #, Product ID, Product Description, Shipping Class, Shipping Class ID, Gross Weight, UoM (Weight), Volume, UoM (Volume), Handling Unit (LINX-9874). "Add Product" appends a row; Line # auto-increments from 1 and **cannot be removed via Manage Column**; no limit on product rows; rows removable; line-level editing (LINX-9874). Manage Column allows **min 6, max 12** columns selected (LINX-6101 — note the story title says "Max-15" but the body says 12; treat 12 as implemented, flagged in §10); reorder and column-width adjustment supported (LINX-6150, LINX-6006). Column choices reset to default on logout/session expiry (LINX-6007).

**The product grid is FULLY BUILT in the running Angular app** (Screens: 4 Product Information, 4 missing-field alert, 4 Product Information 2, 4 Product Information 3, 4 Product Information 4), despite the section header still carrying an "🚧 Under Construction" label and Efrain marking it undescribed (Efrain §Product Information; §10 "Product Information halted"). The live UI shows: a search bar + **US / Metric unit toggle** + sort-direction control in the toolbar; **inline add/edit rows with per-row Save and Cancel** buttons and a **row-expand-to-modal icon** (diagonal arrows, likely surfaces Long product sub-sections — Packaging, Hazmat, etc.); **inline field-level validation** with red error text as-you-type; **per-row three-dot action menus** on saved rows; **roll-up stats on the confirmation page** (Number of Products, Total Product Weight, Total Volume, Hazmat Yes/No); and a **column-management control** (confirmed min-6 floor). Per-row weight and volume also carry **individual UoM selects per cell** (`Lb` / `Cu Ft`), coexisting with the global US/Metric toggle — precedence between the two mechanisms is unspecified. *The section is far more complete in the app than the written spec implies — use the screen captures as the primary behavioral reference for this section.*

**Conflict — required columns vs either/or rule (cross-ref §10).** The empty-state grid header asterisks **Product ID\*, Product Description\*, Gross Weight\*, Volume\*, and Ship Class\*** as all mandatory (Screens: 4 Product Information). This contradicts the either/or rule (LINX-9874): "Either (Product ID + Description) OR (Shipping Class + Shipping Class ID) must be entered." The grid's missing-field alert state marks all five columns as required simultaneously. **Unresolved** whether the asterisks represent the grid's default validation state before the either/or logic fires, or whether the rule has been tightened (see §10).

**Column label inconsistency.** The class column is labeled inconsistently across grid states: **"Ship Class"** in the empty/toolbar state (Screens: 4 Product Information), **"Shipping Class ID \*"** in the missing-field alert edit row (Screens: 4 missing-field alert), and **"Ship Class \*"** in a separate edit-row capture (Screens: 4 Product Information 2). Canon §3.4 models two distinct columns (Shipping Class + Shipping Class ID); the live UI may collapse them to one selectable column whose label drifts by state. See §10.

### 3.4a Special Services section detail (Efrain)

Entirely **optional** — no mandatory fields (Efrain §Special Services). Two parts (Efrain §Special Services):

- **Manage Special Services** — a search bar opens a dropdown with a **tabular list of all available special services / charge codes sorted by frequency of use**; filterable by **Service Category (code) or Description**; click to add to the order.
- **Selected Services (consolidated table)** — chosen services (from the Manage table or Quick Selection chips) populate a consolidated list showing **Service Category (TMS Charge Code)** and **Description (auto-populated from master data — no manual typing)**; remove via a trash-can icon.

Data entry is **entirely master-data-driven**, not free text. Note: this overlaps the unresolved over-fetch issue (the list currently includes non-special-services charge codes) tracked in §10 (LINX-10985/10986).

### 3.5 Draft vs submit semantics

**Auto-save / step-completion model (visually verified — not in any text source).** A persistent yellow info Alert at the top of the create form reads: **"Required fields will complete steps. They are automatically saved"** (Screens: 1 Quick, 1 Long, 2 Pickup/Delivery, 4 Product Information, 5 Special Services). This documents a background auto-save behavior alongside the stepper's auto-completion: filling all required fields in a section marks that section's StepIndicator as complete (green check), and the progress is auto-saved without an explicit user action. This behavior is additive to — not a replacement for — the explicit Save / Save-for-Later / Discard actions below. How auto-save interacts with those explicit actions (e.g., does auto-save bypass the Save precondition? can auto-saved progress be discarded?) is **unresolved** — see §10.

- **In-order actions** while creating (before submission): **Save, Save for Later, Discard** (Long, LINX-9009) and the equivalent in-order actions for Quick (LINX-9010). "Save for Later" persists the order in a **DRAFT** state (LINX-9282). Efrain adds precise modal/button semantics (Efrain §Save, Save for Later & Discard):
  - **Save** — persists progress **without closing the UI** and **without submitting**; order kept in **Draft**.
  - **Save for Later** — reached via the **"Cancel" button**; persists progress, **closes the UI**, order in **Draft**, retrievable from the overview page.
  - **Discard** — also reached via **"Cancel"**; terminates creation **without saving**, gated by a **confirmation screen**; once discarded the order cannot be retrieved.
  - **Save precondition** — both **Order Number** and **Owning Organization** must be filled or neither Save nor Save-for-Later is allowed; a red error prompts for both (Efrain §Save, Save for Later & Discard). *(Note tension with §2/§3.3: Order Number is normally optional and auto-generated when blank, yet Efrain makes it mandatory specifically to Save a draft — flagged in §10.)*
- **Submit** via `POST /order-service/v3/manual-order` — draft → status `DRAFT`; submit → `RD_4_PLNNG` (Ready for Planning) per [[order-service-api]]. The "Create" button is enabled only when all mandatory fields are filled; on success the same screen stays open for edits; "Cancel" clears entered data (LINX-9880).
- **Create response** is a standardized envelope: success → `{orderId, success:true, message:"Your Order created successfully", data:{…}}`; failure → `{orderId:null, success:false, message:"…failed…", data:null}` (LINX-9340). After creation a **confirmation page** shows the mandatory fields captured (LINX-9002, LINX-9347). Efrain details the confirmation page (Efrain §Confirmation Page): it **dynamically matches form complexity** — the **Quick** confirmation summarizes only the mandatory fields across General Information, Pickup/Delivery, Product, Special Services and the final Order Number (provided or system-generated); the **Long** confirmation additionally shows all optional data entered (Additional Information, Add Instructions, References, expanded Pickup/Delivery, Product, Manage Special Services).
- **Asynchronous confirmation case** — when order creation depends on a backend process awaiting external confirmation, the user instead sees an **info message**: "Your Order was saved. You will receive a notification when the Order number have been created" (Efrain §Confirmation Page — Info Message). This is the async path where the Order Number is not available synchronously at submit time. *(New UX state — not in the Jira corpus; relevant to the synchronous-vs-async create contract, §10.)*

### 3.6 Quick vs Long

- **Quick** — concise form, minimum fields to create (LINX-7553 epic). 319 stories, the richest/most-groomed UI source. Efrain: this is the **default view** on opening the form (Efrain §General Information).
- **Long** — superset adding more General-Information fields, full Product sub-sections (Product Details, Packaging, General, Reference Codes, Hazmat), and richer references (LINX-8026 epic, LINX-5995, LINX-5997, LINX-6178). 51 stories — notably **less groomed** than Quick (§10).
- **Relationship (Efrain, load-bearing for the rebuild).** Quick and Long are **not two separate forms** — they are two states of **one form**. The Long view is reached by **"Add More Details"**, an **in-place expansion** of the Quick form that reveals the additional collapsible subsections (Efrain §General Information). Build as a single progressive-disclosure form, not two routes. *(This corrects the implicit "two forms" reading of the epic split.)*

### 3.7 Integrated (ERP/EDI inbound via Boomi)

Inbound flow: **Customer ERP XML → Boomi (Bhoomi) → JSON conforming to the LINX Order contract → OrderInterface/OrderIn JSON → validation → order creation; LINX emits OrderOut JSON, which is transformed back to customer-ERP JSON for view/edit** (LINX-8182, LINX-8183, LINX-8184, LINX-9344). Validation only runs for the O2 process: Boomi tags `Order.SourceSystem = O2`; when `SourceSystem` is null the legacy-TMS path is unchanged (no pre-create validation) (LINX-7552 epic notes). PRD confirms the source: customer integrates from **either their ERP or the Odyssey Customer Portal, in both cases through Boomi**, ideally over **API or HTTP POST**, and a successful integration creates a record equivalent to the manual create process (PRD 2370174978).

**Location & Item data-supply strategies** (PRD 2370174978): the customer may send Locations and Items either as (a) **Primary Key only** — the PK references item/location detail already stored from a prior upload — or (b) **Insert / Update** — the full data set is sent each transaction and inserted/updated in the DB. Header and line detail plus location info for Origin, Destination and Involved Parties (Bill To, etc.) are the key elements (PRD 2370174978).

**Integration update/cancel matching** (PRD 2370174978): an order interface may be a **new order, an update, or a cancellation**. Updates process against the existing order — "the TMS should know what data elements changed" — and the order is **matched by part of the Order ID sent, or by a customer-unique reference field on the order**. A **cancellation may carry only the Order ID + a status of canceled**, which drives the order status so downstream shipment workflow is triggered. This corroborates the delete-flag semantics in §4.

**Validation field classes** (used to decide pass/fallout) (LINX-6033/8064 mandatory; LINX-6049/8066 conditional; LINX-5987/8067 additional/extended; LINX-6009/8068 location):

- **Mandatory** — e.g. Owning Organization, delete flag, order identifier, planning date type, freight terms, packaging/gross-weight/load-constraints, ship-site/ship-to/ship-item identifiers, instruction number/type (LINX-6033, LINX-6132, LINX-6153, LINX-6154, LINX-6179, LINX-6098).
- **Conditional** — Ship To and Shipper address lines/city/region/postal/country; requested ship/delivery dates (LINX-6031, LINX-6051).
- **Additional/extended** — hazmat, measurement, seller/buyer/bill-to fields, third-party references, appointments (LINX-5978, LINX-5980, LINX-6113, LINX-6114, LINX-6115).
- **Location** — Country/Region/City/Postal validated **in combination, not individually**; handles same-postal-different-cities and multi-result cases (LINX-5989, LINX-5990, LINX-5979, LINX-5983). Address validation runs in `address-service/v1/validation`, not order-service ([[order-service-api]]).

**Cross-line consistency rules** enforced before saving to LINX: Shipper & Ship-To address elements must be **identical across all order lines** (else fail); weight/volume/package-count must match exactly between line and schedule (else reject); single schedule per order line; all measurements converted to SI units before processing (LINX-8849, LINX-8850, LINX-8847, LINX-8848). These mirror validations TMS used to perform pre-dispatch.

Validation failures generate `order_exception_detail` records (LINX-6050) and route the order to a **Failure Queue** for UI review (§7). Integrated create/edit/hold/cancel uses `POST /order-service/v3/order` with the `orderInterface{}` wrapper, toggling `deleteFlag`/`orderHoldStatus` ([[order-service-api]]).

---

## 4. Order lifecycle & statuses

In-scope statuses (LINX-7555 epic):

| Status | Meaning | Code (where known) |
|---|---|---|
| ~~New~~ | Omitted — all new orders go directly to Ready for Planning | `order_status_id = 3` for integrated (LINX-7593) |
| **Ready for Planning** | Order received/created and ready to plan | `RD_4_PLNNG` ([[order-service-api]], LINX-8049) |
| **Planned Load** | Order is part of a planned load | — |
| **Planning Failed** | Part of a load that failed planning | — |
| **Planned Shipment** | Part of a planned shipment | — |
| **Shipment Failed** | Part of a shipment in failed status | — |
| **Hold** | Entire order paused (integration or user) | — |
| **Cancelled** | Entire order cancelled (integration or user) | `order_status_id = 2` (LINX-7593) |
| **Draft** | Manual order saved but not submitted | `DRAFT` (LINX-9282) |

**Transition rules:**
- **New → Ready for Planning** is automatic on first receipt; the "New" status is intentionally skipped (LINX-7555, LINX-8049).
- Statuses update **automatically** based on actions at order level or shipment level, for both manual and integrated orders (LINX-6081, LINX-6001). Shipment-domain status changes propagate back to order status (LINX-7945 — *Canceled story; behavior tracked under LINX-6001/6081*; flagged §10).
- **Hold** — allowed only from valid, active (non-terminal) states; system persists the **previous valid status**; rejected if already on Hold; no downstream processing while held. Planned Load and Planned Shipment can both go to Hold (LINX-8921, LINX-8060).
- **Release from Hold** — available only for orders in Hold; resumes workflow from the **exact previous valid status**; fails with a meaningful error if no previous status found (LINX-8920).
- **Cancelled** — can occur from any of the other lifecycle statuses; cancelled orders are null and void, cannot be reinstated/reprocessed, and allow no further modification (LINX-8051). Restore exists as a separate action (see §6).
- **Editing lifecycle** — how status behaves during edits is defined separately and still in Analysis (LINX-11185).

Integrated-order delete-flag semantics: `deleteFlag = Y` ⇒ cancel; `deleteFlag = N` ⇒ create or update (multiple updates allowed); a cancelled integrated order cannot be deleted again (LINX-7581, LINX-7582, LINX-7604, LINX-7607, LINX-7609).

---

## 5. Order Overview screen

The Order Overview / Summary page is the **landing page** for the Orders left-nav item — a one-page snapshot of all orders, key info, and next action (LINX-9896, LINX-10801).

- **Tabs** (LINX-10806): successfully created orders (integrated + manual), plus a **Data Validation Errors** tab and a **Technical Errors** tab, each badge-counted (LINX-11180, LINX-11181). The error tabs are the fallout/exception surface (§7). **Tab-set conflict with the live UI (cross-ref §10).** The Angular app shows a different four-tab row: **All · Saved · Canceled · Interface Failures** (Screens: 0 Summary Page). "Saved" is a status-filter tab surfacing Draft orders (§3.5 DRAFT status, §4); "Canceled" is a status-filter tab (§4); "Interface Failures" appears to **collapse the two story-specified error tabs (Data Validation Errors + Technical Errors) into a single tab**. It is unresolved whether the stories represent the target design or a superseded design, and whether "Interface Failures" is the implemented version of one or both error tabs. The "Saved `4`" badge confirms badge-counting is present. See §10.
- **Columns** (from the CSV-export default set, which matches the grid) (LINX-11165): Order Number, Order Source, Customer, Ship Direction, Freight Terms, Equipment, Consignor Location ID, Origin City/State/Country, Earliest & Latest Pickup Date/Time, Consignee Location ID, Destination City/State/Country, Earliest & Latest Delivery Date/Time, Gross Weight (value+UoM), Volume (value+UoM), Commodity, Order Status. **Order ID column should display the Order Number when present** (not the LINX-generated id) (LINX-11013).
- **Data source** `POST /order-service/v3/order/list` — paged; returns compact role-nested grid rows (distinct from the flat `/order/view` detail) ([[order-service-api]], LINX-10777).
- **Filters** — Basic: Order Number, Order Status, Customer (multi-select; AND across fields, OR within a field) (LINX-10798, LINX-10809). Plus Origin/Destination City/State/Country and Pickup/Delivery date-range (LINX-10799). Advanced: Order Source, Ship Direction, Freight Terms, Equipment, Consignor/Consignee Location ID, Commodity, Gross Weight, Volume (LINX-10802, LINX-10803, LINX-10805, LINX-10810).
- **Manage Columns** — show/hide and reorder columns (LINX-10300, status *Ready for Grooming*).
- **Custom Views** — per-customer saved combinations of column visibility, order, and filters; create/edit/delete views; persisted in a DB table (LINX-10788, LINX-10814, LINX-10825, LINX-10838, LINX-11149).
- **Export to CSV** — exports the current filtered/sorted view via `POST /order-service/v3/order/export/csv` (LINX-10804, LINX-11165).
- **Order Actions column** — the last column; per-row actions (Edit, Cancel/Restore, Copy, Delete) plus View Order (§6) (LINX-10233, LINX-10811).
- **Post-creation order actions** also include: create a new shipment and add the order to it; assign the order to an existing shipment; remove the order from a shipment — the remove action is allowed only when the shipment is **not** in "Tendered" status (LINX-6135).

---

## 6. Order actions

Per-row/detail actions exposed from the Order Actions column and the Order detail view.

- **View Order** — opens full order detail via `POST /order-service/v3/order/view` ({orderNumber, customerId}); returns the flat `manualOrder{}` (LINX-10233, LINX-10700, LINX-10811). Detail page enriches Special Services and Mode/Equipment descriptions via master-service calls (LINX-11163, LINX-9741).
- **Edit** — modify order details with business-rule validation that classifies changes as **minor vs major**; updates propagate downstream when necessary; integrated orders are converted to the manual-order shape for view/edit (LINX-10248, LINX-7556 epic, LINX-9344). PRD precondition: the user may **update any information on the order *except the Customer*** (PRD 2365915159). PRD also flags **status restrictions on edit as an open confirm** ("Confirm any status restrictions?") — aligns with the editing-lifecycle gap in §4 (LINX-11185) and §10. **Underspecced — still in Architecture/Tech Design.**
- **Cancel / Restore** — Cancel via `POST /order-service/v3/order/cancel` and Restore via `/order/restore` ({orderNumber, customerId}); both push updates to Shipment and NN Kinesis (LINX-10258, LINX-10795, LINX-10796). Cancelling a non-existent order returns a (to-be-reworded) error (LINX-10683). **Cancel/Restore UI still in Architecture/Tech Design.**
- **Delete** — delete a manually created order subject to conditions; legacy BE endpoint `DELETE /order-service/v1/order/{orderId}` exists (LINX-6055), but the **delete UI story LINX-10300 referenced by the LLD task LINX-10922 is missing from the dump** — LINX-10300 in the actual data is "Manage Columns," not delete (§10). PRD gives the governing precondition: **a user may delete an order as long as it is not on a Shipment** (PRD 2365915159). **Delete UI essentially unspecced beyond this precondition.**
- **Copy** — copies an existing order, **dropping** date fields (pickup/delivery) while **retaining** reusable fields (origin, destination, move direction, payment terms); useful for recurring orders; copied orders behave like any other order (LINX-7554, LINX-10259). **Still in Architecture/Tech Design.**
- **Hold / Release from Hold** — see §4 (LINX-8921, LINX-8920).
- **Bulk status change** — multi-select rows in the grid drive `PATCH /order-service/v3/order-status` ([[order-service-api]]). (Bulk UI not detailed in a functional story; inferred from the API surface — §10.)

> Edit, Cancel, and Delete UI stories are all in **Architecture/Tech Design** with lean specs — flag as underspecced for the rebuild (LINX-10248, LINX-10258, LINX-7556).

---

## 7. Integrated order fallout / failure review

When an integrated (O2) order fails validation, it does not create cleanly — it is held for human review.

- **Order Interface Failure (OIF) UI** — the screen where interface errors are surfaced, fixed, re-validated, and the order re-sent for re-processing. Error categories: missing mandatory fields (e.g. Owning Organization), invalid data type (e.g. a character in a phone number), or invalid data (not matching TMS master) (LINX-11137, status *Analysis*). PRD corroborates and gives the intent: provide **non-technical users** the ability to **review integrations that did not successfully write to the order table** (data-integrity or missing-required-field failures), **make edits to resolve** the issues in a UI, and on completion **let order creation and workflow commence** (PRD 2370174978).
- **Key contrast** Manual orders are validated **as fields are entered**; integrated-order errors are resolved **after the fact in the OIF UI** (LINX-11137).
- **Two error surfaces on the Overview page**: a **Data Validation Errors** tab (integrated orders only, with count) and a **Technical Errors** tab (integrated + manual; message-processing, server, and integration failures, with count) backed by `/order/validation-error/list` and `/order/technical-error/list` (LINX-11180, LINX-11181).
- **Persistence** failures are stored as `order_exception_detail` rows; the full inbound payload is staged in `Order_Staging` for auditing/debugging/async processing (LINX-6050, LINX-8429). Failed QCP/QCA calls are persisted to a reprocessing table with a scheduler-driven retry (LINX-8724, LINX-8725).

---

## 8. Audit trail

Per LINX-7958 (the mature, Approved audit epic; the older LINX-7939 is empty — §10).

- **Scope of events** Order Actions = Order Creation, Order Editing; Order Events = Lifecycle Status Change, Applied on Hold, Released from Hold, Cancellation (LINX-7958 epic).
- **Nature** un-editable, non-deletable, append-only, **reverse-chronological** (most recent first), system-generated; available regardless of whether the order came from UI, Legacy TMS, LINX, or customer ERP (LINX-8091).
- **Granularity** captured at **order level** (LINX-8091) and at **line-item level** (LINX-9128).
- **What it records** what changed (field path, old value → new value), who (User/System/Process — user email captured in CreatedBy/UpdatedBy via User-Management API), and when (timestamp) (LINX-7939 epic, LINX-9784, LINX-9730, LINX-8458). Field-level diffs are computed by a JSON-comparison component over old/new order JSON, producing added/removed/modified maps with dotted field paths, e.g. `order.orderStatus.orderStatusCode` (LINX-9730).
- **History UI** an Audit Trail tab on the order detail, served by `POST /order-service/v3/audit-report` (paged: field, oldValue, newValue, changeMadeBy) — single-line and multi-line variants (LINX-10812, LINX-10815, [[order-service-api]], LINX-8457).

---

## 9. Cross-domain touchpoints

- **Shipments (writes).** On order create/update the order produces a **Load** (LINX-7906) and emits an **OrderOut** message to the `order-events-to-shipment` Kinesis stream (LINX-8800). Status updates also publish to **NN-Kinesis** (LINX-9611). Order edits propagate to Shipments only under shipment-status rules — to be defined with Jana (LINX-6062, LINX-11185). No order updates after **PGI/PGR** (LINX-6062). Removing an order from a shipment is blocked when the shipment is **Tendered** (LINX-6135).
- **Shipments (reads/derives).** `isConsolidateable` is derived at the header from line `isLoadConstraints` to feed consolidation eligibility (LINX-9473).
- **Carriers / Rating (QCP & QCA).** On create/edit, Order domain calls **QCP Routing** for the first routing option's preferred carrier + Direct AP/Buy cost, then a **QCA Rating** call for the AR/Sell cost, and sends the order with both costs to Shipments (LINX-8101, LINX-8100 for manual; LINX-9020, LINX-9021 for integrated). Failed calls go to the reprocess table (LINX-8724).
- **User Management.** Order Service consumes the User-Management API to resolve the acting user's email for audit CreatedBy/UpdatedBy (LINX-8458, LINX-9784).
- **Master data / Address / Product services.** Form dropdowns and integrated validation resolve through master-data, address-validation, and product services behind the order-service v1 lookups (§3.2, [[order-service-api]]).
- **Move / NN integration — batch → event-based (backend dependency).** The Move-to-TMS integration is migrating **from batch to event-driven**: order **create / update / cancel-or-delete in Move** must trigger **published events** identifying the event type and the impacted order data, so downstream processes fire on occurrence rather than on a batch poll (PRD 2453340164). This is a backend/infra dependency that shapes the order-events stream feeding Shipments (§9 writes) and NN-Kinesis; the React UI does not consume it directly but its timing/eventual-consistency affects the **async confirmation case** (§3.5). Author: Steve O'Hara. *(Future/in-flight — confirm current state.)*

---

## 10. Open questions & gaps

- **Edit / Cancel / Delete UI underspecced.** LINX-10248 (Edit), LINX-10258 (Cancel/Restore) sit in Architecture/Tech Design with thin functional bodies; their BE APIs exist but the UI flows, confirmation modals, and minor-vs-major change rules are not fully written (LINX-10922 LLD task still In Development).
- **Missing delete story.** The LLD task LINX-10922 references "LINX-10300" as the delete story, but LINX-10300 in this dump is **Manage Columns**. The actual integrated/manual delete UI story is not present — delete behavior is only covered by the legacy BE endpoint (LINX-6055). Confirm the correct delete story key with the team.
- **Empty epics** LINX-7939 (Order Audit Trail) and LINX-448 (cutoff + update-history UI) and LINX-5943 (Orders Capability umbrella) have rich descriptions but **zero child stories** in Jira; LINX-448's "reaching cut-off" view is not specced anywhere in the children (note for the rebuild — likely future scope).
- **Long Orders less groomed than Quick** 51 vs 319 stories; many Long product sub-section stories (LINX-8131–8135) are still in "New" with only the user-story line and no AC. Treat Quick as the authoritative form spec and extrapolate Long.
- **Manage Column count conflict** LINX-6101 title says "Min 6, Max-15" but the body says "minimum 6 and maximum 12 columns." Resolve max (12 assumed implemented).
- **Status-propagation story canceled** LINX-7945 ("Status Changes in Shipments Affecting Order Statuses") is Canceled though tagged Approved; the behavior is presumed folded into LINX-6001/6081. Confirm there is no lost requirement.
- **Special Services over-fetch** Current logic fetches all charge codes including non-special-services (e.g. "Not Company Bill," "Lumper," detention codes); a logic to display/search only order-relevant special services is a placeholder, not built (LINX-10985 Quick, LINX-10986 Long).
- **Bulk actions UI** the `PATCH /order-status` bulk endpoint implies grid multi-select bulk status change, but no functional UI story details it (inferred).
- **Order Upload / Templates** "Order Upload from a template" (LINX-5984) and "Order Creation Template" save/recall (LINX-6002) are Todo, unspecced — future scope.
- **Open known defects** location-dropdown lookups (postal/city/state/space-prefix) inconsistent (LINX-11155, LINX-11156, LINX-11157, LINX-10246); Owning Organization dropdown rendering `[object Object]` (LINX-10808, LINX-10771) and substring-match bug (LINX-9702); instruction description not persisted (LINX-11151). Carry these as known issues to fix in the rebuild, not to replicate.

### Conflicts & gaps surfaced by the Efrain + PRD merge (2026-06-10)

- **Consolidatable — derived flag vs user checkbox.** §2 model derives `isConsolidateable` from line `isLoadConstraints` (LINX-9473); Efrain makes it a **user-facing checkbox, checked by default**, in General Information (Efrain §General Information). **Unresolved:** does the checkbox set the header flag directly, or does the line-derived value override the user choice? Owner: Ramesh/Priya.
- **Instruction Type — lookup vs removed from UI.** §3.2 lists an Instruction Type lookup (LINX-6195) and §2 has `instructionType`; Efrain says the **Instruction Type dropdown was removed from the UI** and the backend defaults the code to `0012`, capturing free text only (Efrain §General Information). **Unresolved** whether the field is dead in the data model or just hidden in the UI. Owner: Efrain/Ramesh. *(Kept side-by-side.)*
- **Freight Term default — static vs dynamic.** §3.2 static "Pre-Paid" (LINX-6012) vs Efrain's dynamic Outbound→Pre-Paid / Inbound→COL (Efrain §General Information). Treat dynamic as the implemented behavior; confirm. *(Resolved in favor of Efrain, flagged for confirmation.)*
- **Order Number — optional/auto-generated vs mandatory-to-save.** §2/§3.3 say Order Number is optional and auto-generated when blank; Efrain makes **Order Number (with Owning Organization) mandatory specifically to Save / Save-for-Later a draft** (Efrain §Save…). **Unresolved:** is Order Number required only for the draft path, or has the rule tightened generally? Owner: Ramesh.
- **Date Anchor — radio (Ship/Delivery) vs PRD's three-way (Pickup/Deliver/Both).** §3.3 radio offers two options; PRD's Date Anchor allows **Pickup / Deliver / Both** (PRD 2365915159). The "Both" case has no UI rendering in the stories/Efrain. **Unresolved.** Owner: David/Ramesh.
- **References — header `poNumber`/`poDate` vs generic two-column UI.** §2 model carries `poNumber`/`poDate`; Efrain's References UI is two open text columns (Reference Type / Reference Number) with the date fields removed (Efrain §General Information). **Unresolved** how legacy PO fields map onto generic reference rows. Owner: Efrain/Ramesh.
- **Synchronous vs asynchronous create.** Efrain documents an **async confirmation** ("you will receive a notification when the Order number have been created", Efrain §Confirmation Page) alongside the synchronous create envelope (LINX-9340). The condition that triggers async, and whether the React form must poll/subscribe, is unspecified — interacts with the batch→event migration (PRD 2453340164). Owner: Ramesh.
- **Product Information halted.** Efrain explicitly marks the Product Information section **"Under Construction"** and provided no description (Efrain §Product Information); the Long product sub-sections were already the least-groomed Jira slice. Product remains the weakest-specced create surface. Owner: Efrain.
- **Synthetic orders (CX Platform) — undescribed mechanics.** PRD introduces a synthetic order as "a copy of the shipment the customer shared" (PRD 2366406657) but does not specify its `sourceApplication` value, which fields are copied, or how it differs from a manual/integrated order on the Overview grid. New concept, unmodeled. Owner: David.
- **TEMPLATE=Y future order mode.** PRD future scope: when `TEMPLATE = Y`, **required fields are no longer required, the order cannot be planned, and it is hidden from user screens** (PRD 2365915159). Pairs with the existing Order Upload/Templates future items (LINX-5984/6002). Out of v1 scope; carry as a future mode. Owner: David.
- **Remove Origin/Destination from Order Lines (future).** PRD plans to drop line-level Origin/Destination once header propagation is the source of truth (PRD 2365915159). Future data-model change — confirm sequencing with the line model in §2. Owner: David/Ramesh.
- **Contact Information fields not in Jira corpus.** Efrain's Contact Name / Number (E.164) / Email (basic validation) sub-section under Pickup/Delivery (Efrain §Pickup and Delivery) has no backing Jira story in the dump — confirm these map to involved-party/instruction fields or a new collection. Owner: Ramesh.

### Surfaced by the screenshots correlation (2026-06-10)

- **(a) Overview tab-set conflict.** Stories (LINX-10806, LINX-11180, LINX-11181) specify three tabs: *successfully created orders*, *Data Validation Errors*, and *Technical Errors*. The live Angular app shows **All · Saved · Canceled · Interface Failures** — four tabs, two of which are status filters (Saved = Draft, Canceled) and one of which ("Interface Failures") appears to consolidate both error tabs (Screens: 0 Summary Page). Unresolved which is current vs target; the §7 two-error-surface model may be superseded. Owner: Ramesh/Priya.
- **(b) Product grid required-columns conflict + label drift.** The live product grid asterisks **Product ID, Description, Gross Weight, Volume, and Ship Class** as all required simultaneously (Screens: 4 Product Information, 4 missing-field alert). This contradicts LINX-9874's either/or rule (Product ID + Description OR Shipping Class + Shipping Class ID). Additionally, the class column label drifts across UI states: "Ship Class" (empty state), "Shipping Class ID \*" (edit-row missing-field state), "Ship Class \*" (edit-row alternate state) — canon's two-column model may be collapsed to one in the UI. Owner: Ramesh.
- **(c) Undocumented auto-save / step-completion model.** A persistent yellow Alert reads "Required fields will complete steps. They are automatically saved" (Screens: 1 Quick, 1 Long, 2, 4, 5). No Jira story, Efrain description, or PRD page describes this behavior. How it interacts with the explicit Save / Save-for-Later / Discard actions — and whether the Save precondition (Order Number + Owning Organization, Efrain §Save) can be bypassed by auto-save — is unspecified. Owner: Ramesh/Efrain.
- **(d) Confirmation header "Shipment Mode: Ground" — derivation unknown.** The Quick confirmation header strip displays **Shipment Mode `Ground`** (Screens: 6 Confirmation Page Quick). Mode is a Long-only field (§3.1 #1) and is never shown in the captured Quick create form. Where the confirmation derives this value (Equipment mapping? backend default? Mode carried silently in the Quick form?) is unspecified. Owner: Ramesh.
- **(e) Confirmation label drift.** The confirmation header strip uses **"Payment terms"** for the Freight Term field (§3.2 / §2 model field), and the Long confirmation labels the Contact Name field as **"Contact Name (Alternate City)"** — an odd parenthetical that hints the field may map onto an existing party/address field rather than a dedicated contact collection (Screens: 6 Confirmation Page Long). Both are likely label defects or repurposed field labels; the second informs the open question about where Contact Information fields live in the data model (§10 "Contact Information fields not in Jira corpus"). Owner: Ramesh/Efrain.

> AI-generated synthesis from Jira intake. Validate against Jana / the Orders team (and the Order Service LLD on Confluence) before building. Status: draft.
