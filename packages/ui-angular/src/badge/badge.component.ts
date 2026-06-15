import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant =
  | 'amber'
  | 'blue'
  | 'green'
  | 'red'
  | 'purple'
  | 'gray'
  | 'notification'
  | 'count'
  | 'metric'
  | 'favorite';

const VALID_VARIANTS: BadgeVariant[] = [
  'amber',
  'blue',
  'green',
  'red',
  'purple',
  'gray',
  'notification',
  'count',
  'metric',
  'favorite',
];

/**
 * BadgeComponent — atom. Renders a coloured badge with optional status dot and icon slots.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=213-27
 *
 * Usage:
 *   <od-badge variant="blue">Active</od-badge>
 *   <od-badge variant="metric" >42</od-badge>
 *   <od-badge variant="blue" [statusDot]="true">Live</od-badge>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-badge',
  encapsulation: ViewEncapsulation.None,
  template: `
    <span [class]="hostClasses">
      <span *ngIf="statusDot" class="badge__dot"></span>

      <span *ngIf="hasLeftIcon" class="badge__icon badge__icon--left">
        <ng-content select="[slot=leftIcon]" />
      </span>

      <ng-content />

      <span *ngIf="hasRightIcon" class="badge__icon badge__icon--right">
        <ng-content select="[slot=rightIcon]" />
      </span>
    </span>
  `,
})
export class BadgeComponent {
  /** Visual colour variant of the badge. Defaults to 'blue'. */
  @Input() variant: BadgeVariant = 'blue';

  /** When true, renders a small pulsing dot before the content. */
  @Input() statusDot = false;

  /** Whether a left icon is projected via slot="leftIcon". */
  @Input() hasLeftIcon = false;

  /** Whether a right icon is projected via slot="rightIcon". */
  @Input() hasRightIcon = false;

  get hostClasses(): string {
    const safeVariant: BadgeVariant = VALID_VARIANTS.includes(this.variant)
      ? this.variant
      : 'blue';
    const isMetric = safeVariant === 'metric';
    return [
      isMetric ? 'badge-metric' : 'badge',
      isMetric ? null : `badge--${safeVariant}`,
      isMetric ? null : 'text-badge',
    ]
      .filter(Boolean)
      .join(' ');
  }
}
