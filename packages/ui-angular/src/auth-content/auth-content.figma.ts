import figma, { html } from '@figma/code-connect';

// Master: Components-Organisms / Modals artboard, AuthContent at 2264:712.
// Single-variant (login). Future variants extend the same master with additional
// enum values mapped to the `variant` input.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2264-712',
  {
    imports: ["import { AuthContentComponent } from '@odyssey/ui-angular'"],
    example: () =>
      html`<od-auth-content
  variant="login"
  (loginSubmitted)="onLogin($event)"
  (forgotPasswordClicked)="onForgotPassword()"
  (createAccountClicked)="onCreateAccount()"
/>`,
  },
);
