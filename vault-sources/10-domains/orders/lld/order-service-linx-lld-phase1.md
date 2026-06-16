---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2630090754/Order+Service+LINX+-+LLD
page_id: "2630090754"
title: "Order Service (LINX) - LLD"
last_modified: "Apr 22, 2026"
fetched: "2026-06-11"
space: TMS
---

 **Key Considerations/Assumptions:**

1. Lambda consume the SQS events and call the Order Service
2. The failed SQS evets needs to flow to DLQ
3. Similarly failed Lambda requests needs to flow to DLQ

‌

‌

## Sequence Diagrams

‌

![](blob:https://media.staging.atl-paas.net/?type=file&localId=a81ee0b8-916b-45dd-bc80-b55d4a6a5694&id=ab7decb9-6103-42b1-a1d5-7ff508f0d867&&collection=contentId-2630090754&height=862&occurrenceKey=null&width=1470&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
‌

Swagger URL : 

[https://dev.order.linx.odysseylogistics.com/order-swagger/v3/api-docs](https://dev.order.linx.odysseylogistics.com/order-swagger/v3/api-docs)

[https://qa.order.linx.odysseylogistics.com/order-swagger/v3/api-docs](https://qa.order.linx.odysseylogistics.com/order-swagger/v3/api-docs)

‌

| **Service-name** | **Description** | **Endpoint** | **Request Method** | **Headers** | **Request Payload ( Development)** | **Response** | **Remarks** | **QA-Payload** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Order | Create Order | /order-service/v2/order | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | **Updated Payload - V7** {  
  "orderIn": {  
    "version": "v6",  
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
    "orderInvolvedPartyList": \[  
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
    \],  
    "orderInstructionList": \[  
      {  
        "instructionNumber": 0,  
        "instructionDetail": "string",  
        "instructionType": "string",  
        "instructionId": "string"  
      }  
    \],  
    "orderCarrierEquipDetailList": \[  
      {  
        "scacCode": "string",  
        "mode": "string",  
        "carrierSequence": 0,  
        "modeDescription": "string",  
        "equipmentCode": "string",  
        "equipmentDescription": "string",  
        "sourceCarrierEquipId": "string"  
      }  
    \],  
    "orderLines": \[  
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
        "userFieldListOrderLine": \[  
          {  
            "userfieldType": "string",  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "orderLineChargeList": \[  
            {  
                "orderLineChargeAmountAP": 0,  
                "orderLineChargeAmountAPCurrencyCode": "string",  
                "orderLineChargeAmountAR": 0,  
                "orderLineChargeAmountARCurrencyCode": "string",  
                "orderLineChargeCode": "string",  
                "orderLineChargeDescription": "string",  
                "orderLineChargeSequence": 0  
          }  
        \]  
      }  
    \],  
    "orderAccessorialDetails": \[  
      {  
        "accessorialCode": "string",  
        "accessorialAmount": 0,  
        "accessorialAmountUomCode": "string",  
        "orderAccessorialDetailSequence": 0,  
        "sourceTblPrimaryKey": "string"  
      }  
    \],  
    "orderChargeList": \[  
      {  
        "orderChargeAmountAP": 0,  
        "orderChargeAmountAPCurrencyCode": "string",  
        "orderChargeAmountAR": 0,  
        "orderChargeAmountARCurrencyCode": "string",  
        "orderChargeCode": "string",  
        "orderChargeDescription": "string",  
        "orderChargeSequence": 0  
      }  
    \],  
    "userFieldList": \[  
      {  
        "userfieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "messageTimeStamp": "2025-05-16T10:21:10.505Z"  
  }  
} | { “orderId”: _<order Id>_, “message” : “Order <_order number_> created successfully” } | **Version-1**    _(updated on 18th Feb)_  **Version-2**   _(updated on 10th Feb)_  **Version-3**   _(updated on 11th Apr)_  **Version-4**  _(updated on 16th May)_  Version-5   (updated on 26th May) Added Charge list at Order and Line level Added _**version**_ attribute in payload  Version 6:   Moved     _**equipmentNumber**_ field to Order Header level Merged Carrier and Equipment into one object _**orderCarrierEquipDetailList**_ Removed _**sourceRecordCreatedTime**_ and _**sourceRecordUpdatedTime**_ in all child objects  |  {  
  "orderIn": {  
    "version": "string",  
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
    "orderInvolvedPartyList": \[  
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
    \],  
    "orderInstructionList": \[  
      {  
        "instructionNumber": 0,  
        "instructionDetail": "string",  
        "instructionType": "string",  
        "instructionId": "string"  
      }  
    \],  
    "orderCarrierEquipDetailList": \[  
      {  
        "scacCode": "string",  
        "mode": "string",  
        "carrierSequence": 0,  
        "modeDescription": "string",  
        "equipmentCode": "string",  
        "equipmentDescription": "string",  
        "sourceCarrierEquipId": "string"  
      }  
    \],  
    "orderLines": \[  
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
        "userFieldListOrderLine": \[  
          {  
            "userfieldType": "string",  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "orderLineChargeList": \[  
            {  
                "orderLineChargeAmountAP": 0,  
                "orderLineChargeAmountAPCurrencyCode": "string",  
                "orderLineChargeAmountAR": 0,  
                "orderLineChargeAmountARCurrencyCode": "string",  
                "orderLineChargeCode": "string",  
                "orderLineChargeDescription": "string",  
                "orderLineChargeSequence": 0  
          }  
        \]  
      }  
    \],  
    "orderAccessorialDetails": \[  
      {  
        "accessorialCode": "string",  
        "accessorialAmount": 0,  
        "accessorialAmountUomCode": "string",  
        "orderAccessorialDetailSequence": 0,  
        "sourceTblPrimaryKey": "string"  
      }  
    \],  
    "orderChargeList": \[  
      {  
        "orderChargeAmountAP": 0,  
        "orderChargeAmountAPCurrencyCode": "string",  
        "orderChargeAmountAR": 0,  
        "orderChargeAmountARCurrencyCode": "string",  
        "orderChargeCode": "string",  
        "orderChargeDescription": "string",  
        "orderChargeSequence": 0  
      }  
    \],  
    "userFieldList": \[  
      {  
        "userfieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "messageTimeStamp": "2025-05-16T10:21:10.505Z"  
  }  
} |
| Order | Edit Order | /order-service/v2/order | PATCH | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | **Updated Payload - V7** {  
  "orderIn": {  
    "version": "v6",  
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
    "orderInvolvedPartyList": \[  
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
    \],  
    "orderInstructionList": \[  
      {  
        "instructionNumber": 0,  
        "instructionDetail": "string",  
        "instructionType": "string",  
        "instructionId": "string"  
      }  
    \],  
    "orderCarrierEquipDetailList": \[  
      {  
        "scacCode": "string",  
        "mode": "string",  
        "carrierSequence": 0,  
        "modeDescription": "string",  
        "equipmentCode": "string",  
        "equipmentDescription": "string",  
        "sourceCarrierEquipId": "string"  
      }  
    \],  
    "orderLines": \[  
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
        "plannedCostAP": 0,  
        "plannedCostAPCurrencyCode": "string",  
        "plannedCostAR": 0,  
        "plannedCostARCurrencyCode": "string",  
        "userFieldListOrderLine": \[  
          {  
            "userfieldType": "string",  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "orderLineChargeList": \[  
            {  
                "orderLineChargeAmountAP": 0,  
                "orderLineChargeAmountAPCurrencyCode": "string",  
                "orderLineChargeAmountAR": 0,  
                "orderLineChargeAmountARCurrencyCode": "string",  
                "orderLineChargeCode": "string",  
                "orderLineChargeDescription": "string",  
                "orderLineChargeSequence": 0  
          }  
        \]  
      }  
    \],  
    "orderAccessorialDetails": \[  
      {  
        "accessorialCode": "string",  
        "accessorialAmount": 0,  
        "accessorialAmountUomCode": "string",  
        "orderAccessorialDetailSequence": 0,  
        "sourceTblPrimaryKey": "string"  
      }  
    \],  
    "orderChargeList": \[  
      {  
        "orderChargeAmountAP": 0,  
        "orderChargeAmountAPCurrencyCode": "string",  
        "orderChargeAmountAR": 0,  
        "orderChargeAmountARCurrencyCode": "string",  
        "orderChargeCode": "string",  
        "orderChargeDescription": "string",  
        "orderChargeSequence": 0  
      }  
    \],  
    "userFieldList": \[  
      {  
        "userfieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "messageTimeStamp": "2025-05-16T10:21:10.505Z"  
  }  
} | { “orderId”: <_order Id_>, “message”: “Order <_order number_> updated successfully” } | **Version-1**    _(updated on 18th Feb)_  **Version-2**   _(updated on 10th Feb)_  **Version-3**   _(updated on 11th Apr)_  **Version-4**  _(updated on 16th May)_  **Version-5**   (updated on 26th May) Added Charge list at Order and Line level Added _**version**_ attribute in payload  **Version 6:**  Moved      _**equipmentNumber**_ field to Order Header level Merged Carrier and Equipment into one object _**orderCarrierEquipDetailList**_ Removed _**sourceRecordCreatedTime**_ and _**sourceRecordUpdatedTime**_ in all child objects   |  {  
  "orderIn": {  
    "version": "v6",  
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
    "orderInvolvedPartyList": \[  
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
    \],  
    "orderInstructionList": \[  
      {  
        "instructionNumber": 0,  
        "instructionDetail": "string",  
        "instructionType": "string",  
        "instructionId": "string"  
      }  
    \],  
    "orderCarrierEquipDetailList": \[  
      {  
        "scacCode": "string",  
        "mode": "string",  
        "carrierSequence": 0,  
        "modeDescription": "string",  
        "equipmentCode": "string",  
        "equipmentDescription": "string",  
        "sourceCarrierEquipId": "string"  
      }  
    \],  
    "orderLines": \[  
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
        "plannedCostAP": 0,  
        "plannedCostAPCurrencyCode": "string",  
        "plannedCostAR": 0,  
        "plannedCostARCurrencyCode": "string",  
        "userFieldListOrderLine": \[  
          {  
            "userfieldType": "string",  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "orderLineChargeList": \[  
            {  
                "orderLineChargeAmountAP": 0,  
                "orderLineChargeAmountAPCurrencyCode": "string",  
                "orderLineChargeAmountAR": 0,  
                "orderLineChargeAmountARCurrencyCode": "string",  
                "orderLineChargeCode": "string",  
                "orderLineChargeDescription": "string",  
                "orderLineChargeSequence": 0  
          }  
        \]  
      }  
    \],  
    "orderAccessorialDetails": \[  
      {  
        "accessorialCode": "string",  
        "accessorialAmount": 0,  
        "accessorialAmountUomCode": "string",  
        "orderAccessorialDetailSequence": 0,  
        "sourceTblPrimaryKey": "string"  
      }  
    \],  
    "orderChargeList": \[  
      {  
        "orderChargeAmountAP": 0,  
        "orderChargeAmountAPCurrencyCode": "string",  
        "orderChargeAmountAR": 0,  
        "orderChargeAmountARCurrencyCode": "string",  
        "orderChargeCode": "string",  
        "orderChargeDescription": "string",  
        "orderChargeSequence": 0  
      }  
    \],  
    "userFieldList": \[  
      {  
        "userfieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "messageTimeStamp": "2025-05-16T10:21:10.505Z"  
  }  
} |
| Order | Cancel Order | /order-service/v2/order | PATCH | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | **Updated Payload - V7** {  
  "orderIn": {  
    "version": "v6",  
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
    "plannedCostAP": 0,  
    "plannedCostAPCurrencyCode": "string",  
    "plannedCostAR": 0,  
    "plannedCostARCurrencyCode": "string",  
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
    "orderInvolvedPartyList": \[  
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
    \],  
    "orderInstructionList": \[  
      {  
        "instructionNumber": 0,  
        "instructionDetail": "string",  
        "instructionType": "string",  
        "instructionId": "string"  
      }  
    \],  
    "orderCarrierEquipDetailList": \[  
      {  
        "scacCode": "string",  
        "mode": "string",  
        "carrierSequence": 0,  
        "modeDescription": "string",  
        "equipmentCode": "string",  
        "equipmentDescription": "string",  
        "sourceCarrierEquipId": "string"  
      }  
    \],  
    "orderLines": \[  
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
        "userFieldListOrderLine": \[  
          {  
            "userfieldType": "string",  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "orderLineChargeList": \[  
            {  
                "orderLineChargeAmountAP": 0,  
                "orderLineChargeAmountAPCurrencyCode": "string",  
                "orderLineChargeAmountAR": 0,  
                "orderLineChargeAmountARCurrencyCode": "string",  
                "orderLineChargeCode": "string",  
                "orderLineChargeDescription": "string",  
                "orderLineChargeSequence": 0  
          }  
        \]  
      }  
    \],  
    "orderAccessorialDetails": \[  
      {  
        "accessorialCode": "string",  
        "accessorialAmount": 0,  
        "accessorialAmountUomCode": "string",  
        "orderAccessorialDetailSequence": 0,  
        "sourceTblPrimaryKey": "string"  
      }  
    \],  
    "orderChargeList": \[  
      {  
        "orderChargeAmountAP": 0,  
        "orderChargeAmountAPCurrencyCode": "string",  
        "orderChargeAmountAR": 0,  
        "orderChargeAmountARCurrencyCode": "string",  
        "orderChargeCode": "string",  
        "orderChargeDescription": "string",  
        "orderChargeSequence": 0  
      }  
    \],  
    "userFieldList": \[  
      {  
        "userfieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "messageTimeStamp": "2025-05-16T10:21:10.505Z"  
  }  
} | { “orderId”: <_order Id_>, “message”: “Order <_order number_> cancelled successfully” } | Below are the identifiers for cancel order {  
  "orderIdentifier": "923856852",  
  "orderStatus": {  
    "orderStatusCode": "CAN",  
    "orderStatusName": "Canceled"  
  }  
}  **Version-1**    _(updated on 18th Feb)_  **Version-2**   _(updated on 10th Feb)_  **Version-3**   _(updated on 11th Apr)_  **Version-4**  _(updated on 16th May)_  **Version-5**   (updated on 26th May) Added Charge list at Order and Line level Added _**version**_ attribute in payload  **Version 6:**  Moved     _**equipmentNumber**_ field to Order Header level Merged Carrier and Equipment into one object _**orderCarrierEquipDetailList**_ Removed _**sourceRecordCreatedTime**_ and _**sourceRecordUpdatedTime**_ in all child objects |  {  
  "orderIn": {  
    "version": "v6",  
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
    "plannedCostAP": 0,  
    "plannedCostAPCurrencyCode": "string",  
    "plannedCostAR": 0,  
    "plannedCostARCurrencyCode": "string",  
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
    "orderInvolvedPartyList": \[  
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
    \],  
    "orderInstructionList": \[  
      {  
        "instructionNumber": 0,  
        "instructionDetail": "string",  
        "instructionType": "string",  
        "instructionId": "string"  
      }  
    \],  
    "orderCarrierEquipDetailList": \[  
      {  
        "scacCode": "string",  
        "mode": "string",  
        "carrierSequence": 0,  
        "modeDescription": "string",  
        "equipmentCode": "string",  
        "equipmentDescription": "string",  
        "sourceCarrierEquipId": "string"  
      }  
    \],  
    "orderLines": \[  
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
        "userFieldListOrderLine": \[  
          {  
            "userfieldType": "string",  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "orderLineChargeList": \[  
            {  
                "orderLineChargeAmountAP": 0,  
                "orderLineChargeAmountAPCurrencyCode": "string",  
                "orderLineChargeAmountAR": 0,  
                "orderLineChargeAmountARCurrencyCode": "string",  
                "orderLineChargeCode": "string",  
                "orderLineChargeDescription": "string",  
                "orderLineChargeSequence": 0  
          }  
        \]  
      }  
    \],  
    "orderAccessorialDetails": \[  
      {  
        "accessorialCode": "string",  
        "accessorialAmount": 0,  
        "accessorialAmountUomCode": "string",  
        "orderAccessorialDetailSequence": 0,  
        "sourceTblPrimaryKey": "string"  
      }  
    \],  
    "orderChargeList": \[  
      {  
        "orderChargeAmountAP": 0,  
        "orderChargeAmountAPCurrencyCode": "string",  
        "orderChargeAmountAR": 0,  
        "orderChargeAmountARCurrencyCode": "string",  
        "orderChargeCode": "string",  
        "orderChargeDescription": "string",  
        "orderChargeSequence": 0  
      }  
    \],  
    "userFieldList": \[  
      {  
        "userfieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "messageTimeStamp": "2025-05-16T10:21:10.505Z"  
  }  
} |
| Order | Check message if the request is for create/edit/cancel | /order-service/v2/message/forward | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  | Order Request Payload given as above | No response | The internal logic will route the request to create/edit/cancel api endpoints  
  
If Order does not exist for the given OrderId, should forward to create flow |
| Order | Get Order by using Order Number or Order Id | /order-service/v1/order/{orderNumberOrOrderId} | GET | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  | {   
    "version": "string",  
    "pgiFlag": true,  
    "orderId": 0,  
    "loadId": 0,  
    "buyShipmentId": 0,  
    "sellShipmentId": 0,  
    "sourceOrderNumber": "string",  
    "orderNumber": "string",  
    "requestedDeliveryDate": "2025-07-02T12:37:22.602Z",  
    "requestedDeliveryTimeZoneCode": "string",  
    "requestedShipDate": "2025-07-02T12:37:22.602Z",  
    "requestedShipTimeZoneCode": "string",  
    "requestedPickupDate": "2025-07-02T12:37:22.602Z",  
    "requestedPickupTimeZoneCode": "string",  
    "freightTermCode": "string",  
    "customerId": "string",  
    "contactName": "string",  
    "incotermInfo": "string",  
    "pickupNumber": "string",  
    "shipDirectionCode": "string",  
    "pickupAppointment": "2025-07-02T12:37:22.602Z",  
    "pickupAppointmentTimeZoneCode": "string",  
    "deliveryAppointment": "2025-07-02T12:37:22.602Z",  
    "deliveryAppointmentTimeZoneCode": "string",  
    "poDate": "2025-07-02",  
    "poNumber": "string",  
    "requestedDateType": "string",  
    "requestedTimestamp": "2025-07-02T12:37:22.602Z",  
    "requestedTimeZoneCode": "string",  
    "shipTimestamp": "2025-07-02T12:37:22.603Z",  
    "shipTimeZoneCode": "string",  
    "deliveryTimestamp": "2025-07-02T12:37:22.603Z",  
    "deliveryTimeZoneCode": "string",  
    "availableTimestamp": "2025-07-02T12:37:22.603Z",  
    "availableTimeZoneCode": "string",  
    "orderDate": "2025-07-02T12:37:22.603Z",  
    "orderReleaseId": "string",  
    "orderReleaseRefno": "string",  
    "orderReleaseSequence": 0,  
    "interfaceSortKey": "string",  
    "interfaceTransactionType": "string",  
    "interfacePrevalidated": true,  
    "equipmentNumber": "string",  
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
    "bolNo": "string",  
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
    "orderInvolvedPartyList": \[  
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
        "partyId": "string"  
      }  
    \],  
    "orderInstructionList": \[  
      {  
        "instructionNumber": 0,  
        "instructionDetail": "string",  
        "instructionType": "string",  
        "instructionId": "string"  
      }  
    \],  
    "orderCarrierEquipDetailList": \[  
      {  
        "scacCode": "string",  
        "mode": "string",  
        "carrierSequence": 0,  
        "modeDescription": "string",  
        "sourceCarrierEquipId": "string",  
        "equipmentCode": "string",  
        "equipmentDescription": "string"  
      }  
    \],  
    "orderLines": \[  
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
        "thirdPartyReferenceDate": "2025-07-02T12:37:22.603Z",  
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
        "userFieldListOrderLine": \[  
          {  
            "userfieldType": "string",  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "orderLineChargeList": \[  
          {  
            "orderLineChargeCode": "string",  
            "orderLineChargeDescription": "string",  
            "orderLineChargeApAllocated": 0,  
            "orderLineChargeApAllocatedCurrencyCode": "string",  
            "orderLineChargeArCalculated": 0,  
            "orderLineChargeArCalculatedCurrencyCode": "string",  
            "orderLineChargeSequence": 0,  
            "orderLineChargeApCompletedCost": 0,  
            "orderLineChargeApCompletedCostCurrencyCode": "string",  
            "orderLineChargeArCompletedCost": 0,  
            "orderLineChargeArCompletedCostCurrencyCode": "string"  
          }  
        \],  
        "apCompletedCost": 0,  
        "apCompletedCostCurrencyCode": "string",  
        "arCompletedCost": 0,  
        "arCompletedCostCurrencyCode": "string"  
      }  
    \],  
    "orderAccessorialDetails": \[  
      {  
        "accessorialCode": "string",  
        "accessorialAmount": 0,  
        "accessorialAmountUomCode": "string",  
        "orderAccessorialDetailSequence": 0,  
        "sourceTblPrimaryKey": "string"  
      }  
    \],  
    "orderChargeList": \[  
      {  
        "orderChargeCode": "string",  
        "orderChargeDescription": "string",  
        "orderChargeApAllocated": 0,  
        "orderChargeApAllocatedCurrencyCode": "string",  
        "orderChargeArCalculated": 0,  
        "orderChargeArCalculatedCurrencyCode": "string",  
        "orderChargeSequence": 0,  
        "orderChargeApCompletedCost": 0,  
        "orderChargeApCompletedCostCurrencyCode": "string",  
        "orderChargeArCompletedCost": 0,  
        "orderChargeArCompletedCostCurrencyCode": "string"  
      }  
    \],  
    "userFieldList": \[  
      {  
        "userfieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "messageTimeStamp": "2025-07-02T12:37:22.603Z"  
  } |  |  |
| Order | Get Order by using Order Number | /order-service/v2/order-out/{orderNumber} | GET | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  | Version: v5 {  
  "orderOut": {  
    "version": "string",  
    "pgiFlag": true,  
    "orderId": 0,  
    "loadId": 0,  
    "buyShipmentId": 0,  
    "sellShipmentId": 0,  
    "sourceOrderNumber": "string",  
    "orderNumber": "string",  
    "requestedDeliveryDate": "2025-07-02T12:37:22.602Z",  
    "requestedDeliveryTimeZoneCode": "string",  
    "requestedShipDate": "2025-07-02T12:37:22.602Z",  
    "requestedShipTimeZoneCode": "string",  
    "requestedPickupDate": "2025-07-02T12:37:22.602Z",  
    "requestedPickupTimeZoneCode": "string",  
    "freightTermCode": "string",  
    "customerId": "string",  
    "contactName": "string",  
    "incotermInfo": "string",  
    "pickupNumber": "string",  
    "shipDirectionCode": "string",  
    "pickupAppointment": "2025-07-02T12:37:22.602Z",  
    "pickupAppointmentTimeZoneCode": "string",  
    "deliveryAppointment": "2025-07-02T12:37:22.602Z",  
    "deliveryAppointmentTimeZoneCode": "string",  
    "poDate": "2025-07-02",  
    "poNumber": "string",  
    "requestedDateType": "string",  
    "requestedTimestamp": "2025-07-02T12:37:22.602Z",  
    "requestedTimeZoneCode": "string",  
    "shipTimestamp": "2025-07-02T12:37:22.603Z",  
    "shipTimeZoneCode": "string",  
    "deliveryTimestamp": "2025-07-02T12:37:22.603Z",  
    "deliveryTimeZoneCode": "string",  
    "availableTimestamp": "2025-07-02T12:37:22.603Z",  
    "availableTimeZoneCode": "string",  
    "orderDate": "2025-07-02T12:37:22.603Z",  
    "orderReleaseId": "string",  
    "orderReleaseRefno": "string",  
    "orderReleaseSequence": 0,  
    "interfaceSortKey": "string",  
    "interfaceTransactionType": "string",  
    "interfacePrevalidated": true,  
    "equipmentNumber": "string",  
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
    "bolNo": "string",  
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
    "orderInvolvedPartyList": \[  
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
        "partyId": "string"  
      }  
    \],  
    "orderInstructionList": \[  
      {  
        "instructionNumber": 0,  
        "instructionDetail": "string",  
        "instructionType": "string",  
        "instructionId": "string"  
      }  
    \],  
    "orderCarrierEquipDetailList": \[  
      {  
        "scacCode": "string",  
        "mode": "string",  
        "carrierSequence": 0,  
        "modeDescription": "string",  
        "sourceCarrierEquipId": "string",  
        "equipmentCode": "string",  
        "equipmentDescription": "string"  
      }  
    \],  
    "orderLines": \[  
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
        "thirdPartyReferenceDate": "2025-07-02T12:37:22.603Z",  
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
        "userFieldListOrderLine": \[  
          {  
            "userfieldType": "string",  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "orderLineChargeList": \[  
          {  
            "orderLineChargeCode": "string",  
            "orderLineChargeDescription": "string",  
            "orderLineChargeApAllocated": 0,  
            "orderLineChargeApAllocatedCurrencyCode": "string",  
            "orderLineChargeArCalculated": 0,  
            "orderLineChargeArCalculatedCurrencyCode": "string",  
            "orderLineChargeSequence": 0,  
            "orderLineChargeApCompletedCost": 0,  
            "orderLineChargeApCompletedCostCurrencyCode": "string",  
            "orderLineChargeArCompletedCost": 0,  
            "orderLineChargeArCompletedCostCurrencyCode": "string"  
          }  
        \],  
        "apCompletedCost": 0,  
        "apCompletedCostCurrencyCode": "string",  
        "arCompletedCost": 0,  
        "arCompletedCostCurrencyCode": "string"  
      }  
    \],  
    "orderAccessorialDetails": \[  
      {  
        "accessorialCode": "string",  
        "accessorialAmount": 0,  
        "accessorialAmountUomCode": "string",  
        "orderAccessorialDetailSequence": 0,  
        "sourceTblPrimaryKey": "string"  
      }  
    \],  
    "orderChargeList": \[  
      {  
        "orderChargeCode": "string",  
        "orderChargeDescription": "string",  
        "orderChargeApAllocated": 0,  
        "orderChargeApAllocatedCurrencyCode": "string",  
        "orderChargeArCalculated": 0,  
        "orderChargeArCalculatedCurrencyCode": "string",  
        "orderChargeSequence": 0,  
        "orderChargeApCompletedCost": 0,  
        "orderChargeApCompletedCostCurrencyCode": "string",  
        "orderChargeArCompletedCost": 0,  
        "orderChargeArCompletedCostCurrencyCode": "string"  
      }  
    \],  
    "userFieldList": \[  
      {  
        "userfieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "messageTimeStamp": "2025-07-02T12:37:22.603Z"  
  }  
} | Version 1:   Version 2:  Added Charge list at Order and Line level Added _**version**_ attribute in payload  **Version 3:**   Moved     _**equipmentNumber**_ field to Order Header level Merged Carrier and Equipment into one object _**orderCarrierEquipDetailList**_ Removed _**sourceRecordCreatedTime**_ and _**sourceRecordUpdatedTime**_ in all child objects Added **pgiFlag**   **Version 4:**  Completed cost fields added in order-header, order-charge, order-line and order-line-charge sections "apCompletedCost": 0,  
"apCompletedCostCurrencyCode": "string",  
"arCompletedCost": 0,  
"arCompletedCostCurrencyCode": "string",    2. Re-named all the planned cost fields in all the sections   **Version: 5** Added new fields "loadId": 0,  
"buyShipmentId": 0,  
"sellShipmentId": 0,  |  {  
  "orderOut": {  
    "version": "string",  
    "pgiFlag": true,  
    "orderId": 0,  
    "loadId": 0,  
    "buyShipmentId": 0,  
    "sellShipmentId": 0,  
    "sourceOrderNumber": "string",  
    "orderNumber": "string",  
    "requestedDeliveryDate": "2025-07-02T12:37:22.602Z",  
    "requestedDeliveryTimeZoneCode": "string",  
    "requestedShipDate": "2025-07-02T12:37:22.602Z",  
    "requestedShipTimeZoneCode": "string",  
    "requestedPickupDate": "2025-07-02T12:37:22.602Z",  
    "requestedPickupTimeZoneCode": "string",  
    "freightTermCode": "string",  
    "customerId": "string",  
    "contactName": "string",  
    "incotermInfo": "string",  
    "pickupNumber": "string",  
    "shipDirectionCode": "string",  
    "pickupAppointment": "2025-07-02T12:37:22.602Z",  
    "pickupAppointmentTimeZoneCode": "string",  
    "deliveryAppointment": "2025-07-02T12:37:22.602Z",  
    "deliveryAppointmentTimeZoneCode": "string",  
    "poDate": "2025-07-02",  
    "poNumber": "string",  
    "requestedDateType": "string",  
    "requestedTimestamp": "2025-07-02T12:37:22.602Z",  
    "requestedTimeZoneCode": "string",  
    "shipTimestamp": "2025-07-02T12:37:22.603Z",  
    "shipTimeZoneCode": "string",  
    "deliveryTimestamp": "2025-07-02T12:37:22.603Z",  
    "deliveryTimeZoneCode": "string",  
    "availableTimestamp": "2025-07-02T12:37:22.603Z",  
    "availableTimeZoneCode": "string",  
    "orderDate": "2025-07-02T12:37:22.603Z",  
    "orderReleaseId": "string",  
    "orderReleaseRefno": "string",  
    "orderReleaseSequence": 0,  
    "interfaceSortKey": "string",  
    "interfaceTransactionType": "string",  
    "interfacePrevalidated": true,  
    "equipmentNumber": "string",  
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
    "bolNo": "string",  
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
    "orderInvolvedPartyList": \[  
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
        "partyId": "string"  
      }  
    \],  
    "orderInstructionList": \[  
      {  
        "instructionNumber": 0,  
        "instructionDetail": "string",  
        "instructionType": "string",  
        "instructionId": "string"  
      }  
    \],  
    "orderCarrierEquipDetailList": \[  
      {  
        "scacCode": "string",  
        "mode": "string",  
        "carrierSequence": 0,  
        "modeDescription": "string",  
        "sourceCarrierEquipId": "string",  
        "equipmentCode": "string",  
        "equipmentDescription": "string"  
      }  
    \],  
    "orderLines": \[  
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
        "thirdPartyReferenceDate": "2025-07-02T12:37:22.603Z",  
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
        "userFieldListOrderLine": \[  
          {  
            "userfieldType": "string",  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "orderLineChargeList": \[  
          {  
            "orderLineChargeCode": "string",  
            "orderLineChargeDescription": "string",  
            "orderLineChargeApAllocated": 0,  
            "orderLineChargeApAllocatedCurrencyCode": "string",  
            "orderLineChargeArCalculated": 0,  
            "orderLineChargeArCalculatedCurrencyCode": "string",  
            "orderLineChargeSequence": 0,  
            "orderLineChargeApCompletedCost": 0,  
            "orderLineChargeApCompletedCostCurrencyCode": "string",  
            "orderLineChargeArCompletedCost": 0,  
            "orderLineChargeArCompletedCostCurrencyCode": "string"  
          }  
        \],  
        "apCompletedCost": 0,  
        "apCompletedCostCurrencyCode": "string",  
        "arCompletedCost": 0,  
        "arCompletedCostCurrencyCode": "string"  
      }  
    \],  
    "orderAccessorialDetails": \[  
      {  
        "accessorialCode": "string",  
        "accessorialAmount": 0,  
        "accessorialAmountUomCode": "string",  
        "orderAccessorialDetailSequence": 0,  
        "sourceTblPrimaryKey": "string"  
      }  
    \],  
    "orderChargeList": \[  
      {  
        "orderChargeCode": "string",  
        "orderChargeDescription": "string",  
        "orderChargeApAllocated": 0,  
        "orderChargeApAllocatedCurrencyCode": "string",  
        "orderChargeArCalculated": 0,  
        "orderChargeArCalculatedCurrencyCode": "string",  
        "orderChargeSequence": 0,  
        "orderChargeApCompletedCost": 0,  
        "orderChargeApCompletedCostCurrencyCode": "string",  
        "orderChargeArCompletedCost": 0,  
        "orderChargeArCompletedCostCurrencyCode": "string"  
      }  
    \],  
    "userFieldList": \[  
      {  
        "userfieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "messageTimeStamp": "2025-07-02T12:37:22.603Z"  
  }  
} |
| Order Service | List of Order Numbers from Order Info table | /order-service/v2/order-number/lookup | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | {  
    "lookup":"<string>",  
    "pageNumber":0,  
    "pageSize":30  
} | {  
    "pageNumber": 0,  
    "pageSize": 30,  
    "data": \[  
      "<string>",  
      "<string>",  
      "<string>"  
    \],  
    "totalCount": 3  
} |  |  |
| Order Service | List of Source Order Numbers from Order Info table | /order-service/v2/source-order-number/lookup | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | {  
    "lookup":"<string>",  
    "pageNumber":0,  
    "pageSize":30  
} | {  
    "pageNumber": 0,  
    "pageSize": 30,  
    "data": \[  
      "<string>",  
      "<string>",  
      "<string>"  
    \],  
    "totalCount": 3  
} |  |  |
| Order Service | Search Order by OrderId or OrderNumber and CustomerId | /order-service/v2/order/search | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  {  
    "orderNumber": "",  
    "customerId": "",  
    "orderId": "31445"  
}  
   
OR   
   
{  
    "orderNumber": "01-410068964",  
    "customerId": "9780",  
    "orderId": ""  
} |  {  
    "version": "string",  
    "pgiFlag": true,  
    "orderId": 0,  
    "loadId": 0,  
    "buyShipmentId": 0,  
    "sellShipmentId": 0,  
    "sourceOrderNumber": "string",  
    "orderNumber": "string",  
    "requestedDeliveryDate": "2025-07-02T12:37:22.602Z",  
    "requestedDeliveryTimeZoneCode": "string",  
    "requestedShipDate": "2025-07-02T12:37:22.602Z",  
    "requestedShipTimeZoneCode": "string",  
    "requestedPickupDate": "2025-07-02T12:37:22.602Z",  
    "requestedPickupTimeZoneCode": "string",  
    "freightTermCode": "string",  
    "customerId": "string",  
    "contactName": "string",  
    "incotermInfo": "string",  
    "pickupNumber": "string",  
    "shipDirectionCode": "string",  
    "pickupAppointment": "2025-07-02T12:37:22.602Z",  
    "pickupAppointmentTimeZoneCode": "string",  
    "deliveryAppointment": "2025-07-02T12:37:22.602Z",  
    "deliveryAppointmentTimeZoneCode": "string",  
    "poDate": "2025-07-02",  
    "poNumber": "string",  
    "requestedDateType": "string",  
    "requestedTimestamp": "2025-07-02T12:37:22.602Z",  
    "requestedTimeZoneCode": "string",  
    "shipTimestamp": "2025-07-02T12:37:22.603Z",  
    "shipTimeZoneCode": "string",  
    "deliveryTimestamp": "2025-07-02T12:37:22.603Z",  
    "deliveryTimeZoneCode": "string",  
    "availableTimestamp": "2025-07-02T12:37:22.603Z",  
    "availableTimeZoneCode": "string",  
    "orderDate": "2025-07-02T12:37:22.603Z",  
    "orderReleaseId": "string",  
    "orderReleaseRefno": "string",  
    "orderReleaseSequence": 0,  
    "interfaceSortKey": "string",  
    "interfaceTransactionType": "string",  
    "interfacePrevalidated": true,  
    "equipmentNumber": "string",  
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
    "bolNo": "string",  
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
    "orderInvolvedPartyList": \[  
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
        "partyId": "string"  
      }  
    \],  
    "orderInstructionList": \[  
      {  
        "instructionNumber": 0,  
        "instructionDetail": "string",  
        "instructionType": "string",  
        "instructionId": "string"  
      }  
    \],  
    "orderCarrierEquipDetailList": \[  
      {  
        "scacCode": "string",  
        "mode": "string",  
        "carrierSequence": 0,  
        "modeDescription": "string",  
        "sourceCarrierEquipId": "string",  
        "equipmentCode": "string",  
        "equipmentDescription": "string"  
      }  
    \],  
    "orderLines": \[  
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
        "thirdPartyReferenceDate": "2025-07-02T12:37:22.603Z",  
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
        "userFieldListOrderLine": \[  
          {  
            "userfieldType": "string",  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "orderLineChargeList": \[  
          {  
            "orderLineChargeCode": "string",  
            "orderLineChargeDescription": "string",  
            "orderLineChargeApAllocated": 0,  
            "orderLineChargeApAllocatedCurrencyCode": "string",  
            "orderLineChargeArCalculated": 0,  
            "orderLineChargeArCalculatedCurrencyCode": "string",  
            "orderLineChargeSequence": 0,  
            "orderLineChargeApCompletedCost": 0,  
            "orderLineChargeApCompletedCostCurrencyCode": "string",  
            "orderLineChargeArCompletedCost": 0,  
            "orderLineChargeArCompletedCostCurrencyCode": "string"  
          }  
        \],  
        "apCompletedCost": 0,  
        "apCompletedCostCurrencyCode": "string",  
        "arCompletedCost": 0,  
        "arCompletedCostCurrencyCode": "string"  
      }  
    \],  
    "orderAccessorialDetails": \[  
      {  
        "accessorialCode": "string",  
        "accessorialAmount": 0,  
        "accessorialAmountUomCode": "string",  
        "orderAccessorialDetailSequence": 0,  
        "sourceTblPrimaryKey": "string"  
      }  
    \],  
    "orderChargeList": \[  
      {  
        "orderChargeCode": "string",  
        "orderChargeDescription": "string",  
        "orderChargeApAllocated": 0,  
        "orderChargeApAllocatedCurrencyCode": "string",  
        "orderChargeArCalculated": 0,  
        "orderChargeArCalculatedCurrencyCode": "string",  
        "orderChargeSequence": 0,  
        "orderChargeApCompletedCost": 0,  
        "orderChargeApCompletedCostCurrencyCode": "string",  
        "orderChargeArCompletedCost": 0,  
        "orderChargeArCompletedCostCurrencyCode": "string"  
      }  
    \],  
    "userFieldList": \[  
      {  
        "userfieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "messageTimeStamp": "2025-07-02T12:37:22.603Z"  
} |  |  |

‌

## **Response Status Code:**

Success - 200

No Content - 204

Not Found- 404

Internal Server Error - 500

Unauthorized - 401

## **Class Details**:

#### Controller Class:

LinxOrderController

#### Service Class:

LinxOrderService(Interface) -> LinxOrderServiceImpl(Class)

#### DAO Class:

OrderRepository

OrderStatusRepository

OrderLineRepository

OrderInvolvePartyRepository

OrderInstructionRepository

OrderEquipmentDetailsRepository

OrderCarrierDetailsRepository

OrderChargeRepository

OrderLineChargeRepository

SourceApplicationRepository

UserFieldListRepository

## Class Diagrams and Relationships

‌

![](blob:https://media.staging.atl-paas.net/?type=file&localId=b4e95466-1465-4460-ad1c-eb4ff19dd61b&id=2419adb7-d7c8-4442-8034-5061e6447bac&&collection=contentId-2630090754&height=301&occurrenceKey=null&width=749&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
‌

Entity and DTOs

Property names must conform to the following guidelines:

* Property names should be meaningful names with defined semantics.
* Property names must be camel-cased, ascii strings.
* The first character must be a letter, an underscore (\_) or a dollar sign ($).
* Subsequent characters can be a letter, a digit, an underscore, or a dollar sign.

OrderLine

```
@Builder
@EqualsAndHashCode(callSuper = false)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "order_line")
public class OrderLine extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_line_id")
    private Long orderLineId;

    @Column(name = "sequence_number")
    private Long lineIdentifier;

    @Column(name = "product_code")
    private String shipItemIdentifier;

    @Column(name = "packaging_id")
    private String packagingIdentifier;

    @Column(name = "is_load_constraint")
    private Boolean isLoadConstraints;

    @Column(name = "source_sequence_number")
    private Long externalLineIdentifier;

    @Column(name = "third_party_reference_number")
    private String thirdPartyReferenceNumber;

    @Column(name = "third_party_reference_line_number")
    private Long thirdPartyReferenceLineNumber;

    @Column(name = "third_party_reference_date")
    private LocalDateTime thirdPartyReferenceDate;

    @Column(name = "package_count")
    private Long packageCount;

    @Column(name = "height_value")
    private BigDecimal heightValue;

    @Column(name = "height_uom_code")
    private String heightUomCode;

    @Column(name = "length_value")
    private BigDecimal lengthValue;

    @Column(name = "length_uom_code")
    private String lengthUomCode;

    @Column(name = "width_value")
    private BigDecimal widthValue;

    @Column(name = "width_uom_code")
    private String widthUomCode;

    @Column(name = "batch_lot_number")
    private String batchLotNumber;

    @Column(name = "net_weight_value")
    private BigDecimal netWeightValue;

    @Column(name = "net_weight_uom_code")
    private String netWeightUomCode;

    @Column(name = "tare_weight_value")
    private BigDecimal tareWeightValue;

    @Column(name = "tare_weight_uom_code")
    private String tareWeightUomCode;

    @Column(name = "gross_weight_value")
    private BigDecimal grossWeightValue;

    @Column(name = "gross_weight_uom_code")
    private String grossWeightUomCode;

    @Column(name = "volume_uom_code")
    private String volumeUomCode;

    @Column(name = "volume_value")
    private BigDecimal volumeValue;

    @Column(name = "net_value_currency_code")
    private String netValueCurrencyCode;

    @Column(name = "net_value")
    private BigDecimal netValue;

    @Column(name = "hazmat_code")
    private String hazmatCode;

    @Column(name = "hazmat_class")
    private String hazmatClass;

    @Column(name = "hazmat_packing_group")
    private String hazmatPackingGroup;

    @Column(name = "hazmat_description")
    private String hazmatDescription;

    @Column(name = "flash_point_value")
    private BigDecimal flashPointValue;

    @Column(name = "flash_point_uom_code")
    private String flashPointUomCode;

    @Column(name = "boiling_point_value")
    private BigDecimal boilingPointValue;

    @Column(name = "boiling_point_uom_code")
    private String boilingPointUomCode;

    @Column(name = "hazard_id")
    private String hazardId;

    @Column(name = "tunnel_code")
    private String tunnelCode;

    @Column(name = "wgk_class")
    private String wgkClass;

    @Column(name = "marine_pollutant")
    private String marinePollutant;

    @Column(name = "harmonized_code")
    private String harmonizedCode;

    @Column(name = "country_of_origin")
    private String countryOfOrigin;

    @Column(name = "batch_lot_number_type")
    private String batchLotNumberType;

    @Column(name = "product_class")
    private String productClass;

    @Column(name = "source_record_updated_time")
    private LocalDateTime sourceRecordUpdatedTime;

    @Column(name = "source_record_created_time")
    private LocalDateTime sourceRecordCreatedTime;

    @Column(name = "handling_unit")
    private String handlingUnit;

    @Column(name = "handling_description")
    private String handlingDescription;

    @Column(name = "ship_class")
    private String shipClass;

    @Column(name = "ship_class_code")
    private String shipClassCode;

    @Column(name = "un_number")
    private String unNumber;

    @Column(name = "reference_code")
    private String referenceCode;

    @Column(name = "reference_value")
    private Long referenceValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private OrderHeader orderHeader;

    @Column(name="quantity_uom_code")
    private String quantityUomCode;

    @Column(name = "quantity_value")
    private Long quantityValue;

    @Column(name = "declared_value")
    private Long declaredValue;

    @Column(name = "declared_value_uom_code")
    private String declaredValueUomCode;

    @Column(name="requested_quantity")
    private Long requestedQuantity;

    @Column(name="requested_quantity_uom_code")
    private String requestedQuantityUomCode;

    @Column(name="confirmed_quantity")
    private Long confirmedQuantity;

    @Column(name="confirmed_quantity_uom_code")
    private String confirmedQuantityUomCode;

    @Column(name="source_system")
    private String sourceSystem;

    @Column(name="customer_part_number")
    private String customerPartNumber;

    @Column(name="source_order_line_number")
    private String sourceOrderLineNumber;

    @Column(name = "product_description")
    private String productDescription;

    @Column(name = "handling_count")
    private Long handlingCount;

    @Column(name = "package_description")
    private String packageDescription;

    @Column(name="source_tbl_primary_key")
    private String sourceTblPrimaryKey;

    @Column(name="planned_cost_ap")
    private BigDecimal plannedCostAP;

    @Column(name="planned_cost_ap_currency_code")
    private String plannedCostAPCurrencyCode;

    @Column(name="planned_cost_ar")
    private BigDecimal plannedCostAR;

    @Column(name="planned_cost_ar_currency_code")
    private String plannedCostARCurrencyCode;

    @OneToMany(mappedBy = "orderLine", cascade = CascadeType.ALL)
    private List<UserFieldListOrderLine> userFieldListOrderLineList;

}
```

Order Accessorial Detail

```
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
@Table(name = "order_accessorial_detail")
public class OrderAccessorialDetail extends BaseEntity{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="order_accessorial_detail_id")
    private Long orderAccessorialDetailId;

    @Column(name="accessorial_code")
    private String accessorialCode;

    @Column(name="accessorial_amount_ap")
    private BigDecimal accessorialAmountAP;

    @Column(name="accessorial_amount_ap_uom_code")
    private String accessorialAmountAPUomCode;

    @Column(name="accessorial_amount_ar")
    private BigDecimal accessorialAmountAR;

    @Column(name="accessorial_amount_ar_uom_code")
    private String accessorialAmountARUomCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private OrderHeader orderHeader;

    @Column(name="source_tbl_primary_key")
    private String sourceTblPrimaryKey;

    @Column(name="source_record_created_time")
    private LocalDateTime sourceRecordCreatedTime;

    @Column(name="source_record_updated_time")
    private LocalDateTime sourceRecordUpdatedTime;

    @Column(name="order_accessorial_detail_sequence")
    private Long orderAccessorialDetailSequence;
}
```

OrderCarrierDetail

```
@Entity
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "order_carrier_detail")
public class OrderCarrierDetail extends BaseEntity{
	
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "order_carrier_detail_id")    
	private Long orderCareerDetailId;
	
	@Column(name="scac_code")
	private String scacCode;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id")
	private OrderHeader orderHeader;

	@Column(name="mode")
	private String mode;

	@Column(name="source_tbl_primary_key")
	private String sourceTblPrimaryKey;

	@Column(name="source_record_created_time")
	private LocalDateTime sourceRecordCreatedTime;

	@Column(name="source_record_updated_time")
	private LocalDateTime sourceRecordUpdatedTime;

	@Column(name="carrier_equip_option_id")
	private String carrierEquipOptionId;

	@Column(name="carrier_sequence")
	private Long carrierSequence;

	@Column(name="mode_description")
	private String modeDescription;
}
```

OrderEquipmentDetail

```
@Entity
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "order_equipment_detail")
public class OrderEquipmentDetail extends BaseEntity{
	
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "order_equipment_detail_id")    
	private Long orderEquipmentDetailId;
	
	@Column(name = "equipment_code")    
	private String equipmentCode;

	@Column(name = "equipment_number")    
	private String equipmentNumber;
	
	@Column(name = "source_tbl_primary_key")    
	private String sourceTblPrimaryKey;

	
	@Column(name="source_record_created_time") 
	private LocalDateTime sourceRecordCreatedTime;
	
	@Column(name="source_record_updated_time") 
	private LocalDateTime sourceRecordUpdatedTime;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id")
	private OrderHeader orderHeader;

	@Column(name="equipment_description")
	private String equipmentDescription;
}
```

UserFieldListOrderLine

```
@Builder
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "userfield_list_orderline")
public class UserFieldListOrderLine implements Serializable {

	@Id
	@Column(name = "userfield_list_orderline_id")
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long userfieldListOrderLineId;

	@Column(name = "userfield_type")
	private String userfieldType;
	
	@Column(name = "name")
	private String name;
	
	@Column(name = "value")
	private String value;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_line_id")
	private OrderLine orderLine;

}
```

OrderAudit

```
@Entity
@Table(name = "order_audit")
public class OrderAudit implements Serializable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "order_audit_id")
	private Long orderAuditId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id")
	private OrderHeader orderHeader;

	@Column(name="source_order_number")
	private String sourceOrderNumber;

	@Column(name="old_order_data")
	@ColumnTransformer(write = "?::jsonb")
	private String oldOrderData;

	@Column(name="new_order_data")
	@ColumnTransformer(write = "?::jsonb")
	private String newOrderData;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "action_id")
	private ActionInfo actionInfo;

	@Column(name="audit_datetime")
	private LocalDateTime auditDatetime;

	@Column(name="audit_created_by")
	private String auditCreatedBy;
}
```

OrderExceptionDetail

```
@Entity
@Table(name = "order_exception_detail")
public class OrderExceptionDetail {

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "order_exception_detail_id")    
	private Long orderExceptionId;
	
	@Column(name="order_id")
	private Long orderId;

	@Column(name="source_order_number")
	private String sourceOrderNumber;

	@Column(name="source_application_id")
	private Long sourceApplicationId;

	@Column(name = "exception_message")
	@ColumnTransformer(write = "?::jsonb")
	private String exceptionMessage;

	@Column(name = "created_by")
	private String createdBy;

	@Column(name = "created_time")
	private LocalDateTime createdTime;

	@Column(name = "updated_by")
	private String updatedBy;

	@Column(name = "updated_time")
	private LocalDateTime updatedTime;
}
```

OrderHeader

```
@Builder
@EqualsAndHashCode(callSuper=false)
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "order_info")
public class OrderHeader extends BaseEntity{

	@Id
  	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "order_id")
	private Long orderHeaderId;

	@Column(name="source_order_number")
	private String orderIdentifier;

	@Column(name="order_date")
	private LocalDateTime orderDate;

	@Column(name = "requested_delivery_timestamp")
	private LocalDateTime requestedDeliveryDate;

	@Column(name="requested_delivery_time_zone_code")
	private String requestedDeliveryTimeZoneCode;

	@Column(name = "requested_ship_timestamp")
	private LocalDateTime requestedShipDate;

	@Column(name="requested_ship_time_zone_code")
	private String requestedShipTimeZoneCode;

	@Column(name = "requested_pickup_timestamp")
	private LocalDateTime requestedPickupDate;

	@Column(name="requested_pickup_time_zone_code")
	private String requestedPickupTimeZoneCode;

    //freight terms values are pulled from masterdata
	@Column(name = "freight_term_code")
	private String freightTermCode;

	//Getting data from master table MF_ORGANIZATION
	@Column(name="customer_id")
	private String customerId;
	
	// Contact field in UI
	@Column(name = "contact_name")
	private String contactName;
	
	//Getting data from master table
	@Column(name = "incoterm")
	private String incotermInfo;
	
	//Getting data from master table
	@Column(name = "pickup_number")
	private String pickupNumber;
	

	//Getting data from master table
	@Column(name = "ship_direction_code")
	private String shipDirectionCode;

	@Column(name = "pickup_appointment_timestamp")
	private LocalDateTime pickupAppointment;

	@Column(name="pickup_appointment_time_zone_code")
	private String pickupAppointmentTimeZoneCode;

	@Column(name = "delivery_appointment_timestamp")
	private LocalDateTime deliveryAppointment;

	@Column(name="delivery_appointment_time_zone_code")
	private String deliveryAppointmentTimeZoneCode;

	@Column(name="po_timestamp")
	private LocalDate poDate;

	@Column(name="interface_sort_key")
	private String interfaceSortKey;

	@Column(name="requested_date_type")
	private String requestedDateType;

	@Column(name="requested_time_zone_code")
	private String requestedTimeZoneCode;

	@Column(name="requested_timestamp")
	private LocalDateTime requestedTimestamp;

	@Column(name="ship_time_zone_code")
	private String shipTimeZoneCode;

	@Column(name="ship_timestamp")
	private LocalDateTime shipTimestamp;

	@Column(name="delivery_time_zone_code")
	private String deliveryTimeZoneCode;

	@Column(name="delivery_timestamp")
	private LocalDateTime deliveryTimestamp;

	@Column(name="available_timestamp")
	private LocalDateTime availableTimestamp;

	@Column(name="available_time_zone_code")
	private String availableTimeZoneCode;

	@Column(name="order_release_id")
	private String orderReleaseId;

	@Column(name="order_release_refno")
	private String orderReleaseRefno;

	@Column(name="order_release_sequence")
	private Long orderReleaseSequence;

	@Column(name="interface_transaction_type")
	private String interfaceTransactionType;

	@Column(name="po_number")
	private String poNumber;

	@Column(name="interface_prevalidated")
	private Boolean interfacePrevalidated;

	@Column(name="order_number")
	private String orderNumber;

	@Column(name="origin_partner_id")
	private String originPartnerId;

	@Column(name="origin_full_name")
	private String originFullName;

	@Column(name="origin_address1")
	private String originAddress1;

	@Column(name="origin_address2")
	private String originAddress2;

	@Column(name="origin_address3")
	private String originAddress3;

	@Column(name="origin_city")
	private String originCity;

	@Column(name="origin_region")
	private String originRegion;

	@Column(name="origin_country")
	private String originCountry;

	@Column(name="origin_postal")
	private String originPostal;

	@Column(name="origin_contact_name")
	private String originContactName;

	@Column(name="origin_contact_title")
	private String originContactTitle;

	@Column(name="origin_phone")
	private String originPhone;

	@Column(name="origin_email")
	private String originEmail;

	@Column(name="origin_source_system")
	private String originSourceSystem;

	@Column(name="destination_partner_id")
	private String destinationPartnerId;

	@Column(name="destination_full_name")
	private String destinationFullName;

	@Column(name="destination_address1")
	private String destinationAddress1;

	@Column(name="destination_address2")
	private String destinationAddress2;

	@Column(name="destination_address3")
	private String destinationAddress3;

	@Column(name="destination_city")
	private String destinationCity;

	@Column(name="destination_region")
	private String destinationRegion;

	@Column(name="destination_country")
	private String destinationCountry;

	@Column(name="destination_postal")
	private String destinationPostal;

	@Column(name="destination_contact_name")
	private String destinationContactName;

	@Column(name="destination_contact_title")
	private String destinationContactTitle;

	@Column(name="destination_phone")
	private String destinationPhone;

	@Column(name="destination_email")
	private String destinationEmail;

	@Column(name="destination_source_system")
	private String destinationSourceSystem;

	@Column(name="gross_weight_uom_code")
	private String grossWeightUomCode;

	@Column(name="gross_weight_value")
	private BigDecimal grossWeightValue;

	@Column(name="volume_uom_code")
	private String volumeUomCode;

	@Column(name="volume_value")
	private BigDecimal volumeValue;

	@Column(name="net_value_currency_code")
	private String netValueCurrencyCode;

	@Column(name="net_value")
	private BigDecimal netValue;

	@Column(name="planned_cost_ap")
	private BigDecimal plannedCostAP;

	@Column(name="planned_cost_ap_currency_code")
	private String plannedCostAPCurrencyCode;

	@Column(name="planned_cost_ar")
	private BigDecimal plannedCostAR;

	@Column(name="planned_cost_ar_currency_code")
	private String plannedCostARCurrencyCode;

	@Column(name="net_weight_value")
	private BigDecimal netWeightValue;

	@Column(name="net_weight_uom_code")
	private String netWeightUomCode;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_status_id")
	@JsonIgnoreProperties(value = {"order_status_id", "hibernateLazyInitializer"})
	private OrderStatus orderStatus;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "source_application_id")
	private SourceApplication sourceApplication;

	@OneToMany(mappedBy = "orderHeader", cascade = CascadeType.ALL)
	private List<OrderEquipmentDetail> orderEquipmentDetailList;

	@OneToMany(mappedBy = "orderHeader", cascade = CascadeType.ALL)
	private List<OrderCarrierDetail> orderCarrierDetailList;

	@OneToMany(mappedBy = "orderHeader",cascade = CascadeType.ALL)
	private List<OrderLine> orderLines;

	@OneToMany(mappedBy = "orderHeader",cascade = CascadeType.ALL)
	private List<OrderAccessorialDetail> orderAccessorialDetails;

	@OneToMany(mappedBy = "orderHeader", cascade = CascadeType.ALL)
	private List<OrderAudit> orderAudits;

	@OneToMany(mappedBy = "orderHeader", cascade = CascadeType.ALL)
	private List<OrderInvolvedParty> orderInvolvedPartyList;

	@OneToMany(mappedBy = "orderHeader", cascade = CascadeType.ALL)
	private List<OrderInstruction> orderInstructionList;

	@OneToMany(mappedBy = "orderHeader", cascade = CascadeType.ALL)
	private List<UserFieldList> userFieldList;

	@Column(name="source_record_created_time")
	private LocalDateTime sourceRecordCreatedTime;

	@Column(name="source_record_created_time_zone_code")
	private String sourceRecordCreatedTimeZoneCode;

	@Column(name="source_record_updated_time")
	private LocalDateTime sourceRecordUpdatedTime;

	@Column(name="source_record_updated_time_zone_code")
	private String sourceRecordUpdatedTimeZoneCode;
}
```

OrderInstruction

```
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "order_instruction")
public class OrderInstruction extends BaseEntity{
	
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "order_instruction_id")    
	private Long orderInstructionId;
	
	@Column(name = "instruction_sequence")    
	private Long instructionNumber;
	
	@Column(name = "instruction_detail")    
	private String instructionDetail;
	
	@Column(name = "instruction_type")    
	private String instructionType;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id")
	private OrderHeader orderHeader;

	@Column(name="source_record_updated_time")
	private LocalDateTime sourceRecordUpdatedTime;

	@Column(name="source_record_created_time")
	private LocalDateTime sourceRecordCreatedTime;


}
```

ActionInfo

```
@Entity
@Table(name = "action_info")
public class ActionInfo extends BaseEntity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "action_id")
    private Long actionId;

    @Column(name = "action_code")
    private String actionCode;

    @Column(name = "action_name")
    private String actionName;

}
```

SourceApplication

```
@Entity
@Table(name = "source_application")
public class SourceApplication extends BaseEntity{

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "source_application_id")
    private Long sourceApplicationId;
	
	@Column(name = "source_application_code")
	private String sourceApplicationCode;
	
	@Column(name = "source_application_name")
	private String sourceApplicationName;
}
```

OrderStatus

```
@Entity
@Table(name = "order_status")
@ToString
public class OrderStatus extends BaseEntity{

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_status_id")
    private Long orderStatusId;
	
	@Column(name="order_status_code")
	private String orderStatusCode;
	
	@Column(name="order_status_name")
	private String orderStatusName;

	@Column(name="source_application_id")
	private Long sourceApplicationId;

	@Column(name="source_app_primary_key")
	private String sourceAppPrimaryKey;

	@Column(name="status_type")
	private String statusType;
}
```

UserFieldList

```
@Entity
@Table(name = "userfield_list")
public class UserFieldList extends BaseEntity{
	@Id
	@Column(name = "userfield_type")
	private String userfieldType;
	
	@Column(name = "name")
	private String name;
	
	@Column(name = "value")
	private String value;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id")
	private OrderHeader orderHeader;

}
```

OrderInvolvedParty

```
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "order_involved_party")
public class OrderInvolvedParty extends BaseEntity{
	
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "order_involved_party_id")    
	private Long orderInvolvedPartyId;
	
	@Column(name="party_name")
	private String partyName;
	
	@Column(name="party_type")
	private String partyType;
	
	@Column(name="address1")
	private String address1;
	
	@Column(name="address2")
	private String address2;
	
	@Column(name="address3")
	private String address3;

	@Column(name="city_name")
	private String cityName;
	
	@Column(name="region_name")
	private String regionName;
	
	@Column(name="country_name")
	private String countryName;
	
	@Column(name="postal_code")
	private String postalCode;
	
	@Column(name="vat_number")
	private String vatNumber;
	
	@Column(name="source_system")
	private String sourceSystem;

	@Column(name="party_id")
	private String partyId;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id")
	private OrderHeader orderHeader;

	@Column(name="source_record_created_time")
	private LocalDateTime sourceRecordCreatedTime;

	@Column(name="source_record_updated_time")
	private LocalDateTime sourceRecordUpdatedTime;
}
```

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

‌

## DB Entity Relationship Diagrams 

[Order Integration ER Diagram - Transportation Management Systems - Confluence](https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2640543749)

**DB Details:**

order_management

‌

## Swagger URL

request and response structure of the API that we need to share with Net Native team

[https://dev.order.linx.odysseylogistics.com/order-swagger/v3/api-docs](https://dev.order.linx.odysseylogistics.com/order-swagger/v3/api-docs)  
[https://qa.order.linx.odysseylogistics.com/order-swagger/v3/api-docs](https://dev.order.linx.odysseylogistics.com/order-swagger/v3/api-docs)

‌

## AWS SQS Details

SQS URL: [https://sqs.us-east-1.amazonaws.com/061039777679/order-datapipeline-queue-us-east-1-dev-otms.fifo'](https://sqs.us-east-1.amazonaws.com/061039777679/order-datapipeline-queue-us-east-1-dev-otms.fifo%27) 

Queue Name: order-datapipeline-queue-us-east-1-dev-otms.fifo  
We are sending payload with url encoded format to sqs queue with postman and here is the screenshot

![](blob:https://media.staging.atl-paas.net/?type=file&localId=2f63bc90-8135-4731-bac6-34d76947783a&id=a5d21f7d-3feb-4891-b212-77ad6a5fda4b&&collection=contentId-2630090754&height=807&occurrenceKey=null&width=1486&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
## AWS Lambda Calling Order Service

Lambda function URL: [https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions/test-lambda](https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions/test-lambda)  
Keeping sample function to receive payload from json and to print

```
exports.handler = async (event) => {
    for (const record of event.Records) {
        console.log('Message Body:', record.body);
    }
    
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello World'),
    };
    return response;
};
```

**Auth Key** that is passed internally for authorization.