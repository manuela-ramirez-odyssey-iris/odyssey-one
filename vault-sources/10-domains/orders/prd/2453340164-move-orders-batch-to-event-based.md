# Move Orders from Batch to Event Based

**Source:** https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2453340164/Move+Orders+from+Batch+to+Event+Based  
**Confluence page ID:** 2453340164  
**Parent:** Order Domain (2366406657)  
**Space:** TMS — Transportation Management Systems  
**Author:** Steve O'Hara  
**Last modified:** Oct 24, 2024

---

## Description

To enable future capabilities, we want to shift the Move integration from NN to TMS from Batch to event based. When orders are created, updated or cancelled/deleted in Move, we will need events to be triggered that will allow processes to be invoked based on the occurrence of the event as opposed to the current batch processes.

## Acceptance Criteria

**Given:** Orders are created in Move

**When:** Orders are Created, Updated, Cancelled/Deleted in Move

**Then:** Specific Events will be created and published to identify the type of event and the relevant order data impacted.
