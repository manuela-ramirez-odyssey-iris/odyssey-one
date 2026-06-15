import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconButtonGhostComponent } from '../icon-button-ghost/icon-button-ghost.component';
import { WidgetMetricRowComponent } from '../widget-metric-row/widget-metric-row.component';
import { WidgetPieChartComponent } from '../widget-pie-chart/widget-pie-chart.component';
import { WidgetCtaRowComponent } from '../widget-cta-row/widget-cta-row.component';

export type WidgetVariant = '1x' | '2x' | '3x' | '3xChart' | '3xCta';

export interface WidgetMetricRow {
  label: string;
  value: string;
  indicatorColor?: string;
}

export interface WidgetCtaRowData {
  label: string;
}

export interface WidgetChartSegment {
  value: number;
  color: string;
}

/**
 * WidgetComponent — organism. Unified Home dashboard widget with 5 layout variants.
 *
 * Variants:
 *   1x       — Clickable value + label block with inline arrow.
 *   2x       — Large value + label + optional pie chart (donut) beside it.
 *   3x       — Vertical list of metric rows (label + value badge).
 *   3xChart  — Large pie chart + value + label header + metric row legend.
 *   3xCta    — Vertical list of call-to-action link rows (no chart).
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1825-7
 *
 * Usage:
 *   <od-widget variant="2x" title="Total Orders" value="1,234" label="This month"
 *              [chartSegments]="segments" percentage="42%"
 *              (closeClicked)="onClose()">
 *     <span slot="domainIcon">…</span>
 *   </od-widget>
 */
@Component({
  standalone: true,
  imports: [
    CommonModule,
    IconButtonGhostComponent,
    WidgetMetricRowComponent,
    WidgetPieChartComponent,
    WidgetCtaRowComponent,
  ],
  selector: 'od-widget',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClasses">

      <!-- ─── Header ─────────────────────────────────────────────────────── -->
      <header class="widget__header">
        <div class="widget__header-title">
          <!-- Grip icon — shown in edit mode or when showGrip=true -->
          <ng-container *ngIf="showGrip || editMode">
            <svg
              class="widget__grip"
              width="24" height="24" viewBox="0 0 24 24"
              fill="none" aria-hidden="true"
            >
              <circle cx="9" cy="6"  r="1.5" fill="currentColor"/>
              <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
              <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
              <circle cx="15" cy="6"  r="1.5" fill="currentColor"/>
              <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
              <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
            </svg>
          </ng-container>

          <!-- Domain icon slot — container style differs by variant -->
          <ng-container *ngIf="variant === '3x' || variant === '3xChart'">
            <span class="widget__domain-icon-container">
              <ng-content select="[slot=domainIcon]" />
            </span>
          </ng-container>
          <ng-container *ngIf="variant === '1x' || variant === '2x'">
            <span class="widget__domain-icon">
              <ng-content select="[slot=domainIcon]" />
            </span>
          </ng-container>

          <!-- Title — typography class varies by variant -->
          <span [class]="titleClasses">{{ title }}</span>
        </div>

        <!-- Close button — shown in edit mode (→ removeClicked) or when closeClicked is observed -->
        <od-icon-button-ghost
          *ngIf="editMode || closeClicked.observed"
          ariaLabel="Remove widget"
          class="widget__close"
          (clicked)="editMode ? removeClicked.emit() : closeClicked.emit()"
        >
          <!-- X icon -->
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </od-icon-button-ghost>
      </header>

      <!-- ─── Content (variant-switched) ────────────────────────────────── -->
      <div [ngSwitch]="variant">

        <!-- 1x: clickable value + label block -->
        <ng-template ngSwitchCase="'1x'">
          <button
            type="button"
            class="widget__content widget__content--1x"
            (click)="goToClicked.emit()"
            [disabled]="!goToClicked.observed"
          >
            <span class="widget__value-row">
              <span class="text-display-3xl-semibold widget__value">{{ value }}</span>
              <!-- Arrow right icon -->
              <svg class="widget__inline-arrow" width="16" height="16" viewBox="0 0 16 16"
                fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="text-label-sm-regular widget__label">{{ label }}</span>
          </button>
        </ng-template>

        <!-- 2x: value + label + optional pie chart -->
        <ng-template ngSwitchCase="'2x'">
          <div class="widget__content widget__content--2x">
            <div class="widget__data-container">
              <span class="text-display-3xl-semibold widget__value">{{ value }}</span>
              <span class="text-label-sm-medium widget__label">{{ label }}</span>
            </div>
            <od-widget-pie-chart
              *ngIf="showChart"
              size="md"
              [segments]="chartSegments"
              [total]="chartTotal"
              [showCenterText]="!!percentage"
              [centerText]="percentage"
            ></od-widget-pie-chart>
          </div>
        </ng-template>

        <!-- 3x: vertical metric row list -->
        <ng-template ngSwitchCase="'3x'">
          <div class="widget__content widget__content--3x">
            <od-widget-metric-row
              *ngFor="let row of rows"
              [label]="row.label"
              [value]="row.value"
              [showIndicator]="false"
            ></od-widget-metric-row>
          </div>
        </ng-template>

        <!-- 3xChart: pie chart + metric row legend -->
        <ng-template ngSwitchCase="'3xChart'">
          <div class="widget__content widget__content--3xChart">
            <div class="widget__chart-section">
              <div class="widget__info-container">
                <span class="text-display-4xl-semibold widget__value">{{ value }}</span>
                <span class="text-label-sm-medium widget__label">{{ label }}</span>
              </div>
              <od-widget-pie-chart
                size="lg"
                [segments]="chartSegments"
                [total]="chartTotal"
              ></od-widget-pie-chart>
            </div>
            <div class="widget__data-section">
              <od-widget-metric-row
                *ngFor="let row of rows"
                [label]="row.label"
                [value]="row.value"
                [showIndicator]="true"
                [indicatorColor]="row.indicatorColor || ''"
              ></od-widget-metric-row>
            </div>
          </div>
        </ng-template>

        <!-- 3xCta: call-to-action link row list -->
        <ng-template ngSwitchCase="'3xCta'">
          <div class="widget__content widget__content--3xCta">
            <od-widget-cta-row
              *ngFor="let row of ctaRows"
              [label]="row.label"
            ></od-widget-cta-row>
          </div>
        </ng-template>

      </div>

      <!-- ─── Footer "Go to" link — shown for 2x / 3x / 3xChart when wired ─ -->
      <ng-container *ngIf="variant !== '1x' && variant !== '3xCta' && goToLabel && goToClicked.observed">
        <button
          type="button"
          class="btn btn--link btn--sm widget__goto"
          (click)="goToClicked.emit()"
        >
          {{ goToLabel }}
          <!-- Arrow right icon -->
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </ng-container>

    </div>
  `,
})
export class WidgetComponent {
  /** Layout variant. Determines which content template is rendered. */
  @Input() variant: WidgetVariant = '1x';

  /** Widget title shown in the header. */
  @Input() title = '';

  /** Whether to render the drag-grip handle in the header. */
  @Input() showGrip = false;

  /** Primary metric value (1x, 2x, 3xChart). */
  @Input() value = '';

  /** Metric label / description below the value. */
  @Input() label = '';

  /** Percentage text shown as pie chart center label (2x). */
  @Input() percentage = '';

  /** Metric rows for 3x and 3xChart variants. */
  @Input() rows: WidgetMetricRow[] = [];

  /** Call-to-action rows for 3xCta variant. */
  @Input() ctaRows: WidgetCtaRowData[] = [];

  /** Pie chart segments for 2x and 3xChart variants. */
  @Input() chartSegments: WidgetChartSegment[] = [];

  /** Optional explicit denominator for the pie chart. Defaults to segment sum. */
  @Input() chartTotal: number | null = null;

  /** Whether the pie chart is shown (2x variant only). */
  @Input() showChart = true;

  /** Label for the footer "go to" link button. */
  @Input() goToLabel = '';

  /**
   * Edit mode: forces grip on, shows remove button wired to `removeClicked`,
   * and adds the `widget--edit-mode` modifier class.
   */
  @Input() editMode = false;

  /** Emitted when the header close button is clicked (normal mode). */
  @Output() closeClicked = new EventEmitter<void>();

  /** Emitted when the footer "go to" button is clicked. */
  @Output() goToClicked = new EventEmitter<void>();

  /** Emitted when the header close button is clicked in edit mode. */
  @Output() removeClicked = new EventEmitter<void>();

  get hostClasses(): string {
    return [
      'widget',
      `widget--${this.variant}`,
      this.editMode ? 'widget--edit-mode' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  get titleClasses(): string {
    if (this.variant === '1x') return 'widget__title text-label-xs-medium';
    if (this.variant === '2x') return 'widget__title text-label-sm-medium';
    return 'widget__title text-heading-lg-medium'; // 3x / 3xChart / 3xCta
  }
}
