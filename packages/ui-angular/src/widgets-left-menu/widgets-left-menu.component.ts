import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchFieldComponent } from '../search-field/search-field.component';
import { MenuDropdownComponent } from '../menu-dropdown/menu-dropdown.component';
import { MenuRowComponent } from '../menu-row/menu-row.component';

export interface WidgetsGroup {
  title: string;
  items: string[];
}

/**
 * WidgetsLeftMenuComponent — organism. Side-panel widget catalog.
 * Renders a fixed-width panel with: title header, search field, and a list of
 * collapsible `MenuDropdown` groups each containing `MenuRow` items.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1961-393
 *
 * Usage:
 *   <od-widgets-left-menu
 *     title="Metrics library"
 *     [searchValue]="query"
 *     [groups]="groups"
 *     (searchChange)="query = $event"
 *   ></od-widgets-left-menu>
 */
@Component({
  standalone: true,
  imports: [
    CommonModule,
    SearchFieldComponent,
    MenuDropdownComponent,
    MenuRowComponent,
  ],
  selector: 'od-widgets-left-menu',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div
      class="widgets-left-menu flex flex-col"
      style="width: 240px; height: 100%; background: var(--white); box-shadow: var(--shadow-panel);"
    >
      <!-- Header -->
      <div
        class="widgets-left-menu__header flex items-center"
        style="height: 48px; padding: var(--spacing-4); border-bottom: 1px solid var(--border-subtle);"
      >
        <span class="text-label-xs-semibold" style="color: var(--text-primary);">
          {{ title }}
        </span>
      </div>

      <!-- Search -->
      <div
        class="widgets-left-menu__search"
        style="padding: var(--spacing-3) var(--spacing-4);"
      >
        <od-search-field
          [value]="searchValue"
          placeholder="Search"
          (valueChange)="searchChange.emit($event)"
          (cleared)="searchChange.emit('')"
        ></od-search-field>
      </div>

      <!-- Groups -->
      <div class="widgets-left-menu__groups flex flex-col" style="overflow-y: auto;">
        <od-menu-dropdown
          *ngFor="let group of filteredGroups; trackBy: trackByTitle"
          [title]="group.title"
          [expanded]="isExpanded(group.title)"
          (toggled)="onToggle(group.title)"
        >
          <od-menu-row
            *ngFor="let item of group.items"
            [label]="item"
          ></od-menu-row>
        </od-menu-dropdown>
      </div>
    </div>
  `,
})
export class WidgetsLeftMenuComponent {
  /** Panel heading shown at the top. */
  @Input() title = '';

  /** Current controlled search value. */
  @Input() searchValue = '';

  /** Array of collapsible groups, each with a title and list of item label strings. */
  @Input() groups: WidgetsGroup[] = [];

  /** Emitted with the new string value whenever the search input changes. */
  @Output() searchChange = new EventEmitter<string>();

  /** Tracks which group titles are collapsed. */
  private collapsedTitles = new Set<string>();

  /** Filters groups and items based on the current searchValue. */
  get filteredGroups(): WidgetsGroup[] {
    const query = (this.searchValue || '').toLowerCase().trim();
    if (!query) return this.groups;
    return this.groups
      .map((g) => ({
        title: g.title,
        items: g.items.filter((item) => item.toLowerCase().includes(query)),
      }))
      .filter((g) => g.items.length > 0);
  }

  isExpanded(title: string): boolean {
    return !this.collapsedTitles.has(title);
  }

  onToggle(title: string): void {
    if (this.collapsedTitles.has(title)) {
      this.collapsedTitles.delete(title);
    } else {
      this.collapsedTitles.add(title);
    }
  }

  trackByTitle(_index: number, group: WidgetsGroup): string {
    return group.title;
  }
}
