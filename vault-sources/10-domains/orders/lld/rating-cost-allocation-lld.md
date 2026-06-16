---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2778202116/Rating+Service+and+Cost+Allocation+to+Order
page_id: "2778202116"
title: "Rating Service and Cost Allocation to Order"
last_modified: "Sep 17, 2025"
fetched: "2026-06-11"
space: TMS
---

LINX Rating Service is internally calling TMS Rating service.

## Sequence Diagram

## Service Endpoints

| **Service Name** | **Description** | **Endpoint** | **Request Method** | **Headers** | **Request Payload** | **Response** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rating-service | Call TMS rating service API https://rrtest.odysseylogistics.com/routing/qca to rate order for AP/AR shipments | /rating-service/v1/rate-order | POST | Authorization: Basic Authentication | {  
    "ap_system_id": "\*ODYSSEY_AP",  
    "ar_system_id": "G20TECH",  
    "origin": {  
        "city": "COLUMBUS",  
        "country": "US",  
        "postal": "31907",  
        "state": "GA",  
        "site": "US39"  
    },  
    "destination": {  
        "city": "NEENAH",  
        "country": "US",  
        "postal": "54956",  
        "state": "WI",  
        "site": "US1125"  
    },  
    "dir": "O",  
    "ship_date": "2025-03-12T17:00:00-05:00",  
    "deliver_date": "2025-03-14T17:00:00-05:00",  
    "equipment_id": "TL",  
    "carrier": "KCNT",  
    "lines": \[  
        {  
            "seq": 1,  
            "package_count": 100,  
            "weight": 5000.0,  
            "weight_uom": "LB",  
            "hazardous": true  
        }  
    \],  
  "stops": \[  
       {  
           "seq": 1, "city": "city", "country": "country", "postal": "postal", "state": "state", "site": "site"  
       },  
       {  
           "seq": 2, "city": "city", "country": "country", "postal": "postal", "state": "state", "site": "site"  
       }  
   \],  
   "charges": \[  
       {  
           "code": "code",  
           "cost": 0.0,  
           "currency": "currency"  
       }  
   \]  
} | {  
    "pv_version": "25.12",  
    "return_code": 1,  
    "tariff_id": 19765,  
    "tariff_no": "TL-AR",  
    "tariff_op_org": "\*KEMIRA_SYS_01",  
    "rate_break_id": "",  
    "rate_method": "rge",  
    "distance_uom": "MI",  
    "domestic_miles": 1013.0,  
    "other_miles": 0.0,  
    "cost": 2012.215,  
    "currency": "USD",  
    "rate_source": "0",  
    "stop_off_count ": 0,  
    "stop_off_charge": 0.0,  
    "rates": \[  
        {  
            "rate_type": "BR",  
            "amendment": "06",  
            "amount": 1357.015,  
            "class_id": "0",  
            "rate": 1357.015,  
            "currency": "USD",  
            "currency_native_code": "USD",  
            "origin_description": "COLUMBUS",  
            "destination_description": "NEENAH",  
            "rate_break": "0",  
            "tariff_id": 19765,  
            "tariff_no": "TL-AR",  
            "tariff_op_org": "\*KEMIRA_SYS_01",  
            "rate_method": "Flat Charge",  
            "distance_uom": "MI",  
            "domestic_miles": 1013.0,  
            "discount_rate": 0.0,  
            "discount_amount": 0.0,  
            "discount_origin_description": "",  
            "discount_destination_description": "",  
            "cost_type": "R",  
            "weight_uom": "LB",  
            "volume_uom": "CUFT",  
            "rated_weight": 5000.0,  
            "dimensional_weight_flag": "N",  
            "rated_volume": 0.0  
        }  
    \],  
    "surcharges": \[  
        {  
            "charge_code": "HZC",  
            "basis": "F",  
            "rate": 250.0,  
            "cost": 250.0,  
            "currency": "USD",  
            "currency_native_code": "USD",  
            "origin_description": "WORLD",  
            "destination_description": "WORLD",  
            "amendment": "02",  
            "weight_uom": "LB",  
            "volume_uom": "CUFT",  
            "distance_uom": "MI",  
            "rate_break_id": "",  
            "rate_break": "",  
            "cost_type": "R",  
            "rated_weight": 5000.0,  
            "rated_volume": 0.0  
        },  
        {  
            "charge_code": "FUE",  
            "basis": "M",  
            "rate": 0.4,  
            "cost": 405.2,  
            "currency": "USD",  
            "currency_native_code": "USD",  
            "origin_description": "31907",  
            "destination_description": "54956",  
            "amendment": "01",  
            "weight_uom": "LB",  
            "volume_uom": "CUFT",  
            "distance_uom": "MI",  
            "rate_break_id": "",  
            "rate_break": "",  
            "cost_type": "R",  
            "rated_weight": 5000.0,  
            "rated_volume": 0.0  
        }  
    \],  
    "rate_components": \[  
        {  
            "charge_type": "BASE RATE",  
            "formatted_display": "Basis: \\nRate: 1357.02 USD\\nRated Amount: 1357.02 USD\\nCost: 1357.02 USD"  
        }  
    \]  
} | Functional requirements yet to be gathered. The Request and Response payloads are what's available from the TMS rating service API. Request Stub: {"system_id": "TMS Global ID", "origin": {...}, "destination": {...}, "dir": "I \| O", "ship_date": "2025-03-03T13:18:15.215+02:00", "deliver_date": "...", "equipment_id": "QCP option equipmentId", "carrier": "QCP option SCAC", "lines": [...], "stops": [...], "charges": [...]}. [LINX-3485] Wrapper Service in AWS - Process Buy Rate Call. System_ID must be set to AP_System_ID. If the Charge List section is not available, then System_ID must be set to AR_System_ID. [LINX-3486] Wrapper Service in AWS - Process Sell Rate Call. System_ID must be set to AR_System_ID. Origin.site and Destination.site must be derived using: SELECT org_short_name FROM mf_organization WHERE org_global_id = <AP_Source_ID> |
| master-service | Call master service API `/customer-service/v1/cost-allocation-type` to get allocation type | `/customer-service/v1/cost-allocation-type` | POST |  | { "profile": "TL_ALLOC", "orgId": "\*CYRO_SYS_01" } | {"BY_WT"} OR {"BY_WT_LB"} | Refer Master Service LLD https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2408743006/Master+Data+Design-LLD |
| master-service | Call master service API `/customer-service/v1/org-short-name/{orgGlobalId}` to get Organization Short Name | `/customer-service/v1/org-short-name/{orgGlobalId}` | GET |  |  | { "orgShortName": "<orgShortName>" } | Refer Master Service LLD https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2408743006/Master+Data+Design-LLD |

‌

## **Response Status Code:**

Success - 200

No Content - 204

Not Found- 404

Internal Server Error - 500

Unauthorized - 401

## Classes and Entities :

1. TMS Rating Service
2. TMS Procedure to Java Classes - TBC
3. Cost Allocation logic from Shipment to Order level- TBC - By Volume and by weight

‌

#### Controller Class:

LinxRatingController

#### Service Class:

LinxRatingService(Interface) -> LinxRatingServiceImpl(Class)

## Class Diagrams and Relationships

Entity and DTOs

Property names must conform to the following guidelines:

* Property names should be meaningful names with defined semantics.
* Property names must be camel-cased, ascii strings.
* The first character must be a letter, an underscore (\_) or a dollar sign ($).
* Subsequent characters can be a letter, a digit, an underscore, or a dollar sign.
