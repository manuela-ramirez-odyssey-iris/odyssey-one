---
source_url: https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/3722903567/Order+Domain+-+Error+logging+and+Retry+Mechanism
page_id: "3722903567"
title: "Order Domain - Error logging and Retry Mechanism"
last_modified: "May 28, 2026"
fetched: "2026-06-11"
space: TMS
---

The page covers error logging and retry steps if the call to Master , Routing and Rating service apis call. The circuit breaker will switch on if the service calls fail 5 times.

1. CB - Circuit Breaker
2. Master Service Error if the master api is returning 5XX
3. Routing Service error if the routing api is returning 5XX
4. Rating Service error if the rating api is returning 5XX
5. If the Routing service returns no carrier details or AP cost, the order_status='Ready To Plan
6. If the Routing fails and returns validation error like 'origin/destination mandatory', log the error and retry is not required. It needs User review from UI
7. If the Rating service returns no AR cost, the order_status='Ready To Plan'
8. If the Routing fails and returns validation error like 'origin/destination mandatory', log the error and retry is not required. It needs User review from UI
