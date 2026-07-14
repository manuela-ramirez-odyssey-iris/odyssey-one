import figma from '@figma/code-connect'
import MatchSimpleRow from './MatchSimpleRow'

// Master: Components-Molecules page, `MatchSimpleRow` set `3169:2821` (State =
// Default | Hover | Pressed; connect to the set, not a variant child). TEXT
// properties (Match ID / Customer / Address) map to props; the avatar `Icon` is a
// switchable INSTANCE_SWAP slot (placeholder-20).
// New Figma booleans: `Show avatar` → showAvatar, `Show additional info` → showInfo.
figma.connect(
  MatchSimpleRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3169-2821',
  {
    imports: ["import { MatchSimpleRow } from '@odyssey/ui'"],
    props: {
      matchId: figma.string('Match ID'),
      customer: figma.string('Customer'),
      address: figma.string('Address'),
      icon: figma.instance('Icon'),
      showAvatar: figma.boolean('Show avatar'),
      showInfo: figma.boolean('Show additional info'),
    },
    // ponytail: boolean-gated literals (no ternaries — Code Connect parser trips on them)
    example: ({ matchId, customer, address, icon, showAvatar, showInfo }) => (
      <MatchSimpleRow
        matchId={matchId}
        customer={customer}
        address={address}
        icon={icon}
        showAvatar={showAvatar}
        showInfo={showInfo}
      />
    ),
  },
)
