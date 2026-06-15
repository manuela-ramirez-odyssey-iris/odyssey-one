import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export type GlobalSearchMode = 'search' | 'title';

/**
 * GlobalSearchComponent — molecule. Centre section of the application navbar.
 *
 * In `mode='search'` it renders a text input with a clear button.
 * In `mode='title'` it renders a centred heading (e.g. "Edit Dashboard").
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18
 *
 * Usage:
 *   <od-global-search mode="search" [value]="q" (valueChange)="q=$event" (cleared)="q=''">
 *   </od-global-search>
 *
 *   <od-global-search mode="title" title="Edit Dashboard"></od-global-search>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-global-search',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClasses">
      <!-- Title mode -->
      <ng-container *ngIf="mode === 'title'">
        <span class="global-search__title text-heading-xl-semibold">{{ title }}</span>
      </ng-container>

      <!-- Search mode -->
      <ng-container *ngIf="mode === 'search'">
        <input
          class="global-search__input"
          type="text"
          [value]="value"
          [placeholder]="placeholder"
          (input)="onInput($event)"
          aria-label="Search"
        />
        <button
          type="button"
          class="global-search__clear"
          aria-label="Clear search"
          (click)="cleared.emit()"
        >
          <!-- clear icon slot -->
        </button>
      </ng-container>
    </div>
  `,
})
export class GlobalSearchComponent {
  /** Display mode — 'search' renders an input, 'title' renders heading text. */
  @Input() mode: GlobalSearchMode = 'search';

  /** Title text shown when mode is 'title'. */
  @Input() title = '';

  /** Current input value (search mode). */
  @Input() value = '';

  /** Placeholder text for the search input. */
  @Input() placeholder = 'Search anything...';

  /** Emitted when the user types in the search input. */
  @Output() valueChange = new EventEmitter<string>();

  /** Emitted when the clear button is clicked. */
  @Output() cleared = new EventEmitter<void>();

  get hostClasses(): string {
    return ['global-search', `global-search--${this.mode}`].join(' ');
  }

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
