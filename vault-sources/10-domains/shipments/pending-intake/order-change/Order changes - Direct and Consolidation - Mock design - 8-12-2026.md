<!-- Slide number: 1 -->
# Buy Shipment View

<!-- Slide number: 2 -->

Buy Shipment
8956
Pro/Booking #
67819A88
Tracking Link
Rating Status
Successful
Sell Shipment
9678

| Source Name | USALCO | "org\_long\_name" looked up using SOURCE\_ID passed on order |
| --- | --- | --- |
| Shipment Status | Accepted |  |
| Carrier | CTNS |  |
| Pickup Date/Time | from current option |  |
| Delivery Date/Time | from current option |  |
| Gross Weight | 44470 LB |  |
| Volume | 200 cuft |  |
| Mode | LTL |  |
| Equipment | LTL |  |
| Freight Term | Collect |  |
| Hazmat | Yes | Yes / No |
General Information
| Base | $2,900.00 |
| --- | --- |
| Fuel (FSC) | $250.00 |
| Accessorials | $56.00 |
| AP Total (Carrier) | $3,206.00 |
| AR Total (Customer) | $3,456.00 |
| Margin | $ 250 - 7.7% |
| Direct Cost | $3,906.00 |

Cost

![](Picture32.jpg)

Stops
- Hyper link on the order
Address should be included
Check story – LINX -

![](Picture40.jpg)

![](Picture49.jpg)
User Defined Fields
Customer Reference Values

![](Picture51.jpg)

<!-- Slide number: 3 -->
Review Order Change - Direct – Page 1/3
Display
Button

Cancel Tender
8956
Buy Shipment
Keep Tender

Prior
New
Quoted Cost
Re-Tender
1000 USD
Prior Cost
Tender Status
Route Rank
Equipment
Rank
Tender Status
Route Rank
Equipment

Rank
SCAC
SCAC
New Cost
5
4

Sent
CTNS
1
900 USD
CTNS
LTL
2
LTL

Bypass Tender
New Quote
Pickup Date
Pickup Date
Delivery Date
900 USD
Delivery Date
06/06/2026 16:30 CDT
06/05/2026 16:30 CDT
06/04/2026 16:30 CDT
06/03/2026 16:30 CDT

View Tender
New Tender List

![](Picture111.jpg)
Prior Tender List

![](Picture115.jpg)

<!-- Slide number: 4 -->
Review Order Change – Direct – Page 2/3
Display
Button

Cancel Tender
8956
Buy Shipment
Keep Tender

Prior
New
Quoted Cost
Re-Tender
1000 USD
Prior Cost
Tender Status
Route Rank
Equipment
Rank
Tender Status
Route Rank
Equipment

Rank
SCAC
SCAC
New Cost
5
4

Sent
CTNS
1
900 USD
CTNS
LTL
2
LTL

Bypass Tender
New Quote
Pickup Date
Pickup Date
Delivery Date
900 USD
Delivery Date
06/06/2026 16:30 CDT
06/05/2026 16:30 CDT
06/04/2026 16:30 CDT
06/03/2026 16:30 CDT

New Tender List

![](Picture20.jpg)

![](Picture7.jpg)
Prior Tender List
Compare Screen

![](Picture23.jpg)

<!-- Slide number: 5 -->
Review Order Change – Direct – Page 3/3
Display
Button

Compare screen fields
| Fields | Example | Source |
| --- | --- | --- |
| Delivery Date | 06/04/2026 08:00 CST, MON | Routing |
| Pickup Date/Time | 06/02/2026 08:00 CST, WED | Routing |
| Distance | 282 MI | Routing |
| Distance source | PCMILER PRACTICAL BORDERS OPENED V24 |  |
| Incoterm Info | FOB | Order |
| Network Leverage | Y/N | Routing |
| Order Requested Date | SSD/RDD, Date Time | Order |
| Bill To |  | Order |
| Delivery Appointment | 6/4/26 3:00 PM | Order or entered in Shipment |
| Freight Terms |  | Order |
| Pickup Appointment | 6/2/26 3:00 PM | Order or entered in Shipment |
| Package Count |  |  |
| Seed Equipment | PMU | As entered on the Order |
| Ship Direction | Inbound | Order |
| Ship From | Add 1,2,3, city, State, Zip, Country | Order |
| Ship To | Add 1,2,3, city, State, Zip, Country | Order |
| Volume | 100 Cuft | Shipment |
| Gross weight | 2000 LB | Total of the Shipment |
| Boiling Point | Line # 100 CLine # 101 C | Order. If multiple line exist in an order, list Boiling Point by Line or Sequence # |
| Flash Point | Same as Boiling Point | Same as Boiling Point |
| Hazmat Class | I | Order. If multiple line exist in an order, list Boiling Point by Line or Sequence # |
| Hazmat Code | UN0012 | same as Hazmat class |
| Hazmat Description | Flammable Liquid | Source from order. If muntiple line exist, should show by Line/sequence # |
| Hazmat Pkg Group | II | same as Hazmat class |
| Item/Description | Asadero | Description of item. Multiple items, show by line/seq # |
| Marine Pollutant | Check box | Order. Checkbox by line/seq |
| Shipping Class | 75 | From Order |
| Tunnel Code | 1 | From Order |
| WGK Class | II | From Order |

<!-- Slide number: 6 -->
# Consolidation - Multi Stop Order Change

<!-- Slide number: 7 -->

![](Picture6.jpg)

![](Picture8.jpg)
Planning Date Type
Anchor Date
Approve Plan
Edit Shipment  Stope
RDD
3/20/2026

![](Picture21.jpg)
User clicks on the order and see side by side compare of the change

![](Picture23.jpg)

![](Picture25.jpg)

<!-- Slide number: 8 -->
Before EDIT

![](Picture4.jpg)

![](Picture35.jpg)

![](Picture6.jpg)
Approve Plan
Edit Shipment  Stope
Planning Date Type
Anchor Date
RDD
3/20/2026
Planning Date Type
Anchor Date
RDD
3/20/2026
3 SECTIONS
Stops
Order actions
Add Orders

 EDIT

<!-- Slide number: 9 -->
# EDIT Stop

![](Picture4.jpg)
System auto selects Stop P1 for user to Edit. User can Select P2 or D1 or any stop and corresponding order details to be populated
Order Tool Tip display:
Planning Type: SSD/RDD
Pickup/Delivery Date Time: 6/3/2026 08:00
Gross weight: 1000 LB
Volume: 30 Cuft
Origin: City, State, Postal, Country
Destination: City, State, Postal, Country

User should be able to drag and drop the stops

1. Logic should be available to prevent user saving changes like, order being delivered, before being picked up,

Order # will be displayed as chip

Move: User will have option to drag and move the order to any stop (P2,P3,D1)

Remove: Remove button.
Remove will remove order from Shipment (pickup and delivery). Moves it to the available order list (in case the user wants to add order again). Finalized the removal once user confirms the change.

Note: Should have logic that prevents order just being in delivery without a pickup or vice versa. Similarly, pickup of the order should happen before delivery

![](Picture38.jpg)
User should be able to add stops (Pickup or Delivery)
User should not be able to finalize the shipment without adding at least one order to the stop.
Similarly, the same order should be picked up before being delivered.

<!-- Slide number: 10 -->

![](Picture4.jpg)

![](Picture17.jpg)

![](Picture6.jpg)
New stop is added to the bottom of that stop type (Pickup or delivery)

<!-- Slide number: 11 -->

![](Picture4.jpg)

![](Picture11.jpg)
Rules to add another shipment

![](Picture9.jpg)
Search by
Customer, Origin, Destination, Order #, Buy shipment, Shipment Status, Tender Status

Details as in the Shipment Grid

User should not be able to add shipments / Orders already Tender ‘Sent’ or ‘Accepted’
Should reflect the change under the stops

![](Picture16.jpg)

<!-- Slide number: 12 -->
# Review Change

![](Picture4.jpg)
When new order is added-Review change details as below

![](Picture9.jpg)

<!-- Slide number: 13 -->

![](Picture4.jpg)

![](Picture6.jpg)