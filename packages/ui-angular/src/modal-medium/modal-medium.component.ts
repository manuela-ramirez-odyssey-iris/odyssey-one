import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconButtonGhostComponent } from '../icon-button-ghost/icon-button-ghost.component';

/**
 * ModalMediumComponent — organism shell. 540-wide reusable modal with a header
 * (title + close X), content slot, and footer slot.
 * ESC and overlay-click dismiss.
 *
 * Mirrors the React `ModalMedium` component in packages/ui.
 * Figma node: 2032-915
 *
 * Usage:
 *   <od-modal-medium title="Confirm Action" (closeClicked)="onClose()">
 *     <p>Are you sure?</p>
 *     <div slot="footer">
 *       <od-button variant="secondary" (clicked)="onClose()">Cancel</od-button>
 *       <od-button variant="primary">Confirm</od-button>
 *     </div>
 *   </od-modal-medium>
 */
@Component({
  standalone: true,
  imports: [CommonModule, IconButtonGhostComponent],
  selector: 'od-modal-medium',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="modal-medium-overlay" (click)="closeClicked.emit()">
      <div
        class="modal-medium"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="ariaLabel || title"
        (click)="$event.stopPropagation()"
      >
        <header class="modal-medium__header">
          <span class="text-heading-lg-semibold modal-medium__title">{{ title }}</span>
          <od-icon-button-ghost ariaLabel="Close" (clicked)="closeClicked.emit()">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </od-icon-button-ghost>
        </header>
        <div class="modal-medium__content">
          <ng-content />
        </div>
        <footer class="modal-medium__footer">
          <ng-content select="[slot=footer]" />
        </footer>
      </div>
    </div>
  `,
})
export class ModalMediumComponent {
  /** Modal heading text. */
  @Input() title = '';

  /** Optional aria-label override; falls back to `title`. */
  @Input() ariaLabel = '';

  /** Emitted when the close button or overlay is clicked, or ESC is pressed. */
  @Output() closeClicked = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeClicked.emit();
  }
}
