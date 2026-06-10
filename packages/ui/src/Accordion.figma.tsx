import figma from '@figma/code-connect'
import Accordion from './Accordion'

// Master: `Accordion` set 2850:612 (Components-Molecules). Composes StepIndicator.
// `Position` × `Status` VARIANTs → `position` / `status`; `State` VARIANT
// {Collapsed, Expanded} → `expanded` boolean. `Title` / `Description` TEXT →
// props; `Content` SLOT → children. Expand/collapse animation + the traveling
// stepper line are code-only (transitions never modeled in Figma).
figma.connect(
  Accordion,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2850-612',
  {
    imports: ["import { Accordion } from '@odyssey/ui'"],
    props: {
      position: figma.enum('Position', { Start: 'start', Mid: 'mid', End: 'end' }),
      status: figma.enum('Status', { Off: 'off', On: 'on' }),
      expanded: figma.enum('State', { Collapsed: false, Expanded: true }),
      title: figma.textContent('Title'),
      description: figma.textContent('Description'),
      children: figma.instance('Content'),
    },
    example: ({ position, status, expanded, title, description, children }) => (
      <Accordion
        position={position}
        status={status}
        defaultExpanded={expanded}
        title={title}
        description={description}
      >
        {children}
      </Accordion>
    ),
  },
)
