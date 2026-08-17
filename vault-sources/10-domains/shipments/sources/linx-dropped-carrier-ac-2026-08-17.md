# Dropped Carrier — verbatim Jira Acceptance Criteria

Pulled live from the Atlassian MCP on **2026-08-17** (S122). This is a **raw source transcript**, not
synthesis — it lives in `vault-sources/` for that reason. Nothing here is paraphrased; formatting is
converted from Jira wiki-markup / ADF, wording is untouched.

> **How to fetch this yourself.** Acceptance Criteria is **`customfield_10032`**, and it is **NOT
> returned by default**. `getJiraIssue` without an explicit `fields` list returns only the one-sentence
> `description`, which makes every one of these tickets look empty. Always pass
> `fields: ["summary", "customfield_10032"]`. Historical AC lives in the changelog
> (`expand: "changelog"`), where the field shows up as `Acceptance Criteria` / `customfield_10032`.

| Ticket | Summary | Status | Assignee | Priority | Labels | Links | Comments |
|---|---|---|---|---|---|---|---|
| LINX-13953 | Tender Tab - Display Dropped Carrier | `Initial UX/UI Design` | Manuela Ramirez | High | `Functional` | none | 1 (Jana: *"can you please help with VD for Dropped carrier."*) |
| LINX-13954 | Tender Tab - Process SCAC | `Initial UX/UI Design` | Manuela Ramirez | High | `Functional` | none | 1 (identical text) |
| LINX-13397 | TMS Master Data Lookup Queries & Functions - For Tendering | `New` | **unassigned** | High | none | none | 0 |

All three hang off epic **LINX-5921 — Tender Process** (`Analysis`, Medium).
Component on 13953: `OdysseyONE TMS- Shipments`.

**No ticket carries `Approved` or `Refinement_done`.** These are pre-design stories waiting on the VD.

---

# LINX-13953 — Tender Tab - Display Dropped Carrier

**Description (user story)**

> As an Odyssey One user, I want to view dropped carrier information so that I can understand why a
> carrier was excluded from routing and determine whether the carrier should be processed into the
> Tender List.

**Acceptance Criteria**

> **Given** dropped carriers exist for a shipment,
> **When** the user views the Dropped Carrier section,
> **Then** Odyssey One shall display carrier, exception, and commitment information for each dropped
> carrier (if returned by routing).

## Business Rules

### Dropped Carrier Fields

The fields to be display as part of the dropped carrier are as below

| Field Name | Example | Logic / Data |
|---|---|---|
| Route Rank | 1 | Route Rank returned by Routing |
| SCAC | JBHT | Carrier SCAC returned by Routing |
| Carrier Name | J.B. Hunt | Lookup carrier name using SCAC (TMS master data lookup) — LINX-13397 |
| Equipment Type | LTL | Equipment returned by Routing |
| Pickup Date/Time | 08/20/2025 14:00 CST, Wed | Pickup date and time returned by Routing (if returned by Routing)<br>Note: org hrs are not required. |
| Delivery Date/Time | 08/22/2025 09:00 PST, Fri | Delivery date and time returned by Routing (if returned by Routing)<br>Note: org hrs are not required. |
| Start Date | 08/20/2025 | Start and stop can be looked up using the rpc-id. Refer story for the code — LINX-13397 |
| Stop Date | 08/22/2025 | Start and stop can be looked up using the rpc-id. Refer story for the code — LINX-13397 |
| Transit Time | 2 DY or 10 HRS | Transit Time returned by Routing (if returned by Routing) |
| Transit Source | PCMILER | Transit Source returned by Routing (if returned by Routing) |
| Route Group | EAST-01 | lookup using rpc-id. Refer story for the code — LINX-13397 |
| Reason | Missing Transit Time | Primary reason carrier was dropped (returned by routing) |
| 🔴 **Reason description (require code from Dave)** | Transit time could not be calculated due to missing transit or distance data | Detailed explanation of carrier exclusion. Lookup in the Master table. Refer story for the code — LINX-13397 |
| RPC-ID | 3913973 | RPC ID as returned in the routing. |
| Order equipment | Checkbox | Yes - If SCAC and Equipment match Order (passed in SCAC on the Order) |
| Indirect Point | Checkbox | As passed in on the Routing. Conditional - (if returned by Routing)<br>Y-Checked N-Unchecked<br>If not returned, then unchecked |
| TT ID | 10901692 | TT ID as returned in the routing. (conditional - if returned by Routing) |

🔴 = flagged red (`#bf2600`) in the ticket — the author's own open item.

---

### Volume Commitment Information

| Field Name | Example | Logic / Data |
|---|---|---|
| Commitment | 10 or 10,000 | Get commitment using CVC ID<br>Steps:<br>1. Using CVC ID, get Commitment for SCAC, Equipment and CVC ID — LINX-13397 |
| UoM | Loads/Week, KG/Day | Commitment Unit of Measure returned by Routing<br>UoM returned as part of commitment |
| Accepted | 6 Loads | Calculated commitment utilization |
| Open | 4 Loads | Remaining commitment capacity |
| Comment | Carrier commitment notes | Commitment comments associated with the carrier |
| CVC ID | CVC12345 | Carrier Volume Commitment identifier returned by Routing for each carrier. |

---

### Display Rules

* The Dropped Carrier section shall display all dropped carrier options returned by Routing.
* Pickup Date/Time shall display:
  * Date
  * Time
  * Time Zone
  * Day of Week
* Delivery Date/Time shall display:
  * Date
  * Time
  * Time Zone
  * Day of Week

### Commitment Rules

* Commitment information shall be displayed when available.
* Accepted and Open shall be calculated only when:
  * Commitment is available, and
  * UoM is available.
* If Commitment is missing, Accepted and Open shall display "--".
* If UoM is missing, Accepted and Open shall display "--".
* If Commitment and UoM are both missing, Accepted and Open shall display "--".
* The presence of a CVC ID alone shall not trigger commitment calculations.
* If CVC ID is available but Commitment or UoM is unavailable, Odyssey One shall not calculate Accepted or Open.

### Null Handling

* If Routing does not return a value for any field displayed within the Dropped Carrier section, Odyssey One shall display "--".

### Refresh Behavior

* Dropped Carrier information shall refresh whenever Routing Options are refreshed.

---

## 13953 AC edit history

Two AC revisions, both by Janardhana.

**2026-07-28 13:25** — first full AC.

**2026-08-11 09:10** — the current version. Diff against 07-28:

| Change | Detail |
|---|---|
| **Added 4 field rows** | `RPC-ID`, `Order equipment`, `Indirect Point`, `TT ID` |
| **Renamed** | `Non-Usable Reason (require code from Dave)` → `Reason description (require code from Dave)` — still red-flagged |
| **Loosened** | `(if returned by Routing)` added to Pickup, Delivery, Transit Time, Transit Source |
| **🔴 TBD RESOLVED** | Commitment lost its red flag. Was `Commitment (TBD - If commitment returned by routing or lookup using CVC ID)`; is now plain `Commitment`. The lookup-by-CVC-ID route won. |

Only **one** red flag survives into the current version: **Reason description (require code from Dave)**.

---

# LINX-13954 — Tender Tab - Process SCAC

**Description (user story)**

> As an Odyssey One user, I want to process a dropped carrier into the Tender List so that the carrier
> becomes available for routing, rating, quote, and tender activities.

**Acceptance Criteria**

> **Given** a carrier exists in the Dropped Carrier section,
> **When** the user selects Process SCAC,
> **Then** Odyssey One shall validate and process the carrier into the Tender List based on defined
> business rules.

## Business Rules

### Process SCAC Action

* Process SCAC shall only be available for carriers displayed within the Dropped Carrier section.
* Only one SCAC may be processed at a time.
* While processing is in progress:
  * Process SCAC shall be disabled (for the current SCAC and other dropped carrier SCACs)
  * Additional user clicks shall not be allowed.

### Routing Processing

Once user clicks on the 'Process SCAC' action under dropped carrier, routing call is attempted for the SCAC

#### Routing Success

When Routing completes successfully (Pickup and Delivery date available)

* Carrier information shall be copied from the Dropped Carrier section into the Tender List.
* Routing results shall be refreshed for the carrier copied

**Message**

> Routing completed successfully.

The message disappears after 3 s. No user action required.

---

#### Routing Failure

If routing call fails

```
    If the routing call did NOT return dates
        Dialog box to get user to fill in dates (Look at the Manual Pickup and Delivery Entry below)
    End if
    Call Rating

    If rating call failed
        Informational dialog reminding the user they should get a quote
    End If
End If
```

Add carrier to list at the end of the set of carriers for THAT equipment

### Manual Pickup and Delivery Entry

Manual entry shall be required only when:

* Routing fails (Routing call successful but didn't return Pickup or Delivery or both dates)
* And user to provide Pickup Date/Time and Delivery Date/Time

#### Fields

| Field |
|---|
| Pickup Date/Time |
| Delivery Date/Time |

#### Validation

If Delivery Date/Time is less than or equal to Pickup Date/Time, then below message is displayed to the
user (under the delivery date). This message should prevent user from proceeding further

> Delivery Date/Time must be later than Pickup Date/Time.

Users shall correct the values before continuing.
once above validations are complete, then Yes button activated.

Buttons: **OK**, **Cancel**

| User Response | Result |
|---|---|
| OK | Continue processing. |
| Cancel | Cancel processing. SCAC not copied from dropped carrier to the Tender list. |

If Pickup Date/Time is in the past, then below message is displayed to the user (under the pickup date).
This message should prevent user from proceeding further

> **Pickup Date/Time cannot be in the past.**

Users shall correct the value before continuing.
once above validations are complete, then Yes button activated.

Buttons: **OK**, **Cancel**

| User Response | Result |
|---|---|
| OK | Continue processing. |
| Cancel | Cancel processing. SCAC not copied from dropped carrier to the Tender list. |

---

### Rating Processing (only in the case of Routing failed)

#### Rating Failure

In case of Rating failure

**Message**

> No rate is available for the carrier. You may obtain and enter a quote if needed.

Buttons: **OK**

| User Response | Result |
|---|---|
| OK | Continue processing. |

* Rating failure shall not prevent the carrier from being added to the Tender List.
* User may acknowledge the message and continue.

### Duplicate Carrier Validation

Before processing the carrier:

* Odyssey One shall validate whether the same SCAC and Equipment combination already exists within the Tender List.

If the same SCAC and Equipment combination already exists:

**Message**

> Carrier and Equipment combination (SCAC/Equipment) already in the list.

Button: **OK**

Result:

* Processing shall stop.
* Carrier/option shall remain in the Dropped Carrier section.
* No updates shall be made to the Tender List.

---

### Carrier Insertion Logic

When a dropped carrier is successfully processed and moved to the Tender List:

* The carrier shall be inserted at the bottom of the matching Equipment group.
* If no matching Equipment group exists, the carrier shall be inserted at the end of the Tender List.
* Rank shall be recalculated based on the carrier's position in the Tender List.
* Route Rank logic:

```
If adding from the dropped carrier list
    Use the route rank from the dropped carrier list
    Use the RPC-ID from the dropped carrier list
Else (i.e. adding it "from scratch" on the tendering screen) - 🔴 Refer Story xxxx
    Leave the route rank empty
    Leave the RPC-ID empty
End if
```

🔴 `Refer Story xxxx` is red-flagged (`#bf2600`) — **the story does not exist**. This is the hole S120
matched to the manual Add-Carrier-and-SCAC ask from Jana's 2026-08-11 call. Note that the *else* branch
is out of 13954's own scope: 13954 only covers the "from the dropped carrier list" path.

---

### Focus Management

After successful processing:

* Focus shall automatically move from the Dropped Carrier section to the Tender List.
* The newly added carrier shall remain visible.

---

### Audit Logging

The following information shall be recorded in backend audit logs:

* User
* Date/Time
* Shipment
* SCAC
* Routing Result
* Rating Result
* Manual Pickup/Delivery values (when entered)

---

### Processing Failure

If the carrier cannot be processed because of a system error:

**Message**

> The dropped carrier could not be processed. If the issue persists, please contact your system administrator.

Result:

* Carrier shall remain in the Dropped Carrier section.
* No updates shall be made to the Tender List.
* Process SCAC shall remain available for retry.

**Note**: While the carrier is being copied from Dropped carrier to the Tender screen, all other
parameters related to Tender (within View Shipment, Routing Options, Response comments, Volume
commitment, Additional Information and Others tabs) to be updated as well.

---

# LINX-13397 — TMS Master Data Lookup Queries & Functions - For Tendering

**Description**

> This story captures all database queries, lookup logic, and TMS functions required to retrieve
> reference and master data displayed within Odyssey One. The intent is to provide the technical team
> with a single consolidated reference for all master data lookups and supporting logic.

**This ticket is fully written.** Its workflow status is `New` and it is unassigned, but the AC contains
11 specified lookups. Prior sessions recorded it as a blocking hole — that reading came from the
one-sentence `description`, not the AC.

## 1. SCAC Lookup

Retrieve the list of active SCAC codes available in TMS.

```sql
SELECT carr_scac
FROM mf_carrier
WHERE carr_cd_status = 'A';
```

Returns `carr_scac` (Active SCAC Code). Used wherever Odyssey One requires a list of valid carrier SCACs.

## 2. Carrier Name Lookup

Retrieve Carrier Name based on the selected SCAC.

```sql
SELECT carr_long_name
FROM mf_carrier
WHERE carr_scac_id = :scac;
```

*(The ticket shows a "Show more lines" affordance here — the code block may be truncated in the Jira UI.)*

Input `:scac` (Carrier SCAC Code). Returns `carr_long_name` (Carrier Long Name).
Used to display Carrier Name associated to a selected SCAC.

## 3. Equipment Lookup

Retrieve all active equipment codes and descriptions.

```sql
SELECT
 se_equip_id AS "Equipment Code",
 se_short_desc AS "Short Name",
 se_long_desc AS "Long Name",
 se_cd_equip_code AS "Mode"
FROM mf_ship_equipment
WHERE se_cd_status = 'A';
```

Used for Equipment dropdowns and Equipment display fields throughout Odyssey One.

## 4. Distance Source Description Lookup

Retrieve user-friendly description for a Distance Source Code.

```sql
SELECT dso_short_desc
FROM mf_distance_source_lov
WHERE dso_code = :distance_source_code;
```

Input `:distance_source_code` (Example: `PCMP*`). Returns `dso_short_desc`.
Example: `PCMP*` → `PC*Miler Practical`.
Used when displaying Distance Source Description rather than the underlying code.

## 5. Organization Hours of Operation Lookup

Retrieve operating hours for an Origin or Destination location.

```
mf$org.get_workday_info(
 p_source_id,
 p_site_org_id,
 p_location_id,
 p_ship_dt
RETURN WORKDAY_INFO;
```

| Parameter | Description |
|---|---|
| `p_source_id` | Source System Identifier (Org Global ID) |
| `p_site_org_id` | Organization Site ID |
| `p_location_id` | TMS Location ID |
| `p_ship_dt` | Date for which hours need to be determined |

```
TYPE WORKDAY_INFO IS RECORD (
 timezone VARCHAR2(80),
 cd_time_zone VARCHAR2(4),
 time_open INTEGER,
 time_close INTEGER
 );
```

| Field | Description |
|---|---|
| `timezone` | Java Timezone Identifier |
| `cd_time_zone` | TMS Time Zone |
| `time_open` | Opening Time (Seconds Since Midnight) |
| `time_close` | Closing Time (Seconds Since Midnight) |

Example values: `07:00 - 15:30`, `00:00 - 23:59`.
Used to populate Pickup / Origin Hours and Delivery / Destination Hours.

## 6. Pro Number (PRO#) Lookup

**Deferred / Not Required for Valtris Go-Live**

## 7. Start and Stop date Lookup

start and stop can be looked up using the rpc-id

```sql
select rpc_start_date, rpc_stop_date
from mf_route_preferred_carrier
where rpc_id = :l_rpc_id  -- use the rpc_id returned for the shipping option
```

## 8. Route Group Lookup

route group can be looked up using the rpc-id

```
rpc_rg_name -- route group name
, rpc_start_date  -- start date of carrier on route
, rpc_stop_date -- end date of carrier on route
from mf_route_preferred_carrier
where rpc_id = :rpc_id  -- returned by QCP in shipping option
;
```

## 9. Lookup AP Org

```
-- lookup the AP org  *ODYSSEY_AP
mffnlorg(
    opOrg in varchar2, -- same TMS org used for p_owning_org_id in the get_cvc_id call.  "*G20TECH_SYS_01", "*ERCO_SYS_01", etc)
    equip in varchar2  -- equipment id of the shipping option
) return varchar2 -- AP Org (right now, you have this as a shipment level attribute, but technically, it can vary based on the equipment.  So, as tendering iterates through the shipping options, this should be re-evaluated
```

## 10. Getting CVC ID for Commitment Lookup

```
-- getting cvc_id
mf$carrier_vol_commitment.get_cvc_id(
    p_owning_org_id       IN mf_organization.org_id%TYPE,      -- TMS organization_id of the owning org of the shipment (e.g. "*G20TECH_SYS_01', '*ERCO_SYS_01', etc...)
    p_scac_id             IN mf_load_carrier_equipment.lce_ce_carr_scac_id%TYPE, -- SCAC if the carrier
    p_ship_date           IN mf_load_carrier_equipment.lce_scheduled_pickup_date%TYPE, -- pickup date/time in the timezone of the origin
    p_org_cnor_id         IN mf_organization.org_id%TYPE,      -- TMS organization_id of the consignor
    p_org_cnee_id         IN mf_organization.org_id%TYPE,      -- TMS organization_id of the consignee
    p_loc_orig_id         IN mf_location.loc_location_id%TYPE, -- TMS location id of origin
    p_loc_dest_id         IN mf_location.loc_location_id%TYPE  -- TMS location id of destination
) RETURN mf_carrier_vol_commitment.cvc_id%TYPE; -- returns NULL if no applicable capacity rule
```

## 11. Getting Commitment Data using CVC ID

```sql
select -- week is defined as beginning Monday, ending Sunday
    cvc_cd_flag_weight_based -- 'A' = [Shipments] Per Week, 'B' = [Shipments] Per Day, 'Y' = weight per day (see cvc_uom_wgt for the unit)
    , cvc_comment -- some text to show to the user on the UI
    , cvc_num_loads_per_wk -- only applies when cvc_cd_flag_weight_based = 'A'
    , cvc_uom_wgt -- only applies when cvc_cd_flag_weight_based = 'Y'
    -- even though the following columns have "WGT" in their name, when cvc_cd_flag_weight_based = 'B', we are really talking about shipment counts
    , cvc_wgt_monday
    , cvc_wgt_tuesday
    , cvc_wgt_wednesday
    , cvc_wgt_thursday
    , cvc_wgt_friday
    , cvc_wgt_sat_sun -- limit for the weekend is combined across both days
from mf_carrier_vol_commitment
where cvc_id = :cvc_id
;
```
