import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * SectionHeaderComponent — molecule. Two-row section header.
 *
 * Row 1: H2 title on the left, optional supporting text on the right (e.g. a
 * "Last update" timestamp). Row 2: optional actions projected via ng-content.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1696-49
 *
 * Usage:
 *   <od-section-header title="Overview" supportingText="Updated 2 min ago">
 *   </od-section-header>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-section-header',
  encapsulation: ViewEncapsulation.None,
  template: `
    <header [class]="hostClasses">
      <div class="section-header__row">
        <h2 class="section-header__title text-heading-2xl-semibold">{{ title }}</h2>
        <span *ngIf="supportingText" class="section-header__supporting text-label-sm-regular">
          {{ supportingText }}
        </span>
      </div>
      <ng-content />
    </header>
  `,
})
export class SectionHeaderComponent {
  /** Section title displayed as an H2. */
  @Input() title = '';

  /** Optional supporting text displayed on the right (e.g. timestamp). */
  @Input() supportingText = '';

  get hostClasses(): string {
    return 'section-header';
  }
}
