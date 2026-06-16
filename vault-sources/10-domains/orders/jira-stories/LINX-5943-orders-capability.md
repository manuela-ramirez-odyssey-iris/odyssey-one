# LINX-5943 — Orders Capability

**Status:** New  
**Jira:** https://odysseylogistics.atlassian.net/browse/LINX-5943  
**Child stories:** 0

## Epic Description

This Epic aims to deliver a robust, scalable, and user-friendly order management system that supports all manual and integrated order management workflows. Customer order is an important pre-requisite for seamless shipment planning, shipment execution, invoicing/payment, and customer visibility. The scope of this epic includes the following:

* **Accessing OdysseyOne**

    * Sign-In via SSO
    * Logout

* **Manual Order Processing & Management**

    * Quick Order Creation - Fast data entry with minimal fields.
    * Long Order Creation - Detailed order creation screen capturing more fields
    * Order Modification - Edit / Delete the order (based on current status)
    * Order Lifecycle - Manual Order Statuses & transition between statuses
    * Master Data - All the fields required to create/edit the order must come from the Master Database

* **Integrated Order Processing & Management**

    * Data Mapping - Mapping ERP fields & TMS fields, so that the accurate data is populated, before the integrated order is received
    * Data Validation: Perform checks on the order data, basis business rules, so that the integrated data has all the fields required in shipment planning

        * Validate mandatory, conditional, and extended fields
        * Location/address validation (Country, State, City, Postal)

    * Master Data - If any data in the integrated order is missing, or the order needs editing, the system should enable order updating from the Master, to ensure all fields required to create/edit the order are available.
    * Order Lifecycle - Integrated Order Statuses & transition between statuses
    * Order Modification - Edit/Delete the order

---

# Stories

_(no child stories found — see _inventory.md for notes)_
