import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
  ContentChild,
  ElementRef,
  AfterContentInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * FormFieldComponent — molecule. Label + text input with optional trailing icon.
 *
 * States derived from inputs:
 *   default — idle
 *   error   — `error` string is non-empty → `form-field--error`, `aria-invalid`, alert icon
 *   locked  — `locked=true` → `form-field--locked`, `readonly`, lock icon
 *
 * Trailing icon priority when no `[slot=trailingIcon]` content is projected:
 *   locked → Lock SVG icon
 *   error  → CircleAlert SVG icon
 *   else   → none
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2255-98
 *
 * Usage:
 *   <od-form-field label="Email" placeholder="you@example.com" [value]="email"
 *     (valueChange)="email=$event">
 *   </od-form-field>
 *
 *   <od-form-field label="Reference #" [value]="ref" [locked]="true">
 *   </od-form-field>
 *
 *   <od-form-field label="Tracking #" [value]="tracking" [error]="trackingError"
 *     (valueChange)="tracking=$event">
 *   </od-form-field>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-form-field',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClasses">
      <label *ngIf="label" [attr.for]="id || null" class="form-field__label">{{ label }}</label>

      <div class="form-field__input">
        <input
          [id]="id || null"
          [name]="name || null"
          [type]="type"
          [placeholder]="placeholder"
          [value]="value"
          [required]="required"
          [attr.readonly]="locked ? true : null"
          [attr.aria-readonly]="locked ? 'true' : null"
          [attr.aria-invalid]="error ? 'true' : null"
          [attr.aria-describedby]="error && id ? id + '-error' : null"
          [attr.tabindex]="locked ? -1 : null"
          (input)="onInput($event)"
        />

        <!-- Slotted trailing icon (explicit override) -->
        <span class="form-field__icon" aria-hidden="true">
          <ng-content select="[slot=trailingIcon]" />
        </span>

        <!-- Auto-resolved icon: shown only when no slotted content is provided -->
        <span *ngIf="!hasSlottedIcon && (locked || error)" class="form-field__icon" aria-hidden="true">
          <!-- Lock icon (lucide lock) — shown when locked -->
          <svg *ngIf="locked && !error" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <!-- CircleAlert icon (lucide circle-alert) — shown when error -->
          <svg *ngIf="error" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </span>
      </div>

      <p
        *ngIf="error"
        class="form-field__error"
        [id]="id ? id + '-error' : null"
        role="alert"
      >{{ error }}</p>
    </div>
  `,
})
export class FormFieldComponent implements AfterContentInit {
  /** Field label text — renders a `<label>` element. */
  @Input() label = '';

  /** Input placeholder text. */
  @Input() placeholder = '';

  /** Current controlled value of the input. */
  @Input() value = '';

  /** Native `type` attribute of the underlying `<input>`. */
  @Input() type = 'text';

  /** Error message. Non-empty triggers the error state and renders an alert below the input. */
  @Input() error = '';

  /** When true, the input is read-only and styled with the locked appearance. */
  @Input() locked = false;

  /** `id` for the input — also used to link label and error message. */
  @Input() id = '';

  /** `name` attribute for the underlying input. */
  @Input() name = '';

  /** Whether the field is required. */
  @Input() required = false;

  /** Emitted with the new string value whenever the user types. */
  @Output() valueChange = new EventEmitter<string>();

  /** Whether a `[slot=trailingIcon]` element has been projected. */
  hasSlottedIcon = false;

  @ContentChild('[slot=trailingIcon]', { read: ElementRef })
  set trailingIconRef(ref: ElementRef | undefined) {
    this.hasSlottedIcon = !!ref;
  }

  ngAfterContentInit(): void {
    // hasSlottedIcon is set via the ContentChild setter above
  }

  get hostClasses(): string {
    return [
      'form-field',
      this.locked ? 'form-field--locked' : '',
      this.error ? 'form-field--error' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
