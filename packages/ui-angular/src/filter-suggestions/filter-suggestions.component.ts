import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * FilterSuggestionsComponent — molecule. Dropdown panel showing selectable
 * filter suggestion chips for the GlobalSearch bar. Each item renders as a
 * clickable `<button>` styled with the `badge badge--gray` BEM classes.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2400-2
 *
 * Usage:
 *   <od-filter-suggestions
 *     title="Suggested Filters"
 *     [items]="['Status: Delivered', 'Carrier: Acme']"
 *     (itemSelected)="onFilterSelect($event)"
 *   ></od-filter-suggestions>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-filter-suggestions',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="filter-suggestions">
      <span *ngIf="title" class="filter-suggestions__title text-label-sm-medium">{{ title }}</span>
      <ul class="filter-suggestions__list" role="listbox">
        <li *ngFor="let item of items" class="filter-suggestions__item" role="option">
          <button
            type="button"
            class="badge badge--gray"
            (click)="itemSelected.emit(item)"
          >{{ item }}</button>
        </li>
      </ul>
    </div>
  `,
})
export class FilterSuggestionsComponent {
  /** Section title rendered above the item list. */
  @Input() title = '';

  /** List of suggestion strings to render as selectable chips. */
  @Input() items: string[] = [];

  /** Emitted with the clicked item string when a suggestion is selected. */
  @Output() itemSelected = new EventEmitter<string>();
}
