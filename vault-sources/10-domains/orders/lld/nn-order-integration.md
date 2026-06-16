---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2689990666/1+NN+Order+Integration
page_id: "2689990666"
title: "1 NN Order Integration"
space: TMS
fetched: "2026-06-11"
domain: orders
type: lld
tags: [nn, netnative, order-integration, linx, order-service, visibility]
status: raw
---

**Background**: Customers need to be provided with their Order information in NN throughout the shipment lifecycle:

As Customer Orders are sent to TMS and passed to Linx. we need to pass the Order to NN to provide the customer with visibility to the Order. 

‌

**Description**:

As Customer orders are made available in Linx they should be passed to NN. 

* The orders will initially be passed to NN in the existing Statius
* Orders will be updated in NN visibility throughout the Shipment planning and execution phase
* As orders are moved to tender accepted according to the ODY Buy Shipments, we can update Sell Shipment data available to the order: Sell Shipment ID, Carrier, AR Rates (TBD)

 

**Acceptance Criteria**

**Given:** An Order is created in Linx the Order should be a passed to NN for customer visibility  

**When:** The order is created in Linx and as updated through planning and execution lifecycle  

**Then:** Create / Update order from Linx to NN

 

\*OPEN - What should display to the customer as it relates to each integration and associated status?

\*OPEN- How does the customer display change if it is Network Leverage, Cross Customer, etc?
