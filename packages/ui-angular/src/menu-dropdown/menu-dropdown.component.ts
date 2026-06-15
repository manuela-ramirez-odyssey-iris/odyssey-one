import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * MenuDropdownComponent — molecule. Collapsible group inside a left-menu.
 * Header click toggles `expanded`; items render inside the default `ng-content`
 * slot (typically `MenuRow` instances). When collapsed the items container is hidden.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1981-79
 *
 * Usage:
 *   <od-menu-dropdown title="Widgets" [expanded]="true" (toggled)="onToggle()">
 *     <od-menu-row label="Total Orders"></od-menu-row>
 *     <od-menu-row label="Revenue"></od-menu-row>
 *   </od-menu-dropdown>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-menu-dropdown',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClasses">
      <button
        type="button"
        class="menu-dropdown__header"
        (click)="toggled.emit()"
        [attr.aria-expanded]="expanded"
      >
        <span class="menu-dropdown__title">{{ title }}</span>
        <svg
          width="16" height="16" viewBox="0 0 16 16"
          fill="none" aria-hidden="true"
          class="menu-dropdown__chevron"
        >
          <path
            *ngIf="expanded; else chevronRight"
            d="M3 6l5 5 5-5"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
          />
          <ng-template #chevronRight>
            <path
              d="M6 3l5 5-5 5"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
            />
          </ng-template>
        </svg>
      </button>
      <div *ngIf="expanded" class="menu-dropdown__content">
        <ng-content />
      </div>
    </div>
  `,
})
export class MenuDropdownComponent {
  /** Section title displayed in the dropdown header. */
  @Input() title = '';

  /** When true, the content slot is visible. */
  @Input() expanded = true;

  /** Emitted when the header is clicked (consumer controls `expanded`). */
  @Output() toggled = new EventEmitter<void>();

  get hostClasses(): string {
    return [
      'menu-dropdown',
      this.expanded ? 'menu-dropdown--expanded' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
}
