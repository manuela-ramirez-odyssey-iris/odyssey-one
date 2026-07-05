---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3670212609/Master+Services+-+API+Consumption+Mapping
page_id: "3670212609"
title: "Master Services - API Consumption Mapping"
space: TMS
fetched: "2026-06-11"
domain: cross-cutting
type: api-mapping
tags: [master-data, api, order-service, shipment-service, consumption-map]
status: raw
---

## 🎯 **Objective**

Maintain a centralized record of:

* Which services consume **Master Service APIs**
* API usage patterns
* Owning teams and dependencies

👉 This helps in:

* Impact analysis before API changes
* Communication planning
* Dependency tracking

‌

| API Service | API Endpoint | Method | Consuming Services (BE) | Consuming Services (UI) | Version |
| --- | --- | --- | --- | --- | --- |
| Master Service | /master-data/v1/freight-terms/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/owning-org/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/instruction-type/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/seedequip/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/shipclass/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/site-identifier/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/org-name/lookup | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/orglong-name/lookup | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/address/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/ship-direction/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/release-status/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/package-id/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/uom-type/validation | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/uom-type | POST | Order-Service | Shipment MFE | v1 |
| Master Service | /master-data/v1/wgk-class/validation | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/org-id/{orgGlobalId} | GET |  |  | v1 |
| Master Service | /master-data/v1/product-class/validation | POST | Order-Service, Shipment-Service |  | v1 |
| Master Service | /master-data/v1/package-id/validation | POST | Order-Service, Shipment-Service |  | v1 |
| Master Service | /master-data/v1/package-name/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/package-group/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/product-service/v1/currency | POST | Order-Service | Shipment MFE | v1 |
| Master Service | /master-data/v1/city/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/freight-terms/validation | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/ship-item/identifier/validation | POST | Order-Service, Shipment-Service |  | v1 |
| Master Service | /master-data/v1/org-name/validation | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/ship-direction/validation | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/equipment/validation | POST | Order-Service, Shipment-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/ship-class | GET | Order-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/ship-class-id | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/ship-class-description | POST |  |  | v1 |
| Master Service | /master-data/v1/timezones | GET | Order-Service | Shipment MFE | v1 |
| Master Service | /master-data/v1/instruction-service/v1/instruction-type/validation | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/customer-service/v1/freight-terms | GET | Order-Service |  | v1 |
| Master Service | /master-data/v1/transportation-service/v1/equipment/lookup | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/location-direction-service/v1/ship-direction/lookup | GET | Order-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/special-services/default-list | GET | Order-Service |  | v1 |
| Master Service | /master-data/v1/uom/conversion | POST |  |  | v1 |
| Master Service | /master-data/v1/instruction-service/v1/instruction-type/lookup | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/special-services/lookup | POST | Order-Service | Shipment MFE | v1 |
| Master Service | /master-data/v1/product-service/v1/special-services-list/lookup | POST | Order-Service, Shipment-Service |  | v1 |
| Master Service | /master-data/v1/modes | GET | Order-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/handling-units | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/reference-codes | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/wgk-codes | GET | Order-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/packing-groups | GET | Order-Service |  | v1 |
| Master Service | /master-data/v1/location-service/v1/country-origin/validation | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/location-service/v1/country-origin/lookup | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/customer-service/v1/owning-org/lookup | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/customer-service/v1/owning-org-list/lookup | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/product/lookup | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/scac-code/lookup | POST | Order-Service, Shipment-Service | Shipment MFE | v1 |
| Master Service | /master-data/v1/scac-code-list/lookup | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/customer-service/cost-allocation-type | POST | Shipment-Service |  | v1 |
| Master Service | /master-data/v1/scac-code/validation | POST | Order-Service, Shipment-Service |  | v1 |
| Master Service | /master-data/v1/uom-unit-code/validation | POST | Shipment-Service |  | v1 |
| Master Service | /master-data/v1/uom-hazmat-flashpoint/validation | POST |  |  | v1 |
| Master Service | /master-data/v1/uom-hazmat-boilingpoint/validation | POST |  |  | v1 |
| Master Service | /master-data/v1/product-id/validation | POST | Shipment-Service |  | v1 |
| Master Service | /master-data/v1/currency-code/validation | POST | Order-Service, Shipment-Service |  | v1 |
| Master Service | /master-data/v1/commodity-code/validation | POST | Shipment-Service |  | v1 |
| Master Service | /master-data/v1/packing-group/validation | POST | Shipment-Service |  | v1 |
| Master Service | /master-data/v1/hazmat-packing-group/validation | POST |  |  | v1 |
| Master Service | /master-data/v1/time-zone-value/validation | POST | Order-Service, Shipment-Service |  | v1 |
| Master Service | /master-data/v1/org-short-name/{orgGlobalId} | GET | Order-Service, Rating-Service |  | v1 |
| Master Service | /master-data/v1/product-service/nmfc/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/carrier/billto/details | POST | Shipment-Service |  | v1 |
| Master Service | /master-data/v1/org/ocm-profile/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/equipment-type | POST |  | Shipment MFE | v1 |
| Master Service | /master-data/v1/equipment-details/lookup | POST | Shipment-Service |  | v1 |
| Master Service | /master-data/v1/product-service/v1/ship-item/identifier/lookup | POST |  | Shipment MFE | v1 |
| Master Service | /master-data/v1/package-identifier/lookup | POST |  | Shipment MFE | v1 |
| Master Service | /master-data/v1/customer-service/v1/global-org/lookup | POST |  | Shipment MFE | v1 |
| Master Service | /master-data/v1/product-service/v1/product-class/lookup | POST |  | Shipment MFE | v1 |
| Master Service | /master-data/v1/product-service/v1/hazmat-package-group/lookup | POST |  | Shipment MFE | v1 |
| Master Service | /master-data/v1/commodity-code/lookup | POST |  | Shipment MFE | v1 |
| Master Service | /master-data/v1/hazmatinfo | POST | Order-Service |  | v1 |
| Master Service | /master-data/v1/currency/conversion | POST |  |  | v1 |
| Master Service | /master-data/v1/product-service/stcc/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/product-service/freightclass/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/product-service/harmonized/lookup | POST |  |  | v1 |
| Master Service | /master-data/v1/product-service/stcc/validation | POST |  |  | v1 |
| Master Service | /master-data/v1/product-service/freightclass/validation | POST |  |  | v1 |
| Master Service | /master-data/v1/product-service/harmonized/validation | POST |  |  | v1 |
| Master Service | /master-data/v1/product-service/v1/productclass/validation | POST |  |  | v1 |
| Master Service | /master-data/v1/equipment/mode-code-description/lookup | POST | Shipment-Service |  | v1 |
| Master Service | /master-data/v1/accessorial/validation | POST |  |  | v1 |
| Master Service | /master-data/v1/org/hierarchy/retrieve | POST |  |  | v1 |
| Master Service | /master-data/v1/utc-timezones | GET |  | Order MFE | v1 |

‌
