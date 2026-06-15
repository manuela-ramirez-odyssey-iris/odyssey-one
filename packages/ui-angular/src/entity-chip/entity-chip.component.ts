import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * EntityChipComponent — molecule. Pill that names a scope (e.g. "Customers") and shows
 * how many entities are currently selected via stacked dashed-border icon slots.
 *
 * Display rules:
 *   count 0    → no icon slots
 *   count 1–3  → that many icon slots
 *   count 4+   → 3 icon slots + a "+N" overflow badge where N = count − 3, capped at 9
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1716-60
 *
 * Usage:
 *   <od-entity-chip name="Customers" [count]="4" (addClicked)="onAdd()">
 *     <lucide-icon slot="entityIcon" name="handshake"></lucide-icon>
 *   </od-entity-chip>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-entity-chip',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="entity-chip">
      <span class="entity-chip__name">{{ name }}</span>
      <span class="entity-chip__icons">
        <span
          *ngFor="let slot of iconSlots; let i = index"
          [class]="'entity-chip__slot' + (i > 0 ? ' entity-chip__slot--stacked' : '')"
        >
          <svg class="entity-chip__slot-ring" viewBox="0 0 28 28" aria-hidden="true">
            <circle
              cx="14" cy="14" r="13"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-dasharray="3 2"
            />
          </svg>
          <ng-content select="[slot=entityIcon]" />
        </span>

        <span
          *ngIf="overflow > 0"
          [class]="'entity-chip__slot' + (iconSlots.length > 0 ? ' entity-chip__slot--stacked' : '')"
        >
          <svg class="entity-chip__slot-ring" viewBox="0 0 28 28" aria-hidden="true">
            <circle
              cx="14" cy="14" r="13"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-dasharray="3 2"
            />
          </svg>
          <span class="entity-chip__overflow">+{{ overflow }}</span>
        </span>

        <span *ngIf="showAddButton" class="entity-chip__add">
          <button
            type="button"
            class="icon-button icon-button--interactive"
            [attr.aria-label]="'Add ' + name.toLowerCase()"
            (click)="addClicked.emit()"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </span>
      </span>
    </div>
  `,
})
export class EntityChipComponent {
  /** Entity type name displayed in the chip. */
  @Input() name = 'Customers';

  /** Number of selected entities. Determines how many icon slots render. */
  @Input() count = 1;

  /** When true, renders the add (+) button. */
  @Input() showAddButton = true;

  /** Emitted when the add button is clicked. */
  @Output() addClicked = new EventEmitter<void>();

  /** Number of visible icon slots (capped at 3). */
  get iconSlots(): number[] {
    const safe = Math.max(0, Math.floor(this.count));
    const visible = Math.min(safe, 3);
    return Array.from({ length: visible }, (_, i) => i);
  }

  /** Overflow count for the +N badge (count > 3, capped at 9). */
  get overflow(): number {
    const safe = Math.max(0, Math.floor(this.count));
    return safe > 3 ? Math.min(safe - 3, 9) : 0;
  }
}
