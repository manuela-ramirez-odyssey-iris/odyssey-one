---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3487956996/QCP+Invocation+-+LLD
page_id: "3487956996"
title: "QCP Invocation - LLD"
last_modified: "Mar 25, 2026"
fetched: "2026-06-11"
space: TMS
---

Overview:  
This document describes the low-level design for invoking the legacy XML-based QCP API. When we receive the order in the system,  json based order in data will be transformed into the XML format required by the legacy system and  QCP endpoint invoked, XML response of QCP will be processed and converted to json format which O2 can understand.

**Scope:**  
Order in json received and converted to xml based request which OnPrem QCP can understand.  
Invoke the QCP end point(Refer the table below for environment specific url's)  
Follow the authorization procedure similar to QCA end point we invoked earlier in Shipment.  
Parse the XML response extract the first element from list of carriers.

**Architecture overview:**

**Configuration:**  
Add the environment specific configuration in application.properties or build environment files for end points/credentials etc, Follow the QCA configuration defined in shipment service.

**Request Transformation:**  
Parse the incoming order json to pojo  
Map the pojo to Jaxb annotated class  
Convert the object to xml string which QCP can understand.  
\[Note: If possible, explore the option to use Jackson instead of JaxB by considering future state\]

**API Invocation(Post):**

**Request:**  
    Headers:  
                   Content-Type: application/xml; charset=utf-8  
                   Accept: application/xml; charset=utf-8  
    Refer the attached spreadsheet for request based mapping.

**Response:**  
            Content-Type: application/xml  
  Refer the attached spreadsheet for response based mapping.

**Response Parsing and Preferred carrier selection:**  
Convert the xml response back to Java Object  
Access the list of carriers, Always choose the first sequence as its the preferred carrier.  
Do the necessary validations(e.g null check) before accessing the list of carriers.  
Store the received cost as Preferred Direct AP Cost, Order status should be changed to ready for planning and sent to shipment service as usual.

**No carrier returned scenario:**  
If QCP doesn't return eligible carrier list, Change the order status to "Routing error" and sent to shipment domain.

**Service failures:**  
Incase if QCP service failures during invocation, retry mechanism should be followed similar to rating service, It should be retried for 5 times.

**Success Codes:**  
200

**Failure Codes:**  
401,403,500 which will not contain response body.

2026-03-09 QCP_Request_Response_Mapping.xlsx

‌

‌

| Environment | End Points |
| --- | --- |
| QA | https://rrtestqa2.odysseylogistics.com/routing/routing-service |
| PS | https://rrtest2.odysseylogistics.com/routing/routing-service |
| UAT | https://rrtest2.odysseylogistics.com/linx-uat/routing/routing-service |
| PROD | https://rrprod.odysseylogistics.com/routing/routing-service |
