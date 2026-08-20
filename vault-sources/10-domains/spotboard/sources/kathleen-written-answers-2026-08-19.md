# Kathleen — written answers following the Aug 18 Spot Quote-Overflow call

> Relayed verbatim by Manuela on 2026-08-19. Referenced images: Kathleen1.png, Kathleen3.png, Kathleen5.png (same drop).

Below are some answers to the questions that came up today and also a few extra things I found:

1. **Additional charges for the carrier to enter:** On the call today we questioned if this is driven by the equipment/mode. What I found is that the charges shown in the "additional charges" section is controlled by an OCM profile. Here is an example below: [Kathleen1.png]

2. **Fuel** is precalculated and displayed on the bid for the carrier to view. This is not editable by the carrier.

3. **Select different equipment for quote.** Today the planner can change it, although they rarely do. Here is the screen of how it looks. [Kathleen3.png]

4. Note that TMS has the ability to set up carrier to send/receive quotes via API, but currently **no carriers with a rate API participate in overflow**. Path must still be supported, but is dormant today.

5. **Pickup and Delivery Dates.** Note, **time is not supported on the quote**. Here are the field names in OdysseyOne: [Kathleen5.png]

6. **Flexible pickup and delivery is configurable by CLIENT and by Equipment.** 23 configs for flexible pickup and 23 for flexible delivery are set up today (Not all clients are currently active only 9 active). The OCM setting is configurable by the number of days permitted before the requested pickup and delivery dates. For example, one client allows for 8-day variance.
