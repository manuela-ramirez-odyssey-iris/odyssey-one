import figma from '@figma/code-connect'
import TrailNav from './TrailNav'

figma.connect(
  TrailNav,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=639-562',
  {
    imports: ["import { TrailNav } from '@odyssey/ui'"],
    props: {
      name: figma.string('Name'),
      role: figma.string('Role'),
      showNotification: figma.boolean('Show notification'),
      chevron: figma.instance('Chevron'),
    },
    example: ({ name, role, showNotification, chevron }) => (
      <TrailNav
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
