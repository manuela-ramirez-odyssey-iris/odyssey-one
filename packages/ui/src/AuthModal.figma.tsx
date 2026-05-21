import figma from '@figma/code-connect'
import AuthModal from './AuthModal'

// Master: Components-Organisms page, Modals artboard, AuthModal at 2244:1373.
// Single-state shell. OdysseyLogo (dark variant) is baked into the header;
// consumer supplies the body via children.
figma.connect(
  AuthModal,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2244-1373',
  {
    imports: ["import { AuthModal } from '@odyssey/ui'"],
    props: {
      children: figma.children('Content'),
    },
    example: ({ children }) => (
      <AuthModal>{children}</AuthModal>
    ),
  },
)
