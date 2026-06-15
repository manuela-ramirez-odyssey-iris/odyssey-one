import {
  Component,
  Input,
  OnInit,
  OnChanges,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PieSegment {
  value: number;
  color: string;
}

interface ComputedSegment {
  color: string;
  dasharray: string;
  dashoffset: number;
  transform: string;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 263.89

/**
 * WidgetPieChartComponent — molecule. SVG donut chart used inside Widget variants.
 * Segments grow in via CSS transition after mount (`animatedIn` flag).
 * Sizes: md = 96px (viewBox 100), lg = 128px (viewBox 100).
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1881-77
 *
 * Usage:
 *   <od-widget-pie-chart
 *     size="md"
 *     [showCenterText]="true"
 *     centerText="42%"
 *     [segments]="[{ value: 42, color: 'var(--chart-1)' }, { value: 58, color: 'var(--chart-2)' }]"
 *   ></od-widget-pie-chart>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-widget-pie-chart',
  encapsulation: ViewEncapsulation.None,
  template: `
    <span [class]="hostClasses" [style.width.px]="px" [style.height.px]="px">
      <svg [attr.viewBox]="'0 0 ' + viewBoxSize + ' ' + viewBoxSize" [attr.width]="px" [attr.height]="px">
        <!-- Rest/background ring -->
        <circle
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="RADIUS"
          fill="none"
          stroke="var(--chart-rest)"
          [attr.stroke-width]="strokeWidth"
        />
        <!-- Data segments -->
        <circle
          *ngFor="let seg of computedSegments"
          class="widget-pie-chart__segment"
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="RADIUS"
          fill="none"
          [attr.stroke]="seg.color"
          [attr.stroke-width]="strokeWidth"
          [attr.stroke-dasharray]="seg.dasharray"
          [attr.stroke-dashoffset]="seg.dashoffset"
          [attr.transform]="seg.transform"
        />
      </svg>
      <span
        *ngIf="showCenterText && centerText"
        class="widget-pie-chart__center text-display-3xl-semibold"
      >{{ centerText }}</span>
    </span>
  `,
})
export class WidgetPieChartComponent implements OnInit, OnChanges {
  /** Chart size variant. md = 96px, lg = 128px. */
  @Input() size: 'md' | 'lg' = 'md';

  /** Text to display in the donut center. */
  @Input() centerText = '';

  /** Whether to display center text. */
  @Input() showCenterText = false;

  /** Array of chart segments, each with a value and CSS color. */
  @Input() segments: PieSegment[] = [];

  /** Optional denominator; defaults to sum of segment values. */
  @Input() total: number | null = null;

  /** Optional animation delay in milliseconds. */
  @Input() delayMs = 0;

  animatedIn = false;

  readonly RADIUS = RADIUS;
  readonly CIRCUMFERENCE = CIRCUMFERENCE;
  readonly viewBoxSize = 100;

  get px(): number {
    return this.size === 'lg' ? 128 : 96;
  }

  get center(): number {
    return this.viewBoxSize / 2;
  }

  get strokeWidth(): number {
    return this.viewBoxSize * 0.18;
  }

  get hostClasses(): string {
    return ['widget-pie-chart', `widget-pie-chart--${this.size}`]
      .join(' ');
  }

  get computedSegments(): ComputedSegment[] {
    const segmentSum = this.segments.reduce((s, seg) => s + (seg.value || 0), 0);
    const denominator = this.total ?? segmentSum || 1;
    let offset = 0;
    return this.segments.map((seg) => {
      const length = (seg.value / denominator) * CIRCUMFERENCE;
      const dasharray = this.animatedIn
        ? `${length} ${CIRCUMFERENCE - length}`
        : `0 ${CIRCUMFERENCE}`;
      const segOffset = -(offset / denominator) * CIRCUMFERENCE;
      offset += seg.value;
      return {
        color: seg.color,
        dasharray,
        dashoffset: segOffset,
        transform: `rotate(-90 ${this.center} ${this.center})`,
      };
    });
  }

  ngOnInit(): void {
    this.scheduleAnimation();
  }

  ngOnChanges(): void {
    // Reset and re-animate when segments change
    this.animatedIn = false;
    this.scheduleAnimation();
  }

  private scheduleAnimation(): void {
    if (this.delayMs > 0) {
      setTimeout(() => (this.animatedIn = true), this.delayMs);
    } else {
      requestAnimationFrame(() => (this.animatedIn = true));
    }
  }
}
