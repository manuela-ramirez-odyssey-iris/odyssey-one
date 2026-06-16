---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2361917446/Order+Domain+Design-LLD
page_id: "2361917446"
title: "Order Domain Design-LLD"
last_modified: "Feb 23, 2026"
fetched: "2026-06-11"
space: TMS
---

|   **Service-name** | **Description** | **Endpoint** | **Request Method** | **Request Payload** | **Response** | **Remarks** |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Order | Create Order | /order-service/v1/order | POST | {  
  "orderIdentifier": "string",  
  "deleteFlag": "string",  
  "planningDate": {  
    "planningDateType": "string",  
    "requestedDeliveryDate": "string",  
    "requestedDeliveryTimeZoneCode": "string",  
    "requestedShipDate": "string",  
    "requestedShipTimeZoneCode": "string"  
  },  
  "shipTo": {  
    "address1": "string",  
    "address2": "string",  
    "address3": "string",  
    "city": "string",  
    "region": "string",  
    "postalCode": "string",  
    "country": "string",  
    "partyType": "string",  
    "orgName": "string",  
    "partyName": "string",  
    "partyId": "string",  
    "vatNumber": "string"  
  },  
  "shipper": {  
    "address1": "string",  
    "address2": "string",  
    "address3": "string",  
    "city": "string",  
    "region": "string",  
    "postalCode": "string",  
    "country": "string",  
    "partyType": "string",  
    "orgName": "string",  
    "partyName": "string",  
    "partyId": "string",  
    "vatNumber": "string"  
  },  
  "billTo": {  
    "address1": "string",  
    "address2": "string",  
    "address3": "string",  
    "city": "string",  
    "region": "string",  
    "postalCode": "string",  
    "country": "string",  
    "partyType": "string",  
    "orgName": "string",  
    "partyName": "string",  
    "partyId": "string",  
    "vatNumber": "string"  
  },  
  "seller": {  
    "address1": "string",  
    "address2": "string",  
    "address3": "string",  
    "city": "string",  
    "region": "string",  
    "postalCode": "string",  
    "country": "string",  
    "partyType": "string",  
    "orgName": "string",  
    "partyName": "string",  
    "partyId": "string",  
    "vatNumber": "string"  
  },  
  "buyer": {  
    "address1": "string",  
    "address2": "string",  
    "address3": "string",  
    "city": "string",  
    "region": "string",  
    "postalCode": "string",  
    "country": "string",  
    "partyType": "string",  
    "orgName": "string",  
    "partyName": "string",  
    "partyId": "string",  
    "vatNumber": "string"  
  },  
  "actionInfo": {  
    "isActive": true,  
    "createdBy": "string",  
    "createdTime": "2026-02-19T11:19:24.650Z",  
    "updatedBy": "string",  
    "updatedTime": "2026-02-19T11:19:24.650Z",  
    "actionId": 0,  
    "actionCode": "string",  
    "actionName": "string"  
  },  
  "freightTerms": "string",  
  "customerId": "string",  
  "contactName": "string",  
  "incotermInfo": "string",  
  "pickupNumber": "string",  
  "shipDirectionType": "string",  
  "sourceRecordCreatedTime": "2026-02-19T11:19:24.650Z",  
  "sourceApplicationCode": "string",  
  "pickupAppointment": "string",  
  "pickupAppointmentTimeZoneCode": "string",  
  "deliveryAppointment": "string",  
  "deliveryAppointmentTimeZoneCode": "string",  
  "equipmentNumber": "string",  
  "involvedParty": \[  
    {  
      "orderInvolvedPartyId": 0,  
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
      "partyRole": "string"  
    }  
  \],  
  "orderLines": \[  
    {  
      "orderLineId": 0,  
      "lineIdentifier": 0,  
      "shipItemIdentifier": "string",  
      "packagingIdentifier": 0,  
      "isLoadConstraints": "string",  
      "externalLineIdentifier": 0,  
      "thirdPartyReferenceNumber": "string",  
      "thirdPartyReferenceLineNumber": 0,  
      "thirdPartyReferenceDate": "string",  
      "packageCount": 0,  
      "heightValue": "string",  
      "lengthValue": "string",  
      "widthValue": "string",  
      "heightUomCode": "string",  
      "lengthUomCode": "string",  
      "widthUomCode": "string",  
      "batchLotNumber": "string",  
      "netWeightValue": "string",  
      "tareWeightValue": "string",  
      "volumeValue": "string",  
      "volumeUomCode": "string",  
      "hazmatCode": "string",  
      "hazmatClass": "string",  
      "hazmatPackingGroup": "string",  
      "hazmatDescription": "string",  
      "flashPointValue": "string",  
      "flashPointUomCode": "string",  
      "boilingPointValue": "string",  
      "boilingPointUomCode": "string",  
      "hazardId": "string",  
      "tunnelCode": "string",  
      "wgkClass": "string",  
      "marinePollutant": "string",  
      "netValue": "string",  
      "harmonizedCode": "string",  
      "countryOfOrigin": "string",  
      "batchLotNumberType": "string",  
      "productClass": "string",  
      "shipClass": "string",  
      "shipClassCode": "string",  
      "handlingUnit": "string",  
      "netValueCurrencyCode": "string",  
      "referenceCode": "string",  
      "referenceValue": 0,  
      "grossWeight": "string",  
      "grossWeightMeasurement": "string",  
      "netWeightMeasurement": "string",  
      "tareWeightMeasurement": "string"  
    }  
  \],  
  "orderCarrierEquipDetail": \[  
    {  
      "scacCode": "string",  
      "equipmentCode": "string"  
    }  
  \],  
  "orderInstruction": \[  
    {  
      "orderInstructionId": 0,  
      "instructionType": "string",  
      "instruction": "string",  
      "instructionNumber": 0  
    }  
  \],  
  "modifyTimestamp": "string"  
} | { “message” : “Order <order Id> created successfully” } | For create deleteFlag will be “N“  Validation error and warning response  {“error”:\[{ “fieldName”:””, “desc“: }, { “fieldName”:””, “desc“: }\]…. “warning”: \[{ “fieldName”:””, “desc“: }.. \] }   |  |
| Order | Edit Order/Cancel Order | /order-service/v1/order | PATCH |  {  
  "id": 0,  
  "orderIdentifier": "string",  
  "deleteFlag": "string",  
  "planningDate": {  
    "planningDateType": "string",  
    "requestedDeliveryDate": "string",  
    "requestedDeliveryTimeZoneCode": "string",  
    "requestedShipDate": "string",  
    "requestedShipTimeZoneCode": "string"  
  },  
  "shipTo": {  
    "address1": "string",  
    "address2": "string",  
    "address3": "string",  
    "city": "string",  
    "region": "string",  
    "postalCode": "string",  
    "country": "string",  
    "partyType": "string",  
    "orgName": "string",  
    "partyName": "string",  
    "partyId": "string",  
    "vatNumber": "string"  
  },  
  "shipper": {  
    "address1": "string",  
    "address2": "string",  
    "address3": "string",  
    "city": "string",  
    "region": "string",  
    "postalCode": "string",  
    "country": "string",  
    "partyType": "string",  
    "orgName": "string",  
    "partyName": "string",  
    "partyId": "string",  
    "vatNumber": "string"  
  },  
  "billTo": {  
    "address1": "string",  
    "address2": "string",  
    "address3": "string",  
    "city": "string",  
    "region": "string",  
    "postalCode": "string",  
    "country": "string",  
    "partyType": "string",  
    "orgName": "string",  
    "partyName": "string",  
    "partyId": "string",  
    "vatNumber": "string"  
  },  
  "seller": {  
    "address1": "string",  
    "address2": "string",  
    "address3": "string",  
    "city": "string",  
    "region": "string",  
    "postalCode": "string",  
    "country": "string",  
    "partyType": "string",  
    "orgName": "string",  
    "partyName": "string",  
    "partyId": "string",  
    "vatNumber": "string"  
  },  
  "buyer": {  
    "address1": "string",  
    "address2": "string",  
    "address3": "string",  
    "city": "string",  
    "region": "string",  
    "postalCode": "string",  
    "country": "string",  
    "partyType": "string",  
    "orgName": "string",  
    "partyName": "string",  
    "partyId": "string",  
    "vatNumber": "string"  
  },  
  "actionInfo": {  
    "isActive": true,  
    "createdBy": "string",  
    "createdTime": "2026-02-19T11:19:24.650Z",  
    "updatedBy": "string",  
    "updatedTime": "2026-02-19T11:19:24.650Z",  
    "actionId": 0,  
    "actionCode": "string",  
    "actionName": "string"  
  },  
  "freightTerms": "string",  
  "customerId": "string",  
  "contactName": "string",  
  "incotermInfo": "string",  
  "pickupNumber": "string",  
  "shipDirectionType": "string",  
  "sourceRecordCreatedTime": "2026-02-19T11:19:24.650Z",  
  "sourceApplicationCode": "string",  
  "pickupAppointment": "string",  
  "pickupAppointmentTimeZoneCode": "string",  
  "deliveryAppointment": "string",  
  "deliveryAppointmentTimeZoneCode": "string",  
  "equipmentNumber": "string",  
  "involvedParty": \[  
    {  
      "orderInvolvedPartyId": 0,  
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
      "partyRole": "string"  
    }  
  \],  
  "orderLines": \[  
    {  
      "orderLineId": 0,  
      "lineIdentifier": 0,  
      "shipItemIdentifier": "string",  
      "packagingIdentifier": 0,  
      "isLoadConstraints": "string",  
      "externalLineIdentifier": 0,  
      "thirdPartyReferenceNumber": "string",  
      "thirdPartyReferenceLineNumber": 0,  
      "thirdPartyReferenceDate": "string",  
      "packageCount": 0,  
      "heightValue": "string",  
      "lengthValue": "string",  
      "widthValue": "string",  
      "heightUomCode": "string",  
      "lengthUomCode": "string",  
      "widthUomCode": "string",  
      "batchLotNumber": "string",  
      "netWeightValue": "string",  
      "tareWeightValue": "string",  
      "volumeValue": "string",  
      "volumeUomCode": "string",  
      "hazmatCode": "string",  
      "hazmatClass": "string",  
      "hazmatPackingGroup": "string",  
      "hazmatDescription": "string",  
      "flashPointValue": "string",  
      "flashPointUomCode": "string",  
      "boilingPointValue": "string",  
      "boilingPointUomCode": "string",  
      "hazardId": "string",  
      "tunnelCode": "string",  
      "wgkClass": "string",  
      "marinePollutant": "string",  
      "netValue": "string",  
      "harmonizedCode": "string",  
      "countryOfOrigin": "string",  
      "batchLotNumberType": "string",  
      "productClass": "string",  
      "shipClass": "string",  
      "shipClassCode": "string",  
      "handlingUnit": "string",  
      "netValueCurrencyCode": "string",  
      "referenceCode": "string",  
      "referenceValue": 0,  
      "grossWeight": "string",  
      "grossWeightMeasurement": "string",  
      "netWeightMeasurement": "string",  
      "tareWeightMeasurement": "string"  
    }  
  \],  
  "orderCarrierEquipDetail": \[  
    {  
      "scacCode": "string",  
      "equipmentCode": "string"  
    }  
  \],  
  "orderInstruction": \[  
    {  
      "orderInstructionId": 0,  
      "instructionType": "string",  
      "instruction": "string",  
      "instructionNumber": 0  
    }  
  \],  
  "modifyTimestamp": "string"  
} | { “message” : “Order <order Id> updated successfully” } | Need more clarity when we can edit an Order   N- Edit  Y - Cancelled  For Edit → orderStatus =”NEW” For cancel -> orderstatus =”Cancelled”   |  |
| Order | Delete Order | /order-service/v1/order/{orderId} | DELETE |  | { “message” : ”Order <order Id> deleted successfully” } | Throw error message if order is already mapped to shipment. Only manually created orders can be deleted. |  |
| Order | Get Order Details | /order-service/v1/order/{orderId}/details | GET |  | “orderHeader”:{ “orderId“: ““, “status“ : ““, ………… } |  |  |
| Order | Get Order Line Details | /order-service/v1/order/{orderId}/line-details | GET |  | { “orderHeader”:{ “orderId“: ““, “status“ : ““, ………… }, “orderLineDetails”:\[ “line1“:{ }, “line2“:{ }, …………….. \] } |  |  |
| Order | List Orders | /order-service/v1/order/listing | POST | { “pageNo” : <int>, “pageSize” : <int>, “filters” : { //search fields will come “orderStatus“ : ““ }, “sortBy” : ““, “orderBy” : ““ } | orders : \[ { “orderId” : ““, ……………… }, { “orderId” : ““, ……………… }, …………….. \] |  |  |
| Order | Call Shipment Service | /order-service/v1/shipment/lookup | POST | { “shipmentReference“ : ““, “appointmentDetails“: ““, “trackingReference“ : ““, “allocation“ : ““ } | \[ { “shipmentReference“: ““, “shipmentStatus“: ““, ………………… }, { “shipmentReference“: ““, “shipmentStatus“: ““, …………………… } \] | TBD.. |  |
| Order | Address Validation-Calling address-service /address-service/v1/validation |  N/A | POST | `{` `"address": {` `"country": "",` `"state": "",` `"city": "",` `"zip": "",` `"force": ""` `}` `}` | `{` `"locationId": "",` `"status": "",` `"message": ""` `}` | No api endpoint in order-service. The schedular or process will call address-service for address validation |  |
| Order |  Call master service to the freight terms to the data  | order-service/v1/freight-terms | GET |  | { `"P": "Pre-Paid"`, ………, ………. } | id = rvLowValue value : RV_Abbreviation<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-682</custom>   do frequency sorting from data in orderservice  |  |
| Order |  Call master service to get equipment  | order-service/v1/equipment/lookup | POST | { “lookup” : ““ } | {  
    "TL":"TL",  
    "FCL": "FCL"  
    "LCL":"LCL",  
    "RR":"RR",  
    "LTL":"LTL"  
} | do frequency sorting from data in orderservice For search scenario also apply frequency sorting after we receive list from master-data  [\[OTMS-1454\] BE-Quick Order Creation - General Fields-Equipment (OTMS-547 ,BE -1082)) - Jira](https://odysseylogistics.atlassian.net/browse/OTMS-1454) <custom data-type="smartlink" data-id="id-1">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom>  |  |
| Order |  Call master service to get Ship-direction  | order-service/v1/ship-direction/lookup | GET |  | {  
 "I": "Inbound", “O“ : “Outbound“  
} |  <custom data-type="smartlink" data-id="id-2">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom> <custom data-type="smartlink" data-id="id-3">https://odysseylogistics.atlassian.net/browse/OTMS-1377</custom>  |  |
| Order | Call master service API _/master-service/v1/org-name/lookup_ to filter ID/Org name, Long Name, Address fields | order-service/v1/org-address/lookup | POST | `{` `"orgIdOrgCode": "<orgIdOrgCode>",` `"longName" : "<long-name>",` `address : {` `"addressLine1" : "<addressLine1>",` `"addressLine2" : "<addressLine2>",` `"addressLine3" : "<addressLine3>",` `"city" : "<city>",` `"region" : "<region>",` `"postalCode" : "<postal-code>",` `"country" : "<country>"` `},` `"pageNumber": 0,` `"pageSize": 25,` `"selectedField": "orgIdOrgCode"` `}`  **Sample Request -1:** `{` `"orgIdOrgCode": "",` `"longName" : "",` `address : {` `"addressLine1" : "",` `"addressLine2" : "",` `"addressLine3" : "",` `"city" : "Los Angeles",` `"region" : "",` `"postalCode" : "",` `"country" : "US"` `},` `"pageNumber": 0,` `"pageSize": 25,` `"selectedField": "orgIdOrgCode"` `}`  **Sample Request -2:** `{` `"orgIdOrgCode": "C",` `"longName" : "",` `address : {` `"addressLine1" : "",` `"addressLine2" : "",` `"addressLine3" : "",` `"city" : "Los Angeles",` `"region" : "",` `"postalCode" : "",` `"country" : "US"` `},` `"pageNumber": 0,` `"pageSize": 25,` `"selectedField": "orgIdOrgCode"` `}` | {  
"`data`" : {  
"org123" :"CTS",  
"org234":"TCS",  
.....  
.....  
},  
"hasNext": true  
}  The response structure is changed after discussion with both BE and UI team.       **Sample Response -1:** `{`  
`"data" : {`  
`"org123" :"CTS",`  
`"org234":"TCS",` `“org32”:”Wipro”`  
`},`  
`"hasNext": false`  
`}`           **Sample Response -2:** `{`  
`"data" : {`  
`"org123" :"CTS",`  
`"org234":"TCS"`  
`},`  
`"hasNext": false`  
`}` | OTMS-559  
  
Example Response: {  
"data" : {  
"61-61": "61-61",  
"61-CU0000010352": "61-CU0000010352",  
"61-HERCULES CHILE LIMITADA_shortnm": "61-HERCULES CHILE LIMITADA_shortnm",  
"64-61": "64-61",  
"63-61": "63-61",  
"62-CU0000010353": "62-CU0000010353",  
"62-61": "62-61",  
"65-CU0000010356": "65-CU0000010356",  
"63-CU0000010352": "63-CU0000010352",  
"64-CU0000010355": "64-CU0000010355"  
},  
"hasNext": true  
} |  |
| Order | Call master service API _/master-service/v1/org-name/lookup_ to filter ID/Org name, Long Name, Address fields | order-service/v1/org-address/lookup | POST | `{` `"orgIdOrgCode": "<orgIdOrgCode>",` `"longName" : "<long-name>",` `address : {` `"addressLine1" : "<addressLine1>",` `"addressLine2" : "<addressLine2>",` `"addressLine3" : "<addressLine3>",` `"city" : "<city>",` `"region" : "<region>",` `"postalCode" : "<postal-code>",` `"country" : "<country>"` `},` `"pageNumber": 0,` `"pageSize": 25,` `"selectedField": "longName"` `}` | {  
"data" : {  
"longName1" :"longName1",  
"longName2":"longName2",  
.....  
.....  
},  
"hasNext": true  
} | Example: {  
"data" : {  
"Ship To 20": "Ship To 20",  
"Ship To 61": "Ship To 61",  
"Buyer Name - Updated": "Buyer Name - Updated",  
"Buyer 32": "Buyer 32",  
"Shipper 30": "Shipper 30",  
"BETZDEARBORN DE ECUADOR SA buyer": "BETZDEARBORN DE ECUADOR SA buyer",  
"Shipper 31": "Shipper 31",  
"Seller To": "Seller To",  
"HERCULES CHILE LIMITADA": "HERCULES CHILE LIMITADA",  
"HERCULES CHILE LTDA billTo": "HERCULES CHILE LTDA billTo",  
"Shipper 33": "Shipper 33",  
"Seller To -Updated": "Seller To -Updated"  
},  
"hasNext": false |  |
| Order | Call master service API _/master-service/v1/org-name/lookup_ to filter ID/Org name, Long Name, Address fields | order-service/v1/org-address/lookup | POST | `{` `"orgIdOrgCode": "<orgIdOrgCode>",` `"longName" : "<long-name>",` `address : {` `"addressLine1" : "<addressLine1>",` `"addressLine2" : "<addressLine2>",` `"addressLine3" : "<addressLine3>",` `"city" : "<city>",` `"region" : "<region>",` `"postalCode" : "<postal-code>",` `"country" : "<country>"` `},` `"pageNumber": 0,` `"pageSize": 25,` `"selectedField": "addressLine1"` `}` | {  
"`data`" : {  
"`addressLine1-1`" :"`addressLine1-1`",  
"`addressLine1-2`":"-2`addressLine1`",  
.....  
.....  
},  
"hasNext": false  
} | Example:  {  
"`data`" : {  
"address 23": "address 23",  
"Address 2 rd street": "Address 2 rd street",  
"ABC": "ABC",  
"Masaurhi": "Masaurhi",  
"1 street": "1 street",  
"string": "string",  
"Masaurhi Town": "Masaurhi Town",  
"428 EUCLID AVE": "428 EUCLID AVE",  
"ship to address 1": "ship to address 1",  
"Address Line 1 UPDATED": "Address Line 1 UPDATED"  
},  
"hasNext": true  
} |  |
| Order | Call master service API _/master-service/v1/org-name/lookup_ to filter ID/Org name, Long Name, Address fields | order-service/v1/org-address/lookup | POST | `{` `"orgIdOrgCode": "<orgIdOrgCode>",` `"longName" : "<long-name>",` `address : {` `"addressLine1" : "<addressLine1>",` `"addressLine2" : "<addressLine2>",` `"addressLine3" : "<addressLine3>",` `"city" : "<city>",` `"region" : "<region>",` `"postalCode" : "<postal-code>",` `"country" : "<country>"` `},` `"pageNumber": 0,` `"pageSize": 25,` `"selectedField": "city"` `}` | {  
"`data`" : {  
"`city1`" :"`city1`",  
"`city2`":"`city2`",  
.....  
.....  
},  
"hasNext": true  
} | Example: {  
"data" : {  
 "ASHLEY FALLS": "ASHLEY FALLS",  
 "NORTH EGREMONT": "NORTH EGREMONT",  
 "LENOX DALE": "LENOX DALE",  
 "PORT ARTHUR": "PORT ARTHUR",  
 "WILBRAHAM": "WILBRAHAM",  
 "Updated - MADURAI": "Updated - MADURAI",  
 "ABCCD": "ABCCD",  
 "BALDWINVILLE": "BALDWINVILLE",  
 "THORNDIKE": "THORNDIKE",  
 "Updated - CHENNAI": "Updated - CHENNAI",  
 "INDIAN ORCHARD": "INDIAN ORCHARD"  
},  
"hasNext": true  
} |  |
| Order | Call master service API _/master-service/v1/timezones_ to get the time zone list  
 | /order-service/v1/location-timezone | POST | { region : ““, city: ““ country : ““ postalCode : ““, `feildType`:”” } Field type for the corresponding fields are Consignor → `requestedShip` Consignee → `requestedDelivery` | { {“JST“: “Asia/Tokyo“, selected : true }, { “PST”: “Pacific Standard Time”, selected : false }, …….., ………. } | OTMS-708 Timezone Drop down |  |
| Order | Call master service API _/master-service/v1/timezones_ to get the time zone list | /order-service/`lookup/`v1/timezones | POST | { `feildType`:”” } Field type for the corresponding fields are  **Early Pickup** **Date & Time** `requestedShip` **Late Pickup** **Date & Time** `pickupAppointment` **Early Delivery** **Date & Time** `requestedDelivery` **Late Delivery** **Date & Time** `deliveryAppointment` | { “JST“ : “Asia/Tokyo“ “PST” : “Pacific Standard Time” } |  |  |
| Order | Call manage special services | /order-service/v1/manage/special-services/lookup | POST | { "lookup" : "lift",  
"pageNumber": 0, "pageSize": 25 } | {  
"pageNumber": 0,  
"pageSize": 25,  
 totalCount: 10, "specialServices":  
{ "LFT" : "Lift Gate", "PJC" : "Pallet Exchange", …….. }  
} | Call order service to get the frequency the Special Services has been used in orders (highest to lowest)  Call /product-service/v1/special-services/lookup Then create final list to create the response. <custom data-type="smartlink" data-id="id-4">https://odysseylogistics.atlassian.net/browse/OTMS-98</custom><custom data-type="smartlink" data-id="id-5">https://odysseylogistics.atlassian.net/browse/OTMS-1460</custom>  |  |
| Order | Call manage special services | `/order-service/v1/`manage/special-services/default-list | GET |  | { “LFT“ “ “Lift Gate“, “PJC“ : “Pallet Exchange“, …….. } | <custom data-type="smartlink" data-id="id-6">https://odysseylogistics.atlassian.net/browse/OTMS-1460</custom>  |  |
| Order | Modes drop down | /order-service/v1/modes | GET |  | \[ “IMD“ : “frequency1“, “AIR“ : “frequency2“, ……. \] |  |  |
| Order | Get Currency Code by search filter | /order-service/v1/declared-value-currency/lookup call master-data service | POST | { “lookup” : “USD“ } | { “currencyCode“ : “currencyDesc“ } | search string is currency code |  |
| Order | Call master data service to get the list of handling units  | `/order-service/v1//handling-units/lookup`  | GET |   | { “BOX“ : “BOXES“, “CN“ : “CAN“, “CONT“ : “CONTAINER“ } | frequency(list of orders available in orderservice ) sorting after we receive list from master-data   <custom data-type="smartlink" data-id="id-7">https://odysseylogistics.atlassian.net/browse/OTMS-1516</custom><custom data-type="smartlink" data-id="id-8">https://odysseylogistics.atlassian.net/browse/OTMS-795</custom>   |  |
| Order | Call master data service to get the list of uom types  | `/order-service/v1/uom-type`/`lookup` | POST | {  
    "lookup" : "uom-type"  
} **example of uom-type :**  LEN  
QTY  
TEMP  
TIME  
VOL  
WGT | {  
    "KG": "KG",  
    "kg": "kg",  
    "MM": "MM",  
    "ST": "ST",  
    "WGT": "WGT",  
    "CWT": "CWT",  
    "MTON": "MTON",  
    "GRM": "GRM",  
    "NT": "NT",  
    "MT": "MT",  
    "G": "G",  
    "LT": "LT",  
    "TNE": "TNE",  
    "OZ": "OZ",  
    "GR": "GR",  
    "KGM": "KGM",  
    "CFT": "CFT",  
    "TON": "TON",  
    "T": "T",  
    "LB": "LB",  
    "TN": "TN",  
    "LBR": "LBR"  
} | frequency(list of orders available in order-service ) sorting after we receive list from master-data <custom data-type="smartlink" data-id="id-9">https://odysseylogistics.atlassian.net/browse/OTMS-1522</custom> [\[OTMS-795\] Quick Order Creation - Product Information Section (Add Product) - Jira](https://odysseylogistics.atlassian.net/browse/OTMS-795)  **Note : We do not need the Pagination for this, as this is a Unit of Measurement which has fixed size which will not change.** |  |
| Order | Call master data service to get the list  |  `/order-service/v1/ship-class/lookup` |  GET | 1.{  
    "lookup":"p"  
}  
2.{  
    "lookup":""  
}
   | 1.  
{  
    "P": "Product Class"  
}  
2.  
{  
    "P": "Product Class",  
    "C": "Commodity",  
    "H": "Harmonized",  
    "N": "NMFC"  
} GET API   {  
    "P": "Product Class",  
    "C": "Commodity",  
    "H": "Harmonized",  
    "N": "NMFC"  
} | For search scenario also apply frequency(list of orders available in orderservice ) sorting after we receive list from master-data   <custom data-type="smartlink" data-id="id-10">https://odysseylogistics.atlassian.net/browse/OTMS-1526</custom>[\[OTMS-795\] Quick Order Creation - Product Information Section (Add Product) - Jira](https://odysseylogistics.atlassian.net/browse/OTMS-795)  |  |
| Order | call master data for the list  | /order-service/v1/ship-class-id/lookup | POST | { “lookup“:”<string>” } | { “ship_class_id“:ship_CLassDesc” } | frequency(list of orders available in orderservice ) sorting after we receive list from master-data   <custom data-type="smartlink" data-id="id-11">https://odysseylogistics.atlassian.net/browse/OTMS-795</custom> [\[OTMS-1527\] BE-Quick Order Creation - Product Information Section (Add Product)- Shipping Class ID (Order Data) (OTMS-795) - Jira](https://odysseylogistics.atlassian.net/browse/OTMS-1527) |  |
| Order | Call master data service to get the Instruction type list | /order-service/v1/instruction-type/lookup | POST | { "lookup": <search string>,  
"pageNumber": , "pageSize" : } | {  
    "pageNumber": 0,  
    "pageSize": 20,  
    "pageCount": 20,  
    "data": {  
        "ADC": "ADDITIONAL CHARGE",  
        "PMD": "REASON FOR PAYMENT",  
        "SPC": "SPECIAL HANDLING",  
        "DK": "SRVS,CAP TRANS,OTHER",  
        "MISC": "MISCELLANEOUS",  
        "0010": "FORM SUPPLEMENT TEXT",  
        "WE": "GOODS IMPORT",  
        "001": "PO HEADER",  
        "002": "PO MEMOS",  
        "AA2": "STD AVAIL CAPACITY",  
        "003": "SO HEADER TEXT",  
        "004": "SO ITEM TEXT",  
        "0013": "TERMS OF PAYMENT",  
        "005": "BILL HEADER TEXT",  
        "ZCVI": "CAR/VEH.INITIALS NO",  
        "006": "BILL ITEM TEXT",  
        "007": "GENERAL INFORMATION",  
        "BOL": "BILL OF LADING INST",  
        "TR": "TRANSIT TRADE",  
        "FD": "FINANCIAL DOCUMENT"  
    }  
} |  |  |
| Order | Call master data to get list of **Declared Value Currency** | /order-service/v1/currency/lookup | POST | { “lookup“:”<string>”, "pageNumber": 0,  
"pageSize": 25, } | `{` `"pageNumber": 0,`  
`"pageSize": 25,`  
`totalCount: 10,` `"data": {` `"CLP":"CLP",`  
`"COP" :"COP",` `"CUP": "CUP,` `"DEM" :"DEM"` `"DOP": "DOP",` `"EGP":"EGP"` `}` `}`  | <custom data-type="smartlink" data-id="id-12">https://odysseylogistics.atlassian.net/browse/OTMS-2253</custom> <custom data-type="smartlink" data-id="id-13">https://odysseylogistics.atlassian.net/browse/OTMS-99</custom>    As part of below story this API should have frequency-based sorting and pagination <custom data-type="smartlink" data-id="id-14">https://odysseylogistics.atlassian.net/browse/OTMS-2257</custom>  |  |
| Order | Call master data to get list of Packing Grous | ~~/order-service/v1/packing-group/lookup~~  /order-service/v1/packing-groups |  | GET |  | \[  
    "III",  
    "II",  
    "I",  
    "111",  
    "N/A"  
\] | To list all package groups frequency with which the Package codes has been used in orders (highest to lowest) |
| Order | Call master data to get list of WGK Codes | /order-service/v1/wgk-code/lookup | GET |  | \[  
    "0",  
    "1",  
    "2",  
    "3"  
\] | To list all WGK groups frequency with which the WGK codes has been used in orders (highest to lowest) |  |
| Order | Call master data to get list of Reference codes | /order-service/v1/reference-codes/lookup | POST | { "lookup" : "<ref-code-desc>" } | { "REQ_SHIP" : "ReqShipDate", "SALES_DST" : "SALES_DISTRICT", ........ } | To list all Reference codes frequency with which the reference codes has been used in orders (highest to lowest) |  |
| Order | Call Master data to get list of Country of origin  | /order-service/v1/country-origin/lookup | POST | { “lookup“:”<string>”, "pageNumber": 0,  
"pageSize": 25, } | `{` `"pageNumber": 0,`  
`"pageSize": 25,`  
`totalCount: 10,` `"data": {` `"IND": "IND",` `"US":"US",`  
`"UK" :"UK",` `}` `}` | To List all country of origin for the product service, sort it by frequency with which has been used (highest to lowest) and perform pagination to improve the performance of the API.  <custom data-type="smartlink" data-id="id-15">https://odysseylogistics.atlassian.net/browse/OTMS-2241</custom>  |  |
| Order | Call owing Organization api | /order-service/v1/owning-org/lookup  | POST | { "lookup" : "",  
"pageNumber": 0, "pageSize": 25 } | {  
    "pageNumber": 0,  
    "pageSize": 5,  
    "totalCount": 11,  
    "data": {  
        "386314": "Hercules Chile Ltda.",  
        "203785": "Hercules Chile, Talcahuano Store",  
        "69": "HERCULES CHILE LTDA",  
        "61": "HERCULES CHILE LIMITADA",  
        "263084": "HERCULES CHILE LTDA."  
    }  
} | Call order service to get the frequency org (highest to lowest) Call /master-data/v1/owing-org/lookup Then create final list to create the response. Example : request payload for search { "lookup" : "`IMCD FINLAND OY`",  
"pageNumber": 0, "pageSize": 25 }.<custom data-type="smartlink" data-id="id-16">https://odysseylogistics.atlassian.net/browse/OTMS-1381</custom> <custom data-type="smartlink" data-id="id-17">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom>  |  |
| Order | Call product  api | /order-service/v1/product/lookup  | POST | { "lookup" : "",  
"pageNumber": 0, "pageSize": 25 } | {  
data:{  
 "000000000000100027": \["KYMENE 525 BULK (FLAGGED - DO NOT USE),"KYMENE 218 BULK-DO NOT USE"\],  
 "000000000000100029": \["KYMENE 525 BULK (FLAGGED - DO NOT USE)"\] …………………  
 }  
pageNumber:1,  
pageSize: 25,  
totalCount : 10  
} | Call order service to get the frequency product code  (highest to lowest) if look up has any value then call /product-service/v1/product/lookup …Else frequency sorted product code list needs to be api respone. <custom data-type="smartlink" data-id="id-18">https://odysseylogistics.atlassian.net/browse/OTMS-795</custom> <custom data-type="smartlink" data-id="id-19">https://odysseylogistics.atlassian.net/browse/OTMS-3063</custom>  |  |
| Order | Country Call ID | [/order-service/v1/country-call-code/lookup](http://localhost:8081/order-service/v1/country-call-code/lookup%27) | GET | No Request needed for country call code  look up API. | {  
    "+91": "India",  
    "+1": "United States and Canada",  
    "+52": "Mexico",  
    "+44": "United Kingdom"  
}  |  |  |
| Order | SCAC Code | /order-service/v1/`scac-code/lookup` | POST | { “lookup“:”<string>”, "pageNumber": 0,  
"pageSize": 25, } | `{` `"pageNumber": 0,`  
`"pageSize": 25,`  
`totalCount: 10,` `"data": {` `"scac1": "scac1",` `"scac2": "scac2",` `"scac3": "scac3",` `}` `}` |  |  |
| Order | Get Order Id by using Order Number | /order-service/v1/order/{orderNumber} | GET |  | **~~Order found~~** ~~{~~ ~~“orderId”: <Long>~~ ~~}~~  **~~Order not found~~** ~~{~~ ~~“orderId”: null/<empty>~~ ~~}~~  
 {  
  "order": {  
    "sourceOrderNumber": "string",  
    "orderNumber": "string",  
    "sourceRecordCreatedTime": "2025-03-17T11:49:52.099Z",  
    "sourceRecordCreatedTimeZoneCode": "string",  
    "sourceRecordUpdatedTime": "2025-03-17T11:49:52.099Z",  
    "sourceRecordUpdatedTimeZoneCode": "string",  
    "requestedDeliveryDate": "2025-03-17T11:49:52.099Z",  
    "requestedDeliveryTimeZoneCode": "string",  
    "requestedShipDate": "2025-03-17T11:49:52.099Z",  
    "requestedShipTimeZoneCode": "string",  
    "requestedPickupDate": "2025-03-17T11:49:52.099Z",  
    "requestedPickupTimeZoneCode": "string",  
    "freightTermCode": "string",  
    "customerId": "string",  
    "contactName": "string",  
    "incotermInfo": "string",  
    "pickupNumber": "string",  
    "shipDirectionCode": "string",  
    "pickupAppointment": "2025-03-17T11:49:52.099Z",  
    "pickupAppointmentTimeZoneCode": "string",  
    "deliveryAppointment": "2025-03-17T11:49:52.099Z",  
    "deliveryAppointmentTimeZoneCode": "string",  
    "poDate": "2025-03-17",  
    "poNumber": "string",  
    "requestedDateType": "string",  
    "requestedTimestamp": "2025-03-17T11:49:52.099Z",  
    "requestedTimeZoneCode": "string",  
    "shipTimestamp": "2025-03-17T11:49:52.099Z",  
    "shipTimeZoneCode": "string",  
    "deliveryTimestamp": "2025-03-17T11:49:52.099Z",  
    "deliveryTimeZoneCode": "string",  
    "availableTimestamp": "2025-03-17T11:49:52.099Z",  
    "availableTimeZoneCode": "string",  
    "orderDate": "2025-03-17T11:49:52.099Z",  
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
    "grossWeightUomCode": "string",  
    "grossWeightValue": 0,  
    "volumeUomCode": "string",  
    "volumeValue": 0,  
    "netValueCurrencyCode": "string",  
    "netValue": 0,  
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
        "sourceTblPrimaryKey": "string",  
        "partyId": "string",  
        "sourceRecordCreatedTime": "2025-03-17T11:49:52.099Z",  
        "sourceRecordUpdatedTime": "2025-03-17T11:49:52.099Z"  
      }  
    \],  
    "orderInstructionList": \[  
      {  
        "instructionNumber": 0,  
        "instructionDetail": "string",  
        "instructionType": "string",  
        "sourceRecordUpdatedTime": "2025-03-17T11:49:52.099Z",  
        "sourceRecordCreatedTime": "2025-03-17T11:49:52.099Z",  
        "instructionId": "string"  
      }  
    \],  
    "orderEquipmentDetailList": \[  
      {  
        "equipmentCode": "string",  
        "equipmentNumber": "string",  
        "sourceTblPrimaryKey": "string",  
        "sourceRecordCreatedTime": "2025-03-17T11:49:52.099Z",  
        "sourceRecordUpdatedTime": "2025-03-17T11:49:52.099Z",  
        "equipmentDescription": "string"  
      }  
    \],  
    "orderCarrierDetailList": \[  
      {  
        "scacCode": "string",  
        "mode": "string",  
        "sourceTblPrimaryKey": "string",  
        "sourceRecordCreatedTime": "2025-03-17T11:49:52.099Z",  
        "sourceRecordUpdatedTime": "2025-03-17T11:49:52.099Z",  
        "carrierEquipOptionId": "string",  
        "carrierSequence": 0,  
        "modeDescription": "string"  
      }  
    \],  
    "orderLines": \[  
      {  
        "lineIdentifier": 0,  
        "shipItemIdentifier": "string",  
        "packagingIdentifier": "string",  
        "grossWeightValue": 0,  
        "grossWeightUomCode": "string",  
        "isLoadConstraints": true,  
        "externalLineIdentifier": 0,  
        "thirdPartyReferenceNumber": "string",  
        "thirdPartyReferenceLineNumber": 0,  
        "thirdPartyReferenceDate": "2025-03-17T11:49:52.099Z",  
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
        "netValue": 0,  
        "harmonizedCode": "string",  
        "countryOfOrigin": "string",  
        "batchLotNumberType": "string",  
        "productClass": "string",  
        "sourceRecordUpdatedTime": "2025-03-17T11:49:52.099Z",  
        "sourceRecordCreatedTime": "2025-03-17T11:49:52.099Z",  
        "handlingUnit": "string",  
        "handlingDescription": "string",  
        "shipClass": "string",  
        "shipClassCode": "string",  
        "unNumber": "string",  
        "netValueCurrencyCode": "string",  
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
        "userFieldListOrderLine": \[  
          {  
            "userfieldType": "string",  
            "name": "string",  
            "value": "string"  
          }  
        \]  
      }  
    \],  
    "orderAccessorialDetails": \[  
      {  
        "accessorialCode": "string",  
        "accessorialAmount": 0,  
        "accessorialAmountUomCode": "string",  
        "sourceTblPrimaryKey": "string",  
        "sourceRecordCreatedTime": "2025-03-17T11:49:52.099Z",  
        "sourceRecordUpdatedTime": "2025-03-17T11:49:52.099Z"  
      }  
    \],  
    "userFieldList": \[  
      {  
        "userfieldType": "string",  
        "name": "string",  
        "value": "string"  
      }  
    \]  
  }  
} |   |  |
| Order | Call master data service to get the list of uom types | `/order-service/v1/uom-type`/`lookup` | POST | {  
  "lookup": "temp",  
  "UomType": "BoilingPoint"  
} **for** `boiling_point_uom_code` **we need to pass UomType along with lookup**   
 | {  
    "cbc": "cbc",  
    "c": "c",  
    "f": "f",  
    "cel": "cel",  
     
} |  |  |

[\[OTMS-795\] Quick Order Creation - Product Information Section (Add Product) - Jira](https://odysseylogistics.atlassian.net/browse/OTMS-795)

‌

#### BaseEntity

```
class BaseEntity{

private String createdBy;
private LocalDateTime createdDate;
private String updatedBy;
private LocalDateTime updatedDate;

}
```

‌

#### Order Header

```
@Entity
@Table="order_info"// New TMS table
class OrderHeader extends BaseEntity{

    @Id
    @Column(name = "order_id")    
    private <Long> orderHeaderId

    //MF_ORDER(ORD_ID)-OLD TMS table
    @Column(name="source_order_number")
	private Long orderIdentifier;
	
	//Getting data from master table MF_ORGANIZATION
	private Long customerId;
	
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
	@Column(name = "freight_terms_id")
	private Long freightTerms;
	
	@Column(name = "requested_delivery_timestamp")
	private LocalDateTime requestedDeliveryDate;
	
	@Column(name = "requested_ship_timestamp")
	private LocalDateTime requestedShipDate;
	
	//Getting data from master table
	@Column(name = "ship_direction_id")
	private Long shipDirectionType;
	
	@Column(name="source_record_created_time") 
	private LocalDateTime sourceRecordCreatedTime;
	
	@Column(name="source_record_updated_time") 
	private LocalDateTime sourceRecordUpdatedTime;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_status_id")
	private OrderStatus orderStatus;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "source_application_id")
	private SourceApplication sourceApplication;
	
	@OneToMany(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_instruction_id")
	private List<OrderInstruction> orderInstructionList;	
	
	@OneToMany(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_equipment_detail_id")
	private List<OrderEquipmentDetail> orderEquipmentDetailList;
	
	@OneToMany(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_carrier_detail_id")
	private List<OrderCarrierDetail> orderCarrierDetailList;
	
	// To capture ShipTo,BIllTo,Shipper,Seller,Buyer
	@OneToMany(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_involved_party_id")
	private List<OrderInvolvedParty> orderInvolvedPartyList;
	
	@OneToMany(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_line_id")
	private List<OrderLine> orderLines;
}
```

#### Order Involved Party

```
@Entity
@Table(name = "order_involved_party")
class OrderInvolvedParty {
    @Id
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
	
	@Column(name="source_tbl_primary_key")
	private String sourceTblPrimaryKey;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id")
	private OrderHeader orderHeader;
}
```

‌

#### Order Instruction

```
@Entity
@Table="order_instruction"
class Instruction extends BaseEntity{
  @Id
  @column("order_instruction_id")
  private Long instructionId;
  
  @Column(name = "instruction_sequence")    
  private Long instructionSequence;
		
  @Column(name = "instruction_detail")    
  private String instructionDetail;
  
  @Column(name = "instruction_type")    
  private String instructionType;
		
  @Column(name = "delivery_appointment_timestamp")    
  private String deliveryAppointment;
		
  @Column(name = "pickup_appointment_timestamp")    
  private String pickupAppointment;
		
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "order_id")
  private OrderHeader orderHeader;
}
```

#### Equipment Detail 

```
@Entity
@Table(name = "order_equipment_detail")
class EquipmentDetail extends BaseEntity{
    @Id
	@Column(name = "order_equipment_detail_id")    
	private Long orderEquipmentDetailId;
	
	@Column(name = "equipment_code")    
	private String equipmentCode;

	@Column(name = "equipment_number")    
	private String equipmenNumber;
	
	@Column(name = "source_tbl_primary_key")    
	private String sourceTblPrimaryKey;
	
	@Column(name = "is_active")    
	private Boolean isActive;
	
	@Column(name="source_record_created_time") 
	private LocalDateTime sourceRecordCreatedTime;
	
	@Column(name="source_record_updated_time") 
	private LocalDateTime sourceRecordUpdatedTime;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id")
	private OrderHeader orderHeader;
}
```

‌

#### Order Carrier Detail

```
@Entity
@Table(name = "order_carrier_detail")
Class OrderCarrierDetail{
    @Id
	@Column(name = "order_carrier_detail_id")    
	private Long orderCareerDetailId;
	
	@Column(name="scac_code")
	private Long scacCode;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id")
	private OrderHeader orderHeader;
}
```

‌

#### Order Status

```
@Entity
@Table(name = "order_status")
class OrderStatus extends BaseEntity{
  @Id
  @Column(name = "order_status_id")
  private Long orderStatusId;
	
  @Column(name="order_status_code")
  private String orderStatusCode;
	
  @Column(name="order_status_name")
  private String orderStatusName;
}
```

#### Source Application

```
@Entity
@Table(name = "source_application")
class SourceApplication{
    @Id
    @Column(name = "source_application_id")
    private Long sourceApplicationId;
	
	@Column(name = "source_application_code")
	private String sourceApplicationCode;
	
	@Column(name = "source_application_name")
	private String sourceApplicationName;
	
	@Column(name = "is_active")
	private Boolean isActive;
}
```

#### Order Line 

```plaintext
@Entity
@Table(name = "order_line")
public class OrderLine extends BaseEntity {
    @Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "order_line_id")    
	private Long orderLineId;
    @Column(name = "third_party_reference_number")
    private String thirdPartyReferenceNumber;

    @Column(name = "third_party_reference_line_number")
    private Long thirdPartyReferenceLineNumber;

    @Column(name = "third_party_reference_date")
    private Timestamp thirdPartyReferenceDate;

    @Column(name = "package_count")
    private Long packageCount;

    @Column(name = "height_value")
    private BigDecimal heightValue;

    @Column(name = "length_value")
    private BigDecimal lengthValue;

    @Column(name = "width_value")
    private BigDecimal widthValue;

    @Column(name = "batch_lot_number")
    private String batchLotNumber;

    @Column(name = "net_weight_value")
    private BigDecimal netWeightValue;

    @Column(name = "tare_weight_value")
    private BigDecimal tareWeightValue;

    @Column(name = "volume_value")
    private BigDecimal volumeValue;

    @Column(name = "hazmat_code")
    private String hazmatCode;

    @Column (name ="hazmat_class")
    private String hazmatClass;

    @Column(name="hazmat_packing_group")
    private String hazmatPackingGroup;

    @Column(name ="hazmat_description")
    private String hazmatDescription;

    @Column(name= "flash_point_value")
    private BigDecimal flashPointValue;

    @Column (name ="boiling_point_value")
    private BigDecimal boilingPointValue;

    @Column (name = "hazard_id")
    private String hazardId;

    @Column(name ="tunnel_code")
    private String tunnelCode;

    @Column(name ="wgk_class")
    private String wgkClass;

    @Column(name = "marine_pollutant")
    private String marinePollutant;

    @Column(name ="net_value")
    private BigDecimal netValue;

    @Column(name ="harmonized_code")
    private String harmonizedCode;

    @Column(name ="country_of_origin")
    private String countryOfOrigin;

    @Column(name ="batch_lot_number_type")
    private String batchLotNumberType;

    @Column(name ="product_class")
    private String productClass;
    
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private OrderHeader orderHeader;
}
```

‌

#### Order Audit

```
@Entity
@Table(name = "order_audit")
class OrderAudit {

	@Id
	@Column(name = "order_audit_id")    
	private Long orderAuditId;
	
	@Column(name="order_id")
	private Long orderId;
	
	//more fields to come
}
```

‌

#### Order Exception

```
@Entity
@Table(name = "order_exception_detail")
class OrderExceptionDetail {

	@Id
	@Column(name = "order_exception_detail_id")    
	private Long orderExceptionId;
	
	@Column(name="order_id")
	private Long orderId;
	
	//few more fields to come
}
```

#### Validators 

```
public interface OrderRequestValidationService {
   List<ErrorDto> isRequestValid(OrderRequestDto orderRequestDto);
}
......


public class AddressValidator {

    /**
     * @description : This method validates the shipper address fields
     * @return boolean
     */
    public boolean validateShipperAddress(OrderHeaderDto orderHeaderDto) {
        AddressBaseEntity shipperDto = orderHeaderDto.getShipper();
        return ObjectUtils.isNotEmpty(shipperDto) && StringUtils.isNotEmpty(shipperDto.getLine1()) && shipperDto.anyNullOrEmpty();

    }
```

#### Custom Exception for validation 

```
public class ValidationException extends Exception {
    private final transient List<ErrorDto> errors;
    public ValidationException(List<ErrorDto> errors){
        this.errors=errors;
    }
}
```