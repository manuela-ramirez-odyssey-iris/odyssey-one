import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * MenuRowComponent — molecule. Single label row inside a left-menu group.
 * Used inside MenuDropdown to represent a draggable/clickable menu item.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1973-87
 *
 * Usage:
 *   <od-menu-row label="Total Orders" (clicked)="onRow($event)"></od-menu-row>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-menu-row',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="menu-row" (click)="clicked.emit($event)">
      <span class="menu-row__label">{{ label }}</span>
      <span class="menu-row__grip" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="5" cy="5" r="1.25" fill="currentColor"/>
          <circle cx="5" cy="9" r="1.25" fill="currentColor"/>
          <circle cx="5" cy="13" r="1.25" fill="currentColor"/>
          <circle cx="11" cy="5" r="1.25" fill="currentColor"/>
          <circle cx="11" cy="9" r="1.25" fill="currentColor"/>
          <circle cx="11" cy="13" r="1.25" fill="currentColor"/>
        </svg>
      </span>
    </div>
  `,
})
export class MenuRowComponent {
  /** Label text displayed in the row. */
  @Input() label = '';

  /** Emitted when the row is clicked. */
  @Output() clicked = new EventEmitter<MouseEvent>();
}
