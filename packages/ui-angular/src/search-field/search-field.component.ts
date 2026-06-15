import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * SearchFieldComponent — molecule. Search input with optional label row and
 * info icon. Controlled via `value` + `valueChange`; emits `cleared` when the
 * clear button is clicked and `infoClicked` when the info icon button is clicked.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1959-76
 *
 * Usage:
 *   <od-search-field
 *     [value]="query"
 *     (valueChange)="query=$event"
 *     (cleared)="query=''"
 *     placeholder="Search shipments"
 *   ></od-search-field>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-search-field',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClasses">
      <!-- Optional label row -->
      <div *ngIf="showLabel" class="search-field__label">
        <span class="text-label-sm-medium">{{ label }}</span>
        <button
          *ngIf="showInfoIcon"
          type="button"
          class="search-field__info"
          aria-label="More info"
          (click)="infoClicked.emit()"
        >
          <!-- Info icon (lucide info) -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </button>
      </div>

      <!-- Input bar -->
      <div class="search-field__input-bar">
        <!-- Search icon -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="search-field__search-icon" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>

        <input
          type="text"
          class="search-field__input"
          [value]="value"
          [placeholder]="placeholder"
          (input)="onInput($event)"
          (focus)="focused = true"
          (blur)="focused = false"
          spellcheck="false"
          autocorrect="off"
          autocapitalize="off"
          aria-label="Search"
        />

        <button
          *ngIf="value"
          type="button"
          class="search-field__clear"
          aria-label="Clear search"
          (mousedown)="$event.preventDefault()"
          (click)="onClear()"
        >
          <!-- CircleX icon (lucide circle-x) -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class SearchFieldComponent {
  /** Current controlled value of the search input. */
  @Input() value = '';

  /** Placeholder text shown when the input is empty. */
  @Input() placeholder = 'Search';

  /** Whether to show the label row above the input bar. */
  @Input() showLabel = false;

  /** Label text shown in the label row (requires `showLabel=true`). */
  @Input() label = 'Label';

  /** Whether to show the info icon button in the label row. */
  @Input() showInfoIcon = false;

  /** Emitted with the new string value whenever the user types. */
  @Output() valueChange = new EventEmitter<string>();

  /** Emitted when the clear button is clicked. */
  @Output() cleared = new EventEmitter<void>();

  /** Emitted when the info icon button is clicked. */
  @Output() infoClicked = new EventEmitter<void>();

  /** Tracks focus state to apply focus styles. */
  focused = false;

  get hostClasses(): string {
    return [
      'search-field',
      this.focused ? 'search-field--focused' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  onClear(): void {
    this.valueChange.emit('');
    this.cleared.emit();
  }
}
