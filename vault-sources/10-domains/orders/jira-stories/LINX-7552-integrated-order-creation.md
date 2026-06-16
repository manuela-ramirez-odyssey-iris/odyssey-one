# LINX-7552 — Integrated Order Creation & Validation

**Status:** Analysis  
**Jira:** https://odysseylogistics.atlassian.net/browse/LINX-7552  
**Child stories:** 381

## Epic Description

This EPIC introduces the functionality for the order domain to allow the creation of integrated orders received from external customer systems or applications. The process will ensure that all required information is collected efficiently and accurately. It will perform necessary mapping and validations on the received data before adding it, ensuring compliance with business rules and integration with master data. Once all information is entered, the order will need to be committed, during which additional validations will be performed before generating the order number. If there are any fallouts or validation errors in the process, the order should be available for review by the Odyssey team in a User Interface.

Notes:

1. Boomi will have a table to reference which process the customer is in (TMS or O2).  For customers using the O2 process, Boomi will populate a Source System reference field = O2
2. Today, we receive orders from TMS and do no validation before creating the order.  In Phase 2, we will need to do validation and move exceptions to a Failure Queue. The conditional logic for when O2 should do the validation is (Order.SourceSystem=O2).
3. When this condition is not met (Order.SourceSystem is null) the current logic remains (Legacy TMS orders will be processed the same way as they are being done currently).

---

# Stories

## LINX-5904 — Add Site / Location ID from Order Integration

**Status:** Todo  
**Type:** Story  
**Labels:** —

{'type': 'doc', 'version': 1, 'content': []}

---

## LINX-5978 — BE - Validations for Integrated Orders - Hazmat fields (OTMS-145)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Fields :

Hazmat Code, Hazmat Class, Hazmat Packing Group, Hazmat Description, Hazard ID Number  
Flashpoint / UOM, Boiling Point / UOM, Tunnel Code, WGK Class, Marine Pollutant

---

## LINX-5979 — BE-Address Validation- same Postal code is available in different cities

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done, QA_BLOCKED

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-313</custom> BR#2

BR#2 -Same Postal code is available in different cities

---

## LINX-5980 — BE - Validations for Integrated Orders - Measurement fields (OTMS-145)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Fields :

Volume Measurement, Tare Weight Measurement, Net Weight Measurement, Package Count  
Batch Lot Number Type, Width Measurement / UOM, Length Measurement / UOM, Height Measurement / UOM

---

## LINX-5982 — BE - Log the field scenarios for Product Class, Harmonized Code, Package Count

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Fields:

Third Party Reference Date, Third Party Reference Line Number, Third Party Reference Number, External Line Identifier	Delivery Appointment, Pickup Appointment , Product Class, Harmonized Code, Package Count

---

## LINX-5983 — BE-Address Validation- more than 1 result is available for the combination of region, postal code and country values

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done, QA_BLOCKED

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-313</custom> BR#2

More than 1 result is available for the combination of region, postal code and country values

---

## LINX-5986 — BE-Change in Order Header to accommodate field changes due to Timezone changes

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-423</custom> The schema of the order_info table has changed. So we need to add columns to store date_time and time_zone details.

---

## LINX-5987 — Validations for Integrated Orders - Additional fields

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done

As an  ~~OTMS~~ OdysseyONE user, I want to receive data from customer systems and have it validated so that I can use this data for integrated orders creation, edit and cancellation as needed.

---

## LINX-5989 — BE-Address Validation Service- ShipTo Address

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done, QA_BLOCKED

Region, Postal Code and Country should be validated in combination (not individually) for Ship To Address fields

---

## LINX-5990 — BE-Address Validation Service- Shipper Address

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done, QA_BLOCKED

Region, Postal Code and Country should be validated in combination (not individually) for Shipper fields

---

## LINX-6008 — DB- DB Design, tables creation, sequences for QA environment

**Status:** Done  
**Type:** Story  
**Labels:** BE

To create DB design document, ERD, Tables, Sequences required for order header/order line .

---

## LINX-6009 — Country, Region, City and Postal Code - Validation for Integrated Orders

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done

As an OTMS  user, I want to receive data from customer systems and have it mapped correctly so that I can use this data for integrated orders creation, edit and cancellation as needed.

---

## LINX-6019 — BE-Create Master Data API  for Packaging Identifier, InstructionType(OTMS-143)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

_(no description)_

---

## LINX-6020 — BE-Saving Order Header details in order_info table- Conditional fields fields

**Status:** Done  
**Type:** Story  
**Labels:** BE

To save order header details in order_info table with conditional fields

Order Status - NEW

---

## LINX-6023 — BE - Implement new API for Extract Time Zone by Location Id

**Status:** Done  
**Type:** Story  
**Labels:** BE

To extract timezone from address . Need to convert existing procedure of Old TMS to Java.  
  
Reference: [\[OTMS-525\] PlSQL Code Translation to understand the logical flow - Jira](https://odysseylogistics.atlassian.net/browse/OTMS-525)

---

## LINX-6031 — BE-Data Mapping for Integrated Orders- Logic for conditional fields

**Status:** Done  
**Type:** Story  
**Labels:** BE

‌

| Order Header | Ship To Address Line 1 |
| --- | --- |
| Order Header | Ship To Address City |
| Order Header | Ship To Address Region |
| Order Header | Ship To Address Postal Code |
| Order Header | Ship To Address Country |

---

## LINX-6033 — Validations for Integrated Orders - Mandatory fields

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done

As an OTMS  user, I want to receive data from customer systems and have it validated so that I can use this data for integrated orders creation, edit and cancellation as needed.

---

## LINX-6047 — BE-Validations for Integrated Orders - Mandatory fields- Create Custom Exception classes and Advice Controller (OTMS -143)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Create custom exception classes and advice controller to catch validation errors and exceptions.

---

## LINX-6049 — Validations for Integrated Orders - Conditional fields

**Status:** Ready for Development  
**Type:** Story  
**Labels:** OTMS_Phase1, Refinement_done

As an OTMS user, I want to receive data from customer systems and have it validated so that I can use this data for integrated orders creation, edit and cancellation as needed.

---

## LINX-6050 — BE-Validations for Integrated Orders - Mandatory fields- Save validation and exceptions (OTMS-143)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

The entity mapping table to store validation and exceptions for mandatory fields .

Table name : order_exception_detail

---

## LINX-6051 — BE-Data Mapping for Integrated Orders- Logic for conditional fields-Few more

**Status:** Done  
**Type:** Story  
**Labels:** BE

To process DTO and populate the entity beans.

| Order Header | Shipper Address Line 1 |
| --- | --- |
| Order Header | Shipper Address City |
| Order Header | Shipper Address Region |
| Order Header | Shipper Address Postal Code |
| Order Header | Shipper Address Country |
| Order Header | Requested Delivery Date |
| Order Header | Requested Ship Date |

---

## LINX-6053 — BE-Integrated Orders - Audit History for an Order

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

BR#2 (a)(b) OTMS-143

History of order will need to be maintained

Entity mapping with Table : **order_audit**

---

## LINX-6061 — BE- Create Master data api for Shipping Site Identifier , Ship To Identifier , Ship Item Identifier (OTMS-143)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD

_(no description)_

---

## LINX-6062 — Order - Order Modifications

**Status:** Todo  
**Type:** Story  
**Labels:** —

Order Modification refers to any change made to a customer order after it has been created, but before PGI/PGR. It is one of the most sensitive activities in supply chain workflows because changes in the order impact planning, routing, capacity, carriers, and cost.

Order Modifications can be made via integration or manually via UI. We need to accept order modifications on all changes: additions, updates, deletes prior to PGI. Once PGI/PGR has occurred updates should not be allowed. In future a Customer Profile setting would allow updates to be made via UI and/or Integration

  Note - order updates need to be passed to the Shipments if the order is on a shipment and there will be rules there for when to apply these updates based on the status of the shipment.  (We will need to work with Jana on how updates will be processed to orders on shipments)

---

## LINX-6069 — BE - Validation  For Update scenario, Delete Flag ='N' and Order Identifier match required in Order domain (OTMS-143)

**Status:** Done  
**Type:** Story  
**Labels:** —

_(no description)_

---

## LINX-6071 — BE - Review comments for Order Service

**Status:** Done  
**Type:** Story  
**Labels:** —

1. Create Order / Update order DTO should be same .
2. Create and update api uri should be as per LLD 
3.  There should be a single  order request  DTO  containing order header and order line as member 
4. Avoid duplicate DTOs  by implementing inheritance  wherever applicable.
5.  Replace the existing  Source Application entity class in  Request DTO  with  Source Application Code (String )
6.  Ensure  Junit is  addressed for this change 
7.  API payload to be shared to testing team.

---

## LINX-6075 — BE-Saving Order Header details in order_info table-Non-Mandatory fields

**Status:** Done  
**Type:** Story  
**Labels:** BE

To save order header details in order_info table for non-mandatory fields

Order Status - NEW

---

## LINX-6077 — BE Edit order fields to be saved in db (OTMS -848)

**Status:** Done  
**Type:** Story  
**Labels:** —

Update via Patch request for the "Buyer fields" field are not getting stored in QA database.

---

## LINX-6093 — BE - OrderHeader ORM changes(modify Timestamp, Delivery Appointment, Pickup Appointment)(OTMS-143 and OTMS -145)

**Status:** Done  
**Type:** Story  
**Labels:** —

(otms-145,otms-143)

To store the timezone data in order_info table

BE to split the datetime to Date_time and Timezone and store in order_info table

---

## LINX-6098 — BE-Validations for Integrated Orders - Mandatory fields- instruction number, instruction, instruction type

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD, BE_LLD_Done

The validation logic to be added for instruction number, instruction, instruction type.

OTMS-143

---

## LINX-6105 — BE- Validation for equipment Type and shipdirection (OTMS-145)

**Status:** Done  
**Type:** Story  
**Labels:** —

_(no description)_

---

## LINX-6106 — BE-Validations for Integrated Orders - Additional fields

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done, QA_BLOCKED

Additional fields : 

Contact, Incoterm Information, Pickup Number, 

Delivery Appointment, Pickup Appointment,

Equipment Code, Carrier SCAC, Equipment Number, Ship Direction Type

---

## LINX-6112 — Data Mapping for Integrated Orders

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done

As an OTMS   user, I want to receive data from customer systems and have it mapped correctly so that I can use this data for integrated orders creation, edit and cancellation as needed.

---

## LINX-6113 — BE-Validations for Integrated Orders - Additional fields Seller fields

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Additional Fields :

Seller Name

Seller Address1

Seller Address2

Seller Address3

Seller City

Seller Region

Seller Country

Seller Postal Code

Seller VAT Number

---

## LINX-6114 — BE-Validations for Integrated Orders - Additional fields Buyer fields (OTMS-145)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Additional Fields:

Buyer Name

Buyer Address1

Buyer Address2

Buyer Address3

Buyer City

Buyer Region

Buyer Country

Buyer Postal Code

Buyer VAT Number

---

## LINX-6115 — BE-Validations for Integrated Orders - Additional fields BillTo fields

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Additional Fields :

Bill To Name

Bill To Address1

Bill To Address2

Bill To Address3

Bill To City

Bill To Region

Bill To Country

Bill To Postal Code

Bill To VAT Number

---

## LINX-6119 — Dev-API GW Setup Masterdata and Address service

**Status:** Done  
**Type:** Story  
**Labels:** DevOps

This task addresses APIGW onboarding for all newly created endpoints after the AWS environment is ready.

---

## LINX-6132 — BE-Validations for Integrated Orders - Mandatory fields- Planning Date Type and Freight terms(OTMS-143)

**Status:** Done  
**Type:** Story  
**Labels:** BE

The validation logic to be added for Planning Date Type and freight terms

OTMS-143

---

## LINX-6134 — BE-Validations for Integrated Orders - Mandatory fields- modify timestamp(OTMS-143) excluding extract of time zone from address

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD, BE_LLD_Done

The validation logic to be added for modify timestamp.

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-143</custom>

Apart from the extracting time zone from address

---

## LINX-6138 — BE -OrderHeader ORM changes(FrieghtTerm changes)(OTMS-143)

**Status:** Done  
**Type:** Story  
**Labels:** —

_(no description)_

---

## LINX-6153 — BE-Validations for Integrated Orders - Mandatory fields- Packaging Identifier, gross weight, load constraints, Gross Weight Measurement (OTMS-143)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD, BE_LLD_Done

The validation logic to be added Line Identifier  for Packaging Identifier, gross weight, load constraints, Gross Weight Measurement.

OTMS-143

---

## LINX-6154 — BE-Validations for Integrated Orders - Mandatory fields-Shipping Site Identifier, Ship To Identifier, Ship Item Identifier (OTMS-143)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD, BE_LLD_Done

The validation logic to be added for Shipping Site Identifier, Ship To Identifier, Ship Item Identifier.

OTMS-143

---

## LINX-6156 — BE Edit order fields to be saved in db (OTMS -848)

**Status:** Done  
**Type:** Story  
**Labels:** —

Update via Patch request for the "Buyer fields" field are not getting stored in QA database.

---

## LINX-6157 — BE Edit order fields to be saved in db (OTMS -848)

**Status:** Done  
**Type:** Story  
**Labels:** —

Update via Patch request for the "Buyer fields" field are not getting stored in QA database.

---

## LINX-6168 — BE-Data Mapping for Integrated Orders-Cancel Order 

**Status:** Done  
**Type:** Story  
**Labels:** BE

Cancel order at Order Header Level

The order should be soft deleted.

Order Status - <TBD>

---

## LINX-6169 — BE-Edit Order Line details in order_line table

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD, BE_LLD_Done

To edit order header line details in order_line table

---

## LINX-6170 — BE-Address Validation Service

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

_The order service will be calling Address Service for address validation._

Region, Postal Code and Country should be validated in combination (not individually)

What I know for address validation, these are the steps

 As discussed with <custom data-type="mention" data-id="id-0">@Janardhana</custom>:

1. If the customer send the Consignor location code, this needs to be validated against the location code (master data) to pull the address
2. Same for Consignee
3. The file can also have address with Region, Zip, City and Country. There are some backend logic involved like Zip match, then City match, Country Match and all these combination need to match to validate the address (like Zip can give matching cities, then the combination of cities to be matched against the cities sent, etc). As we don’t know the detailed logic in the code (as we don’t have the BRE), we are doing only individual match for Zip, Region, City and Country.
4. If Customer send the address in the address field, then we will use the address as it is. No validation on it (Address 1, 2 and 3)

---

## LINX-6179 — BE-Validations for Integrated Orders - Mandatory fields- delete flag and order identifier (OTMS-143)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD, BE_LLD_Done

The validation logic to be added for delete flag and order identifier.

OTMS-143

---

## LINX-6184 — BE - Add few fields while saving and editing order

**Status:** Done  
**Type:** Story  
**Labels:** BE

Need to save below field in **order_involved_party**

OrgId  → partyId  
OrgName → source_tbl_primary_key (this fields the data of Shipper, ShipTo, Buyer, Seller, BillTo)  
LongName → partyName

---

## LINX-6190 — BE - Extract Time Zone from address

**Status:** Done  
**Type:** Story  
**Labels:** BE

To extract timezone from address . Need to convert existing procedure of Old TMS to Java. (Covered in [\[OTMS-921\] BE - Implement new API for Extract Time Zone by Location Id - Jira](https://odysseylogistics.atlassian.net/browse/OTMS-921))

Modify Timestamp

Delivery Appointment

Pickup Appointment

Address validation and timezone extraction can be done only for this below scenarios :

Country+postal code  
country+region  
country+postalcode+region

‌

if you get the location id from the address service, use the location id to get the time zone details.

1. In case we get multiple locations, we throw message and do not process for time zone. We cannot set UTC for the first record that we get. **-- this is incorrect and needs to be UTC as you are not able to get the time zone for the location (similar to point no. 3)**
2. In case we get single location record and extract the time zone, the order is processed successfully (considering other validations in scope)
3. In case we get single location record but we do not get time zone for that location, we will set it to UTC.

cc: <custom data-type="mention" data-id="id-0">@Singaram</custom> <custom data-type="mention" data-id="id-1">@Niranjana Sridharan</custom> <custom data-type="mention" data-id="id-2">@Janardhana</custom> <custom data-type="mention" data-id="id-3">@Priyadharshini Rajendrababu</custom> <custom data-type="mention" data-id="id-4">@Venkata Kesavarao Seerla</custom> <custom data-type="mention" data-id="id-5">@Sakthivel Kaliswamy</custom> <custom data-type="mention" data-id="id-6">@Soni Sinha</custom>

---

## LINX-6196 — BE-Saving Order Header details in order_info table- Mandatory fields

**Status:** Done  
**Type:** Story  
**Labels:** BE

To save order header details in order_info table with mandatory fields

Order Status - NEW

---

## LINX-6197 — BE-Data Mapping for Integrated Orders-Order Line- Non-Mandatory fields

**Status:** Done  
**Type:** Story  
**Labels:** BE

Order Line Entity Mapping for optional Fields

Mapping with New TMS table **order_line**

---

## LINX-6198 — BE-Data Mapping for Integrated Orders-Order Line- Mandatory fields

**Status:** Done  
**Type:** Story  
**Labels:** BE

Order Line Entity Mapping for required Fields

Mapping with New TMS table **order_line**

---

## LINX-6199 — BE-Data Mapping for Integrated Orders- Create Order Header Entity Mapping-Conditional fields

**Status:** Done  
**Type:** Story  
**Labels:** BE

Order Header Entity Mapping for conditional Fields

Mapping with New TMS table **order_info**

---

## LINX-6202 — BE-Data Mapping for Integrated Orders- Create Order Header Entity Mapping-non-mandatory fields

**Status:** Done  
**Type:** Story  
**Labels:** BE

Order Header Entity Mapping for optional Fields

Mapping with New TMS table **order_info**

---

## LINX-6203 — BE-Data Mapping for Integrated Orders- Create Order Header Entity Mapping-mandatory fields

**Status:** Done  
**Type:** Story  
**Labels:** BE

Order Header Entity Mapping for required Fields

Mapping with New TMS table **order_info**

---

## LINX-6204 — BE-Edit Order Header details in order_info table

**Status:** Done  
**Type:** Story  
**Labels:** BE

To edit order header details in order_info table

---

## LINX-6205 — DB- DB Design, tables creation,sequences,ER diagram

**Status:** Done  
**Type:** Story  
**Labels:** BE

To create DB design document, ERD, Tables, Sequences required for order header/order line .

---

## LINX-6207 — BE-Saving Order Line details in order_line table

**Status:** Done  
**Type:** Story  
**Labels:** BE

To save order header line details in order_line table

Order Line Status - <TBD>

---

## LINX-7495 — BE - LLD Creation

**Status:** Done  
**Type:** Task  
**Labels:** —

Create LLD for Integrated orders creation process

---

## LINX-7502 — LLD Creation

**Status:** Done  
**Type:** Task  
**Labels:** —

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-169</custom> <custom data-type="smartlink" data-id="id-1">https://odysseylogistics.atlassian.net/browse/OTMS-170</custom>

---

## LINX-7503 — LLD Creation

**Status:** Done  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-7520 — LLD creation

**Status:** Done  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-7526 — QA-API GW Setup Masterdata and Address service

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

QA-API GW Setup Masterdata and Address service

---

## LINX-7538 — Sprint 6>>Unable to create and update order getting Internal server Error

**Status:** Done  
**Type:** Defect  
**Labels:** —

### Unable to create and update order getting Internal server error

---

## LINX-7539 — BE - Validation not handled for missing fields

**Status:** Done  
**Type:** Defect  
**Labels:** —

# BE - Validation not handled for missing fields

---

## LINX-7543 — Unable to create and update Orders via Postman, getting 500 Internal Server Error.

**Status:** Done  
**Type:** Defect  
**Labels:** —

Unable to create and update Orders via Postman, getting 500 Internal Server Error.

---

## LINX-7576 — To verify the update order with field "Delete flag =  N" and random value in order id field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the update order with field "Delete flag =  N" and random value in order id field.

---

## LINX-7577 — To verify the update order with field "Delete flag =  N" and existing value from DB in order id field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the update order with field "Delete flag =  N" and existing value from DB in order id field.

---

## LINX-7578 — To verify the update order with field "Delete flag =  (blank)" and existing value from DB in order id field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the update order with field "Delete flag = (Blank)  " and existing value from DB in order id field.

---

## LINX-7579 — Verify if Integrated Orders should be created with 'New' status by default.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders should be created with 'New' status by default.

---

## LINX-7580 — To verify the update order with field "Delete flag =  N" and blank value in order id field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the update order with field "Delete flag = N" and blank value in order id field.

---

## LINX-7592 — Verify the Ship To Address validation by updating invalid values to region, postal code and country combination in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify the Ship To Address validation by updating invalid values to region, postal code and country combination in the payload

---

## LINX-7594 — Verify the Shipper Address validation by updating invalid values to region, postal code and country combination in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify the Shipper Address validation by updating invalid values to region, postal code and country combination in the payload

---

## LINX-7595 — Verify the Buyer Address validation by updating invalid values to region, postal code and country combination in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify the Buyer Address validation by updating invalid values to region, postal code and country combination in the payload

---

## LINX-7596 — Verify the Seller Address validation by updating invalid values to region, postal code and country combination in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify the Seller Address validation by updating invalid values to region, postal code and country combination in the payload

---

## LINX-7597 — Verify the Bill To Address validation by updating invalid values to region, postal code and country combination in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify the Bill To Address validation by updating invalid values to region, postal code and country combination in the payload

---

## LINX-7598 — To verify the edit order details for conditional fields by updating a value in Shipper Address Postal Code field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Shipper Address Postal code field in the payload

---

## LINX-7599 — To verify  the saving order header details by providing the payload with unique "order identifier" and existing "customer id".

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with unique "order identifier" and existing "customer id".

---

## LINX-7600 — To verify  the saving order header details by providing the payload with exisiting order identifier and customer id

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with exisiting order identifier and customer id

---

## LINX-7601 — To verify  the saving order header details by providing the payload with unique "order identifier" and "customer id".

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with unique "order identifier" and "customer id".

---

## LINX-7602 — To Verify the postal code by passing multiple values to region and country which matches with customer sent city

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the postal code by passing multiple values to region and country which matches with customer sent city

---

## LINX-7603 — To Verify the postal code by passing multiple values to region and country which does not match with  customer sent city

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the postal code by passing multiple values to region and country which does not match with customer sent city

---

## LINX-7606 — To Verify the postal code by passing multiple values to region and country which matches with customer sent city

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the postal code by passing multiple values to region and country which matches with customer sent city

---

## LINX-7608 — To Verify the postal code by passing multiple values to region and country which does not match with  customer sent city

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the postal code by passing multiple values to region and country which does not match with customer sent city

---

## LINX-7610 — To verify the saving the order detail without passing the JSON payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving the order detail without passing the JSON payload

---

## LINX-7611 — To verify  the saving order header details by providing the payload with exisiting "order identifier" and Unique "customer id".

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with exisiting "order identifier" and Unique "customer id".

---

## LINX-7612 — To verify the edit order details for conditional fields by updating a value in Shipper Address country field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Shipper Address country field in the payload

---

## LINX-7613 — To verify the edit order details for conditional fields by updating a value in Ship To Address Line 1 field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Ship To Address Line 1 field in the payload

---

## LINX-7614 — To verify the edit order details for conditional fields by updating a value in Ship To Address City field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Ship To Address City field in the payload

---

## LINX-7615 — To verify the edit order details for conditional fields by updating a value in Ship To Address Region field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Ship To Address Region field in the payload

---

## LINX-7616 — To verify the edit order details for conditional fields by updating a value in Ship To Address Postal Code field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Ship To Address Postal code field in the payload

---

## LINX-7617 — To verify the edit order details for conditional fields by updating a value in Ship To Address country field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Ship To Address country field in the payload

---

## LINX-7618 — To verify the edit order details for conditional fields by updating a value in Requested Delivery date field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Requested Delivery date field in the payload

---

## LINX-7619 — To verify the edit order details for conditional fields by updating a value in Requested Ship date field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Requested Ship date field in the payload

---

## LINX-7620 — To Verify the mandatory field shipping site identifier while creating the order by passing value which is not matching with site ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the mandatory field shipping site identifier while creating the order by passing value which is not matching with site ID from master data

---

## LINX-7621 — To Verify the mandatory field ship to identifier while creating the order by passing value which is matching with site ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the mandatory field ship to identifier while creating the order by passing value which is matching with site ID from master data

---

## LINX-7622 — To Verify the mandatory field ship to identifier while creating the order by passing value which is not matching with site ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the mandatory field ship to identifier while creating the order by passing value which is not matching with site ID from master data

---

## LINX-7623 — To verify the mandatory field ship item identifier while creating the order by passing the values which is not matching with item ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field ship item identifier while creating the order by passing the values which is not matching with item ID from master data

---

## LINX-7624 — To verify the mandatory field ship item identifier while creating the order by passing the values which is matching with item ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field ship item identifier while creating the order by passing the values which is matching with item ID from master data

---

## LINX-7625 — To Verify mandatyory field shipping site identifier while Updating the order by passing the value which is matching with site ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify mandatyory field shipping site identifier while Updating the order by passing the value which is matching with site ID from master data

---

## LINX-7626 — To Verify the mandatory field shipping site identifier while Updating the order by passing value which is not matching with site ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the mandatory field shipping site identifier while Updating the order by passing value which is not matching with site ID from master data

---

## LINX-7627 — To Verify the mandatory field ship to identifier while Updating the order by passing value which is matching with site ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the mandatory field ship to identifier while Updating the order by passing value which is matching with site ID from master data

---

## LINX-7631 — To verify the create/edit order details for additional fields by passing the value to Flashpoint / UOM, Boiling Point / UOM, WGK Class, Product Class fields .

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Flashpoint / UOM, Boiling Point / UOM, WGK Class, Product Class fields .

---

## LINX-7633 — To Verify mandatyory field shipping site identifier while creating the order by passing the value which is matching with site ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify mandatyory field shipping site identifier while creating the order by passing the value which is matching with site ID from master data

---

## LINX-7635 — Verify if Integrated Orders API is successfully posted without providing 'Buyer Country' field on the request payload.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted without providing 'Buyer Country' field on the request payload.

---

## LINX-7636 — To verify the order creation mandatory fields freight terms by providing the value which was not present in master data.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order creation mandatory fields freight terms by providing the value which was not present in master data.

---

## LINX-7637 — To verify the edit order line details by updating the heightValue field with existing Id and orderlineId

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order line details by updating the heightValue field with existing Id and orderlineId

---

## LINX-7638 — Verify if Integrated Orders API is successfully posted with providing 'Buyer Country' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted with providing 'Buyer Country' field on the request payload and validate that data is saved in the database.

---

## LINX-7639 — To verify the edit order line details by updating the netWeightValue field with existing Id and orderlineId

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order line details by updating the netWeightValue field with existing Id and orderlineId

---

## LINX-7640 — To verify the order creation mandatory fields freight terms by providing the value which is present in master data.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order creation mandatory fields freight terms by providing the value which is present in master data.

---

## LINX-7641 — Verify if Integrated Orders API is not successfully posted with incorrect ISO code for 'Buyer Country' field on the request payload.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is not successfully posted with incorrect ISO code for 'Buyer Country' field on the request payload.

---

## LINX-7642 — To verify the mandatory field while creating the order by providing the freight term as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field while creating the order by providing the freight term as blank

---

## LINX-7643 — To verify the edit order line details by updating the id field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order line details by updating the id field

---

## LINX-7644 — Verify if Integrated Orders API is successfully posted without providing 'Buyer VAT Number' field on the request payload.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted without providing 'Buyer VAT Number' field on the request payload.

---

## LINX-7645 — To verify the edit order line details by updating the orderlineId field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order line details by updating the orderlineId field

---

## LINX-7646 — To verify the order Update mandatory fields freight terms by providing the value which was not present in master data.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order Update mandatory fields freight terms by providing the value which was not present in master data.

---

## LINX-7647 — Verify if Integrated Orders API is successfully posted with providing 'Buyer VAT Number' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted with providing 'Buyer VAT Number' field on the request payload and validate that data is saved in the database.

---

## LINX-7648 — To verify the order Update mandatory fields freight terms by providing the value which is present in master data.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order Update mandatory fields freight terms by providing the value which is present in master data.

---

## LINX-7649 — To verify the mandatory field while Updating the order by providing the freight term as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field while Updating the order by providing the freight term as blank

---

## LINX-7650 — Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer VAT Number' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer VAT Number' field on the request payload and validate that data is saved in the database.

---

## LINX-7655 — To Verify the mandatory field ship to identifier while Updating the order by passing value which is not matching with site ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the mandatory field ship to identifier while Updating the order by passing value which is not matching with site ID from master data

---

## LINX-7656 — To verify the edit order line details by updating the  thirdPartyReferenceNumber field with existing Id and orderlineId

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order line details by updating the  thirdPartyReferenceNumber field with existing Id and orderlineId

---

## LINX-7657 — To verify the mandatory field ship item identifier while Updating the order by passing the values which is not matching with item ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field ship item identifier while Updating the order by passing the values which is not matching with item ID from master data

---

## LINX-7659 — To verify the mandatory field ship item identifier while Updating the order by passing the values which is matching with item ID from master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field ship item identifier while Updating the order by passing the values which is matching with item ID from master data

---

## LINX-7660 — To verify the edit order line details by updating the PackageCount field with existing Id and orderlineId

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order line details by updating the PackageCount field with existing Id and orderlineId

---

## LINX-7667 — To verify the order creation for conditional field Requested Delivery Date by passing blank value when planning date type is Requested Delivery

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order creation for conditional field Requested Delivery Date by passing blank value when planning date type is Requested Delivery

---

## LINX-7668 — To verify the edit order details for integrated orders Seller fields by passing values to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for integrated orders Seller fields by passing values to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

---

## LINX-7669 — To verify the create/edit order header details for additional fields "Delivery Appointment"

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order header details for additional fields "Delivery Appointment"

---

## LINX-7670 — To verify  the edit order header details of address validation service by updating the value to ShipTo Address Region in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details of address validation service by updating the value to ShipTo Address Region in the payload

---

## LINX-7671 — To verify the order creation for conditional field Requested Ship Date by passing blank value when planning date type is Requested Ship date

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order creation for conditional field Requested Ship Date by passing blank value when planning date type is Requested Ship date

---

## LINX-7672 — To verify the create/edit order header details for additional fields "Pickup Appointment"

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order header details for additional fields "Pickup Appointment"

---

## LINX-7673 — To verify  the edit order header details of address validation service by updating the value to Ship To Address Postal Code in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details of address validation service by updating the value to Ship To Address Postal Code in the payload

---

## LINX-7674 — To verify the order creation when the Requested Delivery Date field is filled with past dates relative to the current date

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order creation when the Requested Delivery Date field is filled with past dates relative to the current date

---

## LINX-7675 — Verify that when a valid Region and City are provided but the Country is invalid, the API returns an error message "Location not found"

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that when a valid Region and City are provided but the Country is invalid, the API returns an error message "Location not found"

---

## LINX-7676 — Verify that when multiple matches are found, the API returns an error message "Multiple matches for Location" and sets the time zone to UTC if address validation fails

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that when multiple matches are found, the API returns an error message "Multiple matches for Location" and sets the time zone to UTC if address validation fails

---

## LINX-7677 — To verify the create/edit order header details for additional fields "Equipment Code".

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order header details for additional fields "Equipment Code".

---

## LINX-7678 — To verify  the edit order header details of address validation service by updating the value to Ship To Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details of address validation service by updating the value to Ship To Address Country in the payload

---

## LINX-7679 — To verify the order creation when the Requested Ship Date field is filled with past dates relative to the current date

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order creation when the Requested Ship Date field is filled with past dates relative to the current date

---

## LINX-7680 — To verify the create/edit order header details for additional fields "Ship Direction type"

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order header details for additional fields "Ship Direction type"

---

## LINX-7681 — To verify the saving order header details for integrated orders- additional fields by passing blank value to Contact, Incoterm Information, Pickup Number field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order header details for integrated orders- additional fields by passing blank value to Contact, Incoterm Information, Pickup Number field

---

## LINX-7682 — To verify the edit order details for conditional fields by updating a value in Shipper Address Line 1 field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Shipper Address Line 1 field in the payload

---

## LINX-7683 — To verify the edit order details for conditional fields by updating a value in Shipper Address City field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Shipper Address City field in the payload

---

## LINX-7684 — To verify the saving order header details for integrated orders- additional fields by passing value to Delivery Appointment field when Time Zone and Ship To address are not available

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order header details for integrated orders- additional fields by passing value to Delivery Appointment field when Time Zone and Ship To address are not available

---

## LINX-7685 — To verify the create/edit order details for additional fields by passing the value to contact field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to contact field

---

## LINX-7686 — To verify the create/edit order details for additional fields by passing the value to Incorterm Information field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Incorterm Information field

---

## LINX-7687 — To verify the edit order details for conditional fields by updating a value in Shipper Address Region field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for conditional fields by updating a value in Shipper Address Region field in the payload

---

## LINX-7688 — To verify the saving order header details for integrated orders- additional fields by passing value to Delivery Appointment field when Time Zone is not available and Ship To address is available

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order header details for integrated orders- additional fields by passing value to Delivery Appointment field when Time Zone is not available and Ship To address is available

---

## LINX-7689 — To verify the mandatory field of modify timestamp while updating order by providing the delete flag = N and sourceRecordUpdatedTime field as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field of modify timestamp while updating order by providing the delete flag = N and sourceRecordUpdatedTime field as blank

---

## LINX-7690 — To verify the saving order header details for integrated orders- additional fields by passing blank value to Deliver Appointment and Pickup Appointment field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order header details for integrated orders- additional fields by passing blank value to Delivery Appointment and Pickup Appointment field

---

## LINX-7691 — To verify the create/edit order details for additional fields by passing the value to Pickup Number field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Pickup Number field

---

## LINX-7692 — To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address Postal code and correct values to Ship To Address Region and Ship To Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address Postal code and correct values to Ship To Address Region and Ship To Address Country in the payload

---

## LINX-7693 — To verify the mandatory field of order edit payload by providing   instruction type field a value

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field of order edit payload by providing   instruction type field a value

---

## LINX-7694 — To verify the saving order details for conditional fields by passing blank value to Ship To Address Country field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for conditional fields by passing blank value to Ship To Address Country field in the payload

---

## LINX-7695 — To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address Country and correct values to Ship To Address Region and Ship To Address Postal Code in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address Country and correct values to Ship To Address Region and Ship To Address Postal Code in the payload

---

## LINX-7696 — To verify  the saving order header details by providing the payload with unique "order identifier" and "customer id" along with the non-mandatory fields.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with unique "order identifier" and "customer id" along with the non-mandatory fields.

---

## LINX-7697 — To verify the create/edit order details for additional fields by passing the value to Carrier SCAC field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Carrier SCAC field

---

## LINX-7698 — To Verify the postal code by passing multiple values to region and country which does not match with customer sent city

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the postal code by passing multiple values to region and country which does not match with customer sent city

---

## LINX-7699 — To verify the saving order header details for integrated orders- additional fields by passing value to Pickup Appointment field when Time Zone and Shipper address are not available

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order header details for integrated orders- additional fields by passing value to Pickup Appointment field when Time Zone and Shipper address are not available

---

## LINX-7700 — To Verify the postal code by passing multiple values to region and country which matches with customer sent city

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the postal code by passing multiple values to region and country which matches with customer sent city

---

## LINX-7701 — To verify  the saving order header details by providing the payload with existing order identifier and customer id along with the non-mandatory fields.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with exisiting order identifier and customer id along with the non-mandatory fields.

---

## LINX-7702 — To verify the create/edit order details for additional fields by passing the value to Equipment number field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Equipment number field

---

## LINX-7703 — To verify the saving order header details for integrated orders- additional fields by passing value to Pickup Appointment field when Time Zone is not available and Shipper address is available

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order header details for integrated orders- additional fields by passing value to Pickup Appointment field when Time Zone is not available and Shipper address is available

---

## LINX-7704 — Verify the Buyer Address validation by passing invalid values to region, postal code and country combination in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify the Buyer Address validation by passing invalid values to region, postal code and country combination in the payload

---

## LINX-7705 — To verify the saving order header details for integrated orders- additional fields by passing value to Equipment Code field which matches with Equipment master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order header details for integrated orders- additional fields by passing value to Equipment Code field which matches with Equipment master data

---

## LINX-7706 — Verify the Seller Address validation by passing invalid values to region, postal code and country combination in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify the Seller Address validation by passing invalid values to region, postal code and country combination in the payload

---

## LINX-7707 — Verify that when the city is not provided but the combination of Postal Code, Region, and Country is valid, the time zone defaults to UTC

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that when the city is not provided but the combination of Postal Code, Region, and Country is valid, the time zone defaults to UTC

---

## LINX-7708 — Verify that when an invalid Postal Code is provided, the API returns an error message "Location not found" and sets UTC as the default time zone

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that when an invalid Postal Code is provided, the API returns an error message "Location not found" and sets UTC as the default time zone

---

## LINX-7709 — Verify that when the city is not provided, the time zone defaults to UTC

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that when the city is not provided, the time zone defaults to UTC

---

## LINX-7710 — Verify that the correct time zone is determined based on a valid combination of Postal Code, Region, City, and Country

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that the correct time zone is determined based on a valid combination of Postal Code, Region, City, and Country

---

## LINX-7711 — To verify  the saving order header details by providing the payload with exisiting "order identifier" and Unique "customer id" along with the non-mandatory fields.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with exisiting "order identifier" and Unique "customer id" along with the non-mandatory fields.

---

## LINX-7712 — To verify the saving order header details for integrated orders- additional fields by passing blank value to Equipment Code and Equipment Number field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order header details for integrated orders- additional fields by passing blank value to Equipment Code and Equipment Number field

---

## LINX-7713 — To verify the create/edit order details for additional fields by passing the value to Third Party Reference Number, Third Party Reference Line Number, Third Party Reference Date field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Third Party Reference Number, Third Party Reference Line Number, Third Party Reference Date field

---

## LINX-7714 — To verify the create/edit order details for additional fields by passing the value to Full name, Shipper address line 2, shipper address line 3 fields

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Full name, Shipper address line 2, shipper address line 3 fields

---

## LINX-7715 — To verify the saving order header details for integrated orders- additional fields by passing value to Ship Direction type field which matches with Ship Direction master data

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order header details for integrated orders- additional fields by passing value to Ship Direction type field which matches with Ship Direction master data

---

## LINX-7716 — To verify the saving order header details for integrated orders- additional fields by passing blank value to Carrier SCAC and Ship Direction Type

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order header details for integrated orders- additional fields by passing blank value to Carrier SCAC and Ship Direction Type

---

## LINX-7717 — To verify the create/edit order details for additional fields by passing the value to Full name, Ship to address line 2, ship to address line 3 fields

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Full name, Ship to address line 2, ship to address line 3 fields

---

## LINX-7718 — To verify the edit order details for integrated orders- additional fields by updating the value to contact field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for integrated orders- additional fields by updating the value to contact field

---

## LINX-7719 — To verify the create/edit order details for additional fields by passing the value to Package Count field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Package Count field

---

## LINX-7720 — To verify the datamapping for integrated orders with Json field with Database column field mapping for "Header Section" fields

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the datamapping for integrated orders with Json field with Database column field mapping for "Header Section" fields

---

## LINX-7721 — To verify the create/edit order details for additional fields by passing the value to Batch Lot Number, Net Weight Measurement, Tare Weight Measurement, Volume Measurement fields

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Batch Lot Number, Net Weight Measurement, Tare Weight Measurement, Volume Measurement fields

---

## LINX-7722 — To verify the edit order details for integrated orders- additional fields by updating the value to Incorterm Information field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for integrated orders- additional fields by updating the value to Incorterm Information field

---

## LINX-7723 — Verify the Timezone field in the manage User Page

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the datamapping for integrated orders with Json field with Database column field mapping for "Order header" fields

---

## LINX-7724 — To verify the create/edit order details for additional fields by passing the value to Hazmat Code, Hazmat Class, Hazmat Packing Group, Hazmat Description fields

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Hazmat Code, Hazmat Class, Hazmat Packing Group, Hazmat Description fields

---

## LINX-7725 — To verify the edit order details for integrated orders- additional fields by updating the value to Pickup Number field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for integrated orders- additional fields by updating the value to Pickup Number field

---

## LINX-7726 — To verify the edit order details for integrated orders- additional fields by updating the value to Carrier SCAC field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for integrated orders- additional fields by updating the value to Carrier SCAC field

---

## LINX-7727 — Verify the "UserName" field in the manage User Page should Renamed to "Name"

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the datamapping for integrated orders with Json field with Database column field mapping for "Line" fields

---

## LINX-7728 — To verify the create/edit order details for additional fields by passing the value to Hazard ID Number, Tunnel Code, Marine Pollutant fields

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Hazard ID Number, Tunnel Code, Marine Pollutant fields

---

## LINX-7729 — To verify the edit order details for integrated orders- additional fields by updating the value to Equipment number  field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for integrated orders- additional fields by updating the value to Equipment number field

---

## LINX-7730 — To verify the create/edit order details for additional fields by passing the value to Net Value, Harmonized Code, Package Count, Batch Lot Number Type fields

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Net Value, Harmonized Code, Package Count, Batch Lot Number Type fields

---

## LINX-7731 — To verify the mandatory field of modify timestamp while updating order by changing value to sourceRecordUpdatedTime field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field of modify timestamp while updating order by changing value to sourceRecordUpdatedTime field

---

## LINX-7732 — To verify the create/edit order details for additional fields by passing the value to External Line Identifierr field

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to External Line Identifier field

---

## LINX-7733 — To verify  the saving order header details by providing the payload with unique "order identifier" and existing "customer id"along with the non-mandatory fields.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with unique "order identifier" and existing "customer id" along with the non-mandatory fields.

---

## LINX-7734 — To verify the create/edit order details for additional fields by passing the value to Height Measurement / UOM, length Measurement / UOM, width Measurement / UOM fields .

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the create/edit order details for additional fields by passing the value to Height Measurement / UOM, length Measurement / UOM, width Measurement / UOM fields .

---

## LINX-7735 — To verify  the saving order header details by providing the payload with unique "order identifier" and "customer id" along with the conditional fields.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with unique "order identifier" and "customer id" along with the conditional fields.

---

## LINX-7736 — To verify  the saving order header details by providing the payload with existing order identifier and customer id along with the conditional fields.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with existing order identifier and customer id along with the conditional fields.

---

## LINX-7737 — To verify  the saving order header details by providing the payload with unique "order identifier" and existing "customer id"along with the conditional fields.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with unique "order identifier" and existing "customer id"along with the conditional fields.

---

## LINX-7738 — To verify  the saving order header details by providing the payload with exisiting "order identifier" and Unique "customer id" along with the conditional fields.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details by providing the payload with exisiting "order identifier" and Unique "customer id" along with the conditional fields.

---

## LINX-7739 — To verify the saving order details for conditional fields by passing blank value to Shipper Address Line 1 field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for conditional fields by passing blank value to Shipper Address Line 1 field in the payload

---

## LINX-7740 — To verify the saving order details for conditional fields by passing blank value to Shipper Address City field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for conditional fields by passing blank value to Shipper Address City field in the payload

---

## LINX-7741 — To verify the saving order details for conditional fields by passing blank value to Shipper Address Region field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for conditional fields by passing blank value to Shipper Address Region field in the payload

---

## LINX-7742 — To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address Postal code and correct values to Shipper Address Region and shipper Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address Postal code and correct values to Shipper Address Region and shipper Address Country in the payload

---

## LINX-7743 — To verify the saving order details for conditional fields by passing blank value to Shipper Address Country field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for conditional fields by passing blank value to Shipper Address Country field in the payload

---

## LINX-7744 — Verify the Bill To Address validation by passing invalid values to region, postal code and country combination in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify the Bill To Address validation by passing invalid values to region, postal code and country combination in the payload

---

## LINX-7745 — To verify the mandatory field of order creation payload by providing   instruction number field as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field of order creation payload by providing   instruction number field as blank

---

## LINX-7746 — To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address Postal code and correct values to Shipper Address Region and shipper Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address Postal code and correct values to Shipper Address Region and shipper Address Country in the payload

---

## LINX-7747 — To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address Country and correct values to Shipper Address Region and shipper Address Postal Code in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address Country and correct values to Shipper Address Region and shipper Address Postal Code in the payload

---

## LINX-7748 — Verify the Ship To Address validation by passing invalid values to region, postal code and country combination in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify the Ship To Address validation by passing invalid values to region, postal code and country combination in the payload

---

## LINX-7749 — To verify the saving order details for conditional fields by passing blank value to Ship To Address Line 1 field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for conditional fields by passing blank value to Ship To Address Line 1 field in the payload

---

## LINX-7750 — To verify the mandatory field of order creation payload by providing   instruction field as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field of order creation payload by providing   instruction field as blank

---

## LINX-7751 — Verify the Shipper Address validation by passing invalid values to region, postal code and country combination in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify the Shipper Address validation by passing invalid values to region, postal code and country combination in the payload

---

## LINX-7752 — To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address Country and correct values to Shipper Address Region and shipper Address Postal Code in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address Country and correct values to Shipper Address Region and shipper Address Postal Code in the payload

---

## LINX-7753 — To Verify the mandatory fields              "Delete flag " and "order identifier"  While creating the order by passing "Delete flag" = N and Order identifier as unique value.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the mandatory fields              "Delete flag " and "order identifier"  While creating the order by passing "Delete flag" = N and Order identifier as unique value.

---

## LINX-7754 — To verify  the save order header details of address validation service by passing correct values to Shipper Address Region, Shipper Address Postal Code, and shipper Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the save order header details of address validation service by passing correct values to Shipper Address Region, Shipper Address Postal Code, and shipper Address Country in the payload

---

## LINX-7755 — To Verify the mandatory fields              "Delete flag " and "order identifier"  While updating the order by passing "Delete flag" = N and Order identifier should match with order domain.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the mandatory fields              "Delete flag " and "order identifier"  While updating the order by passing "Delete flag" = N and Order identifier should match with order domain.

---

## LINX-7756 — To verify the mandatory field of order creation payload by providing   instruction type field as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field of order creation payload by providing   instruction type field as blank

---

## LINX-7757 — To verify the saving order details for conditional fields by passing blank value to Ship To Address City field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for conditional fields by passing blank value to Ship To Address City field in the payload

---

## LINX-7758 — To verify the additional field "Contact" while creating the order.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the additional field "Contact" while creating the order.

---

## LINX-7759 — To verify the saving order details for conditional fields by passing blank value to Ship To Address Region field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for conditional fields by passing blank value to Ship To Address Region field in the payload

---

## LINX-7760 — To Verify the mandatory fields              "Delete flag " and "order identifier"  While deleting the order by passing "Delete flag" = Y and Order identifier should match with Client Order ID

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the mandatory fields              "Delete flag " and "order identifier"  While deleting the order by passing "Delete flag" = Y and Order identifier should match with Client Order ID

---

## LINX-7761 — To verify the mandatory field of order creation payload by providing   instruction field and instruction type field as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field of order creation payload by providing   instruction field and instruction type field as blank

---

## LINX-7762 — To verify  the edit order header details of address validation service by updating the value to Shipper Address Region in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details of address validation service by updating the value to Shipper Address Region in the payload

---

## LINX-7763 — To verify the saving order details for the fields "Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number"

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for the fields "Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number"

---

## LINX-7764 — To Verfiy the Mandatory field "Delete flag" while creating a order by passing blank values.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verfiy the Mandatory field "Delete flag" while creating a order by passing blank values.

---

## LINX-7765 — To verify  the edit order header details of address validation service by updating the value to Shipper Address Postal Code in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details of address validation service by updating the value to Shipper Address Postal Code in the payload

---

## LINX-7766 — To verify the mandatory field of order creation payload by providing   instruction number field and instruction field as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field of order creation payload by providing   instruction number field and instruction field as blank

---

## LINX-7767 — To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address region and correct values to Ship To Address Postal code and Ship To Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address region and correct values to Ship To Address Postal code and Ship To Address Country in the payload

---

## LINX-7768 — To verify  the edit order header details of address validation service by updating the value to Shipper Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details of address validation service by updating the value to Shipper Address Country in the payload

---

## LINX-7769 — To Verify the mandatory fields              "Delete flag " and "order identifier"  While creating the order by passing "Delete flag" = N and Order identifier as Blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To Verify the mandatory fields              "Delete flag " and "order identifier"  While creating the order by passing "Delete flag" = N and Order identifier as Blank.

---

## LINX-7770 — To verify the saving order details for conditional fields by passing blank value to Ship To Address Postal code field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for conditional fields by passing blank value to Ship To Address Postal code field in the payload

---

## LINX-7771 — To verify the edit order details for the fields "Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number"

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for the fields "Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number"

---

## LINX-7772 — To verify the mandatory field of order edit payload by providing   instruction field a value

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field of order edit payload by providing instruction field a value

---

## LINX-7773 — To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address region and correct values to Shipper Address Postal code and shipper Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address region and correct values to Shipper Address Postal code and shipper Address Country in the payload

---

## LINX-7774 — To verify the saving order details for conditional fields by passing blank value to Shipper Address Postal code field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for conditional fields by passing blank value to Shipper Address Postal code field in the payload

---

## LINX-7775 — To verify the saving order details for integrated orders buyer fields by passing values to buyer name, buyer Address1, buyer Address2, buyer Address3, buyer city, buyer region, buyer country, buyer Postal Code, buyer VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for integrated orders buyer fields by passing values to buyer name, buyer Address1, buyer Address2, buyer Address3, buyer city, buyer region, buyer country, buyer Postal Code, buyer VAT number

---

## LINX-7776 — To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address region and correct values to Ship To Address Postal code and ship To Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address region and correct values to Ship To Address Postal code and ship To Address Country in the payload

---

## LINX-7777 — To verify the mandatory field of order edit payload by providing   instruction number field a value

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field of order edit payload by providing   instruction number field a value

---

## LINX-7778 — To verify the edit order details for integrated orders buyer fields by passing values to buyer name, buyer Address1, buyer Address2, buyer Address3, buyer city, buyer region, buyer country, buyer Postal Code, buyer VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for integrated orders buyer fields by passing values to buyer name, buyer Address1, buyer Address2, buyer Address3, buyer city, buyer region, buyer country, buyer Postal Code, buyer VAT number

---

## LINX-7779 — To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address Postal code and correct values to Ship To Address Region and ship To Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address Postal code and correct values to Ship To Address Region and ship To Address Country in the payload

---

## LINX-7780 — To verify the saving order details for integrated orders Seller fields by passing values to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for integrated orders Seller fields by passing values to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

---

## LINX-7781 — To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address Country and correct values to Ship To Address Region and ship To Address Postal Code in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Ship To Address Country and correct values to Ship To Address Region and ship To Address Postal Code in the payload

---

## LINX-7782 — To verify  the save order header details of address validation service by passing correct values to Ship To Address Region, Ship To Address Postal Code, and ship To Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the save order header details of address validation service by passing correct values to Ship To Address Region, Ship To Address Postal Code, and ship To Address Country in the payload

---

## LINX-7784 — To verify the mandatory field while Updating the order by providing the planning date as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field while Updating the order by providing the planning date as blank

---

## LINX-7785 — To verify the mandatory fields while Updating the order by providing values in frieght terms.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory fields while Updating the order by providing values in frieght terms.

---

## LINX-7787 — To verify the order Update mandatory fields freight terms by providing the value which was not present in master data.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order Update mandatory fields freight terms by providing the value which was not present in master data.

---

## LINX-7788 — To verify the order Update mandatory fields freight terms by providing the value which is present in master data.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order Update mandatory fields freight terms by providing the value which is present in master data.

---

## LINX-7789 — To verify the extract timezone from address by providing values to region and country field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the extract timezone from address by providing values to region and country field in the payload

---

## LINX-7791 — To verify the mandatory field while Updating the order by providing the freight term as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field while Updating the order by providing the freight term as blank

---

## LINX-7792 — To verify the extract timezone from address by providing values to region, postal code and country field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the extract timezone from address by providing values to region, postal code and country field in the payload

---

## LINX-7816 — To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address region and correct values to Shipper Address Postal code and shipper Address Country in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the saving order header details of address validation service by passing incorrect value to Shipper Address region and correct values to Shipper Address Postal code and shipper Address Country in the payload

---

## LINX-7817 — To verify the mandatory field planning date type while creating the order by providing requested delivery date

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field planning date type while creating the order by providing requested delivery date

---

## LINX-7818 — To verify the mandatory field planning date type while creating the order by providing requested ship date

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field planning date type while creating the order by providing requested ship date

---

## LINX-7819 — To verify the mandatory field while creating the order by providing the planning date as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field while creating the order by the providing planning date as blank

---

## LINX-7821 — To verify the mandatory fields while creating the order by providing values in frieght terms.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory fields while creating the order by providing values in frieght terms.

---

## LINX-7823 — To verify the order creation mandatory fields freight terms by providing the value which was not present in master data.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order creation mandatory fields freight terms by providing the value which was not present in master data.

---

## LINX-7824 — To verify the order creation mandatory fields freight terms by providing the value which is present in master data.

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the order creation mandatory fields freight terms by providing the value which is present in master data.

---

## LINX-7831 — To verify the mandatory field while creating the order by providing the freight term as blank

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field while creating the order by providing the freight term as blank

---

## LINX-7832 — To verify the mandatory field planning date type while Updating the order by providing requested delivery date

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field planning date type while Updating the order by providing requested delivery date

---

## LINX-7833 — To verify the mandatory field planning date type while Updating the order by providing requested ship date

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the mandatory field planning date type while Updating the order by providing requested ship date

---

## LINX-7834 — To verify the extract timezone from address by providing values to postal code and country field in the payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the extract timezone from address for by providing values to postal code and country field in the payload

---

## LINX-7835 — To verify the edit order details for integrated orders Seller fields by updating values to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for integrated orders Seller fields by updating values to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

---

## LINX-7836 — To verify the edit order details for integrated orders Seller fields by passing blank values to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for integrated orders Seller fields by passing blank values to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

---

## LINX-7842 — To verify the edit order header details without passing the JSON payload

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order header details without passing the JSON payload

---

## LINX-7843 — To verify  the edit order header details by providing the payload with exisiting "order identifier" and Unique "customer id".

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details by providing the payload with exisiting "order identifier" and Unique "customer id".

---

## LINX-7844 — To verify  the edit order header details by providing the payload with unique "order identifier" and existing "customer id".

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details by providing the payload with unique "order identifier" and existing "customer id".

---

## LINX-7845 — To verify the saving order details for integrated orders Bill To fields by passing blank value to Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for integrated orders Bill To fields by passing blank value to Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number

---

## LINX-7846 — To verify  the edit order header details by providing the payload with exisiting order identifier and customer id

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details by providing the payload with exisiting order identifier and customer id

---

## LINX-7847 — To verify the saving order details for integrated orders Bill To fields by passing value to Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for integrated orders Bill To fields by passing value to Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number

---

## LINX-7848 — To verify the edit order details for integrated orders Bill To fields by updating values to Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for integrated orders Bill To fields by updating values to Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number

---

## LINX-7849 — To verify  the edit order header details by providing the payload with unique "order identifier" and "customer id".

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details by providing the payload with unique "order identifier" and "customer id".

---

## LINX-7850 — To verify the edit order details for integrated orders Bill To fields by passing blank values to Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the edit order details for integrated orders Bill To fields by passing blank values to Bill To name, Bill To Address1, Bill To Address2, Bill To Address3, Bill To city, Bill To region, Bill To country, Bill To Postal Code, Bill to VAT number

---

## LINX-7851 — To verify  the edit order header details by providing the payload with Existing "Orderheader id".

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details by providing the payload with Existing "Orderheader id".

---

## LINX-7852 — To verify the saving order details for integrated orders Seller fields by passing blank value to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for integrated orders Seller fields by passing blank value to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

---

## LINX-7853 — To verify the saving order details for integrated orders Seller fields by passing value to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify the saving order details for integrated orders Seller fields by passing value to Seller name, Seller Address1, Seller Address2, Seller Address3, Seller city, Seller region, Seller country, Seller Postal Code, Seller VAT number

---

## LINX-7856 — Verify if Integrated Orders API is successfully posted without providing 'Buyer Name' field on the request payload.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted without providing 'Buyer Name' field on the request payload.

---

## LINX-7857 — Verify if Integrated Orders API is successfully posted with providing 'Buyer Name' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted with providing 'Buyer Name' field on the request payload and validate that data is saved in the database.

---

## LINX-7858 — Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer Name' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer Name' field on the request payload and validate that data is saved in the database.

---

## LINX-7859 — Verify if Integrated Orders API is successfully posted without providing 'Buyer Address1' field on the request payload.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted without providing 'Buyer Address1' field on the request payload.

---

## LINX-7860 — Verify if Integrated Orders API is successfully posted with providing 'Buyer Address1' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted with providing 'Buyer Address1' field on the request payload and validate that data is saved in the database.

---

## LINX-7861 — Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer Address1' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer Address1' field on the request payload and validate that data is saved in the database.

---

## LINX-7862 — Verify if Integrated Orders API is successfully posted without providing 'Buyer Address2' field on the request payload.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted without providing 'Buyer Address2' field on the request payload.

---

## LINX-7863 — Verify if Integrated Orders API is successfully posted with providing 'Buyer Address2' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted with providing 'Buyer Address2' field on the request payload and validate that data is saved in the database.

---

## LINX-7865 — Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer Address2' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer Address2' field on the request payload and validate that data is saved in the database.

---

## LINX-7870 — Verify if Integrated Orders API is successfully posted without providing 'Buyer Address3' field on the request payload.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted without providing 'Buyer Address3' field on the request payload.

---

## LINX-7871 — Verify if Integrated Orders API is successfully posted with providing 'Buyer Address3' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted with providing 'Buyer Address3' field on the request payload and validate that data is saved in the database.

---

## LINX-7872 — Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer Address3' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer Address3' field on the request payload and validate that data is saved in the database.

---

## LINX-7873 — Verify if Integrated Orders API is successfully posted without providing 'Buyer City' field on the request payload.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted without providing 'Buyer City' field on the request payload.

---

## LINX-7874 — Verify if Integrated Orders API is successfully posted with providing 'Buyer City' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted with providing 'Buyer City' field on the request payload and validate that data is saved in the database.

---

## LINX-7875 — Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer City' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer City' field on the request payload and validate that data is saved in the database.

---

## LINX-7876 — Verify if Integrated Orders API is successfully posted without providing 'Buyer Region' field on the request payload.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted without providing 'Buyer Region' field on the request payload.

---

## LINX-7877 — To verify  the edit order header details by providing the payload with Unique "Orderheader id".

**Status:** New  
**Type:** Test Case  
**Labels:** —

To verify  the edit order header details by providing the payload with Unique "Orderheader id".

---

## LINX-7878 — Verify if Integrated Orders API is successfully posted with providing 'Buyer Region' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted with providing 'Buyer Region' field on the request payload and validate that data is saved in the database.

---

## LINX-7880 — Verify if Integrated Orders API is not successfully posted with incorrect Region name or ISO code for 'Buyer Region' field on the request payload.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is not successfully posted with incorrect Region name or ISO code for 'Buyer Region' field on the request payload.

---

## LINX-7882 — Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer Region' field on the request payload and validate that data is saved in the database.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if Integrated Orders API is successfully posted by patch method to update 'Buyer Region' field on the request payload and validate that data is saved in the database.

---

## LINX-8063 — Data Mapping for Integrated Orders

**Status:** In Development  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE user, I want to receive data from customer systems and have it mapped correctly so that I can use this data for integrated orders creation, edit and cancellation as needed.

---

## LINX-8064 — Validations for Integrated Orders - Mandatory fields

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE  user, I want to receive data from customer systems and have it validated so that I can use this data for integrated orders creation, edit and cancellation as needed.

---

## LINX-8066 — Validations for Integrated Orders - Conditional fields

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE user, I want to receive data from customer systems and have it validated so that I can use this data for integrated orders creation, edit and cancellation as needed.

---

## LINX-8067 — Validations for Integrated Orders - Additional fields

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an  OdysseyONE user, I want to receive data from customer systems and have it validated so that I can use this data for integrated orders creation, edit and cancellation as needed.

---

## LINX-8068 — Country, Region, City and Postal Code - Validation for Integrated Orders

**Status:** In Development  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE  user, I want to receive data from customer systems and have it mapped correctly so that I can use this data for integrated orders creation, edit and cancellation as needed.

---

## LINX-8182 — BE - Mapping exercise for Bhoomi XML→JSON Transformation with LINX Order API Contract for Order Creation

**Status:** Closed  
**Type:** Story  
**Labels:** —

LINX exposes an API to create an Order. The Customer ERP Portal sends **Order Creation XML** to **Bhoomi**, which must convert this to **JSON** conforming to the **LINX Order contract**. We need to analyze, map, and update Bhoomi’s transformation logic to ensure the output JSON strictly meets the LINX contract (fields, nesting, data types, etc.,)

---

## LINX-8183 — BE - Mapping Exercise for convert Order Interface JSON to OrderIn JSON

**Status:** Closed  
**Type:** Story  
**Labels:** —

LINX requires a domain-specific **OrderIn JSON** payload for successful Order Creation. Bhoomi currently receives Customer ERP XML and converts to Order JSON, which must be transformed internally into the **LINX-compliant OrderIn JSON format**.

To enable smooth integration between ERP → Bhoomi → LINX, we need a detailed **mapping exercise** to align all fields, data types, structures, and validation rules.

### **Objectives**

1. Understand the **LINX OrderIn JSON contract** (schema + examples).
2. Collect sample **Customer ERP JSON** payloads.
3. Create a **field-level mapping document**:

    * ERP JSON fields → LINX OrderIn JSON fields
    * Data types
    * Mandatory/optional fields
    * Default values
    * Validations
    
4. Identify any **gaps** where ERP JSON does not directly supply required LINX fields.
5. Document transformation rules
6. Produce final mapping spec + review

---

## LINX-8184 — BE - Mapping exercise for LINX OrderOut JSON to Order Interface JSON

**Status:** Closed  
**Type:** Story  
**Labels:** —

After an order is created in **LINX**, the system emits an **OrderOut JSON** representing the authoritative order state in the LINX domain. For Order UI and edit/view processing, we must transform this **OrderOut JSON** into a **Customer ERP–specific JSON** format.  
  
Perform a comprehensive **mapping analysis** and produce a complete specification that maps **LINX OrderOut JSON → Customer ERP JSON**, including field-level transformations, validations, defaults, and enumerations.  

### **Objectives**

1. Obtain **LINX OrderOut JSON contract** (schema & examples covering happy path and edge cases).
2. Gather **Customer ERP JSON** target format requirements (schema, UI needs, constraints, and examples).
3. Create a **field-by-field mapping**:

    * LINX OrderOut → Customer ERP JSON
    * Data types, formats (dates, currencies), precision, and nullability
    * Required vs optional fields & defaulting rules
    * Enum/value mappings (status codes, payment types, fulfillment states)
    
4. Identify **gaps** and **derivations** (computed/aggregated fields).
5. Document transformation rules
6. Produce final mapping spec + review

---

## LINX-8185 — DB - Database design for Order Domain

**Status:** Todo  
**Type:** Story  
**Labels:** —

_(no description)_

---

## LINX-8186 — BE - LLD update for Master Service

**Status:** Todo  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-8189 — BE - Master Service validation component enhancements for Order Interface payload

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Needs to improve the validation component enhance the loggers to see end to end flow of the Masterdata calls  
  
This component needs to integrate with the v3/order API

---

## LINX-8384 — BE: Order: Update Field Mapping sheet for orderInterface json

**Status:** Closed  
**Type:** Task  
**Labels:** BE

_(no description)_

---

## LINX-8394 — BE - Implement mandatory field validation component for Order Interface payload

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Implement a reusable validation component in the Order Creation flow that:

1. validates request payloads against those definitions,
2. returns actionable error codes/messages for the UI and upstream services, and
3. supports **config-driven** changes

‌

Outcomes:

* Prevent order creation when required fields are missing or invalid.
* Provide consistent error structure and localization-ready messages.
* Ensure idempotency and performance under load.

‌

**Note:** The outcome of this task will be integrated with the  [\[LINX-8189\] BE - Validation component implementation against Master Service for Order Interface pay…](https://odysseylogistics.atlassian.net/browse/LINX-8189)

---

## LINX-8395 — BE - Implement conditional field validation component for Order Interface payload

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Implement a reusable validation component for conditional fields in the Order Creation flow that:

1. validates request payloads against those definitions,
2. returns actionable error codes/messages for the UI and upstream services, and
3. supports **config-driven** changes

‌

Outcomes:

* Prevent order creation when the field(s) validation fails (validate against the **Master Service**)
* Provide consistent error structure and localization-ready messages.
* Ensure idempotency and performance under load.

‌

**Note:** The outcome of this task will be integrated with the  [\[LINX-8189\] BE - Validation component implementation against Master Service for Order Interface pay…](https://odysseylogistics.atlassian.net/browse/LINX-8189)

---

## LINX-8396 — BE - Implement additional field validation component for Order Interface payload

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Implement a reusable validation component for additional fields in the Order Creation flow that:

1. validates request payloads against those definitions,
2. returns actionable error codes/messages for the UI and upstream services, and
3. supports **config-driven** changes

‌

Outcomes:

* Prevent order creation when the field(s) validation fails (validate against the **Master Service**)
* Provide consistent error structure and localization-ready messages.
* Ensure idempotency and performance under load.

‌

**Note:** The outcome of this task will be integrated with the  [\[LINX-8189\] BE - Validation component implementation against Master Service for Order Interface pay…](https://odysseylogistics.atlassian.net/browse/LINX-8189)

---

## LINX-8397 — BE - Implement address field validation component for Order Interface payload

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Implement a validation component for address related fields in the Order Creation flow that:

1. validates the fields against the Address Service
2. returns actionable error codes/messages for the UI and upstream services, and
3. supports **config-driven** changes

‌

Outcomes:

* Prevent order creation when the field(s) validation fails (validate against the **Address Service**)
* Provide consistent error structure and localization-ready messages.
* Ensure idempotency and performance under load.

‌

**Note:** The outcome of this task will be integrated with the  [\[LINX-8189\] BE - Validation component implementation against Master Service for Order Interface pay…](https://odysseylogistics.atlassian.net/browse/LINX-8189)

‌

---

## LINX-8398 — BE - Component implementation for conversion of Order Interface JSON to OrderIn JSON

**Status:** Closed  
**Type:** Task  
**Labels:** BE

As part of the order intake pipeline, systems submit orders in the **Order Interface JSON** format. We need a robust, versioned converter that validates and transforms input to the canonical **OrderIn** structure, enforcing data quality, logging, and error handling.  

Implement a reusable component/service that:

1. Validates input against **Order Interface JSON schema**
2. Transforms it into **OrderIn JSON schema** 
3. Applies mapping rules, defaulting, normalization, and enrichment
4. Returns successful responses or structured error payloads with traceability

---

## LINX-8469 — BE - Validations for Order Identifier, Source System and Delete Flag of Integrated Orders (LINX-8064)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

The validation logic to be added for Order identifier, Delete flag and Source System

‌

| **Mandatory field for order creation / edit / cancellation** | **Validation to be done** | **Error message to be recorded in the UI** |
| --- | --- | --- |
| **Order Identifier** | For create, Delete Flag = 'N' and Order identifier present For Update scenario, Delete Flag ='N' and Order Identifier match required in Order domain  If Delete Flag = 'Y', this needs to match with any of the existing Client Order IDs | Order Identifier missing |
| **Source System (from Boomi)** | Value Should only be ‘O2' or 'Null’. (Boomi will have a table to reference which process the customer is in (TMS or O2). It will have a Source System reference field. If Order.SourceSystem=O2, it needs to be validated & If Order.SourceSystem=Null, it will be processed similar to legacy TMS orders) | ‘Incorrect Source System' - If any value other than ‘O2’ / 'Null’ is entered ‘Source System Value is missing’ - If no value is entered. |
| **Delete Flag** | Can be blank. If Delete Flag = ‘Y', order needs to be cancelled in  OdysseyONE. If Delete Flag = 'N’, order can be created or edited. Needs Order Identifier (see above) | Order Identifier missing (same as above, if Order Identifier is not available) |

---

## LINX-8470 — BE - Validations for Modify Timestamp of Integrated Orders (LINX-8064)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs ti implement the validation logic for below fields

| **Modify Timestamp** | Should be in the format Date Time and Time zone. Can be blank. If Delete Flag = 'N’, this is required. If Time zone is not available, then UTC can be considered as time zone by default. When Shipper Address is not available & consider Time zone based on Shipper Address if it is available | Modify Timestamp missing (if Delete Flag = 'N’ and the value is empty) Time zone auto added (this can be a warning message instead of error message) |
| --- | --- | --- |

---

## LINX-8473 — BE - Validations for Line Identifier, Planning Date Type and Freight Terms of Integrated Orders (LINX-8064)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement validation logic for below fields

‌

| **Line Identifier** | Number assigned to this line within the order. If not present, add number to each line item starting with '1' | Line count auto updated (this can be a warning message instead of error message) |
| --- | --- | --- |
| **Planning Date Type** | Needs to be either Requested Delivery Date or Requested Ship Date. Cannot be blank | Planning Date Type parameter missing (if it is blank) |
| **Freight Terms** | Any value can be sent and needs to be captured. If it is not part of Master data, then that information has to be recorded as error / warning message type. Cannot be blank | Freight Terms missing (in case Freight Term blank/missing) Freight Terms not found (error message) |

---

## LINX-8474 — BE - Validations for Shipping Site Identifier, Ship To Identifier, Ship Item Identifier and Packaging Identifier of Integrated Orders (LINX-8064)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement the validations for below fields

‌

| **Shipping Site Identifier** | Cannot be blank. If present, should be matched to Site ID from Master data | ‘Site ID missing’ - blank/missing ‘Site ID not found’ - if there is no matching site ID from Master Data table   |
| --- | --- | --- |
| **Ship To Identifier** | Cannot be blank. If present, should be matched to Site ID from Master data | ‘Site ID missing’ - blank/missing ‘Site ID not found’ - if there is no matching site ID from Master Data table |
| **Ship Item Identifier** | Should match with Ship Item ID from Master Data. Cannot be blank or a foreign value | Ship Item Identifier missing (if it is blank) Ship Item Identifier not found (if there is no matching item ID from Master Data table) Note: TMS has client configuration on Item Identifier. It can allow order creation even if the item doesn't match to the Master data list. |
| **Packaging Identifier** | Should match with Package ID from Master Data. Cannot be blank or a foreign value | Packaging Identifier missing (if it is blank) Package Identifier not found (if there is no match) |

---

## LINX-8475 — BE - Validations for Gross Weight, Load Constraint and Gross Weight Measurement of Integrated Orders (LINX-8064)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement validation for the below fields  
  

| **Gross Weight** | Cannot be blank or negative | Gross Weight missing (if it is blank) Gross Weight incorrect (if it is negative) |
| --- | --- | --- |
| **Load Constraints** | Value can be Yes or No but not blank. If value is not received, error message to be recorded | Load Constraints flag missing (missing / foreign value) |
| **Gross Weight Measurement** | Cannot be blank. Needs to be a standard UoM for gross weight and if it is a foreign value, error message to be recorded | Gross Weight measurement missing (if it is blank) Gross Weight UoM not found (foreign value) |

---

## LINX-8476 — BE - Validations for Instruction Number, Instruction and Instruction Type of Integrated Orders (LINX-8064)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement the validations for below fields  
  

| **Instruction Number** Note: Instruction List is option. If Instruction Number or Instruction or Instruction Type sent (optional), all these are mandatory fields | Value cannot be blank. If value is there & there is error in extracting that information, error message to be recorded | Instruction number missing (if it is blank)   |
| --- | --- | --- |
| **Instruction** Note: Instruction List is option. If Instruction Number or Instruction or Instruction Type sent (optional), all these are mandatory fields | Value cannot be blank. If value is there & there is error in extracting that information, error message to be recorded | Instruction missing (if it is blank) |
| **Instruction Type**   Note: (optional and it sent should match to Master data list) | Value can be blank only if there is no Instruction Number. If Instruction Number(s) are there, Instruction Type can only be any of the standard Instruction Type(s) and error message needs to be recorded if it is a foreign value | Instruction Type incorrect (foreign value) |

---

## LINX-8493 — BE - Shipper Address fields validation of Integrated Orders (LINX-8066)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Need to validate the Address fields by calling AddressService  
Region, Postal Code and Country should be validated in combination (not individually) for Shipper fields  
  

| Shipper Address Line 1 | Can be blank. If Address Line 1 is sent by customer, it needs to be captured in the order |   |
| --- | --- | --- |
| Shipper Address City | Can be blank. If city is sent by customer, it needs to be captured in the order. No validation of city information with master data |   |
| Shipper Address Region Note: Region, Postal Code and Country should be validated in combination (not individually) | Can be blank. If Address is sent by customer, it needs to be captured in the order. In case Region name or ISO code is incorrect, error message needs to be recorded (should be validated along with Postal code and Country) | Shipper Address not valid |
| Shipper Address Postal Code Note: Region, Postal Code and Country should be validated in combination (not individually) | Can be blank. If Address is sent by customer, it needs to be captured in the order. In case Postal code is incorrect, basis the Country, error message needs to be recorded (should be validated along with Region and Country) | Shipper Address not valid |
| Shipper Address Country Note: Region, Postal Code and Country should be validated in combination (not individually) | Can be blank. If Address is sent by customer, it needs to be captured in the order. In case Country ISO code (2 letter code) is incorrect, error message needs to be recorded (should be validated along with Postal code and Region) | Shipper Address not valid |

---

## LINX-8494 — BE - ShipTo Address fields validation of Integrated Orders (LINX-8066)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Need to validate the Address fields by calling AddressService  
Region, Postal Code and Country should be validated in combination (not individually) for Ship To fields  
  

| Ship To Address Line 1 | Same rules as Shipper Address Line 1 |   |
| --- | --- | --- |
| Ship To Address City | Same rules as Shipper Address City |   |
| Ship To Address Region | Same rules as Shipper Address Region | Ship To Address not valid |
| Ship To Address Postal Code | Same rules as Shipper Address Postal Code | Ship To Address not valid |
| Ship To Address Country | Same rules as Shipper Address Country | Ship To Address not valid |

---

## LINX-8495 — BE - Validation for Requested Ship and Delivery Date of Integrated Orders (LINX-8066)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement validation for the below field  

| Requested Ship Date | Required if Planning Date Type = “Requested Ship Date” If Ship Date < current date  (for the Shipper address time zone), then requested date is invalid | Requested Ship Date required   Requested Ship Date in the past (warning message)  |
| --- | --- | --- |

| Requested Delivery Date | Required if Planning Date Type = “Requested Delivery” If Delivery Date < current date (for the Ship To address time zone), then requested date is invalid | Requested Delivery Date required   Requested Delivery Date in the past (warning message) |
| --- | --- | --- |

---

## LINX-8496 — BE - Validation and mapping for the Bill To, Buyer and Seller fields of Integrated Orders (LINX-8067)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement the validation and mapping for the below fields

| Bill To Name | Can be blank. If it is sent, needs to be captured in the backend |   |
| --- | --- | --- |
| Bill To Address1 | Can be blank. If it is sent, needs to be captured in the backend |   |
| Bill To Address2 | Can be blank. If it is sent, needs to be captured in the backend |   |
| Bill To Address3 | Can be blank. If it is sent, needs to be captured in the backend |   |
| Bill To City | Can be blank. If it is sent, needs to be captured in the backend. No validation of city information with master data |   |
| Bill To Region | Can be blank. If it is sent, needs to be captured in the backend |   |
| Bill To Country | Can be blank. If it is sent, needs to be captured in the backend |   |
| Bill To Postal Code | Can be blank. If it is sent, needs to be captured in the backend |   |
| Bill To VAT Number | Can be blank. If it is sent, needs to be captured in the backend. VAT Number validation is not added in this story, as a requirement since this is just to be stored in the backend |   |
| Buyer Name | Can be blank. If it is sent, needs to be captured in the backend |   |
| Buyer Address1 | Can be blank. If it is sent, needs to be captured in the backend |   |
| Buyer Address2 | Can be blank. If it is sent, needs to be captured in the backend |   |
| Buyer Address3 | Can be blank. If it is sent, needs to be captured in the backend |   |
| Buyer City | Same rules as Bill To City |   |
| Buyer Region | Same rules as Bill To Region |   |
| Buyer Country | Same rules as Bill To Country |   |
| Buyer Postal Code | Same rules as Bill To Postal Code |   |
| Buyer VAT Number | Can be blank. If it is sent, needs to be captured in the backend. VAT Number validation is not added in this story, as a requirement since this is just to be stored in the backend |   |
| Seller Name | Can be blank. If it is sent, needs to be captured in the backend |   |
| Seller Address1 | Can be blank. If it is sent, needs to be captured in the backend |   |
| Seller Address2 | Can be blank. If it is sent, needs to be captured in the backend |   |
| Seller Address3 | Can be blank. If it is sent, needs to be captured in the backend |   |
| Seller City | Same rules as Bill To City |   |
| Seller Region | Same rules as Bill To Region |   |
| Seller Country | Same rules as Bill To Country |   |
| Seller Postal Code | Same rules as Bill To Postal Code |   |
| Seller VAT Number | Can be blank. If it is sent, needs to be captured in the backend. VAT Number validation is not added in this story, as a requirement since this is just to be stored in the backend |   |

---

## LINX-8497 — BE - Integration of QCA and QCP into Integrated Order creation flow (LINX-8100, 8101)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

The Integrated Order Creation flow currently generates the **OrderIn JSON**, but the subsequent **QCA (Quote Configuration API)** and **QCP (Quote Pricing API)** calls are not yet integrated into the process.

This story aims to invoke the QCA and QCP service calls **immediately after the OrderIn JSON is generated**, ensuring both configuration and pricing validations happen inline before order submission continues.

* Integrate **QCA API call** post OrderIn JSON creation.
* Integrate **QCP API call** post OrderIn JSON creation.
* Update the OrderIn JSON (i.e., LinxOrderRequestDto) with the QCA/QCP cost related fields  
  _"preferredCarrierCode": "string",_  
  _"preferredDirectApAmount": 0,_  
  _"preferredDirectApCurrencyCode": "string",_  
  _"preferredApSource": "string",_  
  _"preferredDirectArAmount": 0,_  
  _"preferredDirectArCurrencyCode": "string",_  
  _"preferredTransitValue": 0,_  
  _"preferredTransitUomCode": "string",_  
  _"preferredDistanceValue": 0,_  
  _"preferredDistanceUomCode": "string"_
* Needs to work on the mapping between **LinxOrderRequestDto** and **OrderHeader**.
* The above new fields information needs to be saved in the respective columns of the **OrderInfo** table.
* The new fields should be reflected in the **OrderOut JSON** for downstream systems.

  
Note:   
Please refer the BRs of QCA/QCP functional stories  
 <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8101</custom>   
<custom data-type="smartlink" data-id="id-1">https://odysseylogistics.atlassian.net/browse/LINX-8100</custom>

---

## LINX-8498 — BE - Validation of Order Line fields Requested Ship Date & Requested Delivery Date (LINX-8066)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement the validation on the planning Dates (**Requested Ship Date & Requested Delivery Date**) for all lines, **should be the same in all lines.** This should also be validated - (i.e., Requested Ship Date and/or Requested Delivery Date in the order line schedule for any 2 or more order lines are different, log the error)  
  
Refer: <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8066?focusedCommentId=260694</custom>

---

## LINX-8499 — BE - Mapping for additional fields of Shipper, Ship To of Integrated Orders (LINX-8067)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement the mapping for the below fields

| Full Name | Can be blank. If it is sent, needs to be captured for the order |   |
| --- | --- | --- |
| Shipper Address Line 2 | Can be blank. If it is sent, needs to be captured for the order |   |
| Shipper Address Line 3 | Can be blank. If it is sent, needs to be captured for the order |   |
| Full Name | Can be blank. If it is sent, needs to be captured for the order |   |
| Ship To Address Line 2 | Can be blank. If it is sent, needs to be captured for the order |   |
| Ship To Address Line 3 | Can be blank. If it is sent, needs to be captured for the order |   |

---

## LINX-8500 — BE - Validation for measurement field/UOM codes for Weight, Volume and Dimension fields of Integrated Orders (LINX-8067)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement validation and mapping for the below fields

| Height Measurement / UOM | Can be blank. If it is sent, needs to be validated against UoM master data | 'UoM Type not found' - if there is no match from master data table |
| --- | --- | --- |
| Length Measurement / UOM | Can be blank. If it is sent, needs to be validated against UoM master data | 'UoM Type not found' - if there is no match from master data table |
| Width Measurement / UOM | Can be blank. If it is sent, needs to be validated against UoM master data | 'UoM Type not found' - if there is no match from master data table |
| Net Weight Measurement | Can be blank. If it is sent, needs to be captured for the order |   |
| Tare Weight Measurement | Can be blank. If it is sent, needs to be captured for the order |   |
| Volume Measurement | Can be blank. If it is sent, needs to be captured for the order |   |
|  |  |  |
| Net Weight Measurement | Can be blank. If it is sent, needs to be captured for the order if it is summation of all net weight |   |
| Tare Weight Measurement | Can be blank. If it is sent, needs to be captured for the order if it is summation of all tare weight |   |
| Volume Measurement | Can be blank. If it is sent, needs to be captured for the order if it is summation of all volume |   |

---

## LINX-8501 — BE - Validation and mapping for the Hazmat fields of Integrated Orders (LINX-8067)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement the mapping and validation for the below fields

| Hazmat Code | Can be blank. If it is sent, needs to be captured for the order |   |
| --- | --- | --- |
| Hazmat Class | Can be blank. If it is sent, needs to be captured for the order |   |
| Hazmat Packing Group | Can be blank. If it is sent, needs to be captured for the order |   |
| Hazmat Description | Can be blank. If it is sent, needs to be captured for the order |   |

---

## LINX-8513 — BE - Validation and mapping for the fields Flashpoint, BoilingPoint, HazardId, Tunnel, WGK, Marine and Harmonized of Integrated Order (LINX-8067)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement mapping and validation for the below fields  

| Flashpoint / UOM | Can be blank. If it is sent, needs to be validated against UoM master data | 'UoM Type not found' - if there is no match from master data table |
| --- | --- | --- |
| Boiling Point / UOM | Can be blank. If it is sent, needs to be validated against UoM master data | 'UoM Type not found' - if there is no match from master data table |
| Hazard ID Number | Can be blank. If it is sent, needs to be captured for the order |   |
| Tunnel Code | Can be blank. If it is sent, needs to be captured for the order |   |
| WGK Class | Can be blank. If it is sent, needs to be validated against UoM master data | 'WGK Type not found' - if there is no match from master data table |
| Marine Pollutant | Can be blank. If it is sent, needs to be captured for the order |   |
|  |  |  |
| Harmonized Code | Can be blank. If it is sent, needs to be captured for the order |   |

---

## LINX-8514 — BE - Validation and mapping for the fields SCAC and Equipment of the Integrated Order (LINX-8067)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement mapping and validation for the below fields  

| Equipment Code | Can be blank. If it is sent, needs to be validated against Equipment master data | 'Equipment Type not found' - if there is no match from master data table |
| --- | --- | --- |
| Carrier SCAC | Can be blank. If it is sent, needs to be captured in the backend |   |
| Equipment Number | Can be blank. If it is sent, needs to be captured in the backend |   |

---

## LINX-8521 — BE - Validation and mapping for Country Of Origin, Product Class, Delivery/Pickup Appointment and Ship Direction Type of Integrated Order (LINX-8067)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Need to validate and map the below fields

| Country Of Origin | Can be blank. If it is sent, needs to be captured in the backend. In case Country ISO code (2 letter code) is incorrect, error message needs to be recorded | Country of Origin not valid |
| --- | --- | --- |
| Product Class | Can be blank. If it is sent, needs to be validated against Shipping Class ID | 'Product Class not found' - if there is no match from master data table |
| Delivery Appointment | Can be blank. If it is sent, needs to be captured in the backend. If Time zone & Ship To Address are not available, then UTC can be considered as time zone by default. If Time zone is not available and Ship To Address is available, consider Time zone based on Ship To Address | Time zone auto added |
| Pickup Appointment | Can be blank. If it is sent, needs to be captured in the backend. If Time zone & Shipper Address are not available, then UTC can be considered as time zone by default. If Time zone is not available and Shipper Address is available, consider Time zone based on Shipper Address | Time zone auto added |
| Ship Direction Type | Can be blank. If it is sent, needs to be captured in the backend and should be matched to Ship Direction from Master data. Error message to be recorded for no match scenario | ‘Ship Direction Type not found’ - if there is no matching Ship Direction from Master Data table |

---

## LINX-8522 — BE - Validation and mapping for the optional fields like Batch Lot Number, Contact, Incoterm Info, Package Count etc of Integrated Order (LINX-8067)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Need to implement the validation and mapping for the below fields  

| Batch Lot Number | Can be blank. If it is sent, needs to be captured for the order |   |
| --- | --- | --- |
| Contact | Can be blank. If it is sent, needs to be captured in the backend |   |
| Incoterm Information | Can be blank. If it is sent, needs to be captured in the backend |   |
| Pickup Number | Can be blank. If it is sent, needs to be captured for the order |   |
| External Line Identifier | Can be blank. If it is sent, needs to be captured for the order |   |
| Third Party Reference Number | Can be blank. If it is sent, needs to be captured for the order |   |
| Third Party Reference Line Number | Can be blank. If it is sent, needs to be captured for the order |   |
| Third Party Reference Date | Can be blank. If it is sent, needs to be captured for the order |   |
| Package Count | Can be blank. If it is sent, needs to be captured for the order. Should not be negative value | Invalid package count - if it is a negative value |
| Net Value | Can be blank. If it is sent, needs to be captured for the order |   |
| Batch Lot Number Type | Can be blank. If it is sent, needs to be captured for the order |   |

---

## LINX-8529 — BE - Tech stories creation for Integrated Orders

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Needs to create tech stories for Integrated Orders  
Mandatory Fields

Conditional Fields  
Additional Fields

Address Fields

---

## LINX-8539 — QA: Validation for Integrated Orders (Mandatory fields)

**Status:** Closed  
**Type:** Task  
**Labels:** QA

Execute Postman API tests to verify mandatory fields, data mapping, and error responses for integrated order create/edit/cancel operations.

---

## LINX-8540 — QA: Validation for Integrated Orders (Conditional fields)

**Status:** Closed  
**Type:** Task  
**Labels:** —

Execute Postman API tests to verify Conditional fields, data mapping, and error responses for integrated order create/edit/cancel operations.

---

## LINX-8551 — DB - New table for Order Staging to store incoming Customer JSON

**Status:** Closed  
**Type:** Task  
**Labels:** DB

New table for Order Staging to store incoming Customer JSON

---

## LINX-8626 — BE - Entity mapping for newly added tables (Order Staging) and new fields (Exception Details, QCA, QCP) in the Order Domain

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Needs to add Entity classes for the newly created Database tables in the Order Domain  
Needs to update the fields for updated tables in the Entity classes

---

## LINX-8782 — DB Order - New fields in Order Line for creation time, Earliest/Latest Delivery dates and Earliest/Latest Ship dates (LINX-8063)

**Status:** Closed  
**Type:** Task  
**Labels:** DB

New fields need to be added in OrderLine table for   
"creationTimestamp"  
"earliestDeliveryDate"     
"latestDeliveryDate"     
"earliestShipDate"      
"latestShipDate"

---

## LINX-8783 — BE - OrderLine Entity changes for the new fields and DTO mapping (LINX-8063)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Need to add the new fields in the OrderLine Entity and corresponding fields mapping for OrderInterfaceDto and OrderIn Dto  
  
  "creationTimestamp": "string",//New field from XSD - Phase2  
  "earliestDeliveryDate": "string",//New field from XSD - Phase2  
  "latestDeliveryDate": "string",//New field from XSD - Phase2  
  "earliestShipDate": "string",//New field from XSD - Phase2  
  "latestShipDate": "string"//New field from XSD - Phase2

---

## LINX-8789 — QA: Validations for Integrated Orders - Additional fields

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-8790 — QA: Validation for Integrated Orders-Country, Region, City and Postal Code

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-8816 — Incorrect Error Message for Planning Date Type & Missing warning message for Line Identifier Auto‑Update

**Status:** Closed  
**Type:** Bugs  
**Labels:** —

_(no description)_

---

## LINX-8827 — Validation missing for ShipItemIdentifier field

**Status:** Closed  
**Type:** Bugs  
**Labels:** —

_(no description)_

---

## LINX-8840 — Missing validation error message when partial orderInstruction data is sent

**Status:** Closed  
**Type:** Bugs  
**Labels:** —

_(no description)_

---

## LINX-8847 — BE - Validate Single Schedule per Order Line Before Sending Order to Linx (LINX-8064)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Each order line must contain only one schedule.  
Currently, TMS validates this rule before sending the order to Linx, but the same validation is not enforced in this component/service.

To ensure consistency and prevent downstream issues, the system should explicitly validate that no order line contains more than one schedule.  
If any order line has more than one schedule, the message must fail validation and not be sent to Linx.

---

## LINX-8848 — BE - Convert Weight, Volume, Length, Width, and Height to Standard SI Units for All Line Items (LINX-8064)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Currently, line items in the system can store Weight, Volume, Length, Width, and Height in multiple units of measure (UOM), which leads to inconsistencies in calculations, reporting, integrations, and downstream processing.

This story aims to standardize all measurement attributes at the line‑item level by converting them to their respective common SI (International System of Units) units before further processing, storage, or integration.

  
Ensure consistency across the system by converting all dimensional and measurement values in line items to **standard SI units**.

---

## LINX-8849 — BE - Validate Shipper & Ship To Address Consistency Across All Order Lines Before Sending to Linx (LINX-8066)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Currently, TMS performs this validation prior to dispatching the order. The same validation must be enforced as part of this Business Rule to prevent inconsistent address data being transmitted.

LINX must validate that the **Corresponding Origin (Shipper)** and **Destination (Ship To)** address elements are **identical across all order lines** before saving the order to **Linx**.

If **any address element differs between two or more order lines**, the message must **fail validation** and **not be saved to Linx**.

---

## LINX-8850 — BE - Validate Weight, Volume, and Package Count Consistency Between Line and Schedule (LINX-8067)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

As per business requirements, the **weight, volume, and package count values must be identical between the Line and Schedule levels** of an order.

Currently, **TMS validates this rule before sending the order to Linx**. The same validation **must also be enforced here** to prevent inconsistent shipment data from being processed.

If the weight, volume, or package count values are **not duplicated exactly** between the Line and its corresponding Schedule, the message **must be rejected**.  

* Weights, volumes, and package counts **must match exactly** between:

    * Order Line
    * Corresponding Schedule
    
* This validation is currently performed by **TMS prior to sending the order to Linx**.
* The solution must **add/enforce this validation** at this stage as well.

---

## LINX-8864 — BE - ShipItemIdentifier filed validation API change (LINX-8064)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Needs to change the validation API of ShipItemIdentifier in Order Service  
  
Note:   
Refer [\[LINX-8538\] BE-Create Master Data API to Get All Hazmat Info with Ship Item Identifier - Jira](https://odysseylogistics.atlassian.net/browse/LINX-8538) to know the response of the API

---

## LINX-8891 — Net value currency code is missing for order lines in LINX

**Status:** Closed  
**Type:** Defect  
**Labels:** —

_(no description)_

---

## LINX-8947 — Ship Direction value is not captured in the LINX Db

**Status:** Closed  
**Type:** Bugs  
**Labels:** QA

_(no description)_

---

## LINX-8952 — BE - Order Interface Json changes (LINX-8063)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to change the Order Interface DTO according to the Customer ERP XSD structure.

* Schedule section needs to add in line level
* Shipper and ShipTo needs to be at line level
* Needs to accommodate the code changes accordingly (DTO to entity mapping)

Note: Please refer the XSD file

---

## LINX-8969 — QA - Verification of QCA/QCP Integration for Integrated Order Flow

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-8970 — QA  -Validation of BE Stories LINX: 8850, 8849, 8498

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9020 — QCP Routing Call from Order Domain (Integrated Orders)

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE Orders internal user, the moment an order is created or edited in the system, I want order domain to make a **QCP Routing** call, fetch the first Routing Option, associated AP rates and store the associated cost as a Preferred Direct AP/Buy Cost and send the order information (along with the Preferred Direct AP/Buy Cost) to the Shipments domain and also utilize the QCP Call response to make a QCA Call. <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8100</custom>

---

## LINX-9021 — QCA Rating Call from Order Domain (Integrated Orders)

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE Orders internal user, the moment I have made a QCP call and have a ‘Preferred Carrier’ & associated AP cost = ‘Preferred Direct AP Cost’, <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8101</custom> I want order domain to make a QCA Rating call and store the associated cost as a ‘Preferred Direct AR/Sell Cost’ and send the order information (along with both Preferred Direct AP/Buy Cost and Preferred Direct AR/Sell Cost) to the Shipments domain.

---

## LINX-9056 — BE - Order Line Identifier validation changes

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Need to validate Order Line Identifier field, if not received, system should through error and needs to be logged.  
  
Please check the below #BR of [\[LINX-8064\] Validations for Integrated Orders - Mandatory fields - Jira](https://odysseylogistics.atlassian.net/browse/LINX-8064)  

| **Line Identifier** | Number assigned to this line within the order. If not present, ~~add number to each line item starting with '1'~~  reject the order | ~~Line count auto updated (this can be a warning message instead of error message)~~ Line Identifier Missing (if not received) |
| --- | --- | --- |

---

## LINX-9072 — BE - Freight Terms, Modify Timestamp, Instruction Type and Carrier SCAC validation changes

**Status:** Closed  
**Type:** Task  
**Labels:** BE

| **Modify Timestamp** | Should be in the format Date Time and Time zone. Can be blank. If Delete Flag = 'N’, this is required. If Time zone is not available, then UTC can be considered as time zone by default. ~~When Shipper Address is not available & consider Time zone based on Shipper Address if it is available~~ | Modify Timestamp missing (if Delete Flag = 'N’ and the value is empty) Time zone auto added (this can be a warning messag |
| --- | --- | --- |

|   
**Freight Terms** | Any value can be sent and needs to be captured. If it is not part of Master data, then that information has to be recorded as error / warning message type. Cannot be blank. **Freight Term Codes must be the same across all order lines** | Freight Terms missing (in case Freight Term blank/missing) Freight Terms not found (error message) Freight Terms must be the same across all lines (if the freight term code is not the same across all order lines) |
| --- | --- | --- |

| **Instruction Type**   (Note: optional and if sent should match to Master data list) | If there is no Instruction Type found,  value ~~can be blank only~~ should be defaulted to ‘0012’ . If Instruction Number(s) are there, Instruction Type can only be any of the standard Instruction Type(s) and error message needs to be recorded if it is a foreign value | Instruction Type incorrect (foreign value) |
| --- | --- | --- |

| Carrier SCAC | Can be blank. If it is sent, needs to be captured in the backend and validated from master data. If validation fails, it needs to be fixed in the common UI (OIF Review). |   |
| --- | --- | --- |

---

## LINX-9118 — QCP and QCA requests failed on post order

**Status:** Closed  
**Type:** Defect  
**Labels:** QA

When I post order payload I haven’t received appropriate values to order in LINX

---

## LINX-9166 — QA - Validation for Freight Terms, Modify Timestamp, Instruction Type and Carrier SCAC validation changes

**Status:** Closed  
**Type:** Task  
**Labels:** QA

**Modify Timestamp**:

delete flag = N

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=489ad99d-154c-4bed-83d2-bef194402e84&&collection=&height=669&occurrenceKey=null&width=1095&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=0bf1dc40-a97c-497b-9ba7-6d326628336f&&collection=&height=669&occurrenceKey=null&width=1095&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=424f5df8-9be7-44e4-a823-1089b9b02497&&collection=&height=669&occurrenceKey=null&width=1095&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
Delete flag = Y

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=2b7df868-b5ff-4852-bed4-a0f5866c683f&&collection=&height=669&occurrenceKey=null&width=1095&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=c3ba3cd0-e517-491d-8571-0898e9fd8e26&&collection=&height=669&occurrenceKey=null&width=1095&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
**Freight Terms**

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=a776e87f-aa41-40eb-88c1-ba2f8d53708c&&collection=&height=669&occurrenceKey=null&width=1095&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=b2acacf2-5c88-4387-8099-e2efcbc5c16a&&collection=&height=669&occurrenceKey=null&width=1095&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
**Instruction Type**

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-9576</custom> 

‌

Carrier SCAC

<custom data-type="smartlink" data-id="id-1">https://odysseylogistics.atlassian.net/browse/LINX-9598</custom> 

---

---

## LINX-9247 — Additional Mapping & Validation Clarification for OrderIn XML

**Status:** In Development  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2, Refinement_done

This story is created to cover the clarification received from Dave.S on the additional order mapping fields & OrderIn XML fields. The relevant stories are LINX - 8064, 8066 & 8067

---

## LINX-9267 — Unexpected error occured when try to post order payload

**Status:** Closed  
**Type:** Defect  
**Labels:** —

`"message": "An unexpected error occurred on the server. Please try again later."` error ocurred when try to post order payload

---

## LINX-9283 — BE - Validation on Planning Date Type, Ship Item Identifier, WGK Class, Net Value, Ship Direction Type (LINX-9247)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

‌

| Planning Date Type | Feedback from Dave.S : interface has them at line level.  validation should ensure that all lines have the same value.  then, that value can be used at orderIn at the header level (this is true of LOT of things, origin, destination, schedules, etc) |
| --- | --- |

| Ship Item Identifier | Q) Can we proceed with Order creation if the ShipItemIdentifier not found in MasterDB? Feedback from Dave.S : yes, talk to Jana (there's something similar in PGI).  If the item is not found in master data, we just use that item id as the description as well |
| --- | --- |

‌

| WGK Class | Q) Validation required? Feedback from Dave:  I had already provided a validation in the OrderValidations.sql I mailed sometime last week  
\-- Query to validate WGK class  
\-- on no data found, the WGK Class is invalid  
select wgk_short_desc -- in case you need a descriptiom to go along with the code  
from mf_wgk_class  
where wgk_code = :wgkCodeToValidate  
; |
| --- | --- |

| Net Value | Q) Need validation on Curreny Code, Dave will provide the query  Feedback from Dave:  Sorry, thought I had already put that in OrderValidations.sql email  
\-- Query to validate currency codes  
\-- on no data found, the currency code is invalid  
select cur_short_desc  
from mf_currency  
where cur_code = :cur_code_to_validate  
; |
| --- | --- |

| Ship Direction Type | Q) How many ShipDirection types available in Master DB Feedback from Dave -ShipDirection in the xsd is an enumeration.  There are only two allowed values "Inbound" and "Outbound".  There's too much junk data in QA and Stage for me to tell whether orderIn is expected the codes ("I" , "O") or if it just uses the fully spelled out words... |
| --- | --- |

---

## LINX-9284 — BE - Validation on Equipment related fields <Place Holder>

**Status:** Todo  
**Type:** Story  
**Labels:** BE

| Equipment Number | Do we need validation for Equip Type, Code,Number, Id Feedback from Dave - Please detail which xpaths you are talking about from the XSD.  This looks like 4 separate questions...  Some of them do require validation.  Please a follow up email to further clarify your question (chat is awkward for me to deal with extensive questions like this) |
| --- | --- |

---

## LINX-9342 — BE - Mapping exercise for Bhoomi XML → Order Interface JSON for LINX Order API Contract

**Status:** Closed  
**Type:** Story  
**Labels:** —

LINX exposes an API to create an Order. The Customer ERP Portal sends **Order Creation XML** to **Bhoomi**, which must convert this to **JSON** conforming to the **LINX Order contract**. We need to analyze, map, and update Bhoomi’s transformation logic to ensure the output JSON strictly meets the LINX contract (fields, nesting, data types, etc.,)

---

## LINX-9390 — QA - Validation on Planning Date Type, Ship Item Identifier, WGK Class, Net Value, Ship Direction Type (LINX-9247)

**Status:** Closed  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-9473 — BE - Implement logic to map 'isConsolidateable' field value at Order Header level based on Line-Level 'isLoadConstraints' field

**Status:** Closed  
**Type:** Task  
**Labels:** BE

As part of the consolidation logic (#BR), we need to determine whether an order is eligible for consolidation based on the `isLoadConstraints` flag available at the **Order Line level** (in `OrderIn DTO` and `OrderInterface DTO`).

A new Boolean field `isConsolidateable` should be introduced at the **Order Header (Order-Info table)** level and populated based on the following rule:

* If **one or more lines** in the order have `isLoadConstraints = true`, then:

    * Set `isConsolidateable = true` at Order Header level.
    
* If **all lines** have `isLoadConstraints = false`, then:

    * Set `isConsolidateable = false`.
    

This ensures that the consolidation eligibility is correctly derived and stored at the order level.

When processing an order:

* If at least one line has `isLoadConstraints = true`, then `is_consolidateable = true`.
* If all lines have `isLoadConstraints = false`, then `is_consolidateable = false`.
* `isLoadConstraints ` field should reflect in OrderOut payload as well.

---

## LINX-9576 — LINX-9072/ Instruction Type validation issue

**Status:** Done  
**Type:** Defect  
**Labels:** QA

_(no description)_

---

## LINX-9598 — LINX-9072/ Carrier SCAC validation issue

**Status:** Done  
**Type:** Defect  
**Labels:** QA

_(no description)_

---

## LINX-9609 — Mismatch between expected error message and DB exception message for modifyTimestamp field

**Status:** Closed  
**Type:** Defect  
**Labels:** QA

_(no description)_

---

## LINX-9688 — Missing validation error message when partial line level Instruction data is sent

**Status:** Closed  
**Type:** Bugs  
**Labels:** —

_(no description)_

---

## LINX-9700 — E2E testing customer ERP->Bhoomi->LINX for Mandatory order fields (LINX-8064)

**Status:** Backlog  
**Type:** Story  
**Labels:** —

LINX-specific testing has already been completed as part of <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8064</custom>. Once the ERP → Boomi → LINX configuration is completed, E2E testing will be covered in this story.

---

## LINX-9701 — E2E testing customer ERP->Bhoomi->LINX for Additional order fields (LINX-8067)

**Status:** Backlog  
**Type:** Story  
**Labels:** —

LINX-specific testing has already been completed as part of <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8067</custom>.  Once the ERP → Boomi → LINX configuration is completed, E2E testing will be covered in this story.

---

## LINX-10486 — Getting error while updating order payload

**Status:** Closed  
**Type:** Bugs  
**Labels:** QA

_(no description)_

---

## LINX-10552 — BE - Extract CustomerId and TMSSourceSystemId from RelySourceId (LINX-8063)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

**-- Query to find customer_id given a rely_SOURCEID**  
select a.org_global_id  
from mf_organization a  
where 1=1  
    and a.org_cd_org_type = 'L'  
connect by a.org_id = prior a.org_parent_org_id  
start with a.org_global_id = :rely_SOURCEID  
;  
  
**-- Query to find find the TMSSourceSystemId using the "rely_SOURCEID" from the messageProperties of the Order Interface msg**  
**-- This wasn’t something we directly discussed today, but you need this value to do some of the other lookups/decorations below**  
**-- this TMSSourceSystemId is used in many other lookups/validations used to transform orderInterfaceIn json to orderIn json**  
select org_id TMSsourceSystemId  
from mf_organization  
where org_global_id = :rely_SOURCEID  
;

---

## LINX-10604 — An unexpected error occurs when the Requested Ship/Delivery Date field is provided with a blank value

**Status:** Closed  
**Type:** Defect  
**Labels:** —

_(no description)_

---

## LINX-10678 — QCP and QCA requests return 'not data found' because usable carrier list on QA is empty.

**Status:** Closed  
**Type:** Defect  
**Labels:** —

{'type': 'doc', 'version': 1, 'content': []}

---

## LINX-10679 — Missing Validation for Invalid Freight Term Code & Time Zone

**Status:** Closed  
**Type:** Defect  
**Labels:** BE

_(no description)_

---

## LINX-10683 — Integrated Order - Cancelling a non-existent order - Rephrase Error Message

**Status:** Final Review  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As an OdysseyONE  user, I want to receive data from customer systems and have it validated so that I can use this data for integrated orders creation, edit and cancellation as needed.

---

## LINX-10771 — Owning Organization dropdown displaying [object Object] instead of organization name

**Status:** Closed  
**Type:** Bugs  
**Labels:** QA

_(no description)_

---

## LINX-10822 — 500 Internal Server Error in Order to Shipment Kinesis Flow

**Status:** Closed  
**Type:** Bugs  
**Labels:** QA

_(no description)_

---

## LINX-10984 — BE - Fix Ship Item Validation to handle “No Data Found” lookup correctly (LINX-8063)

**Status:** In Development  
**Type:** Task  
**Labels:** BE

Ship Item Validation incorrectly treats a “No Data Found” lookup result as a failure of the OrderInterface message.

The current Ship Item Validation logic is incorrectly handling lookup responses. When the product lookup returns **“No Data Found”**, the system flags the OrderInterface message as a failure.

However, the intended behavior is:

* “No Data Found” is a **valid scenario**, not an error.
* The system should use the **External ID as the Product Description**.
* Processing should continue without failing the message.

This issue is causing unnecessary message failures and impacting order processing.

‌

* ✅ When lookup result = “No Data Found”, the system **does not fail** the OrderInterface message.
* ✅ External ID is used as the **Product Description** in such cases.
* ✅ Remaining processing continues successfully.
* ✅ No error logs or failure statuses are generated for this scenario.

‌

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=bc37ec27-040b-41a6-983f-87bba515885a&&collection=&height=812&occurrenceKey=null&width=1181&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)

---

## LINX-11137 — OIF UI to fix validation errors for integrated orders

**Status:** Analysis  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

This story pertains to the Order Interface Failure (OIF) errors that occur when an integrated order is received into OdysseyONE via customer systems (e.g.: ERP systems).  Interface Errors may occur due to missing mandatory fields (e.g.: Owning Organization), invalid data type (e.g.: having a character in a phone number) or invalid data (not matching with TMS master). The user should navigate to a UI, where these error(s) will be fixed, re-validated and the order will be sent for re-processing.

Manual Order validation happens as the fields are being entered while integrated order validation errors will be resolved via the UI.

---
