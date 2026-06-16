# LINX-7557 — Order Overview and Actions

**Status:** New  
**Jira:** https://odysseylogistics.atlassian.net/browse/LINX-7557  
**Child stories:** 31

## Epic Description

This epic describes an 'Orders Overview' summary page to display all orders that are in various stages of its lifecycle. There must be a functionality for the user to view, edit and cancel, and delete orders. The page should support filtering, sorting, and searching by key fields to enhance user experience.

---

# Stories

## LINX-6135 — Order - Enable Post Order Creation Actions

**Status:** Todo  
**Type:** Story  
**Labels:** —

As a user, once an order has been created, I should be able to execute actions for the order. These actions include:

* Cancel order
* Create a new shipment and add the order to the shipment
* Assign the order to an existing shipment
* Remove order from an existing shipment  (This action can only be performed on Shipments not in ‘Tendered’ status)

---

## LINX-9896 — Order Management  - Order Overview/Summary Page

**Status:** Architecture/Tech Design  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order

---

## LINX-10233 — Order Overview/Summary Page - Post Order Creation Actions & View Order

**Status:** Architecture/Tech Design  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page is a one page snapshot of all orders, important information about the order & next action to be taken for the order. ‘Order Actions’ is the last column in the Order Overview/Summary Page and has a list of actions, the user can perform **post order creation.** This story describes the **possible actions & the order viewing functionality**

---

## LINX-10265 — LLD - Order Overview/Summary page (LINX-9896)

**Status:** Closed  
**Type:** Task  
**Labels:** BE, BE_LLD

Needs to understand the story requirement and prepare LLD and Technical stories identification for BE.   
Get the Approval by ARB review and team walkthrough one the LLD is ready.

---

## LINX-10285 — Order Management  - Order Overview/Summary Page - View / Apply Filters

**Status:** Architecture/Tech Design  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order. This story talks about **applying filters to show/hide specific orders** in each of the tabs, based on the filter applied.

---

## LINX-10300 — Order Management  - Order Overview/Summary Page - Manage Columns

**Status:** Ready for Grooming  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order. This story talks about **managing columns**

---

## LINX-10700 — BE - Implement API to fetch order details (LINX-10233)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Need to retrieve order details using orderNumber and customerId via a POST API,  
So that I can view accurate and secure order information for a specific customer.

* **Method:** POST
* **Endpoint:** `/order-service/v3/order/view`

**Request Payload:**

```
{
  "orderNumber": "string",
  "customerId": "string"
}
```

  
**Response Payload:**

```
{
  "manualOrder": {
    "orderId": <Long>,
    "sourceOrderNumber": "string",
    "orderNumber": "string",
    "requestedDeliveryDate": "2025-05-16T10:21:10.504Z",
    "requestedDeliveryTimeZoneCode": "string",
    "requestedShipDate": "2025-05-16T10:21:10.504Z",
    "requestedShipTimeZoneCode": "string",
    "requestedPickupDate": "2025-05-16T10:21:10.504Z",
    "requestedPickupTimeZoneCode": "string",
    "freightTermCode": "string",
    "customerId": "string",
    "contactName": "string",
    "incotermInfo": "string",
    "pickupNumber": "string",
    "shipDirectionCode": "string",
    "pickupAppointment": "2025-05-16T10:21:10.504Z",
    "pickupAppointmentTimeZoneCode": "string",
    "deliveryAppointment": "2025-05-16T10:21:10.504Z",
    "deliveryAppointmentTimeZoneCode": "string",
    "poDate": "2025-05-16",
    "poNumber": "string",
    "requestedDateType": "string",
    "requestedTimestamp": "2025-05-16T10:21:10.504Z",
    "requestedTimeZoneCode": "string",
    "shipTimestamp": "2025-05-16T10:21:10.504Z",
    "shipTimeZoneCode": "string",
    "deliveryTimestamp": "2025-05-16T10:21:10.504Z",
    "deliveryTimeZoneCode": "string",
    "availableTimestamp": "2025-05-16T10:21:10.504Z",
    "availableTimeZoneCode": "string",
    "orderDate": "2025-05-16T10:21:10.504Z",
    "orderReleaseId": "string",
    "orderReleaseRefno": "string",
    "orderReleaseSequence": 0,
    "interfaceSortKey": "string",
    "interfaceTransactionType": "string",
    "interfacePrevalidated": true,
    "originPartnerId": "string",
    "originFullName": "string",
    "originAddress1": "string",
    "originAddress2": "string",
    "originAddress3": "string",
    "originCity": "string",
    "originRegion": "string",
    "originCountry": "string",
    "originPostal": "string",
    "originContactName": "string",
    "originContactTitle": "string",
    "originPhone": "string",
    "originEmail": "string",
    "originSourceSystem": "string",
    "originExternalIdentifier": "string",
    "destinationPartnerId": "string",
    "destinationFullName": "string",
    "destinationAddress1": "string",
    "destinationAddress2": "string",
    "destinationAddress3": "string",
    "destinationCity": "string",
    "destinationRegion": "string",
    "destinationCountry": "string",
    "destinationPostal": "string",
    "destinationContactName": "string",
    "destinationContactTitle": "string",
    "destinationPhone": "string",
    "destinationEmail": "string",
    "destinationSourceSystem": "string",
    "destinationExternalIdentifier": "string",
    "grossWeightUomCode": "string",
    "grossWeightValue": 0,
    "volumeUomCode": "string",
    "volumeValue": 0,
    "netValueCurrencyCode": "string",
    "netValue": 0,
    "apAllocated": 0,
    "apAllocatedCurrencyCode": "string",
    "arCalculated": 0,
    "arCalculatedCurrencyCode": "string",
    "apCompletedCost": 0,
    "apCompletedCostCurrencyCode": "string",
    "arCompletedCost": 0,
    "arCompletedCostCurrencyCode": "string",
    "netWeightValue": 0,
    "netWeightUomCode": "string",
    "equipmentNumber": "string",
    "orderStatus": {
      "orderStatusCode": "string",
      "orderStatusName": "string",
      "sourceApplicationId": 0,
      "sourceAppPrimaryKey": "string",
      "statusType": "string"
    },
    "sourceApplication": {
      "sourceApplicationCode": "string",
      "sourceApplicationName": "string"
    },
    "orderInvolvedPartyList": [
      {
        "partyName": "string",
        "partyType": "string",
        "address1": "string",
        "address2": "string",
        "address3": "string",
        "cityName": "string",
        "regionName": "string",
        "countryName": "string",
        "postalCode": "string",
        "vatNumber": "string",
        "sourceSystem": "string",
        "partyId": "string",
        "partnerExternalIdentifier": "string"
      }
    ],
    "orderInstructionList": [
      {
        "instructionNumber": 0,
        "instructionDetail": "string",
        "instructionType": "string",
        "instructionId": "string"
      }
    ],
    "orderCarrierEquipDetailList": [
      {
        "scacCode": "string",
        "mode": "string",
        "carrierSequence": 0,
        "modeDescription": "string",
        "equipmentCode": "string",
        "equipmentDescription": "string",
        "sourceCarrierEquipId": "string"
      }
    ],
    "orderLines": [
      {
        "orderLineId": 0,
        "lineIdentifier": 0,
        "shipItemIdentifier": "string",
        "packagingIdentifier": "string",
        "grossWeightValue": 0,
        "grossWeightUomCode": "string",
        "isLoadConstraints": true,
        "externalLineIdentifier": 0,
        "thirdPartyReferenceNumber": "string",
        "thirdPartyReferenceLineNumber": 0,
        "thirdPartyReferenceDate": "2025-05-16T10:21:10.505Z",
        "packageCount": 0,
        "heightValue": 0,
        "heightUomCode": "string",
        "lengthValue": 0,
        "lengthUomCode": "string",
        "widthValue": 0,
        "widthUomCode": "string",
        "batchLotNumber": "string",
        "netWeightValue": 0,
        "netWeightUomCode": "string",
        "tareWeightValue": 0,
        "tareWeightUomCode": "string",
        "volumeValue": 0,
        "hazmatCode": "string",
        "hazmatClass": "string",
        "hazmatPackingGroup": "string",
        "hazmatDescription": "string",
        "flashPointValue": 0,
        "flashPointUomCode": "string",
        "boilingPointValue": 0,
        "boilingPointUomCode": "string",
        "hazardId": "string",
        "tunnelCode": "string",
        "wgkClass": "string",
        "marinePollutant": "string",
        "harmonizedCode": "string",
        "countryOfOrigin": "string",
        "batchLotNumberType": "string",
        "productClass": "string",
        "handlingUnit": "string",
        "handlingDescription": "string",
        "shipClass": "string",
        "shipClassCode": "string",
        "unNumber": "string",
        "referenceCode": "string",
        "referenceValue": 0,
        "volumeUomCode": "string",
        "quantityUomCode": "string",
        "quantityValue": 0,
        "declaredValue": 0,
        "declaredValueUomCode": "string",
        "requestedQuantity": 0,
        "requestedQuantityUomCode": "string",
        "confirmedQuantity": 0,
        "confirmedQuantityUomCode": "string",
        "sourceSystem": "string",
        "customerPartNumber": "string",
        "sourceOrderLineNumber": "string",
        "productDescription": "string",
        "handlingCount": 0,
        "packageDescription": "string",
        "sourceTblPrimaryKey": "string",
        "netValue": 0,
        "netValueCurrencyCode": "string",
        "apAllocated": 0,
        "apAllocatedCurrencyCode": "string",
        "arCalculated": 0,
        "arCalculatedCurrencyCode": "string",
        "apCompletedCost": 0,
        "apCompletedCostCurrencyCode": "string",
        "arCompletedCost": 0,
        "arCompletedCostCurrencyCode": "string",
        "userFieldListOrderLine": [
          {
            "userfieldType": "string",
            "name": "string",
            "value": "string"
          }
        ],
        "orderLineChargeList": [
            {
                "orderLineChargeAmountAP": 0,
                "orderLineChargeAmountAPCurrencyCode": "string",
                "orderLineChargeAmountAR": 0,
                "orderLineChargeAmountARCurrencyCode": "string",
                "orderLineChargeCode": "string",
                "orderLineChargeDescription": "string",
                "orderLineChargeSequence": 0
          }
        ]
      }
    ],
    "orderAccessorialDetails": [
      {
        "accessorialCode": "string",
        "accessorialAmount": 0,
        "accessorialAmountUomCode": "string",
        "orderAccessorialDetailSequence": 0,
        "sourceTblPrimaryKey": "string"
      }
    ],
    "orderChargeList": [
      {
        "orderChargeAmountAP": 0,
        "orderChargeAmountAPCurrencyCode": "string",
        "orderChargeAmountAR": 0,
        "orderChargeAmountARCurrencyCode": "string",
        "orderChargeCode": "string",
        "orderChargeDescription": "string",
        "orderChargeSequence": 0
      }
    ],
    "userFieldList": [
      {
        "userfieldType": "string",
        "name": "string",
        "value": "string"
      }
    ],
    "messageTimeStamp": "2025-05-16T10:21:10.505Z"
  }
}
```

  

### **Acceptance Criteria:**

1. API should accept a POST request with `orderNumber` and `customerId` as mandatory fields.
2. API should validate the input payload:

    * `orderNumber` must not be empty
    * `customerId` must not be empty
    
3. If valid, the API must fetch and return the corresponding order details.
4. If no order is found, API should return a meaningful error response (e.g., 404 Not Found).
5. API must handle invalid input with a proper error message (e.g., 400 Bad Request).
6. API response should follow the defined JSON structure.
7. Proper logging must be implemented for request and response (excluding sensitive data).

---

## LINX-10777 — BE - Implement API for Fetching Successfully Created Orders (Integrated & Manual) with Pagination (LINX-9896) 

**Status:** Closed  
**Type:** Story  
**Labels:** BE

I need to **retrieve a list of successfully created orders (both integrated and manual)**,  
So that **I can view, monitor, and process orders efficiently with scalable pagination support**.  
  
Develop a REST API endpoint to fetch orders that have been successfully created in the system. The API must support both **Integrated Orders** (from external systems) and **Manual Orders** (created internally).

The API should include **pagination,**  
**filtering, and sorting capabilities** will cover in another story  
  
Please refer the BRs of [\[LINX-9896\] Order Management - Order Overview/Summary Page - Jira](https://odysseylogistics.atlassian.net/browse/LINX-9896)

---

## LINX-10788 — Order Overview Page - Display Custom Views

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order. 

In addition to hiding/displaying columns , changing the sequence of display for the columns & applying filters (referred to as a ‘custom view’), the user can create/edit/delete different custom views for different customers that they manage. This story only covers **displaying custom views.**

---

## LINX-10797 — BE - Filter lookups for Order Number and Order Status (LINX-10285)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

A lookup API needs to implement for Orders multi selection in Order Service  
An API needs to be implemented for Order status in Order Service

---

## LINX-10798 — BE - Basic filter - Enable multi-select filtering on Order List by Order Number, Order Status, and Customer (LINX-10285)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

I want to apply filters on the Order List using Order Number, Order Status, and Customer fields with multi-select capability, so that I can efficiently narrow down and view relevant orders based on multiple criteria.  

**Scope:**

* Add filters for:

    * Order Number
    * Order Status
    * Customer
    
* Enable **multi-selection** for all three fields.
* Filters should work in combination (AND logic across fields, OR logic within each field selection).
* Display filtered results dynamically.

‌

Refer the LLD:

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2#:~:text=/order%2Dservice/v3/order/list</custom>

---

## LINX-10799 — BE - Basic filter - Enable multi-select filters on Origin/Destination and date range filters for Pickup & Delivery (LINX-10285)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Enhance the backend Order Search API to support advanced filtering capabilities, including multi-select dropdown filters for Origin and Destination attributes and date range filtering for Pickup and Delivery dates.  

## **Scope:**

### **1. Location Filters (Multi-select)**

Add support for the following fields with multi-selection:

**Origin:**

* Origin City
* Origin State
* Origin Country

**Destination:**

* Destination City
* Destination State
* Destination Country  

### **2. Date Range Filters**

**Pickup Date:**

* From Date
* To Date

**Delivery Date:**

* From Date
* To Date

‌

Refer the LLD:

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2#:~:text=/order%2Dservice/v3/order/list</custom>

---

## LINX-10801 — FE - Order Management  - Order Overview/Summary Page - Table

**Status:** In Development  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order

---

## LINX-10802 — BE - Advance filter - Enable multi-select filtering on Order List by Order Source, Ship Direction, Freight Terms and Equipment (LINX-10285)

**Status:** Todo  
**Type:** Story  
**Labels:** BE

covers the implementation of filter functionality for the Order Source, Ship Direction, Freight Terms, and Equipment columns

API Integration 

* Extend the API endpoint to accept filter parameters for Order Source, Ship Direction, Freight Terms, and Equipment 
* Implement backend query logic to filter orders based on the selected filter criteria 
* Ensure filters work in combination (AND logic) — applying multiple filters should narrow down the results 
* API should return paginated results consistent with the existing pagination implementation

‌

Refer the LLD:

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2#:~:text=/order%2Dservice/v3/order/list</custom>

---

## LINX-10803 — BE - Advance filter - Enable multi-select filtering on Order List by Consignor Location ID, Consignee Location ID and Commodity (LINX-10285)

**Status:** Todo  
**Type:** Story  
**Labels:** BE

‌

‌

Refer the LLD:

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2#:~:text=/order%2Dservice/v3/order/list</custom>

---

## LINX-10804 — FE - Order Management  - Order Overview/Summary Page - Export to CSV

**Status:** Todo  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order

---

## LINX-10805 — BE - Advance filter - Enable multi-select filtering on Order List by Gross Weight (Value & UoM) and Volume (Value & UoM) (LINX-10285)

**Status:** Todo  
**Type:** Story  
**Labels:** BE

‌

‌

Refer the LLD:

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2#:~:text=/order%2Dservice/v3/order/list</custom>

---

## LINX-10806 — FE - Order Management  - Order Overview/Summary Page - Display Tabs

**Status:** In Development  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order

---

## LINX-10809 — FE - Order Management  - Order Overview/Summary Page - View / Apply Filters - Basic Filters

**Status:** Todo  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order. This story talks about **applying filters to show/hide specific orders** in each of the tabs, based on the filter applied.

---

## LINX-10810 — FE - Order Management  - Order Overview/Summary Page - View / Apply Filters - Advanced Filters

**Status:** Todo  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order. This story talks about **applying filters to show/hide specific orders** in each of the tabs, based on the filter applied.

---

## LINX-10811 — FE - Order Overview/Summary Page - Post Order Creation Actions & View Order - View Order Details

**Status:** Todo  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page is a one page snapshot of all orders, important information about the order & next action to be taken for the order. ‘Order Actions’ is the last column in the Order Overview/Summary Page and has a list of actions, the user can perform **post order creation.** This story describes the **possible actions & the order viewing functionality**

---

## LINX-10812 — FE - Order Overview/Summary Page - Post Order Creation Actions & View Order - Audit Trail - Single Line

**Status:** Todo  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page is a one page snapshot of all orders, important information about the order & next action to be taken for the order. ‘Order Actions’ is the last column in the Order Overview/Summary Page and has a list of actions, the user can perform **post order creation.** This story describes the **possible actions & the order viewing functionality**

---

## LINX-10814 — Order Overview Page - Create Custom View

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order. 

In addition to hiding/displaying columns & changing the sequence of display for the columns (referred to as a ‘custom view’), the user can create/edit/delete different custom views for different customers that they manage. This story only covers **creating custom views.**

---

## LINX-10815 — FE - Order Overview/Summary Page - Post Order Creation Actions & View Order - Audit Trail - Multiple Line

**Status:** Todo  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

Order Management overview / summary page is a one page snapshot of all orders, important information about the order & next action to be taken for the order. ‘Order Actions’ is the last column in the Order Overview/Summary Page and has a list of actions, the user can perform **post order creation.** This story describes the **possible actions & the order viewing functionality**

---

## LINX-10825 — Order Overview Page - Edit Custom View

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order. 

In addition to hiding/displaying columns & changing the sequence of display for the columns (referred to as a ‘custom view’), the user can create/edit/delete different custom views for different customers that they manage. This story only covers **editing custom views.**

---

## LINX-10838 — Order Overview Page - Delete Custom View

**Status:** Todo  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

Order Management overview / summary page will be the first page that the user should see, once he/she has logged into OdysseyONE using their login credentials and clicks on ‘Orders’ in the left pane. It is a one page snapshot of all orders, important information about the order & next action to be taken for the order. 

In addition to hiding/displaying columns & changing the sequence of display for the columns (referred to as a ‘custom view’), the user can create/edit/delete different custom views for different customers that they manage. This story only covers **deleting custom views.**

---

## LINX-11149 — DB - Database table design to store the Order custom view

**Status:** Todo  
**Type:** Task  
**Labels:** DB

Need to work on the Database design to store the user specific custom view configuration for Order list

---

## LINX-11163 — BE - Integrate Master Service API to get Special Service description in Order details page

**Status:** Ready for Development  
**Type:** Task  
**Labels:** BE

Need to integrate below master service API in Order service to fetch the Description of the Special Services in the Order details   
  

| API to get the summary or description of the special service(s) | /master-data/v1/special-services/details | POST | {  
  "codes": \["HAZ", "PJC"\]  
} | {  
  "data": \[  
    {  
      "code": "HAZ",  
      "description": "HAZARDOUS MATERIALS"  
    },  
    {  
      "code": "PJC",  
      "description": "PALLET JACK"  
    }  
  \]  
} |
| --- | --- | --- | --- | --- |

---

## LINX-11165 — BE - API for Export Orders to CSV from Order Overview/Summary Page (LINX-9896)

**Status:** Analysis  
**Type:** Story  
**Labels:** BE

Need to build a REST API endpoint that exports the orders displayed on the Order Overview/Summary page to a CSV file,  
**So that** users can download the current view of orders for offline analysis.  
  

**Technical Details:**

1. **Endpoint:** `POST /order-service/v3/order/export/csv`
2. **Request Parameters:**

    * `filters` — Any applied filter criteria (Order Number, Order Status, Customer, Origin, Destination and date rage filters) The filters covered as part of <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-10798</custom>  <custom data-type="smartlink" data-id="id-1">https://odysseylogistics.atlassian.net/browse/LINX-10799</custom> stories. 
    * `sortBy` / `sortOrder` — Current sort applied on the grid
    
3. **CSV Columns** (default, matching the Order Overview table):

    * Order Number, Order Source, Customer, Ship Direction, Freight Terms, Equipment, Consignor Location ID, Origin City/State/Country, Earliest Pickup Date & Time, Latest Pickup Date & Time, Consignee Location ID, Destination City/State/Country, Earliest Delivery Date & Time, Latest Delivery Date & Time, Gross Weight (Value & UoM), Volume (Value & UoM), Commodity, Order Status
    
4. **Business Rules:**

    * The exported data must reflect the currently applied filters on the grid  
        
      Note: Please refer the LLD [Order Service Phase-2 - Transportation Management Systems - Confluence](https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2) and Functional story for BRs [\[LINX-9896\] Order Management - Order Overview/Summary Page - Jira](https://odysseylogistics.atlassian.net/browse/LINX-9896)

---

## LINX-11180 — BE -  Implement API for Fetching Orders with Data Validation Errors with Pagination (LINX-9896)

**Status:** Todo  
**Type:** Story  
**Labels:** BE

**I need to** develop a REST API endpoint to fetch integrated orders that have data validation errors,  
**So that** the frontend can populate the **"Data Validation Errors"** tab on the Order Overview/Summary page.

* Only **integrated orders** (received from external/customer systems e.g. ERP) that have validation errors should be returned
* Validation errors include: missing mandatory fields (e.g. Owning Organization), invalid data types (e.g. character in phone number), or invalid data (not matching TMS master)
* The API must return the **count** of orders with validation errors.

#### Endpoint: Fetch Data Validation Error Orders

* **Method:** `POST`
* **Suggested Path:** `/order-service/v3/order/validation-error/list`
* **Response:** Paginated list of integrated orders with validation errors

---

## LINX-11181 — BE - Implement API for Fetching Orders with Technical Errors with Pagination (LINX-9896)

**Status:** Todo  
**Type:** Story  
**Labels:** BE

**I need to** develop a REST API endpoint to fetch orders that could not be processed due to technical errors,  
**So that** the frontend can populate the **"Technical Errors"** tab on the Order Overview/Summary page.

* Orders (both **Integrated and Manual**) that could not be processed due to **technical errors** should be returned
* Technical errors include but are not limited to:

    * **Message processing errors** — failures during message parsing, transformation, or queue processing
    * **Server errors** — internal server failures, timeouts, out-of-memory issues during order processing
    * **Integration errors** — failures communicating with downstream/upstream systems (e.g., carrier APIs, ERP callbacks, master data services)
    
* The API must return the **count** of orders with technical errors

‌

#### Endpoint: Fetch Technical Error Orders

* **Method:** `POST`
* **Suggested Path:** `/order-service/v3/order/technical-error/list`
* **Response:** Paginated list of orders with technical errors

---
