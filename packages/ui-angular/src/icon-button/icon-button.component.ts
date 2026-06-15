import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * IconButtonComponent — atom. 24×24 circular surface with shadow, holds a single icon.
 *
 * Polymorphic: renders as `<button>` when `interactive=true` (default),
 * otherwise as `<span>` (purely decorative). Avoids invalid nested-button
 * markup when used inside another interactive component (e.g. EntityChip).
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1754-295
 *
 * Usage:
 *   <od-icon-button ariaLabel="Delete">
 *     <lucide-icon name="trash"></lucide-icon>
 *   </od-icon-button>
 *
 *   <!-- Decorative (no button) -->
 *   <od-icon-button [interactive]="false">
 *     <lucide-icon name="star"></lucide-icon>
 *   </od-icon-button>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-icon-button',
  encapsulation: ViewEncapsulation.None,
  template: `
    <button
      *ngIf="interactive; else spanTpl"
      type="button"
      [attr.aria-label]="ariaLabel || null"
      [class]="hostClasses"
      (click)="clicked.emit($event)"
    >
      <ng-content />
    </button>

    <ng-template #spanTpl>
      <span
        [class]="hostClasses"
        [attr.aria-hidden]="ariaLabel ? null : true"
      >
        <ng-content />
      </span>
    </ng-template>
  `,
})
export class IconButtonComponent {
  /** Accessible label for the button. Recommended when `interactive=true`. */
  @Input() ariaLabel = '';

  /** When true (default), renders a `<button>`; when false, renders a `<span>`. */
  @Input() interactive = true;

  /** Emitted when the interactive button is clicked. */
  @Output() clicked = new EventEmitter<MouseEvent>();

  get hostClasses(): string {
    return [
      'icon-button',
      this.interactive ? 'icon-button--interactive' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
}
