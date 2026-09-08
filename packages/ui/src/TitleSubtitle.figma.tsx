import figma from '@figma/code-connect'
import TitleSubtitle from './TitleSubtitle'
import Badge from './Badge'

// Master: TitleSubtitle (3016:2056). TEXT props Title / Subtitle → figma.string. The
// Show Icon BOOLEAN gates the static `copy` glyph → showIcon. (onIconClick is a code-side
// additive that upgrades the glyph to a copy affordance; not represented in Figma.)
// Show Badge BOOLEAN → `badge`. The master's Badge is an EXPOSED nested instance, not an
// INSTANCE_SWAP, so it is not addressable by `figma.instance()` — mapped to a sample Badge
// node (true) / `undefined` (false), the same shape HeaderStrip uses. The variant is read
// off the instance in Figma. Show Text BOOLEAN gates the title, hence `title` mapping
// through it rather than straight from the TEXT prop.
figma.connect(
  TitleSubtitle,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3016-2056',
  {
    imports: ["import { TitleSubtitle, Badge } from '@odyssey/ui'"],
    props: {
      title: figma.string('Title'),
      subtitle: figma.string('Subtitle'),
      showIcon: figma.boolean('Show Icon'),
      badge: figma.boolean('Show Badge', {
        true: <Badge variant="purple">Text</Badge>,
        false: undefined,
      }),
    },
    example: ({ title, subtitle, showIcon, badge }) => (
      <TitleSubtitle title={title} subtitle={subtitle} showIcon={showIcon} badge={badge} />
    ),
  },
)
