import figma from '@figma/code-connect'
import ShipmentsBar from './ShipmentsBar'

// Master: `ShipmentsBar` set 4120:4623 (Components-Organisms, "Shipments Bar"
// section) — `State = Collapsed | Expanded` (open/close): Collapsed = the 48px
// strip with CollapseExpand showing chevrons-up; Expanded adds the native
// `Content` SLOT (chevrons-down). Strip = CurrentShipment + `ShipmentsBarTab`
// set 4105:1770 instances + PanelActions (Button Icon/sm ×2). Each tab is a
// content slot — the consumer renders the active pane as children while
// expanded. Replaces the old BottomBar chrome (no close / scroll chevrons /
// fullscreen).
figma.connect(
  ShipmentsBar,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4120-4623',
  {
    imports: ["import { ShipmentsBar } from '@odyssey/ui'"],
    props: {
      shipmentId: figma.string('Shipment ID'),
      expanded: figma.enum('State', { Collapsed: false, Expanded: true }),
      children: figma.instance('Content'),
    },
    example: ({ shipmentId, expanded, children }) => (
      <ShipmentsBar
        shipmentId={shipmentId}
        tabs={[{ key: 'orders', label: 'Orders' }, { key: 'product', label: 'Product' }]}
        activeTab="orders"
        onTabChange={() => {}}
        expanded={expanded}
        onExpandedChange={() => {}}
        onTabArrangement={() => {}}
      >
        {children}
      </ShipmentsBar>
    ),
  },
)
