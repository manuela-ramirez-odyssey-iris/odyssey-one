import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * WidgetCtaRowComponent — molecule. Single call-to-action link row used inside
 * Widget 3xCta. Renders a full-width button with an optional leading icon slot,
 * label text, and a trailing chevron.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1927-84
 *
 * Usage:
 *   <od-widget-cta-row label="View All Orders" (clicked)="onCta($event)">
 *     <lucide-icon slot="icon" name="package"></lucide-icon>
 *   </od-widget-cta-row>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-widget-cta-row',
  encapsulation: ViewEncapsulation.None,
  template: `
    <button
      type="button"
      class="widget-cta-row"
      (click)="clicked.emit($event)"
    >
      <span class="widget-cta-row__label-group">
        <span class="widget-cta-row__icon-bg">
          <span class="widget-cta-row__icon" aria-hidden="true">
            <ng-content select="[slot=icon]" />
          </span>
        </span>
        <span class="widget-cta-row__label text-label-sm-medium">{{ label }}</span>
      </span>
      <svg
        class="widget-cta-row__chevron"
        width="16" height="16" viewBox="0 0 16 16"
        fill="none" aria-hidden="true"
      >
        <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `,
})
export class WidgetCtaRowComponent {
  /** Label text displayed beside the icon. */
  @Input() label = '';

  /** Emitted when the row button is clicked. */
  @Output() clicked = new EventEmitter<MouseEvent>();
}
