---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3408691214/Order+And+Shipment+Flow+Linx+Phase+2
page_id: "3408691214"
title: "Order And Shipment Flow Linx Phase 2"
last_modified: "May 28, 2026"
fetched: "2026-06-11"
space: TMS
---

‌

‌

## Explanation:

1. The Customer ERP sends the order to Boomi. 
2. Boomi will have a table to reference which process the customer is in (TMS or O2).  For customers using the O2 process, Boomi will populate Order.SourceSystem = O2.
3. The Boomi will do the translation and send the order request in O2 defined format.
4. The O2 team will share the Order Request payload to the Boomi team
5. The Boomi will send the order request to new SQS Queue to process One Odyssey(O2) order request.
6. The Order Service will translate the  O2 order request to OrderIn request structure and save the order.
7. If the Order.SourceSystem is null, the current logic remains (Legacy TMS orders will be processed the same way as they are being done currently). Please refer [Link Phase 1](https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2592210945)

‌

Choosing between Option 1 and Option 2 for message flow:

Option 1: Process Separation

Benefits: 

1. Since we are isolating version 1 and version 2, Failures in one version will not affect the other version.
2. We can independently deploy version 1 and 2 and can be tested separately incase of modifications.
3. Failures can be easily monitored and will reduce the RCA time, because we are using separate logs.
4. We can safely retire the version 1 once V2 is completely active and it reduces the complexity in lambda validation.

Consequences:

1. Slightly higher infra cost where we need to setup additional  queue, lambda, and log group.
2. Increased monitoring, We need to keep an eye on both SQS and Lambda.
3. Code duplication.

Option 2 :  Re-Use existing SQS queue and lambda 

Benefits:

1. We can reuse existing infrastructure, so implementation is slightly faster in the short term
2. Single monitoring (Existing lambda and its logs 
3. We can avoid code duplication since we are reusing existing infrastructure, Validation and api direction logic stays in single lambda.

Consequences:

1. There is a possibility if new version fails it may impact the existing flow as well(Lambda) and it will stop the order processing.
2. Failures from Version 1(TMS) and Version 2(O2) will appear in the same log and its mixed, Hard to troubleshoot. RCA will be delayed.
3. Modifications specific to V2 will force us to re-validate the existing V1 version too.
4. Additional efforts required to clean up the V1 version code in Lambda and re testing is required.

Recommendation:

From an architectural standpoint the separate processing approach(Option 1) provide stronger safegurards during the migration process and simplifies the application flow and it will help us the easy decommission of version 1 system. This approach is considered appropriate for implementation.
