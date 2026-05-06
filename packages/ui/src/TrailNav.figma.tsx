import figma from '@figma/code-connect'
import TrailNav from './TrailNav'

figma.connect(
  TrailNav,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1565-648',
  {
    imports: ["import { TrailNav } from '@odyssey/ui'"],
    variant: { Mode: 'Profile' },
    props: {
      name: figma.string('Name'),
      role: figma.string('Role'),
      showNotification: figma.boolean('Show notification'),
      chevron: figma.instance('Chevron'),
    },
    example: ({ name, role, showNotification, chevron }) => (
      <TrailNav
        mode="profile"
        name={name}
        role={role}
        showNotification={showNotification}
        chevron={chevron}
        avatar={<img src="/avatar.png" alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />}
        notificationCount={6}
      />
    ),
  },
)

figma.connect(
  TrailNav,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1565-648',
  {
    imports: ["import { TrailNav } from '@odyssey/ui'"],
    variant: { Mode: 'Editor' },
    props: {
      showPrimaryButton: figma.boolean('Show button 1'),
      showSecondaryButton: figma.boolean('Show button 2'),
      showHelpIcon: figma.boolean('Show help icon'),
      showRightIcon: figma.boolean('Show close icon'),
      rightIcon: figma.instance('Right icon'),
    },
    example: ({ showPrimaryButton, showSecondaryButton, showHelpIcon, showRightIcon, rightIcon }) => (
      <TrailNav
        mode="editor"
        showPrimaryButton={showPrimaryButton}
        showSecondaryButton={showSecondaryButton}
        showHelpIcon={showHelpIcon}
        showRightIcon={showRightIcon}
        rightIcon={rightIcon}
      />
    ),
  },
)
