import { Component, ViewEncapsulation } from '@angular/core';
import { OdysseyLogoComponent } from '../odyssey-logo/odyssey-logo.component';

/**
 * AuthModalComponent — organism. Pre-auth screen card shell.
 * Renders the OdysseyLogo (dark variant) in the header; consumer
 * supplies body content via ng-content (AuthContent or custom).
 *
 * Mirrors the React `AuthModal` component in packages/ui.
 * Figma node: 2244-1373
 *
 * Usage:
 *   <od-auth-modal>
 *     <od-auth-content (loginSubmitted)="onLogin($event)" />
 *   </od-auth-modal>
 */
@Component({
  standalone: true,
  imports: [OdysseyLogoComponent],
  selector: 'od-auth-modal',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="auth-modal">
      <header class="auth-modal__header">
        <od-odyssey-logo variant="dark" />
      </header>
      <ng-content />
    </div>
  `,
})
export class AuthModalComponent {}
