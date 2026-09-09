---
title: "LINX Order Change (Consolidation / Multi-Stop) — Acceptance Criteria, verbatim"
domain: shipments
type: source
tags: [order-change, consolidation, multi-stop, compare-screen, linx-15435, linx-15872, jira-ac]
date: 2026-09-08
status: raw
source: "Jira customfield_10032 (Acceptance Criteria) + description — fetched 2026-09-08 via Atlassian Rovo MCP. ADF->markdown converted locally. Story list supplied by Laura. All 13 carry label VD_Pending; LINX-15435/15436 are On Hold (optmizer_pending)."
---

# Order Change — Consolidation — raw ACs

NOT synthesis. Verbatim ADF->markdown conversion of the AC + description fields.
Canon (`vault/10-domains/shipments/order-change.md` §10) is owed a rewrite — these
13 stories supersede the deck-derived intent and close OC-open-5.

Inline Jira mock images referenced below (`image-2026082*.png`) were NOT downloaded;
every story says "Refer to VD for actual design and layout".

Laura's grouping (three clusters, mirrored in the file order):

1. **Stops-tab review** — LINX-15435, 15436, 15437, 15438
2. **Compare Screen** — LINX-15667, 15668, 15669, 15670, 15671
3. **Order add/remove** — LINX-15869, 15870, 15871, 15872



======================================================================
# LINX-15435 — Order Change-Review Consolidated Shipment Order Changes - Stops Overview
======================================================================
status: On Hold | labels: Approved,Functional,Refinement_done,VD_Pending,optmizer_pending

--- DESCRIPTION ---
As a Transportation Planner,

I want to review order changes for a consolidated shipment from the Stops tab,

so that I can understand shipment impacts, review updated shipment metrics, planning dates, and cost changes before proceeding with shipment planning.

--- ACCEPTANCE CRITERIA ---
- **Given** a consolidated shipment (multi stop or aggregation) has been classified with an Order Change exception
- **When** the user opens the shipment and navigates to the Stops tab
- **Then** the system should display shipment summary information, planning date details, cost comparison information, and stop-level change indicators for review.

## Business Rules
- The Stops tab shall be selected by default when accessed from an Order Change exception.
- The following actions shall be displayed:
  - Edit Shipment Stops
  - View Routing
  - Approve Plan
- The shipment header shall display:
  - Distance
  - Gross Weight
  - Volume
  - Accepted Carrier
  - Seed Equipment
  - Utilization
  - Prior Cost
  - New Direct Cost
  - New Consolidated Cost
- Distance, Gross Weight, and Volume shall display Prior and New values when changed.
- If a value has not changed, only the current value shall be displayed.
- Planning information shall be displayed for all orders in the shipment (data will be from order):
  - Planning Type (RDD/SSD)
  - Earliest Ship Date
  - Latest Ship Date
  - Earliest Delivery Date
  - Latest Delivery Date
- Prior Cost calculation:
  - If tendering has not started, use Preferred Carrier AP Cost.
  - If tendering has started, use current tender cost.
  - If all options exhausted or preferred carrier declined or cancelled (No active tender; Sent, to be tendered or Accepted), Prior Cost shall be blank.
- New Direct Cost shall equal the sum of all order-level direct costs returned by routing.
- New Consolidated Cost shall equal the Preferred Carrier AP Cost returned by routing when approved carrier results are available
  - The New Consolidation cost is calculated only in case when there is no location changed within that shipment (if one of the order in the shipment had a location change or a new order was added and had a new location)


======================================================================
# LINX-15436 — Order Change-Highlight Stop-Level and Order-Level Changes for Consolidated Shipments
======================================================================
status: On Hold | labels: Approved,Functional,Refinement_done,VD_Pending

--- DESCRIPTION ---
As a Transportation Planner, I want the system to identify and highlight shipment changes, so that I can quickly identify impacted stops and orders requiring review.

--- ACCEPTANCE CRITERIA ---
- **Given** a consolidated shipment contains one or more order changes
- **When** the Stops tab is displayed
- **Then** the system should visually highlight stop-level and order-level changes requiring user attention.

## Business Rules
- Stop-level changes shall be highlighted for:
  - Site ID
  - Address Line 1
  - Address Line 2
  - Address Line 3
  - City
  - State/Province
  - Zip/Postal Code
  - Country
  - Date
  - Appointment
  - Orders
  - Weight
  - Volume
  - Package Count
- Visual indicators shall be displayed according to the approved VD.
- Each stop shall identify when one or more orders within the stop have changed.
- Orders with changes shall be visually distinguished from unchanged orders.
- Stop-level summaries shall help users identify the nature of the change without opening order details.
**Sample mock for understanding; Refer to VD for actual design and layout:**
[IMAGE: image-20260828-184407.png]


======================================================================
# LINX-15437 — Order Change-Review Order-Level Changes for Consolidated Shipments
======================================================================
status: On Hold | labels: Functional,Refinement_done,VD_Pending,approved,optmizer_pending

--- DESCRIPTION ---
As a Transportation Planner, I want to review the detailed changes made to an order, so that I can quickly compare prior and new information before proceeding.

--- ACCEPTANCE CRITERIA ---
- **Given** one or more orders have changed within a consolidated shipment
- **When** the user selects an impacted order
- **Then** the system should display a comparison view showing prior and new values for the changed attributes.

## Business Rules
- Users shall be able to select a changed order from the Stops tab.
- The comparison view shall display Prior and New values side-by-side (Refer to story →
- Changed attributes shall be visually highlighted.
- The comparison view shall allow users to quickly identify the impact of the order change.
**Sample mock for understanding; Refer to VD for actual design and layout:**
[IMAGE: image-20260828-184634.png]


======================================================================
# LINX-15438 — Order Change-Recalculate Routing and Display Routing Comparison for Consolidated Shipments
======================================================================
status: Final Review | labels: Functional,Refinement_done,VD_Pending

--- DESCRIPTION ---
As a Transportation Planner, I want the system to recalculate routing and display routing differences after order changes, so that I can evaluate carrier, routing, and cost impacts caused by the shipment changes.

--- ACCEPTANCE CRITERIA ---
- **Given** a consolidated shipment contains order changes that do not require shipment plan review
- **When** the shipment is loaded for review
- **Then** the system should recalculate routing and display updated routing and cost information.

## Business Rules
- For non-location changes, the system shall automatically invoke routing.
- Changes eligible for automatic routing include (any other transportation relevant change other than site id or address changes (city, state, zip, countr):
  - Weight
  - Volume
  - Package Count
  - Pickup Date
  - Delivery Date
  - Appointment Date/Time
- Routing shall return:
  - Updated Carrier Options
  - Updated Consolidated Cost
- Users shall be able to select View Routing.
- View Routing shall display:
  - Prior Tender (refer story  )
  - New Tender (refer story  )
  - Dropped Carriers (  ,  )
  - Prior Cost
  - New Direct Cost
  - New Consolidated Cost (from new route list / tender list)
- New Direct Cost shall be calculated as the sum of all order-level direct costs returned by routing.
- New Consolidated Cost shall be derived from the Preferred Carrier AP Cost returned by routing.
- Routing comparison information shall be presented according to the approved VD.
**Sample mock for understanding; Refer to VD for actual design and layout:**
[IMAGE: image-20260828-185022.png]
> [!note]
> View Routing button is not enabled or available if there is a site change the changes have not been finalized.
> Also, if the New Tender option list is available, then that option list is updated in the Tender tab (bottom section) once user clicks on ‘Approve Plan’. The New will be updated to the screen as V2 and the Prior will be V1 (provided Prior was the only Tender Option list before the order change). Versioning of Tender Option is important.


======================================================================
# LINX-15667 — Order Change-Launch Compare Screen & Display Shipment Stop Structure
======================================================================
status: Final Review | labels: Functional,Refinement_done,VD_Pending

--- DESCRIPTION ---
As a Transportation Planner, I want to access the Compare Screen from the Order Change Review process, So that I can review and modify the shipment stop structure before generating an updated routing plan.

--- ACCEPTANCE CRITERIA ---

#### **Given** a shipment is in Order Change Review status
**When** the user selects **Edit Shipment Stops**
**Then** the system shall open the Compare Screen (Prior and New)
**And** display the shipment stop structure
**And** display the Stops, Orders, and Search & Add Orders sections
**And** display Compare Screen actions.

### 1. Launch Compare Screen
The system shall provide an **Edit Shipment Stops** action from the Order Change Review screen. When selected, the system shall open the Compare Screen and display the current shipment stop structure.
---

### 2. Compare Screen Layout
The Compare Screen shall contain three sections:
| Section | Description |
| Stops | Displays shipment pickup and delivery stops |
| Orders | Displays all orders assigned to the shipments |
| Search & Add Orders | Allows users to locate and assign additional orders to the shipment |
---

### 3. Stop Display
The system shall display all Pickup and Delivery stops associated with the shipment.
Stops shall be displayed in stop sequence order.
The following information shall be displayed for each stop:
| Field |
| Stop Number |
| Stop Type |
| Location Name |
| Address |
| City |
| State |
| ZIP Code |
| Country |
| Planned Date (this date is stop date; based on Pickup / Delivery) |
| Planned Time (Time is stop time; based on Pickup / Delivery) |
| Time Zone (Time Zone; based on Pickup / Delivery Time zone. Should auto select based on address time zone. User will have option to change the Time Zone.) |
| Assigned Orders |
---

### 4. Stop section
Users shall be able to select a stop from the Stops section. User should be able to move the stops. Ony restriction is that the order should be picked up before it can be delivered (Pickup should come before delivery).
When a stop is selected:
- The selected stop shall be highlighted and can be repositioned within the stops.
**Note: **if in a stop, more than one order exist (delivery stop), all the pickup of the order should happen before delivery.
---

### 5. Orders Section
The Orders section shall display orders assigned to the shipments. Order can be removed from the shipment. In that case, the order is removed from the stops and placed in Search & Add order section. Detailed order removal functionality is covered in a separate story. Refer story:
---

### 6. Search & Add Orders Section
The Search & Add Orders section shall be available from the Compare Screen. Detailed search and order assignment functionality is covered in a separate story.  ,  ,
---

### 7. Compare Screen Actions (buttons)
The Compare Screen shall display the following actions:
| Action |
| View Routing |
| Save |
| Cancel |
Button behavior, validations, and processing logic are covered in subsequent stories.
- **Planning Dates**
Planning information shall be displayed for all orders in the shipment (data will be from order):
- Planning Type (RDD/SSD)Earliest Ship DateLatest Ship DateEarliest Delivery DateLatest Delivery Date
Note: if new Order added or removed, this table is updated accordingly.

## Business Rules
| Rule ID | Business Rule |
| BR-1 | Compare Screen shall be launched using the Edit Shipment Stops action. |
| BR-2 | Compare Screen shall display the current shipment stop structure. |
| BR-3 | Pickup stops shall be displayed before Delivery stops (for the orders) |
| BR-4 | All order in the shipment is displayed in the Orders section |
| BR-5 | This story provides the Compare Screen framework and stop visibility only. |
| BR-6 | Stop creation, stop modification, routing processing, and tender resolution actions are covered in subsequent stories. |
> [!note]
> Entire screen is like Sandbox where user can rearrange stops, add order, remove order, change Pickup date, delivery date, call routing without actually updating the shipments. The update to the shipments (remove order, add order) happens only after user clicks on ‘Save’ action.
**Sample Mock; Refer to actual VD for details and design:**
[IMAGE: image-20260828-194046.png]


======================================================================
# LINX-15668 — Order Change-Automatic Stop Creation and Stop Assignment for Location Changes
======================================================================
status: Architecture/Tech Design | labels: Functional,Refinement_done,VD_Pending

--- DESCRIPTION ---
As a Transportation Planner, I want the system to automatically create and assign shipment stops when pickup or delivery locations change, So that the shipment structure accurately reflects the updated order locations before routing is generated.

--- ACCEPTANCE CRITERIA ---
**Given** one or more orders have undergone a pickup or delivery location change
**When** the user opens the Compare Screen (Edit Shipment Stops)
**Then** the system shall automatically evaluate the updated locations
**And** assign the order to an existing matching stop when available
**And** create a new stop when a matching stop does not exist
**And** remove the order from its previous stop assignment
**And** assign the order to the appropriate stop
**And** remove any stop that no longer contains assigned orders.

## Functional Requirements

### 1. Location Change Detection
The system shall evaluate all Transportation Relevant order changes associated with the shipment.
A location change shall be identified when any of the following values change:
| Field |
| Address (address line 1,2,3) |
| City |
| State |
| ZIP Code |
| Country |
| Location ID / Site ID |
---

### 2. Pickup Location Change Processing
When a pickup location change is detected, the system shall determine whether an existing Pickup stop already exists for the updated location.
Location matching shall be based on:
- Location ID (when available)
- Address
- City
- State
- ZIP Code
- Country
If a matching Pickup stop exists:
- The impacted order shall be assigned to the existing Pickup stop.
If a matching Pickup stop does not exist:
- A new Pickup stop shall be automatically created (P?)
- The stop shall be added to the shipment stop structure (last stop within Pickup or just before the same order delivery if P,D, sequence exist)
- The impacted order shall be assigned to the new Pickup stop (P?)
---

### 3. Delivery Location Change Processing
When a delivery location change is detected, the system shall determine whether an existing Delivery stop already exists for the updated location.
Location matching shall be based on:
- Location ID (when available)
- Address
- City
- State
- ZIP Code
- Country
If a matching Delivery stop exists:
- The impacted order shall be assigned to the existing Delivery stop (D?).
If a matching Delivery stop does not exist:
- A new Delivery stop shall be automatically created.
- The stop shall be added to the shipment stop structure (towards the end after the final delivery stop)
- The impacted order shall be assigned to the new Delivery stop  (D?).
---

### 4. Removal from Previous Stop
When an order is reassigned to a new pickup or delivery location:
- The order shall be removed from its previous stop assignment.
- The order shall be assigned to the newly identified stop.
---

### 5. Stop Number Assignment
When a new stop is created:
| Stop Type | Sequence Rule |
| Pickup | P? (If multiple pickup change occurs, then mark all those as P?. Order finalization cannot happen without moving the P? stops. In that case it gets numbered according to the position it is moved) |
| Delivery | D? (If multiple Delivery change occurs, then mark all those as D?. Order finalization cannot happen without moving the D? stops. In that case it gets numbered according to the position it is moved) |
Examples:
- Existing P1, P2, P3 → New stop becomes P?
- Existing D1, D2 → New stop becomes D?
---

### 6. Automatic Stop Placement
Newly created stops shall initially be inserted at the end of the corresponding stop type section.
Examples:
- Pickup stop (P?) added after existing Pickup stops
- Delivery stop (D?) added after existing Delivery stops
Users may subsequently reposition stops within the Compare Screen.
---

### 7. Empty Stop Handling
The system shall automatically remove stops that contain no assigned orders.

## Business Rules
| Rule ID | Business Rule |
| BR-1 | Location matching shall be performed before creating a new stop (Location ID & Address (city state zip country match) |
| BR-2 | New Pickup stops shall be created based on the rules mentioned above |
| BR-3 | New Delivery stops shall be created based on the rules mentioned above |
| BR-4 | Newly created stops shall initially be positioned at the end of the respective Pickup or Delivery stop group. Note: Order should have its pickup before delivery (P? before D?) |
| BR-5 | Users may reposition stops after automatic stop creation. |
| BR-6 | Stops without assigned orders shall be automatically removed. Note: Change order (cancel) on one or more of the orders in a multi-stop or aggregation shipment |
| BR-7 | Automatic stop creation (P? or D?) and reordering (by user) should be performed before a Routing call is performed (button is enabled only after user reorganizes the stops; P? and D? have a proper positioning (eg: P1,D3). |
**Sample Mock - Before Stop change (Refer to the VD for details):**
[IMAGE: image-20260828-204317.png]
**Sample Mock - After Stop change** **(Refer to the VD for details):**
[IMAGE: image-20260828-204349.png]


======================================================================
# LINX-15669 — Order Change-Modify Shipment Stops and Prepare Routing Request
======================================================================
status: Final Review | labels: Functional,Refinement_done,VD_Pending

--- DESCRIPTION ---
As a Transportation Planner, I want to modify the shipment stop structure and planning information, So that I can create the desired shipment plan before generating an updated routing response.

--- ACCEPTANCE CRITERIA ---
**Given** the user is reviewing a shipment in the Compare Screen
**When** the user updates stop positions, dates, times, or time zones
**Then** the system shall validate shipment sequencing rules
**And** retain the updated stop structure.
---
**Given** all required stop planning information is available
**When** the user selects **Call Routing**
**Then** the system shall generate a routing request using the latest shipment structure
**And** submit the request to the routing engine.

## Functional Requirements

### 1. Modify Stop Sequence
Users shall be able to reposition Pickup and Delivery stops within the Compare Screen.
The system shall validate stop movements to ensure shipment sequencing rules are maintained.
---

### 2. Stop Sequence Validation
The system shall prevent users from creating an invalid shipment sequence.
Validation rules include:
- An order pickup stop must occur before its corresponding delivery stop.
- A delivery stop cannot be positioned before its associated pickup stop.
- When multiple orders exist within a shipment, all pickups for an order must occur before the delivery for that order.
If a sequence violation occurs, the system shall display an appropriate validation message and prevent the stop movement.
---

### 3. Update Stop Planning Information
Users shall be able to update planning information for each stop.
The following fields shall be editable:
| Field |
| Planned Date |
| Planned Time |
| Time Zone |
---

### 4. Time Zone Defaulting
When a stop is created or displayed:
- The system shall automatically default the Time Zone based on the stop location.
- Users shall be permitted to modify the Time Zone if required.
---

### 5. Routing Readiness Validation
Before Call Routing is executed, the system shall validate that all shipment stops contain:
| Required Field |
| Planned Date |
| Planned Time |
| Time Zone |
The system shall prevent routing when required information is missing.
---

### 6. Call Routing
The Compare Screen shall provide a **Call Routing** action.
When selected, the system shall generate a routing request using the current shipment structure.
---

### 7. Routing Request
The routing request shall use the latest shipment structure available within the Compare Screen, including:
- Automatically created stops
- Repositioned stops
- Added orders
- Removed orders
- Updated planning information
The routing request is for the adjusted stops. If user, readjust these stops or removes an order and calls routing, a new route list with options is generated.

### 8. Planning Date
Date Type and planning date information is displayed on the screen for each order. After readjusting the stops and entering Planned Date/Time/Time Zone, if any of the order constraints are not met, those orders parameters on the order are highlighted.
| Order | Anchor Type | Earliest Ship | Latest Ship | Earliest Delivery | Latest Delivery |
| O1 | RDD | 7/10/2026 9:00 CST | 7/10/2026 9:00 CST | 7/14/2026 9:00 CST | 7/14/2026 9:00 CST |
| O2 | SSD | 7/9/2026 9:00 CST | 7/11/2026 9:00 CST | 7/10/2026 9:00 CST | 7/20/2026 9:00 CST |
| O3 | RDD | 7/8/2026 9:00 CST | 7/10/2026 9:00 CST | 7/14/2026 9:00 CST | 7/14/2026 9:00 CST |
| O4 | RDD | 7/10/2026 9:00 CST | 7/15/2026 9:00 CST | 7/12/2026 9:00 CST | 7/15/2026 9:00 CST |
Eg:
O2 in P2 has Planned date of 7/12/2026 9:00 CST, then it doesn't meet the constraints of O2  earliest and latest ship date. So, these 2 parameters are highlighted on the table.
| **Rule ID** | **Business Rule** |
| BR-1 | Users may reposition shipment stops within the Compare Screen. |
| BR-2 | Pickup for an order must always occur before its corresponding delivery. |
| BR-3 | Stop sequence changes that violate shipment rules shall not be permitted. |
| BR-4 | Planned Date, Planned Time, and Time Zone are required before Call Routing can be executed. |
| BR-5 | Time Zone shall default based on stop location but remain user editable. |
| BR-6 | Call Routing shall use the latest shipment structure and planning information available in the Compare Screen. |
| BR-7 | Planning Date constraints are checked as per the rule above. |
| BR-8 | Planning Date constraint violations shall be informational only and shall not prevent the user from executing Call Routing. |


======================================================================
# LINX-15670 — Order Change-Call Routing and Review Tender Options
======================================================================
status: Final Review | labels: Functional,Refinement_done,VD_Pending

--- DESCRIPTION ---
As a Transportation Planner, I want to call Routing after organizing the shipment stops and review the generated tender options, So that I can understand the transportation impact of my stop changes and compare the new transportation plan against the current plan before making a tendering decision.

--- ACCEPTANCE CRITERIA ---

### Given
- The user has completed shipment stop modifications.
- The shipment stop sequence is valid.

### When
The user clicks **View Routing **(View Routing is calls Routing service, fetches New Routing list and displays to the user)

### Then
- The system shall call the Routing service using the updated stop sequence.
- The View Routing button shall be disabled until the stop sequence is valid (No P? or D? at stop section) & Date/Time information in the stop is updated or available.
- Once the user updates the stops and the Date/Time (Pickup and Delivery date Time according to the stops) then shall click on ‘**View Routing**’ button to generate transportation options based on the updated shipment.
- The system shall populate the New-Distance section using the routing response (if at least 1 carrier option returned).
- The system shall calculate intermediate distances between shipment stops.   (Refer code 15 and 16)
- The user shall be able to review the generated transportation options (just the new Options list including Dropped Carrier -  as per the story  )
---

## Business Rules
| # | Rule |
| 1 | View Routing is enabled only when the shipment stop sequence is valid and Date/Time is available. |
| 2 | Routing shall use the current stop sequence and Date/Time. |
| 3 | Overall shipment distance shall be refreshed after successful routing. |
| 4 | Intermediate stop-to-stop distances shall be calculated    (Refer code 15 and 16) |
| 5 | View Routing shall display newly generated tender list; calls routing and displays routing (same as in story |
| 6 | user reviews the Options and the make a decision by clicking on- 'Save' action (Refer story for more details on options available on Save action  ) |
**Example mock for reference. Refer to VD for actual screen details:**
[IMAGE: image-20260828-212959.png]


======================================================================
# LINX-15671 — Order Change - Save Stop Changes and Determine Next Tender Action
======================================================================
status: Final Review | labels: Functional,Refinement_done,VD_Pending

--- DESCRIPTION ---
As an Odyssey One user, I want to save the updated shipment routing results after completing stop changes, so that I can either review and manage the current tendered carrier or proceed directly to the Tender screen based on the shipment's new Tender List.

--- ACCEPTANCE CRITERIA ---

## Acceptance Criteria
- **Given** the user has completed the stop changes, reviewed the updated routing results, and clicked **Save**
- **When** the system evaluates the shipment's current tender status
- **Then** the system should either present the Current Tender Decision flow for shipments with an existing tender, or navigate the user directly to the Tender screen when no active tender exists
---

## Business Rules
- When the user clicks **Save**, the updated stop changes and routing results shall be saved.
- The system shall determine whether the shipment currently has an active tender.
- An active tender is a tender in one of the following statuses:
  - To Be Tendered
  - Sent
  - Accepted

### Scenario A - Existing Tender Present
- If an active tender exists on the shipment, the user shall be presented with the **Current Tender Decision** screen.
- The purpose of this step is to allow the user to determine how the currently tendered carrier should be handled (Cance Tender to Carrier, Re-tender to Carrier or Bypass Tender)
- All business logic, validations, user actions, and processing associated with the Current Tender Decision screen are covered under  (Same rules to be implemented for Scenario A)

### Scenario B - No Existing Tender Present
- If no active tender exists on the shipment, including the following scenarios:
  - Tender process has not been started.
  - All routing options have been exhausted.
  - Shipment is in Review status with no tender activity (other status than ‘To be tendered’, ‘Accepted’ or ‘Sent’).
- The Stop Change Review screen shall be closed.
- The user shall be navigated directly to the **Tender** screen.
- The newly generated routing results and tender version created from the stop change process shall be available on the Tender screen for user review (V2 (new) and V1(prior). V2 is on the top)
- Shipment status shall remain in **Review**.
- No tender action shall be automatically initiated by the system.
- The user must manually perform the next tender-related action from the Tender screen.

### Additional Rules
- The new routing results generated from the stop change process shall be retained and available regardless of whether Scenario A or Scenario B is executed.
- Navigation to the Current Tender Decision screen or Tender screen shall occur only after the stop changes and routing results are successfully saved.


======================================================================
# LINX-15869 — Order Change-Remove Orders from Shipment During Order Change Review
======================================================================
status: Final Review | labels: Functional,Refinement_done,VD_Pending

--- DESCRIPTION ---
As an Odyssey One user, I want to temporarily remove orders from a shipment during the Order Change Review process, so that I can evaluate shipment modifications, review routing impacts, and finalize the updated shipment structure before committing the changes.

--- ACCEPTANCE CRITERIA ---
**Given** the user is reviewing orders within the Order Change Review screen,
**When** the user removes one or more orders from the shipment,
**Then** the selected orders should be temporarily removed from the shipment, moved to the Search & Add Orders section, the stop sequence should be recalculated, and the user should be able to review routing before saving the shipment changes.

### Business Rules
- The Orders section (refer sample mock / VD) shall display all orders currently associated with the shipment.
- The user shall have the ability to remove an order from the shipment using the **Remove** action.
- When an order is removed:
  - The order shall be removed from the Orders section.
  - Associated pickup and delivery stops shall be removed from the shipment stop sequence.
  - The order shall be moved to the **Search & Add Orders** section.
  - The removal is considered a temporary working change and shall not update the shipment in the database.
- Removed orders shall remain available within the **Search & Add Orders** section and may be added back to the shipment prior to saving.
- The shipment must always contain at least one order.
- The user shall not be allowed to remove the last remaining order from the shipment.
- For shipments that originated as:
  - Aggregation Consolidation
  - Multi-Stop Consolidation
  the final remaining order cannot be removed from the shipment.
- When only one order remains on the shipment:
  - The **Remove** action shall be disabled (greyed out).
  - The following tooltip shall be displayed:
  **"The last remaining order cannot be removed from the shipment."**
- Following any order removal, the shipment stop sequence shall be recalculated and renumbered.
- Stop numbering shall remain sequential without gaps.
  Examples:
  - P1, P2, P3 → P1, P2
  - D1, D2, D3 → D1, D2
- Once the user has completed the stop modifications (no stop has P? or D?), shipment stop structure is finalized (organizing the Pickup and Delivery stops) and each stop had Date/Time available, the **View Routing** button shall be enabled.
- The user must execute **View Routing** to evaluate carrier options based on the updated shipment structure before shipment changes can be saved.
- The **Save** button shall remain disabled until the user successfully completes the **View Routing** process.
- If the user performs any additional shipment modifications after routing has been viewed, including:
  - Removing an order
  - Re-adding an order
  - Rearranging stops
  - Changing Date/Time
  - Any other stop-related modification
  then:
  - Previously generated routing results shall be considered no longer valid.
  - The **Save** button shall be disabled.
  - The **View Routing** button shall remain enabled.
  - The user must execute **View Routing** again based on the latest shipment stop structure.
  - Upon successful completion of the routing evaluation, the **Save** button shall be re-enabled.
- The shipment shall remain eligible for routing only when:
  - At least one order remains on the shipment.
  - A valid stop sequence exists.
- Shipment changes are committed only when the user clicks **Save**. Save action triggers separate workflow which is covered by story
- Upon Save:
  - Removed orders shall be permanently removed from the shipment. (Follows existing LINX Phase 1 process; creates new shipment and moves the order to the new shipment. Also, subject the shipment to Optimization evaluation)
  - Shipment stop information shall be updated using the final stop sequence.
  - Shipment order composition shall reflect the finalized structure presented to the user.
- Until Save is performed (and subsequent action completed; refer story ), all order removals and stop changes shall remain in a temporary review state and shall not update the underlying shipment.
**Rough Mock - Refer VD for final design:**
[IMAGE: image-20260829-160103.png]


======================================================================
# LINX-15870 — Order Change - Search and Select Orders from Other Shipments
======================================================================
status: Final Review | labels: Functional,Refinement_done,VD_Pending

--- DESCRIPTION ---
(none)

--- ACCEPTANCE CRITERIA ---
As an Odyssey One user, I want to search and select orders from other shipments during the Order Change Review process, so that I can temporarily reference eligible orders from the same customer and evaluate them as part of the current shipment without modifying the source shipments.

## Acceptance Criteria
**Given** the user is in the **Search & Add Orders** section of the Order Change Review screen,
**When** the user searches for orders using the available filter criteria and selects one or more orders from the search results,
**Then** the system should allow the user to select a maximum of five orders at a time and place the selected orders in the **Search & Add Orders** section with an **Add** action, without removing the orders from or modifying their current shipments.
**And** the search results should include only orders belonging to the same customer as the current shipment and should exclude orders already associated with the current shipment.

## Business Rules

### Search Orders
- The **Search & Add Orders** section shall allow the user to search for orders associated with other shipments.
- The search functionality is used to identify orders that the user may want to include in the current shipment as part of a what-if scenario.
- Orders may be searched from shipments in any of the following Shipment Statuses:
  - HOLD
  - Consolidation
  - Review
  - Process Auto Tendering
  - Approved
  - SpotBid
  - Bid Review
  - Done
- Orders already associated with the current shipment shall not be displayed in the search results.
- Searching for or selecting an order shall not:
  - Remove the order from its current shipment.
  - Add the order directly to the current shipment.
  - Modify the source shipment.
  - Modify the current shipment.
- The actual movement of external orders shall occur only when the complete Order Change Review is finalized and saved. Final movement and ‘Save’ validation are covered in a separate story (Refer story  )

### Customer Restriction
- The **Customer** filter shall default to the Customer Name and Customer ID associated with the current shipment.
- The Customer filter shall restrict the search results to orders belonging to the same customer as the current shipment.
- Orders belonging to another customer shall not be displayed in the search results.
- By default, the grid shall display all available orders belonging to the current customer, except orders already associated with the current shipment.
- The customer restriction shall remain applicable when the user applies any additional filter criteria.

### Filter Orders
The user shall be able to refine the order search using the following filter criteria:
| Filter Order By | Search Criteria |
| Customer | Defaults to the Customer Name and Customer ID of the current shipment |
| Order # | Order Number |
| Buy Shipment | Buy Shipment Number |
| Ship Date | Order Ship Date |
| Delivery Date | Order Delivery Date |
| Origin | Site ID, City, State, ZIP Code, or Country (should be able to enter all or few data under origin and perform filter/search) |
| Destination | Site ID, City, State, ZIP Code, or Country (should be able to enter all or few data under destination and perform filter/search) |
| Shipment Status | Status of the shipment currently containing the order |
| Tender Status | Tender Status of the shipment currently containing the order |
- The user shall be able to apply one or more filter criteria to narrow the search results (applicable for all fields except customer which will be defaulted to the shipment under Order review)
- When the user confirms the filter criteria, the search results grid shall be refreshed to display the matching orders.
- The screen structure and filter component behavior shall follow the approved UX design.

### Search Results Grid
The search results grid shall display the following columns:
| Column |
| Customer |
| Origin |
| Destination |
| Order # |
| Order Weight (with UoM) |
| Order Volume (with UoM) |
| Buy Shipment |
| Shipment Status |
| Tender Status |
| Shipment Type |
| Orders in the Shipment (All orders in that buy Shipment) |
- The grid shall display orders matching the applied filter criteria.
- The grid shall not display:
  - Orders belonging to another customer.
  - Orders already associated with the current shipment.
- The grid structure and field presentation shall follow the approved UX design.
- default sorting on the grid will be by ‘Buy Shipment’ (Ascending)

### Select Orders
- The user shall be able to select one or more orders from the search results grid.
- The user shall be able to select a maximum of **five orders at a time**.
- The system shall prevent the user from selecting more than five orders in a single selection action.
- When the user selects the orders and clicks **Add** within the search results:
  - The selected orders shall be placed in the **Search & Add Orders** section.
  - Each selected order shall display an individual **Add** action (within the Search and Add section - Refer Mock).
  - The selected orders shall not be automatically added to the Orders or Stops sections.
  - The selected orders shall remain associated with their existing shipments.
  - The source shipments shall remain unchanged.

### Order Information in Search & Add Orders Section
- Orders selected from the search results shall be displayed in the **Search & Add Orders** section.
- Each selected order shall display:
  - Order Number.
  - An individual **Add** action.

### Save Validation Note
- The system shall revalidate external orders and their associated shipments before the Order Change Review is saved.
- If an order cannot be moved because of its source Shipment Status or an active tender or bid process, the following validation message shall be displayed:
  **The selected order cannot be moved because its current shipment is approved, completed, or involved in an active tender or bid process. Edit the source shipment or cancel the applicable tender or bid action before moving the order.**
- Final Save validation and movement of an order from its source shipment to the current shipment are covered in a separate story.
**Example Mock - Refer to VD for Details:**
[IMAGE: image-20260829-172938.png]


======================================================================
# LINX-15871 — Order Change-Add Selected Orders to the Orders and Stops Sections
======================================================================
status: Final Review | labels: Functional,Refinement_done,VD_Pending

--- DESCRIPTION ---
As an Odyssey One user, I want to add selected orders from the Search & Add Orders section into the current shipment structure, so that I can evaluate different shipment configurations, create or associate shipment stops as required, and review the impact before finalizing the shipment changes.

--- ACCEPTANCE CRITERIA ---
**Given** the user has selected one or more orders in the **Search & Add Orders** section,
**When** the user clicks **Add** for an order,
**Then** the order should be added to the Orders section, associated with existing shipment stops where applicable or assigned to newly created pickup and delivery stops, and made available as part of the current shipment what-if scenario without modifying the source shipment.

### Business Rules
- Orders displayed in the **Search & Add Orders** section may originate from:
  - Orders removed from the current shipment.
  - Orders selected from external shipments using the search functionality.
- Every order displayed in the Search & Add Orders section shall display an **Add** action.
- Clicking **Add** shall:
  - Remove the order from the available Search & Add Orders list.
  - Add the order to the Orders section.
  - Add the order to the shipment stop structure.
  - Trigger evaluation of the order's pickup and delivery locations against the current shipment stops.

### Existing Stop Association
- When the order's pickup location matches an existing pickup stop location:
  - The order shall be associated with the existing pickup stop.
  - The order shall be displayed together with any existing orders assigned to the same pickup stop.
- When the order's delivery location matches an existing delivery stop location:
  - The order shall be associated with the existing delivery stop.
  - The order shall be displayed together with any existing orders assigned to the same delivery stop.
- A new stop shall not be created when a matching stop location already exists.

### New Stop Creation
- When the order's pickup location does not match an existing pickup stop:
  - A new pickup stop shall be created.
  - The stop shall be displayed as **P?**.
- When the order's delivery location does not match an existing delivery stop:
  - A new delivery stop shall be created.
  - The stop shall be displayed as **D?**.
- A single order may:
  - Use an existing pickup stop and existing delivery stop.
  - Use an existing pickup stop and create a new delivery stop.
  - Create a new pickup stop and use an existing delivery stop.
  - Create a new pickup stop and create a new delivery stop.

### New Stop Initialization
- Newly created **P?** and **D?** stops shall remain unsequenced until finalized by the user.
- The Date, Time, and Time Zone fields for newly created stops shall be blank.
- The user shall be responsible for selecting and finalizing:
  - Pickup Date
  - Pickup Time
  - Pickup Time Zone
  - Delivery Date
  - Delivery Time
  - Delivery Time Zone
- Stop date and time entry is covered in a separate story.

### Orders Section Updates
- Once added, the order shall immediately become visible within the Orders section.
- The Orders section shall reflect the latest shipment composition during the current review session.
- Orders added from external shipments shall participate in shipment evaluation the same way as orders originally assigned to the shipment.

### What-If Scenario Processing
- Adding an order from an external shipment shall not immediately remove the order from its source shipment.
- The source shipment shall remain unchanged during the Order Change Review process.
- The source shipment shall continue to display and process the order until the current shipment changes are saved successfully.
- The current shipment shall treat the order as part of a temporary shipment configuration for routing and shipment review purposes.

### Stop Finalization
- Newly created stops shall be available for:
  - Re-sequencing
  - Replacement within the stop order
  - Stop consolidation where appropriate
  - Date and time assignment
- The user shall finalize the shipment stop sequence before routing can be performed.

### Routing Validation
- Adding an order shall be considered a shipment structure change.
- Once the user has finalized the updated stop sequence, the **View Routing** button shall be enabled.
- The user must execute **View Routing** after adding orders before the shipment can be saved.
- The **Save** button shall remain disabled until routing is completed successfully.

### Subsequent Shipment Changes
- If the user performs additional shipment modifications after routing has been viewed, including:
  - Adding another order
  - Removing an order
  - Re-adding an order
  - Rearranging stops
  - Updating the stop sequence
  then:
  - Existing routing results shall be considered outdated.
  - The **Save** button shall be disabled.
  - The **View Routing** button shall remain enabled.
  - The user must execute **View Routing** again using the latest shipment structure.
  - The **Save** button shall be re-enabled only after routing has been successfully completed.

### Save Processing
- Orders added from external shipments shall remain part of a temporary what-if shipment structure until Save is performed.
- No updates shall be made to:
  - The source shipment.
  - Shipment order assignments.
  - Shipment ownership.
- Final movement of orders from external shipments and shipment validation during Save are covered in a separate story.

### Audit
- The system shall maintain audit information for:
  - Order added to shipment.
  - Stop associations created.
  - New stops created.
  - Order removed from Search & Add Orders section.
  - Stop sequence changes resulting from added orders.
- Audit information shall be available for troubleshooting and shipment history review.
**Example Mock below-Refer to VD for exact screen:**
[IMAGE: image-20260829-173042.png]


======================================================================
# LINX-15872 — Order Change-Validate and Move External Orders During Save
======================================================================
status: Final Review | labels: Functional,Refinement_done,VD_Pending

--- DESCRIPTION ---
As an Odyssey One user, I want the system to validate and move external orders to the current shipment when I save the Order Change Review, so that only eligible orders are removed from their source shipments and committed to the finalized Orders and Stops structure.

--- ACCEPTANCE CRITERIA ---
**Given** the user has added one or more orders from other shipments to the current shipment as part of the what-if scenario,
**When** the user finalizes the stops, completes **View Routing**, and clicks **Save**,
**Then** the system should validate the latest Shipment Status and Tender Status of each external order, prevent Save when any order is not eligible to be moved, and permanently move all eligible orders from their source shipments to the current shipment based on the finalized Orders and Stops structure.

## Business Rules

### Save Prerequisites
- External orders selected and added during Order Change Review shall remain associated with their source shipments until the user clicks **Save**.
- Before **Save** is enabled:
  - At least one order must remain in the current shipment.
  - All stops must be finalized and sequentially numbered as **P1, P2, D1, D2**, and so on.
  - The user must complete **View Routing** against the latest Orders and Stops structure.
- If the user adds or removes an order, rearranges a stop, or makes another stop-related change after completing **View Routing**:
  - The **Save** button shall be disabled.
  - The **View Routing** button shall be enabled.
  - The user must complete **View Routing** again before **Save** is enabled.

### External Order Revalidation
- When the user clicks **Save**, the system shall revalidate each external order using its latest information.
- The validation shall be performed against the order and its current source shipment, regardless of the Shipment Status or Tender Status displayed when the order was originally searched or selected.
- The system shall validate that:
  - The order remains associated with the source shipment from which it was selected.
  - The order is still eligible to be moved.
  - The source Shipment Status permits the order to be moved.
  - The source shipment is not involved in a tender or bid process that prevents the order from being moved.
- The Save validation shall apply only to orders added from another shipment. Orders removed and re-added to the current shipment shall not be treated as external orders.

### Restricted Shipment and Tender Statuses
- The system shall prevent the order from being moved when its current source Shipment Status is:
  - Approved
  - Done
  - SpotBid
  - Bid Review
- The system shall also prevent the order from being moved when an applicable tender or bid action must first be canceled.
- When an external order fails validation (meeting above requirement), the system shall display the following message:
  **The selected order cannot be moved because its current shipment is approved, completed, or involved in an active tender or bid process. Edit the source shipment or cancel the applicable tender or bid action before moving the order.**
  **Order impacted:** Order # (list all external/other shipment orders impacted by this validation)
- The validation should identify the impacted **Order #** when one or more selected orders fail validation.

### Save Failure
- If any external order fails validation:
  - The complete Save action shall be prevented.
  - No external orders shall be moved.
  - No orders shall be removed from their source shipments.
  - The current shipment shall not be updated.
  - The source shipments shall remain unchanged.
  - The user shall remain on the Order Change Review screen.
  - The user’s pending changes shall remain available for correction and review.
- The system shall not partially save or partially move eligible external orders when another external order fails validation.

### Successful Order Movement
- When all external orders pass validation, the system shall complete the Save action using the finalized what-if shipment structure.
- For each eligible external order, the system shall:
  - Remove the order from its source shipment.
  - Add the order to the current shipment.
  - Associate the order with the pickup and delivery stops finalized by the user.
  - Update the current shipment’s Orders section.
  - Update the current shipment’s Stops section.
- An order assigned to an existing stop during the what-if scenario shall remain associated with that stop after Save.
- An order assigned to a newly created pickup or delivery stop shall be saved using the stop number, sequence, Date, Time, and Time Zone finalized by the user.

### Source Shipment Update
- Each source shipment shall be updated to reflect the removal of the moved order.
- Only orders successfully moved to the current shipment shall be removed from their source shipments.
- Orders remaining on the source shipment shall not be changed as part of this Save action.
- The final source shipment structure shall reflect its remaining orders after the external order movement is completed.

### Current Shipment Update
- The current shipment shall be updated using the finalized:
  - Order composition.
  - Pickup and delivery stop associations.
  - Stop numbers.
  - Stop sequence.
  - Stop Date, Time, and Time Zone information.
  - Routing selection completed against the latest shipment structure.
- After a successful Save, the temporary what-if structure shall become the committed shipment structure.

### Transaction Processing
- Removal of the orders from the source shipments and addition of the orders to the current shipment shall be processed as one Save transaction.
- If the system cannot complete the movement of all eligible external orders:
  - The Save action shall not be completed.
  - The current shipment shall remain unchanged.
  - The source shipments shall remain unchanged.
  - The system shall not leave an order partially moved between shipments.

### Audit and Logging
- The system shall maintain logs for each external order moved during Save.
- The logs shall capture:
  - Order #.
  - Source shipment.
  - Current shipment receiving the order.
  - Previous pickup and delivery stop associations.
  - Final pickup and delivery stop associations.
  - Shipment Status and Tender Status evaluated during Save.
  - Date and time of the Save action.
  - User who completed the Save action.
  - Save result.
- If Save fails, the system shall log the impacted order and the validation or system error that prevented the order movement.
**Example Mock Below-Refer to VD for details:**
[IMAGE: image-20260829-173115.png]
