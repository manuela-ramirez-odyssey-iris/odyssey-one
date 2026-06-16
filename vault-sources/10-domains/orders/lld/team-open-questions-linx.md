---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2602991629/Open+Questions+-+LINX+Shipment+Order+Domains
page_id: "2602991629"
title: "Open Questions - LINX Shipment, Order Domains"
space: TMS
fetched: "2026-06-11"
domain: orders
type: open-questions
tags: [linx, shipment, order, open-questions, integration, cognizant]
status: raw
---

Epic Name: https://odysseylogistics.atlassian.net/browse/OTMS-2207

‌

## Open Questions

| **Epic Name** | **Technical** | **Story Name** | **Status** | **Domain Name** | **Integration with** | **Open Questions** | **Mandatory for Sprint 1(Yes/No)** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OTMS-2208 |  | OTMS-2318 |  | Order |  | What would be status in LINX order domain if the order is updated |  |
| OTMS-2209 |  | OTMS-2681 | Open | Shipment |  | What should be the pooling logic . Fields to considered except created_date_time, update_date_time – BRE needed for this xml and xsd extract of current schema attached might be missing some details- technical team to look BR#2(d) please share the list of additional fields that we can expect  BR#2(c) shipment status, invoice status & supplemental invoice status (corresponding fields at schema level) needs to be included in the message  |  |
| OTMS-2209 |  | OTMS-2681 | Open |  |  | Tendering or Retendering - how to determine that. e.g **TenderStatus** Auditing of tendering/re-tendering not applicable. TMS will be used as it is. What all values we have for TenderStatus? |  |
|  |  | OTMS-2683 |  |  |  | Cancellation details to be checked for all the said scenarios 1 order - 1 shipment, 2 orders - 1 shipment (consolidation for same customer's orders), 2 orders - 2 shipments (consolidation for different customers' orders), multi-stop order - 1 shipment – BRE needed for this |  |
| OTMS-2215 |  |  |  | Shipment | Shiprite | Shiprite is a separate application. Shiprite is working on API endpoints that are to be exposed and consumed by LINX |  |
|  |  |   | Resolved | Order, Shipment | NetNative messaging or BOOMI integration | NetNative messaging service or BOOMI – BOOMI will be used as message pass through layer. NN->BOOMI-SQS->Linx |  |
| OTMS-1862 |  |  |  | Order |  | XSD> DestinationType>PortCode OrganizationType>ExternalIdentifier, IsOwner OrganizationType>FacilityCode,IsThirdPartyValid |  |
| OTMS-2210 |  | OTMS-2722 |  | Shipment |  | BR#1(a) types of shipments  pooling scenario (1 order - multiple shipments, that is commonly the case for distribution) is not considered here as the pooling distribution logic is yet to be determined – BRE needed for this |  |
| OTMS-2210 |  | OTMS-2722 | Open | Shipment |  | Create shipment logic - Do we need BRE what is the attribute to decide the kind of operation  |  |
|  |  | OTMS-2723 |  | Shipment |  | Shipment Tendering - What is the logic . Do we need BRE |  |
| OTMS-2222 |  |  |  |  |  | Rating service (TMS) to re-rate LINX Odyssey Shipment- Need to check if it is an API or PL/Sql block |  |
| OTMS-2222 |  |  |  |  |  | Customer ERP- APIs will be exposed |  |
| OTMS-2226 |  |  |  |  |  | If there is no matching LINX Order, PGI should trigger creation of order in LINX - BRE required to understand various conditions. |  |
| Shipment |  | TBD |  | Shipment |  | attributes that is mandatory needed..like shipment_id,load_id, planningstatus etc., which should not hold null values | Yes |
| Shipment |  |  | Resolved | Shipment |  | RackSchedule and ExportImportInfo entities are removed after discussing with @David Johns @Dave Schultz  |  |
|  | Functional | TBD | Open |  |  | Shipment(Planning Status/Tender Status), Order(Process Status/Release Status) - what different values we have. The NN queue does not know if the message is for create/update/cancelled. They have the logic in NN side. We need to implement the same logic at our end to know the action that we need to perform in LINX. |  |
|  | Functional | TBD | Open |  |  | In case of consolidation bill, if the load is updated/cancelled - what will happen to Consolidation bill What will happen if the shipment is cancelled. (not shipment tender cancellation) |  |
|  |  |  | Resolved |  | Shipment | Partnerlist -- separate entity needed? – created shipment_partner entity |  |
|  |  |  | Resolved |  | Shipment | can we merge product and linelist? is product and linelist one to one or one to many? – one to one relationship |  |
|  |  |  | Resolved |  | Shipment | Specification  -- separate entity needed? can we merge it with plannedbill? – Specification is merged with planned bill |  |
|  |  |  | Resolved |  | Shipment | shipmentinfo -- one to one with consolidation? – one to one |  |
|  |  |  | Resolved |  | Shipment | userfieldlist many to one with plannedbill alone? – userfieldlist is required in both load and shipment |  |
|  |  |  | Resolved |  | Shipment | chargelist many to one with linelist? – chargelist should not be at linelevel. It should be at shipment and load level |  |
|  |  |  | Resolved |  | Shipment | ponumber,podate,pickupnumber to be at plannedbill level? – It should be at planned bill level |  |
|  |  |  | Resolved |  | Order/Shipment | orderheader to plannedbill one to many? – A single Order can have multiple PlannedBill entries associated |  |
