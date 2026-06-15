import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * CustomerRowComponent — molecule. A row in the customer-picker flow.
 *
 * - `mode='list'` (default) — selected-list row. 48px height. Shows a favorite
 *   badge overlay when `favorite=true`. Trailing action is a Trash delete button.
 *
 * - `mode='result'` — search-dropdown row. 40px height, no bottom border.
 *   Trailing action is a Star toggle that emits `favoriteToggled`. No badge overlay.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2029-461
 *
 * Usage:
 *   <od-customer-row mode="list" label="Acme Corp" [favorite]="true" (deleteClicked)="onDelete()">
 *     <lucide-icon slot="icon" name="handshake"></lucide-icon>
 *   </od-customer-row>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-customer-row',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClasses">
      <div class="customer-row__info">
        <span class="customer-row__icon-container" aria-hidden="true">
          <ng-content select="[slot=icon]" />
          <!-- Favorite badge overlay (list mode only) -->
          <span *ngIf="favorite && mode === 'list'" class="customer-row__badge-overlay">
            <span class="badge badge--favorite"></span>
          </span>
        </span>
        <span class="text-label-sm-medium customer-row__label">{{ label }}</span>
      </div>

      <div class="customer-row__actions">
        <!-- Result mode: star toggle -->
        <button
          *ngIf="mode === 'result'"
          type="button"
          class="customer-row__action"
          [attr.aria-pressed]="favorite"
          [attr.aria-label]="favorite ? 'Unfavorite' : 'Favorite'"
          (click)="onFavoriteToggle($event)"
        >
          <!-- Star icon — filled when favorite -->
          <svg width="16" height="16" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            [attr.fill]="favorite ? 'currentColor' : 'none'"
            aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>

        <!-- List mode: trash delete -->
        <button
          *ngIf="mode === 'list'"
          type="button"
          class="icon-action customer-row__action"
          aria-label="Delete"
          (click)="onDelete($event)"
        >
          <!-- Trash2 icon -->
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/>
            <path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class CustomerRowComponent {
  /** Display mode controlling size and trailing action. */
  @Input() mode: 'list' | 'result' = 'list';

  /** Whether this customer is marked as a favorite. */
  @Input() favorite = false;

  /** Customer label / name. */
  @Input() label = '';

  /** Emitted when the star toggle is clicked in result mode. Carries the new favorite state. */
  @Output() favoriteToggled = new EventEmitter<boolean>();

  /** Emitted when the trash button is clicked in list mode. */
  @Output() deleteClicked = new EventEmitter<void>();

  get hostClasses(): string {
    return [
      'customer-row',
      `customer-row--${this.mode}`,
      this.favorite ? 'customer-row--favorite' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  onFavoriteToggle(event: MouseEvent): void {
    event.stopPropagation();
    this.favoriteToggled.emit(!this.favorite);
  }

  onDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.deleteClicked.emit();
  }
}
