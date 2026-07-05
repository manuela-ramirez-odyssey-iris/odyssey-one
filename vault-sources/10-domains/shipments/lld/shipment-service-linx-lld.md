---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2643099672/Shipment+Service+LINX+-+LLD
page_id: "2643099672"
title: "Shipment Service(LINX) - LLD"
space: TMS
fetched: "2026-06-11"
domain: shipments
type: lld
tags: [shipment-service, linx, lld, api, sell-shipment, pgi-pgr]
status: raw
---

BIn progress and LLD review is pending with Thomas and Singaram. 

You can expect some changes after LLD approval.

## Sequence Diagram

 

![](blob:https://media.staging.atl-paas.net/?type=file&localId=4cc8469b-5fa9-4e67-be0b-a02f13e55894&id=9202aab8-84e7-40bd-94cd-ad64f69ae183&&collection=contentId-2643099672&height=1002&occurrenceKey=null&width=1659&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
![](blob:https://media.staging.atl-paas.net/?type=file&localId=7be5e71a-de70-475f-aa2a-1d3ddb11f421&id=48a9ae8d-675a-42ea-9f03-8d4d8ba89702&&collection=contentId-2643099672&height=null&occurrenceKey=null&width=null&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)##   Shipment-Load Synchronization Logic

![](blob:https://media.staging.atl-paas.net/?type=file&localId=eb06196d-5695-4926-9d4b-9907207750e8&id=49f309ec-433d-491a-b2f3-4af09a599694&&collection=contentId-2643099672&height=1305&occurrenceKey=null&width=1405&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
‌

![](blob:https://media.staging.atl-paas.net/?type=file&localId=b8f3aacf-7a6d-4263-88e0-933816089ddf&id=81a40b41-534a-44a9-a1f0-4f5eecefb6f8&&collection=contentId-2643099672&height=null&occurrenceKey=null&width=null&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)‌

## CarrierBillTo Design

![](blob:https://media.staging.atl-paas.net/?type=file&localId=d2a4fc47-29b3-4210-8e09-164cee00bd56&id=d68d7618-6d24-44a1-8443-6b18b2ee2562&&collection=contentId-2643099672&height=1692&occurrenceKey=null&width=916&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
![](blob:https://media.staging.atl-paas.net/?type=file&localId=41ef1cff-6dcd-4deb-94c2-07d748a02f58&id=68e21648-dd89-4922-a386-453b5aa696be&&collection=contentId-2643099672&height=null&occurrenceKey=null&width=null&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)‌

_**Note  : Request Payload may change as per DB design changes and DB design is in review**_ 

Swagger URL : 

[https://dev.shipment.linx.odysseylogistics.com/shipment-swagger/v3/api-docs](https://dev.shipment.linx.odysseylogistics.com/shipment-swagger/v3/api-docs)

[https://qa.shipment.linx.odysseylogistics.com/shipment-swagger/v3/api-docs](https://qa.shipment.linx.odysseylogistics.com/shipment-swagger/v3/api-docs)

| **Service-name** | **Description** | **Endpoint** | **Request Method** | **Headers** | **Request Payload (in development)** | **Response** | **QA Payload** | **Remarks** |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| shipment-service | Create Shipment (AP/Buy) | /shipment-service/v1/shipment | POST   | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | Version 8 {  
    "buyShipmentIn": {  
        "spot": "N",  
        "pgiDate": null,  
        "shipped": "",  
        "version": "V6",  
        "loadList": \[  
            "CheckLoadDev3"  
        \],  
        "shipmentId": "CheckShipmentDev3",  
        "pgiDateUnit": "",  
        "totalVolume": 0,  
        "totalWeight": 90,  
        "freightTerms": "",  
        "incotermInfo": "",  
        "ratingStatus": "Not Rated",  
        "shipmentType": "Buy",  
        "sourceSystem": "",  
        "numberOfStops": 0,  
        "shipDirection": "Inbound",  
        "shipmentRefId": "",  
        "shipmentRefNo": "813888",  
        "planningStatus": "Done",  
        "messageTimeStamp": "2025-12-04T07:36:11.043",  
        "shipmentStopList": \[  
            {  
                "loadId": \[  
                    "CheckLoadDev3"  
                \],  
                "sequence": 1,  
                "stopType": "Pickup"  
            },  
            {  
                "loadId": \[  
                    "CheckLoadDev3"  
                \],  
                "sequence": 2,  
                "stopType": "Dropoff"  
            }  
        \],  
        "scheduledShipDate": "2025-12-23T00:00:00",  
        "totalPackageCount": 0,  
        "externalIdentifier": "",  
        "masterShipmentDate": null,  
        "shippingOptionList": \[  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 148.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": null,  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 1,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": null,  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 2,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 263.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "Accepted",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "XPI-2-9",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": 0,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[  
                        {  
                            "code": "Base Rate",  
                            "amount": 311.020000,  
                            "uomCode": "USD",  
                            "sequence": 1,  
                            "description": "BASE RATE"  
                        },  
                        {  
                            "code": "FUE",  
                            "amount": 43.542800,  
                            "uomCode": "USD",  
                            "sequence": 2,  
                            "description": "FUEL CHARGE"  
                        }  
                    \]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "PAVITHRA",  
                "shippingOptionId": "LCE17058752CNWYLTL",  
                "responseTimeStamp": "2025-12-04T07:33:40",  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 3,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 163.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": null,  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 4,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": null,  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 5,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 278.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": null,  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752CNWYLTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 6,  
                "deliveryDateTimeZoneCode": "US/Central"  
            }  
        \],  
        "totalVolumeUomCode": "CUFT",  
        "totalWeightUomCode": "LB",  
        "lastJobExecutedTime": null,  
        "masterShipmentNumber": null,  
        "requiredDeliveryDate": null,  
        "scheduledDeliveryDate": "2025-12-29T23:00:00",  
        "shippersShipmentNumber": "",  
        "odysseyShipmentIdentifier": "C813888",  
        "scheduledShipDateTimeZoneCode": "US/Eastern",  
        "masterShipmentDateTimeZoneCode": "UTC",  
        "scheduledDeliveryDateTimeZoneCode": "US/Central"  
    }  
} | { “message” : “Shipment  created successfully” } | Version 8 {  
    "buyShipmentIn": {  
        "spot": "N",  
        "pgiDate": null,  
        "shipped": "",  
        "version": "V6",  
        "loadList": \[  
            "CheckLoad4"  
        \],  
        "shipmentId": "CheckShipment4",  
        "pgiDateUnit": "",  
        "totalVolume": 0,  
        "totalWeight": 90,  
        "freightTerms": "",  
        "incotermInfo": "",  
        "ratingStatus": "Not Rated",  
        "shipmentType": "Buy",  
        "sourceSystem": "",  
        "numberOfStops": 0,  
        "shipDirection": "Inbound",  
        "shipmentRefId": "",  
        "shipmentRefNo": "813888",  
        "planningStatus": "Done",  
        "messageTimeStamp": "2025-12-04T07:36:11.043",  
        "shipmentStopList": \[  
            {  
                "loadId": \[  
                    "CheckLoad4"  
                \],  
                "sequence": 1,  
                "stopType": "Pickup"  
            },  
            {  
                "loadId": \[  
                    "CheckLoad4"  
                \],  
                "sequence": 2,  
                "stopType": "Dropoff"  
            }  
        \],  
        "scheduledShipDate": "2025-12-23T00:00:00",  
        "totalPackageCount": 0,  
        "externalIdentifier": "",  
        "masterShipmentDate": null,  
        "shippingOptionList": \[  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 148.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": null,  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 1,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": null,  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 2,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 263.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "Accepted",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "XPI-2-9",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": 0,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[  
                        {  
                            "code": "Base Rate",  
                            "amount": 311.020000,  
                            "uomCode": "USD",  
                            "sequence": 1,  
                            "description": "BASE RATE"  
                        },  
                        {  
                            "code": "FUE",  
                            "amount": 43.542800,  
                            "uomCode": "USD",  
                            "sequence": 2,  
                            "description": "FUEL CHARGES"  
                        }  
                    \]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "PAVITHRA",  
                "shippingOptionId": "LCE17058752CNWYLTL",  
                "responseTimeStamp": "2025-12-04T07:33:40",  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 3,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 163.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": null,  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 4,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": null,  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 5,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 278.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": "",  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": null,  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752CNWYLTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 6,  
                "deliveryDateTimeZoneCode": "US/Central"  
            }  
        \],  
        "totalVolumeUomCode": "CUFT",  
        "totalWeightUomCode": "LB",  
        "lastJobExecutedTime": null,  
        "masterShipmentNumber": null,  
        "requiredDeliveryDate": null,  
        "scheduledDeliveryDate": "2025-12-29T23:00:00",  
        "shippersShipmentNumber": "",  
        "odysseyShipmentIdentifier": "C813888",  
        "scheduledShipDateTimeZoneCode": "US/Eastern",  
        "masterShipmentDateTimeZoneCode": "UTC",  
        "scheduledDeliveryDateTimeZoneCode": "US/Central"  
    }  
}  | Check with NN team what is their transaction header id. We are using x-correlation-id : <NN transaction-id> to track the request  version 1:    _(updated on 24/02/2025)_ Version 2:      _(updated on 27/02/2025)_  Version 3 :  This will be implemented in Sprint 5    _(updated on 21/03/2025)_  Version 3: This will be implemented in sprint 5  _(updated on 25/03/2025)_  **Note:** Needs to be interacted with Order service via Feign client  **Note:**  shipmentId  will have value of **“** OdysseyShipmentIdentifier” from NN when the consolidation/shipment is created for standalone Planned bill/Load Stories for V3 version is listed below  <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-3969</custom>   <custom data-type="smartlink" data-id="id-1">https://odysseylogistics.atlassian.net/browse/OTMS-3422</custom>   Version 4  : This will be implemented in Sprint 6 _(Updated on 14/04/2025_)  <custom data-type="smartlink" data-id="id-2">https://odysseylogistics.atlassian.net/browse/OTMS-3682</custom>  Version 4  : Updated on 23rd Apr     **Note :**    `ratingStatus` will be “Complete“ when rating service response has return_code as 0. Any other value for return_code than 0 for rating service ,should set field value as “Incomplete“   Version V5 : This change was agreed on 19th May and is being worked upon in sprint 9   <custom data-type="smartlink" data-id="id-3">https://odysseylogistics.atlassian.net/browse/OTMS-5039</custom>   Version 5:  Added _**version**_ field Change in charge list object Version 6 :    Fields removed sourceRecordUpdatedTime  
    sourceRecordCreatedTime Removed total under “freightEstimate“ block  Removed Shipment accessorial   Version 7: Added new field **arMarkup** as part of the story [#3209](https://odysseylogistics.atlassian.net/browse/LINX-3209) [#3210](https://odysseylogistics.atlassian.net/browse/LINX-3210) Version 8:  Changes are :  Below dates are added at Shipment and load level in the payload 1.scheduledDeliveryDate scheduledShipDate <custom data-type="smartlink" data-id="id-4">https://odysseylogistics.atlassian.net/browse/LINX-3760</custom>      |  |
| shipment-service | Send AP shipment to NN |  |  |  | Version - V6 {  
    "buyShipmentOut": {  
        "spot": "N",  
        "origin": {  
            "city": "NORTH KINGSTOWN",  
            "email": "",  
            "phone": "",  
            "postal": "02852",  
            "region": "RI",  
            "country": "US",  
            "address1": "40 Whitecap Drive",  
            "address2": "",  
            "address3": "",  
            "fullName": "International Dioxcide, Inc.",  
            "partnerId": "ORG2527727",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO EST"  
        },  
        "pgiDate": "2025-12-11T07:50:19",  
        "pgiFlag": true,  
        "shipped": "Y",  
        "version": "V2",  
        "loadList": \[  
            {  
                "bolNo": null,  
                "order": {  
                    "bolNo": "",  
                    "loadId": 5331,  
                    "poDate": null,  
                    "orderId": 6152,  
                    "pgiFlag": true,  
                    "shipped": "N",  
                    "version": "V6",  
                    "netValue": null,  
                    "poNumber": "",  
                    "orderDate": null,  
                    "customerId": "4999",  
                    "orderLines": \[  
                        {  
                            "nmfc": 156600,  
                            "hazardId": "",  
                            "netValue": 4,  
                            "wgkClass": "Slightly Hazardous",  
                            "hazmatCode": "UN1230",  
                            "tunnelCode": "B1000",  
                            "widthValue": 30,  
                            "hazmatClass": 3,  
                            "heightValue": 2,  
                            "lengthValue": 40,  
                            "orderLineId": 5678,  
                            "volumeValue": 15,  
                            "packageCount": 2,  
                            "productClass": "H3F1R0PK",  
                            "widthUomCode": "FT",  
                            "commodityCode": 48580,  
                            "heightUomCode": "FT",  
                            "lengthUomCode": "FT",  
                            "volumeUomCode": "CUFT",  
                            "batchLotNumber": "",  
                            "harmonizedCode": "9403.20.00",  
                            "netWeightValue": 20,  
                            "apCompletedCost": 231.178743,  
                            "flashPointValue": 2,  
                            "marinePollutant": "Y",  
                            "tareWeightValue": 7,  
                            "grossWeightValue": 40,  
                            "netWeightUomCode": "LB",  
                            "boilingPointValue": 24,  
                            "flashPointUomCode": "F",  
                            "hazmatDescription": "Flammable Liquids",  
                            "tareWeightUomCode": "LB",  
                            "grossWeightUomCode": "LB",  
                            "hazmatPackingGroup": "III",  
                            "shipItemIdentifier": 100080,  
                            "boilingPointUomCode": "F",  
                            "orderLineChargeList": \[  
                                {  
                                    "orderLineChargeCode": "Base Rate",  
                                    "orderLineChargeSequence": 1,  
                                    "orderLineChargeDescription": "BASE RATE",  
                                    "orderLineChargeApCompletedCost": 177.725714,  
                                    "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                                },  
                                {  
                                    "orderLineChargeCode": "CLN",  
                                    "orderLineChargeSequence": 2,  
                                    "orderLineChargeDescription": "CLEANING CHARGE",  
                                    "orderLineChargeApCompletedCost": 28.571429,  
                                    "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                                },  
                                {  
                                    "orderLineChargeCode": "FUE",  
                                    "orderLineChargeSequence": 3,  
                                    "orderLineChargeDescription": "FUEL CHARGE",  
                                    "orderLineChargeApCompletedCost": 24.881600,  
                                    "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                                }  
                            \],  
                            "packagingIdentifier": 116600,  
                            "netValueCurrencyCode": "USD",  
                            "externalLineIdentifier": 445,  
                            "thirdPartyReferenceDate": "",  
                            "thirdPartyReferenceNumber": 33,  
                            "apCompletedCostCurrencyCode": "USD",  
                            "thirdPartyReferenceLineNumber": 34  
                        },  
                        {  
                            "nmfc": 156600,  
                            "hazardId": "",  
                            "netValue": 5,  
                            "wgkClass": "Medium Hazardous",  
                            "hazmatCode": "UN1230",  
                            "tunnelCode": "C1000",  
                            "widthValue": 2,  
                            "hazmatClass": 2,  
                            "heightValue": 5,  
                            "lengthValue": 3,  
                            "orderLineId": 5679,  
                            "volumeValue": 20,  
                            "packageCount": 1,  
                            "productClass": "H3F1R0PK",  
                            "widthUomCode": "FT",  
                            "commodityCode": 48580,  
                            "heightUomCode": "FT",  
                            "lengthUomCode": "FT",  
                            "volumeUomCode": "CUFT",  
                            "batchLotNumber": "",  
                            "harmonizedCode": 5500,  
                            "netWeightValue": 35,  
                            "apCompletedCost": 173.384057,  
                            "flashPointValue": 20,  
                            "marinePollutant": "N",  
                            "tareWeightValue": 27,  
                            "grossWeightValue": 30,  
                            "netWeightUomCode": "LB",  
                            "boilingPointValue": 30,  
                            "flashPointUomCode": "F",  
                            "hazmatDescription": "Highly Flammable Liquids",  
                            "tareWeightUomCode": "LB",  
                            "grossWeightUomCode": "LB",  
                            "hazmatPackingGroup": "II",  
                            "shipItemIdentifier": 100080,  
                            "boilingPointUomCode": "F",  
                            "orderLineChargeList": \[  
                                {  
                                    "orderLineChargeCode": "Base Rate",  
                                    "orderLineChargeSequence": 1,  
                                    "orderLineChargeDescription": "BASE RATE",  
                                    "orderLineChargeApCompletedCost": 133.294286,  
                                    "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                                },  
                                {  
                                    "orderLineChargeCode": "CLN",  
                                    "orderLineChargeSequence": 2,  
                                    "orderLineChargeDescription": "CLEANING CHARGE",  
                                    "orderLineChargeApCompletedCost": 21.428571,  
                                    "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                                },  
                                {  
                                    "orderLineChargeCode": "FUE",  
                                    "orderLineChargeSequence": 3,  
                                    "orderLineChargeDescription": "FUEL CHARGE",  
                                    "orderLineChargeApCompletedCost": 18.661200,  
                                    "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                                }  
                            \],  
                            "packagingIdentifier": 116600,  
                            "netValueCurrencyCode": "USD",  
                            "externalLineIdentifier": 55,  
                            "thirdPartyReferenceDate": "",  
                            "thirdPartyReferenceNumber": 44,  
                            "apCompletedCostCurrencyCode": "USD",  
                            "thirdPartyReferenceLineNumber": 4  
                        }  
                    \],  
                    "originCity": "NORTH KINGSTOWN",  
                    "apAllocated": 118.187482,  
                    "contactName": "QA Testing",  
                    "orderNumber": "3CheckOrderDev2",  
                    "orderStatus": {  
                        "statusType": "RELEASE",  
                        "orderStatusCode": "PLN",  
                        "orderStatusName": "Planned",  
                        "sourceAppPrimaryKey": null,  
                        "sourceApplicationId": null  
                    },  
                    "originEmail": "",  
                    "originPhone": "",  
                    "volumeValue": 35,  
                    "arCalculated": 63.976736,  
                    "incotermInfo": "CIF",  
                    "originPostal": "02852",  
                    "originRegion": "RI",  
                    "pickupNumber": "41103",  
                    "buyShipmentId": 14947,  
                    "originCountry": "US",  
                    "shipTimestamp": "2025-11-27T13:00:00",  
                    "userFieldList": \[  
                        {  
                            "name": "TEMP_SENSITIVITY",  
                            "value": "",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "EXTERNAL_TRANSACTION_ID",  
                            "value": "275434679",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "NJ OFFICE",  
                            "value": "",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "CLIENT_ORG_ID",  
                            "value": "\*ERCO_CLT_01",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "SOURCE_ID",  
                            "value": "ERCO",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "AP_SOURCE_ID",  
                            "value": "\*ODYSSEY_AP",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "AR_SOURCE_ID",  
                            "value": "ERCO",  
                            "userfieldType": "Extensible"  
                        }  
                    \],  
                    "volumeUomCode": "CUFT",  
                    "actualShipDate": "2025-11-27T13:00:00",  
                    "netWeightValue": 55,  
                    "orderReleaseId": "OR20195339",  
                    "originAddress1": "40 Whitecap Drive",  
                    "originAddress2": "",  
                    "originAddress3": "",  
                    "originFullName": "International Dioxcide, Inc.",  
                    "pickupSequence": 1,  
                    "sellShipmentId": 14948,  
                    "apCompletedCost": 404.562800,  
                    "arCompletedCost": null,  
                    "destinationCity": "BOERNE",  
                    "dropoffSequence": 2,  
                    "equipmentNumber": "A125",  
                    "freightTermCode": "Pre-Paid",  
                    "orderChargeList": \[  
                        {  
                            "orderChargeCode": "Base Rate",  
                            "orderChargeSequence": 1,  
                            "orderChargeDescription": "BASE RATE",  
                            "orderChargeApCompletedCost": 311.020000,  
                            "orderChargeApCompletedCostCurrencyCode": "USD"  
                        },  
                        {  
                            "orderChargeCode": "CLN",  
                            "orderChargeSequence": 2,  
                            "orderChargeDescription": "CLEANING CHARGE",  
                            "orderChargeApCompletedCost": 50.000000,  
                            "orderChargeApCompletedCostCurrencyCode": "USD"  
                        },  
                        {  
                            "orderChargeCode": "FUE",  
                            "orderChargeSequence": 3,  
                            "orderChargeDescription": "FUEL CHARGE",  
                            "orderChargeApCompletedCost": 43.542800,  
                            "orderChargeApCompletedCostCurrencyCode": "USD"  
                        }  
                    \],  
                    "originPartnerId": "ORG2527727",  
                    "destinationEmail": "",  
                    "destinationPhone": "",  
                    "grossWeightValue": 70,  
                    "interfaceSortKey": "",  
                    "messageTimeStamp": "2025-12-11T07:50:19",  
                    "netWeightUomCode": "LB",  
                    "shipTimeZoneCode": "EST",  
                    "deliveryTimestamp": "2025-12-30T05:00:00",  
                    "destinationPostal": "78006",  
                    "destinationRegion": "TX",  
                    "orderReleaseRefno": "DEC4O1-20195339",  
                    "originContactName": "",  
                    "pickupAppointment": "2025-11-10T13:00:00",  
                    "requestedDateType": "RDD",  
                    "requestedShipDate": null,  
                    "scheduledShipDate": "2025-12-23T00:00",  
                    "shipDirectionCode": "O",  
                    "sourceApplication": {  
                        "sourceApplicationCode": "MORD",  
                        "sourceApplicationName": "Manual Order"  
                    },  
                    "sourceOrderNumber": "3CheckOrderDev1",  
                    "availableTimestamp": null,  
                    "destinationCountry": "US",  
                    "grossWeightUomCode": "LB",  
                    "originContactTitle": "",  
                    "originSourceSystem": "TRANSPORTATION",  
                    "requestedTimestamp": "2025-12-30T05:00:00",  
                    "deliveryAppointment": "2025-11-14T13:00:00",  
                    "destinationAddress1": "39360 Bldg 1, Interstate 10W",  
                    "destinationAddress2": "",  
                    "destinationAddress3": "",  
                    "destinationFullName": "Remote Water Solutions",  
                    "requestedPickupDate": null,  
                    "buyShipmentLoadCount": 1,  
                    "deliveryTimeZoneCode": "UTC",  
                    "destinationPartnerId": "ORG2527728",  
                    "netValueCurrencyCode": "",  
                    "orderInstructionList": \[\],  
                    "orderReleaseSequence": 1,  
                    "availableTimeZoneCode": null,  
                    "interfacePrevalidated": null,  
                    "requestedDeliveryDate": "2025-11-13T13:00:00",  
                    "requestedTimeZoneCode": "UTC",  
                    "scheduledDeliveryDate": "2025-12-29T23:00",  
                    "destinationContactName": "",  
                    "isMultiLoadBuyShipment": "NO",  
                    "orderInvolvedPartyList": \[  
                        {  
                            "partyId": "ORG2527727",  
                            "address1": 131,  
                            "address2": "TRETON",  
                            "address3": "AVE",  
                            "cityName": "BOSTON",  
                            "partyName": "William",  
                            "partyType": "Shipper",  
                            "vatNumber": "",  
                            "postalCode": 997,  
                            "regionName": "MA",  
                            "countryName": "US",  
                            "sourceSystem": "TRANSPORTATION",  
                            "externalIdentifier": "ORG3463357"  
                        },  
                        {  
                            "partyId": "ORG2527728",  
                            "address1": 131,  
                            "address2": "TRETON",  
                            "address3": "AVE",  
                            "cityName": "BOSTON",  
                            "partyName": "William",  
                            "partyType": "Consignee",  
                            "vatNumber": "",  
                            "postalCode": 997,  
                            "regionName": "MA",  
                            "countryName": "US",  
                            "sourceSystem": "TRANSPORTATION",  
                            "externalIdentifier": "ORG3635273"  
                        }  
                    \],  
                    "sellShipmentOrderCount": 1,  
                    "apAllocatedCurrencyCode": "USD",  
                    "destinationContactTitle": "",  
                    "destinationSourceSystem": "TRANSPORTATION",  
                    "orderAccessorialDetails": \[  
                        {  
                            "accessorialCode": "CLN",  
                            "accessorialAmount": 50,  
                            "accessorialAmountUomCode": "USD",  
                            "orderAccessorialDetailSequence": 1  
                        }  
                    \],  
                    "arCalculatedCurrencyCode": "USD",  
                    "interfaceTransactionType": "",  
                    "isMultiOrderSellShipment": "NO",  
                    "originExternalIdentifier": "ERCO EST",  
                    "requestedShipTimeZoneCode": null,  
                    "scheduledShipTimeZoneCode": "US/Eastern",  
                    "actualShipDateTimeZoneCode": "EST",  
                    "apCompletedCostCurrencyCode": "USD",  
                    "arCompletedCostCurrencyCode": null,  
                    "orderCarrierEquipDetailList": \[  
                        {  
                            "mode": "LTL",  
                            "scacCode": "",  
                            "equipmentCode": "LTL",  
                            "carrierSequence": 1,  
                            "modeDescription": "LESS THAN TRUCKLOAD",  
                            "equipmentDescription": "LESS THAN TRUCKLOAD",  
                            "sourceCarrierEquipId": null  
                        }  
                    \],  
                    "requestedPickupTimeZoneCode": null,  
                    "destinationExternalIdentifier": "ERCO CST",  
                    "pickupAppointmentTimeZoneCode": "EST",  
                    "requestedDeliveryTimeZoneCode": "EST",  
                    "scheduledDeliveryTimeZoneCode": "US/Central",  
                    "transportationOrderIdentifier": "3CheckOrderDev2",  
                    "deliveryAppointmentTimeZoneCode": "EST"  
                },  
                "loadId": "CheckLoadDev3",  
                "origin": {  
                    "city": "NORTH KINGSTOWN",  
                    "email": "",  
                    "phone": "",  
                    "postal": "02852",  
                    "region": "RI",  
                    "country": "US",  
                    "address1": "40 Whitecap Drive",  
                    "address2": "",  
                    "address3": "",  
                    "fullName": "International Dioxcide, Inc.",  
                    "partnerId": "ORG2527727",  
                    "contactName": "",  
                    "contactTitle": "",  
                    "sourceSystem": "TRANSPORTATION",  
                    "externalIdentifier": "ERCO EST"  
                },  
                "lineList": \[  
                    {  
                        "refNo": "15373364",  
                        "lineId": "ALOD49908540",  
                        "plantCode": "",  
                        "plantName": "",  
                        "productId": "",  
                        "unitValue": "",  
                        "markNumber": "",  
                        "apAllocated": 0.000000,  
                        "arCalculated": 0.000000,  
                        "lineSequence": 2,  
                        "poLineNumber": "",  
                        "sizeRollBale": "",  
                        "shipmentNumber": "",  
                        "apAllocatedUnit": "",  
                        "containerNumber": "",  
                        "arCalculatedUnit": "",  
                        "lineListRefIdTms": "OR20195339",  
                        "userFieldLineList": \[\]  
                    }  
                \],  
                "loadType": "L",  
                "poNumber": "",  
                "loadRefNo": "15373364",  
                "shipmentId": "CheckShipmentDev3",  
                "destination": {  
                    "city": "BOERNE",  
                    "email": "",  
                    "phone": "",  
                    "postal": "78006",  
                    "region": "TX",  
                    "country": "US",  
                    "address1": "39360 Bldg 1, Interstate 10W",  
                    "address2": "",  
                    "address3": "",  
                    "fullName": "Remote Water Solutions",  
                    "partnerId": "ORG2527728",  
                    "contactName": "",  
                    "contactTitle": "",  
                    "sourceSystem": "TRANSPORTATION",  
                    "externalIdentifier": "ERCO CST"  
                },  
                "plannedCost": null,  
                "poTimeStamp": null,  
                "totalVolume": 35.000000,  
                "totalWeight": 70.000000,  
                "incotermInfo": "",  
                "loadRefIdTms": "",  
                "pickupNumber": "41103",  
                "sourceSystem": "",  
                "actualShipDate": "2025-11-27T13:00:00",  
                "planningStatus": "Done",  
                "shipmentNumber": "",  
                "distanceUomCode": "MI",  
                "instructionList": \[\],  
                "loadPartnerList": \[\],  
                "distanceDeadHead": "",  
                "distanceLineHaul": "2010",  
                "planningDateType": "RDD",  
                "scheduledShipDate": "2025-12-23T00:00:00",  
                "totalPackageCount": 1,  
                "userFieldLoadList": \[  
                    {  
                        "name": "TEMP_SENSITIVITY",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "EXTERNAL_TRANSACTION_ID",  
                        "value": "275434679",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "CONTACT",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "DATE AVAILABLE",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "PICKUP #",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "MANUAL SHIPMENT PLANNING",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "STATUS 1",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "STATUS 2",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "MANUAL TRACKING REQUEST",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "AFTER HOURS",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "CLIENT_ORG_ID",  
                        "value": "\*ERCO_CLT_01",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "SOURCE_ID",  
                        "value": "ERCO",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "AP_SOURCE_ID",  
                        "value": "\*ODYSSEY_AP",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "AR_SOURCE_ID",  
                        "value": "ERCO",  
                        "userFieldType": "Extensible"  
                    }  
                \],  
                "totalVolumeUomCode": "CUFT",  
                "totalWeightUomCode": "LB",  
                "pickupAppointmentDate": null,  
                "scheduledDeliveryDate": "2025-12-29T23:00:00",  
                "deliveryAppointmentDate": null,  
                "plannedCostCurrencyCode": "",  
                "odysseyShipmentIdentifier": "C813888",  
                "actualShipDateTimeZoneCode": "EST",  
                "pickupAppointmentTimeZoneCode": "US/Eastern",  
                "scheduledShipDateTimeZoneCode": "US/Eastern",  
                "deliveryAppointmentTimeZoneCode": "US/Central",  
                "scheduledDeliveryDateTimeZoneCode": "US/Central"  
            }  
        \],  
        "shipmentId": "14947",  
        "destination": {  
            "city": "BOERNE",  
            "email": "",  
            "phone": "",  
            "postal": "78006",  
            "region": "TX",  
            "country": "US",  
            "address1": "39360 Bldg 1, Interstate 10W",  
            "address2": "",  
            "address3": "",  
            "fullName": "Remote Water Solutions",  
            "partnerId": "ORG2527728",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO CST"  
        },  
        "pgiDateUnit": "UTC",  
        "totalVolume": 35,  
        "totalWeight": 70,  
        "freightTerms": "Pre-Paid",  
        "incotermInfo": "",  
        "ratingStatus": "Complete",  
        "shipmentType": "Buy",  
        "sourceSystem": "",  
        "numberOfStops": 2,  
        "shipDirection": "O",  
        "shipmentRefId": "CheckShipmentDev3",  
        "shipmentRefNo": "813888",  
        "actualShipDate": "2025-11-27T13:00:00",  
        "planningStatus": "Done",  
        "messageTimeStamp": "2025-12-11T07:50:19",  
        "shipmentStopList": \[  
            {  
                "loadId": \[  
                    "CheckLoadDev3"  
                \],  
                "sequence": 1,  
                "stopType": "Pickup"  
            },  
            {  
                "loadId": \[  
                    "CheckLoadDev3"  
                \],  
                "sequence": 2,  
                "stopType": "Dropoff"  
            }  
        \],  
        "scheduledShipDate": "2025-12-23T00:00:00",  
        "shipDirectionCode": "O",  
        "totalPackageCount": 0,  
        "externalIdentifier": "",  
        "masterShipmentDate": "2025-11-27T13:00:00",  
        "shippingOptionList": \[  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 148.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": null,  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 1,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": null,  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 2,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 163.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": null,  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 4,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": null,  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 5,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 278.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": null,  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752CNWYLTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 6,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "12",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "43",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 263.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "Accepted",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "XPI-2-9",  
                "distanceUomCode": "",  
                "equipmentNumber": "A125",  
                "freightEstimate": {  
                    "arMarkup": 0,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[  
                        {  
                            "code": "Base Rate",  
                            "amount": 311.020000,  
                            "uomCode": "USD",  
                            "sequence": 1,  
                            "description": "BASE RATE"  
                        },  
                        {  
                            "code": "CLN",  
                            "amount": 50.000000,  
                            "uomCode": "USD",  
                            "sequence": 2,  
                            "description": "CLEANING CHARGE"  
                        },  
                        {  
                            "code": "FUE",  
                            "amount": 43.542800,  
                            "uomCode": "USD",  
                            "sequence": 3,  
                            "description": "FUEL CHARGE"  
                        }  
                    \]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "PAVITHRA",  
                "shippingOptionId": "LCE17058752CNWYLTL",  
                "responseTimeStamp": "2025-12-04T07:33:40",  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 3,  
                "deliveryDateTimeZoneCode": "US/Central"  
            }  
        \],  
        "totalVolumeUomCode": "CUFT",  
        "totalWeightUomCode": "LB",  
        "shipmentPartnerList": null,  
        "masterShipmentNumber": null,  
        "requiredDeliveryDate": null,  
        "requestedDeliveryDate": "2025-11-13T13:00:00",  
        "scheduledDeliveryDate": "2025-12-29T23:00:00",  
        "shippersShipmentNumber": "",  
        "odysseyShipmentIdentifier": "C813888",  
        "actualShipDateTimeZoneCode": "EST",  
        "scheduledShipDateTimeZoneCode": "US/Eastern",  
        "masterShipmentDateTimeZoneCode": "EST",  
        "requestedDeliveryDateTimeZoneCode": "EST",  
        "scheduledDeliveryDateTimeZoneCode": "US/Central"  
    }  
} |  | Version - V6  {  
    "buyShipmentOut": {  
        "spot": "N",  
        "origin": {  
            "city": "NORTH KINGSTOWN",  
            "email": "",  
            "phone": "",  
            "postal": "02852",  
            "region": "RI",  
            "country": "US",  
            "address1": "40 Whitecap Drive",  
            "address2": "",  
            "address3": "",  
            "fullName": "International Dioxcide, Inc.",  
            "partnerId": "ORG2527727",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO EST"  
        },  
        "pgiDate": "2025-12-11T07:44:16",  
        "pgiFlag": true,  
        "shipped": "Y",  
        "version": "V2",  
        "loadList": \[  
            {  
                "bolNo": null,  
                "order": {  
                    "bolNo": "4CheckOrder2",  
                    "loadId": 20062,  
                    "poDate": null,  
                    "orderId": 31092,  
                    "pgiFlag": true,  
                    "shipped": "Yes",  
                    "version": "V6",  
                    "netValue": null,  
                    "poNumber": "",  
                    "orderDate": null,  
                    "customerId": "4999",  
                    "orderLines": \[  
                        {  
                            "nmfc": "",  
                            "hazardId": "",  
                            "netValue": "",  
                            "wgkClass": "",  
                            "hazmatCode": "",  
                            "tunnelCode": "",  
                            "widthValue": "",  
                            "hazmatClass": "",  
                            "heightValue": "",  
                            "lengthValue": "",  
                            "orderLineId": 2,  
                            "volumeValue": 0,  
                            "packageCount": 1,  
                            "productClass": "",  
                            "widthUomCode": "",  
                            "commodityCode": "",  
                            "heightUomCode": "",  
                            "lengthUomCode": "",  
                            "volumeUomCode": "",  
                            "batchLotNumber": "",  
                            "harmonizedCode": "",  
                            "netWeightValue": 0,  
                            "apCompletedCost": 354.562800,  
                            "flashPointValue": "",  
                            "marinePollutant": "",  
                            "tareWeightValue": 0,  
                            "grossWeightValue": 30,  
                            "netWeightUomCode": "LB",  
                            "boilingPointValue": "",  
                            "flashPointUomCode": "",  
                            "hazmatDescription": "",  
                            "tareWeightUomCode": "LB",  
                            "grossWeightUomCode": "LB",  
                            "hazmatPackingGroup": "",  
                            "shipItemIdentifier": "",  
                            "boilingPointUomCode": "",  
                            "orderLineChargeList": \[  
                                {  
                                    "orderLineChargeCode": "Base Rate",  
                                    "orderLineChargeSequence": 1,  
                                    "orderLineChargeDescription": "BASE RATE",  
                                    "orderLineChargeApCompletedCost": 311.020000,  
                                    "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                                },  
                                {  
                                    "orderLineChargeCode": "FUE",  
                                    "orderLineChargeSequence": 2,  
                                    "orderLineChargeDescription": "FUEL CHARGES",  
                                    "orderLineChargeApCompletedCost": 43.542800,  
                                    "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                                }  
                            \],  
                            "packagingIdentifier": "",  
                            "netValueCurrencyCode": "",  
                            "externalLineIdentifier": 0,  
                            "thirdPartyReferenceDate": "",  
                            "thirdPartyReferenceNumber": "",  
                            "apCompletedCostCurrencyCode": "USD",  
                            "thirdPartyReferenceLineNumber": ""  
                        }  
                    \],  
                    "originCity": "NORTH KINGSTOWN",  
                    "apAllocated": 118.187482,  
                    "contactName": "",  
                    "orderNumber": "4CheckOrder2",  
                    "orderStatus": {  
                        "statusType": "RELEASE",  
                        "orderStatusCode": "PLN",  
                        "orderStatusName": "Planned",  
                        "sourceAppPrimaryKey": null,  
                        "sourceApplicationId": null  
                    },  
                    "originEmail": "",  
                    "originPhone": "",  
                    "volumeValue": 0,  
                    "arCalculated": 63.976736,  
                    "incotermInfo": "",  
                    "originPostal": "02852",  
                    "originRegion": "RI",  
                    "pickupNumber": "41103",  
                    "buyShipmentId": 23277,  
                    "originCountry": "US",  
                    "shipTimestamp": "2025-12-23T05:00:00",  
                    "userFieldList": \[  
                        {  
                            "name": "TEMP_SENSITIVITY",  
                            "value": "",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "EXTERNAL_TRANSACTION_ID",  
                            "value": "275434679",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "NJ OFFICE",  
                            "value": "",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "CLIENT_ORG_ID",  
                            "value": "\*ERCO_CLT_01",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "SOURCE_ID",  
                            "value": "ERCO",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "AP_SOURCE_ID",  
                            "value": "\*ODYSSEY_AP",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "AR_SOURCE_ID",  
                            "value": "ERCO",  
                            "userfieldType": "Extensible"  
                        }  
                    \],  
                    "volumeUomCode": "",  
                    "actualShipDate": "2025-12-23T05:00:00",  
                    "netWeightValue": 0,  
                    "orderReleaseId": "OR20195339",  
                    "originAddress1": "40 Whitecap Drive",  
                    "originAddress2": "",  
                    "originAddress3": "",  
                    "originFullName": "International Dioxcide, Inc.",  
                    "pickupSequence": 1,  
                    "sellShipmentId": 23278,  
                    "apCompletedCost": 354.562800,  
                    "arCompletedCost": 0.0,  
                    "destinationCity": "BOERNE",  
                    "dropoffSequence": 2,  
                    "equipmentNumber": "",  
                    "freightTermCode": "Pre-Paid",  
                    "orderChargeList": \[  
                        {  
                            "orderChargeCode": "CLN",  
                            "orderChargeSequence": 2,  
                            "orderChargeApAllocated": null,  
                            "orderChargeDescription": "CLEANING CHARGE",  
                            "orderChargeArCalculated": null,  
                            "orderChargeApCompletedCost": 50.0,  
                            "orderChargeArCompletedCost": null,  
                            "orderChargeApAllocatedCurrencyCode": null,  
                            "orderChargeArCalculatedCurrencyCode": null,  
                            "orderChargeApCompletedCostCurrencyCode": "USD",  
                            "orderChargeArCompletedCostCurrencyCode": null  
                        },  
                        {  
                            "orderChargeCode": "Base Rate",  
                            "orderChargeSequence": 1,  
                            "orderChargeDescription": "BASE RATE",  
                            "orderChargeApCompletedCost": 311.020000,  
                            "orderChargeApCompletedCostCurrencyCode": "USD"  
                        },  
                        {  
                            "orderChargeCode": "FUE",  
                            "orderChargeSequence": 2,  
                            "orderChargeDescription": "FUEL CHARGES",  
                            "orderChargeApCompletedCost": 43.542800,  
                            "orderChargeApCompletedCostCurrencyCode": "USD"  
                        }  
                    \],  
                    "originPartnerId": "ORG2527727",  
                    "destinationEmail": "",  
                    "destinationPhone": "",  
                    "grossWeightValue": 30,  
                    "interfaceSortKey": "",  
                    "messageTimeStamp": "2025-12-11T07:44:16",  
                    "netWeightUomCode": "LB",  
                    "shipTimeZoneCode": "UTC",  
                    "deliveryTimestamp": "2025-12-30T05:00:00",  
                    "destinationPostal": "78006",  
                    "destinationRegion": "TX",  
                    "orderReleaseRefno": "DEC4O1-20195339",  
                    "originContactName": "",  
                    "pickupAppointment": "2025-12-23T05:00:00",  
                    "requestedDateType": "RDD",  
                    "requestedShipDate": null,  
                    "scheduledShipDate": "2025-12-23T00:00",  
                    "shipDirectionCode": "O",  
                    "sourceApplication": {  
                        "sourceApplicationCode": "MORD",  
                        "sourceApplicationName": "Manual Order"  
                    },  
                    "sourceOrderNumber": "4CheckOrder1",  
                    "availableTimestamp": null,  
                    "destinationCountry": "US",  
                    "grossWeightUomCode": "LB",  
                    "originContactTitle": "",  
                    "originSourceSystem": "TRANSPORTATION",  
                    "requestedTimestamp": "2025-12-30T05:00:00",  
                    "deliveryAppointment": "2025-12-30T05:00:00",  
                    "destinationAddress1": "39360 Bldg 1, Interstate 10W",  
                    "destinationAddress2": "",  
                    "destinationAddress3": "",  
                    "destinationFullName": "Remote Water Solutions",  
                    "requestedPickupDate": null,  
                    "buyShipmentLoadCount": 1,  
                    "deliveryTimeZoneCode": "UTC",  
                    "destinationPartnerId": "ORG2527728",  
                    "netValueCurrencyCode": "USD",  
                    "orderInstructionList": \[\],  
                    "orderReleaseSequence": 1,  
                    "availableTimeZoneCode": null,  
                    "interfacePrevalidated": null,  
                    "requestedDeliveryDate": "",  
                    "requestedTimeZoneCode": "UTC",  
                    "scheduledDeliveryDate": "2025-12-29T23:00",  
                    "destinationContactName": "",  
                    "isMultiLoadBuyShipment": "NO",  
                    "orderInvolvedPartyList": \[\],  
                    "sellShipmentOrderCount": 1,  
                    "apAllocatedCurrencyCode": "USD",  
                    "destinationContactTitle": "",  
                    "destinationSourceSystem": "TRANSPORTATION",  
                    "orderAccessorialDetails": \[\],  
                    "arCalculatedCurrencyCode": "USD",  
                    "interfaceTransactionType": "",  
                    "isMultiOrderSellShipment": "NO",  
                    "originExternalIdentifier": "ERCO EST",  
                    "requestedShipTimeZoneCode": null,  
                    "scheduledShipTimeZoneCode": "US/Eastern",  
                    "actualShipDateTimeZoneCode": "UTC",  
                    "apCompletedCostCurrencyCode": "USD",  
                    "arCompletedCostCurrencyCode": "USD",  
                    "orderCarrierEquipDetailList": \[  
                        {  
                            "mode": "LTL",  
                            "scacCode": "",  
                            "equipmentCode": "LTL",  
                            "carrierSequence": 1,  
                            "modeDescription": "LESS THAN TRUCKLOAD",  
                            "equipmentDescription": "LESS THAN TRUCKLOAD",  
                            "sourceCarrierEquipId": null  
                        }  
                    \],  
                    "requestedPickupTimeZoneCode": null,  
                    "destinationExternalIdentifier": "ERCO CST",  
                    "pickupAppointmentTimeZoneCode": "UTC",  
                    "requestedDeliveryTimeZoneCode": "",  
                    "scheduledDeliveryTimeZoneCode": "US/Central",  
                    "transportationOrderIdentifier": "4CheckOrder2",  
                    "deliveryAppointmentTimeZoneCode": "UTC"  
                },  
                "loadId": "CheckLoad4",  
                "origin": {  
                    "city": "NORTH KINGSTOWN",  
                    "email": "",  
                    "phone": "",  
                    "postal": "02852",  
                    "region": "RI",  
                    "country": "US",  
                    "address1": "40 Whitecap Drive",  
                    "address2": "",  
                    "address3": "",  
                    "fullName": "International Dioxcide, Inc.",  
                    "partnerId": "ORG2527727",  
                    "contactName": "",  
                    "contactTitle": "",  
                    "sourceSystem": "TRANSPORTATION",  
                    "externalIdentifier": "ERCO EST"  
                },  
                "lineList": \[  
                    {  
                        "refNo": "15373364",  
                        "lineId": "ALOD49908540",  
                        "plantCode": "",  
                        "plantName": "",  
                        "productId": "",  
                        "unitValue": "",  
                        "markNumber": "",  
                        "apAllocated": 0.000000,  
                        "arCalculated": 0.000000,  
                        "lineSequence": 2,  
                        "poLineNumber": "",  
                        "sizeRollBale": "",  
                        "shipmentNumber": "",  
                        "apAllocatedUnit": "",  
                        "containerNumber": "",  
                        "arCalculatedUnit": "",  
                        "lineListRefIdTms": "OR20195339",  
                        "userFieldLineList": \[\]  
                    }  
                \],  
                "loadType": "L",  
                "poNumber": "",  
                "loadRefNo": "15373364",  
                "shipmentId": "CheckShipment4",  
                "destination": {  
                    "city": "BOERNE",  
                    "email": "",  
                    "phone": "",  
                    "postal": "78006",  
                    "region": "TX",  
                    "country": "US",  
                    "address1": "39360 Bldg 1, Interstate 10W",  
                    "address2": "",  
                    "address3": "",  
                    "fullName": "Remote Water Solutions",  
                    "partnerId": "ORG2527728",  
                    "contactName": "",  
                    "contactTitle": "",  
                    "sourceSystem": "TRANSPORTATION",  
                    "externalIdentifier": "ERCO CST"  
                },  
                "plannedCost": null,  
                "poTimeStamp": null,  
                "totalVolume": 0.000000,  
                "totalWeight": 30.000000,  
                "incotermInfo": "",  
                "loadRefIdTms": "",  
                "pickupNumber": "41103",  
                "sourceSystem": "",  
                "actualShipDate": "2025-12-23T05:00:00",  
                "planningStatus": "Done",  
                "shipmentNumber": "",  
                "distanceUomCode": "MI",  
                "instructionList": \[\],  
                "loadPartnerList": \[\],  
                "distanceDeadHead": "",  
                "distanceLineHaul": "2010",  
                "planningDateType": "RDD",  
                "scheduledShipDate": "2025-12-23T00:00:00",  
                "totalPackageCount": 1,  
                "userFieldLoadList": \[  
                    {  
                        "name": "TEMP_SENSITIVITY",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "EXTERNAL_TRANSACTION_ID",  
                        "value": "275434679",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "CONTACT",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "DATE AVAILABLE",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "PICKUP #",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "MANUAL SHIPMENT PLANNING",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "STATUS 1",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "STATUS 2",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "MANUAL TRACKING REQUEST",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "AFTER HOURS",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "CLIENT_ORG_ID",  
                        "value": "\*ERCO_CLT_01",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "SOURCE_ID",  
                        "value": "ERCO",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "AP_SOURCE_ID",  
                        "value": "\*ODYSSEY_AP",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "AR_SOURCE_ID",  
                        "value": "ERCO",  
                        "userFieldType": "Extensible"  
                    }  
                \],  
                "totalVolumeUomCode": "",  
                "totalWeightUomCode": "LB",  
                "pickupAppointmentDate": null,  
                "scheduledDeliveryDate": "2025-12-29T23:00:00",  
                "deliveryAppointmentDate": null,  
                "plannedCostCurrencyCode": "",  
                "odysseyShipmentIdentifier": "C813888",  
                "actualShipDateTimeZoneCode": "UTC",  
                "pickupAppointmentTimeZoneCode": "US/Eastern",  
                "scheduledShipDateTimeZoneCode": "US/Eastern",  
                "deliveryAppointmentTimeZoneCode": "US/Central",  
                "scheduledDeliveryDateTimeZoneCode": "US/Central"  
            }  
        \],  
        "shipmentId": "23277",  
        "destination": {  
            "city": "BOERNE",  
            "email": "",  
            "phone": "",  
            "postal": "78006",  
            "region": "TX",  
            "country": "US",  
            "address1": "39360 Bldg 1, Interstate 10W",  
            "address2": "",  
            "address3": "",  
            "fullName": "Remote Water Solutions",  
            "partnerId": "ORG2527728",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO CST"  
        },  
        "pgiDateUnit": "UTC",  
        "totalVolume": 0,  
        "totalWeight": 30,  
        "freightTerms": "Pre-Paid",  
        "incotermInfo": "",  
        "ratingStatus": "Complete",  
        "shipmentType": "Buy",  
        "sourceSystem": "",  
        "numberOfStops": 2,  
        "shipDirection": "I",  
        "shipmentRefId": "CheckShipment4",  
        "shipmentRefNo": "813888",  
        "actualShipDate": "2025-12-23T05:00:00",  
        "planningStatus": "Done",  
        "messageTimeStamp": "2025-12-11T07:44:16",  
        "shipmentStopList": \[  
            {  
                "loadId": \[  
                    "CheckLoad4"  
                \],  
                "sequence": 1,  
                "stopType": "Pickup"  
            },  
            {  
                "loadId": \[  
                    "CheckLoad4"  
                \],  
                "sequence": 2,  
                "stopType": "Dropoff"  
            }  
        \],  
        "scheduledShipDate": "2025-12-23T00:00:00",  
        "shipDirectionCode": "I",  
        "totalPackageCount": 0,  
        "externalIdentifier": "",  
        "masterShipmentDate": "2025-12-23T05:00:00",  
        "shippingOptionList": \[  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 148.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 1,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 2,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 163.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 4,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 5,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 278.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752CNWYLTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 6,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "4CheckOrder2",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 263.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "Accepted",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "XPI-2-9",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": 0,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[  
                        {  
                            "code": "Base Rate",  
                            "amount": 311.020000,  
                            "uomCode": "USD",  
                            "sequence": 1,  
                            "description": "BASE RATE"  
                        },  
                        {  
                            "code": "FUE",  
                            "amount": 43.542800,  
                            "uomCode": "USD",  
                            "sequence": 2,  
                            "description": "FUEL CHARGES"  
                        }  
                    \]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "PAVITHRA",  
                "shippingOptionId": "LCE17058752CNWYLTL",  
                "responseTimeStamp": "2025-12-04T07:33:40",  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 3,  
                "deliveryDateTimeZoneCode": "US/Central"  
            }  
        \],  
        "totalVolumeUomCode": "",  
        "totalWeightUomCode": "LB",  
        "shipmentPartnerList": null,  
        "masterShipmentNumber": null,  
        "requiredDeliveryDate": null,  
        "requestedDeliveryDate": null,  
        "scheduledDeliveryDate": "2025-12-29T23:00:00",  
        "shippersShipmentNumber": "",  
        "odysseyShipmentIdentifier": "C813888",  
        "actualShipDateTimeZoneCode": "UTC",  
        "scheduledShipDateTimeZoneCode": "US/Eastern",  
        "masterShipmentDateTimeZoneCode": "UTC",  
        "requestedDeliveryDateTimeZoneCode": "",  
        "scheduledDeliveryDateTimeZoneCode": "US/Central"  
    }  
} | AP Shipment LINX to NN Version 0    Version 1 : This is agreed on 19th May 2025 meeting    Version 1:  Added Charge list at Order and Line level Change in charge list object  Version 2:     Below fields added . "version"  
"pgiFlag" Removed total under “freightEstimate“ block  Removed Shipment accessorial  Version 3:      Origin  and Destination added at shipment level “shipmentPartnerList“ is added with party Type for ““ BillTo,ShipTo,Seller etc  Order Object changes <custom data-type="mention" data-id="id-5">@Venkata Kesavarao Seerla</custom> please add   Version 4: Changes are : Below dates are added at Shipment and load level in the payload 1.scheduledDeliveryDate scheduledShipDate  <custom data-type="smartlink" data-id="id-6">https://odysseylogistics.atlassian.net/browse/LINX-3761</custom>  Logic for deriving Shipment Level Dates & Freight Term Code :- **requestedDeliveryDate:** The requestedDeliveryDate of the order corresponding to the load present in the list of loads at the last stop of the shipment. **masterShipmentDate:** The pickupAppointmentDate of the order present in the list of orders at the first stop of the shipment, if pickupAppointMent is not present, use the scheduledShipDate from the load corresponding to the aforementioned order. (During PGI,  it derives its value is the actualShipDate of the shipment. **actualShipDate:** Only to be considered while PGI, the actualShipDate of the load corresponding to the order present in the PgiPgrRequest payload with pickupSequence as 1 or any load present in the list of loads at the first stop of the shipment **freightTerms:** the freightTermCode  from the order corresponding to any load in the list of loads present at the first stop of the shipment. |  |
| shipment-service | Create Load | /shipment-service/v1/shipment | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | version 6: {  
    "load": {  
        "bolNo": null,  
        "loadId": "CheckLoadDev3",  
        "origin": {  
            "city": "NORTH KINGSTOWN",  
            "email": "",  
            "phone": "",  
            "postal": "02852",  
            "region": "RI",  
            "country": "US",  
            "address1": "40 Whitecap Drive",  
            "address2": "",  
            "address3": "",  
            "fullName": "International Dioxcide, Inc.",  
            "partnerId": "ORG2527727",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO EST"  
        },  
        "version": "v6",  
        "lineList": \[  
            {  
                "refNo": "15373364",  
                "lineId": "ALOD49908540",  
                "plantCode": "",  
                "plantName": "",  
                "productId": "",  
                "unitValue": "",  
                "markNumber": "",  
                "apAllocated": 0,  
                "arCalculated": 0,  
                "lineSequence": 2,  
                "poLineNumber": "",  
                "sizeRollBale": "",  
                "shipmentNumber": "",  
                "apAllocatedUnit": "",  
                "containerNumber": "",  
                "arCalculatedUnit": "",  
                "lineListRefIdTms": "OR20195339",  
                "userFieldLineList": \[\]  
            }  
        \],  
        "loadType": "L",  
        "poNumber": "",  
        "loadRefNo": "15373364",  
        "customerId": "4999",  
        "shipmentId": "CheckShipmentDev3",  
        "destination": {  
            "city": "BOERNE",  
            "email": "",  
            "phone": "",  
            "postal": "78006",  
            "region": "TX",  
            "country": "US",  
            "address1": "39360 Bldg 1, Interstate 10W",  
            "address2": "",  
            "address3": "",  
            "fullName": "Remote Water Solutions",  
            "partnerId": "ORG2527728",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO CST"  
        },  
        "orderNumber": "3CheckOrderDev2",  
        "plannedCost": null,  
        "poTimeStamp": null,  
        "totalVolume": 0,  
        "totalWeight": 30,  
        "incotermInfo": "",  
        "loadRefIdTms": "",  
        "pickupNumber": "41103",  
        "sourceSystem": "",  
        "netWeightValue": 0,  
        "planningStatus": "Done",  
        "shipmentNumber": "",  
        "distanceUomCode": "MI",  
        "instructionList": \[\],  
        "distanceDeadHead": "",  
        "distanceLineHaul": "2010",  
        "messageTimeStamp": "2025-12-04T07:36:08.939",  
        "netWeightUomCode": "",  
        "planningDateType": "RDD",  
        "scheduledShipDate": "2025-12-23T00:00:00",  
        "totalPackageCount": 1,  
        "userFieldLoadList": \[  
            {  
                "name": "TEMP_SENSITIVITY",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "EXTERNAL_TRANSACTION_ID",  
                "value": "275434679",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "CONTACT",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "DATE AVAILABLE",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "PICKUP #",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "MANUAL SHIPMENT PLANNING",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "STATUS 1",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "STATUS 2",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "MANUAL TRACKING REQUEST",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "AFTER HOURS",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "CLIENT_ORG_ID",  
                "value": "\*ERCO_CLT_01",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "SOURCE_ID",  
                "value": "ERCO",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "AP_SOURCE_ID",  
                "value": "\*ODYSSEY_AP",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "AR_SOURCE_ID",  
                "value": "ERCO",  
                "userFieldType": "Extensible"  
            }  
        \],  
        "totalVolumeUomCode": "CUFT",  
        "totalWeightUomCode": "LB",  
        "lastJobExecutedTime": null,  
        "shipmentPartnerList": \[\],  
        "pickupAppointmentDate": null,  
        "scheduledDeliveryDate": "2025-12-29T23:00:00",  
        "deliveryAppointmentDate": null,  
        "plannedCostCurrencyCode": "",  
        "odysseyShipmentIdentifier": "C813888",  
        "pickupAppointmentTimeZoneCode": "US/Eastern",  
        "scheduledShipDateTimeZoneCode": "US/Eastern",  
        "deliveryAppointmentTimeZoneCode": "US/Central",  
        "scheduledDeliveryDateTimeZoneCode": "US/Central"  
    },  
    "buyShipmentIn": null  
} | { “message” : “Load  created successfully” } | Version 6 {  
    "load": {  
        "bolNo": null,  
        "loadId": "CheckLoad4",  
        "origin": {  
            "city": "NORTH KINGSTOWN",  
            "email": "",  
            "phone": "",  
            "postal": "02852",  
            "region": "RI",  
            "country": "US",  
            "address1": "40 Whitecap Drive",  
            "address2": "",  
            "address3": "",  
            "fullName": "International Dioxcide, Inc.",  
            "partnerId": "ORG2527727",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO EST"  
        },  
        "version": "v6",  
        "lineList": \[  
            {  
                "refNo": "15373364",  
                "lineId": "ALOD49908540",  
                "plantCode": "",  
                "plantName": "",  
                "productId": "",  
                "unitValue": "",  
                "markNumber": "",  
                "apAllocated": 0,  
                "arCalculated": 0,  
                "lineSequence": 2,  
                "poLineNumber": "",  
                "sizeRollBale": "",  
                "shipmentNumber": "",  
                "apAllocatedUnit": "",  
                "containerNumber": "",  
                "arCalculatedUnit": "",  
                "lineListRefIdTms": "OR20195339",  
                "userFieldLineList": \[\]  
            }  
        \],  
        "loadType": "L",  
        "poNumber": "",  
        "loadRefNo": "15373364",  
        "customerId": "4999",  
        "shipmentId": "CheckShipment4",  
        "destination": {  
            "city": "BOERNE",  
            "email": "",  
            "phone": "",  
            "postal": "78006",  
            "region": "TX",  
            "country": "US",  
            "address1": "39360 Bldg 1, Interstate 10W",  
            "address2": "",  
            "address3": "",  
            "fullName": "Remote Water Solutions",  
            "partnerId": "ORG2527728",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO CST"  
        },  
        "orderNumber": "4CheckOrder2",  
        "plannedCost": null,  
        "poTimeStamp": null,  
        "totalVolume": 0,  
        "totalWeight": 30,  
        "incotermInfo": "",  
        "loadRefIdTms": "",  
        "pickupNumber": "41103",  
        "sourceSystem": "",  
        "netWeightValue": 0,  
        "planningStatus": "Done",  
        "shipmentNumber": "",  
        "distanceUomCode": "MI",  
        "instructionList": \[\],  
        "distanceDeadHead": "",  
        "distanceLineHaul": "2010",  
        "messageTimeStamp": "2025-12-04T07:36:08.939",  
        "netWeightUomCode": "",  
        "planningDateType": "RDD",  
        "scheduledShipDate": "2025-12-23T00:00:00",  
        "totalPackageCount": 1,  
        "userFieldLoadList": \[  
            {  
                "name": "TEMP_SENSITIVITY",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "EXTERNAL_TRANSACTION_ID",  
                "value": "275434679",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "CONTACT",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "DATE AVAILABLE",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "PICKUP #",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "MANUAL SHIPMENT PLANNING",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "STATUS 1",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "STATUS 2",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "MANUAL TRACKING REQUEST",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "AFTER HOURS",  
                "value": "",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "CLIENT_ORG_ID",  
                "value": "\*ERCO_CLT_01",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "SOURCE_ID",  
                "value": "ERCO",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "AP_SOURCE_ID",  
                "value": "\*ODYSSEY_AP",  
                "userFieldType": "Extensible"  
            },  
            {  
                "name": "AR_SOURCE_ID",  
                "value": "ERCO",  
                "userFieldType": "Extensible"  
            }  
        \],  
        "totalVolumeUomCode": "CUFT",  
        "totalWeightUomCode": "LB",  
        "lastJobExecutedTime": null,  
        "shipmentPartnerList": \[\],  
        "pickupAppointmentDate": null,  
        "scheduledDeliveryDate": "2025-12-29T23:00:00",  
        "deliveryAppointmentDate": null,  
        "plannedCostCurrencyCode": "",  
        "odysseyShipmentIdentifier": "C813888",  
        "pickupAppointmentTimeZoneCode": "US/Eastern",  
        "scheduledShipDateTimeZoneCode": "US/Eastern",  
        "deliveryAppointmentTimeZoneCode": "US/Central",  
        "scheduledDeliveryDateTimeZoneCode": "US/Central"  
    },  
    "buyShipmentIn": null  
} | Check with NN team what is their transaction header id. We are using x-correlation-id : <NN transaction-id> to track the request version 1:   _(updated on 24/02/2025)_  version 2:    _(updated on 27/02/2025)_  Version 3: This will be taken in the Sprint 5   _(updated on 25/03/2025)_   **NOTE :** shipmentId  will have value of **“** OdysseyShipmentIdentifier” fromNN when it is standalone Planned Bill/Load  version 4:    _(updated on 21/04/2025)_  Version 4:   Added message timestamp Added version field Version 5 :     “shipmentPartnerList“ is changes to “loadPartnerList” : **Note : Rechanged this filed to shipmentPartnerList because mapping sheet has this value and NN has already implemented logic for this key name**  Removed load accessorial Version 6   Changes are : Below dates are added at and load level in the payload 1.scheduledDeliveryDate scheduledShipDate       |  |
| shipment-service | Tendering/Acceptance/Cancellation | /shipment-service/v1/shipment | PATCH | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | The request payload of planned/consolidation bill is already given above |  |  | Only request body will state the kind of action we need to do  **Note:** Needs to be interacted with Order service via Feign client) |  |
| shipment-service | Check message if the request is for create/tendering/acceptance/cancellation | /shipment-service/v1/forward/message | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | The request payload of planned/consolidation bill is already given above | No Response |  |  If TenderStatus = ‘Cancelled’, Shipment status = ‘Cancel Load’ and Process status (for corresponding orders) = ‘Cancel load’ or equivalent in DB / schema, shipment tender can be considered as cancelled  forward to patch for cancel |  |
| shipment-service | Check message if the request is for create/tendering/acceptance/cancellation  | /shipment-service/v1/forward/message | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | Shipment payload as above having condition mentioned in description |  |  |  If TenderStatus = ‘Accepted’  then the request is for Shipment Tender Acceptance forward to Patch |  |
| shipment-service | Check message if the request is for create/tendering/acceptance/cancellation  | /shipment-service/v1/forward/message | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | Shipment payload as above having condition mentioned in description |  |  | If TenderStatus = 'Sent then the request is for shipment tendering  forward to Patch |  |
| shipment-service | Check message if the request is for create/tendering/acceptance/cancellation  | /shipment-service/v1/forward/message | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | Shipment payload as above  having condition mentioned in description |  |  |  if shipment does not exist (Consolidation and Planned Bill) forward to POST (create shipment) |  |
| shipment-service | shipment cancels | /shipment/orderNumber | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | `{` `“orderNumber“:<orderNumber>` `}` | { “shipment \_Id“: <shipment \_Id>“, “load_id“; “<load_id>” “message” : “Cancelled   successfully” } |  | <custom data-type="smartlink" data-id="id-7">https://odysseylogistics.atlassian.net/browse/OTMS-4401</custom>  |  |
| shipment-service | Call master service API `/customer-service/v1/cost-allocation-type` to get the allocation type  
  
<custom data-type="smartlink" data-id="id-8">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2408743006/Master+Data+Design-LLD#:~:text=Customer-,Get%20cost%20allocation%20type,-/customer%2Dservice/v1</custom>  |  |  |  | `{` `“profile”: “TL_ALLOC“,` `“orgId”: ”*CYRO_SYS_01”` `}` | `{` `"BY_WT" / "BY_MI_LB" / "BY_PC_LB"` `}` OR `{` `"BY_VL"` `}` |  | Open feign client call to get the allocation type from Master Service  |  |
| Shipment-service | TMS Rating Service Call |  | POST | Authorization: Basic Auth Accept: application/json Content-Type: application/json | {  
   "system_id": "KEMIRA",  
   "origin": {  
       "city": "COLUMBUS", "country": "US", "postal": "31907", "state": "GA", "site": "US39"  
   },  
   "destination": {  
       "city": "NEENAH", "country": "US", "postal": "54956", "state": "WI", "site": "US1125"  
   },  
   "dir": "O",  
   "ship_date": "2025-03-12T17:00:00-05:00",  
   "deliver_date": "2025-03-14T17:00:00-05:00",  
   "equipment_id": "TL",  
   "carrier": "KCNT",  
   "lines": \[  
       {  
           "seq": 1, "package_count": 100, "weight": 5000.0, "weight_uom": "LB", "hazardous": true  
       }  
   \],  
   "charges": \[  
        {  
            "code": "AGR"  
        }  
    \]  
}   | {  
    "pv_version": "26.04",  
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
            "charge_code": "AGR",  
            "basis": "",  
            "rate": 0.0,  
            "cost": 0.0,  
            "currency": "USD",  
            "currency_native_code": "",  
            "origin_description": "",  
            "destination_description": "",  
            "amendment": "",  
            "weight_uom": "",  
            "volume_uom": "",  
            "distance_uom": "",  
            "rate_break_id": "",  
            "rate_break": "",  
            "cost_type": "R",  
            "rated_weight": 0.0,  
            "rated_volume": 0.0  
        },  
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
} |  | <custom data-type="smartlink" data-id="id-9">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2778202116/LINX+Rating+Service+and+Cost+Allocation+to+Order?force_transition=0d588202-966a-4cdb-8774-44e52596f80c</custom>  Request Stub :  {

   "system_id": "TMS Global ID",  
   "origin": {  
       "city": "city", "country": "country", "postal": "postal", "state": "state", "site": "site"  
   },  
   "destination": {  
       "city": "city", "country": "country", "postal": "postal", "state": "state", "site": "site"  
   },  
   "dir": "I \| O",  
   "ship_date": "2025-03-03T13:18:15.215+02:00", // required  
   "deliver_date": "2025-03-03T13:18:15.218+02:00",// not required  
   "equipment_id": "QCP option equipmentId",  
   "carrier": "QCP option SCAC",  
   "lines": \[  
       {  
           "seq": 1, "item": "item", "freight_class": "freightClass", "package_count": 0, "weight": 0.0, "weight_uom": "weightUom", "volume": 0.0, "volume_uom": "volumeUom", "hazardous": true, "length": 0.0, "width": 0.0, "height": 0.0, "length_uom": "lengthUom"  
       },  
       {  
           "seq": 1, "item": "item", "freight_class": "freightClass", "package_count": 0, "weight": 0.0, "weight_uom": "weightUom", "volume": 0.0, "volume_uom": "volumeUom", "hazardous": true, "length": 0.0, "width": 0.0, "height": 0.0, "length_uom": "lengthUom"  
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
} |  |
| Shipment-service | Create Shipment (AR/Sell) |  |  |  | Version - V6 {  
    "sellShipmentOut": {  
        "spot": "N",  
        "origin": {  
            "city": "NORTH KINGSTOWN",  
            "email": "",  
            "phone": "",  
            "postal": "02852",  
            "region": "RI",  
            "country": "US",  
            "address1": "40 Whitecap Drive",  
            "address2": "",  
            "address3": "",  
            "fullName": "International Dioxcide, Inc.",  
            "partnerId": "ORG2527727",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO EST"  
        },  
        "pgiDate": "2025-12-11T07:50:18",  
        "pgiFlag": true,  
        "shipped": "Y",  
        "version": "V3",  
        "orderList": \[  
            {  
                "bolNo": "",  
                "loadId": 5331,  
                "poDate": null,  
                "orderId": 6152,  
                "pgiFlag": true,  
                "shipped": "N",  
                "version": "V6",  
                "netValue": null,  
                "poNumber": "",  
                "orderDate": null,  
                "tmsLoadId": "15373364",  
                "customerId": "4999",  
                "orderLines": \[  
                    {  
                        "nmfc": 156600,  
                        "hazardId": "",  
                        "netValue": 4,  
                        "wgkClass": "Slightly Hazardous",  
                        "hazmatCode": "UN1230",  
                        "tunnelCode": "B1000",  
                        "widthValue": 30,  
                        "hazmatClass": 3,  
                        "heightValue": 2,  
                        "lengthValue": 40,  
                        "orderLineId": 5678,  
                        "volumeValue": 15,  
                        "packageCount": 2,  
                        "productClass": "H3F1R0PK",  
                        "widthUomCode": "FT",  
                        "commodityCode": 48580,  
                        "heightUomCode": "FT",  
                        "lengthUomCode": "FT",  
                        "volumeUomCode": "CUFT",  
                        "batchLotNumber": "",  
                        "harmonizedCode": "9403.20.00",  
                        "netWeightValue": 20,  
                        "apCompletedCost": 231.178743,  
                        "flashPointValue": 2,  
                        "marinePollutant": "Y",  
                        "tareWeightValue": 7,  
                        "grossWeightValue": 40,  
                        "netWeightUomCode": "LB",  
                        "boilingPointValue": 24,  
                        "flashPointUomCode": "F",  
                        "hazmatDescription": "Flammable Liquids",  
                        "tareWeightUomCode": "LB",  
                        "grossWeightUomCode": "LB",  
                        "hazmatPackingGroup": "III",  
                        "shipItemIdentifier": 100080,  
                        "boilingPointUomCode": "F",  
                        "orderLineChargeList": \[  
                            {  
                                "orderLineChargeCode": "Base Rate",  
                                "orderLineChargeSequence": 1,  
                                "orderLineChargeDescription": "BASE RATE",  
                                "orderLineChargeApCompletedCost": 177.725714,  
                                "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                            },  
                            {  
                                "orderLineChargeCode": "CLN",  
                                "orderLineChargeSequence": 2,  
                                "orderLineChargeDescription": "CLEANING CHARGE",  
                                "orderLineChargeApCompletedCost": 28.571429,  
                                "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                            },  
                            {  
                                "orderLineChargeCode": "FUE",  
                                "orderLineChargeSequence": 3,  
                                "orderLineChargeDescription": "FUEL CHARGE",  
                                "orderLineChargeApCompletedCost": 24.881600,  
                                "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                            }  
                        \],  
                        "packagingIdentifier": 116600,  
                        "netValueCurrencyCode": "USD",  
                        "externalLineIdentifier": 445,  
                        "thirdPartyReferenceDate": "",  
                        "thirdPartyReferenceNumber": 33,  
                        "apCompletedCostCurrencyCode": "USD",  
                        "thirdPartyReferenceLineNumber": 34  
                    },  
                    {  
                        "nmfc": 156600,  
                        "hazardId": "",  
                        "netValue": 5,  
                        "wgkClass": "Medium Hazardous",  
                        "hazmatCode": "UN1230",  
                        "tunnelCode": "C1000",  
                        "widthValue": 2,  
                        "hazmatClass": 2,  
                        "heightValue": 5,  
                        "lengthValue": 3,  
                        "orderLineId": 5679,  
                        "volumeValue": 20,  
                        "packageCount": 1,  
                        "productClass": "H3F1R0PK",  
                        "widthUomCode": "FT",  
                        "commodityCode": 48580,  
                        "heightUomCode": "FT",  
                        "lengthUomCode": "FT",  
                        "volumeUomCode": "CUFT",  
                        "batchLotNumber": "",  
                        "harmonizedCode": 5500,  
                        "netWeightValue": 35,  
                        "apCompletedCost": 173.384057,  
                        "flashPointValue": 20,  
                        "marinePollutant": "N",  
                        "tareWeightValue": 27,  
                        "grossWeightValue": 30,  
                        "netWeightUomCode": "LB",  
                        "boilingPointValue": 30,  
                        "flashPointUomCode": "F",  
                        "hazmatDescription": "Highly Flammable Liquids",  
                        "tareWeightUomCode": "LB",  
                        "grossWeightUomCode": "LB",  
                        "hazmatPackingGroup": "II",  
                        "shipItemIdentifier": 100080,  
                        "boilingPointUomCode": "F",  
                        "orderLineChargeList": \[  
                            {  
                                "orderLineChargeCode": "Base Rate",  
                                "orderLineChargeSequence": 1,  
                                "orderLineChargeDescription": "BASE RATE",  
                                "orderLineChargeApCompletedCost": 133.294286,  
                                "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                            },  
                            {  
                                "orderLineChargeCode": "CLN",  
                                "orderLineChargeSequence": 2,  
                                "orderLineChargeDescription": "CLEANING CHARGE",  
                                "orderLineChargeApCompletedCost": 21.428571,  
                                "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                            },  
                            {  
                                "orderLineChargeCode": "FUE",  
                                "orderLineChargeSequence": 3,  
                                "orderLineChargeDescription": "FUEL CHARGE",  
                                "orderLineChargeApCompletedCost": 18.661200,  
                                "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                            }  
                        \],  
                        "packagingIdentifier": 116600,  
                        "netValueCurrencyCode": "USD",  
                        "externalLineIdentifier": 55,  
                        "thirdPartyReferenceDate": "",  
                        "thirdPartyReferenceNumber": 44,  
                        "apCompletedCostCurrencyCode": "USD",  
                        "thirdPartyReferenceLineNumber": 4  
                    }  
                \],  
                "originCity": "NORTH KINGSTOWN",  
                "apAllocated": 118.187482,  
                "contactName": "QA Testing",  
                "orderNumber": "3CheckOrderDev2",  
                "orderStatus": {  
                    "statusType": "RELEASE",  
                    "orderStatusCode": "PLN",  
                    "orderStatusName": "Planned",  
                    "sourceAppPrimaryKey": null,  
                    "sourceApplicationId": null  
                },  
                "originEmail": "",  
                "originPhone": "",  
                "volumeValue": 35,  
                "arCalculated": 63.976736,  
                "incotermInfo": "CIF",  
                "originPostal": "02852",  
                "originRegion": "RI",  
                "pickupNumber": "41103",  
                "buyShipmentId": 14947,  
                "originCountry": "US",  
                "userFieldList": \[  
                    {  
                        "name": "TEMP_SENSITIVITY",  
                        "value": "",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "EXTERNAL_TRANSACTION_ID",  
                        "value": "275434679",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "NJ OFFICE",  
                        "value": "",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "CLIENT_ORG_ID",  
                        "value": "\*ERCO_CLT_01",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "SOURCE_ID",  
                        "value": "ERCO",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "AP_SOURCE_ID",  
                        "value": "\*ODYSSEY_AP",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "AR_SOURCE_ID",  
                        "value": "ERCO",  
                        "userfieldType": "Extensible"  
                    }  
                \],  
                "volumeUomCode": "CUFT",  
                "actualShipDate": "2025-11-27T13:00:00",  
                "netWeightValue": 55,  
                "orderReleaseId": "OR20195339",  
                "originAddress1": "40 Whitecap Drive",  
                "originAddress2": "",  
                "originAddress3": "",  
                "originFullName": "International Dioxcide, Inc.",  
                "pickupSequence": 1,  
                "sellShipmentId": 14948,  
                "apCompletedCost": 404.562800,  
                "arCompletedCost": 0.000000,  
                "destinationCity": "BOERNE",  
                "dropoffSequence": 2,  
                "equipmentNumber": "A125",  
                "freightTermCode": "Pre-Paid",  
                "orderChargeList": \[  
                    {  
                        "orderChargeCode": "Base Rate",  
                        "orderChargeSequence": 1,  
                        "orderChargeDescription": "BASE RATE",  
                        "orderChargeApCompletedCost": 311.020000,  
                        "orderChargeApCompletedCostCurrencyCode": "USD"  
                    },  
                    {  
                        "orderChargeCode": "CLN",  
                        "orderChargeSequence": 2,  
                        "orderChargeDescription": "CLEANING CHARGE",  
                        "orderChargeApCompletedCost": 50.000000,  
                        "orderChargeApCompletedCostCurrencyCode": "USD"  
                    },  
                    {  
                        "orderChargeCode": "FUE",  
                        "orderChargeSequence": 3,  
                        "orderChargeDescription": "FUEL CHARGE",  
                        "orderChargeApCompletedCost": 43.542800,  
                        "orderChargeApCompletedCostCurrencyCode": "USD"  
                    }  
                \],  
                "originPartnerId": "ORG2527727",  
                "destinationEmail": "",  
                "destinationPhone": "",  
                "grossWeightValue": 70,  
                "interfaceSortKey": "",  
                "messageTimeStamp": "2025-12-11T07:50:21",  
                "netWeightUomCode": "LB",  
                "deliveryTimestamp": "2025-12-30T05:00:00",  
                "destinationPostal": "78006",  
                "destinationRegion": "TX",  
                "orderReleaseRefno": "DEC4O1-20195339",  
                "originContactName": "",  
                "pickupAppointment": "2025-11-10T13:00:00",  
                "requestedDateType": "RDD",  
                "requestedShipDate": null,  
                "scheduledShipDate": "2025-12-23T00:00",  
                "shipDirectionCode": "O",  
                "sourceApplication": {  
                    "sourceApplicationCode": "MORD",  
                    "sourceApplicationName": "Manual Order"  
                },  
                "sourceOrderNumber": "3CheckOrderDev1",  
                "availableTimestamp": null,  
                "destinationCountry": "US",  
                "grossWeightUomCode": "LB",  
                "originContactTitle": "",  
                "originSourceSystem": "TRANSPORTATION",  
                "requestedTimestamp": "2025-12-30T05:00:00",  
                "deliveryAppointment": "2025-11-14T13:00:00",  
                "destinationAddress1": "39360 Bldg 1, Interstate 10W",  
                "destinationAddress2": "",  
                "destinationAddress3": "",  
                "destinationFullName": "Remote Water Solutions",  
                "requestedPickupDate": null,  
                "buyShipmentLoadCount": 1,  
                "deliveryTimeZoneCode": "UTC",  
                "destinationPartnerId": "ORG2527728",  
                "netValueCurrencyCode": "",  
                "orderInstructionList": \[\],  
                "orderReleaseSequence": 1,  
                "availableTimeZoneCode": null,  
                "interfacePrevalidated": null,  
                "requestedDeliveryDate": "2025-11-13T13:00:00",  
                "requestedTimeZoneCode": "UTC",  
                "scheduledDeliveryDate": "2025-12-29T23:00",  
                "destinationContactName": "",  
                "isMultiLoadBuyShipment": "NO",  
                "orderInvolvedPartyList": \[  
                    {  
                        "partyId": "ORG2527727",  
                        "address1": 131,  
                        "address2": "TRETON",  
                        "address3": "AVE",  
                        "cityName": "BOSTON",  
                        "partyName": "William",  
                        "partyType": "Shipper",  
                        "vatNumber": "",  
                        "postalCode": 997,  
                        "regionName": "MA",  
                        "countryName": "US",  
                        "sourceSystem": "TRANSPORTATION",  
                        "externalIdentifier": "ORG3463357"  
                    },  
                    {  
                        "partyId": "ORG2527728",  
                        "address1": 131,  
                        "address2": "TRETON",  
                        "address3": "AVE",  
                        "cityName": "BOSTON",  
                        "partyName": "William",  
                        "partyType": "Consignee",  
                        "vatNumber": "",  
                        "postalCode": 997,  
                        "regionName": "MA",  
                        "countryName": "US",  
                        "sourceSystem": "TRANSPORTATION",  
                        "externalIdentifier": "ORG3635273"  
                    }  
                \],  
                "sellShipmentOrderCount": 1,  
                "apAllocatedCurrencyCode": "USD",  
                "destinationContactTitle": "",  
                "destinationSourceSystem": "TRANSPORTATION",  
                "orderAccessorialDetails": \[  
                    {  
                        "accessorialCode": "CLN",  
                        "accessorialAmount": 50,  
                        "accessorialAmountUomCode": "USD",  
                        "orderAccessorialDetailSequence": 1  
                    }  
                \],  
                "arCalculatedCurrencyCode": "USD",  
                "interfaceTransactionType": "",  
                "isMultiOrderSellShipment": "NO",  
                "originExternalIdentifier": "ERCO EST",  
                "requestedShipTimeZoneCode": null,  
                "scheduledShipTimeZoneCode": "US/Eastern",  
                "actualShipDateTimeZoneCode": "EST",  
                "apCompletedCostCurrencyCode": "USD",  
                "arCompletedCostCurrencyCode": "USD",  
                "orderCarrierEquipDetailList": \[  
                    {  
                        "mode": "LTL",  
                        "scacCode": "",  
                        "equipmentCode": "LTL",  
                        "carrierSequence": 1,  
                        "modeDescription": "LESS THAN TRUCKLOAD",  
                        "equipmentDescription": "LESS THAN TRUCKLOAD",  
                        "sourceCarrierEquipId": null  
                    }  
                \],  
                "requestedPickupTimeZoneCode": null,  
                "destinationExternalIdentifier": "ERCO CST",  
                "pickupAppointmentTimeZoneCode": "EST",  
                "requestedDeliveryTimeZoneCode": "EST",  
                "scheduledDeliveryTimeZoneCode": "US/Central",  
                "transportationOrderIdentifier": "3CheckOrderDev2",  
                "deliveryAppointmentTimeZoneCode": "EST"  
            }  
        \],  
        "customerId": "4999",  
        "shipmentId": "14948",  
        "destination": {  
            "city": "BOERNE",  
            "email": "",  
            "phone": "",  
            "postal": "78006",  
            "region": "TX",  
            "country": "US",  
            "address1": "39360 Bldg 1, Interstate 10W",  
            "address2": "",  
            "address3": "",  
            "fullName": "Remote Water Solutions",  
            "partnerId": "ORG2527728",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO CST"  
        },  
        "pgiDateUnit": "UTC",  
        "totalVolume": 35.000000,  
        "totalWeight": 70.000000,  
        "customerName": null,  
        "freightTerms": "Pre-Paid",  
        "incotermInfo": "",  
        "ratingStatus": "Error",  
        "shipmentType": "sell",  
        "sourceSystem": "",  
        "numberOfStops": 2,  
        "shipDirection": "O",  
        "shipmentRefId": "6152",  
        "shipmentRefNo": "812998",  
        "actualShipDate": "2025-11-27T13:00:00",  
        "instructionList": \[\],  
        "messageTimeStamp": "2025-12-11T07:50:19",  
        "shipmentStopList": \[  
            {  
                "sequence": 1,  
                "stopType": "Pickup",  
                "orderIdList": \[  
                    "6152"  
                \]  
            },  
            {  
                "sequence": 2,  
                "stopType": "Dropoff",  
                "orderIdList": \[  
                    "6152"  
                \]  
            }  
        \],  
        "scheduledShipDate": "2025-12-23T00:00:00",  
        "shipDirectionCode": "O",  
        "totalPackageCount": 0,  
        "masterShipmentDate": "2025-11-27T13:00:00",  
        "shippingOptionList": \[  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 148.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 1,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 2,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "12",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "43",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 0.000000,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "Accepted",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "XPI-2-9",  
                "distanceUomCode": "",  
                "equipmentNumber": "A125",  
                "freightEstimate": {  
                    "arMarkup": 0,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "PAVITHRA",  
                "shippingOptionId": "LCE17058752CNWYLTL",  
                "responseTimeStamp": "2025-12-04T07:33:40",  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 3,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 163.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 4,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 5,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 278.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752CNWYLTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 6,  
                "deliveryDateTimeZoneCode": "US/Central"  
            }  
        \],  
        "totalVolumeUomCode": "CUFT",  
        "totalWeightUomCode": "LB",  
        "shipmentPartnerList": null,  
        "masterShipmentNumber": null,  
        "requiredDeliveryDate": null,  
        "requestedDeliveryDate": "2025-11-13T13:00:00",  
        "scheduledDeliveryDate": "2025-12-29T23:00:00",  
        "shippersShipmentNumber": "",  
        "odysseyShipmentIdentifier": "C813888",  
        "actualShipDateTimeZoneCode": "EST",  
        "scheduledShipDateTimeZoneCode": "US/Eastern",  
        "masterShipmentDateTimeZoneCode": "US/Eastern",  
        "requiredDeliveryDateTimeZoneCode": null,  
        "requestedDeliveryDateTimeZoneCode": "EST",  
        "scheduledDeliveryDateTimeZoneCode": "US/Central"  
    }  
} |  | Version - V6 {  
    "sellShipmentOut": {  
        "spot": "N",  
        "origin": {  
            "city": "NORTH KINGSTOWN",  
            "email": "",  
            "phone": "",  
            "postal": "02852",  
            "region": "RI",  
            "country": "US",  
            "address1": "40 Whitecap Drive",  
            "address2": "",  
            "address3": "",  
            "fullName": "International Dioxcide, Inc.",  
            "partnerId": "ORG2527727",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO EST"  
        },  
        "pgiDate": "2025-12-11T07:44:15",  
        "pgiFlag": true,  
        "shipped": "Y",  
        "version": "V3",  
        "orderList": \[  
            {  
                "bolNo": "4CheckOrder2",  
                "loadId": 20062,  
                "poDate": null,  
                "orderId": 31092,  
                "pgiFlag": true,  
                "shipped": "Yes",  
                "version": "V6",  
                "netValue": null,  
                "poNumber": "",  
                "orderDate": null,  
                "tmsLoadId": "15373364",  
                "customerId": "4999",  
                "orderLines": \[  
                    {  
                        "nmfc": "",  
                        "hazardId": "",  
                        "netValue": "",  
                        "wgkClass": "",  
                        "hazmatCode": "",  
                        "tunnelCode": "",  
                        "widthValue": "",  
                        "hazmatClass": "",  
                        "heightValue": "",  
                        "lengthValue": "",  
                        "orderLineId": 2,  
                        "volumeValue": 0,  
                        "packageCount": 1,  
                        "productClass": "",  
                        "widthUomCode": "",  
                        "commodityCode": "",  
                        "heightUomCode": "",  
                        "lengthUomCode": "",  
                        "volumeUomCode": "",  
                        "batchLotNumber": "",  
                        "harmonizedCode": "",  
                        "netWeightValue": 0,  
                        "apCompletedCost": 354.562800,  
                        "arCompletedCost": 191.930400,  
                        "flashPointValue": "",  
                        "marinePollutant": "",  
                        "tareWeightValue": 0,  
                        "grossWeightValue": 30,  
                        "netWeightUomCode": "LB",  
                        "boilingPointValue": "",  
                        "flashPointUomCode": "",  
                        "hazmatDescription": "",  
                        "tareWeightUomCode": "LB",  
                        "grossWeightUomCode": "LB",  
                        "hazmatPackingGroup": "",  
                        "shipItemIdentifier": "",  
                        "boilingPointUomCode": "",  
                        "orderLineChargeList": \[  
                            {  
                                "orderLineChargeCode": "Base Rate",  
                                "orderLineChargeSequence": 1,  
                                "orderLineChargeDescription": "BASE RATE",  
                                "orderLineChargeApCompletedCost": 311.020000,  
                                "orderLineChargeArCompletedCost": 168.360000,  
                                "orderLineChargeApCompletedCostCurrencyCode": "USD",  
                                "orderLineChargeArCompletedCostCurrencyCode": "USD"  
                            },  
                            {  
                                "orderLineChargeCode": "FUE",  
                                "orderLineChargeSequence": 2,  
                                "orderLineChargeDescription": "FUEL CHARGES",  
                                "orderLineChargeApCompletedCost": 43.542800,  
                                "orderLineChargeArCompletedCost": 23.570400,  
                                "orderLineChargeApCompletedCostCurrencyCode": "USD",  
                                "orderLineChargeArCompletedCostCurrencyCode": "USD"  
                            }  
                        \],  
                        "packagingIdentifier": "",  
                        "netValueCurrencyCode": "",  
                        "externalLineIdentifier": 0,  
                        "thirdPartyReferenceDate": "",  
                        "thirdPartyReferenceNumber": "",  
                        "apCompletedCostCurrencyCode": "USD",  
                        "arCompletedCostCurrencyCode": "USD",  
                        "thirdPartyReferenceLineNumber": ""  
                    }  
                \],  
                "originCity": "NORTH KINGSTOWN",  
                "apAllocated": 118.187482,  
                "contactName": "",  
                "orderNumber": "4CheckOrder2",  
                "orderStatus": {  
                    "statusType": "RELEASE",  
                    "orderStatusCode": "PLN",  
                    "orderStatusName": "Planned",  
                    "sourceAppPrimaryKey": null,  
                    "sourceApplicationId": null  
                },  
                "originEmail": "",  
                "originPhone": "",  
                "volumeValue": 0,  
                "arCalculated": 63.976736,  
                "incotermInfo": "",  
                "originPostal": "02852",  
                "originRegion": "RI",  
                "pickupNumber": "41103",  
                "buyShipmentId": 23277,  
                "originCountry": "US",  
                "userFieldList": \[  
                    {  
                        "name": "TEMP_SENSITIVITY",  
                        "value": "",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "EXTERNAL_TRANSACTION_ID",  
                        "value": "275434679",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "NJ OFFICE",  
                        "value": "",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "CLIENT_ORG_ID",  
                        "value": "\*ERCO_CLT_01",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "SOURCE_ID",  
                        "value": "ERCO",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "AP_SOURCE_ID",  
                        "value": "\*ODYSSEY_AP",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "AR_SOURCE_ID",  
                        "value": "ERCO",  
                        "userfieldType": "Extensible"  
                    }  
                \],  
                "volumeUomCode": "",  
                "actualShipDate": "2025-12-23T05:00:00",  
                "netWeightValue": 0,  
                "orderReleaseId": "OR20195339",  
                "originAddress1": "40 Whitecap Drive",  
                "originAddress2": "",  
                "originAddress3": "",  
                "originFullName": "International Dioxcide, Inc.",  
                "pickupSequence": 1,  
                "sellShipmentId": 23278,  
                "apCompletedCost": 354.562800,  
                "arCompletedCost": 191.930400,  
                "destinationCity": "BOERNE",  
                "dropoffSequence": 2,  
                "equipmentNumber": "",  
                "freightTermCode": "Pre-Paid",  
                "orderChargeList": \[  
                    {  
                        "orderChargeCode": "CLN",  
                        "orderChargeSequence": 2,  
                        "orderChargeApAllocated": null,  
                        "orderChargeDescription": "CLEANING CHARGE",  
                        "orderChargeArCalculated": null,  
                        "orderChargeApCompletedCost": 50.0,  
                        "orderChargeArCompletedCost": null,  
                        "orderChargeApAllocatedCurrencyCode": null,  
                        "orderChargeArCalculatedCurrencyCode": null,  
                        "orderChargeApCompletedCostCurrencyCode": "USD",  
                        "orderChargeArCompletedCostCurrencyCode": null  
                    },  
                    {  
                        "orderChargeCode": "Base Rate",  
                        "orderChargeSequence": 1,  
                        "orderChargeDescription": "BASE RATE",  
                        "orderChargeApCompletedCost": 311.020000,  
                        "orderChargeArCompletedCost": 168.360000,  
                        "orderChargeApCompletedCostCurrencyCode": "USD",  
                        "orderChargeArCompletedCostCurrencyCode": "USD"  
                    },  
                    {  
                        "orderChargeCode": "FUE",  
                        "orderChargeSequence": 2,  
                        "orderChargeDescription": "FUEL CHARGES",  
                        "orderChargeApCompletedCost": 43.542800,  
                        "orderChargeArCompletedCost": 23.570400,  
                        "orderChargeApCompletedCostCurrencyCode": "USD",  
                        "orderChargeArCompletedCostCurrencyCode": "USD"  
                    }  
                \],  
                "originPartnerId": "ORG2527727",  
                "destinationEmail": "",  
                "destinationPhone": "",  
                "grossWeightValue": 30,  
                "interfaceSortKey": "",  
                "messageTimeStamp": "2025-12-11T07:44:18",  
                "netWeightUomCode": "LB",  
                "deliveryTimestamp": "2025-12-30T05:00:00",  
                "destinationPostal": "78006",  
                "destinationRegion": "TX",  
                "orderReleaseRefno": "DEC4O1-20195339",  
                "originContactName": "",  
                "pickupAppointment": "2025-12-23T05:00:00",  
                "requestedDateType": "RDD",  
                "requestedShipDate": null,  
                "scheduledShipDate": "2025-12-23T00:00",  
                "shipDirectionCode": "O",  
                "sourceApplication": {  
                    "sourceApplicationCode": "MORD",  
                    "sourceApplicationName": "Manual Order"  
                },  
                "sourceOrderNumber": "4CheckOrder1",  
                "availableTimestamp": null,  
                "destinationCountry": "US",  
                "grossWeightUomCode": "LB",  
                "originContactTitle": "",  
                "originSourceSystem": "TRANSPORTATION",  
                "requestedTimestamp": "2025-12-30T05:00:00",  
                "deliveryAppointment": "2025-12-30T05:00:00",  
                "destinationAddress1": "39360 Bldg 1, Interstate 10W",  
                "destinationAddress2": "",  
                "destinationAddress3": "",  
                "destinationFullName": "Remote Water Solutions",  
                "requestedPickupDate": null,  
                "buyShipmentLoadCount": 1,  
                "deliveryTimeZoneCode": "UTC",  
                "destinationPartnerId": "ORG2527728",  
                "netValueCurrencyCode": "USD",  
                "orderInstructionList": \[\],  
                "orderReleaseSequence": 1,  
                "availableTimeZoneCode": null,  
                "interfacePrevalidated": null,  
                "requestedDeliveryDate": "",  
                "requestedTimeZoneCode": "UTC",  
                "scheduledDeliveryDate": "2025-12-29T23:00",  
                "destinationContactName": "",  
                "isMultiLoadBuyShipment": "NO",  
                "orderInvolvedPartyList": \[\],  
                "sellShipmentOrderCount": 1,  
                "apAllocatedCurrencyCode": "USD",  
                "destinationContactTitle": "",  
                "destinationSourceSystem": "TRANSPORTATION",  
                "orderAccessorialDetails": \[\],  
                "arCalculatedCurrencyCode": "USD",  
                "interfaceTransactionType": "",  
                "isMultiOrderSellShipment": "NO",  
                "originExternalIdentifier": "ERCO EST",  
                "requestedShipTimeZoneCode": null,  
                "scheduledShipTimeZoneCode": "US/Eastern",  
                "actualShipDateTimeZoneCode": "UTC",  
                "apCompletedCostCurrencyCode": "USD",  
                "arCompletedCostCurrencyCode": "USD",  
                "orderCarrierEquipDetailList": \[  
                    {  
                        "mode": "LTL",  
                        "scacCode": "",  
                        "equipmentCode": "LTL",  
                        "carrierSequence": 1,  
                        "modeDescription": "LESS THAN TRUCKLOAD",  
                        "equipmentDescription": "LESS THAN TRUCKLOAD",  
                        "sourceCarrierEquipId": null  
                    }  
                \],  
                "requestedPickupTimeZoneCode": null,  
                "destinationExternalIdentifier": "ERCO CST",  
                "pickupAppointmentTimeZoneCode": "UTC",  
                "requestedDeliveryTimeZoneCode": "",  
                "scheduledDeliveryTimeZoneCode": "US/Central",  
                "transportationOrderIdentifier": "4CheckOrder2",  
                "deliveryAppointmentTimeZoneCode": "UTC"  
            }  
        \],  
        "customerId": "4999",  
        "shipmentId": "23278",  
        "destination": {  
            "city": "BOERNE",  
            "email": "",  
            "phone": "",  
            "postal": "78006",  
            "region": "TX",  
            "country": "US",  
            "address1": "39360 Bldg 1, Interstate 10W",  
            "address2": "",  
            "address3": "",  
            "fullName": "Remote Water Solutions",  
            "partnerId": "ORG2527728",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO CST"  
        },  
        "pgiDateUnit": "UTC",  
        "totalVolume": 0.000000,  
        "totalWeight": 30.000000,  
        "customerName": null,  
        "freightTerms": "Pre-Paid",  
        "incotermInfo": "",  
        "ratingStatus": "Complete",  
        "shipmentType": "sell",  
        "sourceSystem": "",  
        "numberOfStops": 2,  
        "shipDirection": "I",  
        "shipmentRefId": "31092",  
        "shipmentRefNo": "4CheckOrder2",  
        "actualShipDate": "2025-12-23T05:00:00",  
        "instructionList": \[\],  
        "messageTimeStamp": "2025-12-11T07:44:16",  
        "shipmentStopList": \[  
            {  
                "sequence": 1,  
                "stopType": "Pickup",  
                "orderIdList": \[  
                    "31092"  
                \]  
            },  
            {  
                "sequence": 2,  
                "stopType": "Dropoff",  
                "orderIdList": \[  
                    "31092"  
                \]  
            }  
        \],  
        "scheduledShipDate": "2025-12-23T00:00:00",  
        "shipDirectionCode": "I",  
        "totalPackageCount": 0,  
        "masterShipmentDate": "2025-12-23T05:00:00",  
        "shippingOptionList": \[  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 148.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 1,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 2,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 163.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 4,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 5,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 278.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752CNWYLTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 6,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "4CheckOrder2",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 191.930400,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "Accepted",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "XPI-2-9",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": 0,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[  
                        {  
                            "code": "Base Rate",  
                            "amount": 168.360000,  
                            "uomCode": "USD",  
                            "sequence": 1,  
                            "description": "BASE RATE"  
                        },  
                        {  
                            "code": "FUE",  
                            "amount": 23.570400,  
                            "uomCode": "USD",  
                            "sequence": 2,  
                            "description": "FUEL CHARGES"  
                        }  
                    \]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "PAVITHRA",  
                "shippingOptionId": "LCE17058752CNWYLTL",  
                "responseTimeStamp": "2025-12-04T07:33:40",  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 3,  
                "deliveryDateTimeZoneCode": "US/Central"  
            }  
        \],  
        "totalVolumeUomCode": "",  
        "totalWeightUomCode": "LB",  
        "shipmentPartnerList": null,  
        "masterShipmentNumber": null,  
        "requiredDeliveryDate": null,  
        "requestedDeliveryDate": null,  
        "scheduledDeliveryDate": "2025-12-29T23:00:00",  
        "shippersShipmentNumber": "",  
        "odysseyShipmentIdentifier": "C813888",  
        "actualShipDateTimeZoneCode": "UTC",  
        "scheduledShipDateTimeZoneCode": "US/Eastern",  
        "masterShipmentDateTimeZoneCode": "US/Eastern",  
        "requiredDeliveryDateTimeZoneCode": null,  
        "requestedDeliveryDateTimeZoneCode": "",  
        "scheduledDeliveryDateTimeZoneCode": "US/Central"  
    }  
} | AR shipment will be sent to NN through AWS Kenesis   Version 0:   Version 1 :  updated on : 16th May 2025 after discussion on Integration call  Version 2:   Changed the **shipmentStopList** response structure  Version 2:   Added Charge list at Order and Line level Change in charge list object in Shipment Change in Shipment stops (replaced LoadIds with OrderIds) Version 3:      Below fields added . "version"  
"pgiFlag" Removed total under “freightEstimate“ block Version 4:  “shipmentPartnerList“ is added with party Type for ““ BillTo,ShipTo,Seller etc  Version 5:  Changes are : Beloww dates are added at and load level in the payload 1.scheduledDeliveryDate scheduledShipDate      Logic for deriving Shipment Level Dates & Freight Term Code :- **requestedDeliveryDate:** The requestedDeliveryDate of the order present in the list of orders at the last stop of the shipment. **masterShipmentDate:** The pickupAppointmentDate of the order present in the list of orders at the first stop of the shipment, if pickupAppointMent is not present, use the scheduledShipDate from the load corresponding to the aforementioned order. **actualShipDate:** Only to be considered while PGI, the actualShipDate of the order present in the PgiPgrRequest payload with pickupSequence as 1 **freightTerms:** the freightTermCode  from any order  present in the list of orders present at the first stop of the shipment |  |
| shipment-service | PGI PGR updates we get from ExecutedShipment |  /shipment-service/v1/pgipgr/field/validate  /shipment-service/v1/pgipgr/field/process |  |  | {  
    "pgiPgrShipmentIn": {  
        "orderList": \[  
            {  
                "contact": {  
                    "value": "QA Testing",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "shipped": {  
                    "value": "N",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "chargeList": \[  
                    {  
                        "amount": {  
                            "value": "50",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "chargeSeq": {  
                            "value": "1",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "chargeCode": {  
                            "value": "CLN",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "amountUomCode": {  
                            "value": "USD",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": true  
                        }  
                    }  
                \],  
                "partnerList": \[  
                    {  
                        "city": {  
                            "value": "BOSTON",  
                            "required": "C",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "region": {  
                            "value": "MA",  
                            "required": "C",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "country": {  
                            "value": "US",  
                            "required": "C",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "address1": {  
                            "value": "131",  
                            "required": "C",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "address2": {  
                            "value": "TRETON",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "address3": {  
                            "value": "AVE",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "fullName": {  
                            "value": "William",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "postalCode": {  
                            "value": "0997",  
                            "required": "C",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "partnerType": {  
                            "value": "Shipper",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "siteIdentifier": {  
                            "value": "ORG3463357",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        }  
                    },  
                    {  
                        "city": {  
                            "value": "BOSTON",  
                            "required": "C",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "region": {  
                            "value": "MA",  
                            "required": "C",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "country": {  
                            "value": "US",  
                            "required": "C",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "address1": {  
                            "value": "131",  
                            "required": "C",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "address2": {  
                            "value": "TRETON",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "address3": {  
                            "value": "AVE",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "fullName": {  
                            "value": "William",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "postalCode": {  
                            "value": "0997",  
                            "required": "C",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "partnerType": {  
                            "value": "Consignee",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "siteIdentifier": {  
                            "value": "ORG3635273",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        }  
                    }  
                \],  
                "passthrough": \[  
                    {  
                        "value": "String",  
                        "required": null,  
                        "fieldName": "String",  
                        "validationRequired": false  
                    }  
                \],  
                "incotermInfo": {  
                    "value": "CIF",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "orderLineList": \[  
                    {  
                        "nmfc": {  
                            "value": "156600",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "width": {  
                            "value": "30",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "height": {  
                            "value": "2",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "length": {  
                            "value": "40",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "volume": {  
                            "value": "15",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "hazardId": {  
                            "value": "",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "netValue": {  
                            "value": "4",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "wgkClass": {  
                            "value": "Slightly Hazardous",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "netWeight": {  
                            "value": "20",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "prodClass": {  
                            "value": "H3F1R0PK",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "flashPoint": {  
                            "value": "2",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "hazmatCode": {  
                            "value": "UN1230",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "hazmatDesc": {  
                            "value": "Flammable Liquids",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "identifier": {  
                            "value": "5678",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "tareWeight": {  
                            "value": "7",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "tunnelCode": {  
                            "value": "B1000",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "grossWeight": {  
                            "value": "40",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "hazmatClass": {  
                            "value": "3",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "boilingPoint": {  
                            "value": "24",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "packageCount": {  
                            "value": "2",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "widthUomCode": {  
                            "value": "FT",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "commodityCode": {  
                            "value": "48580",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "heightUomCode": {  
                            "value": "FT",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "lengthUomCode": {  
                            "value": "FT",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "volumeUomCode": {  
                            "value": "CUFT",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "batchLotNumber": {  
                            "value": "",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "harmonizedCode": {  
                            "value": "9403.20.00",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "marinePollutant": {  
                            "value": "Y",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "netWeightUomCode": {  
                            "value": "LB",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "flashpointUomCode": {  
                            "value": "F",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "tareWeightUomCode": {  
                            "value": "LB",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "grossWeightUomCode": {  
                            "value": "LB",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "shipItemIdentifier": {  
                            "value": "000000000000100080",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "boilingPointUomCode": {  
                            "value": "F",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "packagingIdentifier": {  
                            "value": "116600",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "hazmatPackagingGroup": {  
                            "value": "III",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "netValueCurrencyCode": {  
                            "value": "USD",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "externalLineIdentifier": {  
                            "value": "445",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "thirdPartyReferenceDate": {  
                            "value": "",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "thirdPartyReferenceNumber": {  
                            "value": "33",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "thirdPartyReferenceLineNumber": {  
                            "value": "34",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        }  
                    },  
                    {  
                        "nmfc": {  
                            "value": "156600",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "width": {  
                            "value": "2",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "height": {  
                            "value": "5",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "length": {  
                            "value": "3",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "volume": {  
                            "value": "20",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "hazardId": {  
                            "value": "",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "netValue": {  
                            "value": "5",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "wgkClass": {  
                            "value": "Medium Hazardous",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "netWeight": {  
                            "value": "35",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "prodClass": {  
                            "value": "H3F1R0PK",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "flashPoint": {  
                            "value": "20",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "hazmatCode": {  
                            "value": "UN1230",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "hazmatDesc": {  
                            "value": "Highly Flammable Liquids",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "identifier": {  
                            "value": "5679",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "tareWeight": {  
                            "value": "27",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "tunnelCode": {  
                            "value": "C1000",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "grossWeight": {  
                            "value": "30",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "hazmatClass": {  
                            "value": "2",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "boilingPoint": {  
                            "value": "30",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "packageCount": {  
                            "value": "1",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "widthUomCode": {  
                            "value": "FT",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "commodityCode": {  
                            "value": "48580",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "heightUomCode": {  
                            "value": "FT",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "lengthUomCode": {  
                            "value": "FT",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "volumeUomCode": {  
                            "value": "CUFT",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "batchLotNumber": {  
                            "value": "",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "harmonizedCode": {  
                            "value": "5500",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "marinePollutant": {  
                            "value": "N",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "netWeightUomCode": {  
                            "value": "LB",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "flashpointUomCode": {  
                            "value": "F",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "tareWeightUomCode": {  
                            "value": "LB",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "grossWeightUomCode": {  
                            "value": "LB",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "shipItemIdentifier": {  
                            "value": "000000000000100080",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "boilingPointUomCode": {  
                            "value": "F",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "packagingIdentifier": {  
                            "value": "116600",  
                            "required": "Y",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "hazmatPackagingGroup": {  
                            "value": "II",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "netValueCurrencyCode": {  
                            "value": "USD",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": true  
                        },  
                        "externalLineIdentifier": {  
                            "value": "55",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "thirdPartyReferenceDate": {  
                            "value": "",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "thirdPartyReferenceNumber": {  
                            "value": "44",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        },  
                        "thirdPartyReferenceLineNumber": {  
                            "value": "4",  
                            "required": "N",  
                            "fieldName": null,  
                            "validationRequired": false  
                        }  
                    }  
                \],  
                "actualShipDate": {  
                    "value": "2025-11-27T13:00:00",  
                    "required": "Y",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "pickupSequence": {  
                    "value": "1",  
                    "required": "Y",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "dropoffSequence": {  
                    "value": "2",  
                    "required": "Y",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "equipmentNumber": null,  
                "scheduledPickupDate": {  
                    "value": "2025-11-10T13:00:00",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "plannedLoadIdentifier": {  
                    "value": "",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "requestedDeliveryDate": {  
                    "value": "2025-11-13T13:00:00",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "scheduledDeliveryDate": {  
                    "value": "2025-11-14T13:00:00",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "executedLoadIdentifier": {  
                    "value": "",  
                    "required": "Y",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "actualShipDateTimeZoneCode": {  
                    "value": "EST",  
                    "required": "Y",  
                    "fieldName": null,  
                    "validationRequired": true  
                },  
                "transportationOrderIdentifier": {  
                    "value": "3CheckOrderDev2",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "scheduledPickupDateTimeZoneCode": {  
                    "value": "EST",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "requestedDeliveryDateTimeZoneCode": {  
                    "value": "EST",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "scheduledDeliveryDateTimeZoneCode": {  
                    "value": "EST",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                }  
            }  
        \],  
        "sealNumber": {  
            "value": "43",  
            "required": "N",  
            "fieldName": null,  
            "validationRequired": false  
        },  
        "carrierSCAC": {  
            "value": "RLCA",  
            "required": "Y",  
            "fieldName": null,  
            "validationRequired": true  
        },  
        "partnerList": \[  
            {  
                "city": {  
                    "value": "Bastrop",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "name": {  
                    "value": "BillTo",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "region": {  
                    "value": "LA",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "country": {  
                    "value": "US",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "address1": {  
                    "value": "1502",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "address2": {  
                    "value": "North",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "address3": {  
                    "value": "WashingTon",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "vatNumber": {  
                    "value": "40",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "postalCode": {  
                    "value": "71220",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "routeGroup": {  
                    "value": "International",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "freightCost": {  
                    "value": "200",  
                    "required": "N",  
                    "fieldName": null,  
                    "validationRequired": false  
                },  
                "partnerType": {  
                    "value": "BillTo",  
                    "required": "Y",  
                    "fieldName": null,  
                    "validationRequired": true  
                }  
            }  
        \],  
        "freightTerms": {  
            "value": "Pre-Paid",  
            "required": "Y",  
            "fieldName": null,  
            "validationRequired": false  
        },  
        "ratingStatus": {  
            "value": "Rated",  
            "required": "N",  
            "fieldName": null,  
            "validationRequired": false  
        },  
        "equipmentType": {  
            "value": "LTL",  
            "required": "Y",  
            "fieldName": null,  
            "validationRequired": true  
        },  
        "shipDirection": {  
            "value": "O",  
            "required": "Y",  
            "fieldName": null,  
            "validationRequired": false  
        },  
        "equipmentNumber": {  
            "value": "A125",  
            "required": "N",  
            "fieldName": null,  
            "validationRequired": false  
        },  
        "masterBOLNumber": {  
            "value": "String",  
            "required": "Y",  
            "fieldName": null,  
            "validationRequired": false  
        },  
        "carrierTrackingNumber": {  
            "value": "12",  
            "required": "C",  
            "fieldName": null,  
            "validationRequired": false  
        },  
        "plannedShipmentIdentifier": {  
            "value": "14948",  
            "required": "N",  
            "fieldName": null,  
            "validationRequired": true  
        },  
        "executedShipmentIdentifier": {  
            "value": "812998",  
            "required": "Y",  
            "fieldName": null,  
            "validationRequired": false  
        }  
    }  
}  |  API response for Validation API : when  fileds in request have some errors :   {  
    "errors": \[  
        {  
            "message": "No match found",  
            "field": "prodClass",  
            "errorType": "PRODUCT_CLASS"  
        },  
        {  
            "message": "No match found",  
            "field": "netValueCurrencyCode",  
            "errorType": "COMMODITY_CODE"  
        }  
    \]  
}  Validation API response for a valid request :  {  
    "message": "Validated Successfully"  
}   |  | The pgiPgrShipmentIn and pgiPgrOrderObj should go as single message to Linx. Please use the attached payload structure June 2025 changes    Backup : May 2025 Changes    <custom data-type="smartlink" data-id="id-10">https://odysseylogistics.atlassian.net/browse/OTMS-4920</custom> [https://odysseylogistics.atlassian.net/browse/OTMS-4920](https://odysseylogistics.atlassian.net/browse/OTMS-4920)<custom data-type="smartlink" data-id="id-11">https://odysseylogistics.atlassian.net/browse/OTMS-4922</custom>   Note: The request payload for PGI / PGR is  progress in Current Sprint 9   |  |
| shipment-service | Get Sell Shipment by using Shipment Id | /shipment-service/v1/sell-shipment-out/{shipmentId} | GET | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  | {  
    "sellShipmentOut": {  
        "spot": "N",  
        "origin": {  
            "city": "NORTH KINGSTOWN",  
            "email": "",  
            "phone": "",  
            "postal": "02852",  
            "region": "RI",  
            "country": "US",  
            "address1": "40 Whitecap Drive",  
            "address2": "",  
            "address3": "",  
            "fullName": "International Dioxcide, Inc.",  
            "partnerId": "ORG2527727",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO EST"  
        },  
        "pgiDate": "2025-12-11T07:44:15",  
        "pgiFlag": true,  
        "shipped": "Y",  
        "version": "V3",  
        "orderList": \[  
            {  
                "bolNo": "4CheckOrder2",  
                "loadId": 20062,  
                "poDate": null,  
                "orderId": 31092,  
                "pgiFlag": true,  
                "shipped": "Yes",  
                "version": "V6",  
                "netValue": null,  
                "poNumber": "",  
                "orderDate": null,  
                "tmsLoadId": "15373364",  
                "customerId": "4999",  
                "orderLines": \[  
                    {  
                        "nmfc": "",  
                        "hazardId": "",  
                        "netValue": "",  
                        "wgkClass": "",  
                        "hazmatCode": "",  
                        "tunnelCode": "",  
                        "widthValue": "",  
                        "hazmatClass": "",  
                        "heightValue": "",  
                        "lengthValue": "",  
                        "orderLineId": 2,  
                        "volumeValue": 0,  
                        "packageCount": 1,  
                        "productClass": "",  
                        "widthUomCode": "",  
                        "commodityCode": "",  
                        "heightUomCode": "",  
                        "lengthUomCode": "",  
                        "volumeUomCode": "",  
                        "batchLotNumber": "",  
                        "harmonizedCode": "",  
                        "netWeightValue": 0,  
                        "apCompletedCost": 354.562800,  
                        "arCompletedCost": 191.930400,  
                        "flashPointValue": "",  
                        "marinePollutant": "",  
                        "tareWeightValue": 0,  
                        "grossWeightValue": 30,  
                        "netWeightUomCode": "LB",  
                        "boilingPointValue": "",  
                        "flashPointUomCode": "",  
                        "hazmatDescription": "",  
                        "tareWeightUomCode": "LB",  
                        "grossWeightUomCode": "LB",  
                        "hazmatPackingGroup": "",  
                        "shipItemIdentifier": "",  
                        "boilingPointUomCode": "",  
                        "orderLineChargeList": \[  
                            {  
                                "orderLineChargeCode": "Base Rate",  
                                "orderLineChargeSequence": 1,  
                                "orderLineChargeDescription": "BASE RATE",  
                                "orderLineChargeApCompletedCost": 311.020000,  
                                "orderLineChargeArCompletedCost": 168.360000,  
                                "orderLineChargeApCompletedCostCurrencyCode": "USD",  
                                "orderLineChargeArCompletedCostCurrencyCode": "USD"  
                            },  
                            {  
                                "orderLineChargeCode": "FUE",  
                                "orderLineChargeSequence": 2,  
                                "orderLineChargeDescription": "FUEL CHARGES",  
                                "orderLineChargeApCompletedCost": 43.542800,  
                                "orderLineChargeArCompletedCost": 23.570400,  
                                "orderLineChargeApCompletedCostCurrencyCode": "USD",  
                                "orderLineChargeArCompletedCostCurrencyCode": "USD"  
                            }  
                        \],  
                        "packagingIdentifier": "",  
                        "netValueCurrencyCode": "",  
                        "externalLineIdentifier": 0,  
                        "thirdPartyReferenceDate": "",  
                        "thirdPartyReferenceNumber": "",  
                        "apCompletedCostCurrencyCode": "USD",  
                        "arCompletedCostCurrencyCode": "USD",  
                        "thirdPartyReferenceLineNumber": ""  
                    }  
                \],  
                "originCity": "NORTH KINGSTOWN",  
                "apAllocated": 118.187482,  
                "contactName": "",  
                "orderNumber": "4CheckOrder2",  
                "orderStatus": {  
                    "statusType": "RELEASE",  
                    "orderStatusCode": "PLN",  
                    "orderStatusName": "Planned",  
                    "sourceAppPrimaryKey": null,  
                    "sourceApplicationId": null  
                },  
                "originEmail": "",  
                "originPhone": "",  
                "volumeValue": 0,  
                "arCalculated": 63.976736,  
                "incotermInfo": "",  
                "originPostal": "02852",  
                "originRegion": "RI",  
                "pickupNumber": "41103",  
                "buyShipmentId": 23277,  
                "originCountry": "US",  
                "userFieldList": \[  
                    {  
                        "name": "TEMP_SENSITIVITY",  
                        "value": "",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "EXTERNAL_TRANSACTION_ID",  
                        "value": "275434679",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "NJ OFFICE",  
                        "value": "",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "CLIENT_ORG_ID",  
                        "value": "\*ERCO_CLT_01",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "SOURCE_ID",  
                        "value": "ERCO",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "AP_SOURCE_ID",  
                        "value": "\*ODYSSEY_AP",  
                        "userfieldType": "Extensible"  
                    },  
                    {  
                        "name": "AR_SOURCE_ID",  
                        "value": "ERCO",  
                        "userfieldType": "Extensible"  
                    }  
                \],  
                "volumeUomCode": "",  
                "actualShipDate": "2025-12-23T05:00:00",  
                "netWeightValue": 0,  
                "orderReleaseId": "OR20195339",  
                "originAddress1": "40 Whitecap Drive",  
                "originAddress2": "",  
                "originAddress3": "",  
                "originFullName": "International Dioxcide, Inc.",  
                "pickupSequence": 1,  
                "sellShipmentId": 23278,  
                "apCompletedCost": 354.562800,  
                "arCompletedCost": 191.930400,  
                "destinationCity": "BOERNE",  
                "dropoffSequence": 2,  
                "equipmentNumber": "",  
                "freightTermCode": "Pre-Paid",  
                "orderChargeList": \[  
                    {  
                        "orderChargeCode": "CLN",  
                        "orderChargeSequence": 2,  
                        "orderChargeApAllocated": null,  
                        "orderChargeDescription": "CLEANING CHARGE",  
                        "orderChargeArCalculated": null,  
                        "orderChargeApCompletedCost": 50.0,  
                        "orderChargeArCompletedCost": null,  
                        "orderChargeApAllocatedCurrencyCode": null,  
                        "orderChargeArCalculatedCurrencyCode": null,  
                        "orderChargeApCompletedCostCurrencyCode": "USD",  
                        "orderChargeArCompletedCostCurrencyCode": null  
                    },  
                    {  
                        "orderChargeCode": "Base Rate",  
                        "orderChargeSequence": 1,  
                        "orderChargeDescription": "BASE RATE",  
                        "orderChargeApCompletedCost": 311.020000,  
                        "orderChargeArCompletedCost": 168.360000,  
                        "orderChargeApCompletedCostCurrencyCode": "USD",  
                        "orderChargeArCompletedCostCurrencyCode": "USD"  
                    },  
                    {  
                        "orderChargeCode": "FUE",  
                        "orderChargeSequence": 2,  
                        "orderChargeDescription": "FUEL CHARGES",  
                        "orderChargeApCompletedCost": 43.542800,  
                        "orderChargeArCompletedCost": 23.570400,  
                        "orderChargeApCompletedCostCurrencyCode": "USD",  
                        "orderChargeArCompletedCostCurrencyCode": "USD"  
                    }  
                \],  
                "originPartnerId": "ORG2527727",  
                "destinationEmail": "",  
                "destinationPhone": "",  
                "grossWeightValue": 30,  
                "interfaceSortKey": "",  
                "messageTimeStamp": "2025-12-11T07:44:18",  
                "netWeightUomCode": "LB",  
                "deliveryTimestamp": "2025-12-30T05:00:00",  
                "destinationPostal": "78006",  
                "destinationRegion": "TX",  
                "orderReleaseRefno": "DEC4O1-20195339",  
                "originContactName": "",  
                "pickupAppointment": "2025-12-23T05:00:00",  
                "requestedDateType": "RDD",  
                "requestedShipDate": null,  
                "scheduledShipDate": "2025-12-23T00:00",  
                "shipDirectionCode": "O",  
                "sourceApplication": {  
                    "sourceApplicationCode": "MORD",  
                    "sourceApplicationName": "Manual Order"  
                },  
                "sourceOrderNumber": "4CheckOrder1",  
                "availableTimestamp": null,  
                "destinationCountry": "US",  
                "grossWeightUomCode": "LB",  
                "originContactTitle": "",  
                "originSourceSystem": "TRANSPORTATION",  
                "requestedTimestamp": "2025-12-30T05:00:00",  
                "deliveryAppointment": "2025-12-30T05:00:00",  
                "destinationAddress1": "39360 Bldg 1, Interstate 10W",  
                "destinationAddress2": "",  
                "destinationAddress3": "",  
                "destinationFullName": "Remote Water Solutions",  
                "requestedPickupDate": null,  
                "buyShipmentLoadCount": 1,  
                "deliveryTimeZoneCode": "UTC",  
                "destinationPartnerId": "ORG2527728",  
                "netValueCurrencyCode": "USD",  
                "orderInstructionList": \[\],  
                "orderReleaseSequence": 1,  
                "availableTimeZoneCode": null,  
                "interfacePrevalidated": null,  
                "requestedDeliveryDate": "",  
                "requestedTimeZoneCode": "UTC",  
                "scheduledDeliveryDate": "2025-12-29T23:00",  
                "destinationContactName": "",  
                "isMultiLoadBuyShipment": "NO",  
                "orderInvolvedPartyList": \[\],  
                "sellShipmentOrderCount": 1,  
                "apAllocatedCurrencyCode": "USD",  
                "destinationContactTitle": "",  
                "destinationSourceSystem": "TRANSPORTATION",  
                "orderAccessorialDetails": \[\],  
                "arCalculatedCurrencyCode": "USD",  
                "interfaceTransactionType": "",  
                "isMultiOrderSellShipment": "NO",  
                "originExternalIdentifier": "ERCO EST",  
                "requestedShipTimeZoneCode": null,  
                "scheduledShipTimeZoneCode": "US/Eastern",  
                "actualShipDateTimeZoneCode": "UTC",  
                "apCompletedCostCurrencyCode": "USD",  
                "arCompletedCostCurrencyCode": "USD",  
                "orderCarrierEquipDetailList": \[  
                    {  
                        "mode": "LTL",  
                        "scacCode": "",  
                        "equipmentCode": "LTL",  
                        "carrierSequence": 1,  
                        "modeDescription": "LESS THAN TRUCKLOAD",  
                        "equipmentDescription": "LESS THAN TRUCKLOAD",  
                        "sourceCarrierEquipId": null  
                    }  
                \],  
                "requestedPickupTimeZoneCode": null,  
                "destinationExternalIdentifier": "ERCO CST",  
                "pickupAppointmentTimeZoneCode": "UTC",  
                "requestedDeliveryTimeZoneCode": "",  
                "scheduledDeliveryTimeZoneCode": "US/Central",  
                "transportationOrderIdentifier": "4CheckOrder2",  
                "deliveryAppointmentTimeZoneCode": "UTC"  
            }  
        \],  
        "customerId": "4999",  
        "shipmentId": "23278",  
        "destination": {  
            "city": "BOERNE",  
            "email": "",  
            "phone": "",  
            "postal": "78006",  
            "region": "TX",  
            "country": "US",  
            "address1": "39360 Bldg 1, Interstate 10W",  
            "address2": "",  
            "address3": "",  
            "fullName": "Remote Water Solutions",  
            "partnerId": "ORG2527728",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO CST"  
        },  
        "pgiDateUnit": "UTC",  
        "totalVolume": 0.000000,  
        "totalWeight": 30.000000,  
        "customerName": null,  
        "freightTerms": "Pre-Paid",  
        "incotermInfo": "",  
        "ratingStatus": "Complete",  
        "shipmentType": "sell",  
        "sourceSystem": "",  
        "numberOfStops": 2,  
        "shipDirection": "I",  
        "shipmentRefId": "31092",  
        "shipmentRefNo": "4CheckOrder2",  
        "actualShipDate": "2025-12-23T05:00:00",  
        "instructionList": \[\],  
        "messageTimeStamp": "2025-12-11T07:44:16",  
        "shipmentStopList": \[  
            {  
                "sequence": 1,  
                "stopType": "Pickup",  
                "orderIdList": \[  
                    "31092"  
                \]  
            },  
            {  
                "sequence": 2,  
                "stopType": "Dropoff",  
                "orderIdList": \[  
                    "31092"  
                \]  
            }  
        \],  
        "scheduledShipDate": "2025-12-23T00:00:00",  
        "shipDirectionCode": "I",  
        "totalPackageCount": 0,  
        "masterShipmentDate": "2025-12-23T05:00:00",  
        "shippingOptionList": \[  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 148.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 1,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 2,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 163.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 4,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 5,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 278.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752CNWYLTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 6,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "4CheckOrder2",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 191.930400,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "Accepted",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "XPI-2-9",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": 0,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[  
                        {  
                            "code": "Base Rate",  
                            "amount": 168.360000,  
                            "uomCode": "USD",  
                            "sequence": 1,  
                            "description": "BASE RATE"  
                        },  
                        {  
                            "code": "FUE",  
                            "amount": 23.570400,  
                            "uomCode": "USD",  
                            "sequence": 2,  
                            "description": "FUEL CHARGES"  
                        }  
                    \]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "PAVITHRA",  
                "shippingOptionId": "LCE17058752CNWYLTL",  
                "responseTimeStamp": "2025-12-04T07:33:40",  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 3,  
                "deliveryDateTimeZoneCode": "US/Central"  
            }  
        \],  
        "totalVolumeUomCode": "",  
        "totalWeightUomCode": "LB",  
        "shipmentPartnerList": null,  
        "masterShipmentNumber": null,  
        "requiredDeliveryDate": null,  
        "requestedDeliveryDate": null,  
        "scheduledDeliveryDate": "2025-12-29T23:00:00",  
        "shippersShipmentNumber": "",  
        "odysseyShipmentIdentifier": "C813888",  
        "actualShipDateTimeZoneCode": "UTC",  
        "scheduledShipDateTimeZoneCode": "US/Eastern",  
        "masterShipmentDateTimeZoneCode": "US/Eastern",  
        "requiredDeliveryDateTimeZoneCode": null,  
        "requestedDeliveryDateTimeZoneCode": "",  
        "scheduledDeliveryDateTimeZoneCode": "US/Central"  
    }  
} |  |  |  |
| shipment-service | Get Buy Shipment by using Shipment Id | /shipment-service/v1/buy-shipment-out/{shipmentId} | GET | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  | {  
    "buyShipmentOut": {  
        "spot": "N",  
        "origin": {  
            "city": "NORTH KINGSTOWN",  
            "email": "",  
            "phone": "",  
            "postal": "02852",  
            "region": "RI",  
            "country": "US",  
            "address1": "40 Whitecap Drive",  
            "address2": "",  
            "address3": "",  
            "fullName": "International Dioxcide, Inc.",  
            "partnerId": "ORG2527727",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO EST"  
        },  
        "pgiDate": "2025-12-11T07:44:16",  
        "pgiFlag": true,  
        "shipped": "Y",  
        "version": "V2",  
        "loadList": \[  
            {  
                "bolNo": null,  
                "order": {  
                    "bolNo": "4CheckOrder2",  
                    "loadId": 20062,  
                    "poDate": null,  
                    "orderId": 31092,  
                    "pgiFlag": true,  
                    "shipped": "Yes",  
                    "version": "V6",  
                    "netValue": null,  
                    "poNumber": "",  
                    "orderDate": null,  
                    "customerId": "4999",  
                    "orderLines": \[  
                        {  
                            "nmfc": "",  
                            "hazardId": "",  
                            "netValue": "",  
                            "wgkClass": "",  
                            "hazmatCode": "",  
                            "tunnelCode": "",  
                            "widthValue": "",  
                            "hazmatClass": "",  
                            "heightValue": "",  
                            "lengthValue": "",  
                            "orderLineId": 2,  
                            "volumeValue": 0,  
                            "packageCount": 1,  
                            "productClass": "",  
                            "widthUomCode": "",  
                            "commodityCode": "",  
                            "heightUomCode": "",  
                            "lengthUomCode": "",  
                            "volumeUomCode": "",  
                            "batchLotNumber": "",  
                            "harmonizedCode": "",  
                            "netWeightValue": 0,  
                            "apCompletedCost": 354.562800,  
                            "flashPointValue": "",  
                            "marinePollutant": "",  
                            "tareWeightValue": 0,  
                            "grossWeightValue": 30,  
                            "netWeightUomCode": "LB",  
                            "boilingPointValue": "",  
                            "flashPointUomCode": "",  
                            "hazmatDescription": "",  
                            "tareWeightUomCode": "LB",  
                            "grossWeightUomCode": "LB",  
                            "hazmatPackingGroup": "",  
                            "shipItemIdentifier": "",  
                            "boilingPointUomCode": "",  
                            "orderLineChargeList": \[  
                                {  
                                    "orderLineChargeCode": "Base Rate",  
                                    "orderLineChargeSequence": 1,  
                                    "orderLineChargeDescription": "BASE RATE",  
                                    "orderLineChargeApCompletedCost": 311.020000,  
                                    "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                                },  
                                {  
                                    "orderLineChargeCode": "FUE",  
                                    "orderLineChargeSequence": 2,  
                                    "orderLineChargeDescription": "FUEL CHARGES",  
                                    "orderLineChargeApCompletedCost": 43.542800,  
                                    "orderLineChargeApCompletedCostCurrencyCode": "USD"  
                                }  
                            \],  
                            "packagingIdentifier": "",  
                            "netValueCurrencyCode": "",  
                            "externalLineIdentifier": 0,  
                            "thirdPartyReferenceDate": "",  
                            "thirdPartyReferenceNumber": "",  
                            "apCompletedCostCurrencyCode": "USD",  
                            "thirdPartyReferenceLineNumber": ""  
                        }  
                    \],  
                    "originCity": "NORTH KINGSTOWN",  
                    "apAllocated": 118.187482,  
                    "contactName": "",  
                    "orderNumber": "4CheckOrder2",  
                    "orderStatus": {  
                        "statusType": "RELEASE",  
                        "orderStatusCode": "PLN",  
                        "orderStatusName": "Planned",  
                        "sourceAppPrimaryKey": null,  
                        "sourceApplicationId": null  
                    },  
                    "originEmail": "",  
                    "originPhone": "",  
                    "volumeValue": 0,  
                    "arCalculated": 63.976736,  
                    "incotermInfo": "",  
                    "originPostal": "02852",  
                    "originRegion": "RI",  
                    "pickupNumber": "41103",  
                    "buyShipmentId": 23277,  
                    "originCountry": "US",  
                    "shipTimestamp": "2025-12-23T05:00:00",  
                    "userFieldList": \[  
                        {  
                            "name": "TEMP_SENSITIVITY",  
                            "value": "",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "EXTERNAL_TRANSACTION_ID",  
                            "value": "275434679",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "NJ OFFICE",  
                            "value": "",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "CLIENT_ORG_ID",  
                            "value": "\*ERCO_CLT_01",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "SOURCE_ID",  
                            "value": "ERCO",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "AP_SOURCE_ID",  
                            "value": "\*ODYSSEY_AP",  
                            "userfieldType": "Extensible"  
                        },  
                        {  
                            "name": "AR_SOURCE_ID",  
                            "value": "ERCO",  
                            "userfieldType": "Extensible"  
                        }  
                    \],  
                    "volumeUomCode": "",  
                    "actualShipDate": "2025-12-23T05:00:00",  
                    "netWeightValue": 0,  
                    "orderReleaseId": "OR20195339",  
                    "originAddress1": "40 Whitecap Drive",  
                    "originAddress2": "",  
                    "originAddress3": "",  
                    "originFullName": "International Dioxcide, Inc.",  
                    "pickupSequence": 1,  
                    "sellShipmentId": 23278,  
                    "apCompletedCost": 354.562800,  
                    "arCompletedCost": 0.0,  
                    "destinationCity": "BOERNE",  
                    "dropoffSequence": 2,  
                    "equipmentNumber": "",  
                    "freightTermCode": "Pre-Paid",  
                    "orderChargeList": \[  
                        {  
                            "orderChargeCode": "CLN",  
                            "orderChargeSequence": 2,  
                            "orderChargeApAllocated": null,  
                            "orderChargeDescription": "CLEANING CHARGE",  
                            "orderChargeArCalculated": null,  
                            "orderChargeApCompletedCost": 50.0,  
                            "orderChargeArCompletedCost": null,  
                            "orderChargeApAllocatedCurrencyCode": null,  
                            "orderChargeArCalculatedCurrencyCode": null,  
                            "orderChargeApCompletedCostCurrencyCode": "USD",  
                            "orderChargeArCompletedCostCurrencyCode": null  
                        },  
                        {  
                            "orderChargeCode": "Base Rate",  
                            "orderChargeSequence": 1,  
                            "orderChargeDescription": "BASE RATE",  
                            "orderChargeApCompletedCost": 311.020000,  
                            "orderChargeApCompletedCostCurrencyCode": "USD"  
                        },  
                        {  
                            "orderChargeCode": "FUE",  
                            "orderChargeSequence": 2,  
                            "orderChargeDescription": "FUEL CHARGES",  
                            "orderChargeApCompletedCost": 43.542800,  
                            "orderChargeApCompletedCostCurrencyCode": "USD"  
                        }  
                    \],  
                    "originPartnerId": "ORG2527727",  
                    "destinationEmail": "",  
                    "destinationPhone": "",  
                    "grossWeightValue": 30,  
                    "interfaceSortKey": "",  
                    "messageTimeStamp": "2025-12-11T07:44:16",  
                    "netWeightUomCode": "LB",  
                    "shipTimeZoneCode": "UTC",  
                    "deliveryTimestamp": "2025-12-30T05:00:00",  
                    "destinationPostal": "78006",  
                    "destinationRegion": "TX",  
                    "orderReleaseRefno": "DEC4O1-20195339",  
                    "originContactName": "",  
                    "pickupAppointment": "2025-12-23T05:00:00",  
                    "requestedDateType": "RDD",  
                    "requestedShipDate": null,  
                    "scheduledShipDate": "2025-12-23T00:00",  
                    "shipDirectionCode": "O",  
                    "sourceApplication": {  
                        "sourceApplicationCode": "MORD",  
                        "sourceApplicationName": "Manual Order"  
                    },  
                    "sourceOrderNumber": "4CheckOrder1",  
                    "availableTimestamp": null,  
                    "destinationCountry": "US",  
                    "grossWeightUomCode": "LB",  
                    "originContactTitle": "",  
                    "originSourceSystem": "TRANSPORTATION",  
                    "requestedTimestamp": "2025-12-30T05:00:00",  
                    "deliveryAppointment": "2025-12-30T05:00:00",  
                    "destinationAddress1": "39360 Bldg 1, Interstate 10W",  
                    "destinationAddress2": "",  
                    "destinationAddress3": "",  
                    "destinationFullName": "Remote Water Solutions",  
                    "requestedPickupDate": null,  
                    "buyShipmentLoadCount": 1,  
                    "deliveryTimeZoneCode": "UTC",  
                    "destinationPartnerId": "ORG2527728",  
                    "netValueCurrencyCode": "USD",  
                    "orderInstructionList": \[\],  
                    "orderReleaseSequence": 1,  
                    "availableTimeZoneCode": null,  
                    "interfacePrevalidated": null,  
                    "requestedDeliveryDate": "",  
                    "requestedTimeZoneCode": "UTC",  
                    "scheduledDeliveryDate": "2025-12-29T23:00",  
                    "destinationContactName": "",  
                    "isMultiLoadBuyShipment": "NO",  
                    "orderInvolvedPartyList": \[\],  
                    "sellShipmentOrderCount": 1,  
                    "apAllocatedCurrencyCode": "USD",  
                    "destinationContactTitle": "",  
                    "destinationSourceSystem": "TRANSPORTATION",  
                    "orderAccessorialDetails": \[\],  
                    "arCalculatedCurrencyCode": "USD",  
                    "interfaceTransactionType": "",  
                    "isMultiOrderSellShipment": "NO",  
                    "originExternalIdentifier": "ERCO EST",  
                    "requestedShipTimeZoneCode": null,  
                    "scheduledShipTimeZoneCode": "US/Eastern",  
                    "actualShipDateTimeZoneCode": "UTC",  
                    "apCompletedCostCurrencyCode": "USD",  
                    "arCompletedCostCurrencyCode": "USD",  
                    "orderCarrierEquipDetailList": \[  
                        {  
                            "mode": "LTL",  
                            "scacCode": "",  
                            "equipmentCode": "LTL",  
                            "carrierSequence": 1,  
                            "modeDescription": "LESS THAN TRUCKLOAD",  
                            "equipmentDescription": "LESS THAN TRUCKLOAD",  
                            "sourceCarrierEquipId": null  
                        }  
                    \],  
                    "requestedPickupTimeZoneCode": null,  
                    "destinationExternalIdentifier": "ERCO CST",  
                    "pickupAppointmentTimeZoneCode": "UTC",  
                    "requestedDeliveryTimeZoneCode": "",  
                    "scheduledDeliveryTimeZoneCode": "US/Central",  
                    "transportationOrderIdentifier": "4CheckOrder2",  
                    "deliveryAppointmentTimeZoneCode": "UTC"  
                },  
                "loadId": "CheckLoad4",  
                "origin": {  
                    "city": "NORTH KINGSTOWN",  
                    "email": "",  
                    "phone": "",  
                    "postal": "02852",  
                    "region": "RI",  
                    "country": "US",  
                    "address1": "40 Whitecap Drive",  
                    "address2": "",  
                    "address3": "",  
                    "fullName": "International Dioxcide, Inc.",  
                    "partnerId": "ORG2527727",  
                    "contactName": "",  
                    "contactTitle": "",  
                    "sourceSystem": "TRANSPORTATION",  
                    "externalIdentifier": "ERCO EST"  
                },  
                "lineList": \[  
                    {  
                        "refNo": "15373364",  
                        "lineId": "ALOD49908540",  
                        "plantCode": "",  
                        "plantName": "",  
                        "productId": "",  
                        "unitValue": "",  
                        "markNumber": "",  
                        "apAllocated": 0.000000,  
                        "arCalculated": 0.000000,  
                        "lineSequence": 2,  
                        "poLineNumber": "",  
                        "sizeRollBale": "",  
                        "shipmentNumber": "",  
                        "apAllocatedUnit": "",  
                        "containerNumber": "",  
                        "arCalculatedUnit": "",  
                        "lineListRefIdTms": "OR20195339",  
                        "userFieldLineList": \[\]  
                    }  
                \],  
                "loadType": "L",  
                "poNumber": "",  
                "loadRefNo": "15373364",  
                "shipmentId": "CheckShipment4",  
                "destination": {  
                    "city": "BOERNE",  
                    "email": "",  
                    "phone": "",  
                    "postal": "78006",  
                    "region": "TX",  
                    "country": "US",  
                    "address1": "39360 Bldg 1, Interstate 10W",  
                    "address2": "",  
                    "address3": "",  
                    "fullName": "Remote Water Solutions",  
                    "partnerId": "ORG2527728",  
                    "contactName": "",  
                    "contactTitle": "",  
                    "sourceSystem": "TRANSPORTATION",  
                    "externalIdentifier": "ERCO CST"  
                },  
                "plannedCost": null,  
                "poTimeStamp": null,  
                "totalVolume": 0.000000,  
                "totalWeight": 30.000000,  
                "incotermInfo": "",  
                "loadRefIdTms": "",  
                "pickupNumber": "41103",  
                "sourceSystem": "",  
                "actualShipDate": "2025-12-23T05:00:00",  
                "planningStatus": "Done",  
                "shipmentNumber": "",  
                "distanceUomCode": "MI",  
                "instructionList": \[\],  
                "loadPartnerList": \[\],  
                "distanceDeadHead": "",  
                "distanceLineHaul": "2010",  
                "planningDateType": "RDD",  
                "scheduledShipDate": "2025-12-23T00:00:00",  
                "totalPackageCount": 1,  
                "userFieldLoadList": \[  
                    {  
                        "name": "TEMP_SENSITIVITY",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "EXTERNAL_TRANSACTION_ID",  
                        "value": "275434679",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "CONTACT",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "DATE AVAILABLE",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "PICKUP #",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "MANUAL SHIPMENT PLANNING",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "STATUS 1",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "STATUS 2",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "MANUAL TRACKING REQUEST",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "AFTER HOURS",  
                        "value": "",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "CLIENT_ORG_ID",  
                        "value": "\*ERCO_CLT_01",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "SOURCE_ID",  
                        "value": "ERCO",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "AP_SOURCE_ID",  
                        "value": "\*ODYSSEY_AP",  
                        "userFieldType": "Extensible"  
                    },  
                    {  
                        "name": "AR_SOURCE_ID",  
                        "value": "ERCO",  
                        "userFieldType": "Extensible"  
                    }  
                \],  
                "totalVolumeUomCode": "",  
                "totalWeightUomCode": "LB",  
                "pickupAppointmentDate": null,  
                "scheduledDeliveryDate": "2025-12-29T23:00:00",  
                "deliveryAppointmentDate": null,  
                "plannedCostCurrencyCode": "",  
                "odysseyShipmentIdentifier": "C813888",  
                "actualShipDateTimeZoneCode": "UTC",  
                "pickupAppointmentTimeZoneCode": "US/Eastern",  
                "scheduledShipDateTimeZoneCode": "US/Eastern",  
                "deliveryAppointmentTimeZoneCode": "US/Central",  
                "scheduledDeliveryDateTimeZoneCode": "US/Central"  
            }  
        \],  
        "shipmentId": "23277",  
        "destination": {  
            "city": "BOERNE",  
            "email": "",  
            "phone": "",  
            "postal": "78006",  
            "region": "TX",  
            "country": "US",  
            "address1": "39360 Bldg 1, Interstate 10W",  
            "address2": "",  
            "address3": "",  
            "fullName": "Remote Water Solutions",  
            "partnerId": "ORG2527728",  
            "contactName": "",  
            "contactTitle": "",  
            "sourceSystem": "TRANSPORTATION",  
            "externalIdentifier": "ERCO CST"  
        },  
        "pgiDateUnit": "UTC",  
        "totalVolume": 0,  
        "totalWeight": 30,  
        "freightTerms": "Pre-Paid",  
        "incotermInfo": "",  
        "ratingStatus": "Complete",  
        "shipmentType": "Buy",  
        "sourceSystem": "",  
        "numberOfStops": 2,  
        "shipDirection": "I",  
        "shipmentRefId": "CheckShipment4",  
        "shipmentRefNo": "813888",  
        "actualShipDate": "2025-12-23T05:00:00",  
        "planningStatus": "Done",  
        "messageTimeStamp": "2025-12-11T07:44:16",  
        "shipmentStopList": \[  
            {  
                "loadId": \[  
                    "CheckLoad4"  
                \],  
                "sequence": 1,  
                "stopType": "Pickup"  
            },  
            {  
                "loadId": \[  
                    "CheckLoad4"  
                \],  
                "sequence": 2,  
                "stopType": "Dropoff"  
            }  
        \],  
        "scheduledShipDate": "2025-12-23T00:00:00",  
        "shipDirectionCode": "I",  
        "totalPackageCount": 0,  
        "externalIdentifier": "",  
        "masterShipmentDate": "2025-12-23T05:00:00",  
        "shippingOptionList": \[  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 148.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 1,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTL",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 2,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "R & L CARRIERS",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "RLCA",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-20T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 163.176,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752RLCALTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 4,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "FEDEX PRIORITY",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "FXFE",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-24T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 171.696,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752FXFELTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 5,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LTL- FREEZE PROTECT",  
                "carrierRef": "",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTF",  
                "freightCost": 278.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": null,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[\]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "",  
                "shippingOptionId": "LCE17058752CNWYLTF",  
                "responseTimeStamp": null,  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 6,  
                "deliveryDateTimeZoneCode": "US/Central"  
            },  
            {  
                "mode": "Less Than Truck Load",  
                "modeId": "LTL",  
                "carrier": "XPO LOGISTICS LTL",  
                "distance": 0,  
                "terminal": "",  
                "carrierId": "CNWY",  
                "equipment": "LESS THAN TRUCKLOAD",  
                "carrierRef": "4CheckOrder2",  
                "pickupDate": "2025-12-23T00:00:00",  
                "sealNumber": "",  
                "subsidiary": "",  
                "equipmentId": "LTL",  
                "freightCost": 263.136,  
                "deliveryDate": "2025-12-29T23:00:00",  
                "tenderStatus": "Accepted",  
                "carrierRefType": null,  
                "responseMethod": 0,  
                "responseReason": "",  
                "transitLayover": "",  
                "carrierPickupNo": "XPI-2-9",  
                "distanceUomCode": "",  
                "equipmentNumber": "",  
                "freightEstimate": {  
                    "arMarkup": 0,  
                    "comments": "Estimate from TMS",  
                    "chargeList": \[  
                        {  
                            "code": "Base Rate",  
                            "amount": 311.020000,  
                            "uomCode": "USD",  
                            "sequence": 1,  
                            "description": "BASE RATE"  
                        },  
                        {  
                            "code": "FUE",  
                            "amount": 43.542800,  
                            "uomCode": "USD",  
                            "sequence": 2,  
                            "description": "FUEL CHARGES"  
                        }  
                    \]  
                },  
                "isCarrierQuoted": false,  
                "transitDeadHead": "",  
                "transitDuration": 0.00,  
                "transitLineHaul": "",  
                "responseComments": "",  
                "responseUserName": "PAVITHRA",  
                "shippingOptionId": "LCE17058752CNWYLTL",  
                "responseTimeStamp": "2025-12-04T07:33:40",  
                "freightCostUomCode": "USD",  
                "notificationMethod": "",  
                "notificationTimeStamp": null,  
                "pickupDateTimeZoneCode": "US/Eastern",  
                "shippingOptionSequence": 3,  
                "deliveryDateTimeZoneCode": "US/Central"  
            }  
        \],  
        "totalVolumeUomCode": "",  
        "totalWeightUomCode": "LB",  
        "shipmentPartnerList": null,  
        "masterShipmentNumber": null,  
        "requiredDeliveryDate": null,  
        "requestedDeliveryDate": null,  
        "scheduledDeliveryDate": "2025-12-29T23:00:00",  
        "shippersShipmentNumber": "",  
        "odysseyShipmentIdentifier": "C813888",  
        "actualShipDateTimeZoneCode": "UTC",  
        "scheduledShipDateTimeZoneCode": "US/Eastern",  
        "masterShipmentDateTimeZoneCode": "UTC",  
        "requestedDeliveryDateTimeZoneCode": "",  
        "scheduledDeliveryDateTimeZoneCode": "US/Central"  
    }  
} |  |  |  |
| shipment-service | Validate Sell Shipment | /shipment-service/v1/sell-shipment/{shipment-id}/exists | GET | Authorization:<token>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  | { flag : true/false } |  | LINX must validate the Planned Shipment ID against its internal database using the associated Customer ID. |  |
| shipment-service | Send Accurals to  Customer portal |  |  |  | Version : 2 {  
    "costAccrualsOut": {  
        "carrier": "R & L CARRIERS",  
        "revision": 1, // auto-increment  
        "orderList": \[  
            {  
                "orderLines": \[  
                    {  
                        "orderLineIdentifier": 5678, // order.orderLine.lineIdentifier  
                        "orderLineFreightCost": 232.067371, // Cost Allocation to line level from order		  
                        "externalLineIdentifier": 445 //otrder.orderLine.externalLineIdentifier  
                    },  
                    {  
                        "orderLineIdentifier": 5679, // order.orderLine.lineIdentifier  
                        "orderLineFreightCost": 174.050529, // Cost Allocation to line level from order		  
                        "externalLineIdentifier": 55 //otrder.orderLine.externalLineIdentifier  
                    }  
                \],  
                "orderFreightCost": 0.000000, // Calculate from TMS rating engine  
                "shipToSiteIdentifier": "ORG3635273", //order.orderInvolvedPartyList\[index\].partyType='ShipTo',partyId  
                "shipFromSiteIdentifier": "ORG3463357", //order.orderInvolvedPartyList\[index\].partyType='ShipFrom',partyId  
                "executedOrderIdentifier": "2CheckOrderDev2" // Linx Order Id  
            }  
        \],  
        "carrierScac": "RLCA",  
        "freightCost": 0.000000, //Shipping Options  
        "shipDirection": "O",  
        "masterBOLNumber": "String",  
        "grossWeightValue": 70.000000, // Order Line  
        "freightCostUomCode": "USD", //Shipping Options  
        "grossWeightUomCode": "LB", //Order Line  
        "shipmentChargeList": \[  
            {  
                "chargeCode": "Base Rate",  
                "chargeAmountAR": 0.000000,  
                "chargeSequence": 1,  
                "chargeDescription": "BASE RATE", // Type of charge  
                "chargeCompletedCostAR": 0.000000,  
                "chargeCompletedCostARCurrencyCode": null  
            },  
            {  
                "chargeCode": "CLN",  
                "chargeAmountAR": 0.000000,  
                "chargeSequence": 2,  
                "chargeDescription": "CLEANING CHARGE",  
                "chargeCompletedCostAR": 0.000000,  
                "chargeCompletedCostARCurrencyCode": null  
            },  
            {  
                "chargeCode": "FUE",  
                "chargeAmountAR": 0.000000,  
                "chargeSequence": 3,  
                "chargeDescription": "FUEL CHARGE",  
                "chargeCompletedCostAR": 0.000000,  
                "chargeCompletedCostARCurrencyCode": null  
            }  
        \],  
        "linxShipmentIdentifier": "14926",  
        "executedShipmentIdentifier": "812998"  
    }  
} |  | Version 1 {  
    "costAccrualsOut": {  
        "carrier": "R & L CARRIERS", //ARShipmentOutDTO.arShipment.shippingOptionList.carrier (Santosh) (List->Accepted carrier)  
        "revision": 1, // auto-increment (Need to check Jana and Saiket)  
        "orderList": \[  
            {  
                "orderLines": \[  
                    {  
                        "orderLineIdentifier": 5678, // order.orderLine.lineIdentifier//OrderLineId  
                        "orderLineFreightCost": 232.067371, // Cost Allocation to line level from order  (From order-line .completedcostAR)  
                        "externalLineIdentifier": 445 //otrder.orderLine.externalLineIdentifier (Currently it is mapped to sequence_number)  
                    },  
                    {  
                        "orderLineIdentifier": 5679, // order.orderLine.lineIdentifier//OrderLineId  
                        "orderLineFreightCost": 174.050529, // Cost Allocation to line level from order  (From order-line .completedcostAR)  
                        "externalLineIdentifier": 55 //otrder.orderLine.externalLineIdentifier (Currently it is mapped to sequence_number)  
                    }  
                \],  
                "orderFreightCost": 0.000000, // Calculate from TMS rating engine (Need to check) (From order-info.completedcostAR)  
                "shipToSiteIdentifier": "", //order.orderInvolvedPartyList\[index\].partyType='ShipTo',partyId  
                "shipFromSiteIdentifier": "", //order.orderInvolvedPartyList\[index\].partyType='ShipFrom',partyId  
                "executedOrderIdentifier": "3CheckOrder2" // Linx Order Id  
            }  
        \],  
        "carrierScac": "RLCA", //(PGI/PGR request)  
        "freightCost": 0.000000, //ARShipmentOutDTO.arShipment.shippingOptionList.freightCost (Santosh)  
        "shipDirection": "O",  
        "masterBOLNumber": "String",  
        "grossWeightValue": 70.000000, //ARShipmentOutDTO.arShipment.totalWeight  
        "freightCostUomCode": "USD", //Shipping Options //ARShipmentOutDTO.arShipment.shippingOptionList.freightCostUomCode (Santosh)  
        "grossWeightUomCode": "LB", //Order Line (Need to check)//ARShipmentOutDTO.arShipment.totalWeight  
        "shipmentChargeList": \[ \[  //Need to check (ARShipmentOutDTO.arShipment.shippingOptionList.freightEstimate.chargList) (Accepted)  
            {  
                "chargeCode": "Base Rate",  
                "chargeAmountAR": 0.000000, //Need to check (planned)  
                "chargeSequence": 1,  
                "chargeDescription": "BASE RATE", // Type of charge  
                "chargeCompletedCostAR": 0.000000, //(Need to check with Saiket)  
                "chargeCompletedCostARCurrencyCode": null  
            },  
            {  
                "chargeCode": "CLN",  
                "chargeAmountAR": 0.000000,  
                "chargeSequence": 2,  
                "chargeDescription": "CLEANING CHARGE",  
                "chargeCompletedCostAR": 0.000000,  
                "chargeCompletedCostARCurrencyCode": null  
            },  
            {  
                "chargeCode": "FUE",  
                "chargeAmountAR": 0.000000,  
                "chargeSequence": 3,  
                "chargeDescription": "FUEL CHARGES",  
                "chargeCompletedCostAR": 0.000000,  
                "chargeCompletedCostARCurrencyCode": null  
            }  
        \],  
        "linxShipmentIdentifier": "23145",  
        "executedShipmentIdentifier": "812998" // (PGI/PGR request)// provided by customer ,it is billofLadingNumber/ masterBillofLading  
    }  
}   | <custom data-type="smartlink" data-id="id-12">https://odysseylogistics.atlassian.net/browse/LINX-2480</custom>  <custom data-type="smartlink" data-id="id-13">https://odysseylogistics.atlassian.net/browse/LINX-2474</custom>  <custom data-type="smartlink" data-id="id-14">https://odysseylogistics.atlassian.net/browse/LINX-532</custom>  This is internal trigger Post PGI/PGR for Sell Shipment when rerate happens Accrual details to Customer ERP via Linx>Kinesis>Boomi>Gateways>Customer |  |
| shipment-service |  |  |  |  | {  
"deleteBuy":{  
"shipmentId":<shipmentId>}

} |  |  | This message will be triggered from LINX to NN <custom data-type="smartlink" data-id="id-15">https://odysseylogistics.atlassian.net/browse/LINX-2464</custom>   |  |
| shipment-service |  |  |  |  | {  
"deleteSell":{  
"shipmentId":<shipmentId>}  
}
 |  |  | This message will be triggered from LINX to NN  [\[LINX-2465\] All Orders Removed and Sell Consolidation Deleted – Message Triggered to Downstream Application - Jira](https://odysseylogistics.atlassian.net/browse/LINX-2465)  |  |
| shipment-service |  |  |  |  | {  
"deleteLoad":{  
"loadId":<loadId>,  
"shipmentId":<shipmentId> //optional  
}  
}  |  |  | This message will be triggered from LINX to NN <custom data-type="smartlink" data-id="id-16">https://odysseylogistics.atlassian.net/browse/LINX-2463</custom>  |  |
| shipment-service | Send planned LINX Customer (Sell / AR) Shipment information to Customer ERP |  |  |  | {  
    "sellPlannedShipmentOut": {  
        "sourceId": "ERCO",  
        "orderList": \[  
            {  
                "contactName": "",  
                "orderLineList": \[  
                    {  
                        "widthValue": 0.0,  
                        "heightValue": 0.0,  
                        "lengthValue": 0.0,  
                        "orderLineId": 30916,  
                        "volumeValue": 0.0,  
                        "packageCount": 1,  
                        "widthUomCode": "",  
                        "heightUomCode": "",  
                        "lengthUomCode": "",  
                        "volumeUomCode": "",  
                        "batchLotNumber": "",  
                        "lineIdentifier": "2",  
                        "netWeightValue": 0.0,  
                        "tareWeightValue": 0.0,  
                        "grossWeightValue": 30.0,  
                        "netWeightUomCode": "LB",  
                        "tareWeightUomCode": "LB",  
                        "grossWeightUomCode": "LB",  
                        "shipItemIdentifier": "",  
                        "packagingIdentifier": "OL47508208",  
                        "externalLineIdentifier": "0",  
                        "userFieldListOrderLine": \[\],  
                        "thirdPartyReferenceDate": null,  
                        "thirdPartyReferenceNumber": "",  
                        "thirdPartyReferenceLineNumber": 0  
                    }  
                \],  
                "userFieldList": \[\],  
                "pickupAppointment": null,  
                "requestedShipDate": null,  
                "sourceOrderNumber": "3CheckOrderDev2",  
                "deliveryAppointment": null,  
                "scheduledPickupDate": "2025-12-23T05:00:00",  
                "plannedLoadIdentifier": "CheckLoadDev3",  
                "requestedDeliveryDate": "2025-12-30T05:00:00",  
                "scheduledDeliveryDate": "2025-12-30T05:00:00",  
                "odysseyOrderIdentifier": "6152",  
                "orderInvolvedPartyList": \[  
                    {  
                        "partyId": "ORG2527727",  
                        "address1": "40 Whitecap Drive",  
                        "address2": "",  
                        "address3": "",  
                        "cityName": "NORTH KINGSTOWN",  
                        "partyName": "International Dioxcide, Inc.",  
                        "partyType": "Shipper",  
                        "vatNumber": "",  
                        "postalCode": "02852",  
                        "regionName": "RI",  
                        "countryName": "US",  
                        "sourceSystem": "TRANSPORTATION",  
                        "partnerExternalIdentifier": "ERCO EST"  
                    },  
                    {  
                        "partyId": "ORG2527728",  
                        "address1": "39360 Bldg 1, Interstate 10W",  
                        "address2": "",  
                        "address3": "",  
                        "cityName": "BOERNE",  
                        "partyName": "Remote Water Solutions",  
                        "partyType": "Consignee",  
                        "vatNumber": "",  
                        "postalCode": "78006",  
                        "regionName": "TX",  
                        "countryName": "US",  
                        "sourceSystem": "TRANSPORTATION",  
                        "partnerExternalIdentifier": "ERCO CST"  
                    },  
                    {  
                        "partyId": "",  
                        "address1": "",  
                        "address2": "",  
                        "address3": "",  
                        "cityName": "",  
                        "partyName": "Billing",  
                        "partyType": "Billing",  
                        "vatNumber": "",  
                        "postalCode": "",  
                        "regionName": "",  
                        "countryName": "",  
                        "sourceSystem": "",  
                        "partnerExternalIdentifier": null  
                    },  
                    {  
                        "partyId": "",  
                        "address1": "",  
                        "address2": "",  
                        "address3": "",  
                        "cityName": "",  
                        "partyName": "Buyer",  
                        "partyType": "Buyer",  
                        "vatNumber": "",  
                        "postalCode": "",  
                        "regionName": "",  
                        "countryName": "",  
                        "sourceSystem": "",  
                        "partnerExternalIdentifier": null  
                    },  
                    {  
                        "partyId": "",  
                        "address1": "",  
                        "address2": "",  
                        "address3": "",  
                        "cityName": "",  
                        "partyName": "Seller",  
                        "partyType": "Seller",  
                        "vatNumber": "",  
                        "postalCode": "",  
                        "regionName": "",  
                        "countryName": "",  
                        "sourceSystem": "",  
                        "partnerExternalIdentifier": null  
                    }  
                \],  
                "pickupAppointmentTimeZoneCode": null,  
                "requestedShipDateTimeZoneCode": null,  
                "deliveryAppointmentTimeZoneCode": null,  
                "scheduledPickupDateTimeZoneCode": "UTC",  
                "requestedDeliveryDateTimeZoneCode": "UTC",  
                "scheduledDeliveryDateTimeZoneCode": "UTC"  
            }  
        \],  
        "customerId": "4999",  
        "carrierSCAC": "CNWY",  
        "freightTerms": "Pre-Paid",  
        "carrierBillTo": {  
            "city": "CHARLOTTE",  
            "name": "C/O ODYSSEY LOGISTICS",  
            "postal": "28219",  
            "region": "NC",  
            "country": "US",  
            "address1": "P O BOX 19749",  
            "address2": null,  
            "address3": null  
        },  
        "equipmentType": "LTL",  
        "shipDirection": "Inbound",  
        "routeGroupName": null,  
        "equipmentNumber": "",  
        "freightForwarder": null,  
        "shipmentStopList": \[  
            {  
                "sequence": 1,  
                "stopType": "Pickup",  
                "orderIdList": \[  
                    "6152"  
                \]  
            },  
            {  
                "sequence": 2,  
                "stopType": "Dropoff",  
                "orderIdList": \[  
                    "6152"  
                \]  
            }  
        \],  
        "scheduledPickupDate": "2025-12-23T05:00:00",  
        "carrierTrackingNumber": "",  
        "scheduledDeliveryDate": "2025-12-30T05:00:00",  
        "odysseyShipmentIdentifier": "C813888",  
        "plannedShipmentIdentifier": "14948",  
        "scheduledPickupDateTimeZoneCode": "UTC",  
        "scheduledDeliveryDateTimeZoneCode": "UTC"  
    }  
} |  | {  
    "sellPlannedShipmentOut": {  
        "sourceId": "ERCO",  
        "orderList": \[  
            {  
                "contactName": "",  
                "orderLineList": \[  
                    {  
                        "widthValue": 0.0,  
                        "heightValue": 0.0,  
                        "lengthValue": 0.0,  
                        "orderLineId": 88087,  
                        "volumeValue": 0.0,  
                        "packageCount": 1,  
                        "widthUomCode": "",  
                        "heightUomCode": "",  
                        "lengthUomCode": "",  
                        "volumeUomCode": "",  
                        "batchLotNumber": "",  
                        "lineIdentifier": "2",  
                        "netWeightValue": 0.0,  
                        "tareWeightValue": 0.0,  
                        "grossWeightValue": 30.0,  
                        "netWeightUomCode": "LB",  
                        "tareWeightUomCode": "LB",  
                        "grossWeightUomCode": "LB",  
                        "shipItemIdentifier": "",  
                        "packagingIdentifier": "OL47508208",  
                        "externalLineIdentifier": "0",  
                        "userFieldListOrderLine": \[\],  
                        "thirdPartyReferenceDate": null,  
                        "thirdPartyReferenceNumber": "",  
                        "thirdPartyReferenceLineNumber": 0  
                    }  
                \],  
                "userFieldList": \[\],  
                "pickupAppointment": null,  
                "requestedShipDate": null,  
                "sourceOrderNumber": "4CheckOrder2",  
                "deliveryAppointment": null,  
                "scheduledPickupDate": "2025-12-23T05:00:00",  
                "plannedLoadIdentifier": "CheckLoad4",  
                "requestedDeliveryDate": "2025-12-30T05:00:00",  
                "scheduledDeliveryDate": "2025-12-30T05:00:00",  
                "odysseyOrderIdentifier": "31092",  
                "orderInvolvedPartyList": \[  
                    {  
                        "partyId": "ORG2527727",  
                        "address1": "40 Whitecap Drive",  
                        "address2": "",  
                        "address3": "",  
                        "cityName": "NORTH KINGSTOWN",  
                        "partyName": "International Dioxcide, Inc.",  
                        "partyType": "Shipper",  
                        "vatNumber": "",  
                        "postalCode": "02852",  
                        "regionName": "RI",  
                        "countryName": "US",  
                        "sourceSystem": "TRANSPORTATION",  
                        "partnerExternalIdentifier": "ERCO EST"  
                    },  
                    {  
                        "partyId": "ORG2527728",  
                        "address1": "39360 Bldg 1, Interstate 10W",  
                        "address2": "",  
                        "address3": "",  
                        "cityName": "BOERNE",  
                        "partyName": "Remote Water Solutions",  
                        "partyType": "Consignee",  
                        "vatNumber": "",  
                        "postalCode": "78006",  
                        "regionName": "TX",  
                        "countryName": "US",  
                        "sourceSystem": "TRANSPORTATION",  
                        "partnerExternalIdentifier": "ERCO CST"  
                    },  
                    {  
                        "partyId": "",  
                        "address1": "",  
                        "address2": "",  
                        "address3": "",  
                        "cityName": "",  
                        "partyName": "Billing",  
                        "partyType": "Billing",  
                        "vatNumber": "",  
                        "postalCode": "",  
                        "regionName": "",  
                        "countryName": "",  
                        "sourceSystem": "",  
                        "partnerExternalIdentifier": null  
                    },  
                    {  
                        "partyId": "",  
                        "address1": "",  
                        "address2": "",  
                        "address3": "",  
                        "cityName": "",  
                        "partyName": "Buyer",  
                        "partyType": "Buyer",  
                        "vatNumber": "",  
                        "postalCode": "",  
                        "regionName": "",  
                        "countryName": "",  
                        "sourceSystem": "",  
                        "partnerExternalIdentifier": null  
                    },  
                    {  
                        "partyId": "",  
                        "address1": "",  
                        "address2": "",  
                        "address3": "",  
                        "cityName": "",  
                        "partyName": "Seller",  
                        "partyType": "Seller",  
                        "vatNumber": "",  
                        "postalCode": "",  
                        "regionName": "",  
                        "countryName": "",  
                        "sourceSystem": "",  
                        "partnerExternalIdentifier": null  
                    }  
                \],  
                "pickupAppointmentTimeZoneCode": null,  
                "requestedShipDateTimeZoneCode": null,  
                "deliveryAppointmentTimeZoneCode": null,  
                "scheduledPickupDateTimeZoneCode": "UTC",  
                "requestedDeliveryDateTimeZoneCode": "UTC",  
                "scheduledDeliveryDateTimeZoneCode": "UTC"  
            }  
        \],  
        "customerId": "4999",  
        "carrierSCAC": "CNWY",  
        "freightTerms": "Pre-Paid",  
        "carrierBillTo": {  
            "city": "CHARLOTTE",  
            "name": "C/O ODYSSEY LOGISTICS",  
            "postal": "28219",  
            "region": "NC",  
            "country": "US",  
            "address1": "P O BOX 19749",  
            "address2": null,  
            "address3": null  
        },  
        "equipmentType": "LTL",  
        "shipDirection": "Inbound",  
        "routeGroupName": null,  
        "equipmentNumber": "",  
        "freightForwarder": null,  
        "shipmentStopList": \[  
            {  
                "sequence": 1,  
                "stopType": "Pickup",  
                "orderIdList": \[  
                    "31092"  
                \]  
            },  
            {  
                "sequence": 2,  
                "stopType": "Dropoff",  
                "orderIdList": \[  
                    "31092"  
                \]  
            }  
        \],  
        "scheduledPickupDate": "2025-12-23T05:00:00",  
        "carrierTrackingNumber": "",  
        "scheduledDeliveryDate": "2025-12-30T05:00:00",  
        "odysseyShipmentIdentifier": "C813888",  
        "plannedShipmentIdentifier": "23278",  
        "scheduledPickupDateTimeZoneCode": "UTC",  
        "scheduledDeliveryDateTimeZoneCode": "UTC"  
    }  
} | it is internal Trigger POST PG/PGR when tender status changes to “Accepted“ <custom data-type="smartlink" data-id="id-17">https://odysseylogistics.atlassian.net/browse/LINX-637</custom>  <custom data-type="smartlink" data-id="id-18">https://odysseylogistics.atlassian.net/browse/LINX-3068</custom>  Only usertype - Referrence needs to be read  ![](blob:https://media.staging.atl-paas.net/?type=file&localId=6748a69e-d020-457e-9e48-8510c3c7dc40&id=4f518bb3-bae4-45ff-983d-82919db81535&&collection=contentId-2643099672&height=34&occurrenceKey=null&width=160&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)  |  |
| shipment-service | Error Overview for Executed Shipment(Dough Nut chart) | /shipment-service/v1/shipment/error/category/count | GET | Authorization:<token>, Content-Type: application/json  |   | {  
   "errorOverview":\[  
      {  
            "errorCategory": "",  
            "errorCode": "",  
            "errorCount": number  
        }  
   \],  
   "total":0  
} |  | <custom data-type="smartlink" data-id="id-19">https://odysseylogistics.atlassian.net/browse/LINX-529</custom><custom data-type="smartlink" data-id="id-20">https://odysseylogistics.atlassian.net/browse/LINX-1916</custom>   |  |
| shipment-service | Error Overview for Executed Shipment | /shipment-service/pgi-pgr/v1/error/list | POST | Authorization:<token>, Content-Type: application/json  | {  
    "pageSize": <int>,  
    "pageNumber": <int>,  
    "errorCode": "string",  
    "filter":  
    {  
        "customerName":\[<string>,<string>\],  
        "scac":\[<string>,<string>\],  
        "bolNo":\[<string>,<string>\],  
        "mBolNo":\[<string>,<string>\],  
        "plannedShipmentId":\[<int>,<int>\],  
        "shipDateStart":"2025-09-25",  
        "shipDateEnd":"2025-09-26"  
    },  
    "sortBy": "string",  
    "orderBy":"string"  
} | {  
    "pageNumber": <int>,  
    "pageSize": <int>,  
    "totalCount": <int>,  
    "errorList": \[  
        {  
            "sellShipmentId": <int>,  
            "mBolNo": "String",  
            "bolNo": "string",  
            "customerName": "string",  
            "poNumber": "String",  
            "orderNumber": "String",  
            "freightTerm": "string",  
            "equipmentType": "String",  
            "scac": "String",  
            "shipDirection": "String",  
            "shipDateAndTime": "2025-09-26 21:40 IST",  
            "alertCount": <int>  
        }  
    \]  
} |  |  Added the new columns Customer PO#, Order # fields and removed columns Customer Id, Equipment Id, Seal from the Execute Shipment Error list.  
\[LINX-5410\] UPDATE-UI - Executed Shipment Error Overview - Improvement to the Grid View - Jira |  |
| shipment-service | Error Overview for Executed Shipment (Download the filtered or full shipment error list as a **CSV file**) | /shipment-service/pgi-pgr/v1/error/download | POST | Authorization:<token>, Content-Type: application/json | {  
    "pageSize": 10000,  
    "pageNumber": 0,  
    "errorCode": "string",  
    "filter":  
    {  
        "customerName":\[<string>,<string>\],  
        "scac":\[<string>,<string>\],  
        "bolNo":\[<string>,<string>\],  
        "mBolNo":\[<string>,<string>\],  
        "plannedShipmentId":\[<int>,<int>\],  
        "shipDateStart":"2025-09-25",  
        "shipDateEnd":"2025-09-26"  
    },  
    "sortBy": "string",  
    "orderBy":"string"  
} |  |  | [\[LINX-529\] UI - Executed Shipment Error Overview - Jira](https://odysseylogistics.atlassian.net/browse/LINX-529) Users can download the filtered or full shipment error list as a **CSV file**. A maximum of **10,000 error records** can be downloaded at a time. |  |
| shipment-service | Error Overview for Executed Shipment Alert | /shipment-service/v1/shipment/error/category/count | GET  | Authorization:<token>, Content-Type: application/json |  | {  
    "errorOverview": \[  
        {  
            "errorCategory": "",  
            "errorCode": "",  
            "errorCount": number  
        }  
    \],  
    "total": number  
} |  | <custom data-type="smartlink" data-id="id-21">https://odysseylogistics.atlassian.net/browse/LINX-1927</custom>  <custom data-type="smartlink" data-id="id-22">https://odysseylogistics.atlassian.net/browse/LINX-1968</custom>Updated existing api in <custom data-type="smartlink" data-id="id-23">https://odysseylogistics.atlassian.net/browse/LINX-3410</custom>  |  |
| shipment-service | Advance filters - Sell Shipment Lookup | /shipment-service/advanced-filter/sell-shipment-id/lookup | POST | Authorization:<token>, Content-Type: application/json | {

  “lookup“ : “<value>“,  
  "pageNumber":0,  
  "pageSize":30

}  | {

  "pageNumber": 0,  
  "pageSize": 30,  
  "data":\[  
  “Shipment1“,  
  “shipment2“,  
  ....  
  \]  
} |  |  |  |
| shipment-service | Advance filters - Customers Lookup | /shipment-service/advanced-filter/customers/lookup | POST | Authorization:<token>, Content-Type: application/json | {  
    "lookup":"USAL",  
    "pageNumber":0,  
    "pageSize":30  
} | {  
    "pageNumber": 0,  
    "pageSize": 30,  
    "data": \[  
    {"56193":"custDesc1"},  
    {"36172":"custDesc2",  
    {"51732":"custDesc3"}  
    \]  
    "totalCount": 1  
} |  |  |  |
| shipment-service | Advance filters-MBol Lookup | /shipment-service/advanced-filter/mbol/lookup | POST | Authorization:<token>, Content-Type: application/json |  {  
    "lookup":"12",  
    "pageNumber":0,  
    "pageSize":30  
} | {  
    "pageNumber": 0,  
    "pageSize": 30,  
    "data": \["123456",  
            "673212"\],  
    "totalCount": 2  
} |  |  |  |
| shipment-service | Advance filters-Bol Lookup | /shipment-service/advanced-filter/bol/lookup | POST | Authorization:<token>, Content-Type: application/json | {  
    "lookup":"1",  
    "pageNumber":0,  
    "pageSize":30  
} | {  
    "pageNumber": 0,  
    "pageSize": 30,  
    "data": \["56193",  
            "36172",  
            "51732"\],  
    "totalCount": 3  
} |  |  |  |
| ~~shipment-service~~ | ~~Advance filters-SCAC Lookup~~ | ~~/shipment-service/advanced-filter/scac/lookup~~ | ~~POST~~ | ~~Authorization:<token>,~~ ~~Content-Type: application/json~~ | {  
    "lookup":"1",  
    "pageNumber":0,  
    "pageSize":30  
} | {  
    "pageNumber": 0,  
    "pageSize": 30,  
    "data": \[  
    {"56193":"scacDesc1"},  
    {"36172":"scacDesc2",  
    {"51732":"scacDesc3"}  
    \],  
    "totalCount": 3  
} | Should use Master Service API `/master-data/v1/scac-code/lookup` |  |  |
| shipment-service | Executed Shipment - Errors list of a shipment | /shipment-service/v1/executed/shipment/{shipmentId}/errors | GET | Authorization:<JWT token> Accept: application/json Content-Type: application/js |  | {  
  "shipment": {  
    "plannedShipmentIdentifier": "",  
    "errors": \[  
      {  
        "fieldName": "",  
        "errorCode": "",  
        "errorMessage": ""  
      },  
      {  
        "fieldName": "",  
        "errorCode": "",  
        "errorMessage": ""  
      }  
    \],  
    "partnerList": \[  
      {  
        "partnerType": "",  
        "errors": \[  
          {  
            "fieldName": "",  
            "errorCode": "",  
            "errorMessage": ""  
          }  
        \]  
      },  
      {  
        "partnerType": "",  
        "errors": \[  
          {  
            "fieldName": "",  
            "errorCode": "",  
            "errorMessage": ""  
          }  
        \]  
      }  
    \],  
    "orders": \[  
      {  
        "plannedLoadIdentifier": "",  
        "errors": \[  
          {  
            "fieldName": "",  
            "errorCode": "",  
            "errorMessage": ""  
          },  
          {  
            "fieldName": "",  
            "errorCode": "",  
            "errorMessage": ""  
          }  
        \],  
        "partnerList": \[  
          {  
            "partnerType": "",  
            "errors": \[  
              {  
                "fieldName": "",  
                "errorCode": "",  
                "errorMessage": ""  
              }  
            \]  
          },  
          {  
            "partnerType": "",  
            "errors": \[  
              {  
                "fieldName": "",  
                "errorCode": "",  
                "errorMessage": ""  
              }  
            \]  
          }  
        \],  
        "chargeList": \[  
          {  
            "chargeSeq": "1",  
            "errors": \[  
              {  
                "fieldName": "",  
                "errorCode": "",  
                "errorMessage": ""  
              }  
            \]  
          },  
          {  
            "chargeSeq": "2",  
            "errors": \[  
              {  
                "fieldName": "",  
                "errorCode": "",  
                "errorMessage": ""  
              }  
            \]  
          }  
        \],  
        "orderLines": \[  
          {  
            "lineIdentifier": "1",  
            "errors": \[  
              {  
                "fieldName": "",  
                "errorCode": "",  
                "errorMessage": ""  
              }  
            \]  
          },  
          {  
            "lineIdentifier": "2",  
            "errors": \[  
              {  
                "fieldName": "",  
                "errorCode": "",  
                "errorMessage": ""  
              },  
              {  
                "fieldName": "",  
                "errorCode": "",  
                "errorMessage": ""  
              }  
            \]  
          }  
        \]  
      },  
      {  
        "plannedLoadIdentifier": "ORD124",  
        "errors": \[\],  
        "orderLines": \[  
          {  
            "lineIdentifier": "1",  
            "errors": \[  
              {  
                "fieldName": "",  
                "errorCode": "",  
                "errorMessage": ""  
              }  
            \]  
          }  
        \]  
      }  
    \]  
  }  
} |  |  |  |
| shipment-service | Executed Shipment Details Page | /shipment-service/v1/executed/shipment/{shipmentId}/details | GET | Authorization:<JWT token> Accept: application/json Content-Type: application/js |  | {  
 "pgiPgrShipment": {  
	 "plannedShipmentIdentifier" : {  
		 "value" : "String",  
		 "required" : "N",  
		 "validationRequired" : true,  
         "errorMessage" : "String"  
	 },  
	 "executedShipmentIdentifier" : {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : false,  
         "errorMessage" : "String"  
	 },  
	 "masterBOLNumber" : {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : false,  
         "errorMessage" : "String"  
	 },  
	 "shipDirection": {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : false,  
         "errorMessage" : "String"  
	 },  
	 "freightTerms": {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : false,  
         "errorMessage" : "String"  
	 },  
	 "carrierSCAC": {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : true,  
         "errorMessage" : "String"  
	 },  
	 "equipmentType": {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : true,  
         "errorMessage" : "String"  
	 },  
	 "equipmentNumber" :{  
		 "value" : "String",  
		 "required" : "N",  
		 "validationRequired" : false,  
         "errorMessage" : "String"  
	 },  
	 "sealNumber" :{  
		 "value" : "String",  
		 "required" : "N",  
		 "validationRequired" : false,  
         "errorMessage" : "String"  
	 },  
	 "carrierTrackingNumber":{  
		 "value" : "String",  
		 "required" : "C",  
		 "validationRequired" : false,  
         "errorMessage" : "String"  
	 },  
	 "ratingStatus" :{  
		 "value" : "String",  
		 "required" : "N",  
		 "validationRequired" : false,  
         "errorMessage" : "String"  
	 },  
	 "partnerList":\[ { // BillTo  
	   
		 "name": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false,  
             "errorMessage" : "String"  
		 },  
		 "partnerType": {  
			 "value" : "BillTo",  
			 "required" : "Y",  
			 "validationRequired" : true,  
             "errorMessage" : "String"  
		 },  
		 "address1": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false,  
             "errorMessage" : "String"  
		 },  
		 "address2": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false,  
             "errorMessage" : "String"  
		 },  
		 "address3": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false,  
             "errorMessage" : "String"  
		 },  
		 "city": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false,  
             "errorMessage" : "String"  
		 },  
		 "region": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false,  
             "errorMessage" : "String"  
		 },  
		 "country": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false,  
             "errorMessage" : "String"  
		 },  
		 "postalCode": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false,  
             "errorMessage" : "String"  
		 },  
		 "vatNumber": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false,  
             "errorMessage" : "String"  
		 },  
		 "FreightCost": {  
			 "value" : "Double",  
			 "required" : "N",  
			 "validationRequired" : false,  
             "errorMessage" : "String"  
		 },  
		 "routeGroup": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false,  
             "errorMessage" : "String"  
		 }  
	 }  
	 \]  
	 "OrderList" : \[// embed the order in single message  
		 "pgiPgrOrderObj1",  
		 "pgiPgrOrderObj2"  
	 \]   
 }  
}
 |  | To return executed shipment details Note: The **"errorMessage"** field introduced for the UI purpose to highlight the respective errored out field. |  |
| shipment-service | Save Sell Shipment error page to fix errors | /shipment-service/pgi-pgr/v1/error/details | POST | Authorization:<JWT token> Accept: application/json Content-Type: application/json | {  
 "pgiPgrShipmentIn": {  
	 "plannedShipmentIdentifier" : {  
		 "value" : "String",  
		 "required" : "N",  
		 "validationRequired" : true  
	 },  
	 "executedShipmentIdentifier" : {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : false  
	 },  
	 "masterBOLNumber" : {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : false  
	 },  
	 "shipDirection": {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : false  
	 },  
	 "freightTerms": {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : false  
	 },  
	 "carrierSCAC": {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : true  
	 },  
	 "equipmentType": {  
		 "value" : "String",  
		 "required" : "Y",  
		 "validationRequired" : true  
	 },  
	 "equipmentNumber" :{  
		 "value" : "String",  
		 "required" : "N",  
		 "validationRequired" : false  
	 },  
	 "sealNumber" :{  
		 "value" : "String",  
		 "required" : "N",  
		 "validationRequired" : false  
	 },  
	 "carrierTrackingNumber":{  
		 "value" : "String",  
		 "required" : "C",  
		 "validationRequired" : false  
	 },  
	 "ratingStatus" :{  
		 "value" : "String",  
		 "required" : "N",  
		 "validationRequired" : false  
	 },  
	 "partnerList":\[ { // BillTo  
	   
		 "name": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false  
		 },  
		 "partnerType": {  
			 "value" : "BillTo",  
			 "required" : "Y",  
			 "validationRequired" : true  
		 },  
		 "address1": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false  
		 },  
		 "address2": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false  
		 },  
		 "address3": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false  
		 },  
		 "city": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false  
		 },  
		 "region": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false  
		 },  
		 "country": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false  
		 },  
		 "postalCode": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false  
		 },  
		 "vatNumber": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false  
		 },  
		 "FreightCost": {  
			 "value" : "Double",  
			 "required" : "N",  
			 "validationRequired" : false  
		 },  
		 "routeGroup": {  
			 "value" : "String",  
			 "required" : "N",  
			 "validationRequired" : false  
		 }  
	 }  
	 \]  
	 "OrderList" : \[// embed the order in single message  
		 "pgiPgrOrderObj1",  
		 "pgiPgrOrderObj2"  
	 \]   
 }  
}
 | { “message“ : “message as per VD“ } |  | The message will be sent to Validation SQS queue |  |
| shipment-service | View, Edit and Purge Executed Shipment -Linx Error Queue | /shipment-service/pgi-pgr/v1/error/{shipmentId}/details/purge | DELETE | Authorization <token>,   
Accept: application/json,  Content-Type: application/json |  | { “message“ : “The shipment <shipment ID> is purged“ } |  |  |  |
| shipment-service | List sell shipment ID from Shipment table | /shipment-service/sellshipment/lookup | POST | Authorization <token>,   
Accept: application/json,  Content-Type: application/json | {  
    "lookup":"1",  
    "pageNumber":0,  
    "pageSize":30  
} | {  
    "pageNumber": 0,  
    "pageSize": 30,  
    "data": \[  
      "5619322",  
      "3617212",  
      "5173214"  
    \],  
    "totalCount": 3  
} |  | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-24">https://odysseylogistics.atlassian.net/browse/LINX-515</custom>  |  |
| Master-data | Search by organization id or/and short name | /customer-service/v1/org-name/lookup | POST | Authorization <token>,   
Accept: application/json,  Content-Type: application/json | {  
"orgIdOrgCode": "\*ASSA-AB_SYS_01/\*ASSA-AB_SYS_01",  
"pageNumber":0,  
"pageSize":25,  
"selectedField":"orgIdOrgCode"  
} | {  
    "longName": {  
        "values": {  
            "\*ASSA-AB": "\*ASSA-AB"  
        },  
        "hasNext": false  
    }  
} |  | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-25">https://odysseylogistics.atlassian.net/browse/LINX-515</custom>  |  |
| Master-data | Get freight terms | /customer-service/v1/freight-terms | GET | Authorization <token>,   
Accept: application/json,  Content-Type: application/json |  | {  
    "P": "Pre-Paid",  
    .....,  
    .....  
} |  | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-26">https://odysseylogistics.atlassian.net/browse/LINX-515</custom>  |  |
| Master-data | Get Ship Direction drop down | /location-service/v1/ship-direction/lookup | POST | Authorization <token>,   
Accept: application/json,  Content-Type: application/json | {  
  “lookup” : “SHIP_DIRECTION",  
  "pageNumber": 0,  
  "pageSize": 20  
} | {  
  pageNumber:1,  
  pageSize: 25,  
  totalCount : 10  
  data:{  
  “id” : “value”,  
  “id“ : “value“  
  }  
}  |  | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-27">https://odysseylogistics.atlassian.net/browse/LINX-515</custom> |  |
| Master-data | Get Product Ids / Ship item identifier | /product-service/v1/product/lookup | POST | Authorization <token>,   
Accept: application/json,  Content-Type: application/json | {  
“lookup” : <search string>,  
"pageNumber": 0,  
"pageSize": 20  
} | {  
  pageNumber:1,  
  pageSize: 25,  
  totalCount : 10  
  data:{  
   "000000000000100027": \["KYMENE 525 BULK (FLAGGED - DO NOT USE),"KYMENE 218 BULK-DO NOT USE"\],  
   "000000000000100029": \["KYMENE 525 BULK (FLAGGED - DO NOT USE)"\]  
    …………………  
   }  
} |  | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-28">https://odysseylogistics.atlassian.net/browse/LINX-515</custom> |  |
| shipment-service | Manual/Missed error Overview (Dough Nut chart) | /shipment-service/v1/manual-missed/shipment/error/category/count | GET | Authorization:<token>, Content-Type: application/json  |   | {  
   "errorOverview":\[  
      {  
            "errorCategory": "",  
            "errorCode": "",  
            "errorCount": number  
        }  
   \],  
   "total":0  
} |  |  |  |
| shipment-service | Error Overview for Manual or Missed PGI | /shipment-service/pgi-pgr/v1/manual-missed/shipment/error/list | POST | Authorization:<token>, Content-Type: application/json  | {  
    "pageSize": <int>,  
    "pageNumber": <int>,  
    "errorCode": "string",  
    "filter":  
    {  
        "customerName":\[<string>,<string>\],  
        "plannedShipmentId":\[<int>,<int>\],  
        "orderNumber":\[<string>,<string>\],  
        "poNumber":\[<string>,<string>\],  
        "scac":\[<string>,<string>\],  
        "shipDateStart":"2025-09-25",  
        "shipDateEnd":"2025-09-26"  
    },  
  "sortBy":"string",  
  "orderBy":"string"  
} | {  
    "pageNumber": <int>,  
    "pageSize": <int>,  
    "totalCount": <int>,  
    "errorList": \[  
        {  
            "sellShipmentId": <int>,  
            "customerName": "string",  
            "freightTerm": "string",  
            "equipmentType": "String",  
            "scac": "String",  
            "shipDirection": "String",  
            "poNumber": "String",  
            "orderNumber": "String",  
            "shipDateAndTime": "2025-09-26 21:40 IST",  
            "messageType": "String"  
        }  
    \]  
} |  | [https://odysseylogistics.atlassian.net/browse/LINX-3121?focusedCommentId=217559](https://odysseylogistics.atlassian.net/browse/LINX-3121?focusedCommentId=217559)  
  
Removed BoL\\MBol  and added new filters orderId/poNumber in the advanced filter of Manual/Missed PGI error  
  
Similarly, removed BoL, MBoL, Equipment, Seal from the list grid and added new columns for Customer PO and Order  Replaced alert count with messageType  
[\[LINX-5384\] UPDATE - Manual PGI/PGR Error Metrics & Table View on Executed Shipment Error Overview - Jira](https://odysseylogistics.atlassian.net/browse/LINX-5384) |  |
| shipment-service | Error Overview for Manual or Missed PGI (Download the filtered or full shipment error list as a **CSV file**) | /shipment-service/pgi-pgr/v1/manual-missed/error/download | POST | Authorization:<token>, Content-Type: application/json | {  
    "pageSize": <int>,  
    "pageNumber": <int>,  
    "errorCode": "string",  
    "filter":  
    {  
        "customerName":\[<string>,<string>\],  
        "plannedShipmentId":\[<int>,<int>\],  
        "orderNumber":\[<string>,<string>\],  
        "poNumber":\[<string>,<string>\],  
        "scac":\[<string>,<string>\],  
        "shipDateStart":"2025-09-25",  
        "shipDateEnd":"2025-09-26"  
    },  
  "sortBy":"string",  
  "orderBy":"string"  
} |  |  | [https://odysseylogistics.atlassian.net/browse/LINX-3121?focusedCommentId=217559](https://odysseylogistics.atlassian.net/browse/LINX-3121?focusedCommentId=217559)  
  
Removed BoL\\MBol  and added new filters orderId/poNumber in the advanced filter of Manual/Missed PGI error  
  
Similarly, removed BoL, MBoL, Equipment, Seal from the list grid and added new columns for Customer PO and Order  Replaced alert count with messageType  
[\[LINX-5384\] UPDATE - Manual PGI/PGR Error Metrics & Table View on Executed Shipment Error Overview - Jira](https://odysseylogistics.atlassian.net/browse/LINX-5384) |  |
| shipment-service | Manual/Missed PGI details Page | /shipment-service/v1/manual-missed/shipment/{shipmentId}/details | GET | Authorization:<JWT token> Accept: application/json Content-Type: application/js |  | {  
 "manualMissedShipment": {  
	"customerId" : "String",// Manual or Missed PGI Customer ID  
	"customerName" : "String",  
    "bolNo" : "String",  
	"grossWeight" : double,  
	"grossWeightUOM" : "String",  
	"scacCode" : "String",  
	"equipmentType" : "String",  
	"actualShipDateTime" : "String",  
	"actualShipDateTimeZone" : "String",  
	"sellShipmentId" : "String",  
	"noOfOrders" : int,  
	"orderNumber" : \["String"\],  
	"customerOrderNumber" : \["String"\],  
	"orderLineCount" : int,  
	"scheduledPickDateTime" : "String",  
	"scheduledPickDateTimeZone" : "String",  
	"scheduledDeliveryDateTime" : "String",  
	"scheduledDeliveryDateTimeZone" : "String",  
	"netWeight" : double,  
	"netWeightUOM": "String",  
    "volume" : double,  
	"volumeUOM": "String",  
	"packageCount" : int  
  }  
}
 |  | Added new fields for  
Customer Order Number  
Scheduled Delivery Date  
  
\[LINX-5392\] UPDATE - Manual PGI/PGR - Manual PGI/PGR Action for Sell Shipment from Error Overview - Jira  
 |  |
| shipment-service | Save Manual /Missed PGI error page to fix errors | /shipment-service/pgi-pgr/v1/manual-missed/error/details | POST | Authorization:<JWT token> Accept: application/json Content-Type: application/json | {  
 "manualMissedShipment": {  
	"customerId" : "String",// Manual or Missed PGI Customer ID  
	"customerName" : "String",  
    "bolNo" : "String",  
	"grossWeight" : double,  
	"grossWeightUOM" : "String",  
	"scacCode" : "String",  
	"equipmentType" : "String",  
	"actualShipDateTime" : "String",  
	"actualShipDateTimeZone" : "String",  
	"sellShipmentId" : "String",  
	"noOfOrders" : int,  
	"orderNumber" : \["String"\],  
	"customerOrderNumber" : \["String"\],  
	"orderLineCount" : int,  
	"scheduledPickDateTime" : "String",  
	"scheduledPickDateTimeZone" : "String",  
	"scheduledDeliveryDateTime" : "String",  
	"scheduledDeliveryDateTimeZone" : "String",  
	"netWeight" : double,  
	"netWeightUOM": "String",  
    "volume" : double,  
	"volumeUOM": "String",  
	"packageCount" : int  
  }  
}
 | { “message“ : “message as per VD“ } |  | Added new fields for  
Customer Order Number  
Scheduled Delivery Date  
  
\[LINX-5392\] UPDATE - Manual PGI/PGR - Manual PGI/PGR Action for Sell Shipment from Error Overview - Jira |  |
| shipment-service | Rating error Overview (Dough Nut chart) | /shipment-service/v1/rating/error/category/count | GET | Authorization:<token>, Content-Type: application/json  |   | {  
   "errorOverview":\[  
      {  
            "errorCategory": "",  
            "errorCode": "",  
            "errorCount": number  
        }  
   \],  
   "total":0  
} |  | [\[LINX-3965\] UI – Rating Errors Overview Page - Jira](https://odysseylogistics.atlassian.net/browse/LINX-3965) |  |
| shipment-service | Error Overview for Rating error  | /shipment-service/pgi-pgr/v1/rating/error/list | POST | Authorization:<token>, Content-Type: application/json  | {  
    "pageSize": <int>,  
    "pageNumber": <int>,  
    "filter":  
    {  
        "customerName":\[<string>,<string>\],  
        "scac":\[<string>,<string>\]  
    },  
    "sortBy": "string",  
    "orderBy":"string"  
} | {  
    "pageNumber": <int>,  
    "pageSize": <int>,  
    "totalCount": <int>,  
    "errorList": \[  
        {  
            "sellShipmentId": <int>,  
            "mBolNo": "String",  
            "bolNo": \["string", "string"\],  
            "customerName": "string",  
            "customerId": "string",  
            "shipDateAndTime": "2025-09-26 21:40 IST",  
            "pgiDateAndTime": "2025-09-26 21:40 IST",  
            "scac": "String",  
            "shipDirection": "String",  
            "equipmentType": "String",  
            "grossWeight": "string",  
            "errorMessage": "String"  
        }  
    \]  
} |  | [\[LINX-3965\] UI – Rating Errors Overview Page - Jira](https://odysseylogistics.atlassian.net/browse/LINX-3965) |  |
| shipment-service | Retry API for the failed rating calls | /shipment-service/pgi-pgr/v1/rating/error/retry | POST | Authorization:<token>, Content-Type: application/json | {  
    "sellShipmentIds": \["String", "String"\]  
} | {

“message“ : “message as per VD“

} |  | [\[LINX-3965\] UI – Rating Errors Overview Page - Jira](https://odysseylogistics.atlassian.net/browse/LINX-3965)  
 This API is ment for ‘Base Rate Not Available’ errors only.  
  
The errors generated for ‘Rating Service Unavailable’ (**RASUA)** will be pick up by schedular for reprocess |  |
| shipment-service | Schedular for reprocess |  |  |  |  |  |  |  |  |
| shipment-service | Rerate by quote for the failed rating call | /shipment-service/pgi-pgr/v1/rating/error/quote | POST | Authorization:<token>, Content-Type: application/json | {  
    "arMarkup": 0,  
    "uomCode": "string",  
    "sellShipmentId": "String",  
    "chargeList": \[  
      {  
        "code": "Base Rate",  
        "sequence": 0,  
        "description": "Base Rate",  
        "amount": 0,  
        "uomCode": "string"  
      },  
      {  
        "code": "string",  
        "sequence": 2,  
        "description": "string",  
        "amount": 0,  
        "uomCode": "string"  
      }  
    \]  
} | {

“message“ : “message as per VD“

} |  | [\[LINX-3966\] UI – Resolve Rating Errors via Manual Quote Entry (Quote Entry Page) - Jira](https://odysseylogistics.atlassian.net/browse/LINX-3966) |  |
| shipment-service | List of Order Ids from Sell Shipment table | /shipment-service/order-id/lookup | POST | Authorization <token>,   
Accept: application/json,  Content-Type: application/json | {  
    "lookup":"1",  
    "pageNumber":0,  
    "pageSize":30  
} | {  
    "pageNumber": 0,  
    "pageSize": 30,  
    "data": \[  
      "56192",  
      "36112",  
      "51214"  
    \],  
    "totalCount": 3  
} |  |  |  |
| shipment-service | List of PO Numbers from Load table | /shipment-service/po-number/lookup | POST | Authorization <token>,   
Accept: application/json,  Content-Type: application/json | {  
    "lookup":"2",  
    "pageNumber":0,  
    "pageSize":30  
} | {  
    "pageNumber": 0,  
    "pageSize": 30,  
    "data": \[  
      "2352345",  
      "3623552",  
      "5334214"  
    \],  
    "totalCount": 3  
} |  |  |  |

## **Response Status Code:**

Success - 200

No Content - 204

Not Found- 404

Internal Server Error - 500

Unauthorized - 401

## **Class Details**:

‌

#### Controller Class:

ShipmentController

#### Service Class:

ShipmentService(Interface) -> ShipmentServiceImpl(Class)

#### DAO Class:

LoadEntityRepository

ShipmentEntityRepository

ShipmentPartnerRepository

….additional classes to be added later on

## AWS SQS Details

<custom data-type="smartlink" data-id="id-29">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3045031954</custom> 

## AWS Lambda Calling Shipment Service

‌

## Class Diagrams and Relationships

‌

![](blob:https://media.staging.atl-paas.net/?type=file&localId=00171ab9-d4f6-45b5-87e8-f1695e4e650c&id=f4cfe938-e966-4551-a1e2-ea7bede547c5&&collection=contentId-2643099672&height=531&occurrenceKey=null&width=571&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
‌

Entity and DTOs  

Property names must conform to the following guidelines:

* Property names should be meaningful names with defined semantics.
* Property names must be camel-cased, ascii strings.
* The first character must be a letter, an underscore (\_) or a dollar sign ($).
* Subsequent characters can be a letter, a digit, an underscore, or a dollar sign.

‌

Shipment

```
@Entity
@Table(name="shipment")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Shipment implements Serializable {

@Id
@Column(name = "shipment_id")
private Long shipmentId;

@Column(name = "source_shipment_id")
private String sourceShipmentId

@Column(name = "shipment_refid")
private String shipmentRefId;

@Column(name = "shipment_refno")
private String shipmentRefNo;

@Column(name = "shipment_type")
private String shipmentType;

@Column(name = "odyssey_shipment_identifier")
private String odysseyShipmentIdentifier;

@Column(name = "planning_status")
private String planningStatus;

@Column(name = "number_of_stops")
private Long numberOfStops;

......additional fields present, please refer to the Entity classes in the code.
}
```

‌

Load

```
@Builder
@EqualsAndHashCode
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "load")
public class Load implements Serializable {
@Id
@Column(name = "load_id")
private Long loadId;

@Column(name = "source_load_id")
private String source_load_id;

@Column(name = "planning_status")
private String planningStatus;

@Column(name = "pickup_appointment_time_zone_code")
private String pickupAppointmentTimezoneCode;

@Column(name = "delivery_appointment_time_zone_code")
private String deliveryAppointmentTimezoneCode;

@Column(name = "pickup_appointment_timestamp")
private LocalDateTime pickupAppointmentDate;

@Column(name = "delivery_appointment_timestamp")
private LocalDateTime deliveryAppointmentDate;

......additional fields present, please refer to the Entity classes in the code.
}
```

ShipmentPartner

```
@Builder
@EqualsAndHashCode
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "shipment_partner")
public class ShipmentPartner implements Serializable {
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
@Column(name = "ship_partner_id")
private Long shipPartnerId;
    
@Column(name = "partner_id")
private String partnerId;

@Column(name = "partner_type")
private String partnerType;

@Column(name = "full_name")
private String fullName;

@Column(name = "address1")
private String address1;

@Column(name = "address2")
private String address2;

@Column(name = "city")
private String city;

......additional fields present, please refer to the Entity classes in the code.
}
```

‌

ShippingOption

```
@Builder
@EqualsAndHashCode
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "shipping_option")
public class ShippingOption implements Serializable {
@Id
@Column(name = "shipment_stop_id")
private Long shipmentStopId;

@Column(name = "source_shipment_option_id")
private String sourceShipmentOptionId;

@Column(name = "shipping_option_sequence")
private Long shippingOptionSequence;

@Column(name = "carrier_id")
private String carrierId;

@Column(name = "carrier")
private String carrier;

@Column(name = "equipment_id")
private String equipmentId;

@Column(name = "equipment")
private String equipment;

@Column(name = "mode_id")
private String modeId;

@Column(name = "mode")
private String mode;

@Column(name = "subsidiary")
private String subsidiary;

......additional fields present, please refer to the Entity classes in the code.
}
```

‌

ShipmentStop

```
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "shipment_stop")
public class
ShipmentStop implements Serializable {
@Id
@Column(name = "shipment_stop_id")
private Long shipmentStopId;

@Column(name = "sequence")
private Long sequence;

@Column(name = "stop_type")
private String stopType;

@Column(name = "location")
private String location;

@Column(name = "appointment_timestamp")
private LocalDateTime appointmentDate;

@Column(name = "planned_timestamp")
private LocalDateTime plannedDate;

@Column(name = "actual_timestamp")
private LocalDateTime actualDate;

@Column(name = "appointment_time_zone_code")
private String appointmentDateTimezoneCode;

......additional fields present, please refer to the Entity classes in the code.
}
```

‌

ShipmentInstruction

```
@Entity
@Table(name="shipment_instruction")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentInstruction extends BaseEntity{
@Id
@Column(name = "instruction_id")
private Long instructionId;

@Column(name = "instruction_type")
private String instructionType;

@Column(name = "instruction_detail")
private String instructionDetail;

@Column(name = "instruction_sequence")
private Long instructionSequence;

@Column(name = "source_tbl_primary_key")
private String sourceTblPrimaryKey;

@Column(name = "source_record_created_time")
private LocalDateTime sourceRecordCreatedTime;

@Column(name = "is_active")
private Boolean isActive;

......additional fields present, please refer to the Entity classes in the code.
}
```

‌

UserFieldListLoad

```
@Entity
@Table(name="userfield_list_load")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserFieldListLoad implements Serializable {

@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
@Column(name = "userfield_list_id")
private Long userFieldListId;

@Column(name = "userfield_type")
private String userFieldType;

@Column(name = "name")
private String name;

@Column(name = "value")
private String value;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "load_id")
private Load load;

}
```

‌

UserFieldListShipment

```
@Entity
@Table(name="userfield_list_shipment")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserFieldListShipment implements Serializable {
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
@Column(name = "userfield_list_id")
private Long userFieldListId;

@Column(name = "userfield_type")
private String userFieldType;

@Column(name = "name")
private String name;

@Column(name = "value")
private String value;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "shipment_id")
private Shipment shipment;

}
```

‌

LineList

```
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "line_list")
public class LineList implements Serializable {
@Id
@Column(name = "line_id")
private Long lineId;

@Column(name = "refid")
private String refId;

@Column(name = "refno")
private String refNo;

@Column(name = "source_line_id")
private String source_line_id;

@Column(name = "order_number")
private String orderNumber;

@Column(name = "odyssey_shipment_identifier")
private String odysseyShipmentIdentifier;

@Column(name = "line_sequence")
private Long lineSequence;

......additional fields present, please refer to the Entity classes in the code.
}
```

‌

AccessorialDetailShipment

```
@Builder
@EqualsAndHashCode
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "accessorial_detail_shipment")
public class AccessorialDetailShipment implements Serializable {
    @Id
    @Column(name = "accessorial_detail_shipment_id")
    private Long accessorialId;

    @Column(name = "accessorial_code")
    private String accessorialCode;

    @Column(name = "accessorial_amount_uom_code")
    private String accessorialAmountUomCode;

    @Column(name = "accessorial_detail_shipment_sequence_sequence")
    private Long accessorialDetailShipmentSequence;

    @Column(name = "carriagecategory_shipment")
    private String carriageCategoryShipment;

    @Column(name = "accessorial_amount")
    private BigDecimal accessorialAmount;

    ......additional fields present, please refer to the Entity classes in the code.

}
```

‌

‌

## Constant Class:

AppConstant

LogConstant

## Common Utility Class:

CommonUtils

## Configuration Files:

application.properties

## Deployment File:

build.gradle

deployment.yaml

## DB Entity Relationship Diagrams

[https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2635759620/Logical+DB+Model](https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2635759620)

‌

## Swagger URL:

[https://dev.shipment.linx.odysseylogistics.com/shipment-swagger/v3/api-docs](https://dev.shipment.linx.odysseylogistics.com/shipment-swagger/v3/api-docs)