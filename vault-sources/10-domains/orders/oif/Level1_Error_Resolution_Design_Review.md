**Level 1 error resolution**

**1. Two screens, or two stages**

Both options build the same two panels. The difference is what happens between them.

![](data:image/png;base64...)

*Figure 1 — Option A versus Option B*

# **2. UI design**

## **2.1 Stage 1 — message errors**

A form in business language, laid out like the existing screen: same field labels, same section grouping. Not a JSON editor. The raw field path stays as small secondary text for support, with the full message behind a "view raw message" link.

![](data:image/png;base64...)

*Figure 2 — Stage 1, grouped by defect class rather than JSON path*

## **2.2 Stage 2 — master data errors**

The existing screen, with two additions: the stage indicator, and a marker on any value that was set during stage 1.

![](data:image/png;base64...)

*Figure 4 — Stage 2, with stage 1 passed and read-only*

**The "set in stage 1" marker matters** because when a master data error traces back to a stage 1 choice, the user needs to see what they picked — and get back to it. Stage 1 stays reachable, read-only.

## **2.3 Message control fields**

Displayed, never edited. An invalid deleteFlag is not a data-entry mistake — it means the message is untrustworthy, and the only honest action is to reject it and request a resubmission. The same applies to sourceSystem, relySourceId and modifyTimestamp.

**Highest-severity case:** a blank or invalid deleteFlag defaults the message to "create". If a user could set it, a customer cancellation could be processed as a new order.

# **3. Behaviour rules**

| **Behaviour** | **Rule** |
| --- | --- |
| Stage entry | Stage 1 opens only when Level 1 errors exist. Otherwise the screen opens at stage 2 with stage 1 marked passed. |
| Stage progression | Stage 2 stays locked until stage 1 validation passes. Stage 1 remains viewable, read-only, from stage 2. |
| On save | A new version is written to order\_interface\_staging; the original message is always retained. |
| On validate (stage 1) | Re-run pre-condition validation. Remaining errors stay on stage 1; on success, transform to OrderIn and open stage 2. |
| On validate (stage 2) | Existing Level 2 behaviour, unchanged. |

# **Appendix A — Pre-condition rules as implemented**

![](data:image/png;base64...)

*Figure A1 — The 13 Level 1 rules, fields and current error messages*

# **Appendix B — Existing Level 2 screen**

![](data:image/png;base64...)

*Figure B1 — The screen stage 2 is based on*