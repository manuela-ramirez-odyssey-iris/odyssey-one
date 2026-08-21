# SpotBid screenshot pack — 2026-08-21

Shipment used: **25378332** (Kemira Europe, Miami FL → Baton Rouge LA, LTR/TLH, 41,556 LB) — spot-eligible (routed carriers are Declined/Cancelled, no Accepted/Sent tender), with routed Declined/Cancelled carriers, a dropped carrier (No Rates), and HZC/THC/FSC routing charges. Ineligible-shipment shot uses **25443000** (Accepted tender with XPO Logistics).

All shots: 1600×1000 viewport, live mode (deployed API via `/api` proxy → Neon).

## Planner (shipment detail → SpotBid tab)

| File | Shows | Flow step |
|---|---|---|
| `01-spotbid-ineligible.png` | SpotBid tab on shipment 25443000 (Accepted tender w/ XPO Logistics) — EmptyState with tender-blocker message | Eligibility gate |
| `02-setup-fresh.png` | Shipment 25378332, Setup & Carriers: sticky strip (Quote Duration `--`, Origin/Destination/Pickup Window/Distance/Equipment/Hazmat) + pill tabs (All 31/TL 13/LTL 18) + carrier table | Setup & Carriers — fresh |
| `03-routed-flags-zoom.png` | Scrolled to the 5 routed rows: ABFS/CNWY/FXFE Declined, ODFL/UPGF Cancelled, plus JBHT dropped (No Rates) | Setup & Carriers — routed flags |
| `04-strip-tooltip.png` | Hovering the Origin strip cell, Tooltip open showing full address (ACME FREIGHT SERVICES, Miami, FL 33101 US) | Setup & Carriers — strip tooltip |
| `05-quote-setup-modal.png` | Quote Setup modal: Quote Duration (30 min) + Flexible checked, Planned Pickup/Delivery row | Quote Setup |
| `06-after-apply.png` | After Apply: strip shows "30 min" duration, all carrier rows dated | Quote Setup — applied |
| `07-send-confirm.png` | "Send RFQ" confirm modal — 25 carriers listed + terms (Quote Duration/Flexible Pickup/Carrier Lists) | Send RFQ — confirm |
| `08-rfq-links.png` | After Confirm & Send: collapsed "RFQ sent — 25 bid links" panel + strip's Closes In cell now a countdown badge (26:01) | Send RFQ — sent |
| `09-live-bids.png` | Live Bids tab: sticky quote strip, outer table with Total column, PYLE bid landed ("Lowest bid", $2,233.67), Award button visible | Live Bids |
| `10-drafts-tab.png` | Drafts tab with one saved draft row (30 min, 25/31 carriers, TL + LTL) | Drafts |

## Carrier (RFQ token link, fresh incognito context)

| File | Shows | Flow step |
|---|---|---|
| `11-bid-page-top.png` | Navbar countdown title (HH:MM:SS) + "Bid Open" badge floating below | Bid page — top |
| `12-bid-page-details.png` | Shipment Detail card incl. Flexible badges next to Pickup and Delivery | Bid page — details |
| `13-bid-charges-seeded.png` | Additional Charges pre-seeded with shipment's real charges (HZC Hazmat $381.52, THC Terminal Handling $431.39, FSC Fuel Surcharge $177.95) + "Add More" | Bid page — charges |
| `14-submit-confirm.png` | Submit Bid confirmation dialog: Base Charge $2,400.00 / Additional Charges $990.86 / Grand Total $3,390.86 | Submit bid — confirm |
| `15-decline-confirm.png` | Decline confirmation dialog (carrier AACT) | Decline — confirm |
| `16-declined-state.png` | After Confirm Decline: "Declined" disabled button + "Bid Now" primary | Decline — declined |
| `17-submitted-state.png` | After PYLE's bid: "Last submitted: $3,390.86 by A. DUIE PYLE · 08/21/2026 17:16" note + "Update Bid" button | Submit bid — submitted |
| `18-window-closed.png` | Closed page after planner Force Close: "This bidding window has closed." | Window closed |

## Notes

- 09 and 17 reflect a real submitted bid (carrier PYLE / A. DUIE PYLE, $3,390.86), not a simulated one — it landed well within the ~20s window.
- 15/16 use a second carrier (AACT / AAA Cooper Transportation) so the decline flow didn't collide with PYLE's submitted-bid state.
- 18 was produced via planner-side Force Close (not natural expiry or an invalid token), per the task's fallback instruction.
