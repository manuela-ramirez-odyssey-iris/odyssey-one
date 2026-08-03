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
    },
    example: ({ footerRow, stickyActions, actionsHeader }) => (
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
        defaultExpanded
      />
    ),
  },
)
