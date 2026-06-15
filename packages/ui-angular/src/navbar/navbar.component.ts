import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * NavbarComponent — organism. Top navigation shell with three named slots:
 * lead (logo + nav), search (global search), and trail (profile / editor controls).
 *
 * `compact` shaves 2px off each vertical padding (14px → 12px) to accommodate
 * larger trail-slot content (e.g. editor-mode buttons at size lg).
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1661-206
 *
 * Usage:
 *   <od-navbar [compact]="false">
 *     <od-lead-nav slot="lead"></od-lead-nav>
 *     <od-global-search slot="search"></od-global-search>
 *     <od-trail-nav slot="trail"></od-trail-nav>
 *   </od-navbar>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-navbar',
  encapsulation: ViewEncapsulation.None,
  template: `
    <header
      class="flex items-center justify-between shrink-0 relative z-50"
      [style.background]="'var(--navbar-bg)'"
      [style.padding]="padding"
    >
      <div class="shrink-0">
        <ng-content select="[slot=lead]" />
      </div>
      <div class="shrink-0">
        <ng-content select="[slot=search]" />
      </div>
      <div class="relative shrink-0">
        <ng-content select="[slot=trail]" />
      </div>
    </header>
  `,
})
export class NavbarComponent {
  /**
   * When true, vertical padding is reduced from 14px to 12px so the navbar
   * stays visually balanced when the trail slot contains larger (lg) buttons.
   */
  @Input() compact = false;

  get padding(): string {
    const vPad = this.compact ? '12px' : '14px';
    return `${vPad} var(--spacing-6) ${vPad} var(--spacing-4)`;
  }
}
