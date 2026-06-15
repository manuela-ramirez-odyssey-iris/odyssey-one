import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * LeadNavComponent — molecule. Left side of the application navbar containing
 * a hamburger-style menu button and a logo slot.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=639-564
 *
 * Usage:
 *   <od-lead-nav>
 *     <od-odyssey-logo slot="logo"></od-odyssey-logo>
 *   </od-lead-nav>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-lead-nav',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClasses">
      <ng-content select="[slot=logo]" />
    </div>
  `,
})
export class LeadNavComponent {
  get hostClasses(): string {
    return 'lead-nav';
  }
}
