# LINX-7554 — Order Copy Functionality

**Status:** New  
**Jira:** https://odysseylogistics.atlassian.net/browse/LINX-7554  
**Child stories:** 1

## Epic Description

System should allow users to copy an existing order. When an order is copied, certain fields (like pickup/delivery dates) are removed, while other fields are maintained for reuse (like origin, destination, move direction, Payment terms). This functionality will be especially useful for recurring orders (if the same order needs to be executed multiple times, reusing information like origin, destination, move direction, Payment terms etc.) Once the re-usable fields are auto-populated, the other fields can be entered. "Copied" orders will be treated the same as any other order.

---

# Stories

## LINX-10259 — Order Overview/Summary Page - Post Order Creation Actions - Copy Order

**Status:** Architecture/Tech Design  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page is a one page snapshot of all orders, important information about the order & next action to be taken for the order. 'Order Actions' is the last column in the Order Overview/Summary Page and has a list of actions, the user can perform **post order creation.** This story describes the **order copying** **functionality**

---
