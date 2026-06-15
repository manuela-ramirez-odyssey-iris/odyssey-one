import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormFieldComponent } from '../form-field/form-field.component';
import { ButtonComponent } from '../button/button.component';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * AuthContentComponent — organism. Inner body of the AuthModal shell.
 *
 * Variant axis (matches Figma master 2264:712):
 *   login — email + password fields, Log In button, forgot password link,
 *            create account link.
 *
 * Mirrors the React `AuthContent` component in packages/ui.
 * Figma node: 2264-712
 *
 * Usage:
 *   <od-auth-content
 *     variant="login"
 *     (loginSubmitted)="onLogin($event)"
 *     (forgotPasswordClicked)="onForgotPassword()"
 *     (createAccountClicked)="onCreateAccount()"
 *   />
 */
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, FormFieldComponent, ButtonComponent],
  selector: 'od-auth-content',
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-container *ngIf="variant === 'login'">
      <form class="auth-content__form" (ngSubmit)="handleSubmit()">
        <od-form-field
          id="auth-email"
          name="email"
          label="Email Address"
          placeholder="Enter Email ID"
          type="email"
          [value]="email"
          [locked]="true"
          (valueChange)="email = $event"
        />
        <od-form-field
          id="auth-password"
          name="password"
          label="Password"
          placeholder="Enter Password"
          type="password"
          [value]="password"
          [locked]="true"
          (valueChange)="password = $event"
        />
        <od-button type="submit" variant="primary" size="lg">Log In</od-button>
      </form>
      <od-button
        variant="link"
        size="sm"
        type="button"
        (clicked)="forgotPasswordClicked.emit()"
      >
        Forgot password?
      </od-button>
      <p class="auth-content__account">
        Don't have an account yet?
        <a
          href="#"
          class="auth-content__account-link"
          (click)="onCreateAccountClick($event)"
        >Create an account.</a>
      </p>
    </ng-container>
  `,
})
export class AuthContentComponent {
  /** Variant of the auth form. Currently only 'login' is supported. */
  @Input() variant: 'login' = 'login';

  /** Emitted on form submit with the entered credentials. */
  @Output() loginSubmitted = new EventEmitter<LoginCredentials>();

  /** Emitted when the "Forgot password?" link is clicked. */
  @Output() forgotPasswordClicked = new EventEmitter<void>();

  /** Emitted when the "Create an account." link is clicked. */
  @Output() createAccountClicked = new EventEmitter<void>();

  // Prototype: prefilled + locked credentials so reviewers can click "Log In"
  // without real auth wiring.
  email = 'test@odyssey.com';
  password = 'OdysseyTest!2026';

  handleSubmit(): void {
    this.loginSubmitted.emit({ email: this.email, password: this.password });
  }

  onCreateAccountClick(e: Event): void {
    e.preventDefault();
    this.createAccountClicked.emit();
  }
}
