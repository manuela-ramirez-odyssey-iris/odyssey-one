# Order Create - Integration

**Source:** https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2370174978/Order+Create+-+Integration  
**Confluence page ID:** 2370174978  
**Parent:** Order Domain (2366406657)  
**Space:** TMS — Transportation Management Systems  
**Author:** David Johns  
**Last modified:** Sep 24, 2024

---

As a user, I need my customer to be able to integrate Orders to the TMS from either their ERP or from Odyssey Customer Portal. In either event, we can assume that the integration will be managed through Odyssey Boomi middleware.

Our customers could use various integration protocols that Boomi can support and it would be ideal if the TMS could communicate with Boomi using API or HTTPPOST.

Successful integration to the TMS should create a record, similar to the Manual Order create process defined in the previous Epic.

## Key Data Elements for Order Integration

**Note:** For more details on the field level information (existing order entry field), please refer to the internal SharePoint site. [REDACTED — see Confluence 2370174978]

* Order Header and Line Detail
* Location information for Origin, Destination and Involved Parties (Bill To, etc)
* Item Information

For Locations and Items information, the customer can send data in one of the following methods:

* **Primary Key only** — Primary key will be designated on the file, and the TMS will have the Item detail stored from a previous upload to reference.
* **Insert / Update** — The Locations & Items are sent as a complete data set that can be Inserted or Updated to the database on every transaction.

## Failed Integration UI

As part of the integration, we would like to provide the ability for non-technical users to review any integrations that do not successfully write to the order table due to data integrity or missing required fields.

* Users should have ability to view the 'failed order' integration in a UI and make edits to resolve the data integrity issues.
* Completion of these activities should allow the order creation and workflow to commence.

## Order Updates (via Integration)

Order Interfaces can be for new orders, updates to existing orders, or a cancellation to an existing order.

* **Updates to existing Orders:** Updates should process against the existing order. The TMS should know what data elements changed so they can be processed appropriately.
  * Orders can be matched by part of the Order ID sent to the TMS or through a reference field on the order that uniquely identifies an order to the customer.
* **Cancellations to an existing order:** Cancellations may only include the Order ID and a Status of canceled. Cancellations should process to the order status so that the downstream workflow can be triggered to the shipment.
