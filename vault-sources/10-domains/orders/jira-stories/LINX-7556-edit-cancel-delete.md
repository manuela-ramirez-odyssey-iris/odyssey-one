# LINX-7556 — Manual Order - Edit, Cancel and Delete Order

**Status:** New  
**Jira:** https://odysseylogistics.atlassian.net/browse/LINX-7556  
**Child stories:** 5

## Epic Description

Edit and Update:
This EPIC introduces the functionality to edit and update details in a manually created order. Users will have the option to modify order details, with business rule validations applied during the update process. These validations will determine if the changes are minor or major, ensuring that all updates comply with the necessary business rules. Additionally, any updates will be passed on to downstream domains if necessary

Delete:
This EPIC introduces the functionality for users to delete a manually created order. Users will be able to delete an order by following certain conditions or taking necessary steps. This ensures that orders can be removed from the system when required, maintaining data accuracy and integrity.

Cancel:
This EPIC introduces the functionality for users to cancel a manually created order. Upon selecting the cancellation option, the system will perform validations to determine if the order can be canceled. If the order meets the cancellation criteria, it will be marked as canceled.

---

# Stories

## LINX-10248 — Order Overview/Summary Page - Post Order Creation Actions - Edit Order

**Status:** Architecture/Tech Design  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page is a one page snapshot of all orders, important information about the order & next action to be taken for the order. 'Order Actions' is the last column in the Order Overview/Summary Page and has a list of actions, the user can perform **post order creation.** This story describes the **order editing functionality**

---

## LINX-10258 — Order Overview/Summary Page - Post Order Creation Actions - Cancel / Restore Order

**Status:** Architecture/Tech Design  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page is a one page snapshot of all orders, important information about the order & next action to be taken for the order. 'Order Actions' is the last column in the Order Overview/Summary Page and has a list of actions, the user can perform **post order creation.** This story describes the **order cancellation** **functionality**

---

## LINX-10795 — BE - Implement API to Cancel Order (LINX-10258)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Need to implement API to Cancel an Order and the updates Order message to Shipment and NN

Endpoint: /order-service/v3/order/cancel | POST
Request: { "orderNumber": "string", "customerId": "string" }
Response: { "orderId": <order Id>, "message": "Order <order number> cancelled successfully" }

---

## LINX-10796 — BE - Implement API to restore a cancelled Order (LINX-10258)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Need to implement API to restore the cancelled order and the update needs to pass to Shipment and NN Kinesis

Endpoint: /order-service/v3/order/restore | POST
Request: { "orderNumber": "string", "customerId": "string" }
Response: { "orderId": <order Id>, "message": "Order <order number> restored successfully" }

---

## LINX-10922 — LLD - Analysis, LLD and Tech stories identification for LINX-10248, LINX-10258 and LINX-10300

**Status:** In Development  
**Type:** Task  
**Labels:** BE

Needs to understand the story requirement and prepare LLD and Technical stories identification for BE.
Get the Approval by ARB review and team walkthrough once the LLD is ready.

---
