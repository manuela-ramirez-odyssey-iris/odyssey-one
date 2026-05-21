import figma from '@figma/code-connect'
import AuthContent from './AuthContent'

// Master: Components-Organisms / Modals artboard, AuthContent at 2264:712.
// Single-variant for now (Login); future variants (MfaSetup, PasswordSetup, etc.)
// extend the same master and map to additional `variant` enum values here.
figma.connect(
  AuthContent,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2264-712',
  {
    imports: ["import { AuthContent } from '@odyssey/ui'"],
    example: () => (
      <AuthContent
        variant="login"
        onLogin={({ email, password }) => {}}
        onForgotPassword={() => {}}
        onCreateAccount={() => {}}
      />
    ),
  },
)
