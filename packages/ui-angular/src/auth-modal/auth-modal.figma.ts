import figma, { html } from '@figma/code-connect';

// Master: Components-Organisms page, Modals artboard, AuthModal at 2244:1373.
// Single-state shell — OdysseyLogo (dark) is baked into the header.
// Consumer supplies body via ng-content (typically od-auth-content).
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2244-1373',
  {
    imports: ["import { AuthModalComponent } from '@odyssey/ui-angular'"],
    example: () =>
      html`<od-auth-modal>
  <od-auth-content
    variant="login"
    (loginSubmitted)="onLogin($event)"
    (forgotPasswordClicked)="onForgotPassword()"
    (createAccountClicked)="onCreateAccount()"
  />
</od-auth-modal>`,
  },
);
