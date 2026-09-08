import figma from '@figma/code-connect'
import HeaderStrip from './HeaderStrip'
import Badge from './Badge'

// Master: `HeaderStrip` 5530:1140 (Components-Molecules) — extracted 2026-08-28
// from GroupTable's `header` prop (see GroupTable.figma.tsx) so any surface
// composing the same 48px band can connect directly. `Title` TEXT → `title`.
// `Show icon` BOOLEAN + `Icon` INSTANCE_SWAP → `icon`: no ternary (parser
// trap, S130) — a boolean value mapping to either the swapped instance or
// `undefined`, same idiom GroupTable already uses for `footerRow`.
// `Show badge` BOOLEAN → `badge`. The master's Badge is an EXPOSED nested
// instance, NOT an INSTANCE_SWAP. A swap was tried twice and is the wrong
// mechanism: its picker lists COMPONENTS (Badge / Spinner / StopBadge), so it
// can never offer Badge's variants, whatever its preferredValues say.
// Exposure is Figma's only way to drive a nested variant from the parent
// panel — it is all-or-nothing, so Shape / Show dot / the icon slots ride
// along beside Variant.
// Exposed nested instances are not addressable by `figma.instance()` (that
// reads INSTANCE_SWAP properties only), so this maps to a sample Badge node
// (true) / `undefined` (false), the same shape `trail` uses. `figma.nestedProps`
// could carry the variant through, but wiring it into the slot needs a ternary
// in `example`, which is the parser trap S130 recorded — so the snippet shows a
// representative Badge and the variant is read off the instance in Figma.
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
    imports: ["import { HeaderStrip, Badge } from '@odyssey/ui'"],
    props: {
      title: figma.string('Title'),
      icon: figma.boolean('Show icon', {
        true: figma.instance('Icon'),
        false: undefined,
      }),
      badge: figma.boolean('Show badge', {
        true: <Badge variant="green">Pickup</Badge>,
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
