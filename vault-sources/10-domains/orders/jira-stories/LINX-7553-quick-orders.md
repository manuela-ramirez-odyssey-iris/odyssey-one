# LINX-7553 — Manual Order Creation (Quick Orders)

**Status:** Analysis  
**Jira:** https://odysseylogistics.atlassian.net/browse/LINX-7553  
**Child stories:** 319

## Epic Description

The Manual Order Creation intake form/page streamlines the order creation process by guiding users through multiple sections to input essential details, including line-level product information. It ensures efficient and accurate data collection by performing validation checks for all required fields, such as date and location validations, and integrating with master data to retrieve customer details, payment, and freight terms. Once all information is entered, the order is committed, during which additional validations are performed before generating the order number. This process ensures a comprehensive and accurate order creation experience.

* Managed Services order
* No Credit check
* No shipment creation on order creation
* No Rate service calls
* No Notification

Manual orders can be created in 2 ways:

1. Short/Quick Orders - A shorter/more concise form having minimum fields necessary to create the order
2. Long Orders - A longer & more detailed form having more fields.

**The scope for this epic only includes Short/Quick Order Creation**

---

# Stories

## LINX-5981 — Log out of OTMS

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS internal user, I want to be able to log out of OTMS so that I can close / end the application session (not the SSO session) when needed.

---

## LINX-5984 — Order Upload

**Status:** Todo  
**Type:** Story  
**Labels:** —

As a user I would like to be able to upload orders from in input template

---

## LINX-5985 — BE - Add authorization in API (OTMS-743)

**Status:** Done  
**Type:** Story  
**Labels:** —

_(no description)_

---

## LINX-5991 — FE - Quick Order Creation - Pickup / Delivery Section (Consignor and Consignee) (OTMS-559) Part 2 

**Status:** Done  
**Type:** Story  
**Labels:** FE

_(no description)_

---

## LINX-5993 — FE - Long Order Creation - Product Information Section (Add Product - Packaging) (OTMS-766) Part 2

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done

As a Odyssey TMS user, I want to be able to update Packaging sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-5994 — FE - Long Order Creation - Product Information Section (Add Product - Product Details) (OTMS-99) Part-2

**Status:** Done  
**Type:** Story  
**Labels:** Approved, BE_LLD_Done, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update Product Details sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-5996 — Quick Order Creation - Special Services section (Quick selection)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS user, I want to be able to update Special Services section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-5998 — Quick Order Creation - Product Information Section (Add Product)

**Status:** QA Testing  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS user, I want to be able to add Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-5999 — BE - Timezone sorting as orders usage frequency with field specific (OTMS-708)

**Status:** Done  
**Type:** Story  
**Labels:** BE

BR# 2 and 3

time zones listed in the dropdown will be based on the frequency with which time zone is used in the orders - highest to lowest  
Sorting should be field specific

Order Service:  _/order-service/v1/timezone/lookup_

---

## LINX-6000 — BE-Quick Order Creation - Load Product Information Section (OTMS-595)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

To load the product information section

/product-service/v1/product-info/load

GET

---

## LINX-6002 — Order - Order Creation Template

**Status:** Todo  
**Type:** Story  
**Labels:** —

A function within the manual long or quick order creation where a user can create a template that can be saved and recalled during the order entry process to pre-populate order data that has been saved as part of the template

Templates be saved by users and allow a name to be assigned so they can be recalled

Templates can be saved to populate orders with any number of data elements pre-populated. All data once populated via Template to an order can be modified, deleted

---

## LINX-6003 — FE - Quick Order Creation - Product Information Section (Add Product)(OTMS-795) - Part 2

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS user, I want to be able to add Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6004 — FE - Quick Order Creation - Product Information Section (Add Product)(OTMS-795) Part 1

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to add Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6005 — FE - Quick Order Creation - Pickup / Delivery Section (Consignor and Consignee) (OTMS-559) Part 1

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update Pickup / Delivery section (Consignor and Consignee details) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6006 — FE - Quick Order Creation - Reorder columns & change column width in Product Information section (OTMS-743)

**Status:** New  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to reorder columns and / or change column width in the Product Information section / table for an order that I am attempting to create, so that I can have the desired view of product(s) being added to the order.

---

## LINX-6007 — BE-Quick Order Creation - Save Manage Column option for Product Information Section (OTMS-595)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Save Manage Column option for Product Information Section

/order-service/v1/product-info/manage/columns

POST

Set the manage column fields in user session scope.

The manage columns fields reset to default in case user logs out or session expired.

---

## LINX-6010 — BE-Quick Order Creation - General Fields-Owning Organization (Masterdata) (OTMS-547)

**Status:** Ready for Development  
**Type:** Story  
**Labels:** BE

Owning Organization : Update existing api

/master-data/v1/owning-org/lookup

User should be able to search for any customer name with minimum of 2-3 characters (excluding space) are entered.

The user should be able to input alphanumeric characters, special characters or a combination of both, as needed, as well as use space between characters while providing inputs for search within filter options. The search should be case insensitive

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom> BR 2(a)

---

## LINX-6011 — BE- Quick Order Creation - Pickup / Delivery Section (Consignor)-City (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-559</custom> BR#2(d)

Order Service Internally calls Master service to fetch the lookup data

Order Service API: _order-service/v1/org-address/lookup_

Master Service API: _/master-data/v1/org-name/lookup_

---

## LINX-6012 — BE-Quick Order Creation - General Fields-Freight terms(OTMS-547)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

**Freight terms** :

Update the /master-data/v1/freight-terms/lookup

By default, ‘Pre-Paid’ will be the value populated in this field

The options within the dropdown should be ‘Pre-Paid’ followed by other Freight Terms listed based on the frequency with which those have been used in orders (highest to lowest)

‌

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom> BR# 2(b),2(c)

---

## LINX-6013 — BE- Quick Order Creation - Pickup / Delivery Section (Consignor)-Region (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-559</custom> BR#2(6)

Order Service Internally calls Master service to fetch the lookup data

Order Service API: _order-service/v1/org-address/lookup_

Master Service API: _/master-data/v1/org-name/lookup_

---

## LINX-6014 — BE- Quick Order Creation - Pickup / Delivery Section (Consignor) - Postal Code (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-559</custom> BR# 2(f)

Order Service Internally calls Master service to fetch the lookup data

Order Service API: _order-service/v1/org-address/lookup_

Master Service API: _/master-data/v1/org-name/lookup_

---

## LINX-6015 — BE- Quick Order Creation - Pickup / Delivery Section (Consignor)-Country (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-559</custom> BR# 2(g)

Order Service Internally calls Master service to fetch the lookup data

Order Service API: _order-service/v1/org-address/lookup_

Master Service API: _/master-data/v1/org-name/lookup_

---

## LINX-6016 — BE-Quick Order Creation - General Fields-Ship Direction (OTMS-547)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD, BE_LLD_Done

Ship Direction : <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom> BR# 2(e) - drop down value in UI

/master-data/v1/ship-direction/lookup

---

## LINX-6017 — BE- Audit Cancel order (OTMs-274)

**Status:** Done  
**Type:** Story  
**Labels:** —

_(no description)_

---

## LINX-6018 — BE -Audit NEW Order (OTMS -274)

**Status:** Done  
**Type:** Story  
**Labels:** —

_(no description)_

---

## LINX-6022 — BE- Quick Order Creation - Pickup / Delivery Section (Consignor) - Retrieve default lists for all Address fields (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Need to retrieve default lists for all the fields while order page loading  
As part of the default list, need to fetch data from Order service

---

## LINX-6024 — BE-Quick Order Creation - Product Information Section (Add Product)- Product ID and Product Description (Master Data) (Product ID) -OTMS 795

**Status:** Done  
**Type:** Story  
**Labels:** BE

To create API endpoints to find product

‌

/product-service/v1/product/lookup

---

## LINX-6025 — BE-Quick Order Creation - Product Information Section (Add Product)- Shipping Class and Shipping Class ID (Master Data) (OTMS-795)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

To create api endpoints to find shipping class and shipping class ID

/product-service/v1/ship-class

GET-

/product-service/v1/ship-class-id

POST - ship-class

---

## LINX-6026 — FE - Long Order Creation - General section (Add Instructions) - Part 2 (OTMS-50)

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to add instruction(s) in the General section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6027 —  BE-Quick Order Creation - Product Information Section (Add Product)- Gross Weight and Volume Orderservice (OTMS-795)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

To create api endpoints for Gross Weight and Volume 

For search scenario also apply frequency(list of orders available in orderservice ) sorting after we receive list from master-data

---

## LINX-6028 — BE-Quick Order Creation - Product Information Section (Add Product)- Shipping Class ID (Order service ) Pagination+Frequency Sorting(OTMS-795)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD, BE_LLD_Done

add Pagination +Frequency Sorting  to existing API

---

## LINX-6029 — BE-Quick Order Creation - General Fields-Equipment (Master service) Pagination(OTMS-547)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

**Equipment** :

master data  api 

add pagination in the existsing API 

‌

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom>

---

## LINX-6034 — FE - Tech - UI Component Library integration with OTMS

**Status:** Done  
**Type:** Story  
**Labels:** —

Component Library integration with OTMS

---

## LINX-6035 — QA Execution - Quick Order Creation - Product Information Section (Add Product) - (OTMS-795)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS user, I want to be able to add Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6036 — BE- Long Order Creation - Product Information Section (Add Product - Add Reference Codes) (Master Service) (OTMS-102)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

To create api endpoint to get reference codes  
  
/product-service/v1/reference-codes

---

## LINX-6037 — BE - Extract time zone based on City, Region, Postal Code and / or Country (OTMS-708)

**Status:** Done  
**Type:** Story  
**Labels:** BE

BR# 2 and 3

Extract time zone based on City, Region, Postal Code and / or Country

time zones listed in the dropdown will be based on the frequency with which time zone is used in the orders - highest to lowest  
  
Order Service internally calls Master Service to fetch the time zone list, on top of it we need to apply sorting

Order Service:  _/order-service/v1/timezone/lookup_

Master Service: _/master-service/v1/timezones_

---

## LINX-6038 — BE-Quick Order Creation - Special Services section- master-service-look up Dropdown static values(OTMS-98)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Look up api for static data 

/product-service/v1/special-services/lookup

+

Pagination

---

## LINX-6039 — BE-Quick Order Creation - Product Information Section (Add Product)- Shipping Class ID (Master Data) Pagination(OTMS-795)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD, BE_LLD_Done

add Pagination to existing API 

/product-service/v1/ship-class-id

POST - ship-class

pagination

---

## LINX-6040 — FE - Auto populate Pickup Delivery fields based on Org ID/Org Name and/Or Longname (OTMS-559)

**Status:** New  
**Type:** Story  
**Labels:** FE

_(no description)_

---

## LINX-6041 — FE - Quick Order Creation - Updating Timezone Details (OTMS-708)

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update Pickup / Delivery section (Consignor and Consignee details) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6042 — FE - Quick Order Creation - Manual Order Creation Flow (OTMS-795) Part 2

**Status:** In Development  
**Type:** Story  
**Labels:** FE

_(no description)_

---

## LINX-6043 — BE-Quick Order Creation - Special Services section- order-service-Dropdown Look up values (orderservice)(OTMS -98)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Call order service to get the frequency the Special Services has been used in orders (highest to lowest) 

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-1458</custom> 

Call Master data look up API

Pagination

Search

---

## LINX-6044 — FE - Quick Order Creation - Manage Column option for Product Information Section (OTMS-595) Part 2

**Status:** New  
**Type:** Story  
**Labels:** FE

## **Quick Order Creation - Manage Column option for Product Information Section (OTMS-595) Part 2**

---

## LINX-6045 — BE-Quick Order Creation - Product Information Section (Add Product)- Shipping Class OrderService(OTMS-795)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

To create api endpoints to find shipping class 

/order-service/v1/ship-class

GET-

 frequency(list of orders available in orderservice ) sorting after we receive list from master-data

---

## LINX-6046 — BE-Quick Order Creation - Product Information Section (Add Product)- Shipping Class ID (Order Data) (OTMS-795)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD, BE_LLD_Done

frequency(list of orders available in orderservice ) sorting after we receive list from master-data 

To create api endpoints to find  shipping class ID

/order-service/v1/ship-class-id

POST - ship-class

pagination

---

## LINX-6054 — QA - Long Order Creation - Product Information Section (Add Product - General)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update General sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6056 — BE-Long Order Creation - General section- Order-service-Modes dropdown (OTMS-49)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

To create api endpoint for modes drop down

To determine frequency from highest to lowest the modes is used.

---

## LINX-6057 — BE- Quick Order Creation - Pickup / Delivery Section (Consignor) - address Line1 (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-559</custom> BR#2(c)

Order Service Internally calls Master service to fetch the lookup data

Order Service API: _order-service/v1/org-address/lookup_

Master Service API: _/master-data/v1/org-name/lookup_

There will 2 parts under this section - **Consignor and Consignee**

---

## LINX-6058 — BE-Long Order Creation - General section- Master-service-Modes dropdown (OTMS-49)

**Status:** Done  
**Type:** Story  
**Labels:** BE

To create an api endpoint for modes drop down 

List all modes from master table

---

## LINX-6059 — Access OTMS using Single Sign-On (SSO)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS internal user, I want to be able to log in to my account so that I can access OTMS for using order management & other functionalities as needed.

---

## LINX-6060 — LLD Creation

**Status:** Done  
**Type:** Story  
**Labels:** —

‌

1527,1526,1522,1516,1454,1377,685,1458,1460,1461,1463

---

## LINX-6067 — FE - Long Order Creation - Pickup / Delivery section (OTMS-104)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, BE_LLD_Done, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update optional fields in the Pickup / Delivery section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6068 — FE - Long Order Creation - Product Information Section (Add Product - Add Reference Codes) (OTMS-102)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update Reference code(s) for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6070 — LLD Creation

**Status:** Done  
**Type:** Story  
**Labels:** —

_(no description)_

---

## LINX-6072 — FE - Long Order Creation - Product Information Section (Add Product - Add Hazmat) (OTMS-103) Part 1

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update Hazmat details for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6073 — FE - Long Order Creation - Product Information Section (Add Product - Packaging) (OTMS-766) Part -1

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done

As a Odyssey TMS user, I want to be able to update Packaging sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6074 — BE- Quick Order Creation - Pickup / Delivery Section (Consignor) - Pagination implementation for Address fields (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Need to apply pagination for all the fields

---

## LINX-6078 — Quick Order Creation - Special Services section (Manage Special Services)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, BE_LLD_Done, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS user, I want to be able to update Special Services section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6079 — FE - Quick Order Creation - Manual Order Creation Flow (OTMS-795) Part 1

**Status:** Done  
**Type:** Story  
**Labels:** FE

_(no description)_

---

## LINX-6080 — Quick Order Creation - Pickup / Delivery Section (Consignor and Consignee)

**Status:** QA Testing  
**Type:** Story  
**Labels:** Approved, DB, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS user, I want to be able to update Pickup / Delivery section (Consignor and Consignee details) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6083 — BE - Implementation of OrgAddress Lookup API Latency Optimization

**Status:** Done  
**Type:** Story  
**Labels:** BE

_(no description)_

---

## LINX-6084 — UX / VD Changes in Quick Order Creation - General and References Sections

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done

As an Odyssey TMS user, I want the ability to update the General and References sections—both mandatory and optional fields—when creating an order. This will ensure that all relevant details are captured in the order. We have also implemented a error messages system to alert users about mandatory fields, making it clear that they must be completed for successful order creation.

---

## LINX-6086 — Quick Order Creation - Manage Column option for Product Information Section

**Status:** Analysis  
**Type:** Story  
**Labels:** Approved, BE_LLD_Done, OTMS_Phase1, Refinement_done, VD_Approved, VD_Completed

As a Odyssey TMS user, I want to be able to manage columns shown at line level, in the Product information section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6087 — BE-Quick Order Creation - Manage Column option for Product Information Section (OTMS-595)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

To create api endpoints to manage columns option for Product Information section

/product-service/v1/product-info/manage/columns

GET

---

## LINX-6091 — FE - Long Order Creation - General section (OTMS-49) Part 2

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done

As a Odyssey TMS user, I want to be able to update General section (fields other than the ones which are part of Quick order creation - General section) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6092 — FE - Quick Order Creation - Ship Class ID Changes and Validation (OTMS-795)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS user, I want to be able to add Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6094 — BE-Long Order Creation - Product Information Section (Add Product - General) - Country of Origin (OTMS-575) Master Data

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Create api endpoint for country of origin

BR#2(e)

---

## LINX-6095 — BE-Quick Order Creation - Pickup / Delivery Section (Consignor) - Long Name (OTMS-559)

**Status:** Blocked  
**Type:** Story  
**Labels:** BE

Long Name :

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-559</custom> BR# 2(b)

/master-data/v1/org-name/lookup

---

## LINX-6096 — BE- Quick Order Creation - Pickup / Delivery Section (Consignor) -Retrieve ID / Organization Name, Long Name from Address Line (OTMS-559)

**Status:** Blocked  
**Type:** Story  
**Labels:** BE

Retrieve **ID / Organization Name, Long Name** for Address Line 1, City, Region, Postal Code and / or Country value(s) combinations

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-559</custom> BR#2(c->g)

/master-data/v1/org-name/lookup

---

## LINX-6097 — FE - Long Order Creation - General section (OTMS-49) Part 1

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update General section (fields other than the ones which are part of Quick order creation - General section) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6099 — BE-Quick Order Creation - General Fields-Equipment(Master data ) (OTMS-547)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

**Equipment** :

/master-data/v1/equipment/lookup

User should be able to view the list of equipment groups, listed based on the frequency with which the equipment group has been used in orders (highest to lowest)  to addressed in story -><custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-1454</custom> 

User should be able to search for any equipment with minimum of 2-3 characters (excluding space) are entered.

The user should be able to input alphanumeric characters, special characters or a combination of both, as needed, as well as use space between characters while providing inputs for search within filter options. The search should be case insensitive

‌

<custom data-type="smartlink" data-id="id-1">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom> BR# 2(b),2(c)

---

## LINX-6100 — BE- Quick Order Creation - Pickup / Delivery Section - Refactor OrgAddress API - Master Service (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Need to refactor the org-address API in Master Service as per new LLD changes

---

## LINX-6101 — BE-Quick Order Creation - Manage Column option for Product Information Section- Min 6, Max-15 (OTMS-595)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

User need select minimum Min 6, and maximum -12 columns.

Backend Validations to be added

---

## LINX-6102 — BE- Quick Order Creation - Pickup / Delivery Section - Refactor OrgAddress API - Order Service (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Need to refactor the org-address API in Order Service as per new LLD changes

---

## LINX-6103 — BE - Long Order Creation - Product Information Section (Add Product - Add Hazmat) - Packaging Group - frequency Sorting (Order service) (OTMS-103)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Add frequency Sorting to Packaging Group API

---

## LINX-6107 — FE - Quick Order Creation - Owning Organization Fields (OTMS-547)

**Status:** Done  
**Type:** Story  
**Labels:** FE

_(no description)_

---

## LINX-6108 —  BE-Quick Order Creation - General Fields-Ship Direction (Orderservice) (OTMS-547)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Ship Direction : <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom> BR# 2(e) - drop down value in UI

By default, ‘Outbound’ will be the value populated in this field

The options within the dropdown should be ‘Outbound’ followed by other Ship Direction

---

## LINX-6109 — BE: Address Look up API 

**Status:** Ready for Development  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

| column | frequency  | search | status |
| --- | --- | --- | --- |
| orgIdOrgCode | Rework Required |  Completed |  Pending |
| longName | Rework Required |  Completed |  Pending |
| adrressLine1 | Rework Required |  Completed |  Pending |
| city | Rework Required |  Completed |  Pending |
| Region | Rework Required |  Completed |  Pending |
| postalCode | Rework Required |  Completed |  Pending |
| Country | Rework Required |  Completed |  Pending |

Above table list of the status of the functionality completed/pending

‌

API Payload : 

```
{
    "orgIdOrgCode": "",
    "longName": "",
    "address": {
        "addressLine1": "",
        "addressLine2": "",
        "addressLine3": "",
        "city": "",
        "region": "",
        "postalCode": "",
        "country": "US"
    },
    "pageNumber": 0,
    "pageSize": 12,
    "selectedField": "country"
}
```

Note : Based on `selectedField` value frequency sorted listing for that particular field should be provided .

 **Pagination when frequency (empty string) applied needs to addressed**

---

## LINX-6110 — BE-Quick Order Creation - Product Information Section (Add Product)- Gross Weight and Volume (OTMS-795)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

To create api endpoints for Gross Weight and Volume 

/product-service/v1/uom-type

---

## LINX-6111 — BE-Quick Order Creation - Product Information Section (Add Product)(Master Data)- Handling units(OTMS-795)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

To create api endpoint for handling units

/product-service/v1/handling-units

---

## LINX-6116 — BE - Analysis the Master Service Latency on OrgApiAddress Lookup

**Status:** Done  
**Type:** Story  
**Labels:** BE

_(no description)_

---

## LINX-6117 — BE-Quick Order Creation - General Fields-Owning Organization (Orderserservice) (OTMS-547)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Owning Organization : New  api

‌

User should be able to view the list of customers (shippers), listed based on the frequency with which the customer name has been used in orders (highest to lowest)

‌

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom> BR 2(a)

---

## LINX-6118 — BE-Long Order Creation - General section- Order-service-SCAC dropdown (OTMS-49)

**Status:** Done  
**Type:** Story  
**Labels:** BE

_(no description)_

---

## LINX-6120 — FE - LLD Creation

**Status:** Done  
**Type:** Story  
**Labels:** —

Create LLD for Sprint 6 FE stories

---

## LINX-6123 — BE-Long Order Creation - General section- Master-service-SCAC dropdown (OTMS-49)

**Status:** Done  
**Type:** Story  
**Labels:** BE

_(no description)_

---

## LINX-6124 — BE-Quick Order Creation - Product Information Section (Add Product)(Order service Data)- Handling units(OTMS-795)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD, BE_LLD_Done

To create api endpoint for handling units

/order-service/v1/handling-units

Frequency based sorting

---

## LINX-6125 — FE - Quick Order Creation - Accommodate Address API Changes (OTMS-708)

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update Ship and Delivery Date and Time in the Pickup / Delivery section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6126 — BE - Long Order Creation - Pickup / Delivery section - Address Line 2 and Address Line 3 (Order Service) (OTMS-104)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update optional fields in the Pickup / Delivery section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6127 — FE - Quick Order Creation - Consignor and Consignee fields (OTMS-559) Part 2

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update Pickup / Delivery section (Consignor and Consignee details) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6128 — BE - Long Order Creation - Product Information Section (Add Product - Add Hazmat) UoM - for Flashpoint (Master Data) (OTMS-103)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Create an API for Uom - for FlashPoint for Master date service with Pagination.

---

## LINX-6129 — BE - Long Order Creation - Product Information Section (Add Product - Add Hazmat) UoM - for Flashpoint (Order Service) (OTMS-103)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Create an API in order service to master data to get the details for UoM - for FlashPoint.

---

## LINX-6130 — FE - Long Order Creation - Product Information Section (Add Product - General) (OTMS-575)

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update General sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6131 — BE-Quick Order Creation - General Fields-Equipment (Orderservice)(OTMS-547),frequency and sorting

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

**Equipment** :

Orderservice api 

order-service/v1/equipment/lookup

User should be able to view the list of equipment groups, listed based on the frequency with which the equipment group has been used in orders (highest to lowest)

The user should be able to input alphanumeric characters, special characters or a combination of both, as needed, as well as use space between characters while providing inputs for search within filter options. The search should be case insensitive

‌

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-547</custom> BR# 2(b),2(c)

---

## LINX-6133 — BE- Long Order Creation - Product Information Section (Add Product - Add Reference Codes) (Order Service) (OTMS-102)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

To create api endpoint to get reference codes from Master service  
/order-service/v1/reference-codes/lookup  
  
Should follow frequency order of old orders  
  
Need to check the Saving order scenario for Reference Codes

---

## LINX-6136 — FE - Long Order Creation - Product Information Section (Add Product - Add Hazmat) - Part 2

**Status:** Done  
**Type:** Story  
**Labels:** Approved, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update Hazmat details for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6137 — FE - Long Order Creation - Add Product (General) - Product Information Section Validation (OTMS-575)

**Status:** Done  
**Type:** Story  
**Labels:** FE

_(no description)_

---

## LINX-6139 — FE - Quick Order Creation - Owning Org Changes (OTMS-547) - Part 2

**Status:** Ready for Development  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update General and References sections (mandatory and optional fields) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6141 — BE - OrgAddress API Adding Prefix to Retain Frequency Order (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE

_(no description)_

---

## LINX-6142 — BE- Quick Order Creation - Pickup / Delivery Section (Consignor) - Pagination implementation for Org fields (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Need to apply pagination for all the fields

---

## LINX-6143 — FE - Quick Order Creation - Special Services section (Manage Special Services) (OTMS-1463)

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update Special Services section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6144 — BE - Long Order Creation - Product Information Section (Add Product - Add Hazmat) - Packaging Group (Master data) (OTMS-103)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Write an API in Master data to get Packaging group  
  
/product-service/v1/packing-groups  
  
Refer below story for DB and table mapping  
[\[OTMS-2261\] DB: Package group and WGK Code table detail form master data - Jira](https://odysseylogistics.atlassian.net/browse/OTMS-2261)

---

## LINX-6145 — BE - Long Order Creation - Product Information Section (Add Product - Add Hazmat) UoM - for Flashpoint frequency sorting (Order Service) (OTMS-103)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Add the Frequency Sorting with Pagination implementation for the data received from the master data for the UoM - for Flash Point.

---

## LINX-6146 — BE-Quick Order Creation - Special Services section- master-service-Dropdown static values(OTMS-98)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Special Services section- Dropdown default values should be BR 1(b)

1. Pallet jack, 
2. Lumper, 
3. Lift Gate At Delivery, 
4. Lift Gate At Pickup, 
5. Detention Loading, 
6. Detention Unloading, 
7. Trailer Drop, 
8. Drop Container

---

## LINX-6147 — BE-Quick Order Creation - Special Services section- order-service-Dropdown static values (orderservice)(OTMS -98)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Call order service to get the frequency the Special Services has been used in orders (highest to lowest) 

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-1458</custom>

---

## LINX-6148 — BE-Quick Order Creation - Special Services section- Special Service listing- Aggregate OTMS-1460,OTMS-1458,OTMS-1463 values

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Aggregate <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-1460</custom>  and <custom data-type="smartlink" data-id="id-1">https://odysseylogistics.atlassian.net/browse/OTMS-1458</custom>  values for final special service listing search results<custom data-type="smartlink" data-id="id-2">https://odysseylogistics.atlassian.net/browse/OTMS-1463</custom>

---

## LINX-6149 — Quick Order Creation - General and References Sections

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS user, I want to be able to update General and References sections (mandatory and optional fields) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6150 — Quick Order Creation - Reorder columns & change column width in Product Information section

**Status:** Analysis  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS user, I want to be able to reorder columns and / or change column width in the Product Information section / table for an order that I am attempting to create, so that I can have the desired view of product(s) being added to the order.

---

## LINX-6151 — BE - Auto populate Pickup Delivery fields based on Org ID/Org Name and/Or Longname (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE

Changes deployed in Dev and QA env. 

‌

curl --location '[https://dev.order.linx.odysseylogistics.com/order-service/v1/orglong-name/lookup'](https://dev.order.linx.odysseylogistics.com/order-service/v1/orglong-name/lookup') \\  
\--header 'Content-Type: application/x-www-form-urlencoded' \\  
\--data-urlencode '%7B%0A%22orgIdOrgCode%22%3A%20%2263%20-%20CU0000010354%22%2C%0A%22longName%22%3A%20null%0A%7D='

---

## LINX-6152 — FE - Long Order Creation - Product Information Section (Add Product - Product Details) (OTMS-99) Part 1

**Status:** Done  
**Type:** Story  
**Labels:** Approved, BE_LLD_Done, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update Product Details sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6155 — BE-Quick Order Creation - Pickup / Delivery Section (Consignor) - ID / Organization Name (OTMS-559)

**Status:** Blocked  
**Type:** Story  
**Labels:** BE

<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-559</custom> BR# 2(a) 

/master-data/v1/org-name/lookup

---

## LINX-6158 — BE - Long Order Creation - Product Information Section (Add Product - Add Hazmat) - Packaging Group (Order data) (OTMS-103)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Write an API in Order Service to get Packaging group from master data API call   
  
/order-service/v1/packing-groups

Refer below story for DB and table mapping  
[\[OTMS-2261\] DB: Package group and WGK Code table detail form master data - Jira](https://odysseylogistics.atlassian.net/browse/OTMS-2261)

---

## LINX-6159 — Long Order Creation - Pickup / Delivery section

**Status:** New  
**Type:** Story  
**Labels:** Approved, BE_LLD_Done, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update optional fields in the Pickup / Delivery section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6160 — BE : Long Order Creation - Product Information Section (Add Product - Product Details)(Declared Value Currency)Master data with Pagination (OTMS -99)

**Status:** Done  
**Type:** Story  
**Labels:** BE_LLD, BE_LLD_Done

Write an API to get **Declared Value Currency** details from Master data with pagination 

| **UI Field Name** | **Table Name** | **Column Name** | **DB Model Status** | **Legacy TMS DB** | **Remarks** |
| --- | --- | --- | --- | --- | --- |
| Declared Value | order_line | Net Value | already there | mf_currency.curr_code |   |

---

## LINX-6161 — BE-Quick Order Creation - References Sections-Order Identifier (OTMS-547)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Order Identifier :

/master-data/v1/order-identifier/validation

1. alphanumeric & special characters, including space, should be allowed with minimum 1 character and maximum of 150 characters

---

## LINX-6162 — BE - Long Order Creation - Product Information Section (Add Product - Add Hazmat) - WGK Code (Order Service) (OTMS-103)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Write an API in Master data to get WGK Codes  
  
/order-service/v1/gwk-codes  
  
Refer below story for DB and table mapping  
[\[OTMS-2261\] DB: Package group and WGK Code table detail form master data - Jira](https://odysseylogistics.atlassian.net/browse/OTMS-2261)

---

## LINX-6163 — BE-Pagination Quick Order Creation - General Fields (OTMS-547)

**Status:** Ready for Development  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Pagination on final list in orderservice

---

## LINX-6164 — BE : Long Order Creation - Product Information Section (Add Product - Product Details)(Declared Value Currency)OrderService  (OTMS -99)

**Status:** Done  
**Type:** Story  
**Labels:** BE_LLD, BE_LLD_Done

Call master data to get list of **Declared Value Currency**

---

## LINX-6165 — FE - Quick Order Creation - Manage Column option for Product Information Section (OTMS-595) Part 1

**Status:** Done  
**Type:** Story  
**Labels:** Approved, BE_LLD_Done, Refinement_done, VD_Approved, VD_Completed

As a Odyssey TMS user, I want to be able to manage columns shown at line level, in the Product information section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6167 — FE - Long Order Creation - References section (OTMS-53)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update optional fields in the References section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6171 — FE - Long Order Creation - General section- Country Call Code (OTMS-49)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done

As a Odyssey TMS user, I want to be able to update General section (fields other than the ones which are part of Quick order creation - General section) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6172 — FE - Quick Order Creation - Ship and Delivery Date and Time (Consignor and Consignee)(OTMS-708)

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update Ship and Delivery Date and Time in the Pickup / Delivery section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6173 — FE - Quick Order Creation - General and References Sections (OTMS-547) - Part 1

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update General and References sections (mandatory and optional fields) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6174 — BE : Long Order Creation - Product Information Section (Add Product - Product Details)OrderService (Currency)-(Frequency sorting +pagination)) (OTMS -99)

**Status:** Done  
**Type:** Story  
**Labels:** BE_LLD, BE_LLD_Done

Order-service api

`/order-service/lookup/v1/currency/lookup`

Add frequency based sorting and pagination for currency API

---

## LINX-6175 — BE- Quick Order Creation - Pickup / Delivery Section (Consignor) - Retrieve default lists for all Org fields (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Need to retrieve default lists for all the fields while order page loading  
As part of the default list, need to fetch data from Order service

---

## LINX-6176 — FE - Quick Order Creation - Special Services section (Quick selection) (OTMS-98)

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to update Special Services section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6180 — BE-Long Order Creation - General section- Order-service-Country Code dropdown (OTMS-49)

**Status:** Done  
**Type:** Story  
**Labels:** BE

_(no description)_

---

## LINX-6181 — BE - Long Order Creation - Product Information Section (Add Product - Add Hazmat) - WGK Code frequency Sorting (Order service) (OTMS-103)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Add frequency Sorting to WGK Codes API

---

## LINX-6182 — BE-Long Order Creation - General section- Component Creation for Country Call Code dropdown Pre Loading (OTMS-49)

**Status:** Done  
**Type:** Story  
**Labels:** BE

_(no description)_

---

## LINX-6183 — BE-Long Order Creation - Pickup / Delivery section Address Line 2 and Address Line 3 (Master Service) (OTMS-104)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Add the lookup for address line2 and line3 <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/OTMS-104</custom> 

/customer-service/v1/org-name/lookup

---

## LINX-6185 —  BE-Long Order Creation - Product Information Section (Add Product - General) - Country of Origin (OTMS-575) OrderService 

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Order-service api

`/order-service/lookup/v1/country-origin/lookup`

Create api endpoint for country of origin

BR#2(e)

---

## LINX-6186 — BE : Long Order Creation - Product Information Section (Add Product - Product Details)Master Data For missing codes in the sorted list   (OTMS -99)

**Status:** Done  
**Type:** Story  
**Labels:** BE_LLD, BE_LLD_Done

Master Data additional API for  missing codes in the sorted list

---

## LINX-6187 —  BE-Quick Order Creation - Product Information Section (Add Product)- Product ID and Product Description (Order Service) (Product ID) -OTMS 795

**Status:** Done  
**Type:** Story  
**Labels:** BE

To create API endpoints to list  Product IDs, listed based on the frequency with which the Product ID has been used in orders (highest to lowest)

/order-service/v1/product/lookup

---

## LINX-6188 — BE-Long Order Creation - Product Information Section (Add Product - General) - Country of Origin (OTMS-575) OrderService ,Pagination and Frequency sorting

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Create api endpoint for country of origin

BR#2(e)

---

## LINX-6191 — FE - Quick Order Creation - Org-Address Lookup API Integration and Validation (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** FE

_(no description)_

---

## LINX-6192 — BE - Long Order Creation - Product Information Section (Add Product - Add Hazmat) - WGK Code (Master Service) (OTMS-103)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done

Write an API in Master data to get WGK Codes  
  
/product-service/v1/gwk-codes  
  
Refer below story for DB and table mapping  
[\[OTMS-2261\] DB: Package group and WGK Code table detail form master data - Jira](https://odysseylogistics.atlassian.net/browse/OTMS-2261)

---

## LINX-6193 — BE - Long Order Creation - General section - Instruction Type Lookup sorting (Order Service) (OTMS-50)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done, OTMS_Phase1

As a Odyssey TMS user, I want to be able to add instruction(s) in the General section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6194 — FE - Long Order Creation - General section (Add Instructions) (OTMS-50)

**Status:** Done  
**Type:** Story  
**Labels:** FE, OTMS_Phase1

As a Odyssey TMS user, I want to be able to add instruction(s) in the General section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6195 — BE - Long Order Creation - General section - Instruction Type Lookup (Master Service) (OTMS-50)

**Status:** Done  
**Type:** Story  
**Labels:** BE, BE_LLD_Done, OTMS_Phase1

As a Odyssey TMS user, I want to be able to add instruction(s) in the General section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6206 — QA - Quick Order Creation - Pickup / Delivery Section (Consignor and Consignee) (OTMS-559)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, Refinement_done, VD_Completed

As a Odyssey TMS user, I want to be able to update Pickup / Delivery section (Consignor and Consignee details) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6208 — Quick Order Creation - Ship and Delivery Date and Time (Consignor and Consignee)

**Status:** Functional Testing  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Completed

As a Odyssey TMS user, I want to be able to update Ship and Delivery Date and Time in the Pickup / Delivery section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6209 — Performance Issue : Product and Customer data

**Status:** New  
**Type:** Story  
**Labels:** BE

_(no description)_

---

## LINX-7488 — Enable Sonar server quality gates for all services

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Enable Sonar server quality gates for all services

---

## LINX-7489 — Change Legacy TMS db configuration in AWS Secret manager

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Change Legacy TMS db configuration in AWS Secret manager

Need to change 

Oracle Database:

---

From

Name: t1ps-db07

IP: 192.168.0.24

Port: 1521

Database: ps04

 

To

Name: t1ps-db04

IP:192.168.0.66

Port: 1521

Database: ps02

 

AWS Master Data Service

---

## LINX-7490 — Devops-Shut down CX services for Cost Optimization for all environments

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Shut down CX services for Cost Optimization for all environments  
Need to avoid billing for resources which are able to recreate  
1)ECS services  
2)Databricks and User sync jobs  
3)RDS database  
4)WAF  
6)Dashboards

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=64d2918f-ae42-4ddb-964b-da93011fd01d&&collection=&height=200&occurrenceKey=null&width=260&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
| 1)ECS services  |   |
| --- | --- |
| These are serverless, correct? | yes,these Fargate ecs services are serverless |
| Is there a cost associated with them if they aren't being use? | yes it will be chargeable even if not in use(Need to destroy the containers to eliminate cost) |
| If not cost, it's not problem keeping them running | running services will cost so we need to destroy and to recreate containers with same image |
| 2)Databricks and User sync jobs |   |
| I would think these need to be shutdown.  I would assume the latest cost is associated with these, both on the service level and the db level. | These are batch jobs(fargate ecs tasks) triggered by Eventbridge cron jobs so we can disable these or change cron_schedule = "cron(30 3 ? \* MON-FRI \*)" to monthly as per the requirement to avoid costing. |
| 3)RDS database |   |
| The cost of the instance might be a reason to shut it down, however not sure how hard it would be to start back up again later. | To fully eliminate the cost you have to terminate the db instance, and to keep existing manual backups or snapshots of it to recreate db instance. If you terminate the instance, while keeping the backups, you will be getting charged for their storage. |
| If we can downgrade the instance and stop writing data to RDS from Databricks, not sure if this needs to be shutdown completely. | If we already keep services and batch jobs down then RDS not required to be running.But you will be charged for storage if we stop RDS instance.Downgrade instance size also a option |

---

## LINX-7491 — Integrate Pipelines with New OTMS Sonar server

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Integrate Pipelines with New OTMS Sonar server

<custom data-type="smartlink" data-id="id-0">https://github.com/OneOdyssey/otms-odyssey-masterdata-service</custom>   
<custom data-type="smartlink" data-id="id-1">https://github.com/OneOdyssey/otms-odyssey-order-service</custom>   
<custom data-type="smartlink" data-id="id-2">https://github.com/OneOdyssey/otms-odyssey-address-service</custom>   
<custom data-type="smartlink" data-id="id-3">https://github.com/OneOdyssey/otms-odyssey-order-ui</custom>   
<custom data-type="smartlink" data-id="id-4">https://github.com/OneOdyssey/otms-odyssey-ui</custom>

---

## LINX-7492 — Setup OTMS ECS alerts through teams channel

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Setup OTMS ECS alerts through teams channel  
  
Need to create teams channel endpoint and event rule to get notifications.

---

## LINX-7493 — Setup-VPC Route table setting from VPN

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Setup-VPC Route table setting from VPN

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=f42589d4-e200-4c38-821c-67b00f225b07&&collection=&height=596&occurrenceKey=null&width=2258&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
‌

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=df16c957-5c83-4e49-83cc-67e252948bf3&&collection=&height=390&occurrenceKey=null&width=2018&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
‌

So that VPC resources will get external On Premises db server access

---

## LINX-7494 — Dev and QA-Setup OTMS ECS Cloudwatch alarms and alerts

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Dev and QA-Setup OTMS ECS Cloudwatch alarms and alerts  
Need to get Cloudwatch alarm alerts to teams channel as mentioned below and Alarm configurations for all BE services   
masterdata,order and address services as mentioned below

```
otms_ecs_endpoint = "8c310e52.odysseylogistics.com@amer.teams.ms"

#Masterdata Service ECS Alarm Configurations
masterdata_service_cpu_alarm_threshold = 80
masterdata_service_memory_alarm_threshold = 85
masterdata_service_cpu_alarm_evaluation_periods = 1
masterdata_service_cpu_alarm_period = 300
masterdata_service_memory_alarm_evaluation_periods = 1
masterdata_service_memory_alarm_period = 300

#Order Service ECS Alarm Configurations
order_service_cpu_alarm_threshold = 80
order_service_memory_alarm_threshold = 85
order_service_cpu_alarm_evaluation_periods = 1
order_service_cpu_alarm_period = 300
order_service_memory_alarm_evaluation_periods = 1
order_service_memory_alarm_period = 300

#Address Service ECS Alarm Configurations
address_service_cpu_alarm_threshold = 80
address_service_memory_alarm_threshold = 85
address_service_cpu_alarm_evaluation_periods = 1
address_service_cpu_alarm_period = 300
address_service_memory_alarm_evaluation_periods = 1
address_service_memory_alarm_period = 300
```

---

## LINX-7496 — LLD Creation

**Status:** Done  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-7497 — Fix Duplicate invocaton of ECS alerts

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Fix Duplicate invocaton of ECS alerts to Teams channel.  
Need to check this channel should have single alert when ECS Task state changes  
[OTMS-CI/CD-Alerts | OTMS-Nprd-ECS-Alerts | Microsoft Teams](https://teams.microsoft.com/l/channel/19%3AjKwWjFO2dmgwdcx2jVBXWduEH6ho21oeNkBnEDcpcok1%40thread.tacv2/OTMS-Nprd-ECS-Alerts?groupId=045ab933-1c2f-4f73-883f-528aded41f42&tenantId=a0939492-debd-4ad8-b4f0-475854182417)

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=5f55bab5-0583-4b15-acdb-0e1ef64f15aa&&collection=&height=477&occurrenceKey=null&width=1229&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)

---

## LINX-7498 — Setup Environment Vars for Order Service

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Setup Environment Vars for Order Service in application properties file  
[https://github.com/OneOdyssey/otms-odyssey-order-service/blob/9db49d4928d68e7a814fb52f6f52ff1d4da8c395/src/main/resources/application.properties#L23](https://github.com/OneOdyssey/otms-odyssey-order-service/blob/9db49d4928d68e7a814fb52f6f52ff1d4da8c395/src/main/resources/application.properties#L23) 

```
master-data-service.base_url=http://localhost:8080/  >> ${MASTERDATA_SERVICE_URL}
master-data-service.url=master-data/v1/

address-service.base_url=http://localhost:8082/ >> ${ADDRESS_SERVICE_URL}
address-service.url =address-service/v1/
```

---

## LINX-7499 — BE - LLD creation

**Status:** Done  
**Type:** Task  
**Labels:** BE

_(no description)_

---

## LINX-7500 — Fix common Infra configuration between dev and qa

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Fix common Infra configuration between dev and qa  
  
Remove common resources between dev and qa environments and create seperate subnet2 with `cidr `  
`subnet_cidr_2 = "10.205.26.160/28"`  
**common resources reverted and created seperated**

1. "aws_subnet.otms_subnet_2 subnet-00f3f688d67b08435"
2. "aws_route_table_association.subnet_association_2 subnet-00f3f688d67b08435/rtb-0218f6f115e08bdae"
3. "aws_eip.nat_eip eipalloc-0b40c1ab589834f18"
4. "aws_nat_gateway.nat_gateway nat-0505fd9a892157e2c"
5. "aws_route.nat_gateway_route rtb-04f19087a91ad6505_0.0.0.0/0"
6. "aws_route_table.private_route_table rtb-04f19087a91ad6505"

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=ddb57e1f-209e-4ac7-b9de-4a4c1827ad48&&collection=&height=235&occurrenceKey=null&width=1479&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)

---

## LINX-7504 — LLD Creation

**Status:** Done  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-7505 — Add Sonar Server documentation on wiki page

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Add Sonar Server documentation on wiki page

1. Dashboard
2. Quality gate 
3. Coverage
4. Issues
5. build failure sample with screen shots

---

## LINX-7506 — BE - Sonar failure due to Junit Test coverage - Fix 

**Status:** Done  
**Type:** Task  
**Labels:** BE

_(no description)_

---

## LINX-7507 — Dev and QA-Update Order service Api's

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Update Order service Api’s  
 

| Mapping | Before | Now |
| --- | --- | --- |
| GetMapping | /order-service/lookup/v1/find-order/{orderId} | /order-service/v1/find-order/{orderId}/lookup |
| GetMapping | /order-service/lookup/v1/freight-terms | /order-service/v1/freight-terms/lookup |
| GetMapping | /order-service/lookup/v1/order-status/findall | /order-service/v1/order-status/findall/lookup |
| GetMapping | /order-service/lookup/v1/ship-directions | /order-service/v1/ship-directions/lookup |
| PostMapping | /order-service/lookup/v1/org-address/lookup | /order-service/v1/org-address/lookup |
| PostMapping | /order-service/lookup/v1/timezones | /order-service/v1/timezones/lookup |
| GetMapping | /order-service/lookup/v1/default-services | /order-service/v1/default-services/lookup |
| GetMapping | /order-service/lookup/v1/handling-units | /order-service/v1/handling-units/lookup |
| PostMapping | /order-service/lookup/v1/product-service/v1/special-services/lookup | /order-service/v1/product-service/v1/special-services/lookup |
| PostMapping | /order-service/lookup/v1/instruction-type | /order-service/v1/instruction-type/lookup |
| GetMapping | /order-service/lookup/v1/ship-class | /order-service/v1/ship-class/lookup |
| PostMapping | /order-service/lookup/v1/uom-type | /order-service/v1/uom-type/lookup |
| GetMapping | /order-service/lookup/v1/ship-class-id | /order-service/v1/ship-class-id/lookup |
| PostMapping | /order-service/lookup/v1/currency/lookup | /order-service/v1/currency/lookup |
| PostMapping | /order-service/lookup/v1/country-origin/lookup | /order-service/v1/country-origin/lookup |
| PostMapping | /order-service/lookup/v1/find-orders | /order-service/v1/find-orders/lookup |
| PostMapping | /order-service/lookup/v1/equipment/lookup | /order-service/v1/equipment/lookup |

 or please refer   
[https://dev.order.linx.odysseylogistics.com/order-swagger/v3/api-docs](https://dev.order.linx.odysseylogistics.com/order-swagger/v3/api-docs)

---

## LINX-7508 — Setup Sonar Server in NonProd-NGTMS account

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Setup Sonar Server in NonProd-NGTMS account

---

## LINX-7509 — FE - Analysis - Sonar findings and fix for Order UI

**Status:** Done  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-7511 — FE - Analysis - Sonar findings and fix for  Shell APP UI

**Status:** Done  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-7512 — Setup Redis service for Elastic cache

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Setup Redis service for Elastic cache  
[https://github.com/OneOdyssey/elastic-cache-service](https://github.com/OneOdyssey/elastic-cache-service)

---

## LINX-7513 — HLD Creation for Manual Order

**Status:** Done  
**Type:** Task  
**Labels:** —

To create HLD design diagram to depict the flow or manual order process.

To list down the components and services that are to be used in the design

---

## LINX-7514 — LLD Creation

**Status:** Done  
**Type:** Task  
**Labels:** —

LLDs worked on for the stories 2249, 2253, 2257

---

## LINX-7515 — DB changes- OTMS-559,OTMS-49

**Status:** New  
**Type:** Task  
**Labels:** DB

DB changes- OTMS-559,OTMS-49  
For **ID / Organization Name** field need to bring Organization_ID field to table.

| UI Field Name | Table Name | Column Name |
| --- | --- | --- |
| ID / Organization Name | order_involved_party | source_tbl_primary_key |
| Long Name | order_involved_party | party_name |
| Address Line 1 | order_involved_party | address1 |
| City | order_involved_party | city_name |
| Region | order_involved_party | region_name |
| Postal Code | order_involved_party | postal_code |
| Country | order_involved_party | country_name |
| Early Pickup Date & Time  | order_info | requested_ship_timestamp |
| Late Pickup Date & Time | order_info | pickup_appointment_timestamp |
| Early Delivery Date & Time | order_info | requested_delivery_timestamp |
| Late Delivery Date & Time | order_info | delivery_appointment_timestamp |

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=b28e3353-4a2d-4379-8204-ca5e513c3e21&&collection=&height=198&occurrenceKey=null&width=1831&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)

---

## LINX-7516 — BE - Sonar failure due to Junit Test coverage - Fix (Order Service)

**Status:** Done  
**Type:** Task  
**Labels:** BE

_(no description)_

---

## LINX-7518 — LLD Creation

**Status:** Done  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-7519 — Fix sonar issue by Clean up sonar server unused volumes

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Clean up sonar server unused volumes to free up space to fix the issue

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=8ea22496-12d2-4a3c-9b25-0a7fc9e5c53f&&collection=&height=485&occurrenceKey=null&width=1342&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)

---

## LINX-7521 — BE-Enable Sonar quality gate and test coverage for all the services

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

BE-Enable Sonar quality gate and test coverage for all the services

<custom data-type="smartlink" data-id="id-0">https://github.com/OneOdyssey/otms-odyssey-masterdata-service</custom>   
<custom data-type="smartlink" data-id="id-1">https://github.com/OneOdyssey/otms-odyssey-order-service</custom>   
<custom data-type="smartlink" data-id="id-2">https://github.com/OneOdyssey/otms-odyssey-address-service</custom>

---

## LINX-7522 — FE-Enable Sonar quality gate and test coverage for all the Repos

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

FE-Enable Sonar quality gate and test coverage for all the Repos

<custom data-type="smartlink" data-id="id-0">https://github.com/OneOdyssey/otms-odyssey-order-ui</custom>   
<custom data-type="smartlink" data-id="id-1">https://github.com/OneOdyssey/otms-odyssey-ui</custom>

---

## LINX-7523 — Create SSL Certificates for Master data and address Service in Dev and QA environment

**Status:** Done  
**Type:** Task  
**Labels:** DevOps

Create SSL Certificates for Master data and address Service in Dev and QA environment in aws acm for below domains and to Validate from Domain authority

[dev.address.linx.odysseylogistics.com](http://dev.address.linx.odysseylogistics.com)   
[dev.masterdata.linx.odysseylogistics.com](http://dev.masterdata.linx.odysseylogistics.com)  
  
[qa.address.linx.odysseylogistics.com](http://dev.address.linx.odysseylogistics.com)   
[qa.masterdata.linx.odysseylogistics.com](http://dev.masterdata.linx.odysseylogistics.com)

---

## LINX-7524 — DB - Mode column creation for General section and party_id, party_long_name for Pickup/Delivery

**Status:** Done  
**Type:** Task  
**Labels:** DB

Mode column to be added in order carrier detail table.  
Add party_id fields in order_involved_party table

---

## LINX-7525 — BE - Mock data for Pickup/Delivery and Time Zone sections

**Status:** Done  
**Type:** Task  
**Labels:** BE

_(no description)_

---

## LINX-7540 — [OTMS-103] Mandatory fields not highlighted in Add Hazmat section

**Status:** New  
**Type:** Defect  
**Labels:** OTMS_Phase1

Mandatory fields not highlighted in Add Hazmat section

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=c9ff752b-4c41-4f79-af94-e3cdeee679dd&&collection=&height=672&occurrenceKey=null&width=1280&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
Not taken into account for saving hazmat information either.

---

## LINX-7541 — [OTMS-795] Unable to create quick order

**Status:** New  
**Type:** Defect  
**Labels:** OTMS_Phase1

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=969769d5-0c86-488e-b94a-912599e9ca8a&&collection=&height=672&occurrenceKey=null&width=1280&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=f1e76576-5859-4b53-8d09-2cb01e50825e&&collection=&height=672&occurrenceKey=null&width=1280&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=e6885145-8e71-47a1-b903-c6e25d375f66&&collection=&height=672&occurrenceKey=null&width=1280&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)
Clicking on Create after filling all mandatory fields does not lead to order creation or success message being displayed

---

## LINX-7542 — [OTMS-795] Volume shows as '-' by default and should be blank

**Status:** New  
**Type:** Defect  
**Labels:** OTMS_Phase1

Volume shows as '-' by default and should be blank

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=c3e91659-e419-4ab0-afc8-433940cc3b3b&&collection=&height=672&occurrenceKey=null&width=1280&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)

---

## LINX-7544 — [OTMS-795] List does not change when switching between US and Metric UoM

**Status:** New  
**Type:** Defect  
**Labels:** OTMS_Phase1

List does not change when switching between US and Metric UoM -  

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=27a9bb1d-b4e7-443b-8c99-b5f3e3b02b05&&collection=&height=672&occurrenceKey=null&width=1280&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)

---

## LINX-7545 — BE - A utility for frequency based sorted map with pagination(blocks OTMS-98,547,795,99)

**Status:** Closed  
**Type:** Spike  
**Labels:** BE

_(no description)_

---

## LINX-7546 — BE- Caching Owning Organization data from master service

**Status:** Ready for Release Planning  
**Type:** Spike  
**Labels:** BE

To use caching to store the owning organization from master data service. 

Doing blind search against MF_ORGANIZATION is very costly and has latency.

---

## LINX-7547 — BE - A Generic Method to do sorting (OTMS -547)

**Status:** Done  
**Type:** Spike  
**Labels:** —

A  generic method to be written to do sorting based on the frequency with which the field values  has been used in orders (highest to lowest)

Approach can be a method which accepts two parameters, List of (Entity class object )generic type list  and  String Type values. this method should return an Object having members id, value and count (to represent frequency)

---

## LINX-7583 — Verify if the time zone is manually updated, then the time zone dropdown should be restricted to the selected time zone for the  'Late Delivery Date & Time' field and does not allow further updation.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the time zone is manually updated, then the time zone dropdown should be restricted to the selected time zone for the  'Late Delivery Date & Time' field and does not allow further updation.

---

## LINX-7584 — Verify if the dates are updated by the user only if 'Early Pickup Date & Time needs to be < 'Late Delivery Date & Time' within calendar component.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the dates are updated by the user only if 'Early Pickup Date & Time needs to be < 'Late Delivery Date & Time' within calendar component.

---

## LINX-7585 — Verify if time zones listed in the dropdown will be based on the frequency with which time zone is used in the orders from highest to lowest on the 'Late Delivery Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if time zones listed in the dropdown will be based on the frequency with which time zone is used in the orders from highest to lowest on the 'Late Delivery Date & Time' field.

---

## LINX-7586 — Verify if the user should be able to select Planning Date Type as either 'Ship Date & Time' or 'Delivery Date & Time' radio button.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the user should be able to select Planning Date Type as either 'Ship Date & Time' or 'Delivery Date & Time' radio button.

---

## LINX-7587 — Verify if 'Late Pickup Date & Time' should be mandatory when Ship Date is selected and 'Late Delivery Date & Time' should be mandatory when Delivery Date is selected as the planning date type.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if 'Late Pickup Date & Time' should be mandatory when Ship Date is selected and 'Late Delivery Date & Time' should be mandatory when Delivery Date is selected as the planning date type.

---

## LINX-7588 — Verify if the 'Time zone selected is not aligned with the Address’ warning message is displayed when user changes the time zone for the 'Late Delivery Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the 'Time zone selected is not aligned with the Address’ warning message is displayed when user changes the time zone for the 'Late Delivery Date & Time' field.

---

## LINX-7589 — Verify if a time zone cannot be extracted based on City, Region, Postal Code and Country, then user should be able to select time zone from the dropdown on the 'Late Delivery Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if a time zone cannot be extracted based on City, Region, Postal Code and Country, then user should be able to select time zone from the dropdown on the 'Late Delivery Date & Time' field.

---

## LINX-7590 — Verify if the Time zone will be auto-populated based on City, Region, Postal Code and Country on the 'Late Delivery Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the Time zone (in 3 letter code, including daylight savings based on the date & time) will be auto-populated based on City, Region, Postal Code and / or Country selection by user, as applicable

---

## LINX-7591 — Verify if the time zone will not be populated when the 'Late Delivery Date & Time' field is not entered.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the time zone will not be populated when the 'Late Delivery Date & Time' field is not entered.

---

## LINX-7628 — Verify if user should be able to select a past or current or future date (single date selection only) and time (24 hr. format) in the 'Early Delivery Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if user can use to select a past or current or future date (single date selection only) and time (24 hr. format) to have it populated in the 'Early Delivery Date & Time' field.

---

## LINX-7629 — Verify if the format as ‘MM/DD/YYYY' and ‘HH:MM’ for 'Early Delivery Date & Time' field also Time is defaulted to '00:00’ and user can update as needed.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the format as ‘MM/DD/YYYY' and ‘HH:MM’ for 'Early Delivery Date & Time' field also Time is defaulted to '00:00’ and user can update as needed.

---

## LINX-7630 — Verify if the Time zone will be auto-populated based on City, Region, Postal Code and Country on the 'Early Delivery Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the Time zone (in 3 letter code, including daylight savings based on the date & time) will be auto-populated based on City, Region, Postal Code and / or Country selection by user, as applicable

---

## LINX-7632 — Verify if selecting past or current date on the 'Early Delivery Date & Time' field, the system should display ‘Past or current date selected. Please check and modify as needed’ warning message.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if selecting past or current date on the 'Early Delivery Date & Time' field, the system should display ‘Past or current date selected. Please check and modify as needed’ warning message.

---

## LINX-7634 — Verify if user should be able to easily clear or select a new 'Early Delivery Date & Time' as needed, prior to order creation and 'Early Delivery Date & Time' can also be null / blank.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if user should be able to easily clear or select a new 'Early Delivery Date & Time' as needed, prior to order creation and 'Early Delivery Date & Time' can also be null / blank.

---

## LINX-7651 — Verify if the dates are updated by the user only if 'Early Delivery Date' should be <= 'Late Delivery Date' within calendar component.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the dates are updated by the user only if 'Early Delivery Date' should be <= 'Late Delivery Date' within calendar component.

---

## LINX-7652 — Verify if the user receives ‘Early Delivery Date & Time should be < Late Delivery Date & Time. Please select a date in-line with this rule’ error message when the dates provided does not matches 'Early Delivery Date' should be <= 'Late Delivery Date' rule

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the user receives ‘Early Delivery Date & Time should be < Late Delivery Date & Time. Please select a date in-line with this rule’ error message when the dates provided does not matches 'Early Delivery Date' should be <= 'Late Delivery Date' rule

---

## LINX-7653 — Verify if user should be able to easily clear or select a new 'Late Delivery Date & Time' as needed, prior to order creation and 'Late Delivery Date & Time' can also be null / blank.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if user should be able to easily clear or select a new 'Late Delivery Date & Time' as needed, prior to order creation and 'Late Delivery Date & Time' can also be null / blank.

---

## LINX-7654 — Verify if the format as ‘MM/DD/YYYY' and ‘HH:MM’ for 'Late Delivery Date & Time' field also Time is defaulted to '00:00’ and user can update as needed.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the format as ‘MM/DD/YYYY' and ‘HH:MM’ for 'Late Delivery Date & Time' field also Time is defaulted to '00:00’ and user can update as needed.

---

## LINX-7658 — Verify if user should be able to select a past or current or future date (single date selection only) and time (24 hr. format) in the 'Late Delivery Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if user can use to select a past or current or future date (single date selection only) and time (24 hr. format) to have it populated in the 'Late Delivery Date & Time' field.

---

## LINX-7661 — Verify if selecting past or current date on the 'Late Delivery Date & Time' field, the system should display ‘Past or current date selected. Please check and modify as needed’ warning message.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if selecting past or current date on the 'Late Delivery Date & Time' field, the system should display ‘Past or current date selected. Please check and modify as needed’ warning message.

---

## LINX-7662 — Verify if a time zone cannot be extracted based on City, Region, Postal Code and Country, then user should be able to select time zone from the dropdown on the 'Early Delivery Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if a time zone cannot be extracted based on City, Region, Postal Code and Country, then user should be able to select time zone from the dropdown on the 'Early Delivery Date & Time' field.

---

## LINX-7663 — Verify if time zones listed in the dropdown will be based on the frequency with which time zone is used in the orders from highest to lowest on the 'Early Delivery Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if time zones listed in the dropdown will be based on the frequency with which time zone is used in the orders from highest to lowest on the 'Early Delivery Date & Time' field.

---

## LINX-7664 — Verify if the time zone will not be populated when the 'Early Delivery Date & Time' field is not entered.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the time zone will not be populated when the 'Early Delivery Date & Time' field is not entered.

---

## LINX-7665 — Verify if the 'Time zone selected is not aligned with the Address’ warning message is displayed when user changes the time zone for the 'Early Delivery Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the 'Time zone selected is not aligned with the Address’ warning message is displayed when user changes the time zone for the 'Early Delivery Date & Time' field.

---

## LINX-7666 — Verify if the time zone is manually updated, then the time zone dropdown should be restricted to the selected time zone for the  'Early Delivery Date & Time' field and does not allow further updation.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the time zone is manually updated, then the time zone dropdown should be restricted to the selected time zone for the  'Early Delivery Date & Time' field and does not allow further updation.

---

## LINX-7783 — Verify if user should be able to easily clear or select a new 'Early Pickup Date & Time' as needed, prior to order creation and 'Early Pickup Date & Time' can also be null / blank.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if user should be able to easily clear or select a new 'Early Pickup Date & Time' as needed, prior to order creation and 'Early Pickup Date & Time' can also be null / blank.

---

## LINX-7786 — Verify if the format as ‘MM/DD/YYYY' and ‘HH:MM’ for 'Early Pickup Date & Time' field also Time is defaulted to '00:00’ and user can update as needed.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the format as ‘MM/DD/YYYY' and ‘HH:MM’ for 'Early Pickup Date & Time' field also Time is defaulted to '00:00’ and user can update as needed.

---

## LINX-7790 — Verify if the 'Time zone selected is not aligned with the Address’ warning message is displayed when user changes the time zone for the 'Early Pickup Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the 'Time zone selected is not aligned with the Address’ warning message is displayed when user changes the time zone for the 'Early Pickup Date & Time' field.

---

## LINX-7793 — Verify that the user has the option to log out from any page of OTMS.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that the user has the option to log out from any page of OTMS.

---

## LINX-7794 — Verify if a time zone cannot be extracted based on City, Region, Postal Code and Country, then user should be able to select time zone from the dropdown on the 'Early Pickup Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if a time zone cannot be extracted based on City, Region, Postal Code and Country, then user should be able to select time zone from the dropdown on the 'Early Pickup Date & Time' field.

---

## LINX-7795 — Verify if the Time zone will be auto-populated based on City, Region, Postal Code and Country on the 'Early Pickup Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the Time zone (in 3 letter code, including daylight savings based on the date & time) will be auto-populated based on City, Region, Postal Code and / or Country selection by user, as applicable

---

## LINX-7796 — Verify that the user can log out of OTMS and is directed to the logout page.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that the user can log out of OTMS and is directed to the logout page.

---

## LINX-7797 — Verify if the time zone will not be populated when the 'Early Pickup Date & Time' field is not entered.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the time zone will not be populated when the 'Early Pickup Date & Time' field is not entered.

---

## LINX-7798 — Verify that the logout page has the option to log in again.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that the logout page has the option to log in again.

---

## LINX-7799 — Verify if the dates are updated by the user then 'Early Pickup Date & Time' should be <= 'Late Pickup Date & Time' and 'Early Pickup Date & Time' needs to be < 'Late Delivery Date & Time'.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the dates are updated by the user then 'Early Pickup Date & Time' should be <= 'Late Pickup Date & Time' and 'Early Pickup Date & Time' needs to be < 'Late Delivery Date & Time'.

---

## LINX-7800 — Verify if the user receives ‘Early Pickup Date & Time should be <= Late Pickup Date & Time and / or Early Pickup Date & Time needs to be <= Late Delivery Date & Time. Please select a date & time in-line with this rule’ error message is received.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the user receives ‘Early Pickup Date & Time should be <= Late Pickup Date & Time and / or Early Pickup Date & Time needs to be <= Late Delivery Date & Time. Please select a date & time in-line with this rule’ error message is received.

---

## LINX-7801 — Verify if time zones listed in the dropdown will be based on the frequency with which time zone is used in the orders from highest to lowest on the 'Early Pickup Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if time zones listed in the dropdown will be based on the frequency with which time zone is used in the orders from highest to lowest on the 'Early Pickup Date & Time' field.

---

## LINX-7802 — Verify if the time zone is manually updated, then the time zone dropdown should be restricted to the selected time zone for the  'Early Pickup Date & Time' field and does not allow further updation.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the time zone is manually updated, then the time zone dropdown should be restricted to the selected time zone for the  'Early Pickup Date & Time' field and does not allow further updation.

---

## LINX-7803 — Verify that if the user attempts to log in again from the logout page, they are directed to the SSO page.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that if the user attempts to log in again from the logout page, they are directed to the SSO page.

---

## LINX-7804 — Verify that the user can re-login from the SSO page by entering credentials.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that the user can re-login from the SSO page by entering credentials.

---

## LINX-7805 — Verify if selecting past or current date on the Late Pickup Date & Time field, the system should display ‘Past or current date selected. Please check and modify as needed’ warning message.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if selecting past or current date on the 'Late Pickup Date & Time' field, the system should display ‘Past or current date selected. Please check and modify as needed’ warning message.

---

## LINX-7806 — Verify if user should be able to easily clear or select a new 'Late Pickup Date & Time' as needed, prior to order creation and 'Late Pickup Date & Time' can also be null / blank.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if user should be able to easily clear or select a new 'Late Pickup Date & Time' as needed, prior to order creation and 'Late Pickup Date & Time' can also be null / blank.

---

## LINX-7807 — Verify if user should be able to select a past or current or future date (single date selection only) and time (24 hr. format) in the 'Late Pickup Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if user can use to select a past or current or future date (single date selection only) and time (24 hr. format) to have it populated in the 'Late Pickup Date & Time' field.

---

## LINX-7808 — Verify if the time zone will not be populated when the 'Late Pickup Date & Time' field is not entered.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the time zone will not be populated when the 'Late Pickup Date & Time' field is not entered.

---

## LINX-7809 — Verify if the 'Time zone selected is not aligned with the Address’ warning message is displayed when user changes the time zone for the 'Late Pickup Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the 'Time zone selected is not aligned with the Address’ warning message is displayed when user changes the time zone for the 'Late Pickup Date & Time' field.

---

## LINX-7810 — Verify if the format as ‘MM/DD/YYYY' and ‘HH:MM’ for 'Late Pickup Date & Time' field also Time is defaulted to '00:00’ and user can update as needed.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the format as ‘MM/DD/YYYY' and ‘HH:MM’ for 'Late Pickup Date & Time' field also Time is defaulted to '00:00’ and user can update as needed.

---

## LINX-7811 — Verify if the Time zone will be auto-populated based on City, Region, Postal Code and Country on the 'Late Pickup Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the Time zone (in 3 letter code, including daylight savings based on the date & time) will be auto-populated based on City, Region, Postal Code and / or Country selection by user, as applicable

---

## LINX-7812 — Verify if the time zone is manually updated, then the time zone dropdown should be restricted to the selected time zone for the  'Late Pickup Date & Time' field and does not allow further updation.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the time zone is manually updated, then the time zone dropdown should be restricted to the selected time zone for the  'Late Pickup Date & Time' field and does not allow further updation.

---

## LINX-7813 — Verify if a time zone cannot be extracted based on City, Region, Postal Code and Country, then user should be able to select time zone from the dropdown on the 'Late Pickup Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if a time zone cannot be extracted based on City, Region, Postal Code and Country, then user should be able to select time zone from the dropdown on the 'Late Pickup Date & Time' field.

---

## LINX-7814 — Verify if time zones listed in the dropdown will be based on the frequency with which time zone is used in the orders from highest to lowest on the 'Late Pickup Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if time zones listed in the dropdown will be based on the frequency with which time zone is used in the orders from highest to lowest on the 'Late Pickup Date & Time' field.

---

## LINX-7815 — Verify that closing the browser or tab with an active session does not log the user out of the SSO session and the user can log back into OTMS after reopening the browser or tab.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that closing the browser or tab with an active session does not log the user out of the SSO session and the user can log back into OTMS after reopening the browser or tab.

---

## LINX-7820 — Verify if the user should be able to select Planning Date Type as either 'Ship Date & Time' or 'Delivery Date & Time' radio button.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the user should be able to select Planning Date Type as either 'Ship Date & Time' or 'Delivery Date & Time' radio button.

---

## LINX-7822 — Verify if 'Late Pickup Date & Time' should be mandatory when Ship Date is selected and 'Late Delivery Date & Time' should be mandatory when Delivery Date is selected as the planning date type.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if 'Late Pickup Date & Time' should be mandatory when Ship Date is selected and 'Late Delivery Date & Time' should be mandatory when Delivery Date is selected as the planning date type.

---

## LINX-7825 — Verify if the Odyssey TMS user should be able to manually create an order and should be able to update Consignor and Consignee details along with planning dates.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the Odyssey TMS user should be able to manually create an order and should be able to update Consignor and Consignee details along with planning dates.

---

## LINX-7826 — Verify if user can be able to add 'Early Pickup Date & Time' under Ship Date and Time Consignor sub-section.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if user can be able to add 'Early Pickup Date & Time' under Ship Date and Time Consignor sub-section.

---

## LINX-7827 — Verify if user should be able to select a past or current or future date (single date selection only) and time (24 hr. format) in the 'Early Pickup Date & Time' field.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if user can use to select a past or current or future date (single date selection only) and time (24 hr. format) to have it populated in the 'Early Pickup Date & Time' field.

---

## LINX-7828 — Verify if 'Please update Late Pickup Date & Time' and 'Please update Late Delivery Date & Time' warning pop-up messages are received as expected.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if 'Please update Late Pickup Date & Time' and 'Please update Late Delivery Date & Time' warning pop-up messages are received as expected.

---

## LINX-7829 — Verify if the Date, Time & Time Zones fields are separate and looking as per the wireframe.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if the Date, Time & Time Zones fields are separate and looking as per the wireframe.

---

## LINX-7830 — Verify if selecting past or current date on the 'Early Pickup Date & Time' field, the system should display ‘Past or current date selected. Please check and modify as needed’ warning message.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify if selecting past or current date on the 'Early Pickup Date & Time' field, the system should display ‘Past or current date selected. Please check and modify as needed’ warning message.

---

## LINX-7864 — Verify that the user is directed to the SSO page if logging in for the first time if the SSO session has expired.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that the user is directed to the SSO page if logging in for the first time if the SSO session has expired.

---

## LINX-7866 — Verify that the user is automatically directed to the OTMS Landing Page if already logged in to any Odyssey system via SSO and the SSO session is active.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that the user is automatically directed to the OTMS Landing Page if already logged in to any Odyssey system via SSO and the SSO session is active.

---

## LINX-7867 — Verify that the logged in user's name is displayed in OTMS in the format ‘First name Last name’.

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that the logged in user's name is displayed in OTMS in the format ‘First name Last name’.

---

## LINX-7868 — Verify that ‘Admin’ is the default role assigned to internal users

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify that ‘Admin’ is the default role assigned to internal users

---

## LINX-7869 — Verify the ghost text "password", while entering the password to login with TMS Application

**Status:** New  
**Type:** Test Case  
**Labels:** —

Verify the ghost text "password", while entering the password to login with TMS Application

---

## LINX-7930 — Manual Order Validation

**Status:** Todo  
**Type:** Story  
**Labels:** —

As part of Manual entry, we need to validate that the data being entered is validated as part of the entry process and time of order creation/save

---

## LINX-8100 — QCA Rating Call from Order Domain (Manual Orders)

**Status:** In Development  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

As an OdysseyONE Orders internal user, the moment I have made a QCP call and have a ‘Preferred Carrier’ & associated AP cost = ‘Preferred Direct AP Cost’, <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8101</custom> I want order domain to make a QCA Rating call and store the associated cost as a ‘Preferred Direct AR/Sell Cost’ and send the order information (along with both Preferred Direct AP/Buy Cost and Preferred Direct AR/Sell Cost) to the Shipments domain.

---

## LINX-8101 — QCP Routing Call from Order Domain (Manual Orders)

**Status:** In Development  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

As an OdysseyONE Orders internal user, the moment an order is created or edited in the system, I want order domain to make a **QCP Routing** call, fetch the first Routing Option, associated AP rates and store the associated cost as a Preferred Direct AP/Buy Cost and send the order information (along with the Preferred Direct AP/Buy Cost) to the Shipments domain and also utilize the QCP Call response to make a QCA Call. <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8100</custom>

---

## LINX-8118 — Quick Order Creation - General Information Section

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update ‘General Information' section (mandatory fields), for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8119 — Quick Order Creation - Pickup / Delivery Section (Consignor and Consignee)

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to find a location in the Pickup / Delivery section (for both Consignor and Consignee) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8120 — Quick Order Creation - Ship and Delivery Date and Time (Consignor and Consignee)

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update Ship and Delivery Date and Time in the Pickup / Delivery section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8121 — Quick Order Creation - Product Information Section (Add Product)

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a OdysseyONE user, I want to be able to add Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8122 — Quick Order Creation - Manage Column option for Product Information Section

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a OdysseyONE user, I want to be able to manage columns shown at line level, in the Product information section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8123 — Quick Order Creation - Reorder columns & change column width in Product Information section

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a OdysseyONE user, I want to be able to reorder columns and / or change column width in the Product Information section / table for an order that I am attempting to create, so that I can have the desired view of product(s) being added to the order.

---

## LINX-8124 — Quick Order Creation - Special Services section (Manage Special Services)

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update Special Services section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8125 — Quick Order Creation - Special Services section (Quick selection)

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update Special Services section for a quick order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8389 — BE - Analysis on QCP integration with Order Service

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Analyze and define what is required for **Order Service** to integrate with **QCP Routing** so that:

* On **order creation** and **order updates** (when any **Transportation Relevant** field changes), Order Service:

    1. Calls **QCP Routing**,
    2. Retrieves eligible carriers and **Direct AP rates**,
    3. Identifies **Preferred Carrier** (Option Seq = 1) and stores **Preferred Direct AP/Buy Cost** on the order/load,
    4. Sends order (with Preferred Direct AP/Buy Cost) to **Shipments** domain,
    5. Uses QCP response to trigger a **QCA** call (details follow-up),
    6. Applies retry on technical failures.
    

Deliverables include API contracts, field mapping, dependency list, sample datasets, test plan outline, and non‑functional considerations.  

### QCP API Contracts (From Business Rules)

**Request (XML)** – fields needed:

* Customer reference no. (e.g. **PO Number**)
* **Origin**: Country, Region/State, City, Address
* **Destination**: Country, Region/State, City, Address
* **Important Dates & Times**:

    * Shipping date/time (local + UTC reference)
    * Delivery date/time (local + UTC reference)
    
* **Service Type**
* **Packaging**: type & quantity
* **Product (per line)**:

    * Weight (value + UoM)
    * NMFC product class
    * Length / Width / Height (values + UoM)
    * Hazmat flag (Y/N)
    * Stackable (Y/N)
    

**Response (XML)** – for each carrier:

* Sequence Number (Option Seq)
* Service Type
* Carrier Code & Carrier Name
* Direct AP cost **(only carriers with state ‘S’ = Success)**
* Transit distance (value + UoM)
* Transit time (value + UoM)
* **Win (eligible) Carrier** flag (True/False)
* Source (Quote) Number
* Warnings (carrier-specific)

**Preferred logic**

* Carrier with `Option Seq = 1` is the **Preferred Carrier**; **Preferred Direct AP/Buy Cost** is the associated **Direct AP cost**.

  
**Note**: Attach provided Sample Request/Response XMLs to this ticket and extract XPaths for mapping during analysis.

---

## LINX-8390 — DB - DB design for Order Direct Cost (QCP)

**Status:** Closed  
**Type:** Task  
**Labels:** DB

DB design and analysis for the Order direct cost

---

## LINX-8427 — BE - Integration of QCP with Order Services (LINX-8101)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Needs to build an integration component within **Order Services** to call **QCP routing** and retrieve the **Direct Cost** (**AP Cost)** for an Order. The integration should consume the request/response schemas analyzed and documented under **JIRA #8389**, map the response to Order Services’ and expose the Direct Cost for downstream consumption.  

* Implement a **QCP integration component** inside Order Services (e.g., `QcpCostClient` + service layer)
* Build a **request builder** (covered in the task [\[LINX-8553\] BE - QCP Routing API request payload mapping (LINX-8101) - Jira](https://odysseylogistics.atlassian.net/browse/LINX-8553)) using the payload structure defined in **JIRA #8389.** 
* Invoke QCP routing API (sync) to fetch **Direct AP Cost**. (Refer LLD: [ttps://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3487956996/QCP+Invocation+-+LLD](https://apc01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fodysseylogistics.atlassian.net%2Fwiki%2Fspaces%2FTMS%2Fpages%2F3487956996%2FQCP%2BInvocation%2B-%2BLLD&data=05%7C02%7CVenkataKesavarao.Seerla%40cognizant.com%7Cb01099aed1d8477cab5a08de7f1897ac%7Cde08c40719b9427d9fe8edf254300ca7%7C0%7C0%7C639087940760396878%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=VZPtoXGXvC4eET0aYaLHJ3K8OELaXIdT5BPDU%2FQJsnc%3D&reserved=0))
* Expose Direct AP Cost
* Handle error scenarios: timeouts, retries, partial/missing cost, QCP validation errors; provide default behavior & error propagation pattern.
* Feature flag to enable/disable QCP integration per env/tenant.
* Configuration-driven QCP endpoint, auth and retry policy.

---

## LINX-8428 — BE - Implementation of QCA (Rating Wrapper) in Order Services (LINX-8100)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Needs to build an integration component within **Order Services** to call **QCA** and retrieve the **Direct Cost** **of AR** for an Order. And expose the Direct AR/Sell Cost for downstream consumption.  

* Implement a **QCA integration component** inside Order Services.
* Build a **request builder** using the payload structure attached in this JIRA
* Invoke QCA rating API (sync) to fetch **Cost**.
* Parse and validate the response; map relevant fields to Order Services’ domain model.
* Expose Direct AR Cost
* Handle error scenarios: timeouts, retries, partial/missing cost, QCA validation errors; provide default behavior & error propagation pattern.
* Feature flag to enable/disable QCA integration per env/tenant.
* Configuration-driven QCA endpoint, auth, timeouts, and retry policy.

‌

**Rating Wrapper CURL**

_curl --location '_[_https://dev.rating.linx.odysseylogistics.com/rating-service/v1/rate-order'_](https://dev.rating.linx.odysseylogistics.com/rating-service/v1/rate-order') _\\_  
_--header 'Content-Type: application/json' \\_  
_--header 'Authorization: Bearer ' \\_  
_--data '{_  
    _"origin": {_  
        _"country": "US",_  
        _"state": "LA",_  
        _"city": "BASTROP",_  
        _"postal": "71220",_  
        _"site": null_  
    _},_  
    _"destination": {_  
        _"country": "US",_  
        _"state": "OK",_  
        _"city": "TULSA",_  
        _"postal": "74131",_  
        _"site": null_  
    _},_  
    _"lines": \[_  
        _{_  
            _"item": "",_  
            _"hazardous": false,_  
            _"volume": 180.0,_  
            _"length": 0.0,_  
            _"width": 0.0,_  
            _"height": 0.0,_  
            _"seq": 2,_  
            _"freight_class": "",_  
            _"package_count": 6,_  
            _"weight": 30.0,_  
            _"weight_uom": "LB",_  
            _"volume_uom": "CUFT",_  
            _"length_uom": ""_  
        _}_  
    _\],_  
    _"charges": \[\],_  
    _"stops": \[\],_  
    _"ap_system_id": null,_  
    _"ar_system_id": "G20TECH",_  
    _"dir": "O",_  
    _"ship_date": "2025-10-16T14:00Z",_  
    _"delivery_date": "2025-10-17T14:00Z",_  
    _"equipment_id": "TL",_  
    _"carrier": "TLDY"_  
_}'_

---

## LINX-8553 — BE - QCP Routing API request payload mapping (LINX-8101)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

As a Developer,

Create a component in common class to map the incoming Order JSON (LinxOrderRequestDto) to the required Legacy XML structure,

So that the data is structured exactly how QCP expects it. Refer the attached spreadsheet for QCP request mapping.

Refer the QCA endpoint for any xml transformation

Acceptance Criteria:

Capture all the required fields needed for QCP invocation along with optional fields.

**Note:** Refer LLD and functional story <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8101</custom> for the request structure 

LLD: [https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3487956996/QCP+Invocation+-+LLD](https://apc01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fodysseylogistics.atlassian.net%2Fwiki%2Fspaces%2FTMS%2Fpages%2F3487956996%2FQCP%2BInvocation%2B-%2BLLD&data=05%7C02%7CVenkataKesavarao.Seerla%40cognizant.com%7Cb01099aed1d8477cab5a08de7f1897ac%7Cde08c40719b9427d9fe8edf254300ca7%7C0%7C0%7C639087940760396878%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=VZPtoXGXvC4eET0aYaLHJ3K8OELaXIdT5BPDU%2FQJsnc%3D&reserved=0)

---

## LINX-8554 — BE - QCP Routing API response mapping (LINX-8101)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

As a developer

I want to parse the XML response returned by the legacy API so that I can extract the preferred carried details.Retry the service incase of failurs, Follow the QCA rating service for rety process.

Acceptance Criteria:

* Parse and validate the response; map relevant fields to Order Services’ domain model.
* The parsed data needs to be saved into the DB (Refer task for DB design <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8390</custom> )

‌

**Note:** Refer LLD and functional story <custom data-type="smartlink" data-id="id-1">https://odysseylogistics.atlassian.net/browse/LINX-8101</custom> for the request structure 

LLD: [https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3487956996/QCP+Invocation+-+LLD](https://apc01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fodysseylogistics.atlassian.net%2Fwiki%2Fspaces%2FTMS%2Fpages%2F3487956996%2FQCP%2BInvocation%2B-%2BLLD&data=05%7C02%7CVenkataKesavarao.Seerla%40cognizant.com%7Cb01099aed1d8477cab5a08de7f1897ac%7Cde08c40719b9427d9fe8edf254300ca7%7C0%7C0%7C639087940760396878%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=VZPtoXGXvC4eET0aYaLHJ3K8OELaXIdT5BPDU%2FQJsnc%3D&reserved=0)

---

## LINX-8555 — DevOps - API credentials and endpoints configuration for QCP routing

**Status:** Closed  
**Type:** Task  
**Labels:** DevOps

As a Developer,

Securely store and retrieve legacy API credentials and endpoints for Dev, QA, and Prod,

So that the application can authenticate with QCP across different AWS environments.

Refer QCA endpoint for authorization details.  
[QCP Invocation - LLD - Transportation Management Systems - Confluence](https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3487956996/QCP+Invocation+-+LLD)

---

## LINX-8557 — BE - Analysis of functional stories, Tech stories creation and LLD

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Analysis of the Manual Order creation functional story, technical stories creation and LLD changes

---

## LINX-8625 — DB - Add additional columns identified for QCP/QCA and create new table om.order_QCP_QCA_reprocess finalized

**Status:** Closed  
**Type:** Task  
**Labels:** DB

_(no description)_

---

## LINX-8724 — BE - Persist failed QCP/QCA routing calls to a storage table for reprocessing (LINX-8100, 8101)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

When a QCP/QCA routing call fails, we need to capture enough context to reprocess it later without data loss. (Failures are Network errors only. No need to capture other errors like BadRequest but log all the exceptions in loggers for tracking)  
This ticket adds:

1. A table **order_qcp_qca_reprocess** to store failed routing attempts.
2. Application logic to write a failure record atomically whenever a QCP/QCA routing call fails.
3. A reprocessing job (batch/queue worker) that picks up pending records, retries and updates status accordingly. **(**<custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8725</custom> **)**

---

## LINX-8725 — BE - Implement schedular for reprocessing mechanism for failed QCP routing and QCA calls

**Status:** Closed  
**Type:** Task  
**Labels:** BE

This ticket covers the implementation of a background reprocessing workflow for QCP/QCA routing failures that have been persisted in the failure queue table. The reprocessing engine will read failed records, retry the routing calls with idempotency and controlled backoff, and update the record status accordingly.

* Implement a scheduled job to reprocess entries from `order_qca_qcp_reprocess` **(configure the schedular for every 5 mins)**
* Read items with `call_status = 'FAILED'` where:

    * `attempt_no < max_retries` **(configure for 5 attempts maximum)**
    
* Retry routing call to QCP/QCP
* Update record fields after each attempt
* On successful retry → mark record as **PASS**.
* Add logging for observability

---

## LINX-9002 — Quick Order Confirmation Page

**Status:** Functional Testing  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE user, I want to be able to see the confirmation page for a quick order that I have just created, so that I can confirm the relevant details (Mandatory Fields) captured in the quick order.

---

## LINX-9010 — In-Order Actions in Quick Order Creation

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE user, I want to be able to perform certain actions **while the long order is being created (before submission)**

---

## LINX-9153 — FE - Quick Order Creation - General Information Section - LINX-8118

**Status:** Closed  
**Type:** Story  
**Labels:** Approved

As a OdysseyONE user, I want to be able to update ‘General Information' section (mandatory fields), for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9154 — FE - Quick Order Creation - Pickup / Delivery Section (Consignor and Consignee) - LINX-8119 - Part 1

**Status:** Closed  
**Type:** Story  
**Labels:** Approved

As a OdysseyONE user, I want to be able to find a location in the Pickup / Delivery section (for both Consignor and Consignee) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9155 — FE - Quick Order Creation - Ship and Delivery Date and Time (Consignor and Consignee) - LINX-8120

**Status:** Closed  
**Type:** Story  
**Labels:** Approved

As a OdysseyONE user, I want to be able to update Ship and Delivery Date and Time in the Pickup / Delivery section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9156 — FE - Quick Order Creation - Special Services section (Manage Special Services) - LINX-8124 LINX-8125

**Status:** Closed  
**Type:** Story  
**Labels:** Approved

As a OdysseyONE user, I want to be able to update Special Services section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9168 — BE - API Implementation for Order Number Field Validation & Duplicate Check

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Implement the Order Number field validation logic and the supporting API endpoint for the manual order entry screen.  
  
Refer the LLD <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2#:~:text=/order%2Dservice/v3/order/validation</custom> 

| Order | Order Number validation | /order-service/v3/order/validation | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |   {  
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
 |   |
| --- | --- | --- | --- | --- | --- | --- | --- |

---

## LINX-9169 — BE - Implementation for save Quick Order general information section fields (LINX-8118)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Need to add implementation for the General Information section fields  
  
Please refer <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8118</custom>

---

## LINX-9170 — BE - Implement new API for Manual Order creation (LINX-8118)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Need to implement new API to Save manual Order Creation.

Refer the LLD <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2#:~:text=order%2Dservice/v3/manual%2Dorder</custom>   

| Order | Create Manual Order | order-service/v3/manual-order | POST | Authorization:<>, Content-Type: application/json, x-correlation-id : <NN transaction-id> |   {  
  "manualOrder": {  
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
} |   {  
  “orderId”: <order Id>,  
  “message”: “Order <order number> created successfully”  
} |   |
| --- | --- | --- | --- | --- | --- | --- | --- |

---

## LINX-9171 — BE - Quick Order Creation - Pickup / Delivery Section (Consignor and Consignee) (LINX-8119)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

_(no description)_

---

## LINX-9172 — BE - Quick Order Creation - Ship and Delivery Date and Time (Consignor and Consignee) (LINX-8120)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

_(no description)_

---

## LINX-9196 — BE - Manual Quick Order LLD and tech stories (LINX-8124, LINX-8125, LINX-9002, LINX-9010)

**Status:** Closed  
**Type:** Story  
**Labels:** BE, BE_LLD

_(no description)_

---

## LINX-9212 — QA – Validate Order Number field validation & duplicate check API behavior

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9213 — QA – Validate Quick Order Creation – General Information Section (FE)

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9279 — BE - Validate duplicate OrderNumber against OwningOrganizationId during Manual Order creation (LINX-9002)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

While creating a **Manual Order**, the system currently allows saving orders without validating the uniqueness of the **OrderNumber** in combination with **OwningOrganizationId**.

Although **OrderNumber alone can be duplicated across records**, the **combination of OrderNumber + OwningOrganizationId must be unique** in the LINX database.

This Jira aims to introduce a validation check during Manual Order save to ensure:

* Order creation is **allowed** if the combination does **not exist** in LINX DB
* Order creation is **blocked with an appropriate error** if the combination already exists

## **Functional Requirements**

1. On **Manual Order Save**, validate the combination of:

    * `OrderNumber`
    * `OwningOrganizationId`
    
2. Query LINX DB to check if the combination already exists.
3. If the combination **does not exist**:

    * Proceed with order creation.
    
4. If the combination **already exists**:

    * Prevent order creation.
    * Display a clear and user‑friendly error message.
    

## **Error Message**

```
An order with the same Order Number <orderNumber> already exists for the selected Owning Organization. Please provide a unique Order Number or select a different Owning Organization.
```

---

## LINX-9282 — BE - Save Manual Order in Draft state (LINX-9010)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement the functionality to save an Order in Draft state

---

## LINX-9304 — FE - Quick Order Creation - Pickup / Delivery Section (Consignor and Consignee)-LINX-8119- Part 2

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, Refinement_done

As a OdysseyONE user, I want to be able to find a location in the Pickup / Delivery section (for both Consignor and Consignee) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9305 — FE - Handle New Order Layout design changes

**Status:** Closed  
**Type:** Story  
**Labels:** —

Handle New Order Layout design changes

Please deign as per the given VD.

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=59a40204-6f2b-4239-a403-7e6b5d09aedc&&collection=&height=989&occurrenceKey=null&width=1558&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)

---

## LINX-9340 — BE - Update Order Creation API Response for Manual Orders in LINX (LINX-9002)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Enhance the Order Creation response when an order is created through **Manual Flow in LINX** to include a standardized response structure with both **success and error messaging**.

The API should return a consistent response format indicating whether the order creation was successful or failed, along with appropriate messages and detailed payload.  

* When an order is created successfully → return **success = true** with a success message.
* When order creation fails → return **success = false** with an appropriate **error message**.
* Ensure response includes all required order attributes under the `data` object when successful.
* For failure scenarios, `data and orderId` will be null.  

**Expected Success response:**  
{

  "orderId": "<order Id>",

  "success": true,

  "message": "Your Order created successfully",

  “data”: { <order payload>}  
}  
  
**Expected Error response:**  
{

  "orderId": "null,

  "success": false,

  "message": "Your Order creation failed due to error",

   “data”: null  
}

‌

Note: Pls refer the LLD <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2#:~:text=order%2Dservice/v3/manual%2Dorder</custom>

---

## LINX-9347 — FE - Quick Order Confirmation Page - LINX-9002

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, Refinement_done

As an OdysseyONE user, I want to be able to see the confirmation page for a quick order that I have just created, so that I can confirm the relevant details (Mandatory Fields) captured in the quick order.

---

## LINX-9379 — QA - Test Execution for LINX-9002 (General Information Section & Pickup /Delivery Section)

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9380 — QA- Quick Order Confirmation Page - LINX-9002

**Status:** Closed  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-9381 — QA - Update Order Creation API Response for Manual Orders in LINX (LINX-9002)

**Status:** Closed  
**Type:** Task  
**Labels:** —

Enhance the Order Creation response when an order is created through **Manual Flow in LINX** to include a standardized response structure with both **success and error messaging**.

The API should return a consistent response format indicating whether the order creation was successful or failed, along with appropriate messages and detailed payload.  

* When an order is created successfully → return **success = true** with a success message.
* When order creation fails → return **success = false** with an appropriate **error message**.
* Ensure response includes all required order attributes under the `data` object when successful.
* For failure scenarios, `data and orderId` will be null.  

**Expected Success response:**  
{

  "orderId": "<order Id>",

  "success": true,

  "message": "Your Order created successfully",

  “data”: { <order payload>}  
}

**Expected Error response:**  
{

  "orderId": "null,

  "success": false,

  "message": "Your Order creation failed due to error",

   “data”: null  
}

 

Note: Pls refer the LLD [Order Service Phase-2 | :\~:text=order service/v3/manual order](https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3401056276/Order+Service+Phase-2#:~:text=order%2Dservice/v3/manual%2Dorder)

---

## LINX-9383 — QA - Quick Order Creation - Pickup / Delivery Section (Consignor and Consignee)-LINX-8119- Part 2

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9392 — QA - Save Manual Order in Draft state (LINX-9010)

**Status:** Closed  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-9395 — QA - Validate duplicate OrderNumber against OwningOrganizationId during Manual Order creation (LINX-9002)

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9396 — QA - Quick Order Creation - Ship and Delivery Date and Time (Consignor and Consignee) - LINX-8120

**Status:** Closed  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9702 — Owning Organization search returns incorrect results — matches individual characters instead of substring

**Status:** Closed  
**Type:** Bugs  
**Labels:** FE, QA

_(no description)_

---

## LINX-9744 — BE - Alter Location query in Master Service to support default sorting (LINX-8119)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

The lookup search should _not_ be case sensitive  

* If the user types a string without space (e.g.: ‘MI') : The search results must display (if available) starting with **‘**MI’, should be displayed first, followed by Locations (if available) containing **‘**MI’ (in the same sequence - not display  ‘IM’ / ‘I M’ / 'M I’ locations)
*  If the user types a string with space (e.g.: ‘M I') : The search results must display the locations (if available) starting with **‘**M I’, should be displayed first, followed by Locations  (if available) containing **‘**M I’ (in the same sequence - not display ‘IM’ / ‘I M' / MI’ locations)

---

## LINX-9749 — BE - Alter Owning Organization query in Master Service to support default sorting (LINX-8118)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

* If the user types a string without space (e.g.: ‘MI') : The search results must display the owning organizations (if available) starting with **‘**MI’, should be displayed first, followed by Owning organizations (if available) containing **‘**MI’ (in the same sequence - not display  ‘IM’ / ‘I M’ / 'M I’ organizations)
*  If the user types a string with space (e.g.: ‘M I') : The search results must display the Owning organizations (if available) starting with **‘**M I’, should be displayed first, followed by Owning organizations (if available) containing **‘**M I’ (in the same sequence - not display ‘IM’ / ‘I M' / MI’ organizations)

---

## LINX-9771 — FE - In-Order Actions in Quick Order Creation - LINX-9010

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE user, I want to be able to perform certain actions **while the long order is being created (before submission)**

---

## LINX-9874 — Quick Order Creation - Product Information Table UI (LINX-8121)

**Status:** Todo  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a developer, I want to build the Product Information table UI component so that users can add/remove product rows for a quick order.

Acceptance Criteria:

* Implement Product Information table with columns: Line #, Product ID, Product Description, Shipping Class, Shipping Class ID, Gross Weight, UoM (Weight), Volume, UoM (Volume), Handling Unit
* 'Add Product' button adds a new row to the table
* Line # is auto-populated sequentially starting from 1
* No limit on number of products that can be added
* Users can edit fields at the line level
* Users can remove a product row from the table
* Line # column cannot be removed via Manage Column
* Help text displayed: 'Please select either Product ID or Shipping Class, to proceed with adding Product to the order'
* Refer to wireframes for ghost text, color coding, indicators

Tech Reference: LINX-8121

---

## LINX-9875 — Quick Order Creation - Product ID Dropdown (LINX-8121)

**Status:** Todo  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a developer, I want to implement the Product ID dropdown so that users can search and select a Product ID for each product line.

Acceptance Criteria:

* Single-select dropdown for Product ID
* Product IDs listed by frequency of use (highest to lowest)
* Search functionality available (same as Owning Organization search per LINX-8118)
* User can clear and re-select Product ID prior to order creation
* Product ID selection triggers auto-population of Product Description (Story 3)

Tech Reference: LINX-8121

---

## LINX-9876 — Quick Order Creation - Product Description Field (LINX-8121)

**Status:** Todo  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a developer, I want to implement the Product Description field that auto-populates on Product ID selection and allows user modifications.

Acceptance Criteria:

* Field is disabled until Product ID is selected
* Auto-populates Product Description when Product ID is selected
* If multiple descriptions exist for the selected Product ID, show them in a dropdown for user to select
* User can also enter a custom Product Description outside the dropdown list
* Editable: alphanumeric, special characters, and spaces allowed
* Minimum 1 character (excluding spaces), maximum 150 characters (excluding spaces)

Tech Reference: LINX-8121

---

## LINX-9877 — Quick Order Creation - Shipping Class & Shipping Class ID Dropdowns (LINX-8121)

**Status:** Todo  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a developer, I want to implement the Shipping Class and Shipping Class ID dependent dropdowns so that users can classify products.

Acceptance Criteria:

* Shipping Class is a dropdown with 4 options: Product Class, Commodity, Harmonized, NMFC
* Options listed by frequency of use (highest to lowest)
* If Shipping Class is selected, Shipping Class ID becomes mandatory (or user must clear Shipping Class)
* Shipping Class ID is a single-select dropdown, listed by frequency of use
* Search functionality for Shipping Class ID (same as Owning Organization search per LINX-8118)
* Shipping Class ID field is disabled until Shipping Class is selected
* Shipping Class ID options auto-filter based on selected Shipping Class category
* Clearing Shipping Class automatically clears Shipping Class ID
* To select a Shipping Class ID outside the filtered list, user must first change Shipping Class
* Either Product ID & Description OR Shipping Class & Shipping Class ID must be entered

Tech Reference: LINX-8121

---

## LINX-9878 — Quick Order Creation - Gross Weight & Volume Fields with UoM (LINX-8121)

**Status:** Todo  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a developer, I want to implement Gross Weight and Volume fields with UoM dropdowns so that users can capture weight and volume for each product.

Acceptance Criteria:

* Gross Weight: free text numeric field, up to 2 decimal points
* Decimal separator and thousands separator supported/auto-added
* UoM (Gross Weight): single-select dropdown, listed by frequency of use
* Volume: free text numeric field, up to 2 decimal points
* UoM (Volume): single-select dropdown, listed by frequency of use
* UoM toggle: 'US' (default) or 'Metric' for weight & volume
* TL weight warning: If Equipment is Truckload (TL) and gross weight > 19,000 lb (or equivalent), display warning: 'Gross weight is more than what is usually permissible for the Equipment selected. Please re-check and update as needed.'

Tech Reference: LINX-8121

---

## LINX-9879 — Quick Order Creation - Handling Unit Field (LINX-8121)

**Status:** Todo  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a developer, I want to implement the optional Handling Unit dropdown so that users can specify packaging for each product.

Acceptance Criteria:

* Single-select dropdown for Handling Unit
* Options listed by frequency of use (highest to lowest)
* Field is optional and can be removed via Manage Column (LINX-8122)
* Handling Unit maps to Packaging ID in Legacy TMS (if available/not null)
* For integrated orders, Packaging identifier from LINX-8064 must be mapped to Handling Unit if present and valid

Tech Reference: LINX-8121

---

## LINX-9880 — Quick Order Creation - Order Creation API Integration & Actions (LINX-8121)

**Status:** Todo  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a developer, I want to implement the Create and Cancel actions with API integration so that users can submit or discard the quick order.

Acceptance Criteria:

* 'Create' button enabled only when all mandatory fields are filled
* On Create: call order creation API to create the order
* Display success message: 'Order created successfully'
* After successful creation, same screen displayed for user to edit if required
* 'Cancel' button clears all entered data
* OTMS Order ID excluded from success message for now (not yet defined)
* Testing note: order creation to be verified in database until full UI flow is implemented

Tech Reference: LINX-8121

---

## LINX-9881 — "Please enter one of the following fields: 'Late Pickup' or 'Late Delivery'." message is on despite required fields are filled

**Status:** Closed  
**Type:** Defect  
**Labels:** —

_(no description)_

---

## LINX-9882 — Search Functionality for Mandatory Fields in Manual Order Creation UI 

**Status:** Ready for Development  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2

As an OdysseyONE user, I want to be able to update ‘General Information' section (mandatory fields), for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9892 — Sign of missing value appears in unexpected place for Pickup/Delivery section of order.

**Status:** Closed  
**Type:** Defect  
**Labels:** —

_(no description)_

---

## LINX-9920 — BE - LLD and Tech stories for Order Summary and Details

**Status:** Closed  
**Type:** Task  
**Labels:** —

LLD and Tech stories for Order Product section

---

## LINX-9922 — QA- Test Case Creation for LINX-6001

**Status:** Closed  
**Type:** Task  
**Labels:** —

_(no description)_

---

## LINX-10243 — "ID/Org Name", "Long Name", "Address 1" fields couldn't be found in master data

**Status:** Closed  
**Type:** Defect  
**Labels:** —

After populating Location ID and filling all address fields particular fields ("ID/Org Name", "Long Name", "Address 1") can’t be found in master data if click on this fields.

---

## LINX-10246 — Consignor/Consgnee Location ID dropdown is not populated when searching by address fields

**Status:** Closed  
**Type:** Defect  
**Labels:** —

According to the requirement in <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8119</custom>  busines rule 2aii (Alternately, the user should also be able to enter one or more address fields, which, in turn, populates the matching consignor location IDs, in the same dropdown.), the user should be able to enter one or more address fields, and the system should populate the matching Consignor Location IDs in the same dropdown.

Currently, when address field values are entered, the dropdown is not populated with matching Consignor/Consignee Location IDs.

---

## LINX-10321 — Search for order's locations should not be case sensitive 

**Status:** Closed  
**Type:** Defect  
**Labels:** —

When we try to search by ‘su’ nothing found, but by ‘SU’ found values

---

## LINX-10328 — If user type one symbol to 'location ID' field it's removed

**Status:** Closed  
**Type:** Defect  
**Labels:** —

# When I type only one symbol it just dissapears.

---

## LINX-10605 — Add Location Dropdown Panel Style Not Alignment

**Status:** Closed  
**Type:** Defect  
**Labels:** —

1. Panel window is not aligned with input component
2. Close icon (x) is should be right end. 

![](blob:https://media.staging.atl-paas.net/?type=file&localId=null&id=ec50aa19-4534-4b8c-b40b-81dc5d7a9da0&&collection=&height=495&occurrenceKey=null&width=694&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)

---

## LINX-10682 — Unexpected server error while creating manual order 

**Status:** Closed  
**Type:** Bugs  
**Labels:** BE

_(no description)_

---

## LINX-10739 — Ship date time not reflected in the order staging payload when given save or save for later

**Status:** Closed  
**Type:** Bugs  
**Labels:** ORDER_CREATION, QA

**requestedDeliveryDate**, **requestedPickupDate** and **requestedDeliveryTimeZoneCode, requestedPickupTimeZoneCode** 

not reflected in the order staging payload when given save or save for later.

---

## LINX-10808 — Owning Organization dropdown displaying [object Object] instead of organization name

**Status:** Canceled  
**Type:** Bugs  
**Labels:** ORDER_CREATION, QA

_(no description)_

---

## LINX-10981 — 'Invalid location ID entered.' message appears when try to look up locations without chosen an organization in 'General Info'

**Status:** Analysis  
**Type:** Defect  
**Labels:** —

If organisation is not chosen in ‘General Information’ section I tried to enter different values but alwas got same error. Invalid location ID entered. Please  
check the value and enter the correct location ID.

---

## LINX-10985 — New Logic for fetching Special Services in Manual Orders (Quick Orders)

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

Currently, when the quick order is being created, **all** the available Special Services (Charge Codes) are being fetched from TMS Master. Some of the fetched values are special services and others (e.g.: ‘Not Company Bill', ‘Rebill other account', 'Duplicate Tracking Number', ‘Detention Loading’, ‘Detention Unloading’, ‘Lumper’ etc.) are not special services. This is a placeholder story to outline the logic for **displaying and/or searching only order relevant special services**.

---

## LINX-11013 — Order Number not displayed under Order ID column – showing LINX generated Order ID instead

**Status:** Analysis  
**Type:** Bugs  
**Labels:** QA

When an **Order Number is available from the response**, the UI should display this value under the **Order ID column**.

---
