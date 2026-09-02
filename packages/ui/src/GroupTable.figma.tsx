import figma from '@figma/code-connect'
import GroupTable from './GroupTable'

// Master: `GroupTable` 4183:773 (Components-Molecules) — the READ-ONLY
// presentational grouped table for ShipmentsBar detail panes (Product, Cost
// Allocation Compare AP/AR). Composes the `GroupTableGroup` set 4204:1243
// (State=Expanded|Collapsed — the collapse lives on the GROUP, not the table)
// and the `GroupHeaderRow` atom set 4182:787; the mapping targets the MAIN
// master. `Show Totals` BOOLEAN → the `footerRow` prop (TotalsRow 4205:1216 —
// pass an object keyed by col.key to show it, omit to hide). Columns/groups
// are data-driven in code, so the example is static sample data; expansion is
// `expanded`+`onToggle` (controlled) or `defaultExpanded` (uncontrolled).
//
// `Show Actions` BOOLEAN → `stickyActions` (the pinned 68px trailing column);
// `Header Action` INSTANCE_SWAP → `actionsHeader`. NOTE a deliberate 1:many
// mismatch: Figma needs `Show Actions` toggled on this master AND on each nested
// GroupTableGroup instance (Figma cannot propagate a boolean into nested
// instances), whereas code has ONE `stickyActions` prop driving both the header
// cell and every group row.
//
// The nested-table flavor lives on the GroupTableGroup set's `Content` axis
// (Rows | Nested table, 4204:1243), not on this master — in code it is selected
// by passing `detailColumns`, so there is no boolean here to map.
//
// `Group header` BOOLEAN → the `header` prop (`{ title, icon?, trail? }`). In
// Figma the strip is an INSTANCE of the HeaderStrip master (5530:1140) whose
// `Title`/`Show icon`/`Icon`/`Show trail` are EXPOSED on GroupTable instances
// — a true nested-instance mapping (reading the exposed sub-properties off
// that instance) isn't expressible in this parser-based (`figma.connect`)
// file the way the MCP template API (`getInstanceSwap` + `executeTemplate`)
// would allow it. Mapped honestly as a boolean → sample `header` object
// instead; a designer editing the exposed Title/icon/trail on an instance
// will NOT see that reflected in the generated snippet. Flag for a future
// pass if/when this batch migrates to template-based Code Connect.
//
// `Header strip style` BOOLEAN (default false) + `Header standard style`
// BOOLEAN (default true) → the single `headerStyle` prop
// (`'standard' | 'strip'`). These are an inverse-set PAIR the designer sets
// oppositely because Figma has no inverse-binding mechanism; code has ONE
// prop whose default is ALWAYS `'standard'` (`flat` does NOT imply
// `'strip'` — user ruling 2026-08-31, see `resolveHeaderStyle`). Mapped from
// `Header strip style` alone — the meaningful one — via a boolean value
// mapping (no ternary, parser trap S130). `Header standard style` gets no
// mapping of its own: it is the redundant inverse the designer keeps in
// sync by convention, not a second source of truth.
//
// `flat` and `groups[].expandable` have NO Figma property of their own —
// CODE-ONLY / recipe-level, same treatment this file already gives the
// nested-table flavor above. `flat` is expressible in Figma only as a
// per-group variant recipe (`Content=Nested table` + `State=Collapsed` +
// `Show chevron=false` + `Show Actions=false`), not a boolean on this
// master, so no property is invented for it here.
figma.connect(
  GroupTable,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4183-773',
  {
    imports: ["import { GroupTable } from '@odyssey/ui'"],
    props: {
      footerRow: figma.boolean('Show Totals', {
        true: { item: 'TOTAL', qty: '128', weight: '4,820 lb' },
        false: undefined,
      }),
      stickyActions: figma.boolean('Show Actions'),
      actionsHeader: figma.instance('Header Action'),
      header: figma.boolean('Group header', {
        true: { title: 'Header title' },
        false: undefined,
      }),
      headerStyle: figma.boolean('Header strip style', {
        true: 'strip',
        false: 'standard',
      }),
    },
    example: ({ footerRow, stickyActions, actionsHeader, header, headerStyle }) => (
      <GroupTable
        columns={[
          { key: 'item', label: 'Item' },
          { key: 'qty', label: 'Quantity', align: 'right' },
          { key: 'weight', label: 'Weight', align: 'right' },
        ]}
        groups={[
          {
            id: 'ORD-0001',
            label: 'ORD-0001',
            rows: [
              { item: 'Line 1', qty: '64', weight: '2,410 lb' },
              { item: 'Line 2', qty: '64', weight: '2,410 lb' },
            ],
          },
        ]}
        footerRow={footerRow}
        stickyActions={stickyActions}
        actionsHeader={actionsHeader}
        header={header}
        headerStyle={headerStyle}
        defaultExpanded
      />
    ),
  },
)
