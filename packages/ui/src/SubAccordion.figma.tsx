import figma from '@figma/code-connect'
import SubAccordion from './SubAccordion'

// Master: `SubAccordion` set 4083:5044 (Components-Molecules). The simplified
// Accordion — collapsible card, no stepper. `State` VARIANT {Collapsed, Expanded}
// → `expanded` boolean; `Title` TEXT → title; `Show Icon` BOOLEAN → showIcon;
// `Icon` INSTANCE_SWAP → icon (placeholder-20 in Figma; code defaults to
// lucide/info when omitted); `Content` SLOT → children. The chevron is always
// present; the expand/collapse animation is code-only.
figma.connect(
  SubAccordion,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4083-5044',
  {
    imports: ["import { SubAccordion } from '@odyssey/ui'"],
    props: {
      expanded: figma.enum('State', { Collapsed: false, Expanded: true }),
      title: figma.string('Title'),
      showIcon: figma.boolean('Show Icon'),
      icon: figma.instance('Icon'),
      children: figma.instance('Content'),
    },
    example: ({ expanded, title, showIcon, icon, children }) => (
      <SubAccordion title={title} showIcon={showIcon} icon={icon} defaultExpanded={expanded}>
        {children}
      </SubAccordion>
    ),
  },
)
