import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * EmptyStateComponent — atom. Centered icon over a help message on a DSN/100
 * surface. Use when a list, search result, or data view has no content yet.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2159-295
 *
 * Usage:
 *   <od-empty-state message="No results found">
 *     <lucide-icon slot="icon" name="search"></lucide-icon>
 *   </od-empty-state>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-empty-state',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="empty-state">
      <span class="empty-state__icon" aria-hidden="true">
        <ng-content select="[slot=icon]" />
      </span>
      <span *ngIf="message" class="text-label-xs-regular empty-state__message">{{ message }}</span>
    </div>
  `,
})
export class EmptyStateComponent {
  /** Help message displayed below the icon. */
  @Input() message = '';
}
