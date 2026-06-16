---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2
page_id: "3401056276"
title: "Order Service Phase-2"
space: TMS
last_modified: "yesterday at 1:35 PM"
fetched: "2026-06-11"
---

‌

‌

### **Sequence Diagrams**

![](blob:https://media.staging.atl-paas.net/?type=file&localId=0bce2ada7cff&id=5424baf3-192a-420b-86e7-c5e918cbf296&&collection=contentId-3401056276&height=1&occurrenceKey=null&width=1&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
‌

 

 

| **Service-name** | **Description** | **Endpoint** | **Request Method** | **Headers** | **Request Payload (Development)** | **Response** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Order | Translate OrderInterface to OrderIn | /order-service/v3/order-interface/translation | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  | OrderIn Request Structure | <custom data-type="mention" data-id="id-0">@Venkata Kesavarao Seerla</custom>  to update |
| Order | Create Order | /order-service/v3/order | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  {  
  "orderInterface": {  
    "orderIdentifier": "string",  
    "orderType": "string",  
    "deleteFlag": "string",  
    "pickupNumber": "string",  
    "shipDirection": "string",  
    "contactName": "string",  
    "customerId": "string",  
	  
        "charges": \[  
          {  
            "chargeSeq": 0,  
            "chargeCode": "string",  
            "chargeAmount": 0,  
            "chargeCurrencyCode": "string"  
          }  
        \],  
    "parties": \[  
      {  
        "partyType": "string",  
        "name": "string",  
        "address1": "string",  
        "address2": "string",  
        "address3": "string",  
        "city": "string",  
        "region": "string",  
        "country": "string",  
        "postal": "string",  
        "vatNumber": "string"  
      }  
    \],  
    "incotermInfo": "string",  
    "pickupAppointment": "string",  
    "pickupAppointmentTimeZoneCode": "string",  
    "deliveryAppointment": "string",  
    "deliveryAppointmentTimeZoneCode": "string",  
    "equipmentNumber": "string",  
    "creationTimestamp": "2026-04-20T12:03:36.287Z",  
    "creationTimeZoneCode": "string",  
    "modifyTimestamp": "2026-04-20T12:03:36.287Z",  
    "modifyTimeZoneCode": "string",  
    "orderLines": \[  
      {  
        "lineIdentifier": 0,  
        "externalLineIdentifier": "string",  
        "contactName": "string",  
        "creationTimestamp": "2026-04-20T12:03:36.287Z",  
        "creationTimeZoneCode": "string",  
        "thirdPartyReferenceNumber": "string",  
        "thirdPartyReferenceLineNumber": 0,  
        "thirdPartyReferenceDate": "string",  
        "planningDateType": "string",  
        "isLoadConstraints": "string",  
        "freightTermCode": "string",  
        "sites": \[  
          {  
            "siteType": "string",  
            "siteIdentifier": "string",  
            "fullName": "string",  
            "address1": "string",  
            "address2": "string",  
            "address3": "string",  
            "city": "string",  
            "region": "string",  
            "country": "string",  
            "postal": "string"  
          }  
        \],  
        "shipItemIdentifier": "string",  
        "productDescription": "string",  
        "packageCount": 0,  
        "packagingIdentifier": "string",  
        "heightValue": "string",  
        "heightUomCode": "string",  
        "lengthValue": "string",  
        "lengthUomCode": "string",  
        "widthValue": "string",  
        "widthUomCode": "string",  
        "volumeValue": "string",  
        "volumeUomCode": "string",  
        "batchLotNumber": "string",  
        "grossWeightValue": "string",  
        "grossWeightUomCode": "string",  
        "netWeightValue": "string",  
        "netWeightUomCode": "string",  
        "tareWeightValue": "string",  
        "tareWeightUomCode": "string",  
        "quantityValue": "string",  
        "quantityUomCode": "string",  
        "netValue": "string",  
        "netValueCurrencyCode": "string",  
        "declaredValue": "string",  
        "declaredValueCurrencyCode": "string",  
        "hazmatCode": "string",  
        "hazmatClass": "string",  
        "hazmatPackingGroup": "string",  
        "hazmatDescription": "string",  
        "flashPointValue": "string",  
        "flashPointUomCode": "string",  
        "boilingPointValue": "string",  
        "boilingPointUomCode": "string",  
        "hazardId": "string",  
        "harmonizedCode": "string",  
        "tunnelCode": "string",  
        "wgkClass": "string",  
        "marinePollutant": "string",  
        "countryOfOrigin": "string",  
        "productClass": "string",  
        "schedules": \[  
          {  
            "scheduleIdentifier": "string",  
            "requestedDeliveryDate": "2026-04-20T12:03:36.287Z",  
            "requestedDeliveryTimeZoneCode": "string",  
            "earliestDeliveryDate": "2026-04-20",  
            "latestDeliveryDate": "2026-04-20",  
            "requestedShipDate": "2026-04-20T12:03:36.287Z",  
            "requestedShipTimeZoneCode": "string",  
            "earliestShipDate": "2026-04-20",  
            "latestShipDate": "2026-04-20",  
            "packageCount": 0,  
            "netWeightValue": "string",  
            "netWeightUomCode": "string",  
            "grossWeight": "string",  
            "grossWeightUomCode": "string",  
            "tareWeightValue": "string",  
            "tareWeightUomCode": "string",  
            "volumeValue": "string",  
            "volumeUomCode": "string",  
            "requestedQuantity": "string",  
            "requestedQuantityUomCode": "string",  
            "confirmedQuantity": "string",  
            "confirmedQuantityUomCode": "string"  
          }  
        \],  
        "charges": \[  
          {  
            "chargeSeq": 0,  
            "chargeCode": "string",  
            "chargeAmount": 0,  
            "chargeCurrencyCode": "string"  
          }  
        \],  
        "instructionList": \[  
          {  
            "instructionSeq": 0,  
            "instructionType": "string",  
            "instructionValue": "string"  
          }  
        \],  
        "passThroughList": \[  
          {  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "requestedShippingOption": {  
          "scacCode": "string",  
          "equipmentCode": "string"  
        }  
      }  
    \],  
    "passThroughList": \[  
      {  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "instructionList": \[  
      {  
        "instructionSeq": 0,  
        "instructionType": "string",  
        "instructionValue": "string"  
      }  
    \],  
    "messageProperties": \[  
      {  
        "userFieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "sourceApplicationCode": "string",  
    "sourceApplicationName": "string",  
    "sourceSystem": "string",  
    "orderHoldStatus": true  
  }  
}  | { “orderId”: _<order Id>_, “message”: “Order <_order number_> created successfully” } |    |
| Order | Cancel Order | /order-service/v3/order | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  {  
  "orderInterface": {  
    "orderIdentifier": "string",  
    "orderType": "string",  
    "deleteFlag": "string",  
    "pickupNumber": "string",  
    "shipDirection": "string",  
    "contactName": "string",  
    "customerId": "string",  
	  
        "charges": \[  
          {  
            "chargeSeq": 0,  
            "chargeCode": "string",  
            "chargeAmount": 0,  
            "chargeCurrencyCode": "string"  
          }  
        \],  
    "parties": \[  
      {  
        "partyType": "string",  
        "name": "string",  
        "address1": "string",  
        "address2": "string",  
        "address3": "string",  
        "city": "string",  
        "region": "string",  
        "country": "string",  
        "postal": "string",  
        "vatNumber": "string"  
      }  
    \],  
    "incotermInfo": "string",  
    "pickupAppointment": "string",  
    "pickupAppointmentTimeZoneCode": "string",  
    "deliveryAppointment": "string",  
    "deliveryAppointmentTimeZoneCode": "string",  
    "equipmentNumber": "string",  
    "creationTimestamp": "2026-04-20T12:03:36.287Z",  
    "creationTimeZoneCode": "string",  
    "modifyTimestamp": "2026-04-20T12:03:36.287Z",  
    "modifyTimeZoneCode": "string",  
    "orderLines": \[  
      {  
        "lineIdentifier": 0,  
        "externalLineIdentifier": "string",  
        "contactName": "string",  
        "creationTimestamp": "2026-04-20T12:03:36.287Z",  
        "creationTimeZoneCode": "string",  
        "thirdPartyReferenceNumber": "string",  
        "thirdPartyReferenceLineNumber": 0,  
        "thirdPartyReferenceDate": "string",  
        "planningDateType": "string",  
        "isLoadConstraints": "string",  
        "freightTermCode": "string",  
        "sites": \[  
          {  
            "siteType": "string",  
            "siteIdentifier": "string",  
            "fullName": "string",  
            "address1": "string",  
            "address2": "string",  
            "address3": "string",  
            "city": "string",  
            "region": "string",  
            "country": "string",  
            "postal": "string"  
          }  
        \],  
        "shipItemIdentifier": "string",  
        "productDescription": "string",  
        "packageCount": 0,  
        "packagingIdentifier": "string",  
        "heightValue": "string",  
        "heightUomCode": "string",  
        "lengthValue": "string",  
        "lengthUomCode": "string",  
        "widthValue": "string",  
        "widthUomCode": "string",  
        "volumeValue": "string",  
        "volumeUomCode": "string",  
        "batchLotNumber": "string",  
        "grossWeightValue": "string",  
        "grossWeightUomCode": "string",  
        "netWeightValue": "string",  
        "netWeightUomCode": "string",  
        "tareWeightValue": "string",  
        "tareWeightUomCode": "string",  
        "quantityValue": "string",  
        "quantityUomCode": "string",  
        "netValue": "string",  
        "netValueCurrencyCode": "string",  
        "declaredValue": "string",  
        "declaredValueCurrencyCode": "string",  
        "hazmatCode": "string",  
        "hazmatClass": "string",  
        "hazmatPackingGroup": "string",  
        "hazmatDescription": "string",  
        "flashPointValue": "string",  
        "flashPointUomCode": "string",  
        "boilingPointValue": "string",  
        "boilingPointUomCode": "string",  
        "hazardId": "string",  
        "harmonizedCode": "string",  
        "tunnelCode": "string",  
        "wgkClass": "string",  
        "marinePollutant": "string",  
        "countryOfOrigin": "string",  
        "productClass": "string",  
        "schedules": \[  
          {  
            "scheduleIdentifier": "string",  
            "requestedDeliveryDate": "2026-04-20T12:03:36.287Z",  
            "requestedDeliveryTimeZoneCode": "string",  
            "earliestDeliveryDate": "2026-04-20",  
            "latestDeliveryDate": "2026-04-20",  
            "requestedShipDate": "2026-04-20T12:03:36.287Z",  
            "requestedShipTimeZoneCode": "string",  
            "earliestShipDate": "2026-04-20",  
            "latestShipDate": "2026-04-20",  
            "packageCount": 0,  
            "netWeightValue": "string",  
            "netWeightUomCode": "string",  
            "grossWeight": "string",  
            "grossWeightUomCode": "string",  
            "tareWeightValue": "string",  
            "tareWeightUomCode": "string",  
            "volumeValue": "string",  
            "volumeUomCode": "string",  
            "requestedQuantity": "string",  
            "requestedQuantityUomCode": "string",  
            "confirmedQuantity": "string",  
            "confirmedQuantityUomCode": "string"  
          }  
        \],  
        "charges": \[  
          {  
            "chargeSeq": 0,  
            "chargeCode": "string",  
            "chargeAmount": 0,  
            "chargeCurrencyCode": "string"  
          }  
        \],  
        "instructionList": \[  
          {  
            "instructionSeq": 0,  
            "instructionType": "string",  
            "instructionValue": "string"  
          }  
        \],  
        "passThroughList": \[  
          {  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "requestedShippingOption": {  
          "scacCode": "string",  
          "equipmentCode": "string"  
        }  
      }  
    \],  
    "passThroughList": \[  
      {  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "instructionList": \[  
      {  
        "instructionSeq": 0,  
        "instructionType": "string",  
        "instructionValue": "string"  
      }  
    \],  
    "messageProperties": \[  
      {  
        "userFieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "sourceApplicationCode": "string",  
    "sourceApplicationName": "string",  
    "sourceSystem": "string",  
    "orderHoldStatus": true  
  }  
} |  { “orderId”: _<order Id>_, “message” : “Order <_order number_> cancelled successfully” } | The ‘Cancelled’ order can’t be allowed for further changes.  |
| Order | Hold Order | /order-service/v3/order | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  {  
  "orderInterface": {  
    "orderIdentifier": "string",  
    "orderType": "string",  
    "deleteFlag": "string",  
    "pickupNumber": "string",  
    "shipDirection": "string",  
    "contactName": "string",  
    "customerId": "string",  
	  
        "charges": \[  
          {  
            "chargeSeq": 0,  
            "chargeCode": "string",  
            "chargeAmount": 0,  
            "chargeCurrencyCode": "string"  
          }  
        \],  
    "parties": \[  
      {  
        "partyType": "string",  
        "name": "string",  
        "address1": "string",  
        "address2": "string",  
        "address3": "string",  
        "city": "string",  
        "region": "string",  
        "country": "string",  
        "postal": "string",  
        "vatNumber": "string"  
      }  
    \],  
    "incotermInfo": "string",  
    "pickupAppointment": "string",  
    "pickupAppointmentTimeZoneCode": "string",  
    "deliveryAppointment": "string",  
    "deliveryAppointmentTimeZoneCode": "string",  
    "equipmentNumber": "string",  
    "creationTimestamp": "2026-04-20T12:03:36.287Z",  
    "creationTimeZoneCode": "string",  
    "modifyTimestamp": "2026-04-20T12:03:36.287Z",  
    "modifyTimeZoneCode": "string",  
    "orderLines": \[  
      {  
        "lineIdentifier": 0,  
        "externalLineIdentifier": "string",  
        "contactName": "string",  
        "creationTimestamp": "2026-04-20T12:03:36.287Z",  
        "creationTimeZoneCode": "string",  
        "thirdPartyReferenceNumber": "string",  
        "thirdPartyReferenceLineNumber": 0,  
        "thirdPartyReferenceDate": "string",  
        "planningDateType": "string",  
        "isLoadConstraints": "string",  
        "freightTermCode": "string",  
        "sites": \[  
          {  
            "siteType": "string",  
            "siteIdentifier": "string",  
            "fullName": "string",  
            "address1": "string",  
            "address2": "string",  
            "address3": "string",  
            "city": "string",  
            "region": "string",  
            "country": "string",  
            "postal": "string"  
          }  
        \],  
        "shipItemIdentifier": "string",  
        "productDescription": "string",  
        "packageCount": 0,  
        "packagingIdentifier": "string",  
        "heightValue": "string",  
        "heightUomCode": "string",  
        "lengthValue": "string",  
        "lengthUomCode": "string",  
        "widthValue": "string",  
        "widthUomCode": "string",  
        "volumeValue": "string",  
        "volumeUomCode": "string",  
        "batchLotNumber": "string",  
        "grossWeightValue": "string",  
        "grossWeightUomCode": "string",  
        "netWeightValue": "string",  
        "netWeightUomCode": "string",  
        "tareWeightValue": "string",  
        "tareWeightUomCode": "string",  
        "quantityValue": "string",  
        "quantityUomCode": "string",  
        "netValue": "string",  
        "netValueCurrencyCode": "string",  
        "declaredValue": "string",  
        "declaredValueCurrencyCode": "string",  
        "hazmatCode": "string",  
        "hazmatClass": "string",  
        "hazmatPackingGroup": "string",  
        "hazmatDescription": "string",  
        "flashPointValue": "string",  
        "flashPointUomCode": "string",  
        "boilingPointValue": "string",  
        "boilingPointUomCode": "string",  
        "hazardId": "string",  
        "harmonizedCode": "string",  
        "tunnelCode": "string",  
        "wgkClass": "string",  
        "marinePollutant": "string",  
        "countryOfOrigin": "string",  
        "productClass": "string",  
        "schedules": \[  
          {  
            "scheduleIdentifier": "string",  
            "requestedDeliveryDate": "2026-04-20T12:03:36.287Z",  
            "requestedDeliveryTimeZoneCode": "string",  
            "earliestDeliveryDate": "2026-04-20",  
            "latestDeliveryDate": "2026-04-20",  
            "requestedShipDate": "2026-04-20T12:03:36.287Z",  
            "requestedShipTimeZoneCode": "string",  
            "earliestShipDate": "2026-04-20",  
            "latestShipDate": "2026-04-20",  
            "packageCount": 0,  
            "netWeightValue": "string",  
            "netWeightUomCode": "string",  
            "grossWeight": "string",  
            "grossWeightUomCode": "string",  
            "tareWeightValue": "string",  
            "tareWeightUomCode": "string",  
            "volumeValue": "string",  
            "volumeUomCode": "string",  
            "requestedQuantity": "string",  
            "requestedQuantityUomCode": "string",  
            "confirmedQuantity": "string",  
            "confirmedQuantityUomCode": "string"  
          }  
        \],  
        "charges": \[  
          {  
            "chargeSeq": 0,  
            "chargeCode": "string",  
            "chargeAmount": 0,  
            "chargeCurrencyCode": "string"  
          }  
        \],  
        "instructionList": \[  
          {  
            "instructionSeq": 0,  
            "instructionType": "string",  
            "instructionValue": "string"  
          }  
        \],  
        "passThroughList": \[  
          {  
            "name": "string",  
            "value": "string"  
          }  
        \],  
        "requestedShippingOption": {  
          "scacCode": "string",  
          "equipmentCode": "string"  
        }  
      }  
    \],  
    "passThroughList": \[  
      {  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "instructionList": \[  
      {  
        "instructionSeq": 0,  
        "instructionType": "string",  
        "instructionValue": "string"  
      }  
    \],  
    "messageProperties": \[  
      {  
        "userFieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \],  
    "sourceApplicationCode": "string",  
    "sourceApplicationName": "string",  
    "sourceSystem": "string",  
    "orderHoldStatus": true  
  }  
} |  { “orderId”: _<order Id>_, “message” : “Order <_order number_> updated to Hold successfully” } |   ‘Planned Load’ status can be moved to ‘Hold’  ‘Planned Shipment’ status can be moved to ‘Hold’ Once the order is released from hold, the workflow continues from the last valid status |
| Order | API to update the status of Orders by using Order Number and Customer Id | /order-service/v3/order-status | PATCH | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  {  
"statusCode": "String",  
"orders": \[  
  "order":{  
    "orderId": Long,  
    "pgiFlag": true,  
    "loadId": 0,  
    "buyShipmentId": 0,  
    "sellShipmentId": 0,  
    "buyShipmentLoadCount": 0,  
    "isMultiLoadBuyShipment": "string",  
    "sellShipmentOrderCount": 0,  
    "isMultiOrderSellShipment": "string",  
    "groupkey" :{  
      "orderNumber": "String",  
      "customerId": "String"      
      }  
    }     
 \]  
} |  Sample-1:  
{  
  "success" : true,  
  "errorMessage":null,  
  "orders": \[Long, Long\]  
}


Sample-2:  
{  
  "success" : false,  
  "errorMessage": "Orders not updated",  
  "orders": \[Long, Long\]  
} |  |
| Order | API to fetch the Audit report for selected Order | /order-service/v3/audit-report | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | {  
"pageNumber":<value>,  
"pageSize":<value>,  
"orderId" : "<Long>"    
} | {  
	"pageNumber": <value>,  
	"pageSize": <value>,  
	"totalCount": <value>,  
	"data": \[  
			{  
				"orderId": <Long>,  
				"changeMadeBy": <String>,  
				"changeSource": <String>,  
				"auditDateTime": <MM/DD/YYYY HH:MM>,  
				"orderChangeType": <String>,  
				"orderChangeCategory": <String>,  
				"fieldName": <String>,  
				"oldValue": <String>,  
				"newValue": <String>  
			}  
		\]  
} |  |
| Order | Order Number validation | /order-service/v3/order/validation | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  {  
  "orderNumber": "ORD-2024/CUST#001 A",  
  "owningOrganizationId": "ORG-78234"  
} | 200  
Validation passed — Order Number is unique for the given Owning Organization.  
{  
  "success": true,  
  "message": "Order Number is valid and available for the selected Owning Organization."  
}

409  
Duplicate Order Number detected for the same Owning Organization.  
{  
  "success": false,  
  "errorCode": "DUPLICATE_ORDER_NUMBER",  
  "message": "The Order Number for the selected Owning Organization already exists. Please enter another value."  
}

500  
Internal server error.  
{  
  "success": false,  
  "errorCode": "INTERNAL_SERVER_ERROR",  
  "message": "An unexpected error occurred. Please try again."  
}
 |  |
| Order | Create Manual Order | order-service/v3/manual-order | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |  {  
  "manualOrder": {  
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
} |  {  
  “orderId”: <order Id>,  
  "success": true/false,  
  “message”: “Your Order created successfully”,  
  "data": {  
    //Order payload  
  }  
} | For newly created Order the status is "orderStatusCode": "RD_4_PLNNG",         
"orderStatusName": "Ready for Planning"         
For Draft Order the status is  "orderStatusCode": "DRAFT",          
"orderStatusName": "Draft",  |
| order | Orders List | /order-service/v3/order/list | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | {  
  "pagination": {  
    "pageNumber": 1,  
    "pageSize": 20  
  },  
  "filters": {  
    "customers": \[  
      "string"  
    \],  
    "orderStatuses": \[  
      "string"  
    \],  
    "orderNumbers": \[  
      "string"  
    \],  
    "originCities": \[  
      "string"  
    \],  
    "originStates": \[  
      "string"  
    \],  
    "originCountries": \[  
      "string"  
    \],  
    "destinationCities": \[  
      "string"  
    \],  
    "destinationStates": \[  
      "string"  
    \],  
    "destinationCountries": \[  
      "string"  
    \],  
    "earliestPickupDateFrom": "2026-06-10T10:17:05.337Z",  
    "earliestPickupDateTo": "2026-06-10T10:17:05.337Z",  
    "latestPickupDateFrom": "2026-06-10T10:17:05.337Z",  
    "latestPickupDateTo": "2026-06-10T10:17:05.337Z",  
    "earliestDeliveryDateFrom": "2026-06-10T10:17:05.337Z",  
    "earliestDeliveryDateTo": "2026-06-10T10:17:05.337Z",  
    "latestDeliveryDateFrom": "2026-06-10T10:17:05.337Z",  
    "latestDeliveryDateTo": "2026-06-10T10:17:05.337Z"  
  },  
  "sort": {  
    "field": "orderNumber",  
    "direction": "asc"  
  }  
}
 | {  
  "success": true,  
  "orders": \[  
    {  
      "orderNumber": "SUT355123",  
      "orderSource": "INTEGRATED",  
      "customer": "SABIC_CLT",  
      "shipDirection": "Inbound",  
      "freightTerms": "Pre-Paid",  
      "equipment": "TL",  
      "consignor": {  
        "locationId": "RGC-STL-001",  
        "city": "St Louis",   
        "state": "MO",   
        "country": "US",  
        "earliestPickupDateTime": "2025-03-12T08:00:00Z",  
        "latestPickupDateTime": "2025-03-12T08:00:00Z"  
      },  
      "consignee": {  
        "locationId": "MAD-WI-042",  
        "city": "Madison",   
        "state": "WI",   
        "country": "US",  
        "earliestDeliveryDateTime": "2025-03-12T08:00:00Z",  
        "latestDeliveryDateTime": "2025-03-12T08:00:00Z"  
      },  
      "grossWeight": { "value": 4300, "uom": "lbs" },  
      "volume":      { "value": 730,  "uom": "cbf" },  
      "commodity": "Plastic",  
      "orderStatus": "Ready For Plan"  
    }  
  \],  
  "pagination": {  
    "pageNumber": 1,  
    "pageSize": 20,  
    "totalCount": 29  
    },  
  "error": null  
} |  |
| order | View Order | /order-service/v3/order/view | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | {  
  "orderNumber": "string",  
  "customerId": "string"  
} |  {  
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
} |  |
| order | Cancel Order | /order-service/v3/order/cancel | PATCH | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | {  
  "orderNumber": "string",  
  "customerId": "string"  
} | {

“orderId”: <order Id>,

“message” : “Order <order number> cancelled successfully”

} |  |
| order | Cancel Order | /order-service/v3/order/restore | PATCH | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | {  
  "orderNumber": "string",  
  "customerId": "string"  
} | {

“orderId”: <order Id>,

“message” : “Order <order number> restored successfully”

} | **Restore Failed Due to Internal/System Issue:**  
**status Code:** 500 Internal Server Error  
**error message:** Unable to restore the order at this time. Please try again later.  
**log:** ERROR: Failed to restore order {OrderId} from 'Cancelled' due to internal error. Exception={ExceptionDetails}   **Previous Status Not Available (Invalid State):**  
**status Code**: 409 Conflict  
**error message**: Unable to restore the order as previous status is not available.  
**log:** WARN: Restore failed for order {OrderId}. Previous status not found. Order may have been created directly in 'Cancelled' state. |
| order | Order Status lookup | /order-service/v3/order-status/lookup | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | {  
   "lookup":"",  
    "pageNumber": 0,  
	"pageSize": 30    
} |  {  
    "pageNumber": 0,  
    "pageSize": 30,  
    "totalCount": 6,  
    "data": {  
        "CAN": "Cancelled",  
        "PLN_LD": "Planned Load",  
        "PLNED_SHIP": "Planned Shipment",  
        "PLNNG_FAIL": "Planning Failed",  
        "RD_4_PLNNG": "Ready for Planning",  
        "SHIP_FAIL": "Shipment Failed"  
    }  
} |  |
| order | Order Number lookup | /order-service/v3/order-number/lookup | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | {  
   "lookup":"",  
    "pageNumber": 0,  
	"pageSize": 30    
} |  {  
    "pageNumber": 0,  
    "pageSize": 2,  
    "totalCount": 100,  
    "data": \[  
        "ORD086305811": "086305869111",  
        "ORD630586916": "08630586916"  
    \]  
} |  |
| order | Export to CSV | /order-service/v3/order/export/csv | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> | {  
  "filters": {  
    "customers": \[  
      "string"  
    \],  
    "orderStatuses": \[  
      "string"  
    \],  
    "orderNumbers": \[  
      "string"  
    \],  
    "originCities": \[  
      "string"  
    \],  
    "originStates": \[  
      "string"  
    \],  
    "originCountries": \[  
      "string"  
    \],  
    "destinationCities": \[  
      "string"  
    \],  
    "destinationStates": \[  
      "string"  
    \],  
    "destinationCountries": \[  
      "string"  
    \],  
    "earliestPickupDateFrom": "2026-06-10T10:17:05.337Z",  
    "earliestPickupDateTo": "2026-06-10T10:17:05.337Z",  
    "latestPickupDateFrom": "2026-06-10T10:17:05.337Z",  
    "latestPickupDateTo": "2026-06-10T10:17:05.337Z",  
    "earliestDeliveryDateFrom": "2026-06-10T10:17:05.337Z",  
    "earliestDeliveryDateTo": "2026-06-10T10:17:05.337Z",  
    "latestDeliveryDateFrom": "2026-06-10T10:17:05.337Z",  
    "latestDeliveryDateTo": "2026-06-10T10:17:05.337Z"  
  },  
  "sort": {  
    "field": "orderNumber",  
    "direction": "asc"  
  }  
}
 | "200":   
{  
  "success": true,  
  "errorCode": null,  
  "message": "CSV file generated and downloaded successfully"  
}

"202":   
{  
  "success": true,  
  "errorCode": null,  
  "message": "CSV export request accepted and is being processed"  
}

"204":   
{  
  "success": true,  
  "errorCode": null,  
  "message": "No data available to export"  
}

"400": {  
  "success": false,  
  "errorCode": "BAD_REQUEST",  
  "message": "Invalid or malformed query parameters provided"  
}

"500": {  
  "httpStatusCode": 500,  
  "success": false,  
  "errorCode": "INTERNAL_SERVER_ERROR",  
  "message": "An unexpected error occurred while generating the CSV"  
},

"503": {  
  "httpStatusCode": 503,  
  "success": false,  
  "errorCode": "SERVICE_UNAVAILABLE",  
  "message": "The export service is temporarily unavailable. Please try again later"  
},

"504": {  
  "httpStatusCode": 504,  
  "success": false,  
  "errorCode": "GATEWAY_TIMEOUT",  
  "message": "The export request timed out. Try narrowing your filters or date range"  
} |  |

‌