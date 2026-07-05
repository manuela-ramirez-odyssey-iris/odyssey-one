---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2408743006/Master+Data+Design-LLD
page_id: "2408743006"
title: "Master Data Design-LLD"
space: TMS
fetched: "2026-06-11"
domain: cross-cutting
type: lld
tags: [master-data, api, lld, order-service, shipment-service]
status: raw
---

The document covers all Master Service api details. We have consumers like Order, Shipment etc. who are consuming these apis.

| **Current Endpoint** | **Service-name** | **Domain Name(Future)** | **Description** | **Future Endpoint** | **Request Method** | **Request Payload** | **Response** | **Remarks**  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/master-data/v1/freight-terms/lookup`     | Master-data |  | Get master data from OLD TMS : Equipment Mode Location Customer (Payment Term) Rate (accessorial) Vendor (Payment Term) Special Services Freight Terms | /master-data/v1/<master-data-type>/lookup | POST | { “lookup“: “<search string>“ } **e.g. The fields :** “equipment“ : ““, “mode“ : ““, “location“ : ““, “custPaymentTerm“ : ““, “rateAccessorial“ : ““, “vendorPayment“ : ““, “specialServices“ : ““, “freightTerms“ : ““, “customerName“: “ABC BCD“ | \[ { “equimentId“:””, “equipmentName“:”” }, ………….. \] OR \[ { “modeId“:””, “modeType“:”” }, ………….. \] | \*master-data-type is equipment, mode, location etc. search criteria. |
| `/master-data/v1/package-id/validation` | Master-data | Product | Validate package Id | /product-service/v1/package-id/validation | POST | { “lookup“: “<search string>“ } | { “packageID” :“<packageName>” } | search string is package ID Exact Match integrated/order processing  |
| `/master-data/v1/package-id/lookup` | Master-data | Product | Get package id by search filter | /product-service/v1/package-id/lookup | POST | { “lookup“: “<search string>“ } | \[ “packageID1” :“<packageName>, “packageID2” :“<packageName> \] | search string is package name. Like Match Used for Lookup drop down |
| `/master-data/v1/org-name/lookup` | Master-data | Customer | Get organization name by search filter | /customer-service/v1/org-name/lookup | POST | {  
"orgIdOrgCode": "ASSA",  
// "longName":"Kelco",  
// "address":{  
// //      "addressLine1":""  
    // "country":"us"  
    // ,"region": "VA"  
// //     ,"postalCode": "22092"  
//     // ,"city":"ALHAMBRA"  
// },  
"pageNumber":0  
,"pageSize":25  
,"selectedField":"orgIdOrgCode"  
} | {  
    "orgIdOrgCode": {  
        "values": {  
            "\*ASSA-CR_SYS_01/\*ASSA-CR_SYS_01": "\*ASSA-CR_SYS_01/\*ASSA-CR_SYS_01",  
            "\*ASSA-YL_SYS_01/\*ASSA-YL_SYS_01": "\*ASSA-YL_SYS_01/\*ASSA-YL_SYS_01",  
            "3627449/C_HEA-HASSA": "3627449/C_HEA-HASSA",  
            "2698661/www.thalassamp.com": "2698661/www.thalassamp.com",  
            "3376618/www.thalassamp.com": "3376618/www.thalassamp.com",  
            "\*ASSA-RS_SYS_01/\*ASSA-RS_SYS_01": "\*ASSA-RS_SYS_01/\*ASSA-RS_SYS_01",  
            "\*ASSA-AB_SYS_01/\*ASSA-AB_SYS_01": "\*ASSA-AB_SYS_01/\*ASSA-AB_SYS_01",  
            "\*ASSA-BS_SYS_01/\*ASSA-BS_SYS_01": "\*ASSA-BS_SYS_01/\*ASSA-BS_SYS_01",  
            "\*ASSA-PK_SYS_01/\*ASSA-PK_SYS_01": "\*ASSA-PK_SYS_01/\*ASSA-PK_SYS_01",  
            "\*ASSA-RW_SYS_01/\*ASSA-RW_SYS_01": "\*ASSA-RW_SYS_01/\*ASSA-RW_SYS_01",  
            "\*ASSA-SG_SYS_01/\*ASSA-SG_SYS_01": "\*ASSA-SG_SYS_01/\*ASSA-SG_SYS_01",  
            "\*ASSA-NT_SYS_01/\*ASSA-NT_SYS_01": "\*ASSA-NT_SYS_01/\*ASSA-NT_SYS_01",  
            "\*ASSA-MD_SYS_01/\*ASSA-MD_SYS_01": "\*ASSA-MD_SYS_01/\*ASSA-MD_SYS_01",  
            "264824/DAT-CUST-MASSASOIT": "264824/DAT-CUST-MASSASOIT",  
            "\*ASSA-MK_SYS_01/\*ASSA-MK_SYS_01": "\*ASSA-MK_SYS_01/\*ASSA-MK_SYS_01"  
        },  
        "hasNext": false  
    }  
} | Search by **org_id**/ **org_short_name**/ both(org_id-org_short_name)  **longName** - org_long_name **address** field : Address Line 1, City, Region, Postal Code and / or Country combinations  Note: Pagination implemented in the way of send the flag UI is next set records are present in DB or not. If hasNext is True → next set of records are there in DB.  If hasNext is False → next set of records are not in DB.   Huge records in Master Service DB so that changed the design for eradicate the latency and also calculate the count taking more time in DB call.  |
| `/master-data/v1/org-name/lookup` | Master-data | Customer | Search by organization id or/and short name | /customer-service/v1/org-name/lookup | POST | {  
"orgIdOrgCode": "\*ASSA-AB_SYS_01/\*ASSA-AB_SYS_01",  
// "longName":"Kelco",  
// "address":{  
// //      "addressLine1":""  
    // "country":"us"  
    // ,"region": "VA"  
// //     ,"postalCode": "22092"  
//     // ,"city":"ALHAMBRA"  
// },  
"pageNumber":0  
,"pageSize":25  
,"selectedField":"orgIdOrgCode"  
} | {  
    "longName": {  
        "values": {  
            "\*ASSA-AB": "\*ASSA-AB"  
        },  
        "hasNext": false  
    }  
} | Search by **org_id**/ **org_short_name**/ both(org_id-org_short_name) |
| `/master-data/v1/org-name/lookup` | Master-data | Customer | Search by organization long name | /customer-service/v1/org-name/lookup | POST | {  
// "orgIdOrgCode": "\*ASSA-AB_SYS_01/\*ASSA-AB_SYS_01",  
// "longName":"Kelco",  
"address":{  
// //      "addressLine1":""  
    "country":"us"  
    // ,"region": "VA"  
// //     ,"postalCode": "22092"  
//     // ,"city":"ALHAMBRA"  
},  
"pageNumber":0  
,"pageSize":25  
,"selectedField":"longName"  
} | {  
    "longName": {  
        "values": {  
            "  ": "  ",  
            " ACTRACHEM LP": " ACTRACHEM LP",  
            " A.D. Instruments": " A.D. Instruments",  
            " ADECCO EMPLOYMENT SERVICES": " ADECCO EMPLOYMENT SERVICES",  
            " A J Weigand Inc": " A J Weigand Inc",  
            " ACME CONTROL SERVICE INC": " ACME CONTROL SERVICE INC",  
            "  A & R CONCRETE PRODUCTS, LLC": "  A & R CONCRETE PRODUCTS, LLC",  
            " ADT SECURITY SERVICES INC": " ADT SECURITY SERVICES INC",  
            " AGILENT TECHNOLOGIES-USE 306151": " AGILENT TECHNOLOGIES-USE 306151",  
            " 4696 LUMBER KING OF SOMERSET": " 4696 LUMBER KING OF SOMERSET",  
            " ACME HARDESTY": " ACME HARDESTY",  
            " ABC CATALOG": " ABC CATALOG",  
            " AC CONTROLS CO. INC.": " AC CONTROLS CO. INC.",  
            " ACADEMY OF INFORMATION TECHNOLOGY": " ACADEMY OF INFORMATION TECHNOLOGY",  
            " AEP INDUSTRIES, INC": " AEP INDUSTRIES, INC",  
            " - MEUTH CONSTRUCTION SUPPLY": " - MEUTH CONSTRUCTION SUPPLY",  
            " ADT SECURITY SYSTEMS INC": " ADT SECURITY SYSTEMS INC",  
            " ACCO ENGINEERED SYSTEMS": " ACCO ENGINEERED SYSTEMS",  
            " ADT SECURITY SERVICES": " ADT SECURITY SERVICES",  
            " ADVANCED WASTE SERVICES": " ADVANCED WASTE SERVICES",  
            " - MMC": " - MMC",  
            " - PRIMESOURCE BLDG --DO NOT USE": " - PRIMESOURCE BLDG --DO NOT USE",  
            "  AMERICAN MANAGEMENT ASSOC.": "  AMERICAN MANAGEMENT ASSOC.",  
            " ADT SECURITY SYSTEMS NORTHEAST INC": " ADT SECURITY SYSTEMS NORTHEAST INC",  
            " ADMIRAL METALS": " ADMIRAL METALS"  
        },  
        "hasNext": true  
    }  
} | **Narrow down.** Based on country “US“ the selected field “Long Name”  has narrow downed.   In this case hasNeaxt is True. So the DB has another set of records are there. |
| `/master-data/v1/org-name/lookup` | Master-data | Address | Search by organization address | /customer-service/v1/org-name/lookup | POST | {  
// "orgIdOrgCode": "\*ASSA-AB_SYS_01/\*ASSA-AB_SYS_01",  
"longName":" AGILENT TECHNOLOGIES-USE 306151",  
"address":{  
// //      "addressLine1":""  
    "country":"us"  
    // ,"region": "VA"  
// //     ,"postalCode": "22092"  
//     // ,"city":"ALHAMBRA"  
},  
"pageNumber":0  
,"pageSize":25  
,"selectedField":"orgIdOrgCode"  
} | {  
    "orgIdOrgCode": {  
        "values": {  
            "517580/0000065507": "517580/0000065507",  
            "2336874/0000065507": "2336874/0000065507"  
        },  
        "hasNext": false  
    }  
} |  |
| `/master-data/v1/address/lookup`  
  
Need to check if it used any where | ~~Master-data~~ | ~~Address~~ | ~~Address lookup by addressline1~~ | ~~/address-service/v1/address/lookup~~ | ~~POST~~ | ~~{~~ ~~address : {~~ ~~“addressLine1” : “<addressLine1>“,~~ ~~“city” : “<city>“,~~ ~~“region“ : “<region>“,~~ ~~“postalCode“ : “<postal-code>“,~~ ~~“country“ : “<country>“~~ ~~}~~ ~~}~~ | ~~{~~ ~~addressLineVal1: \[\],~~ ~~“city“ : \[\],~~ ~~“region“ : \[\],~~ ~~“postalCode“ : \[\]~~ ~~“country” : \[\]~~ ~~}~~ |  |
| `/master-data/v1/address/lookup`  Need to check if it used any where | ~~Master-data~~ | ~~Address~~ | ~~Get address by search filter~~ | ~~/address-service/v1/address/lookup~~ | ~~POST~~ | ~~{~~  
 ~~“address” : {~~ ~~“addressLine1” : “<addressLine1>“,~~ ~~“city” : “<city>“,~~ ~~“region“ : “<region>“,~~ ~~“postalCode“ : “<postal-code>“,~~ ~~“country“ : “<country>“~~ ~~},~~  
    ~~"address_type" : "SHIPNG"~~  
~~}~~ | ~~{~~ ~~addressLineVal1: \[\],~~ ~~“city“ : \[\],~~ ~~“region“ : \[\],~~ ~~“postalCode“ : \[\]~~ ~~“country” : \[\]~~ ~~}~~ | ~~search string is customer address.~~ ~~TBD …~~ **~~Need to check if it used or not~~** |
| `/master-data/v1/ship-direction/lookup` | Master-data | Location-Direction | Get Ship Direction drop down | /location-service/v1/ship-direction/lookup | POST | {  
  “lookup” : “SHIP_DIRECTION"  
} | {  
  “id” : “value”,  
  “id“ : “value“  
}  | UI Lookup Like Match <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-515</custom>  |
| `/master-data/v1/ship-direction/validation` |  | Location-Direction | Validate ship-direction | /location-service/v1/ship-direction/validation | POST | {  
“lookup” : “SHIP_DIRECTION"  
} | {  
flag : true  
} | Integrated orders/order processing Exact Match |
| `/master-data/v1/release-status/lookup` | Order-Service | Order | Get Release Status  | /master-data/v1/release-status/lookup | POST | {

“lookup” : “RELEASE_STATUS”

} | {

“id” : “value”

}  |  |
| `/master-data/v1/package-group/lookup` | Master-data | Product | Packing Group drop down | /product-service/v1/package-group/lookup | GET | {

“lookup” : ““

} | \[  
    "III",  
    "II",  
    "I",  
    "111",  
    "N/A"  
\] | To list all package groups  |
| `/master-data/v1/package-group/lookup` | Master-data | Product | Get Packing Group by search filter | /product-service/v1/package-group/lookup | POST | {  
  “lookup” : “N/A“  
} | \[  
    "N/A"  
\] | To find package group that matches search criteria |
| `/master-data/v1/product-service/v1/hazmat-package-group/lookup` | Master-data | Product | Get Hazmat Packaging Group by search filter | /product-service/v1/hazmat-package-group/lookup | POST | {  
  “lookup” : “Haz“  
} | {  
  "pageNumber": 0,  
  "pageSize": 25  
  "data":\[  
    "Haz1",  
    "Haz2"  
  \]  
} | LINX PGI PGR  <custom data-type="smartlink" data-id="id-1">https://odysseylogistics.atlassian.net/browse/LINX-515</custom>  |
|  | Master-data | Product | Get Currency Code by search filter | /product-service/v1/declared-value-currency/lookup | POST | { “lookup” : “USD“ } | { “currencyCode“ : “currencyDesc“ } | search string is currency code |
| `/master-data/v1/product-service/v1/ship-class` | Master-data | Product | Get Ship Class by search filter | ~~/product-service/v1/ship-class/lookup~~   /product-service/v1/ship-class | ~~POST~~ GET | 1.{  
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
} GET API   {  
    "P": "Product Class",  
    "C": "Commodity",  
    "H": "Harmonized",  
    "N": "NMFC"  
}  |  ?? Not sure now if we are using this api endpoint   `SELECT * FROM CSUSER.CG_REF_CODES WHERE RV_DOMAIN LIKE 'SHIP_CLASS';` This needs confirmation from <custom data-type="mention" data-id="id-2">@Mangesh Jangam (Cognizant)</custom> <custom data-type="smartlink" data-id="id-3">https://odysseylogistics.atlassian.net/browse/OTMS-923</custom>  |
| `/master-data/v1/product-service/v1/ship-class-id` | Master-data | Product |  | /product-service/v1/ship-class-id | POST | {  
     "pageNumber":<value>,  
     "pageSize":<value>,  
     "lookup" : "<string>"    
} | {  
data:\[  
    "1874973",  
    "2864789",  
    .........,  
    ..........  
\],  
pageNumber:1,  
pageSize: 25,  
totalCount : 10  
} | `SELECT * FROM "CSUSER"."MF_SHIPPING_CLASS" WHERE SC_CD_SHIP_CLASS ='C' AND SC_CLASS_ID LIKE '%SEARCH_STRING%';` The Api is performing lookup based on Shipping class as well as Shipping class ID.  
<custom data-type="smartlink" data-id="id-4">https://odysseylogistics.atlassian.net/browse/OTMS-1657</custom>  |
| `/master-data/v1/product-service/v1/product/lookup` | Master-data | Product | Get Product Ids  | /product-service/v1/product/lookup | POST | {  
“lookup” : <search string>,  
"pageNumber": 0,  
"pageSize": 20  
}      | {  
  pageNumber:1,  
  pageSize: 25,  
  totalCount : 10  
  data:{  
   "000000000000100027": \["KYMENE 525 BULK (FLAGGED - DO NOT USE),"KYMENE 218 BULK-DO NOT USE"\],  
   "000000000000100029": \["KYMENE 525 BULK (FLAGGED - DO NOT USE)"\]  
    
  …………………  
   }  
} | Search String is Product ID  Like match to get the list of Products  SQL : “external_id “ from table “mf_ship_item”\_ Used in UI lookup <custom data-type="smartlink" data-id="id-5">https://odysseylogistics.atlassian.net/browse/OTMS-795</custom> <custom data-type="smartlink" data-id="id-6">https://odysseylogistics.atlassian.net/browse/OTMS-922</custom>  |
| `/master-data/v1/customer-service/v1/owning-org/lookup` | Master-data | Customer | Get owning organization | /customer-service/v1/owning-org/lookup | POST | {  
“lookup” : <search string>,  
"pageNumber": 0,  
"pageSize": 20  
}   | {  
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
} | Search String is customer name Like match to get the list of owning org Used in UI lookup <custom data-type="smartlink" data-id="id-7">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom>  <custom data-type="smartlink" data-id="id-8">https://odysseylogistics.atlassian.net/browse/OTMS-681</custom>  |
|  | Master-data | Customer | Validate owning organization | /customer-service/v1/owning-org/validation | POST | { “lookup” : “owning-org-name“ } | { id: value } | Exact match Used in Order Header Validation Integrated orders/Order processing logic |
| `/master-data/v1/customer-service/v1/freight-terms` | Master-data | Customer | Get freight terms | /customer-service/v1/freight-terms | GET |  | {  
    "P": "Pre-Paid",  
    .....,  
    .....  
} | Used in UI lookup <custom data-type="smartlink" data-id="id-9">https://odysseylogistics.atlassian.net/browse/OTMS-682</custom>  SELECT \* FROM "CSUSER"."CG_REF_CODES"  
WHERE RV_DOMAIN ='FRT_TERMS' ; |
|  | Master-data  | Customer | Validate freight-term | /customer-service/v1/freight-term/validation  | POST | { “lookup” : “Third Party” } | {     id: value } | id : freight-terms code value : freight-term Exact match Used in Order Header Validation e.g "T": "Third Party" |
|  | Master-data | Instruction | Validate instruction-type | /instruction-service/v1/instruction-type/validation | POST | { “lookup” : <search string> } | ~~{~~  
 ~~id :"ADC",~~  ~~id :"ADDITIONAL,~~ ~~id: CHARGE",~~  
	~~......,~~  
	~~......~~  
~~}~~ { “id“  :"Value " } | ~~Exact Match~~ ~~integrated orders/ order processing~~ ~~Search string is short description~~ <custom data-type="smartlink" data-id="id-10">https://odysseylogistics.atlassian.net/browse/OTMS-577</custom>  `SELECT * FROM "CSUSER"."MF_INSTRUCTION_TYPE"  WHERE IT_CODE='002'` id : `IT_CODE` Value : IT_SHORT_DESC |
|   
`/master-data/v1/instruction-service/v1/instruction-type/lookup` | Master-data | Instruction | Instruction-type lookup | /instruction-service/v1/instruction-type/lookup | POST | {  
“lookup” : <search string>,  
"pageNumber": 0,  
"pageSize": 20  
} | {  
  "pageNumber": 0,  
  "pageSize": 20,  
  "totalCount": 10,  
  "data":\[  
    "<Value 1>",  
    "<Value 2>"  
  \]  
} | <custom data-type="smartlink" data-id="id-11">https://odysseylogistics.atlassian.net/browse/OTMS-50</custom>   
  
This API gives the list of instruction type codes |
| `/master-data/v1/city/lookup` | Master-data | Address | Get City Name by search filter | /address-service/v1/city/lookup | POST | { “lookup” : <search string> “locationType” : “C” } | {  
    id:"HOLYOKE",  
    .......,  
    ......  
} | search string is location desc |
| `/master-data/v1/timezones` | Master-data | Address | Get time zone details by ID | /address-service/v1/timezones | GET |  | {

“JST“ : “Asia/Tokyo“

“PST” : “Pacific Standard Time”

} |  |
| `/master-data/v1/uom-type/validation` | Master-data | Product | Validate uom-type | /product-service/v1/uom-type/validation | POST | {

“uom-type“ : “VOL“,

“uom-code“ : “cuft“

} | {

flag : true

} | Exact Match uom-code : “cuft/grm“ uom-type : “VOL/WGT“ SELECT UOM_UNIT_CODE ,UOM_UNIT_DESC    
FROM MF_UNIT_OF_MEASURE muom   
WHERE UOM_UOMT_UNIT_TYPE ='WGT'; |
| `/master-data/v1/product-service/v1/uom-type` | Master Data | Product | Returns list of units of WGT type | /product-service/v1/uom-type | POST | {  
  “lookup“ : “WGT“  
} | \[  
  “KG”,  
  “GRM”  
\] | SELECT UOM_UNIT_CODE ,UOM_UNIT_DESC    
FROM MF_UNIT_OF_MEASURE muom   
WHERE UOM_UOMT_UNIT_TYPE ='WGT';  |
| `/master-data/v1/product-service/v1/uom-type` | Master Data | Product | Returns list of units of VOL type | /product-service/v1/uom-type | POST | {  
  “lookup“ : “VOL“  
} | \[  
  “cuft”,  
  “cum”  
\] |  |
| `/master-data/v1/wgk-class/validation` | Master-data | Product | Validate wgk-class | /product-service/v1/wgk-class/validation | POST | { “lookup“ : “<wgk-class>“ } | { id : value } | Exact Match id : wgk-class-type value : wgk-class |
| `/master-data/v1/product-class/validation` | Master-data | Product | Validate product-class | /product-service/v1/product-class/validation | POST | {

“lookup“ : “<prod-class>“

} | { id: value } | Exact Match validated against Shipping Class ID |
| `/master-data/v1/product-service/v1/product-class/lookup` | Master-data | Product | Product Class Drop down | /product-service/v1/product-class/lookup |  | {  
  “lookup“ : “<prod-class>“  
} | {  
    "pageNumber": 0,  
    "pageSize": 2,  
    "totalCount": 5,  
    "data": {  
        "TL": "TL",  
        "FCL": "FCL"  
    }  
} | LINX-PGIPGR <custom data-type="smartlink" data-id="id-12">https://odysseylogistics.atlassian.net/browse/LINX-515</custom>  |
| `/master-data/v1/transportation-service/v1/equipment/lookup` | Master-data | Transportation | Equipment Lookup | /transportation-service/v1/equipment/lookup | POST | Request for Page 1 {  
     "pageNumber":0,  
     "pageSize":2,  
     "lookup" : ""    
} Request for Page no. 2 {  
     "pageNumber":1,  
     "pageSize":2,  
     "lookup" : ""  
     
} Request for Page 3 {  
     "pageNumber":2,  
     "pageSize":2,  
     "lookup" : ""  
     
}  | Response for Page 1 {  
    "pageNumber": 0,  
    "pageSize": 2,  
    "totalCount": 5,  
    "data": {  
        "TL": "TL",  
        "FCL": "FCL"  
    }  
}  Response no.2  {  
    "pageNumber": 1,  
    "pageSize": 2,  
    "totalCount": 5,  
    "data": {  
        "RR": "RR",  
        "LCL": "LCL"  
    }  
} Response For Page 3 {  
    "pageNumber": 2,  
    "pageSize": 2,  
    "totalCount": 5,  
    "data": {  
        "LTL": "LTL"  
    }  
} | Like Match id: equipment-code value : equipment SQl :  select DISTINCT SE_CD_EQUIP_CODE  
FROM "CSUSER"."MF_SHIP_EQUIPMENT" GROUP BY SE_CD_EQUIP_CODE; <custom data-type="smartlink" data-id="id-13">https://odysseylogistics.atlassian.net/browse/OTMS-1082</custom>  UI Flow |
| `/master-data/v1/equipment/validation` | Master-data | Transportation | Validate Equipment   | /transportation-service/v1/equipment/validation | POST | { “lookup“ : “<equipment>“ } | { id: value } | Exact Match id: equipment-code value : equipment integrated order/order processing logic |
| `/master-data/v1/ship-item/identifier/validation` | Master-data | Product | Validate ship-item identifier | /product-service/v1/ship-item/identifier/validation | POST | {     "lookup" : <search string> } | { "000000000000100029": "KYMENE 218 BULK-DO NOT USE" } | Exact Match Example for request payload : {     "lookup" : "000000000000100029" }  **ship-item-identifier** should match with Ship Item ID from Master data   |
| `/master-data/v1/product-service/v1/ship-item/identifier/lookup` | Master-data | Product | Validate ship-item identifier lookup | /product-service/v1/ship-item/identifier/lookup | POST | {  
"lookup": "",  
"pageNumber": 0,  
"pageSize": 25  
} | {  
"pageNumber": 0,  
"pageSize": 25,  
 totalCount: 10,  
”data”:\[  
    "<String>",  
    "<String>",  
    "<String>"  
\]  
} |  |
|  | Master-data | Location-Direction | Ship-direction List | /location-service/v1/ship-direction/list | GET |  | {  
    "I": "Inbound", ‌    “O“ : “Outbound“  
} | For manual order UI |
| `/master-data/v1/ship-direction/validation` | Master-data | Location-Direction | Validate Ship Direction | /location-service/v1/ship-direction/validation | POST | { lookup: “<ship-direction>“ } | { id: value } | Exact Match Integrated orders/order processing |
| `/master-data/v1/location-service/v1/country-origin/lookup` | Master-data | Location-Direction | Get and lookup for “Country Of Origin” | /location-service/v1/country-origin/lookup | POST | {  
"lookup" : "IN",  
"pageNumber": 0,  
"pageSize": 25  
} | {  
"pageNumber": 0,  
"pageSize": 25,  
 totalCount: 10,  
”data”:\[  
    "ID",  
    "IN",  
    "IO"  
\]  
} | ` SELECT LOC_COUNTRY_ID FROM CSUSER.mf_location mf WHERE LOC_CD_LOC_TYPE ='N' AND LOC_COUNTRY_ID LIKE '%IN%';` <custom data-type="smartlink" data-id="id-14">https://odysseylogistics.atlassian.net/browse/OTMS-1462</custom>  <custom data-type="smartlink" data-id="id-15">https://odysseylogistics.atlassian.net/browse/OTMS-2685</custom>  |
| `/master-data/v1/org-name/validation` | Master-data | Customer | Validate Shipping Site Identifier/Ship To Identifier | /customer-service/v1/org-name/validation | POST | { “lookup” : <search string> } | {     "2853259": "0150177320",     "1359612": "0150177320" } | Exact Match `{` `    "lookup" : "0150177320"` `}/** This api is used for "Shipping Site Identifier" and "Ship To Identifier". */` |
|  | Master-data | TBD-Order | validate order identifier | /master-data/v1/order-identifier/validation | POST | { lookup: ”<search string>” } | { id : value } true: validation passes false : validation fails | Use Regex to validate the pattern alphanumeric & special characters, including space, should be allowed with minimum 1 character and maximum of 150 characters Exact Match |
| `/master-data/v1/product-service/v1/handling-units` | Master-data | Product | handling units drop down | /product-service/v1/handling-units | GET |  | { “BOX“ : “BOXES“, “CN“ : “CAN“, “CONT“ : “CONTAINER“  } | <custom data-type="mention" data-id="id-16">@Sakthivel Kaliswamy</custom> to confirm the table details cg_ref_codes.rv_low_value (rv_domain = 'HANDLING_UNIT') <custom data-type="smartlink" data-id="id-17">https://odysseylogistics.atlassian.net/browse/OTMS-988</custom>  |
| `/master-data/v1/product-service/v1/special-services/default-list` | Master-data | Product | Special Services drop down | /product-service/v1/special-services/default-list | GET |  | { “LFT“ “ “Lift Gate“, “PJC“ : “Pallet Exchange“, …….. }  | Default special services SELECT CGC_CODE,CGC_SHORT_DESC  FROM mf_charge_category_lov   
WHERE CGC_CODE IN ('PALEXG','PJC','LFT','LFTD','LFTP','LUMP','DTL','DTU');  <custom data-type="smartlink" data-id="id-18">https://odysseylogistics.atlassian.net/browse/OTMS-98</custom><custom data-type="smartlink" data-id="id-19">https://odysseylogistics.atlassian.net/browse/OTMS-1458</custom>   |
| `/master-data/v1/product-service/v1/special-services/lookup` | Master-data | Product | Manage Special Services | /product-service/v1/special-services/lookup | POST | {  
"lookup" : "lift",  
"pageNumber": 0,  
"pageSize": 25  
} | {  
"pageNumber": 0,  
"pageSize": 25,  
"totalCount": 10,  
 data: \[  
    "HYDLIF": "HYDRAULIC LIFT GATE",  
    "LFTP": "LIFT GATE AT PICKUP",  
    "LLDI": "LIFTS - DEPOT IN",  
    "LFC": "LIFT CHARGES(INMODL)",  
    "LLDO": "LIFTS - DEPOT OUT",  
    "LFTD": "LIFT GATE AT DELIVRY",  
    "LFT": "LIFT GATE",  
    "HUL": "HEAVY LIFT"  
  \]  
} | For Search lookup SELECT CGC_CODE,CGC_SHORT_DESC  FROM mf_charge_category_lov  
WHERE CGC_SHORT_DESC  like 'Lift%' |
| `/master-data/v1/modes` | Master-data | master-data | Modes drop down | /master-data/v1/modes | GET | {  
"lookup": ”<search string>”,  
"pageNumber": 0,  
"pageSize": 25  
} | {  
"pageNumber": 0,  
"pageSize": 25,  
"totalCount": 10,  
"data":\[  
  “IMD“ : “INTERMODAL“,  
  “AIR“ : “AIR FREIGHT“,  
  ……  
\]  
} | `SELECT SM_CODE ,SM_SHORT_DESC  FROM MF_SHIP_MODE msm ;` |
| `/master-data/v1/product-service/v1/currency` | Master-data | master-data | currency drop down | /product-service/v1/currency | POST | {  
"lookup": ”<search string>”,  
"pageNumber": 0,  
"pageSize": 25  
} |  {  
"pageNumber": 0,  
"pageSize": 25,  
"totalCount": 10,  
"data" : \[  
  "CLP",  
  "COP",  
  "CUP",  
  "DEM",  
  "DOP",  
  "EGP"  
 \]  
} | <custom data-type="smartlink" data-id="id-20">https://odysseylogistics.atlassian.net/browse/OTMS-2249</custom>  Search +Pagination `SELECT cur_code FROM csuser.mf_currency` ref : <custom data-type="smartlink" data-id="id-21">https://odysseylogistics.atlassian.net/browse/OTMS-2248</custom>  |
|  | Master-data | Customer | Get cost allocation type | `/customer-service/v1/cost-allocation-type` | POST | {  
  “profile”: “TL_ALLOC“,  
  “org”: ”\*CYRO_SYS_01”  
} | { `"BY_WT" / "BY_MI_LB" / "BY_PC_LB"` } OR { `"BY_VL"` } | This API will return cost allocation type for given Org and Profile, the response will be “BY_WGT” or “BY_VOL”  <custom data-type="smartlink" data-id="id-22">https://odysseylogistics.atlassian.net/browse/OTMS-3853</custom>  |
| `/master-data/v1/product-service/v1/special-services-list/lookup` | Master-data |  | Get name and description based on code | `/product-service/v1/special-services-list/lookup` | POST | `["PJC","LFTD","HAZ"]` | {  
    "HAZ": "HAZARDOUS MATERIALS",  
    "PJC": "PALLET JACK",  
    "LFTD": "LIFT GATE AT DELIVRY"  
} | <custom data-type="smartlink" data-id="id-23">https://odysseylogistics.atlassian.net/browse/OTMS-4838</custom>  |
| `/master-data/v1/time-zone-value/validation` | Master data | master-data | This API verifies whether Time Zone Value is present or not | `/master-data/v1/time-zone-value/validation` | POST | {   
    "lookup" : "IDL"  
} | If value is present returns `true`, else returns `false` | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-24">https://odysseylogistics.atlassian.net/browse/LINX-521</custom>  |
| `/master-data/v1/packing-group/validation` | Master data | master-data | This API verifies whether Packing Group is present or not | `/master-data/v1/packing-group/validation` | POST | {   
    "lookup" : "II"  
} | If value is present returns `true`, else returns `false` | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-25">https://odysseylogistics.atlassian.net/browse/LINX-1531</custom>  |
| `/master-data/v1/commodity-code/validation` | Master data | master-data | This API verifies whether Commodity code is present or not | `/master-data/v1/commodity-code/validation` | POST | {   
    "lookup" : "H3F2R0PB"  
} | If value is present returns `true`, else returns `false` | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-26">https://odysseylogistics.atlassian.net/browse/LINX-1531</custom>  |
| `/master-data/v1/commodity-code/lookup` | Master-data | master-data | Commodity Code drop down | `/master-data/v1/commodity-code/lookup` | POST | {   
    "lookup" : "H3F2R0PB"  
} | {  
  "pageNumber": 0,  
  "pageSize": 25  
  "data": \[  
    "H3F2R0PB",  
    "H3F2R0PB"  
  \]  
} | LINX-PGI PGR <custom data-type="smartlink" data-id="id-27">https://odysseylogistics.atlassian.net/browse/LINX-515</custom>  |
| `/master-data/v1/currency-code/validation` | Master data | currency | This API verifies whether Currency code is present or not | `/master-data/v1/currency-code/validation` | POST | {   
    "lookup" : "DEM"  
} | If value is present returns `true`, else returns `false` | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-28">https://odysseylogistics.atlassian.net/browse/LINX-521</custom>  |
| `/master-data/v1/product-id/validation` | Master data | product | This API verifies whether Product Class Id is present or not | `/master-data/v1/product-id/validation` | POST | {   
    "lookup" : "H3F1R0PK"  
} | If value is present returns `true`, else returns `false` | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-29">https://odysseylogistics.atlassian.net/browse/LINX-1531</custom>  |
| `/master-data/v1/uom-unit-code/validation` | Master data | master-data | This API verifies whether Uom Unit Code is present or not | `/product-service/v1/uom-unit-code/validation` | POST | {   
    "lookup" : "DM3"  
} | If value is present returns `true`, else returns `false` | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-30">https://odysseylogistics.atlassian.net/browse/LINX-1531</custom>  |
| `/master-data/v1/scac-code/validation` | Master data | master-data | This API verifies whether Carrier SCAC is present or not | `/carrier-service/v1/scac-code/validation` | POST | {   
    "lookup" : "CHOC"  
} | If value is present returns `true`, else returns `false` | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-31">https://odysseylogistics.atlassian.net/browse/LINX-521</custom>  Use Regex to validate the pattern  User should be able to enter alphanumeric & special characters, including space, in this free text field with a minimum of 1 character and maximum of 150 characters Exact Match |
| `/master-data/v1/scac-code/lookup` | Master data | carrier | SCAC drop down | `/carrier-service/v1/scac-code/lookup` | POST | {  
  "pageNumber": 0,  
  "pageSize": 25,  
  "lookup": ”PORG”  
} | {  
  "pageNumber": 0,  
  "pageSize": 25  
  "data":\[  
    "HD3",  
    "MEL",  
    ...  
  \]  
} | LINX-PGI/PGR <custom data-type="smartlink" data-id="id-32">https://odysseylogistics.atlassian.net/browse/LINX-515</custom>  |
| `/master-data/v1/equipment-type` | Master Data | carrier | Equipment Type drop down | `/master-data/v1/equipment-type` | POST | {  
  "pageNumber": 0,  
  "pageSize": 25,  
  "lookup" : "PORG"  
} | {  
  "pageNumber": 0,  
  "pageSize": 25  
  "data":\[  
    "LTL",  
    "TL"  
  \]  
}  
Query : SELECT CE_SE_EQUIP_ID   
FROM MF_CARRIER_EQUIPMENT mce WHERE   
CE_CARR_SCAC_ID IN ('HD3','MEL') ; | LINX-PGI/PGR <custom data-type="mention" data-id="id-33">@Sakthivel Kaliswamy</custom> please confirm the query [LINX-515](https://odysseylogistics.atlassian.net/browse/LINX-515) |
| /master-data/v1/nmfc/lookup | Master Data | product-service | NMFC drop down | /product-service/v1/nmfc/lookup | POST | {  
  "pageNumber": 0,  
  "pageSize": 25,  
  "lookup" : "Radio"  
} | \[  
{  
 "id" : "",  
 "value" : ""  
}  
\] | SQL Query : **SELECT** SC_CLASS_ID,SC_CLASS_DESC  **FROM** MF_SHIPPING_CLASS **WHERE** SC_CD_SHIP_CLASS=**'N'** **AND** SC_CD_STATUS=**'A';** |
| `/master-data/v1/org-short-name/{orgGlobalId}` | Master Data | Customer | Get Organization short name by Org Global Id | /customer-service/v1/org-short-name/{org-global-id} | GET |  | {  
  "orgShortName": "<orgShortName>"  
} |  |
| /master-data/v1/accessorial/validation | Master-data |  | Validate Accessorials | /master-data/v1/accessorial/validation |  | {  
"lookup" : ""  
} | { “flag“ : true/false } |  |
| /master-data/v1/freight-class/lookup | Master Data | Product | Get freight class codes | /product-service/v1/freight-class/lookup | POST | {  
"lookup" : ""  
} | {  
"key1" : "value1",  
"key2" : "value2"  
} | `SELECT REV_ID,REV_REF_VALUE FROM MF_REFERENCE_VALUE WHERE REV_RQ_CODE='FRT_CLASS';` |
| /master-data/v1/freight-class/validation | Master-data | Product | Validate Freight class | /product-service/v1/freight-class/validation | POST | {  
"lookup" : ""  
} | { “flag“ : true/false } |  |
| /master-data/v1/currency/conversion | Master Data | Master   | Get currency conversion | /master-data/v1/currency/conversion  | POST | {  
"fromCurrency" : "",  
"toCurrency" : ""  
} | {  
"fromCurrency" : "",  
"toCurrency" : ""  
"rate" : int  
} | `SELECT CC_CUR_FROM_CODE,CC_CUR_TO_CODE FROM MF_CURRENCY_CONVERSION mcc ;` |
| /master-data/v1/uom/conversion | Master Data | Master | Get unit conversion | /master-data/v1/uom/conversion | POST | {  
"lookup" : ""  
} | {  
"key1" : "value1",  
"key2" : "value2"  
} | SELECT UC_UOMT_FROM_UNIT_TYPE,UC_UOM_UNIT_TO   
FROM MF_UNIT_CONVERSION muc ; |
| /master-data/v1/ipcoterayment/validation | Master Data | Product | Validate Payment | /product-service/v1/payment/validation | POST | {  
"lookup" : ""  
} | { “flag“ : true/false } | SELECT PAYT_CODE,PAYT_SHORT_DESC FROM MF_PAY_TERM mpt ; |
| /master-data/v1/hazmat-code/lookup | Master Data | Product | Lookup hazmat code | /product-service/v1/hazmat-code/lookup | POST | {  
"lookup" : ""  
} | { “key1“ : “val1“, “key2“ : “val2“ } | Query : <custom data-type="mention" data-id="id-34">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/hazmat-class/validation | Master Data | Product | Validate hazmat class | /product-service/v1/hazmat-class/validation | POST | {  
"lookup" : ""  
} | { “key1“ : “val1“, “key2“ : “val2“ } | Query : <custom data-type="mention" data-id="id-35">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/hazmat-package-group/lookup | Master Data | Product | Lookup hazmat-pac | /product-service/v1/hazmat-package-group/lookup | POST | {  
"lookup" : ""  
} | { “key1“ : “val1“, “key2“ : “val2“ } | Query : <custom data-type="mention" data-id="id-36">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/hazmat-description/validation | Master Data | Product | Validate Hazmat description | /product-service/v1/hazmat-description/validation | POST | {  
"lookup" : ""  
} | { “flag“ : true/false } | Query : <custom data-type="mention" data-id="id-37">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/hazard-id/lookup | Master Data | Product | Get Hazard ID | /product-service/v1/hazard-id/lookup | POST | {  
     "pageNumber":<value>,  
     "pageSize":<value>,  
     "lookup" : "<string>"    
} | {  
    "pageNumber": <value>,  
    "pageSize": <value>,  
    "totalCount": <value>,  
    "data": {  
        "<string>": "<string>.",  
        "<string>": "<string>"  
    }  
} | Query : <custom data-type="mention" data-id="id-38">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/tunnel-code/lookup | Master Data | Product | Get Tunnel Code | /product-service/v1/tunnel-code/lookup | POST | {  
     "pageNumber":<value>,  
     "pageSize":<value>,  
     "lookup" : "<string>"    
} | {  
    "pageNumber": <value>,  
    "pageSize": <value>,  
    "totalCount": <value>,  
    "data": {  
        "<string>": "<string>.",  
        "<string>": "<string>"  
    }  
} | Query : <custom data-type="mention" data-id="id-39">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/harmonized-code/lookup | Master  Data | Product | Get Harmonized Code | /product-service/v1/harmonized-code/lookup | POST | {  
     "pageNumber":<value>,  
     "pageSize":<value>,  
     "lookup" : "<string>"    
} | {  
    "pageNumber": <value>,  
    "pageSize": <value>,  
    "totalCount": <value>,  
    "data": {  
        "<string>": "<string>.",  
        "<string>": "<string>"  
    }  
} | Query : <custom data-type="mention" data-id="id-40">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/marine-pollutant/lookup | Master  Data | Product | Get Marine Pollutant | /product-service/v1/marine-pollutant/lookup | POST | {  
     "pageNumber":<value>,  
     "pageSize":<value>,  
     "lookup" : "<string>"    
} | {  
    "pageNumber": <value>,  
    "pageSize": <value>,  
    "totalCount": <value>,  
    "data": {  
        "<string>": "<string>.",  
        "<string>": "<string>"  
    }  
} | Query : <custom data-type="mention" data-id="id-41">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/uom-hazmat-flashpoint/validation | Master Data | Master | Validate SI Flashpoint Temp | /master-data/v1/uom-hazmat-flashpoint/validation | POST | {  
    "externalItemId":<value>,  
    "tmsSourceSystemId":<value>  
} | {  
    "flag": true/false  
} | Query : <custom data-type="mention" data-id="id-42">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/uom-hazmat-boilingpoint/validation | Master Data | Master | Validate SI Boilingpoint Temp | /master-data/v1/uom-hazmat-boilingpoint/validation | POST | {  
    "externalItemId":<value>,  
    "tmsSourceSystemId":<value>  
} | {  
    "flag": true/false  
} | Query : <custom data-type="mention" data-id="id-43">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/hazmat-packing-group/validation | Master Data | Master | Validate Hazmat Package Group | /master-data/v1/hazmat-packing-group/validation | POST | { "packingGroup":"<string"  
}  
Or  
{  
  "externalItemId":"<string>",  
  "tmsSourceSystemId":"<string>"  
} | {  
“flag”:true/false  
} |  |
| /master-data/v1/product-service/v1/ship-class-description | Master Data | Product | Get Shipping Class Description by search filter | /master-data/v1/product-service/v1/ship-class-description | POST | {  
     "pageNumber":<value>,  
     "pageSize":<value>,  
     "lookup" : "<string>"    
} | {  
    "pageNumber": <value>,  
    "pageSize": <value>,  
    "totalCount": <value>,  
    "data": {  
        "<string>": "<string>.",  
        "<string>": "<string>"  
    }  
} |  |
| /master-data/v1/hazmatinfo | Master Data | Master | Get Hazmat Info | /master-data/v1/hazmatinfo | POST | {  "shipItemIdentifier":<value>,  
        "orgId":<value>  
} | {  
"itemDescription":<value>  
"productClass":<value>  
"nmfcCode":<value>  
"commodityCode":<value>  
"harmonizedCode":<value>  
"hazmatCode":<value>  
"hazmatClass":<value>  
"hazardId":<value>  
"hazmatDesc":<value>  
"hazPackGrp":<value>  
"wgkClsCd":<value>  
"tunnelCd":<value>  
"flashPtTemp":<value>  
"uomFlshPtTemp":<value>  
"boilingPtTemp":<value>  
"uomBoilingPtTemp":<value>  
"marinePollutantFlag":<value>  
} |  |
| /master-data/v1/batchlotnumber-type/lookup | Master Data | Product | Get BatchLotNumberType | /product-service/v1/batchlotnumber-type/lookup | POST | {  
     "pageNumber":<value>,  
     "pageSize":<value>,  
     "lookup" : "<string>"    
} | {  
    "pageNumber": <value>,  
    "pageSize": <value>,  
    "totalCount": <value>,  
    "data": {  
        "<string>": "<string>.",  
        "<string>": "<string>"  
    }  
} | Query : <custom data-type="mention" data-id="id-44">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/inco-code/lookup | Master Data | Product | Inco code lookup | /transportation-service/v1/inco-code/lookup | POST | {  
"lookup" : " "  
} | {  
"flag" : true/false  
} | Query : <custom data-type="mention" data-id="id-45">@Sakthivel Kaliswamy</custom>  to provide the query |
| /master-data/v1/product-service/v1/productclass/validation | Master Data | Product | Validate ProductClass | /master-data/v1/product-service/v1/productclass/validation | POST | { "externalItemId": "String", "tmsSourceSystemId":"String" } | true / false |  |
| /master-data/v1/equipment/mode-code-description/lookup | Master Data | Product | Get Equipment mode code and description based on Equipment Id | /master-data/v1/equipment/mode-code-description/lookup | POST | {  
    "pageNumber":0,  
    "pageSize":2,  
    "lookup":"String"  
} | {  
    "MODE_CODE": "String",  
    "MODE_DESCRIPTION": "String"  
} |  |
| /address/address-by-site-source | Address | Address | Get Address by Site Source details | /address/address-by-site-source | POST | {  
    "externalItemId":<value>,  
    "tmsSourceSystemId":<value>  
} | {  
    “siteName”:”<string>”,  
     “orgId”:”<string>”,  
    “address1”:”<string>”,  
     “address2”:”<string>”,  
     “address3”:”<string>”,  
     “locationId”:”<string>”,  
      “orgSystemOfRecord”:”<string>”  
} |  |
| `/master-data/v1/utc-timezones` | Master-data | Address | Get time zone details by ID | /master-data/v1/utc-timezones | GET |  | \[  
  { "IDL":  "(UTC-12:00) GMT-12:00"            },  
  { "BST":  "(UTC-11:00) GMT-11:00"            },  
  { "NT":   "(UTC-11:00) Pacific/Samoa"         },  
  { "HST":  "(UTC-11:00) US/Hawaii"             },  
  { "AHST": "(UTC-10:00) US/Aleutian"           },  
 ......  
 ......  
\] |  |
| /master-data/v1/uom/profile | Master-data | Master | Get OCM Profile using Org Id, Scac Id, Equip Id, Ship Direction, Profile Id  | /master-data/v1/ocm/profile | POST | {  
"orgId":”<string>”, "equipId":”<string>”,  
"scacId":”<string>”,   
"shipDirection":”<string>”, “profileType”:”<string>”,  
"profileId":”<string>”  
} | {  
"profileValue":<value>,  
"profileUom":<value>,  
"profileCurrency":<value>,  
"ocmId":<value>  
} | p_org_id         = Consignor TMS Org Id  
p_equip_id       = Equipment from the Shipment  
p_ship_direction = Shipment Ship Direction  
p_profile_id     = 98   -- Mode and Equipment  
p_profile_type   = 15   -- O2 Planning  **Profile Type = O2 Planning (15)**  After having discussion with Dave, we have added **scacId**, profileType, profileID in the request body is a required parameter  |
| /master-data/v1/ocm/profile | Master-data | Master | Get OCM Profile by equipment  | /master-data/v1/ocm/profile | POST | {  
"orgId":”<string>”, "equipId":”<string>”,  
"scacId":”<string>”,   
"shipDirection":”<string>”, “profileType”:15,  
"profileId":98  
} | {  
"profileValue":<value>,  
"profileUom":<value>,  
"profileCurrency":<value>,  
"ocmId":<value>  
} |  |
| /master-data/v1/ocm/profile | Master-data | Master | Get OCM Profile by mode | /master-data/v1/ocm/profile | POST | {  
"orgId":”<string>”, "equipId":”<string>”,  
"scacId":”<string>”,   
"shipDirection":”<string>”, “profileType”:15,  
"profileId":98  
} | {  
"profileValue":<value>,  
"profileUom":<value>,  
"profileCurrency":<value>,  
"ocmId":<value>  
} | -- Applies only to shipment with ONE load.  
\-- Mode is derived by Odyssey One from equipment.  
p_org_id         = Consignor TMS Org Id  
p_equip_id       = Equipment from the Shipment  
p_ship_direction = Shipment Ship Direction  
p_profile_id     = 98   -- Mode and Equipment  
p_profile_type   = 15   -- O2 Planning equipId- call API /master-data/v1/equipment/mode-code-description/lookup |
| /master-data/v1/ocm/profile | Master-data | Master | Get OCM Profile by special services | /master-data/v1/ocm/profile | POST | {  
"orgId":”<string>”, "equipId":”<string>”,  
"scacId":”<string>”,   
"shipDirection":”<string>”, “profileType”:15,  
"profileId":97  
} | {  
"profileValue":<value>,  
"profileUom":<value>,  
"profileCurrency":<value>,  
"ocmId":<value>  
} | -- Applies only to shipment with ONE load.  
\-- OCM Profile Lookup (SCAC not passed)  
p_org_id         = Consignor TMS Org Id  
p_equip_id       = Equipment from the Shipment  
p_ship_direction = Shipment Ship Direction  
p_profile_id     = 97   -- Special Services  
p_profile_type   = 15   -- O2 Planning |
| /master-data/v1/ocm/profile | Master-data | Master | Get OCM Profile by ship-direction and pay-terms | /master-data/v1/ocm/profile | POST | {  
"orgId":”<string>”, "equipId":”<string>”,  
"scacId":”<string>”,   
"shipDirection":”<string>”, “profileType”:15,  
"profileId":99  
} | {  
"profileValue":<value>,  
"profileUom":<value>,  
"profileCurrency":<value>,  
"ocmId":<value>  
} | -- Applies only to shipment with ONE load.  
\-- Pay term evaluated as shipment text value.  
p_org_id         = Consignor TMS Org Id  
p_equip_id       = Equipment from the Shipment  
p_ship_direction = Shipment Ship Direction  
p_profile_id     = 99  
p_profile_type   = 15   -- O2 Planning |
| /master-data/v1/ocm/profile | Master-data | Master | Get OCM Profile by utilization-volume | /master-data/v1/ocm/profile | POST | {  
"orgId":”<string>”, "equipId":”<string>”,  
"scacId":”<string>”,   
"shipDirection":”<string>”, “profileType”:15,  
"profileId":100  
} | {  
"profileValue":<value>,  
"profileUom":<value>,  
"profileCurrency":<value>,  
"ocmId":<value>  
} | p_org_id         = Consignor TMS Org Id  
p_equip_id       = Equipment from the Shipment  
p_ship_direction = Shipment Ship Direction  
p_profile_id     = 100  
p_profile_type   = 15 |
| /master-data/v1/ocm/profile | Master-data | Master | Get OCM Profile by utilization-weight | /master-data/v1/ocm/profile | POST | {  
"orgId":”<string>”, "equipId":”<string>”,  
"scacId":”<string>”,   
"shipDirection":”<string>”, “profileType”:15,  
"profileId":101  
} | {  
"profileValue":<value>,  
"profileUom":<value>,  
"profileCurrency":<value>,  
"ocmId":<value>  
} | p_org_id         = Consignor TMS Org Id  
p_equip_id       = Equipment from the Shipment  
p_ship_direction = Shipment Ship Direction  
p_profile_id     = 101  
p_profile_type   = 15 |
| /master-data/v1/customer-id/{relySourceId} | Master-data |  |  | `/master-data/v1/customer-id/{relySourceId}` | GET |  | { “customerId” : “<String>” } |  |
| /master-data/v1/equipment/{equipmentCode}/details | Master-data | Carrier Equipment | Get Equipment Details based on Equipment Code | /master-data/v1/equipment/{equipmentCode}/details | GET |  | {  
    "EQUIPMENT_DESCRIPTION": <value>, "MODE": <value>,   "MODE_DESCRIPTION": <value>  
} |  |
| /master-data/v1/uom/convert-unit | Master-data | /master-data/v1/uom/convert-unit | Convert UOM Unit Code of One UOM Unit Type to Another  | /master-data/v1/uom/convert-unit | POST | {  
    "fromType":"<string>",  
    "fromUom":"<string>",  
    "fromValue":"<string>",  
    "toType":"<string>",  
    "toUom":"<string>"  
} | <value> |  |
| /master-data/v1/special-services/details | Master-data | Master | API to get the summary or description of the special service(s) | /master-data/v1/special-services/details | POST | {  
  "codes": \["HAZ", "PJC"\]  
} | {  
  "data": \[  
    {  
      "code": "HAZ",  
      "description": "HAZARDOUS MATERIALS"  
    },  
    {  
      "code": "PJC",  
      "description": "PALLET JACK"  
    }  
  \]  
} |  |

Class - To be Added \*\*\*\*  <custom data-type="mention" data-id="id-46">@Venkata Kesavarao Seerla</custom> <custom data-type="mention" data-id="id-47">@Soni Sinha</custom> Please add the classes.

‌