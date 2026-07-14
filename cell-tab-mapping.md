## Cell-Tab Mapping
| # | Column Key | Column Label | Current (shipped S82) | Recommended Tab | Confidence | Rationale | YOUR DECISION | Your Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sellShipment | Sell Shipment # | Orders (default) | Orders | High | Identity/title cell — the natural "open the shipment" entry point. Orders is the general summary, right default for identity columns. | NaN | Isnt buy shipment # and sell shipment # related to the user interests about cost? Or what are those for in terms of logistics? |
| 2 | buyShipment | Buy Shipment # | Orders (default) | Orders | High | Same as Sell Shipment — identity cell, general entry. | NaN | same as above. |
| 3 | orders | Order # | Orders (default) | Orders | High | Literally the order numbers — user is looking at order-level data. Could even preselect the clicked order badge in a future iteration. | Orders tab | NaN |
| 4 | orderCount | Order Count | Orders (default) | Orders | High | Order-level context; user wants to see which orders are on the shipment. | Orders tab | NaN |
| 5 | proBookingNumber | Pro#/Booking # | Orders (default) | Tender | Medium | Pro/booking numbers come from the carrier booking — carrier context lives in the Tender pane. Alternative: Documents (BoL carries the pro#). | NaN | I know this is related to carrier but is also related to tracking since pro# is that, however I don’t find any literal referentce of pro/booking# inside any tab, if user clicks on pro/booking im afraid is expecting to see that number replicated in the tab which is not. |
| 6 | customerId | Customer ID | Orders (default) | Orders | Medium | Customer identity is shown in the order General Information (sold-to). No dedicated customer pane. | Orders tab | make sure it expands the general information |
| 7 | customerName | Customer Name | Orders (default) | Orders | Medium | Same as Customer ID. | Orders tab | same as above. |
| 8 | consignor | Consignor | Orders (default) | Stops | High | Ship-from party — party details live in the pickup stop (Stops pane shows stop parties/addresses). Also in Orders > Pickup and Delivery; Stops is the more direct physical view. | Stops tab | NaN |
| 9 | consignee | Consignee | Orders (default) | Stops | High | Ship-to party — delivery stop details. | Stops tab | NaN |
| 10 | origin | Origin | Stops (S82) | Stops | High | Physical route endpoint — Stops timeline. Already shipped S82. | NaN | NaN |
| 11 | destination | Destination | Stops (S82) | Stops | High | Physical route endpoint — Stops timeline. Already shipped S82. | NaN | NaN |
| 12 | distance | Distance | Orders (default) | Stops | High | Distance is the first metric in the Stops summary strip (122.37 mi). | Stops tab | NaN |
| 13 | stops | Stops | Stops (S82) | Stops | High | The stop count — direct match. Already shipped S82. | NaN | NaN |
| 14 | shipDirection | Ship Direction | Orders (default) | Stops | Medium | Inbound/outbound is a routing property — closest home is Stops. Weak signal either way. | Stops tab | NaN |
| 15 | pickupDate | Pickup Date | Orders (default) | Stops | High | Dates/appointments render per stop in the Stops timeline (Date + Appointment per stop). | Stops tab | NaN |
| 16 | deliveryDate | Delivery Date | Orders (default) | Stops | High | Same as Pickup Date — delivery stop appointment. | Stops tab | NaN |
| 17 | earliestPickupDate | Earliest Pickup Date | Orders (default) | Stops | High | Date-window variant of pickup date. | Stops tab | NaN |
| 18 | latestPickupDate | Latest Pickup Date | Orders (default) | Stops | High | Date-window variant of pickup date. | Stops tab | NaN |
| 19 | earliestDeliveryDate | Earliest Delivery Date | Orders (default) | Stops | High | Date-window variant of delivery date. | Stops tab | NaN |
| 20 | latestDeliveryDate | Latest Delivery Date | Orders (default) | Stops | High | Date-window variant of delivery date. | Stops tab | NaN |
| 21 | mode | Mode | Stops (S82) | Stops | Medium | Shipped to Stops in S82 (route context). Defensible alternative: Tender (mode drives carrier/equipment selection). Flagging for your call. | NaN | NaN |
| 22 | equipmentCode | Equipment Code | Orders (default) | Stops | Medium | Equipment shows in the Stops summary strip (Seed Equipment). Alternative: Tender (equipment is part of the carrier ask). | NaN | NaN |
| 23 | equipmentNumber | Equipment # | Orders (default) | Stops | Medium | Physical trailer/container assigned — execution detail, Stops summary. Same alternative as Equipment Code. | NaN | NaN |
| 24 | sealNumber | Seal Number | Orders (default) | Stops | Medium | Seal is applied at the pickup stop — physical execution detail. | NaN | NaN |
| 25 | incotermInfo | Incoterm Info | Orders (default) | Orders | Medium | Commercial term on the order (General Information). Alternative: Cost Allocation (drives who pays freight). | NaN | NaN |
| 26 | freightTerms | Freight Terms | Orders (default) | Cost Allocation | Medium | Prepaid/collect determines AP/AR flow — cost context. Alternative: Orders general info. | NaN | NaN |
| 27 | scac | SCAC | Orders (default) | Tender | High | Carrier code — the Tender pane is the carrier view (routing guide rows are keyed by SCAC). | Tender tab | NaN |
| 28 | tenderStatus | Tender Status | Tender (S82) | Tender | High | Direct match. Already shipped S82. | NaN | NaN |
| 29 | shipmentStatus | Shipment Status | Tender (S82) | Tender | Medium | Shipped to Tender in S82 per your spec. Note: shipment status is broader than tender — History could argue for it. Keeping Tender unless you redirect. | NaN | NaN |
| 30 | grossWeight | Gross Weight | Orders (default) | Product | High | Weight totals aggregate the product lines — Product pane shows line-level weights. Alternative: Stops (summary strip also shows gross weight). | Product tab | NaN |
| 31 | netWeight | Net Weight | Orders (default) | Product | High | Line-level product detail. | Product tab | NaN |
| 32 | tareWeight | Tare Weight | Orders (default) | Product | Medium | Packaging weight — product/packaging detail. | Product tab | NaN |
| 33 | pkgCount | Pkg Count | Orders (default) | Product | High | Package count comes from product lines (package types per order line). | Product tab | NaN |
| 34 | hazardous | Hazardous | Orders (default) | Product | High | Hazmat flags render per product line (hazmat badges in the Product table). | Product tab | NaN |
| 35 | apFreightCost | AP Freight Cost | Cost Allocation (S82) | Cost Allocation | High | Direct match. Already shipped S82. | NaN | NaN |
| 36 | preferredApDirectCost | Preferred AP Direct Cost | Cost Allocation (S82) | Cost Allocation | High | Direct match. Already shipped S82. | NaN | NaN |
| 37 | arFreightCost | AR Freight Cost | Cost Allocation (S82) | Cost Allocation | High | Direct match. Already shipped S82. | NaN | NaN |
| 38 | preferredArDirectCost | Preferred AR Direct Cost | Cost Allocation (S82) | Cost Allocation | High | Direct match. Already shipped S82. | NaN | NaN |
| 39 | loadNumber | Load # | Orders (default) | Cost Allocation | Low | The Cost pane has the per-order expandable LOADS breakdown — the only pane that surfaces loads today. Alternative: Stops if loads are thought of physically. Weak — please guide. | NaN | NaN |
| 40 | loadCount | Load Count | Orders (default) | Cost Allocation | Low | Same reasoning as Load #. | NaN | NaN |
| 41 | loadStatus | Load Status | Orders (default) | Cost Allocation | Low | Same reasoning as Load #. Status could also argue History. | NaN | NaN |
| 42 | shipmentType | Shipment Type | Orders (default) | None (row select only) | Low | Shipment-level classification with no dedicated pane — a forced mapping would feel arbitrary. Suggest plain row-select (Orders default). | NaN | NaN |
| 43 | shipmentSequenceLeg | Shipment Sequence Leg | Orders (default) | Stops | Low | Multi-leg sequencing is route topology — Stops is the closest. Weak. | NaN | NaN |
| 44 | nextShipmentId | Next Shipment ID | Orders (default) | None (row select only) | Low | Points at ANOTHER shipment — the honest behavior would be navigating to that shipment, which no tab does. Suggest no mapping until cross-shipment nav exists. | NaN | NaN |
| 45 | validationMessage | Validation Message | Orders (default) | History | Low | Exception/validation text — no dedicated exceptions pane. History (audit trail) is the nearest home, but it is a placeholder today. Candidates: History, Notes, or None. | NaN | NaN |

## Legend
| ShipmentsBar tabs (in strip order) | Unnamed: 1 |
| --- | --- |
| Orders | NaN |
| Product | NaN |
| Stops | NaN |
| Tender | NaN |
| Cost Allocation | NaN |
| Instructions | NaN |
| Documents | NaN |
| Notes | NaN |
| History (placeholder) | NaN |
| Tender History (placeholder) | NaN |
| NaN | NaN |
| Row colors | NaN |
| Green | Mapping already shipped in S82 — listed for completeness/override |
| Amber | Low confidence — recommendation is a guess, please guide |
| NaN | NaN |
| How to use | NaN |
| Fill the YOUR DECISION column (dropdown) on any row you want to confirm or change. | NaN |
| Blank = accept the recommendation. "None (row select only)" = cell click just selects the row (Orders default). | NaN |
| Drop the edited file back and the CELL\_TAB\_MAP will be regenerated from it. | NaN |