import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * PageHeaderComponent — molecule. Top-of-route H1 with a flex shell that fills
 * its container. Used as the page identifier (e.g. "Shipments", "Orders").
 * The right side of the flex shell is reserved for optional actions via
 * projected content.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1693-49
 *
 * Usage:
 *   <od-page-header title="Shipments"></od-page-header>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-page-header',
  encapsulation: ViewEncapsulation.None,
  template: `
    <header [class]="hostClasses">
      <h1 class="page-header__title text-heading-xl-semibold">{{ title }}</h1>
      <ng-content />
    </header>
  `,
})
export class PageHeaderComponent {
  /** Page title displayed as an H1. */
  @Input() title = '';

  get hostClasses(): string {
    return 'page-header';
  }
}
