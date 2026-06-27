import figma from '@figma/code-connect'
import MatchRow from './MatchRow'

// Master: Components-Molecules page, `MatchRow` set at 3548:6994 (now a State=True|False
// set; connect to the set, not a variant child). TEXT properties (Match ID / Route /
// Customer / Carrier / BOL) map to props; the avatar `Icon` is a switchable INSTANCE_SWAP
// slot. The source pill is a nested `Badge` instance — its variant/label aren't
// MatchRow-level properties, so the `source` prop is supplied via the example default.
figma.connect(
  MatchRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3548-6994',
  {
    imports: ["import { MatchRow } from '@odyssey/ui'"],
    props: {
      matchId: figma.string('Match ID'),
      route: figma.string('Route'),
      customer: figma.string('Customer'),
      carrier: figma.string('Carrier'),
      bol: figma.string('BOL'),
      icon: figma.instance('Icon'),
    },
    example: ({ matchId, route, customer, carrier, bol, icon }) => (
      <MatchRow
        matchId={matchId}
        route={route}
        customer={customer}
        carrier={carrier}
        bol={bol}
        icon={icon}
        source={{ label: 'FourKites, Inc.', variant: 'blue' }}
      />
    ),
  },
)
