---
domain: orders
type: reference
tags: [orders, screenshots, ui-reference, angular-legacy]
date: 2026-06-10
status: active
source: "18 Angular UI captures, dropped 2026-06-10; correlated vs domain-analysis + Efrain + section-map"
---

# Orders — Screens Reference (Angular legacy UI)

> Visual ground truth of the **already-built Angular Orders capability** in OdysseyONE, correlated against the synthesized canon. The React rebuild specs from the canon; these screens are the as-implemented reality the canon must agree with. Each H2 lists what the screen shows, its canon coordinates ([[10-domains/orders/section-map|section-map]] row, [[10-domains/orders/domain-analysis|domain-analysis]] §, Efrain §), **Confirms** (canon now visually verified), **Discrepancies** (image contradicts or exceeds canon), and **Component mapping** (have / gaps). A consolidated gap list closes the note.
>
> Open-question answers found in these screens are tagged inline as **[Answers Qn]** and cross-referenced in [[10-domains/orders/open-questions|open-questions]].

---

## 0. Order / Summary Page (Overview grid)

![[0. Order _ Summary Page.jpg]]

**Shows.** The Orders landing page. PageHeader "Orders" + primary **Create Order** button (top-right, dark, plus icon). Tab row: **All · Saved `4` · Canceled · Interface Failures**. Below: "4509 items" count, a sort-direction icon button, and a **Filters** button (right-aligned). Virtualized table with a select-all header checkbox + per-row checkboxes; columns: **ID** (blue link, e.g. `SUT355123`), Customer (`SABIC_CLT`), Origin (`RGC: St Louis, MO`), Destination, Weight (`4300 lbs`), Volume (`730 cbf`), Commodity (`Plastic`), Equipment (`TL/TTR/PTL/FTL/LTL`), Early P… (truncated date), **Action** (three-dot menu per row). Full umbrella chrome: sidebar (Orders icon active), navbar with GlobalSearch + Filter `6` badge + user EntityChip "Amy Cook / Admin".

**Canon correlation.** section-map row 1 (Overview grid) + row 2 (filters) + row 3 (error tabs); analysis §5 (Order Overview), §4 (statuses); Efrain §0 (explicitly left pending — "Efra didn't made a writing about this").

**Confirms.**
- Overview is the landing page with a grid + per-row actions column (§5).
- Tabs exist and are badge-counted (§5: "each badge-counted"). "Saved `4`" badge present.
- Default Admin role shown in user chip (§1, LINX-7868).
- Order ID column shows an order-number-like value as a link (§5: "Order ID column should display the Order Number when present", LINX-11013).

**Discrepancies.**
- **Tab labels differ from canon.** Canon §5 names the tabs *"successfully created orders + Data Validation Errors + Technical Errors"*. The UI shows **All · Saved · Canceled · Interface Failures** — four tabs, not three. "Saved" (= Draft orders, §3.5) and "Canceled" (§4 status) are **status-filter tabs the canon never listed as Overview tabs**; "Interface Failures" appears to **collapse the two error surfaces (Data Validation + Technical) into one tab**. → revise section-map row 3 and analysis §5. **[partially Answers Q-tabs / relates to error-surface model in §7]**
- **Column set differs / is reordered.** UI columns: ID, Customer, Origin, Destination, Weight, Volume, Commodity, Equipment, Early Pickup, Action. Canon §5 lists a much longer default set (Order Source, Freight Terms, Consignor/Consignee Location ID, Latest dates, Ship Direction, Order Status…). The visible grid is a **leaner default** than the CSV-export column set the canon equates it to (LINX-11165). → note that grid default ≠ export default.
- **Origin/Destination rendered as `CODE: City, ST`** (`RGC: St Louis, MO`) — a location-code prefix the canon's column list ("Origin City/State/Country") doesn't mention. The code is the Consignor/Consignee Location ID folded into the Origin cell.
- **No visible Order Status column** in the captured viewport (may be off-screen right, past "Early P…"); status is instead surfaced via the tab structure.
- Two **sort/filter affordances** ("sort icon" + "Filters" button) plus the navbar Filter `6` badge — three filter entry points; canon describes filters generically (§5) without this triple-surface layout.

**Component mapping.**
- *Have:* PageHeader, Button (Create Order = primary w/ leftIcon), PillTab (tab row), Badge (tab counts), FilterButton / Button (Filters), IconButton (sort, three-dot), Checkbox (row + header select), Navbar + GlobalSearch + EntityChip + Sidebar (chrome), Button/link (ID cell).
- *Gaps:* **virtualized data-grid** with row-selection + sticky header + horizontal scroll (Shipments app has a grid pattern, not yet in @odyssey/ui); **row-action three-dot MenuDropdown trigger inside a grid cell** (MenuDropdown exists; grid-cell trigger pattern not normalized); **"items" count + sort-direction toggle** row toolbar.

---

## 1. Create New Order — General Information (Quick Creation)

![[1. Create New Manual Order - General Information  - Quick Creation.jpg]]

**Shows.** The create form's default (Quick) state. Breadcrumb **Orders › Create new order**. PageHeader "Create New Order" + **Expand All** link (right). A **yellow info Alert**: "Required fields will complete steps. They are automatically saved" (dismissible X). Below, an **Accordion of 4 step-sections** each with a circular **StepIndicator** (grey check) on the left rail: **General Information** (expanded) · Pickup and Delivery · **Product Information – 🚧 Under Construction** · Special Services (Optional). General Information fields: **Order Number** (`Enter an ID`, no asterisk), **Owning Organization \*** (search dropdown), **Equipment \*** (search dropdown), **Freight Term \*** (= `Pre-Paid`), **Ship Direction \*** (= `Outbound`), **Consolidatable** checkbox (**checked**). A **References** sub-block with **+ Add New Reference Code** link. **Add More Details ^** toggle (collapsed-extra state). Chrome: navbar shows **Save for Later** button + help (?) + close (X) instead of search-active state. Footer bar: **Cancel** (left); **Save** + **Create Order** (disabled, right).

**Canon correlation.** section-map row 7 (create form, Quick); analysis §3.1, §3.2, §3.6, §3.3b; Efrain §1 (General Information).

**Confirms.**
- Quick is the default view; "Add More Details" expands in place (§3.6, Efrain). ✓
- Order Number is **optional / no asterisk** (§2, §3.3, LINX-9742). **[Answers Q16 — at field-entry level Order Number is NOT mandatory; the mandatory-to-save rule (Efrain) is a separate Save-gate, see screen 3]**
- Owning Organization, Equipment, Freight Term, Ship Direction all **required (asterisk)** (§3.1). ✓
- Freight Term default **Pre-Paid** with Ship Direction **Outbound** (§3.2). **[Answers Q20 — confirms Outbound→Pre-Paid leg of the dynamic default; Inbound→COL not visible here]**
- **Consolidatable is a user-facing checkbox, checked by default** (Efrain). **[Answers Q15 — confirms it renders as a checked checkbox in General Information; whether it overrides the line-derived flag still open]**
- Four accordion sections with the exact titles/descriptions Efrain + analysis predicted; Product Information carries the **🚧 Under Construction** label (Efrain §4). ✓

**Discrepancies.**
- **References appears in the Quick (collapsed) view, ABOVE "Add More Details".** Canon §3.1/§3.3b nests References *inside* the Long expansion (under General Information, revealed by Add More Details). The screen shows a **References block with "+ Add New Reference Code" already present in Quick**, with Add More Details *below* it. → References is **not gated behind Add More Details**; only Additional Information + Add Instructions are. Revise §3.1 #6 / §3.3b nesting claim.
- **Auto-save messaging.** The yellow Alert states fields are "automatically saved" and "Required fields will complete steps" — an **auto-save + step-completion model** the canon's draft/save semantics (§3.5) never describes (canon frames Save/Save-for-Later as explicit user actions). → add auto-save behavior to §3.5.
- **"Expand All" control** (top-right) — accordion bulk-expand affordance not in canon.
- Link label is **"Add New Reference Code"** (not "Add Reference" / "Reference Type+Number" as Efrain's two-column description implies the add affordance).
- Section left-rail uses **StepIndicator + connector line** (a vertical stepper visual), confirming a stepper metaphor the canon only implies via "complete steps."

**Component mapping.**
- *Have:* PageHeader, Button (Save for Later, Cancel, Save, Create Order; link variant for Add More Details / Add New Reference Code / Expand All), Alert (yellow info, dismissible), Accordion (section container), StepIndicator (section status circle), FormField (Order Number), FieldSelect (Owning Org, Equipment, Freight Term, Ship Direction), Checkbox (Consolidatable), Navbar.
- *Gaps:* **multi-section accordion-stepper hybrid** (Accordion + StepIndicator composed with a connecting rail + auto-complete state — not yet a normalized organism); **typeahead search-select with async master-data + frequency sort** (FieldSelect is static-option; this needs an async searchable variant); **dynamic add/delete reference rows** (repeatable row group); **form footer action bar** (sticky Cancel / Save / Create Order).

---

## 1. Create New Order — General Information (Long Creation)

![[1. Create New Manual Order -General Information - Long Creation.jpg]]

**Shows.** Same form with **Add More Details** expanded. Top half = Quick fields (identical). The **References** block is now **fully expanded into a two-column table**: header **Reference Type / Reference Value**, prefilled rows **Pickup Number** → `Enter a Pickup Number`, **PO Number** → `Enter a PO Number`, plus an empty editable row (`Enter Reference Type` / `Enter Reference Value`), each row with a **trash-can delete icon**; **+ Add New Reference Code** link below. Then **Add More Details ^** (now expanded) revealing **Additional Information** (Customer Required Carrier dropdown `Select a Carrier`; Equipment Reference Number `Enter the Equipment Numbers`) and **Add Instructions** — a table with **# / Instruction Description** columns, two Lorem-ipsum rows + an empty `Provide instruction details` row, each with a trash-can icon, and **+ Add New Instruction** link.

**Canon correlation.** section-map row 7/8 (Long expansion); analysis §3.1, §3.3b; Efrain §1 (Additional Information, Add Instructions, References sub-sections).

**Confirms.**
- References = **two open text columns, Reference Type + Reference Number/Value**, dynamic add/delete rows with trash-can icon (Efrain §1, §3.3b). ✓
- Additional Information = **Customer Required Carrier (SCAC dropdown, type-ahead) + Equipment Reference Number (free text)** (Efrain §1, §3.3b). ✓
- Add Instructions = **free-text Instruction Description rows, no Instruction Type dropdown, "Add New Instruction" for multiple** (Efrain §1). **[Answers Q19 — Instruction Type is NOT rendered in the UI; only free-text description; field is hidden at minimum]**
- All Additional Info / Instructions / References fields are **optional** (no asterisks) (Efrain). ✓

**Discrepancies.**
- **Reference rows are pre-seeded** with **Pickup Number** and **PO Number** as fixed-label rows (Reference Type column shows them as labels, not editable text in those two rows) while a third row is fully free-text. Efrain describes References as *purely* two open text columns; the UI **pre-populates common reference types as guided rows**. → refine §3.3b: References UI mixes guided (PO/Pickup) + free-form rows. Bears on **Q21** (how legacy `poNumber`/`poDate` map) — **[informs Q21: PO Number is a guided reference row, no separate date field]**.
- **Ordering within General Information:** References sits **above** Add More Details; Additional Information + Add Instructions sit **below/inside** it. So the section's real order is: core fields → References → [Add More Details] → Additional Information → Add Instructions. Canon §3.1 lists Additional Information first among the three sub-sections. → correct sub-section ordering.
- Instruction Description rows are numbered (#) like a mini-grid — a repeatable numbered-row pattern.

**Component mapping.**
- *Have:* same as Quick + FieldSelect (Customer Required Carrier), FormField (Equipment Reference Number, reference/instruction text inputs), IconButton (trash delete), Button/link (Add New Reference Code, Add New Instruction).
- *Gaps:* **editable two-column repeatable-row table** (Reference Type/Value + Instruction rows) with per-row delete and "add row" affordance — a **mini editable-grid / repeatable-field-array** component, unnormalized; **combobox that allows free-typed values not in the list** (Customer Required Carrier "type a carrier not in the list").

---

## 2. Create Manual Order — Pickup and Delivery (Quick Creation, location search state)

![[2. Create Manual Order _ Pickup and Delivery - Quick Creation.jpg]]

**Shows.** General Information collapsed (green-check StepIndicator = complete); **Pickup and Delivery** expanded. Two mirrored columns **Consignor** | **Consignee**, each with **Add Location \*** (search field; Consignor filled with `61-CU000001035`, Consignee placeholder `Search for ID/Org Name, Address, City, State and Postal Code`) and a **+ Add Location Manually** link, plus **Add Contact Information ⌄** toggle. Below, a single **Planning Date/Time** block (spanning both): a **blue info Alert** "Please enter one of the following fields: 'Late Pickup' or 'Late Delivery.'"; a **radio pair Ship Date & Time (selected) / Delivery Date & Time**; then four date-groups — **Early Pickup / Late Pickup\* (left)**, **Early Delivery / Late Delivery (right)** — each group = **Date (date-picker w/ calendar icon) + Time (time-select) + Time Zone (select)**. With **Ship Date & Time** selected, **Late Pickup Date/Time/Time Zone carry the \* (mandatory)**.

**Canon correlation.** section-map row 7; analysis §3.3, §3.3a; Efrain §2 (Pickup and Delivery).

**Confirms.**
- Two mirrored Consignor/Consignee columns (Efrain §2). ✓
- Add Location search (auto-populate from master data) **or** Add Location Manually (Efrain §2 "enter a new location manually"). ✓
- Add Contact Information is a **reveal toggle** (Efrain §2 "By clicking Add Contact Information"). ✓
- **Planning Date Type radio = Ship Date & Time / Delivery Date & Time** (§3.3, Efrain §2, LINX-7586). ✓
- **Ship Date selected → Late Pickup mandatory** (the \* on Late Pickup) (§3.3, LINX-7587, Efrain §2). ✓
- Each date group = Date + Time + **Time Zone** triad (§3.3a, §3.3). ✓
- Blue Alert states the "one of Late Pickup or Late Delivery" rule (§3.3, PRD's null-but-one constraint). ✓

**Discrepancies.**
- **Location search placeholder = "Search for ID/Org Name, Address, City, State and Postal Code"** — confirms the search keys; canon §3.3a lists the fields but not that they're all searchable in one box.
- **Location ID format `61-CU000001035`** (org-prefix + customer-location id) — a concrete format the canon doesn't specify.
- Radio offers **only two options (Ship / Delivery)** — **no "Both"** (PRD's three-way Date Anchor). **[Answers Q22 — confirms the implemented radio is two-way Ship/Delivery; PRD's "Both" has no UI rendering]**
- **Time and Time Zone are separate selects** beside each Date — canon §3.3 treats time/zone as attributes but the screen shows **3 discrete controls per date** (Date picker, Time select, Time-Zone select).

**Component mapping.**
- *Have:* Accordion + StepIndicator (with **green completed** state), SearchField (Add Location), Button/link (Add Location Manually, Add Contact Information), Radio (Ship/Delivery), Alert (blue info), FieldSelect (Time Zone), FormField.
- *Gaps:* **date picker (calendar popover)** — no normalized equivalent; **time picker / time select** — none; **searchable location-lookup field that populates a sub-form** (SearchField is query-only, not a master-data autocomplete that hydrates address fields); **completed-step (green check) StepIndicator state** in a form context.

---

## 2. Create Manual Order — Pickup and Delivery (Quick Creation, contact + manual address state)

![[2. Create Manual Order _ Pickup and Delivery2 - Quick Creation.jpg]]

**Shows.** Same section, Consignor expanded into **manual-address mode + contact open**. Consignor fields: Add Location (search), **ID/Org Name\* (`KRM1234`), Long Name\* (`KRM Engineering`), Address 1\* (`123 manufacturing st.`), Address 2 (`Apt, Suite, Building`, optional), City\* (`Dallas`), State\* (`TX`), Postal Code\* (`75207`), Country\* (`United States`)**; **Add Contact Information ^** expanded → **Contact Name (`Nick Strauss`), Phone Number (`+1 (765) 670-4444`), Email Address (`nick.strauss@krm.com`)**. Consignee still collapsed to search + Add Location Manually + Add Contact Information. Planning Date/Time below with **Delivery Date & Time radio selected** → **Late Delivery Date/Time/Time Zone now carry the \***.

**Canon correlation.** section-map row 7; analysis §3.3a (Location & Address, Contact Information); Efrain §2.

**Confirms.**
- Mandatory manual-address set exactly matches Efrain §2 / §3.3a: **ID/Org Name, Long Name, Address 1, City, State/Region, Postal, Country** mandatory; **Address 2 optional**. ✓
- Contact Information = **Contact Name + Phone (E.164-style `+1 (765)…`) + Email**, all optional (Efrain §2, §3.3a). **[Answers Q18 partially — confirms the three contact fields render under Pickup/Delivery as Efrain described; their data-model home is still the open part of Q18]**
- **Delivery Date selected → Late Delivery mandatory** (§3.3, LINX-7822). ✓ (mirror of the Ship-Date rule)

**Discrepancies.**
- **State is a select** (`TX` dropdown) and **Postal Code is a select/combo** (`75207` with chevron) and **City is a combo** (`Dallas` with chevron) — i.e. the geographic fields are **dropdowns/comboboxes, not free text**, reflecting the master-data combination validation (§3.3a). Canon doesn't say these are selects.
- Phone field labeled **Phone Number** (Efrain calls it "Contact Number") — minor label drift.

**Component mapping.**
- *Have:* FormField (ID/Org Name, Long Name, Address 1/2, Contact Name, Email), FieldSelect (City, State, Postal, Country), Button/link (Add Contact Information).
- *Gaps:* **phone-number input** (E.164 formatting/validation) — none normalized; **email input with inline validation**; **address sub-form group** revealed by a master-data lookup.

---

## 2. Create Manual Order — Pickup and Delivery (Long Creation, both columns manual)

![[2. Create Manual Order _ Pickup and Delivery - Long Creation.jpg]]

**Shows.** The Long/expanded Pickup-Delivery: **both Consignor and Consignee fully expanded** into the manual-address layout simultaneously (mirror columns), each with Add Location search + full address grid (ID/Org Name, Long Name, Address 1, Address 2, City, State, Postal, Country) + **Add Contact Information** toggle. Planning Date/Time below identical to Quick (radio + Early/Late Pickup + Early/Late Delivery triads).

**Canon correlation.** section-map row 7 (Long expansion of Pickup/Delivery); analysis §3.3a; Efrain §2.

**Confirms.**
- The "Long" Pickup/Delivery is structurally the **same fields as Quick, both columns shown expanded** — supports Efrain's "Quick and Long are two states of one form" (§3.6); Pickup/Delivery has no Quick-vs-Long field difference, only expansion state. ✓
- Mirror structure Consignor ↔ Consignee (Efrain §2). ✓

**Discrepancies.**
- **No additional Long-only fields** in Pickup/Delivery vs Quick — confirms the Long delta lives in General Information + Product, not here. Canon never claimed Pickup/Delivery had Long-only fields, so this is corroboration, not contradiction.
- Confirms geographic fields render as **selects** (City/State/Postal placeholders `e.g., Dallas` / `Select an option` / `75201` with chevrons).

**Component mapping.**
- *Have / Gaps:* same as the two Quick Pickup/Delivery screens (address sub-form, date/time/zone pickers, contact fields).

---

## 3 (modal). Create Order — Discard Order / Save for Later

![[3(modal). Create Order - Discard Order  - Save for Later.jpg]]

**Shows.** A **centered confirmation modal** over a dimmed form. Title **Discard order** + close X. Body: "Would you like to cancel this order?" / "Alternatively, you can save it to complete later." Two footer buttons: **Save for Later** (secondary/light) + **Discard** (dark/primary). Triggered from the form's **Cancel** button.

**Canon correlation.** section-map row 7 (Save/Save-for-Later/Discard); analysis §3.5; Efrain §3 (Save, Save for Later & Discard).

**Confirms.**
- **Cancel opens a confirmation modal offering Save for Later or Discard** (Efrain §3: "Discard… accessed by clicking Cancel… system displays a confirmation screen"; "Save for Later… accessed by clicking the Cancel button"). ✓ Both reached via Cancel exactly as Efrain documents.
- Discard requires explicit confirmation (Efrain §3). ✓

**Discrepancies.**
- **Modal copy is softer than canon's wording** ("Would you like to cancel this order? Alternatively, you can save it to complete later") — fine, just record the actual copy.
- The standalone navbar **Save for Later** button (seen on screens 1–2) and this modal's **Save for Later** both exist — **two entry points** to the same draft action; canon §3.5 only ties Save-for-Later to Cancel. → note the navbar Save-for-Later shortcut.
- The **Save precondition** (Order Number + Owning Organization both required to Save, Efrain §3) is **not visible** in this modal (no error state shown). Confirmation of that red-error gate isn't in the captures. **[Relates to Q16 — the mandatory-to-save rule isn't visually proven here]**

**Component mapping.**
- *Have:* ModalMedium (or ModalLarge) — confirmation-dialog size; Button (Save for Later = secondary, Discard = primary/dark).
- *Gaps:* none new — confirmation modal is covered by ModalMedium + Button. (Verify ModalMedium supports this compact two-button footer layout.)

---

## 4. Create New Order — Product Information (empty, "Under Construction" label)

![[4. Create New Order - Product Information.jpg]]

**Shows.** Product Information expanded (label still **🚧 Under Construction**). Toolbar: **Search** field (left), **US | Metric** toggle, sort-direction icon (right). "**0 products added**". Table header: **# · Product ID\* · Product Description\* · Gross Weight\* · Volume\* · Ship Class\*** + a **column-manage icon** (far right). **+ Add Product** link. (Special Services collapsed below.)

**Canon correlation.** section-map row 4 (Product, marked Weak); analysis §3.4 (Product table), §3.3 (UoM toggle); Efrain §4 (Under Construction, undescribed).

**Confirms.**
- Product table exists with **Add Product** and a **column-manage** affordance (§3.4). ✓
- **UoM US (default) / Metric toggle** present (§3.3 weight/volume UoM). ✓
- Columns include Product ID, Product Description, Gross Weight, Volume, Ship Class (§3.4 column list). ✓

**Discrepancies (significant).**
- **Product Information is NOT actually halted — it has a working UI.** Efrain §4 + analysis §10 say Product is "Under Construction" / undescribed, treated as the weakest-specced surface. The screens show a **fully interactive editable product grid** (search, UoM toggle, sort, add/edit/save rows, column management). → The "🚧 Under Construction" is a **label still on the section header**, but the section is **substantially built**. Major update for §3.4 / section-map row 4 / §10 — Product is far more specced *in the running app* than the canon claims. **[Answers/reframes the §10 "Product Information halted" gap]**
- **Mandatory product columns marked with \***: Product ID, Product Description, Gross Weight, Volume, Ship Class are **all required** here — contradicts §3.3's "either (Product ID + Description) OR (Shipping Class + Shipping Class ID)" rule (LINX-9874). The grid asterisks **all** of them. → reconcile the either/or rule vs the UI's all-required asterisks.
- Visible default columns are **6** (#, Product ID, Description, Gross Weight, Volume, Ship Class) — matches the "min 6" floor (§3.4, LINX-6101). Confirms min-6.

**Component mapping.**
- *Have:* SearchField, PillTab/toggle (US|Metric — likely a segmented toggle), IconButton (sort, column-manage), Accordion + StepIndicator, Button/link (Add Product).
- *Gaps:* **editable data-grid with inline-add/edit rows** (the core gap); **US/Metric segmented toggle** (no normalized segmented control — PillTab is closest but semantically different); **per-grid column-management popover** (Shipments has column mgmt, not in @odyssey/ui).

---

## 4. Create New Order — Product Information (inline-edit row, missing-field validation)

![[4. Create New Order - Product Information - Missing field alert.jpg]]

**Shows.** Product grid with **one row in inline-edit mode** (row #1): **Product ID** (`Search an ID` select), **Product Description** showing a **red "Add Description" + error icon** with inline error **"Please provide a descript…"**, **Gross Weight** (`0.00` + `Select` UoM), **Volume** (`0.00` + `Select`), **Shipping Class ID\*** column, **Cancel + Save** buttons in-row, and an **expand (diagonal-arrows) icon** to open the row full-screen. Note header here reads **Shipping Class ID \*** (vs "Ship Class" in the empty state).

**Canon correlation.** section-map row 4; analysis §3.3 (product line rule, "Please select either…", description 1–150 chars, disabled until Product ID), §3.4; Efrain §4.

**Confirms.**
- **Inline field-level validation as-you-type** with red error text (§3.3 product rules; §3 "validated as fields are entered"). ✓
- Per-row **Cancel / Save** editing model (§3.4 line-level editing). ✓
- Product Description error "Please provide a description" aligns with §3.3 description requirement. ✓

**Discrepancies.**
- **Column header inconsistency: "Ship Class" (empty state) vs "Shipping Class ID \*" (edit state) vs "Ship Class \*" (other captures).** The grid uses **three different labels** for the class column across states. → flag label inconsistency; canon uses "Shipping Class / Shipping Class ID" as two distinct columns (§3.4) but the UI sometimes shows only one.
- **Row expand-to-fullscreen icon** (diagonal arrows) — an expand-row-editor affordance the canon never mentions; likely opens the full Long product sub-sections (Packaging, Hazmat, etc., §3.6). New UI element.
- Weight/Volume each have an **inline UoM `Select`** per cell (not just a global US/Metric toggle) — per-line UoM selection, beyond §3.3's global toggle.

**Component mapping.**
- *Have:* FieldSelect (Product ID, UoM Select), FormField (Description, Gross Weight, Volume inputs), Button (in-row Cancel/Save), IconButton (expand).
- *Gaps:* **inline-editable grid row with validation + save/cancel + expand-to-modal** (the compound gap); **per-cell value+unit composite input** (numeric + UoM select); **row-level inline error display**.

---

## 4. Create New Order — Product Information (edit row, Ship Class variant)

![[4. Create New Order - Product Information 2.jpg]]

**Shows.** Same inline-edit row but the class column is **"Ship Class \*"** with a **"Select a Ship…"** dropdown (not "Shipping Class ID"); column order here is Product ID, Description, Gross Weight, **Ship Class**, Volume (Volume and Ship Class swapped vs the previous capture). Row has Cancel/Save + expand icon. "0 products added".

**Canon correlation.** section-map row 4; analysis §3.3 (Ship Class 4 options: Product Class/Commodity/Harmonized/NMFC), §3.4 (column reorder supported, LINX-6150).

**Confirms.**
- **Column reorder is real** — Volume and Ship Class appear in different positions across captures, confirming §3.4 "reorder supported." ✓
- Ship Class is a **dropdown** (the 4-option lookup, §3.3). ✓

**Discrepancies.**
- Reinforces the **Ship Class vs Shipping Class ID labeling ambiguity** (this capture shows "Ship Class", screen 4-missing-field shows "Shipping Class ID"). → the canon's two-column model (Shipping Class + Shipping Class ID) may be **collapsed to one selectable column** in the UI, or the two are interchangeable column choices via Manage Columns. Investigate with the team.

**Component mapping.**
- *Have / Gaps:* same as the missing-field capture (inline editable grid, FieldSelect, composite weight/volume inputs).

---

## 4. Create New Order — Product Information (5 saved rows + new edit row)

![[4. Create New Order - Product Information 3.jpg]]

**Shows.** Section **complete (green StepIndicator)**. "**5 products added**". Five read rows (all `3000001767` / `"Lorem ipsum dol…"` / `100.00 lb` / `79.00 Cu ft` / `Commodity`) each with a **three-dot row menu**; a **6th row in edit mode** (Search an ID, Add Description, 0.00 + Select, 0.00 + Select, Cancel/Save + expand). + Add Product link.

**Canon correlation.** section-map row 4; analysis §3.4 (Add Product appends, Line # auto-increments, no row limit, rows removable, three-dot per row implied by §3.4 actions).

**Confirms.**
- **Add Product appends a new editable row, Line # auto-increments** (1–5 saved, 6 adding) (§3.4). ✓
- Saved rows show values with **units inline** (`100.00 lb`, `79.00 Cu ft`). ✓
- **Per-row three-dot action menu** on saved rows (§3.4 line actions). ✓

**Discrepancies.**
- Saved-row class value shows **"Commodity"** (a Ship Class *option value*), confirming the column holds the **Ship Class选 value**, not a separate Shipping Class ID. Reinforces the one-column-vs-two ambiguity above.

**Component mapping.**
- *Have:* editable grid (read + edit rows), IconButton/MenuDropdown (three-dot row menu), Button (Cancel/Save), Button/link (Add Product).
- *Gaps:* same editable-grid gap; **read-row → three-dot MenuDropdown** in a grid context.

---

## 4. Create New Order — Product Information (row #3 re-opened for edit, per-cell UoM)

![[4. Create New Order - Product Information 4.jpg]]

**Shows.** 5 products; **row #3 re-opened in edit mode** mid-grid: Product ID as a **select** (`3000001767`), Description, **Gross Weight `100.00` + `Lb` UoM select**, **Volume `79.00` + `Cu Ft` UoM select**, Cancel/Save + expand icon; rows 1,2,4,5 stay read-only with three-dot menus.

**Canon correlation.** section-map row 4; analysis §3.4 (line-level editing of existing rows), §3.3 (per-value UoM).

**Confirms.**
- **Existing saved rows are re-editable in place** (§3.4 line-level editing). ✓
- **Per-cell UoM selects** (`Lb`, `Cu Ft`) confirm weight and volume each carry their own UoM at line level (§3.3 weight/volume + UoM). ✓

**Discrepancies.**
- Per-line UoM (`Lb` / `Cu Ft`) **coexists with** the global **US | Metric** toggle (screen 4-empty). → two UoM mechanisms; clarify precedence. Not in canon.

**Component mapping.**
- *Have / Gaps:* same editable-grid + composite value+UoM input gaps.

---

## 5. Create New Order — Special Services (empty)

![[5. Create New Order - Special Services (Optional) - Quick and Long Creation.jpg]]

**Shows.** All prior sections complete (green checks). **Special Services (Optional)** expanded: label **Special Services** + info (i) icon; a **"Search a special services"** dropdown field; empty table header **Service Category / Description**. Footer now shows **Create Order enabled** (dark) — mandatory sections satisfied.

**Canon correlation.** section-map row 7; analysis §3.4a (Special Services); Efrain §5.

**Confirms.**
- Special Services is **fully optional** — Create Order is enabled with the table empty (Efrain §5, §3.4a). ✓
- **Search bar → dropdown of available services** (master-data driven) (Efrain §5, §3.4a). ✓
- Selected services populate a **Service Category / Description** table (§3.4a). ✓
- **Create Order enabled only when mandatory fields filled** (§3.5, LINX-9880) — confirmed by enabled state here. ✓

**Discrepancies.**
- **No "Quick Selection chips"** visible. §3.4a/Efrain §5 mention chips ("from the Quick Selection chips or the Manage table"). The captured UI shows **only the search-dropdown + table**, no chip row. → either chips were dropped or aren't in this state; flag.
- An **(i) info tooltip** beside "Special Services" — not in canon; likely explains the over-fetch caveat (§10 / Q10).

**Component mapping.**
- *Have:* SearchField / FieldSelect (search a special service), Accordion + StepIndicator (green), Button (Create Order enabled).
- *Gaps:* **typeahead multi-select that appends to a results table** (search-to-add pattern); **tabular dropdown panel** (the dropdown shows a *table* of category+description sorted by frequency, not a plain option list) — no normalized equivalent.

---

## 5. Create New Order — Special Services (3 selected)

![[5. Create New Order - Special Services (Optional) 2  - Quick and Long Creation.jpg]]

**Shows.** Special Services with **3 selected rows**: **PALEXG → Pallet Jack**, **PJC → Pallet Exchange**, **LFT → Lift gate**, each Service Category shown as a **grey code Badge/chip** with the Description beside it and a **trash-can delete icon** per row. Create Order enabled.

**Canon correlation.** section-map row 7; analysis §3.4a; Efrain §5.

**Confirms.**
- Selected services show **Service Category (TMS Charge Code) as a chip + auto-populated Description**, removable via **trash-can** (Efrain §5, §3.4a). ✓ No manual typing of description. ✓
- Master-data-driven (codes like PALEXG/PJC/LFT) (§3.4a). ✓

**Discrepancies.**
- Service Category is rendered as a **pill/Badge** (grey rounded code) — canon describes it as a table value, not styled as a chip. Minor visual detail to capture.
- Confirms **no Quick-Selection chip row** even with services selected — supports dropping that concept from the canon (or it's a separate state not captured).

**Component mapping.**
- *Have:* Badge (Service Category code chip), IconButton (trash delete), table rows.
- *Gaps:* selected-services removable-row list (covered by Badge + IconButton + a simple table; no major gap).

---

## 6. Confirmation Page — Quick Creation (Success)

![[6. Create Manual Order _ Confirmation Page - Quick Creation - Success Message.jpg]]

**Shows.** Post-submit read-only summary. **Green success Alert** "Your Order was created successfully" (dismissible). A **summary header strip**: **Order Number `S260004NGW` · Order Date `01/08/2026 09:11 AM, EST` · Shipment Mode `Ground` · Payment terms `Prepaid`**. Read-only accordion sections (all expanded, chevrons up): **General Information** (General: Owning Organization `ABC Corp`, Freight Term `Prepaid`, Ship Direction `Outbound`, Consolidatable `Yes`; Requested Transportation: Equipment `SUTU3456789`); **Pickup and Delivery** (Consignor details / Consignee details: ID/Org Name, Long Name, Address 1, Address 2 `-`, City, State, Postal, Country; Planning Date/Time: Late Pickup `12/16/2025 at 12:00 PM EST`); **Product Information – 🚧 Under Construction** (summary stats: Number of Products `5`, Total Product Weight `200.000 lb`, Total Volume `64.000 cuft`, Hazmat `No`; then the 5-row product table greyed); **Special Services (Optional)** (Service Category / Description = `-` / `-`, none selected).

**Canon correlation.** section-map row 9 (confirmation); analysis §3.5 (confirmation page, Quick variant); Efrain §6.

**Confirms.**
- Quick confirmation summarizes **mandatory fields across General Info, Pickup/Delivery, Product, Special Services + final Order Number** (Efrain §6, §3.5). ✓
- **System-generated Order Number shown** (`S260004NGW`) (§2 auto-gen, §3.5). ✓
- Read-only section layout mirrors the form's accordion sections. ✓

**Discrepancies.**
- **Summary header strip carries `Shipment Mode` and `Payment terms`** — "Shipment Mode `Ground`" is **not a General-Information field captured anywhere in the create form** (Mode was a Long-only field per §3.1, never shown in the captured form screens). → confirmation **derives/displays Mode**; note where it comes from. Also "Payment terms `Prepaid`" duplicates Freight Term — label drift (Freight Term ↔ Payment terms).
- **Consolidatable shown as `Yes`** — confirms checkbox → boolean rendered as Yes/No.
- **Order Date + timezone `EST`** shown — a creation timestamp field not modeled in the form.
- Product summary adds **roll-up stats** (Number of Products, Total Product Weight, Total Volume, **Hazmat Yes/No**) — aggregations not described in canon §3.4. Hazmat flag appears despite Product being "Under Construction."
- Product section **still labeled 🚧 Under Construction even on the success confirmation**.

**Component mapping.**
- *Have:* Alert (green success), Accordion (read-only sections), Badge (status-ish), table (product read rows), PageHeader-like summary strip.
- *Gaps:* **read-only "definition list" summary layout** (label-over-value grid) — recurring across confirmation + would suit a normalized DescriptionList/KeyValue component; **summary header strip** (order key facts).

---

## 6. Confirmation Page — Long Creation (Success)

![[6. Create Manual Order _ Confirmation Page2 - Long Creation - Success Message.jpg]]

**Shows.** Same success layout, **richer (Long)**. General Information adds **Requested Transportation: Equipment Reference Number `2`, Customer Required Carrier `ABC 123`**; a **References** table (Reference Type / Reference Value: Pickup Number `41197`, PO Number `I567649422`); an **Instructions** table (# / Instruction Description: two Lorem rows). Pickup/Delivery adds **Contact Name (Alternate City) `Nick Strauss`, Phone `(765) 670-4444`, Email `nick.strauss@krm.com`** for both Consignor and Consignee. Product + Special Services (3 services: PALEXG/Pallet Jack, PJC/Pallet Exchange, LFT/Lift gate) shown.

**Canon correlation.** section-map row 9; analysis §3.5 (Long confirmation = mandatory + all optional); Efrain §6.

**Confirms.**
- Long confirmation shows **all optional data** (Additional Info, Instructions, References, contacts, Special Services) on top of the mandatory set (Efrain §6, §3.5). ✓
- References render as the two-column table; Instructions as numbered free-text rows; both match the form. ✓

**Discrepancies.**
- **Contact field labeled "Contact Name (Alternate City)"** — an odd parenthetical ("Alternate City") on the Contact Name label. Likely a mislabel/bug or a repurposed field. → flag as a label defect; relates to **Q18** (contact fields' data-model home — the "(Alternate City)" hints they may map onto an existing party/address field rather than a dedicated contact collection). **[Informs Q18]**
- Same **Shipment Mode / Payment terms** header-strip derivation noted in the Quick confirmation.
- Both Consignor **and** Consignee show the **same contact** (`Nick Strauss`) — sample-data artifact, not a rule.

**Component mapping.**
- *Have / Gaps:* same as Quick confirmation (read-only summary, definition-list layout, tables). Gap: **KeyValue/DescriptionList** component reused heavily here.

---

## 7. Confirmation Page — Info Message (async, no Order Number yet)

![[7. Create Manual Order _ Confirmation Page - Info Message.jpg]]

**Shows.** Identical Long-confirmation body, but the top banner is a **blue info Alert**: "Your Order was saved. You will receive a notification when the Order number have been created." The header strip's **Order Number = `-`** (not yet assigned); Order Date / Shipment Mode / Payment terms still shown.

**Canon correlation.** section-map row 9 (async info-message state); analysis §3.5 (async confirmation case); Efrain §7.

**Confirms.**
- The **async path** exists: order saved, Order Number **deferred**, user told they'll be notified (Efrain §7, §3.5). ✓ Exact copy matches Efrain. ✓
- Order Number renders as **`-`** while pending — concrete empty-state. **[Informs Q17 — confirms the async UI state and that the form does NOT block on the Order Number; whether it polls/subscribes is still open]**

**Discrepancies.**
- Everything else on the page is **fully populated** (all sections) **except Order Number** — so the async case still renders the complete summary immediately, only the number is pending. Canon §3.5 didn't specify how much of the summary shows in the async case; now confirmed: **all of it, minus the number**.
- Blue info Alert vs green success Alert — distinct semantic states (info vs success). Confirms two confirmation variants.

**Component mapping.**
- *Have:* Alert (blue info variant), read-only summary sections.
- *Gaps:* same KeyValue/DescriptionList gap; **a pending/empty Order Number state** (treatment, not a component).

---

## Component gaps (consolidated, deduped)

Un-normalized UI elements seen across the captures, with the screens that need each and the closest existing primitive. This list drives upcoming `/normalize` cycles for the Orders build.

| Gap element | Screens needing it | Closest existing component |
|---|---|---|
| **Virtualized data-grid** (sticky header, row-select checkboxes, horizontal scroll, "items" count + sort toolbar) | 0 (Overview) | Shipments-app grid pattern (not in @odyssey/ui); Checkbox for selection |
| **Editable data-grid with inline add/edit rows** (per-row Save/Cancel, line # auto-increment, per-row three-dot menu, expand-to-modal) | 4 (all Product captures) | none — composes FormField + FieldSelect + Button + MenuDropdown |
| **Repeatable field-array / mini editable table** (Reference Type/Value rows, Instruction rows; add row + per-row trash delete) | 1-Long | FormField + IconButton, no normalized row-array container |
| **Date picker** (calendar popover, MM/DD/YYYY, past/current warning) | 2 (all Pickup/Delivery) | none |
| **Time picker / time select** (HH:MM 24h) | 2 (all Pickup/Delivery) | none (FieldSelect is generic) |
| **Async searchable master-data select** (typeahead, frequency-sorted, hydrates a sub-form; allows free-typed values for carrier) | 1, 2, 4, 5 | FieldSelect (static options only) / SearchField (query-only) |
| **Tabular dropdown panel** (dropdown body renders a category+description *table* sorted by frequency, click-to-add) | 5 (Special Services) | MenuDropdown (rows, not columns) |
| **Search-to-add multi-select → results table** (append selected to a removable-row list) | 5 (Special Services) | composes SearchField + Badge + IconButton |
| **Phone-number input** (E.164 formatting/validation) | 2 (contact info) | FormField (plain text) |
| **Email input with inline `@`/`.` validation** | 2 (contact info) | FormField |
| **Address sub-form group** (revealed by a location lookup, City/State/Postal/Country as comboboxes validated in combination) | 2 | FormField + FieldSelect, not grouped |
| **Composite value + UoM input** (numeric field + adjacent UoM select per cell) | 4 (Product) | FormField + FieldSelect, not composed |
| **US / Metric segmented toggle** (2-state segmented control) | 4 (Product) | PillTab (semantically a tab, not a toggle) |
| **Per-grid column-management popover** (show/hide/reorder, min 6/max 12) | 0, 4 | Shipments column-mgmt pattern (not in @odyssey/ui) |
| **Accordion-stepper hybrid** (Accordion section + StepIndicator status circle on a connecting rail, with completed/green + auto-complete states) | 1, 2, 4, 5 | Accordion + StepIndicator exist separately; composed organism + completed-state not normalized |
| **Sticky form footer action bar** (Cancel / Save / Create Order) | 1, 2, 4, 5 | Button exists; the bar layout is not a component |
| **Form-level info/warning Alert states** (yellow auto-save banner, blue "enter one of…" hint, green success, blue async info) | 1, 2, 5, 6, 7 | Alert (verify it has all 4 tones/variants needed) |
| **Read-only KeyValue / DescriptionList summary** (label-over-value grid for confirmation sections) + **summary header strip** | 6, 6-Long, 7 | none — currently ad-hoc layout |
| **Confirmation modal (compact two-button)** | 3 (modal) | ModalMedium + Button (verify compact footer support) |
| **Status / status-filter tabs with count Badge in a page header** (All / Saved / Canceled / Interface Failures) | 0 | PillTab + Badge (verify count-badge slot) |

> AI-generated correlation. Validate against Jana / the Orders team (Ramesh/Priya/Efrain) before treating any discrepancy as a canon change. Status: active.
