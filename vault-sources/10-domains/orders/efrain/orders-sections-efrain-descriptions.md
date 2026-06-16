0-Summary Page:
Screen where it shows the full list of created orders. Efra didn't made a writing about this, lets have this one pending


1-General Information Section:
Create Manual Order >
General Information - Quick Creation
& Create Manual Order >
General Information - Long Creation
Based on the provided sources, the General Information section is the primary area used for manual order creation in the TMS UI. By default, it displays as a "Quick Order" view showing only the most essential fields required to start an order. Users can click an "Add More Details" option to expand the form into a "Long Order" view, which reveals three additional collapsible subsections: Additional Information, Add Instructions, and References.
Here is the breakdown of the entire General Information section, its subsections, and the mandatory versus non-mandatory fields for each:
1. Main General Information Section (Quick Order View)
This main section captures the core logistical details of the order.
Mandatory Fields:
Owning Organization: A searchable dropdown list to select the customer/shipper.
Ship Direction: A dropdown menu that defaults to 'Outbound'.
Freight Term: A dropdown menu. It automatically defaults to 'Pre-Paid' if 'Outbound' is selected, or 'COL' (Collect) if 'Inbound' is selected. Note: The Freight Term field defaults dynamically based on the selection made in the Ship Direction field:
If the Ship Direction is set to 'Outbound' (which is the default selection), the Freight Term will automatically default to 'Pre-Paid'.
If the Ship Direction is set to 'Inbound', the Freight Term will automatically default to 'COL' (Collect)
Equipment: A searchable dropdown list of equipment types, populated based on the selected Owning Organization.
Non-Mandatory (Optional) Fields:
Consolidatable: A checkbox (checked by default) to indicate if the order can be consolidated.
Order Number: A free-text field for the client's order identifier. If left blank, the system will automatically generate an Order ID upon submission.
2. Additional Information Sub-Section
This subsection captures specific customer requests and contact details for the person creating the order. All fields in this subsection are non-mandatory (optional).
Non-Mandatory Fields:
Customer Required Carrier: A dropdown to select a preferred carrier by SCAC ID/description. Users can also manually type a carrier if it isn't in the list.
Equipment Reference Number: A free-text field used to capture specific, dedicated container or tank IDs.
3. Add Instructions Sub-Section
This subsection allows users to pass along specific loading, unloading, or handling instructions for the carriers. All fields in this subsection are non-mandatory (optional).
Non-Mandatory Fields:
Instruction Description: A free-text box where users can enter up to 2,000 characters per instruction line. Users can click "Add New Instruction" to add multiple separate instruction lines.
(Note: The business team decided to remove the "Instruction Type" dropdown from the UI to avoid confusion. The system will now simply capture the text and default the backend instruction type code to '0012').
4. References Sub-Section
This subsection is used to capture various customer-provided reference numbers, such as Purchase Order (PO) numbers or Pickup numbers. All fields in this subsection are non-mandatory (optional).
Non-Mandatory Fields:
Based on final design feedback from the business team, this section was simplified from multiple specific date/time fields into just two open text columns: Reference Type and Reference Number.
Users can type the type of reference (e.g., "PO Number" or "Pickup Number") in the Reference Type column, and enter the corresponding value in the Reference Number column.
Users can dynamically add new rows for multiple references or delete them using a trash can icon.


2-Pickup and Delivery Section:
Create Manual Order >
Pickup and Delivery - Quick Creation
& Create Manual Order >
Pickup and Delivery - Long Creation
The Pickup and Delivery section is a crucial part of the manual order entry process designed to capture the origin (Consignor) and destination (Consignee) details, including locations, contact information, and planned dates and times.
This section is divided into two primary sub-sections: Consignor (handling the pickup) and Consignee (handling the delivery). The structure and fields for both sub-sections mirror each other perfectly.
Here is the breakdown of the subsections and their mandatory versus non-mandatory fields:
1. Location and Address Sub-section
Users can search for a Location ID, which will automatically populate the corresponding address fields from master data, or they can enter a new location manually from scratch.
Mandatory Fields:
Location ID (required for quick orders). 
ID / Org Name.
Long Name.
Address Line 1.
City.
State / Region.
Postal Code.
Country. (Note: Consignor and Consignee addresses cannot be identical; if they are, the system will flag an error).
Non-Mandatory Fields:
Address Line 2.
2. Contact Information Sub-section
By clicking "Add Contact Information," users can manually input the details of the specific person to contact at the pickup or delivery site.
All fields in this sub-section are Non-Mandatory:
Contact Name: Free-form text box for the person's name.
Contact Number: The phone number, formatted to standard international (E.164) formats.
E-Mail Address: An email address for the contact, which undergoes basic validation for the "@" and "." symbols.
3. Planning Date and Time Sub-section
This sub-section captures the scheduling windows for the order. Users must first select a radio button to determine the planning date type: either Ship Date & Time or Delivery Date & Time. The mandatory requirements dynamically shift based on this selection.
Conditional Mandatory Fields:
If Ship Date & Time is selected: Only the Late (Latest) Pickup Date and Time becomes strictly mandatory.
If Delivery Date & Time is selected: Only the Late (Latest) Delivery Date and Time becomes strictly mandatory.
Time Zone: The time zone is generally auto-populated based on the selected city, state, or postal code. However, if the system cannot extract it from the address, Time Zone becomes a mandatory dropdown field that the user must manually select.
Non-Mandatory Fields:
Early Pickup Date and Time.
Early Delivery Date and Time.
(Note: The system enforces chronological logic on these dates; for example, the Early Pickup Date must be on or before the Late Pickup Date, and the Pickup Date must be before the Delivery Date
What are the specific address validation rules for locations?:
Based on the sources, the specific address validation rules for locations include:
Geographic Combination: The system validates the combination of geographic fields, specifically the City, State (or Region), Postal Code, and Country. If any part of this combination is incorrect or passed as an invalid value, the system will reject it and throw an error message stating that the ship or ship-to address is not valid.
Master Data Matching: For integrated orders, the Shipping Site Identifier and Ship To Identifier cannot be left blank and must strictly match the Site IDs established in the system's Master Data.
Unique Pickup and Delivery: The Consignor (Pickup) and Consignee (Delivery) addresses and location IDs cannot be identical. If a user attempts to enter the exact same address for both, the system will flag an error message asking the user to check the addresses being displayed.
How does the system handle past or current dates?
The system handles past or current dates differently depending on the context of the date being entered:
Scheduling Dates (Pickup and Delivery) For logistical planning fields such as Early/Late Pickup Date & Time and Early/Late Delivery Date & Time, users are able to manually enter or use the calendar component to select past, current, or future dates.
However, because scheduling a shipment in the past is often an error, the system will dynamically flag this. If a user selects a past or current date for any of these pickup or delivery fields, the system will display the warning message: "Past or current date selected. Please check and modify as needed". To ensure accuracy, the system evaluates the date and time in combination to determine whether the selection is truly in the past or current


3-Save, Save for Later & Discard - Made around a modal:
Create Manual Order >
Discard order - Save for Later
Based on the business rules for both quick and long order creation, here is how the "Save", "Save for Later", and "Discard" actions function:
Save: Clicking the "Save" button saves the progress of the current order without closing the user interface (UI) and without actually submitting the order. Orders saved this way are kept in a "Draft" status.
Save for Later: This option is accessed by clicking the "Cancel" button. It is used when a user wants to pause and continue the manual order creation process at a future time. Clicking "Save for Later" saves the order's progress and closes the UI, placing the order in a "Draft" status. The user can access it later from the orders summary/overview page.
Discard: This option is also accessed by clicking the "Cancel" button. It completely terminates the manual order creation process without saving any progress. Before discarding, the system will display a confirmation screen asking the user to explicitly confirm the action. Once discarded, the order is not saved and cannot be retrieved.
Important Condition for Saving: In order to use either the Save or Save for Later actions, two specific fields must be filled out: the Order Number and the Owning Organization. If either of these fields is left blank, the order cannot be saved, and the system will display a red error message prompting the user to ensure both values are provided


4-Product Information - Under Construction🚧(we will halt this one)


5-Special Services Section
Create Manual Order >
Special Services (Optional) - Quick and Long Creation
The Special Services section is an entirely optional part of the order creation process. It allows users to add specific service requirements or charge codes to the order (such as requesting a lift gate or a pallet jack) that are pulled directly from the legacy TMS master data. Because the entire section is optional, there are no strictly mandatory fields that the user must fill out to successfully complete the order.
1. Manage Special Services Sub-Section (Optional)
Functionality: The search bar opens a dropdown containing a tabular list of all available special services/charge codes sorted by frequency of use. Users can use a search bar to filter the list by either the Service Category (code) or the Description. Users simply click to the desired service to add it to their order.
2. Consolidated Data Table / Selected Services
Description: Once a user selects a special service from either the Quick Selection chips or the Manage Special Services table, it dynamically populates into a consolidated list for the order.
Fields: The table automatically displays the Service Category (TMS Charge Code) and the corresponding Description (TMS Charge Code Description). The system auto-populates the exact description based on the selected code from master data, so no manual typing is required.
Actions: Users can remove any accidentally added service by simply clicking on trash can icon next to the service in the table.
In summary, all interactions within the Special Services section are completely non-mandatory, and the data entry is entirely driven by selecting pre-configured master data options rather than manually filling out text fields.


6-Confirmation Page
Create Manual Order >
Confirmation Page - Quick Creation - Success Message
& Create Manual Order >
Confirmation Page - Long Creation - Success Message
The Quick Order Confirmation Page and Long Order Confirmation Page are the final summary screens presented to a user immediately after they successfully submit a manual order in the UI.
While both pages serve the identical purpose of confirming that the order was successfully created and displaying the final Order Number (whether it was manually provided or system-generated), they differ in the amount of detail they display based on how the order was created:
Quick Order Confirmation Page This page is displayed when a user completes and submits a "Quick Order." It provides a streamlined summary that focuses specifically on the mandatory fields the user entered across the core order sections. The summary will display the data captured in the:
General Information section (e.g., Owning Organization, Freight Term, Ship Direction, Equipment).
Pickup and Delivery section.
Product Information.
Special Services.
Long Order Confirmation Page This page is displayed when a user expands the form to complete a "Long Order." In addition to all the mandatory fields shown on the quick confirmation page, the Long Order Confirmation Page also displays all the additional optional fields that the user chose to enter. This includes the expanded data captured in the:
General Information sub-sections, such as Additional Information (Contact details, Customer Required Carrier, etc.), Add Instructions, and References (PO Numbers, Pickup Numbers, etc.).
Expanded Pickup and Delivery details.
Expanded Product Information details.
Expanded Special Services (Manage Special Services).
In short, the confirmation page dynamically matches the complexity of the order entry process: the Quick version gives a brief overview of the required essentials, while the Long version provides a comprehensive summary of all optional data added to the order


7-Create Manual Order >
Confirmation Page - Info Message, "Your Order was saved. You will receive a notification when the Order number have been created"
This message covers the asynchronous case for when user doesn't receive the confirmation when order gets created, this is due to processes in the backend with the order creation that depends to external confirmation
