import figma from '@figma/code-connect'
import HeaderStrip from './HeaderStrip'

// Master: `HeaderStrip` 5530:1140 (Components-Molecules) — extracted 2026-08-28
// from GroupTable's `header` prop (see GroupTable.figma.tsx) so any surface
// composing the same 48px band can connect directly. `Title` TEXT → `title`.
// `Show icon` BOOLEAN + `Icon` INSTANCE_SWAP → `icon`: no ternary (parser
// trap, S130) — a boolean value mapping to either the swapped instance or
// `undefined`, same idiom GroupTable already uses for `footerRow`.
// `Show badge` BOOLEAN + `Badge` INSTANCE_SWAP → `badge`: same pair as
// `Show icon` + `Icon`. The swap's preferredValues point at the whole Badge
// set, so the chosen VARIANT (green, red, amber, …) comes through the swapped
// instance — the code prop takes any node, so nothing here pins a colour.
// `Show trail` BOOLEAN → `trail`: the master has no INSTANCE_SWAP for the
// trailing slot, so there is nothing to swap in — mapped to a sample node
// (true) / `undefined` (false), same boolean-value-mapping shape.
//
// `titleId` and `className` are CODE-ONLY: `titleId` lets an ancestor (e.g.
// GroupTable) put `aria-labelledby` on the title text node itself, and
// `className` is a layout escape hatch for the composing consumer — neither
// has a Figma counterpart, so neither is mapped here.
figma.connect(
  HeaderStrip,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=5530-1140',
  {
    imports: ["import { HeaderStrip } from '@odyssey/ui'"],
    props: {
      title: figma.string('Title'),
      icon: figma.boolean('Show icon', {
        true: figma.instance('Icon'),
        false: undefined,
      }),
      badge: figma.boolean('Show badge', {
        true: figma.instance('Badge'),
        false: undefined,
      }),
      trail: figma.boolean('Show trail', {
        true: <span>Trail</span>,
        false: undefined,
      }),
    },
    example: ({ title, icon, badge, trail }) => (
      <HeaderStrip title={title} icon={icon} badge={badge} trail={trail} />
    ),
  },
)
