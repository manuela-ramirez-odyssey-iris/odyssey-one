import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SidebarButtonState = 'default' | 'hover' | 'selected';

/**
 * SidebarButtonComponent — atom. Compact icon-only button used in the
 * vertical sidebar navigation. Three interactive states mirror the Figma
 * `Property 1` axis: Default / Hover / Selected.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=514-2479
 *
 * Usage:
 *   <od-sidebar-button state="selected">
 *     <lucide-icon name="home"></lucide-icon>
 *   </od-sidebar-button>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-sidebar-button',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClasses">
      <ng-content />
    </div>
  `,
})
export class SidebarButtonComponent {
  /** Interactive state — default | hover | selected. */
  @Input() state: SidebarButtonState = 'default';

  get hostClasses(): string {
    return [
      'sidebar-btn',
      `sidebar-btn--${this.state}`,
    ]
      .filter(Boolean)
      .join(' ');
  }
}
