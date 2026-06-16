# LINX-7555 — Order Life Cycle

**Status:** New  
**Jira:** https://odysseylogistics.atlassian.net/browse/LINX-7555  
**Child stories:** 42

## Epic Description

This epic aims to implement a structured and transparent order life cycle, that supports end-to-end order processing.

This epic introduces a standardized set of order life cycle statuses that describe an order's journey from creation to completion (shipment planning) or termination (cancellation).

Implementing this lifecycle ensures that orders transition through stages in a streamlined, predictable, auditable, and automated manner. It also provides consistent visibility for customers, operations, shipments domain and planners.

Based on the current status, action(s) will be taken, so that the order moves to the subsequent stages in its lifecycle. Order statuses may also be used for audit purpose.

The following statuses are in scope for this epic:

| **Order Status** | **Status Description** |
| --- | --- |
| **~~New~~** | ~~A new order has been received/created but is not yet ready for planning, due to planning lead time not being met.~~ |
| **Ready for Planning** | ~~The planning lead time has been met~~ A new order has been received/created & the order is ready for planning |
| **Planned Load** | The order is a part of a planned load |
| **Planning Failed** | The order is a part of a load that failed planning |
| **Planned Shipment** | The order is a part of a planned shipment |
| **Shipment Failed** | The order is a part of a shipment that is in "failed" status |
| **Cancelled** | The entire order has been cancelled, via integration or by user action |
| **Hold** | The entire order has been placed on hold, via integration or by user action |

**Note - Please omit the 'New' status for now. All new orders should directly go to 'Ready for Planning'**

---

# Stories

## LINX-5977 — Order - No Routing  - Automated Shipment 

**Status:** On Hold  
**Type:** Story  
**Labels:** —

* No Routes

    * In future users will not be managing Loads in O2, If Load planning fails in O2, we should create a Shipment from the Load in a Status of ‘ Review - No Routing Options' ‘with No Carrier Assigned. This Shipment can then be actioned by Planners to Send to Loadboard or Create and Overflow bidding event
    * Placeholder – in future we can link to Customer profile determine if we automatically send to Loadboard

---

## LINX-6001 — Order Lifecycle for Integrated Orders

**Status:** Blocked  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

As an OdysseyONE Orders user, I want status of integrated orders to be updated automatically based on actions performed at the order level or at the shipment level, so that correct status of the order is displayed.

---

## LINX-6048 — BE-Order Life Cycle-Cancel Order (OTMS -274)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Create api endpoints to cancel orders created by integrated and manual process. And log the action in Audit table.

---

## LINX-6052 — BE-Order Life Cycle-NEW Order Status (OTMS -315) (Manual and Integrated) (OTMS-274)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

To save orders when you create/edit orders

order_status='NEW'

---

## LINX-6055 — BE-Order Life Cycle-Manual Order processing-Delete Order (OTMS-275)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Create api endpoints to delete the manual order.  
  
DELETE : /order-service/v1/order/{orderId}

---

## LINX-6081 — Order Life Cycle for Manual Orders

**Status:** In Development  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

As an OdysseyOne Orders user, I want status of the manual orders to be updated automatically based on actions performed at the order level or at the shipment level, so that correct status of the order is displayed.

---

## LINX-6082 — Order status update to 'Hold' for Manual & Integrated Orders

**Status:** Analysis  
**Type:** Story  
**Labels:** —

As a user, I want order status for Manual & Integrated orders to be updated as ‘Hold’ based on actions in the orders & shipments domain and be displayed as “Hold”

---

## LINX-6088 — Order Life Cycle for Manual Orders - Ready for Planning & Cancel 

**Status:** Canceled  
**Type:** Story  
**Labels:** —

As a user, I want order status for Manual orders to be updated as ~~‘New’~~ ‘Ready for Planning’ or ‘Cancelled’ based on actions in the orders and/or shipments domain and be displayed as ~~'New'~~ ‘Ready for Planning’ and ‘Cancelled’ respectively.

‘New' order status can be omitted for now.

---

## LINX-6089 — Order Life Cycle for Integrated Orders - New and Cancel

**Status:** Done  
**Type:** Story  
**Labels:** Approved, BE_LLD, OTMS_Phase1, Refinement_done

As an OTMS user, I want order status for Integrated orders to be updated automatically based on actions performed at the order level or in downstream applications so that correct status of the order is available in OTMS.

---

## LINX-6140 — Order Life Cycle for Integrated Orders

**Status:** Analysis  
**Type:** Story  
**Labels:** OTMS_Phase1

As a user, I want status of the integrated orders to be updated automatically based on actions performed at the order level or at the shipment level, so that correct status of the order is displayed.

---

## LINX-6189 — Integrated and Manual Order Audit Trail

**Status:** Todo  
**Type:** Story  
**Labels:** —

A detailed log of all changes and actions taken on each order, including user, timestamp, and action type, to support compliance and traceability.

---

## LINX-7581 — Verify if Integrated Orders should not be created with 'Cancelled' status by having the delete flag as 'Y' from postman.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders should not be created with 'Cancelled' status by having the delete flag as 'Y' from postman.

---

## LINX-7582 — Verify if Integrated Orders can be updated multiple times by having the delete flag as 'N' for updating any other fields.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders can be updated multiple times by having the delete flag as 'N' for updating any other fields.

---

## LINX-7593 — Verify if 'New' and 'Cancelled' Integrated Orders are available in OTMS database with order_status_id column as '3' and '2' respectively.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if 'New' and 'Cancelled' Integrated Orders are available in OTMS database with order_status_id column as '3' and '2' respectively.

---

## LINX-7604 — Verify once if a Integrated Order is 'Cancelled' it should not be invoked deletion is not allowed.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify once if a Integrated Order is 'Cancelled' it should not be invoked deletion (not a status but an action) is not allowed.

---

## LINX-7605 — Verify if Integrated Orders created with 'New' status should be auto-accepted as they are sent and applied to the order.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders created with 'New' status should be auto-accepted as they are sent and applied to the order.

---

## LINX-7607 — Verify if "Order Created Successfully" response message received upon posting an Integrated Order with delete flag as 'N'.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if "Order Created Successfully" response message received upon posting an Integrated Order with delete flag as 'N'.

---

## LINX-7609 — Verify if "Order Cancelled Successfully" response message received upon posting an Integrated Order with delete flag as 'Y'.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if "Order Cancelled Successfully" response message received upon posting an Integrated Order with delete flag as 'Y'.

---

## LINX-7906 — Create /Update Load from Order

**Status:** Todo  
**Type:** Story  
**Labels:** —

Order Domain will need to Create and Update Loads as a result of order creation and updates

---

## LINX-7945 — Status Changes in Shipments Affecting Order Statuses

**Status:** Canceled  
**Type:** Story  
**Labels:** Approved

As an OdysseyOne Orders user, I want status of orders to be updated automatically based on actions performed at the shipment level, so that correct status of the order is displayed.

---

## LINX-8046 — Odyssey One Phase 2 Epic High-Level Estimation.

**Status:** Todo  
**Type:** Story  
**Labels:** BE

Odyssey One Phase 2 Epic High-Level Estimation.

---

## LINX-8047 — Create HLD for Odyssey One Phase Order Life Cycle

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Create HLD for Odyssey One Phase Order Life Cycle

---

## LINX-8049 — BE - Order creation with default status

**Status:** Closed  
**Type:** Story  
**Labels:** BE

All integrated orders being received in the system, for the first time (after validation checks) by default, will move to “Ready For Planning” status  
  

**Note:** ‘New’ order status can be ignored for now. All orders, received for the first time, should directly be displayed as ‘Ready for Planning’

---

## LINX-8050 — BE - Integration of Order Status components into integrated Order creation flow (LINX-6001)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Need to integrate all the Order Status components to the Order creation flow of Integrated Orders like Default flow, Cancel, Hold, Load update and Shipment update.

---

## LINX-8051 — BE - Order Status Trigger Rules for “Cancelled” States

**Status:** Closed  
**Type:** Story  
**Labels:** BE

**Cancelled Status**

When a customer requests cancellation at any stage of the integrated order lifecycle:

* The order status must be updated to **“Cancelled”**.
* Cancelled orders are **null and void** and cannot be reinstated or reprocessed.
* No further workflow steps must execute after cancellation.
* No modifications are allowed on cancelled orders.
* Cancellation can occur from _any_ of the 6 other lifecycle statuses (e.g., Created, Confirmed, Planned Load, Planned Shipment, etc.).

---

## LINX-8060 — BE - Order Status Trigger Rules for “Hold” States (LINX-6001)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

**Hold Status**

* When a customer requests to temporarily pause order processing:
* The order status must change to **“Hold”**.

    * Once released from hold, the workflow must resume from the **previous valid status**.
    * Orders in **Planned Load** can be moved to Hold.
    * Orders in **Planned Shipment** can be moved to Hold.

---

## LINX-8292 — DB : Order : Design for AP/AR Charges on Order Header and Line

**Status:** Closed  
**Type:** Task  
**Labels:** —

### Summary

This issue involves designing the Accounts Payable (AP) and Accounts Receivable (AR) charges on the order header and line.

### Context

The design is needed to effectively manage AP and AR charges associated with orders.

‌

‌

---

## LINX-8293 — DB : Order : Design tables to hold charges for AP/AR for header and Line items

**Status:** Closed  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-8356 — BE : Order:  API :  Create status Update API 

**Status:** Closed  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

‌

As a developer, when I create an order, I want to have a status update API so that I can track the status of the order.

### Context

This issue involves the creation of a status update API for the order management system.

‌

---

## LINX-8391 — BE - Create Order API – POST /order with Controller, Service, DAO

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Provide a robust API to create a new Order and persist it into **LINX DB**. The first version will establish a stable **payload contract** and the backend layers (Controller, Service, and DAO), ensuring idempotency, validation, secure access, and auditability. This API will be used by channels/apps to place orders.  

* Define the initial **Order payload contract** for **POST** `/order`.
* Implement **Controller**, **Service**, and **DAO** to persist orders into **LINX DB**.
* Implement **idempotency** via `X-correlation-Id`.
* Basic validations and error handling.
* OpenAPI documentation.
* Unit + integration tests.
* Observability (structured logs + basic metrics).

---

## LINX-8502 — BE : Create a Mapping sheet for OrderOut to Load (LINX-5768) -1

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Create a mapping sheet for the OrderOut system to facilitate the load creation process, as outlined in task LINX-5768. This involves defining the necessary data fields, formats, and relationships to ensure accurate and efficient data transfer.

---

## LINX-8503 — BE : Create a Mapping sheet for OrderOut to Load (LINX-5768) -2

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Create a mapping sheet for the OrderOut system to facilitate the load creation process, as outlined in task LINX-5768. This involves defining the necessary data fields, formats, and relationships to ensure accurate and efficient data transfer.

---

## LINX-8800 — BE - Create a component to send OrderOut message to Kinesis (LINX-6001)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Once Order created and updated in LINX, the Order information needs to send to the Kinesis (**order-events-to-shipmen**).  
  
This component should accept the OrderOut message and should return Kinesis id as an acknowledgement to make sure the message sent successfully to the Queue

---

## LINX-8851 — BE - Enhancement on Order Status Update API (LINX-6001)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Needs to update the Request payload of the status API to add footprints of Load and Shipment in Order header  
  
LLD - [/order-service/v3/order-status](https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2#:~:text=/order%2Dservice/v3/order%2Dstatus)

---

## LINX-8920 — BE - Implement “Release from Hold” Action for Orders on Hold - Manual Order (LINX-6081)

**Status:** Ready for Development  
**Type:** Story  
**Labels:** BE

Currently, when an Order is placed **On Hold**, the workflow is paused. There is a requirement to support a **“Release from Hold”** action that allows the Order to resume processing.

Once an Order is released from hold, the system must continue the workflow from the **last valid status that existed prior to the Hold action**, without resetting or reprocessing completed steps.

* Users should be able to release an Order that is in **On Hold** status.
* After release, the workflow should resume **exactly from the previous valid status**.

‌

**Acceptance Criteria**

* A **Release from Hold** action is available only for Orders currently in **On Hold** status.
* System must persist the **previous workflow status** at the time the Order is put on Hold.
* On Release:

    * Order status transitions back to the **last valid status prior to Hold**
    * Workflow execution resumes from that state
    
* If no valid previous status is found, the release action should fail with a meaningful error.
* Order history/audit should clearly record:

    * When the Order was put on Hold
    * When it was released from Hold
    * Who performed the action
    
* Any downstream events or notifications should be triggered as per the resumed workflow state.

---

## LINX-8921 — BE - Implement “Place on Hold” Order Modification - Manual Order (LINX-6081)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

“Hold” is a supported **Order modification** that allows a user to temporarily pause order processing.

When a user selects an Order in the UI and confirms the **“Place on Hold”** action, the backend must update the Order state to **Hold**, pause the active workflow, and preserve the last valid workflow status so that processing can resume later when the Order is released.  

#### **Acceptance Criteria**

1. A **Place on Hold** action is allowed only for Orders in valid, active states (non‑terminal).
2. On successful action:

    * Order status transitions to **Hold**
    * The workflow execution is paused
    * The **last valid status prior to Hold** is stored for future use
    
3. If an Order is already in Hold status, the action must be rejected with a meaningful message.
4. Order history/audit must record:

    * Timestamp of Hold action
    * Previous status
    * User/system who performed the action
    
5. No downstream processing or state transitions occur while the Order remains on Hold.

---

## LINX-8954 — BE - Implement the logic to save Source System information in Order Staging table (LINX-6001)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Implement the logic to save Source System information in Order Staging table 

* Changes in entity
* Extract Source System information
* Mapping and saving

---

## LINX-8974 — QA Testing for Order Status Flow (LINX-8050, 8051, 8851)

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9031 — QA Testing- Order Creation & Status API (LINX-8049, 8356)

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9397 — QA - Implement “Place on Hold” Order Modification - Manual Order (LINX-6081)

**Status:** Backlog  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9611 — BE - Send OrderOut Message to NN-Kinesis on Order Status Update (LINX-6081)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

The API `order-service/v3/order-status` is implemented to update Order status details along with Shipment/Load footprints within an Order.

Currently, the Order update functionality is working as expected. However, upon successful update of the Order, the system must publish an **OrderOut message to NN-Kinesis** for downstream service consumption.

Note: Since the update is triggered by the Shipment service, **publishing to Shipment-Kinesis is not required** as it would lead to duplicate or unnecessary event propagation.

---

## LINX-11185 — Order Lifecycle during Order Editing (Manual & Integrated Orders) 

**Status:** Analysis  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

This story pertains to the order lifecycle for an order already created in and/or received into OdysseyONE via customer systems (e.g.: ERP systems) should work during editing (making changes). It is important to define the lifecycle so that order changes are controlled, traceable, and do not adversely impact execution or downstream processes.

---
