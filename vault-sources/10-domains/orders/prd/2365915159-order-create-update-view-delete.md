# Order - Create, Update, View, Delete

**Source:** https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2365915159/Order+-+Create+Update+View+Delete  
**Confluence page ID:** 2365915159  
**Parent:** Order Domain (2366406657)  
**Space:** TMS — Transportation Management Systems  
**Author:** David Johns  
**Last modified:** Sep 24, 2024

---

As a user I need to be able to create, update, view and delete orders.

## Order Create

Order create should offer the user a simple and quick way to create an order, as they may be doing so from a phone call or referencing an email/pdf document from their customer.

### Order Entry Header key criteria

**Note:** For more details on the field level information (existing order entry field), please refer to the internal SharePoint site. [REDACTED — see Confluence 2365915159]

* **ORDER ID** — Primary key should be derived by the system and not an input for the order entry
* **Customer**
* **Order Number** — Customer Order ID or Reference Number
* **Origin** — Allow for quick option to enter new or select from existing
* **Destination** — Allow for quick option to enter new or select from existing
* **Direction** — Inbound or Outbound (Default Outbound)
* **Payment Terms** — PPD, COL, 3RD (Default PPD)
* **Early & Late Pickup Date**
* **Early & Late Delivery Date**
  * Allow null, but one of Late Pickup or Late Delivery must be present
  * Date validation rules:
    * Early Pickup <= Late Pickup
    * Early Delivery <= Late Delivery
    * Early Pickup < Late Delivery
* **Date Anchor** — Pickup, Deliver, Both — Default to Pickup
* **Is Appointment (Pickup & Delivery)** — Allow Null
* **Equipment**
* **Delivery Instructions**
* **Special Services**

### Order Line data

* Commodity, Class or Item ID
* Weight or volume
* Count, Ship Unit Specification (pallet, etc)

---

## Order Update

Users should have the ability to update any information on the order, aside from the Customer. *(Confirm any status restrictions?)*

---

## Order Delete

User should be able to delete an Order as long as it is not on a Shipment.

---

## View

User should be able to view Order Detail.

---

## Order Table Changes

* Add column for TEMPLATE with values of Y/N where N is the default.
* Add Origin, Destination detail to the Order Header. Allow entry at header to automatically propagate to lines on Order Create, Edit (if not existing).

---

## Future Functionality

* **Templates** — When TEMPLATE = Y, all required fields are no longer required. Status on the order should also prevent planning. Order should not show in any user screens.
* Remove Origin, Destination from Order Lines.
