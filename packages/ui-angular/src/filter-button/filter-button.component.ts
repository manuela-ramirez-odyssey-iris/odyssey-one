import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * FilterButtonComponent — atom. Filter trigger for GlobalSearch.
 * Opens the filters drawer. States: Default / Hover / Pressed / Active.
 * Active state (Carolina Blue) is persistent when `active=true`.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2347-325
 *
 * Usage:
 *   <od-filter-button [active]="filtersOpen" (clicked)="toggleFilters($event)">
 *     Filter
 *   </od-filter-button>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-filter-button',
  encapsulation: ViewEncapsulation.None,
  template: `
    <button
      type="button"
      [class]="hostClasses"
      [attr.aria-pressed]="active"
      (click)="clicked.emit($event)"
    >
      <ng-content />
    </button>
  `,
})
export class FilterButtonComponent {
  /** When true, renders the active (Carolina Blue) state — drawer is open. */
  @Input() active = false;

  /** Emitted when the button is clicked. */
  @Output() clicked = new EventEmitter<MouseEvent>();

  get hostClasses(): string {
    return [
      'filter-btn',
      this.active ? 'filter-btn--active' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
}
