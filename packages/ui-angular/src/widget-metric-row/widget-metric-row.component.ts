import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * WidgetMetricRowComponent — molecule. Single data row inside a Widget:
 * optional indicator dot + label + value + trailing chevron.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1814-7
 *
 * Usage:
 *   <od-widget-metric-row
 *     label="Total Orders"
 *     value="42"
 *     [showIndicator]="true"
 *     indicatorColor="var(--chart-1)"
 *     (clicked)="onRow($event)"
 *   ></od-widget-metric-row>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-widget-metric-row',
  encapsulation: ViewEncapsulation.None,
  template: `
    <button
      type="button"
      class="widget-metric-row"
      (click)="clicked.emit($event)"
    >
      <span class="widget-metric-row__label-group">
        <span
          *ngIf="showIndicator"
          class="widget-metric-row__indicator"
          [style.background]="indicatorColor"
          aria-hidden="true"
        ></span>
        <span class="widget-metric-row__label text-label-sm-regular">{{ label }}</span>
      </span>
      <span class="widget-metric-row__trailing">
        <span class="badge-metric text-badge">{{ value }}</span>
        <svg
          class="widget-metric-row__chevron"
          width="16" height="16" viewBox="0 0 16 16"
          fill="none" aria-hidden="true"
        >
          <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </button>
  `,
})
export class WidgetMetricRowComponent {
  /** Row label text. */
  @Input() label = '';

  /** Row value text (rendered as a metric badge). */
  @Input() value = '';

  /** When true, renders a colored dot indicator before the label. */
  @Input() showIndicator = false;

  /** CSS color value for the indicator dot (e.g. `var(--chart-1)`). */
  @Input() indicatorColor = '';

  /** Emitted when the row is clicked. */
  @Output() clicked = new EventEmitter<MouseEvent>();
}
