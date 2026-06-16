# LINX-8026 — Manual Order Creation (Long Orders)

**Status:** New  
**Jira:** https://odysseylogistics.atlassian.net/browse/LINX-8026  
**Child stories:** 51

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

**The scope for this epic only includes Long Order Creation**

## Solution Design

---

# Stories

## LINX-5995 — Long Order Creation - Product Information Section (Add Product - Product Details)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, BE_LLD_Done, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update Product Details sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-5997 — Long Order Creation - Product Information Section (Add Product - Packaging)

**Status:** Analysis  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done

As a Odyssey TMS user, I want to be able to update Packaging sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6030 — Long Order Creation - Product Information Section (Add Product - General)

**Status:** QA Testing  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update General sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6085 — Long Order Creation - References section

**Status:** New  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update optional fields in the References section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6166 — Long Order Creation - General section

**Status:** Functional Testing  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done

As a Odyssey TMS user, I want to be able to update General section (fields other than the ones which are part of Quick order creation - General section) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6177 — Long Order Creation - Product Information Section (Add Product - Add Reference Codes)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update Reference code(s) for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6178 — Long Order Creation - Product Information Section (Add Product - Add Hazmat)

**Status:** QA Testing  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to update Hazmat details for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-6201 — Long Order Creation - General section (Add Instructions)

**Status:** Done  
**Type:** Story  
**Labels:** Approved, OTMS_Phase1, Refinement_done, VD_Approved

As a Odyssey TMS user, I want to be able to add instruction(s) in the General section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8028 — Long Order Creation - Ship and Delivery Date and Time (Consignor and Consignee)

**Status:** QA Testing  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update Ship and Delivery Date and Time in the Pickup / Delivery section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8042 — Long Order Creation - Pickup / Delivery Section (Consignor and Consignee)

**Status:** Ready for QA  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update Pickup / Delivery section (Consignor and Consignee details) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8043 — Long Order Creation - Special Services section (Manage Special Services)

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update Special Services section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8044 — Long Order Creation - Special Services section (Quick selection)

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update Special Services section for a long order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8126 — Long Order Creation - Additional Information Sub-Section (General Information Section)

**Status:** QA Testing  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update the ‘Additional Information’ sub-section of the ‘General Information’ section (fields other than the ones which are part of <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8118</custom> ) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8127 — Long Order Creation - Add Instructions Sub-Section (General Information Section)

**Status:** QA Testing  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE user, I want to be able to add instruction(s) in the ‘Add Instructions’ sub-section of the ‘General Information’ section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8128 — Long Order Creation - References Sub-Section (General Information Section)

**Status:** Architecture/Tech Design  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update the additional optional fields in the ‘References’ sub-section (‘General Information’ section) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8131 — Long Order Creation - Product Information Section (Add Product - Product Details)

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a OdysseyONE user, I want to be able to update Product Details sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8132 — Long Order Creation - Product Information Section (Add Product - Add Reference Codes)

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a Odyssey TMS user, I want to be able to update Reference code(s) for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8133 — Long Order Creation - Product Information Section (Add Product - Add Hazmat)

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As a OdysseyONE user, I want to be able to update Hazmat details for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8134 — Long Order Creation - Product Information Section (Add Product - General)

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As an OdysseyONE user, I want to be able to update General sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-8135 — Long Order Creation - Product Information Section (Add Product - Packaging)

**Status:** New  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

As an OdysseyONE user, I want to be able to update Packaging sub-section for adding Product(s) in the Product Information section, for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9004 — Long Order Confirmation Page

**Status:** Architecture/Tech Design  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE user, I want to be able to see the confirmation page for a long order that I have just created, so that I can confirm the relevant details captured in the order.

---

## LINX-9009 — In-Order Actions in Long Order Creation

**Status:** Architecture/Tech Design  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE user, I want to be able to perform the following actions while the long order is being created - Save, Save for Later & Discard

---

## LINX-9331 — BE - Validation and mapping for Customer Required Carrier and Equipment Reference Number (LINK-8126)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to implement validation and mapping for Customer Required Carrier and Equipment Reference Number   
  
Pls refer the BRs [\[LINX-8126\] Long Order Creation - Additional Information Sub-Section (General Information Section) - Jira](https://odysseylogistics.atlassian.net/browse/LINX-8126)

---

## LINX-9333 — BE - Mapping for Instruction Type and length validation for Instruction Description (LINX-8127)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

Needs to validate Instruction Description length  
Default Instruction type needs to set inf UI not sending to BE  
Please refer BRs [\[LINX-8127\] Long Order Creation - Add Instructions Sub-Section (General Information Section) - Jira](https://odysseylogistics.atlassian.net/browse/LINX-8127)

---

## LINX-9334 — BE - Validation and mapping for Reference Type and Reference Value (LINX-8128)

**Status:** Closed  
**Type:** Story  
**Labels:** BE

_(no description)_

---

## LINX-9339 — FE - Long Order Creation - Pickup / Delivery Section (Consignor and Consignee) - LINX-8042 - Part 1

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, Refinement_done

As a OdysseyONE user, I want to be able to update Pickup / Delivery section (Consignor and Consignee details) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9343 — BE - Manual Long Order LLD and tech stories (LINX-8126, LINX-8127, LINX-8128, LINX-8042, LINX-8028, LINX-8043, LINX-8044, LINX-9004, LINX-9009)

**Status:** Closed  
**Type:** Task  
**Labels:** BE, BE_LLD

Needs to work on the LLD and Tech stories for Long Order creation

---

## LINX-9344 — BE - Integrated Order to Manual Order conversion component for Edit/View purpose

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Need to create a component to convert transformed Integrated Orders (OrderIn) to Manual Order format (ManualOrder) for the view and Edit purpose

---

## LINX-9355 — FE - Long Order Creation - Ship and Delivery Date and Time (Consignor and Consignee) - LINX-8028 - Part 1

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, Refinement_done

As a OdysseyONE user, I want to be able to update Ship and Delivery Date and Time in the Pickup / Delivery section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9382 — QA - Long Order Creation - <place holder>

**Status:** Todo  
**Type:** Task  
**Labels:** QA

_(no description)_

---

## LINX-9612 — BE - Map Origin Destination fields to InvParty fields of Order schema (LINX-8042)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

UI providing Shipper and Consignee fields in Origin and Destination sections of Order header.  
LINX needs to persist the same fields into OrderInvParty table.

---

## LINX-9741 — BE - Integrate Master Service API to map Mode, Mode Desc Equip Desc

**Status:** Closed  
**Type:** Story  
**Labels:** BE

[\[LINX-9733\] BE - Api to get Mode, Mode Desc and Equip Desc by Equipment Code - Jira](https://odysseylogistics.atlassian.net/browse/LINX-9733)

---

## LINX-9742 — BE - Order Number, Source Order Number auto generation (LINX-9004, LINX-9002)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

Needs to generate Order Number from the backend if UI not passing Order Number to BE service. In this case Order Number and OrderId are same.  
  
Need to generate Source Order Number from the backend since UI and ERP should not provide Source Order Number. In this case Source Order Number and OrderId are same.

---

## LINX-9777 — FE - Long Order Creation - Additional Information Sub-Section (General Information Section) - LINX-8126

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update the ‘Additional Information’ sub-section of the ‘General Information’ section (fields other than the ones which are part of <custom data-type="smartlink" data-id="id-0">https://odysseylogistics.atlassian.net/browse/LINX-8118</custom> ) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9778 — FE - Long Order Creation - Add Instructions Sub-Section (General Information Section) LINX-8127

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE user, I want to be able to add instruction(s) in the ‘Add Instructions’ sub-section of the ‘General Information’ section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9779 — FE - Long Order Creation - References Sub-Section (General Information Section) LINX-8128

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update the additional optional fields in the ‘References’ sub-section (‘General Information’ section) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9780 — FE - Long Order Creation - Pickup / Delivery Section (Consignor and Consignee) LINX-8042 - Part 2

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update Pickup / Delivery section (Consignor and Consignee details) for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9781 — FE - Long Order Creation - Special Services section (Manage Special Services) LINX-8043 and LINX-8044

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As a OdysseyONE user, I want to be able to update Special Services section for an order that I am attempting to create, so that I can have the relevant details captured in the order.

---

## LINX-9782 — FE - Long Order Confirmation Page - LINX-9004

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE user, I want to be able to see the confirmation page for a long order that I have just created, so that I can confirm the relevant details captured in the order.

---

## LINX-9783 — FE - In-Order Actions in Long Order Creation - LINX-9009

**Status:** Closed  
**Type:** Story  
**Labels:** Approved, FUNCTIONAL_PHASE2, Refinement_done

As an OdysseyONE user, I want to be able to perform the following actions while the long order is being created - Save, Save for Later & Discard

---

## LINX-10022 — BE - Consignee and Shipper SourceSystem mapping in the orderInvolvedPartyList within the orderOut payload (LINX-8042)

**Status:** Closed  
**Type:** Task  
**Labels:** —

Needs to map below fields 

**SourceSystem** : It’s a lookup from TMS master data

‌

**PartyId**: Need to append "**ORG**" + **tmsOrgIdForSite**  from the below query

\-- Validate Site Identifier (get the Name at the same time)  
\-- on a "No Data Found", the site identifier is invalid  
select nvl(:passedInLongNameFromOrder, toVal.org_long_name) siteName -- e.g. Geo SC Cedartown Plant (or could be NULL from Order Message) .  
, toVal.org_id tmsOrgIdForSite -- internal TMS ID of the order - needed for Address Lookup later...  
, oadr.oadr_addr1  
, oadr.oadr_addr2  
, oadr.oadr_addr3  
, oadr.oadr_loc_location_id -- location ID, used in address lookup later...  
, toVal.org_system_of_record  
from mf_organization toVal, mf_organization_address oadr  
where org_short_name = :**siteIdentifier** -- e.g. 05-CD  
    and org_parent_org_id IN (  
        select tree.org_id  
        from mf_organization tree  
        connect by tree.org_parent_org_id = prior tree.org_id  
        start with tree.org_id = :**TMSsourceSystemId** -- e.g. \*GEOSC_SYS_01  
    )  
    and oadr.oadr_org_id (+)= toVal.org_id  
;

‌

**ExternalIdentifier**: Is nothing but Site Identifier

‌

[https://odysseylogistics-my.sharepoint.com/personal/manibhushanjha_odysseylogistics_com/\_layouts/15/stream.aspx?id=%2Fpersonal%2Fmanibhushanjha_odysseylogistics_com%2FDocuments%2FRecordings%2FERP Request XSD To OrderInterfaceIn Json Mapping Review-20260518_180224-Meeting Recording.mp4&referrer=StreamWebApp.Web&referrerScenario=AddressBarCopied.view.595ff407-fb3f-4bbe-93e8-fa18a313fee5&ga=1](https://odysseylogistics-my.sharepoint.com/personal/manibhushanjha_odysseylogistics_com/_layouts/15/stream.aspx?id=%2Fpersonal%2Fmanibhushanjha%5Fodysseylogistics%5Fcom%2FDocuments%2FRecordings%2FERP%20Request%20XSD%20To%20OrderInterfaceIn%20Json%20Mapping%20Review%2D20260518%5F180224%2DMeeting%20Recording%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2E595ff407%2Dfb3f%2D4bbe%2D93e8%2Dfa18a313fee5&ga=1)

---

## LINX-10340 — BE - Contact Number and Email mapping for Shipper and Consignee (LINX-8042)

**Status:** Closed  
**Type:** Task  
**Labels:** BE

The Phone number and Email details from Shipper and Consignee should extract from below sources  
  
\-- Query to get Contact Phone Number

select mf$get.contact_number(  
    :**tmsOrgIdForSite**, -- use the tmsOrgIdForSite gotten from the validation query of the site identifier  
    'ORG',  
    :**siteName** -- use siteName from the validation query of the site identifier  
) contactPhone -- Note: Can be null.  Often is...  
from dual;

## -- Query to get Contact Email

Select mf$get.email(cn_id) shipperContactEMail -- Note: Looking back over 10 years of history, I've only seen this return either "NA" or null  
from mf_contact  
where upper(cn_name) = upper(:**siteName**) -- use siteName from the validation query of the site identifier  
    and cn_org_id = :**tmsOrgIdForSite**  
    and cn_cd_status = 'A'  
;

‌

**Note:** The variables **siteName** and **tmsOrgIdForSite** are extracted from the below query response

\-- Validate Site Identifier (get the Name at the same time)  
\-- on a "No Data Found", the site identifier is invalid  
select nvl(:passedInLongNameFromOrder, toVal.org_long_name) siteName -- e.g. Geo SC Cedartown Plant (or could be NULL from Order Message) .  
, toVal.org_id tmsOrgIdForSite -- internal TMS ID of the order - needed for Address Lookup later...  
, oadr.oadr_addr1  
, oadr.oadr_addr2  
, oadr.oadr_addr3  
, oadr.oadr_loc_location_id -- location ID, used in address lookup later...  
, toVal.org_system_of_record  
from mf_organization toVal, mf_organization_address oadr  
where org_short_name = :siteIdentifier -- e.g. 05-CD  
    and org_parent_org_id IN (  
        select tree.org_id  
        from mf_organization tree  
        connect by tree.org_parent_org_id = prior tree.org_id  
        start with tree.org_id = :TMSsourceSystemId -- e.g. \*GEOSC_SYS_01  
    )  
    and oadr.oadr_org_id (+)= toVal.org_id  
;

---

## LINX-10775 — FE - Handle API Changes for Owning Organization

**Status:** Closed  
**Type:** Task  
**Labels:** FUNCTIONAL_PHASE2

{'type': 'doc', 'version': 1, 'content': []}

---

## LINX-10986 — New Logic for fetching Special Services in Manual Orders (Long Orders)

**Status:** Todo  
**Type:** Story  
**Labels:** FUNCTIONAL_PHASE2

Currently, when the long order is being created, **all** the available Special Services (Charge Codes) are being fetched from TMS Master. Some of the fetched values are special services and others (e.g.: ‘Not Company Bill', ‘Rebill other account', 'Duplicate Tracking Number', ‘Detention Loading’, ‘Detention Unloading’, ‘Lumper’ etc.) are not special services. This is a placeholder story to outline the logic for **displaying and/or searching only order relevant special services**.

---

## LINX-11150 — Horizontal scroll is missing in Instruction description input field

**Status:** Todo  
**Type:** Bugs  
**Labels:** QA

_(no description)_

---

## LINX-11151 — Instruction Description entered in UI is not persisted in database on Order Creation

**Status:** Analysis  
**Type:** Bugs  
**Labels:** QA

_(no description)_

---

## LINX-11155 — Address is not populating in the Location dropdown when searching with a postal code, even though the postal code exists, under the Consigner and Consignee in Pickup/delivery section

**Status:** Todo  
**Type:** Bugs  
**Labels:** BE, QA

_(no description)_

---

## LINX-11156 —  Address found by location code not returned when searching by city/state/country

**Status:** Todo  
**Type:** Bugs  
**Labels:** BE, FE, QA

_(no description)_

---

## LINX-11157 — Results were not populating in location dropdown when space provided as prefix in PickUp/Delivery section

**Status:** Todo  
**Type:** Bugs  
**Labels:** BE, QA

_(no description)_

---

## LINX-11166 — Equipment Reference Number field accepts space-only input without showing validation error

**Status:** Todo  
**Type:** Bugs  
**Labels:** QA

_(no description)_

---

## LINX-11182 — Carrier lookup search not returning results and inconsistent dropdown behavior in Customer Required Carrier field

**Status:** Todo  
**Type:** Bugs  
**Labels:** QA

In the **Customer Required Carrier** field, the dropdown and search functionality behave inconsistently.  
Initially, the lookup is not loaded properly, and after some delay, multiple carrier records are displayed. However, when searching for a carrier using 2–3 characters, the search incorrectly returns **“No records found”**, even though matching records exist in the dropdown.

---
