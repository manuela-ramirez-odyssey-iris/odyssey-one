---
domain: shipments
type: design-intent
tags: [shipments, redesign, design-system, widget-mini, shipments-bar, tabs]
date: 2026-07-04
status: in-progress
---

# Shipments Page Redesign — July 2026 (Efrain)

Source: two full-page mocks dropped in the inbox 2026-07-04 (archived at
`vault-sources/10-domains/shipments/2026-07-04-shipments-redesign/`) + Figma
nodes in Design System - MCP (4095:3057, 4094:3005/3023, 4094:3602, 4094:3608).

## The restructure

The Shipments list page header moves from **panel-cards + underline category
tabs** to a two-level model:

1. **Panel tabs** — the three panels (Shipment Exceptions / Monitoring /
   PGI-PGR) become underline `Tab`s with count badges (counts = panel totals),
   replacing the MonitorPanels opacity-dimmed cards.
2. **Category row** — the active panel's categories ("All" + Date Issues,
   Routing Review, …) render in one of two user-switchable modes via a
   `ButtonToggle` ("Pill tabs mode" / "Widget mode"):
   - **Pill mode**: `PillTab` row (default in the mocks).
   - **Widget mode**: a row of **`WidgetMini`** metric cards — count + label +
     a slim donut showing the category's share; selected card = dark border.

The old "Collapse metrics" divider behavior disappears (the rows are slim).

3. **Bottom detail bar** — the expandable BottomBar keeps its mechanics but its
   shell becomes the normalized **`ShipmentsBar`** organism: 48px strip with a
   current-shipment segment (prev/next arrows + ID — arrows are NEW behavior),
   the 10 detail tabs as content slots, and the control cluster. Tab order per
   Figma: Orders · Product · Stops · Tender · Cost Allocation · Instructions ·
   Documents · Notes · History · Tender History.

## Categories are exception-oriented

The mocks confirm the category taxonomy stays the PANEL_CONFIG one (Date
Issues, Routing Review, Tender Issues, Tender Review, Bid Review — not
lifecycle Active/Done/Review).

## Open questions (for Efrain / user)

- **Donut percentage semantics** — the mocks show a uniform placeholder 24%.
  Implemented as *category share of the panel total* (All = 100%); confirm.
- **Mock inconsistencies**: Date Issues 376 (pill mode) vs 3 (widget mode);
  the mode toggle renders "Pill tabs mode" selected in both mocks.
- **ShipmentsBar gaps in Figma**: no expansion axis, no control cluster, no
  Order-dropdown segment (all visible in the page mocks, absent from the
  component node); the value text 24/24 pairing (1.0 leading) on WidgetMini.
- "Last Days: 30 Days (Selected Filter by default)" helper text appears next
  to the page title in the mocks — not implemented (no component spec).
