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
 * ModalLargeComponent — organism. Reusable large modal with a header
 * (title + subtitle + close X), a content slot, and a footer slot.
 * ESC and overlay-click dismiss.
 *
 * Mirrors the React `ModalLarge` component in packages/ui.
 * Figma node: 2006-663
 *
 * Usage:
 *   <od-modal-large title="My Modal" (closeClicked)="onClose()">
 *     <div>Content goes here</div>
 *     <div slot="footer">Footer actions</div>
 *   </od-modal-large>
 */
@Component({
  standalone: true,
  imports: [CommonModule, IconButtonGhostComponent],
  selector: 'od-modal-large',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="modal-large-overlay" (click)="closeClicked.emit()">
      <div
        class="modal-large"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="ariaLabel || title"
        (click)="$event.stopPropagation()"
      >
        <header class="modal-large__header">
          <div class="modal-large__header-text">
            <span class="text-label-sm-semibold modal-large__title">{{ title }}</span>
            <span
              *ngIf="showSubtitle && subtitle"
              class="text-label-xs-regular modal-large__subtitle"
            >{{ subtitle }}</span>
          </div>
          <od-icon-button-ghost ariaLabel="Close" (clicked)="closeClicked.emit()">
            <!-- X icon rendered via SVG inline -->
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
        <div class="modal-large__content">
          <ng-content />
        </div>
        <footer class="modal-large__footer">
          <ng-content select="[slot=footer]" />
        </footer>
      </div>
    </div>
  `,
})
export class ModalLargeComponent {
  /** Modal heading text. */
  @Input() title = '';

  /** Optional subtitle shown below the title. */
  @Input() subtitle = '';

  /** Whether to show the subtitle. Defaults to true. */
  @Input() showSubtitle = true;

  /** Optional aria-label override; falls back to `title`. */
  @Input() ariaLabel = '';

  /** Emitted when the close button or overlay is clicked, or ESC is pressed. */
  @Output() closeClicked = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeClicked.emit();
  }
}
