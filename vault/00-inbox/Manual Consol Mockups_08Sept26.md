<!-- Slide number: 1 -->

![A picture containing train, track, outdoor, traveling Description automatically generated](PicturePlaceholder5.jpg)
#
OdysseyONE – Manual Consolidation Mockups

Dated 08-Sept-2026

<!-- Slide number: 2 -->
# LINX-15786 (Consolidation Workbench)
Screen 1 - Candidate Summary Page

![](Picture3.jpg)

Must always be updated based on current selection
Apply Filters – Applies the Basic/Advanced Filter(s)
More Filters – Opens the Advanced Filters Page
Clear – Clears the applied filters
Refresh – Refreshes the page to include the  most recent candidates (if available)

<!-- Slide number: 3 -->
# LINX-15786 (Consolidation Workbench)
Screen 2 - Candidate Details & Selection

![](Picture23.jpg)

Must always be updated based on current selection

View Selected Candidates Summary

![](Picture2.jpg)
1
2

<!-- Slide number: 4 -->
# LINX-15786
Mechanics/Flow
| Selected Candidate Summary section shall be collapsed by default. Planner applies one or more Basic Filters and/or Advanced Filters. Candidate grid and summary information shall refresh based on the applied filter criteria. Planner selects two or more shipments from the Consolidation Candidate Workbench and selects View Selected. OdysseyONE shall expand the Candidate Details & Selection section and display the selected shipment and load details for review. If additional weight and/or volume capacity is available (Weight Utilization % and/or Volume Utilization % is less than the target defined in the applicable Customer Profile), the Planner may select Modify Selection. OdysseyONE shall return the Planner to the Consolidation Candidate Workbench with the existing shipment/load selections retained. The Planner may add or remove eligible shipments to improve overall utilization. Planner can continue modifying the Candidate Details & Selection to improve weight/vol utilization When the planner is satisfied, they click on ‘Proceed to Review Consolidation’. OdysseyONE shall navigate the Planner to the Review & Apply Manual Consolidation workflow (LINX-15787). |
| --- |
|  |

<!-- Slide number: 5 -->
# LINX-15787 - Review & Apply Manual Consolidation
Screen 1 - Review & Apply Manual Consolidation

![](Picture18.jpg)

55%
66%

Button Behaviour:

Modify Selection
Back to consolidation workbench (LINX-15786)
Retain existing selections
Planner can add and/or remove candidates

Cancel Proposed Consolidation
Back to consolidation workbench (LINX-15786)
Don’t retain any existing selection
Planner starts afresh

Apply Proposed Consolidation
 Confirmation Popup
Yes – Confirms the consolidation application, Shipments domain handles the changes
No – Back to ‘Review & Apply Manual Consolidation’ page

### Notes:

<!-- Slide number: 6 -->
# LINX-15787 - Review & Apply Manual Consolidation
Screen 2 – Selection Confirmation Popups
Apply Proposed Consolidation
Cancel Proposed Consolidation
Apply Proposed Consolidation

Are you sure you want to apply the proposed consolidation?
Yes
No

Cancel Proposed Consolidation
Are you sure you want to cancel the proposed consolidation? All the selected shipments will be removed from the proposed consolidation.
Yes, Cancel
No

Consolidation Confirmation
Consolidation Successfully Applied!

Consolidation ID: CON–001

2 Shipments successfully consolidated
View Shipment
Close

Close the window & back to Scenario 4 (LINX-15787)

Banner Message
Proposed Consolidation Cancelled Successfully !

<!-- Slide number: 7 -->
# LINX-15788
Consolidation Audit Trail
Consolidation Audit Trail

Refresh
Last Refresh : 08-Sep-26 10:00 am CST
| Event Timestamp | Event Type | Shipment ID | Consolidation ID | Previous Value | New Value | Exit Reason | Updated By |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 15-Oct-26 09:12 | Consolidation Applied | SH1001 | CON001 | -- | CON001 | -- | johndoe@odysseylogistics.com |
| 15-Oct-26 09:10 | Proposed Consolidation Modified | SH1001, SH1002 | -- | SH1001, SH1002 | SH1001, SH1002, SH1003 | -- | johndoe@odysseylogistics.com |
| 15-Oct-26 09:05 | Proposed Consolidation Cancelled | SH1001, SH1002 | -- | SH1001, SH1002 | -- | -- | johndoe@odysseylogistics.com |
| 15-Oct-26 09:00 | Load Reassigned to Another Shipment | SH1001 | CON001 | SH1001 | SH3001 | -- | OdysseyONE |
| 15-Oct-26 08:55 | Consolidated Shipment Created | SH3001 | CON001 | -- | SH3001 | -- | OdysseyONE |
| 15-Oct-26 08:50 | Shipment Transitioned to Hold | SH2001 | -- | Consolidation | Hold | Volume Threshold Reached | OdysseyONE |
| 15-Oct-26 08:45 | Shipment Exited Consolidation Pool | SH2001 | -- | Consolidation | Hold | Weight Threshold Reached | OdysseyONE |
| 15-Oct-26 08:30 | Shipment Proceeded to Tendering | SH4001 | -- | Consolidation | Approved | Tendering Window Reached | OdysseyONE |
| 15-Oct-26 08:15 | Entered Consolidation Pool | SH5001 | -- | -- | Consolidation | -- | OdysseyONE |

<!-- Slide number: 8 -->
# INTEGRATION WITH OPTIMIZER IS NOT IN SCOPE FOR OCT MVP
OPTIMIZER INTEGRATION IS DESCOPED FOR OCT MVP

<!-- Slide number: 9 -->

![A picture containing train, track, outdoor, traveling Description automatically generated](PicturePlaceholder5.jpg)
#
OdysseyONE – Optimizer Mockups

Dated 17-Aug-2026

<!-- Slide number: 10 -->
# LINX-14633  : Recommendation Summary Page & LINX-13292 : Optimizer Job Statuses

Refresh

![Refresh outline](Graphic70.jpg)
Download

![Download outline](Graphic77.jpg)

![Magnifying glass outline](Graphic47.jpg)
Created Dt (From)

![Magnifying glass outline](Graphic51.jpg)
Created Dt (To)

![Magnifying glass outline](Graphic13.jpg)
Recommendation ID

![Magnifying glass outline](Graphic43.jpg)
Status

![Magnifying glass outline](Graphic35.jpg)
Customer

![Magnifying glass outline](Graphic59.jpg)
Savings (Max)

![Magnifying glass outline](Graphic55.jpg)
Savings (Min)

![Magnifying glass outline](Graphic39.jpg)
Rec Type

![Magnifying glass outline](Graphic24.jpg)
Shipment #

![Magnifying glass outline](Graphic8.jpg)
Order #
Clear Filter
Apply Filter
| Recommendation ID | # Orders | #Shipments | Customer | Type | Pre-Optimization Cost | Optimized Cost | Savings | Current Status | Created Date | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REC-1001 | 3 | 2 | Valtris | Aggregation | US $10000 | US $8000 | US $2000 | Pending Review | 17-Aug-26, 10.00 am | … |
| REC-1002 | 5 | 3 | USALCO | Continuous Move | US $24000 | US $21000 | US $3000 | Accepted | 17-Aug-26, 09.30 am | View |
| REC-1003 | 2 | 1 | BASF | Multi-Stop | US $8200 | US $7400 | US $800 | Accepted | 16-Aug-26, 4.30 pm | View |
| REC-1004 | 4 | 2 | Valtris | Aggregation | US $10500 | US $9900 | US $600 | Pending Review | 16-Aug-26, 09.45 am | … |

View,Review

View,Review

<!-- Slide number: 11 -->
# LINX-13291 : Output for Optimizer Selecting ‘View’ from the summary page

Recommendation ID                                                                         Status				                                Created Date
           REC-100                                                                                      Accepted or Rejected		                             17-Aug-2026 10:00 am
Audit Trail
Review Recommendation

Route Information

Recommendation Summary
Cross Customer Indicator
No
Customer Name
USALCO
Consolidation Type
Aggregation
Recommendation Status
Pending Review
Consolidation Sub-Type
Multi Pick-Up /
Multi-Drop
Creation Date
17-Aug-26 10.00 am
Recommendation Count
1
| Stop # | Type | Location | Date/Time Window |
| --- | --- | --- | --- |
| 1 | Pickup | Chicago, IL | Earliest : 20-Aug-26 Latest : 21-Aug-26 |
| 2 | Pickup | St. Louis, MO | Earliest : 20-Aug-26 Latest : 21-Aug-26 |
| 3 | Drop | Dallas, TX | Earliest : 23-Aug-26 Latest : 24-Aug-26 |
| 4 | Drop | Houston, TX | Earliest : 23-Aug-26 Latest : 24-Aug-26 |
Associated Orders	  		    Total Orders : 3
| Order# | Origin | Destination | Pickup Window |
| --- | --- | --- | --- |
| O1001 | Chicago, IL | Dallas, TX | 20-Aug-16 - 21-Aug-26 |
| O1002 | St. Louis, MO | Dallas, TX | 20-Aug-16 - 21-Aug-26 |
| O1003 | St. Louis, MO | Houston, TX | 20-Aug-16 - 21-Aug-26 |
Planning Summary

Earliest Delivery Date
23-Aug-26
Earliest Pickup Date
20-Aug-26
Latest Pickup Date
21-Aug-26
Latest Delivery Date
24-Aug-26
  Associated Shipments	  	                          Total Shipments : 2
Cost Impact                                  All numbers in US $
| Shipment ID | Mode | Equipment | Shipment Status prior to consolidation |
| --- | --- | --- | --- |
| SHP2001 | TL | 53’ Dry Van | O1001 |
| SHP2002 | TL | 53’ Dry Van | O1002, O1003 |
| Pre-Optimization Cost | US $10,000 |
| --- | --- |
| Estimated Optimized Cost | US $8,000 |
| Savings | US $2000 |
Back to Recommendation Summary Page

### Notes:

<!-- Slide number: 12 -->
# LINX-14687  : Recommendation Review & DecisionSelecting ‘Review’ from the summary page

Recommendation ID                                                                         Status				                                          Created Date
           REC-100                                                                                Pending Review		                                                      17-Aug-2026 10:00 am
Audit Trail
Review Recommendation

Recommendation Summary
Cross Customer Indicator
No
Customer Name
USALCO
Consolidation Type
Aggregation
Recommendation Status
Pending Review
Consolidation Sub-Type
Multi Pick-Up /
Multi-Drop
Creation Date
17-Aug-26 10.00 am
Recommendation Count
1
Route Information
| Stop # | Type | Location | Date/Time Window |
| --- | --- | --- | --- |
| 1 | Pickup | Chicago, IL | Earliest : 20-Aug-26 Latest : 21-Aug-26 |
| 2 | Pickup | St. Louis, MO | Earliest : 20-Aug-26 Latest : 21-Aug-26 |
| 3 | Drop | Dallas, TX | Earliest : 23-Aug-26 Latest : 24-Aug-26 |
| 4 | Drop | Houston, TX | Earliest : 23-Aug-26 Latest : 24-Aug-26 |
Associated Orders	  		    Total Orders : 3
| Order# | Origin | Destination | Pickup Window |
| --- | --- | --- | --- |
| O1001 | Chicago, IL | Dallas, TX | 20-Aug-16 - 21-Aug-26 |
| O1002 | St. Louis, MO | Dallas, TX | 20-Aug-16 - 21-Aug-26 |
| O1003 | St. Louis, MO | Houston, TX | 20-Aug-16 - 21-Aug-26 |

Planning Summary
Earliest Delivery Date
23-Aug-26
Earliest Pickup Date
20-Aug-26
Latest Pickup Date
21-Aug-26
Latest Delivery Date
24-Aug-26
  Associated Shipments	  	                          Total Shipments : 2
| Shipment ID | Mode | Equipment | Shipment Status prior to consolidation |
| --- | --- | --- | --- |
| SHP2001 | TL | 53’ Dry Van | O1001 |
| SHP2002 | TL | 53’ Dry Van | O1002, O1003 |
Cost Impact                                  All numbers in US $
| Pre-Optimization Cost | US $10,000 |
| --- | --- |
| Estimated Optimized Cost | US $8,000 |
| Savings | US $2000 |
Back to Recommendation Summary Page
     Accept Recommendation

![Checkmark with solid fill](Graphic99.jpg)
X  Reject Recommendation

### Notes:

<!-- Slide number: 13 -->
# Accepting / Rejecting a recommendation
     Accept Recommendation

![Checkmark with solid fill](Graphic8.jpg)
X  Reject Recommendation
Reject Recommendation
Are you sure you want to reject the recommendation <Rec ID>? Rejected recommendations will return to the optimization pool

Yes
No

Accept Recommendation
Are you sure you want to accept the recommendation <Rec ID>? This action can’t be undone

Yes
No

<!-- Slide number: 14 -->
# LINX-13472  : Audit Trail
Audit Trail
Review Recommendation

![](Picture23.jpg)

![](Picture30.jpg)
Order Count
Orders

![](Picture24.jpg)

### Notes:

<!-- Slide number: 15 -->
# Integration with Consolidated Shipment Editing UI

![](Picture2.jpg)
If the consolidated shipment has one or more orders have changes that need re-optimization:
Is the order, a part of a job that’s already running?
If yes, Optimizer will not accept the job until terminal status is reached. The revised order will be in Opt pool., provided it’s eligible
If no, OdysseyONE will determine whether re-optimization is required.
2. If it is already time to tender, don’t accept the change, inform user  & tender as-is
3. If time to tender is not yet reached and If atleast 1 order field (e.g address/wt/vol/product info etc.)  is changed (and requires re-optimization), the revised order will go to Optimization Pool & will be input in the next optimization batch

### Notes: