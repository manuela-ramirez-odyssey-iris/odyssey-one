import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetComponent } from '../widget/widget.component';

export type WidgetPickerVariant = '1x' | '2x' | '3x' | '3xChart';

const VARIANTS: WidgetPickerVariant[] = ['1x', '2x', '3x', '3xChart'];
const VARIANT_LABELS: Record<WidgetPickerVariant, string> = {
  '1x': 'Small',
  '2x': 'Wide',
  '3x': 'Tall',
  '3xChart': 'Tall with chart',
};

/**
 * WidgetVariantPickerComponent — organism. Centered Widget preview at the
 * selected variant, flanked by chevron arrows for stepping through, a label,
 * and a dots indicator (also clickable).
 *
 * Mirrors the React `WidgetVariantPicker` component in packages/ui.
 * Figma node: 2005-554
 *
 * Usage:
 *   <od-widget-variant-picker
 *     variant="1x"
 *     (variantChange)="currentVariant = $event"
 *   />
 */
@Component({
  standalone: true,
  imports: [CommonModule, WidgetComponent],
  selector: 'od-widget-variant-picker',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="widget-variant-picker" [attr.data-variant]="variant">
      <button
        type="button"
        class="widget-variant-picker__arrow"
        (click)="goPrev()"
        aria-label="Previous variant"
      >
        <!-- ChevronLeft -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        ><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <div class="widget-variant-picker__info">
        <div class="widget-variant-picker__main">
          <od-widget [variant]="variant" [showGrip]="true" />
        </div>
        <div class="widget-variant-picker__dots-container">
          <span class="text-label-xs-regular widget-variant-picker__label">
            {{ variantLabel }}
          </span>
          <div
            class="widget-variant-picker__dots"
            role="tablist"
            aria-label="Widget size variants"
          >
            <button
              *ngFor="let v of variants"
              type="button"
              role="tab"
              [attr.aria-selected]="v === variant"
              [class]="dotClass(v)"
              (click)="selectVariant(v)"
              [attr.aria-label]="variantLabels[v] + ' variant'"
            ></button>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="widget-variant-picker__arrow"
        (click)="goNext()"
        aria-label="Next variant"
      >
        <!-- ChevronRight -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        ><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  `,
})
export class WidgetVariantPickerComponent {
  /** Currently active variant. */
  @Input() variant: WidgetPickerVariant = '1x';

  /** Emitted when the user selects a different variant via arrows or dots. */
  @Output() variantChange = new EventEmitter<WidgetPickerVariant>();

  readonly variants = VARIANTS;
  readonly variantLabels = VARIANT_LABELS;

  get variantLabel(): string {
    return VARIANT_LABELS[this.variant] ?? '';
  }

  dotClass(v: WidgetPickerVariant): string {
    return [
      'widget-variant-picker__dot',
      v === this.variant ? 'widget-variant-picker__dot--active' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  goPrev(): void {
    const idx = VARIANTS.indexOf(this.variant);
    const next = (idx - 1 + VARIANTS.length) % VARIANTS.length;
    this.variantChange.emit(VARIANTS[next]);
  }

  goNext(): void {
    const idx = VARIANTS.indexOf(this.variant);
    const next = (idx + 1) % VARIANTS.length;
    this.variantChange.emit(VARIANTS[next]);
  }

  selectVariant(v: WidgetPickerVariant): void {
    this.variantChange.emit(v);
  }
}
