import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * IconButtonGhostComponent — atom. Transparent-at-rest icon-only button with
 * hover + pressed surface fills. Used for modal close, widget close, and similar
 * small "close-or-clear" actions where the button shouldn't draw attention
 * until interacted with.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2138-304
 *
 * Usage:
 *   <od-icon-button-ghost ariaLabel="Close" (clicked)="onClose($event)">
 *     <lucide-icon name="x"></lucide-icon>
 *   </od-icon-button-ghost>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-icon-button-ghost',
  encapsulation: ViewEncapsulation.None,
  template: `
    <button
      type="button"
      [attr.aria-label]="ariaLabel || null"
      [class]="hostClasses"
      (click)="clicked.emit($event)"
    >
      <ng-content />
    </button>
  `,
})
export class IconButtonGhostComponent {
  /** Accessible label for the button. */
  @Input() ariaLabel = '';

  /** Emitted when the button is clicked. */
  @Output() clicked = new EventEmitter<MouseEvent>();

  get hostClasses(): string {
    return 'icon-btn-ghost icon-btn-ghost--interactive';
  }
}
