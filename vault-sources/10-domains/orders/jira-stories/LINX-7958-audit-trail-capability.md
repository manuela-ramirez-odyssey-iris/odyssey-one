# LINX-7958 — Audit Trail for Orders Capability

**Status:** Approved  
**Jira:** https://odysseylogistics.atlassian.net/browse/LINX-7958  
**Child stories:** 14

## Epic Description

This epic aims to build an un-editable, reliable, and searchable audit trail that does the following:

Regardless of whether the order was created in the UI or received from other systems (Legacy TMS, LINX or Customer ERP), the audit trail must support Odyssey internal users, support teams, compliance to provide complete visibility into every change impacting order lifecycle, without exposing sensitive internal data to un-authorized users.

Scope of audit trail (types of events / actions):

* **Order Actions**

    * Order Creation
    * Order Editing

* **Order Events**

    * Order Lifecycle Status Change
    * Order Applied on Hold
    * Order Released from Hold
    * Order Cancellation

---

# Stories

## LINX-8091 — Audit Trail for Manual & Integrated Orders (Single Line Item) - View Actions & Events

**Status:** In Development  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE Orders internal user, I want to have  a reverse chronological (most recent event/action to appear first), system‑generated, non-modifiable (can’t edit or delete), appendable record of every action or event that occurs **at the order  level**, in the orders domain, in OdysseyONE

---

## LINX-8148 — Audit Trail for Manual & Integrated Orders - Search/Filter for Actions & Events

**Status:** Canceled  
**Type:** Story  
**Labels:** —

As an OdysseyONE Orders internal user, I want to have  a reverse chronological (most recent event/change to appear first), system‑generated, non-modifiable (can’t edit or delete) record of every action, change, or event that occurs in the orders domain, in OdysseyONE

---

## LINX-8290 — DB : Order : DB design for audit trail LINX-7958)

**Status:** Closed  
**Type:** Task  
**Labels:** DB

_(no description)_

---

## LINX-8429 — BE - Implement the functionality to store incoming messages to 'v3/order' into order_staging table (LINX-8091)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

As part of the order-processing pipeline, all incoming payloads hitting the `v3/order` endpoint must be persisted into the `Order_Staging` table for auditing, debugging, and asynchronous downstream processing.

This ticket covers:

* Capturing the full incoming request payload
* Persisting the payload into the `Order_Staging` database table.
* Implementing appropriate logging and error handling.
* Adding unit tests and integration tests for the new functionality.

---

## LINX-8455 — BE - Insert Order Status Update Event into Audit Log Table For Monitoring (LINX-8091)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Once the Order status is update with Status update API then post that insert Order status update event into Audit Log Table for monitoring.

---

## LINX-8456 — BE - Insert Order Creation or Order Update Action into Audit Log Table for Monitoring (LINX-8091)

**Status:** In Development  
**Type:** Story  
**Labels:** BE

When Order is created or updated through ERP or Manual Order creation process, then insert action into Audit Log table for monitoring.

---

## LINX-8457 — BE - Create Audit Log View API That will Return All Required Field for Audit Log View and Monitor In UI. (LINX-8091)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Create Audit Log API to return all the required field for view in UI and Monitor.  
  
Pls refer LLD <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2#:~:text=/order%2Dservice/v3/audit%2Dreport</custom>   
  
Refer table

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=baddd1a2-ca61-49c9-8596-50db0a9fd7a5&&collection=&height=665&occurrenceKey=null&width=1319&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)

---

## LINX-8458 — BE - Integrate of User Management API in Order Service to get User Details (LINX-8091)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Integrate with user management API to get user details when order is created/updated through Manual order UI.  
  
To enhance Order audit tracking and identify the creator of an order, we need to fetch user details from the Order Service using the authentication token.

This requires consuming the User Management Service GET API and extracting user information based on the provided auth token. The user details will be used for:

* Identifying the user who created the order
* Supporting Order audit metrics and logging

A Feign Client needs to be implemented to integrate seamlessly with the User Management Service API in Order Service.  
  
curl --location '[https://dev.user.api.linx.odysseylogistics.com/user-service/v1/user/login-details'](https://dev.user.api.linx.odysseylogistics.com/user-service/v1/user/login-details') \\  
\--header 'Content-Type: application/json' \\  
\--header 'Authorization: Bearer '

---

## LINX-8802 — BE - Order Audit Trails LLD creation (LINX-8091)

**Status:** Closed  
**Type:** Task  
**Labels:** BE, BE_LLD

Needs to work on the LLD for Order Audit Trails

---

## LINX-8941 — DB - Order - Changes in Order Staging table (LINX-8091)

**Status:** Closed  
**Type:** Story  
**Labels:** DB

New column needs to added in Order Staging table to save Source system information  
Need to change the length of MessageType field to >10

Needs to add two new fileds to store **acknowledgement id** of **NN flow** and  **Shipment flow**

---

## LINX-8971 — QA – Audit Log View API Validation

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9128 — Audit Trail for Manual & Integrated Orders (Multiple Line Items) - View Actions & Events

**Status:** In Development  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE Orders internal user, I want to have  a reverse chronological (most recent event/action to appear first), system‑generated, non-modifiable (can’t edit or delete), appendable record of every action or event that occurs **at a line item level** (in the orders domain), in OdysseyONE

---

## LINX-9730 — BE - Implement JSON Comparison Component for Order Audit (LINX-8091)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Create Java Component to Compare Old vs New Order JSON and Identify Field-Level Changes.  
  
In the Order Audit table, we store two columns containing the **old version** and **new version** of an order in JSON format. We need to build a reusable Java component that compares these two JSON strings and identifies:

* Added fields
* Removed fields
* Modified/updated field values

This component will help in auditing and tracking order changes in a structured and readable format.  

**Scope:**

* Input: Two JSON strings (Old JSON, New JSON)
* Output: Structured difference report (list/map of changes)
* Support nested JSON structures
* Handle nulls, missing fields, and data type variations  

**Technical Requirements:**

1. **Component Design**

    * Develop a utility class (e.g., `JsonDiffUtil`)
    * Method signature example:
    
        ```
        Map<String, Object> compareOrderJson(String oldJson, String newJson);
        ```
    
        

    
    
2. **Comparison Logic**

    * Detect:
    
        * Added fields (only in new JSON)
        * Removed fields (only in old JSON)
        * Modified fields (value changed)
        
    * Traverse nested JSON recursively
    * Maintain field path (e.g., `order.orderStatus.orderStatusCode`)
    
3. **Output Format** Example:

    JSON



    ```
    {
    
     "added": {
    
     "order.orderStatus.orderStatusCode": "HOLD"
    
     },
    
     "removed": {
    
     "order.equipmentNumber": “1231”
    
     },
    
     "modified": {
    
     "order.shipDirectionCode": {
    
     "old": “I“,
    
     "new": “O“
    
     }
    
     }
    
    }
    ```

    


4. **Libraries**

    * Use Jackson (`ObjectMapper`) or Gson for parsing
    * Optional: Evaluate libraries like `java-json-tools/json-patch` if beneficial
    
5. **Error Handling**

    * Invalid JSON input handling
    * Null or empty values
    * Graceful fallback with logging
    
6. **Performance Considerations**

    * Optimize for large JSON payloads
    * Avoid unnecessary object creation

---

## LINX-9784 — BE - Capture User Email in CreatedBy and UpdatedBy Fields Using User Management API (LINX-8091)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Capture and store user email in `CreatedBy` and `UpdatedBy` fields for Order-related tables by integrating with the User Management API.  
  
Currently, `CreatedBy` and `UpdatedBy` fields are added to most tables in the Order schema. The next step is to populate these fields with the actual user email who creates or updates an order.

We need to integrate with the **User Management API** to fetch user details and store the **email** in the respective fields.  

### **Technical Approach**

1. **Integration with User Management API**

    * Use the authenticated user context (JWT / token / session).
    * Extract user identifier from request.
    * Call User Management API (if required) to fetch user details.
    * Retrieve **email** of the logged-in user.
    
2. **Populate Fields**

    * On **Create Order**:
    
        * Populate `CreatedBy` with user email.
        * Populate `UpdatedBy` with same email.
        
    * On **Update Order**:
    
        * Update `UpdatedBy` with current user email.
        * Do not modify `CreatedBy`.
        
    
3. **Database Changes**

    * Ensure all applicable tables in Order schema have the `CreatedBy` and `UpdatedBy` details

---
