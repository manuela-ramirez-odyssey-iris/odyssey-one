import figma from '@figma/code-connect'
import SubAccordion from './SubAccordion'

// Master: `SubAccordion` set 4083:5044 (Components-Molecules). The simplified
// Accordion — collapsible card, no stepper. `State` VARIANT {Collapsed,
// Expanded, Static} → `expanded`/`collapsible` booleans (Static = the
// non-collapsible flavor: no chevron, content always revealed); `Title` TEXT →
// title; `Show Icon` BOOLEAN → showIcon; `Icon` INSTANCE_SWAP → icon
// (placeholder-20 in Figma; code defaults to lucide/info when omitted);
// `Content` SLOT → children. The chevron is always present on the collapsible
// states; the expand/collapse animation is code-only.
figma.connect(
  SubAccordion,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4083-5044',
  {
    imports: ["import { SubAccordion } from '@odyssey/ui'"],
    props: {
      expanded: figma.enum('State', { Collapsed: false, Expanded: true, Static: true }),
      collapsible: figma.enum('State', { Collapsed: true, Expanded: true, Static: false }),
      title: figma.string('Title'),
      showIcon: figma.boolean('Show Icon'),
      icon: figma.instance('Icon'),
      children: figma.instance('Content'),
    },
    example: ({ expanded, collapsible, title, showIcon, icon, children }) => (
      <SubAccordion title={title} showIcon={showIcon} icon={icon} collapsible={collapsible} defaultExpanded={expanded}>
        {children}
      </SubAccordion>
    ),
  },
)
