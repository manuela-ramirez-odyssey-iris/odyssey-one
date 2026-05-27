# Shipments-Exceptions


---

## Slide 1

Shipment



---

## Slide 2

Shipment Planning View

| Buy Shipment | Customer ID(s) | Order # | Order Count | Pickup Date | Delivery Date | Origin | Destination | Gross Weight | Mode | Equipment | SCAC / Tender Status | AP Freight Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B28826319 | ERCO_SYS_01 , USALCO | S2600074M , JAN7ERCO7 | 2 | 01/12/2026 09:00 CST | 01/29/2026 09:00 CST | Houston, TX, US, 77001 | Galena Park, TX, US, 77547 | 6000 LB | TL | 53FTDryVan | SEFL – Done | 1080 USD |
| B28826319 | ERCO_SYS_01 , USALCO | S2600074M | 1 | 01/12/2026 09:00 CST | 01/29/2026 09:00 CST | Houston, TX, US, 77001 | Galena Park, TX, US, 77547 | 6000 LB | TL | 53FTDryVan | SEFL - Done | 2000 USD |

1

2

3

4

5

Order   V

Product

Documents

Stops and Appointment

Instructions

Cost Allocation

Tender History

History

Notes

6

| S2600074M |
| --- |
| JAN7ERCO7 |

Routing Options

Actions   v

| Buy Shipment |
| --- |
| Edit |


Date Issues                                   5
Routing Review                           7
Tender Issues                              7
Tender Review                            5
Bid Review                                    2



Shipment Exceptions

All (Exceptions)  

Date Issues

Tender Issues

Routing Review

Tender Review

Tendering
Accepted
SpotBid

Monitoring

Review
Optimization
Hold

PGI/PGR

Bid Review



---

## Slide 3

Table Attributes

| Attributes | Example | Description |
| --- | --- | --- |
| Buy Shipment # | 28826319 | - |
| Sell Shipment # | 25678981 | - |
| Customer ID | *G20TECH_SYS_01, 2nd customer ID | Cross customer, Customer ID separate by Coma |
| Order # | JAN6ERCO6, JAN7ERCO7 | Transportation Order # |
| Pickup Date | 01/12/2026 09:00 CST | Planned Pickup Date |
| Delivery Date | 01/29/2026 09:00 CST | Planned Delivery Date |
| Origin | Bastrop, LA, US, 71202 | First pickup (City, State, Country code, Zip) |
| Destination | GEISMAR, TX, US,  79762 | Last drop off (City, State, Country code, Zip) |
| Gross Weight | 6000 LB | - |
| Mode | LTL | - |
| Equipment Code | LTH | - |
| Pickup # | 41197 | - |
| SCAC - Tender Status | CTNS - Done | SCAC and Tender status are together |
| AP Freight cost | 1080 USD | Total AP freight cost |
| Hazadous (Y/N) | Y | Hazrdous indicator |
| Pro#/Booking # | 345678 | - |
| Customer Name | *USALCO_SYS_01 | - |
| Consignor | G2O TECHNOLOGIES LLC | Name of the Consignor (First Pickup) |
| Consignee | MC ATHLON GEISMAR PL | Name of the Consignee (Last Drop Off) |
| Pkg Count | 2 PLT | Total package count with units |
| Equipment # | 8043 | - |
| Net Weight | 3500 LB | - |
| Tare Weight | 2500 LB | - |

| Attributes | Example | Description |
| --- | --- | --- |
| Earliest Pickup Date | 01/12/2026 09:00 CST | Latest value from orders at the first pickup |
| Latest Pickup Date | 01/12/2026 11:00 CST | Earliest value from orders at the fist pickup |
| Earliest Delivery Date | 01/19/2026 09:00 CST | Latest value from orders at the last drop off |
| Latest Delivery Date | 01/19/2026 14:00 CST | Earliest value from orders at the last drop off |
| Distance | 635 MI | MI - Miles code |
| Stops | 2 | count of stops (Pickup stop(s)+Delivery stop(s) |
| Ship Direction | Outbound | Direction of shipment |
| Freight Terms | Pre-Paid | - |
| Seal Number | S345676 | - |
| Incoterm Info | FOB | - |
| Shipment Status | Tender | Can be in any status (shipment). New, Hold, Review, Tender, etc |
| Validation message | CHK_Dates | Message will appear for User Review Status (CHK_Dates, Date in the past, etc) |
| AR Freight Cost | 1280 USD | Total AR freight cost |
| Shipment Type | Pooling, Cross customer, Line haul, Rule 11 |  |
| Shipment Sequence leg | 1 or 2 or 3 | In multi leg buy shipments, which leg this shipment belongs to |
| Next Shipment ID | ID of the next shipment | Applicable for pooling, Rule 11 |
| Preferred AP Direct Cost | 1000 USD | Direct AP cost |
| Preferred AR Direct Cost | 1200 USD | Direct AR cost |
| Load Status | In Shipment | Can be in any status (shipment). New, In shipment etc |
| Load # | 23567, 45673 | Shows load numbers in the shipment |
| Load Count | 2 | Count of loads in a shipment |



---

## Slide 4

Options:
Export Excel CSV (Current Fields)
Export Excel CSV (All Fields)

Note to the users: “Only the first 10,000 records will be exported to Excel.”



---

## Slide 5

| Tabs for Shipment |
| --- |
| Order |
| Product |
| Instruction |
| Stops and Appointments |
| Attachment |
| Cost Allocation |
| Load Details |
| Prior Tender |
| History |
| Notes |

Configuration tab for the bottom screen



---

## Slide 6

Distance: 1,013 mi
Gross weight: 420 LB
Volume: 328.0 cuft
Accepted Carrier: FXFE – LTL
Seed Equipment – TL
Utilization: 75%

Stop 1: Pickup
Order: LOAD200801
From: 01-BP, COLUMBUS, GA 31907 US (Org Name, City, State, Zip, Country) or 
From: 01-BP, 1502 NORTH WASHINGTON, COLUMBUS, GA 31907 US (Org Name, Address 1,2,3 City, State, Zip, Country)
Date: August 20, 2025 14:00 CST
Appointment: 14:00 CST
Weight: 105 LB
Volume: 82 cuft
Package Count: 3 
Pickup No:

Stop 2: Pickup
Order: LOAD200802, LOAD200803
From: 02-BP, COLUMBUS, GA 31906 US
Date: August 20, 2025 14:00 CST
Appointment: 14:00 CST
Weight: 105 LB
Volume: 82 cuft
Pickup No:

Stop 3: Delivery
Order: LOAD200801, LOAD200802, LOAD200803
To: SHPTULSA, NEENAH, WI 54956 US
Date: August 22, 2025 14:00 CST
Appointment: 14:00 CST
Weight: 105 LB
Volume: 82 cuft
Pickup No


  

Date available if planning is RDD

Order requested date: August    22, 2025
14:00 CST

Date available if planning is RSD

Order requested date: August    20, 2025
14:00 CST

Distance: 1,013 mi
Gross weight: 420 LB
Volume: 328.0 cuft
Accepted Carrier: FXFE – LTL
Seed Equipment – TL
Utilization: 75%

Stop 1: Pickup
Order: LOAD200801
From: 01-BP, COLUMBUS, GA 31907 US (Org Name, City, State, Zip, Country) or 
From: 01-BP, 1502 NORTH WASHINGTON, COLUMBUS, GA 31907 US (Org Name, Address 1,2,3 City, State, Zip, Country)
Date: August 20, 2025 14:00 CST
Appointment: 14:00 CST
Weight: 105 LB
Volume: 82 cuft
Package Count: 3 
Pickup No:

Stop 2: Pickup
Order: LOAD200802, LOAD200803
From: 02-BP, COLUMBUS, GA 31906 US
Date: August 20, 2025 14:00 CST
Appointment: 14:00 CST
Weight: 105 LB
Volume: 82 cuft
Pickup No:



  

Alternate    


Format

  






Stop 1: Delivery
Order: LOAD200801, LOAD200802, LOAD200803
To: SHPTULSA, NEENAH, WI 54956 US
Date: August 22, 2025 14:00 CST 
Appointment: 14:00 CST
Weight: 105 LB
Volume: 82 cuft
Pickup No


  

STOPS



---

## Slide 7

PRODUCT

| Attributes | Example | Description |
| --- | --- | --- |
| Order # | 28826319 |  |
| Line # | 001 |  |
| Ship Item | 3204HTO |  |
| Description | 3204HTO | Shit item Description |
| Package Count | 45 Boxes | Package count + Identifier |
| Gross Weight | 50000 LB | Gross weight + UoM |
| Volume | 50 cuft | Volume + UoM |
| Hazmat | Yes | Yes/No |
| Hazmat Class | Class 2 |  |
| Hazmat Group | I-Great Danger | Hazmat Packaging group (I,II,III – great Danger, Medium Danger, Minor Danger, N/A) |
| Hazmat Description | CORROSIVE LIQUID, ACIDIC | Description of Hazmat UN Number |
| Product Class | Commodity | Can be Commodity, Harmonized, NMFC, Product Class |
| Shipping Class | 230008 | Commodity -> Rail commodity code, harmonized code, NMFC or product class (55) |
| Hazmat UN Number | UN3264 |  |
| Flash Point | 120 F | Value + UoM |
| Boiling Point | 80 F | Value + UoM |
| Marine Pollutant | No |  |
| WGK Class | 1 | 1,2,3, |
| Declared value | 100,000 USD | Amount and Currency |
| Hazmat ID | UN3264 | Hazmat ID and UN Number same? TBD |

| Attributes | Example | Description |
| --- | --- | --- |
| Tare Weight | 30,000 LB |  |
| Net Weight | 20,000 LB |  |
| Third part Ref # | S2367 | For outbound shipments, the client’s reference number.  For inbound shipments, the vendor’s sales order number |
| Third Part Line # | 003 | Line number of above reference number |
| Third Part Ref date | 1/4/2026 | Date of above reference |
| BatchLot # | S3456 |  |
| Tunnel Code | A | A -> E |
| To Partner Reference |  | Required? TBD |
| Load Constraints | No | Yes/No Value |
| Country of Origin | USA | Country |
| Length | 3 FT | length and UoM |
| Width | 4 FT | Width and UoM |
| Height | 4 FT | Height and UoM |

Marked in Green are to be available under column 

Requirement
Product info to be organized as shown
Each + is representation of order lines. If an order has 2 lines, then clicking on + will show 2 lines
Order’s 1st line is always visible to the user 



---

## Slide 8

Routing Options

| Attributes | Notify DateExample | Description |
| --- | --- | --- |
| Route Rank | 4 |  |
| Rank | 1 |  |
| SCAC | SEFL |  |
| Carrier Name | SOUTHEASTERN FRT | Shit item Description |
| Cost | 107.35 USD | Package count + Identifier |
| Tender Status | Accepted | Gross weight + UoM |
| Pickup / Date Time | 08/20/2025 14:00 | Volume + UoM |
| Pickup / Day | Wed |  |
| Pick up / Org Hours | 07:00-15:30 | Yes/No |
| Pick up / Time Zone | CST |  |
| Delivery / Date Time | 08/22/2025 14:00 | Volume + UoM |
| Delivery / Day | FRI |  |
| Delivery / Org Hours | 00:00-23:59 * | Yes/No |
| Deivery / Time Zone | CST |  |
| Transit | 2 Days |  |
| Distance Travelled | 438 MI |  |
| Pro # | 45678 |  |
| Equip # |  |  |
| Route Group |  |  |
| Notify by | API | API / Email / Manual / EDI / Fax / Email and EDI / API |
| Notify Date time | 08/20/2025 09:59 |  |
| Response Method | API Update | API Update/Automatic Update/EDI Update/interlink Update/Manual Update/net-native Update |
| Response Date Time | 08/20/2025 09:59 |  |
| Response User | LINXQA |  |
| Carrier Pickup # | SAA9999 |  |
| Distance Source | PCMPCL |  |
| Description | PC*Miler Practical |  |

| Attributes | Example | Description |
| --- | --- | --- |
| Transit Time Source | SMC |  |



---

## Slide 9

Routing Options Continued

Requirement
Example of the current TMS system is shown above. 
Each line is an option
In the mock, will need atleast 3 lines
Manage Grid view required in tabs where there are quite a number of attributes



---

## Slide 10

Cost Allocation

Requirements
Will need ‘Direct Shipment cost’ only
If there are 2  Loads in a shipment, then Direct shipment cost should be available for each of the Load 

Don’t Need Sell Shipment cost



---

## Slide 11

Instruction

Requirements
Each order instruction should be displayed
If the Order has multiple instruction, each instruction should be displayed in sequence

| Instruction |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Drivers are required to wear face coverings and follow social distancing guidelines. They may also be subject to temperature checks upon arrival. |  |  |  |  |  |  |  |  |  |  |  |
| DRIVER: Purchasing Contact: Mary Ellen Maynard Main Office Phone; 205-328-0808 Receiving Hours: Monday - Friday 7:30-3:30 |  |  |  |  |  |  |  |  |  |  |  |
| SHIPPING INSTRUCTIONS: Please ship via AAA Cooper using our account # 000821525. If product is being shipped out of theSouth Eastern United States. |  |  |  |  |  |  |  |  |  |  |  |
| Drivers are required to wear face coverings and follow social distancing guidelines. They may also be subject to temperature checks upon arrival. |  |  |  |  |  |  |  |  |  |  |  |
| DRIVER: Purchasing Contact: Mary Ellen Maynard Main Office Phone; 205-328-0808 Receiving Hours: Monday - Friday 7:30-3:30 |  |  |  |  |  |  |  |  |  |  |  |



---

## Slide 12

Documents

Requirements
Should have options to upload Doc (BoL, MBoL, Invoice, Instructions, Others)
Attach document and should support PDF, Excel, Word, Csv, Outlook message format
Once attached, each attachment should be a line with 
Type | Description | File with link
4. On clicking the file, user should be able to open attachment on a new window
5. Should have an option to delete the attachment via UI



---

## Slide 13

Internal Notes

Requirements
User should be able to add internal notes
For now tagging of name not required (like @)
Who ever writing the note, their ID, Date/Time and message should be captured and displayed on the screen
Option to Add Note, edit and Delete not should be available (for that user)


