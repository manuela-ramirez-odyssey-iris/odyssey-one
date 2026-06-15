import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * ButtonComponent — atom (5 variants × 3 sizes, plus disabled).
 *
 * Mirrors the React `Button` component in packages/ui.
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1307-333
 *
 * Usage:
 *   <od-button variant="primary" size="md">Save</od-button>
 *   <od-button variant="link" size="sm">Go to Tracking →</od-button>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-button',
  template: `
    <button
      [type]="type"
      [disabled]="disabled"
      [class]="hostClasses"
      (click)="clicked.emit($event)"
    >
      <span *ngIf="hasLeadingIcon" class="btn__icon">
        <ng-content select="[slot=icon]" />
      </span>

      <ng-content />

      <span *ngIf="hasTrailingIcon" class="btn__icon btn__icon--right">
        <ng-content select="[slot=iconRight]" />
      </span>
    </button>
  `,
})
export class ButtonComponent {
  /** Visual style — matches the React `variant` prop. */
  @Input() variant: ButtonVariant = 'primary';

  /** Size — sm | md | lg. */
  @Input() size: ButtonSize = 'md';

  /** Disables the button and applies disabled styling. */
  @Input() disabled = false;

  /** Whether a leading icon is slotted via `slot="icon"`. */
  @Input() hasLeadingIcon = false;

  /** Whether a trailing icon is slotted via `slot="iconRight"`. */
  @Input() hasTrailingIcon = false;

  /** Native button type attribute. */
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  /** Emitted when the button is clicked (mirrors React onClick). */
  @Output() clicked = new EventEmitter<MouseEvent>();

  get hostClasses(): string {
    const textClass = this.size === 'sm' ? 'text-label-sm-medium' : 'text-label-base-medium';
    return [
      'btn',
      `btn--${this.variant}`,
      `btn--${this.size}`,
      this.hasLeadingIcon ? 'btn--has-icon' : '',
      this.hasTrailingIcon ? 'btn--has-icon-right' : '',
      textClass,
    ]
      .filter(Boolean)
      .join(' ');
  }
}
