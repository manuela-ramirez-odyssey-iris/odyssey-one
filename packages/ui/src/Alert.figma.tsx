import figma from '@figma/code-connect'
import Alert from './Alert'

figma.connect(
  Alert,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2569-1841',
  {
    imports: ["import { Alert } from '@odyssey/ui'"],
    props: {
      // State VARIANT → variant. Each state has its own icon + tinted surface:
      // info/circle-check/triangle-alert/octagon-x over Status/{info,success,warning,error}-message.
      // State=Error Validation (Layout Default/Expanded/Sticky) maps to the
      // `errors`/`docked`/`expanded` prop cluster — data-driven, so only the
      // plain message variants are enumerated here.
      variant: figma.enum('State', {
        'Info Message': 'info',
        'Success Message': 'success',
        'Warning Message': 'warning',
        'Error Message': 'error',
      }),
      showLink: figma.boolean('Show ButtonLink'),
      showClose: figma.boolean('Show X Button'),
    },
    // Message text is variant-specific in Figma (not a shared TEXT property), so
    // children isn't mapped — consumers pass their own message.
    example: ({ variant, showLink, showClose }) => (
      <Alert variant={variant} showLink={showLink} showClose={showClose}>
        Message
      </Alert>
    ),
  },
)
