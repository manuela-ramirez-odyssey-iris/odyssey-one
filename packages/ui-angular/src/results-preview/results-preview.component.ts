import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchRowComponent } from '../match-row/match-row.component';
import { ButtonComponent } from '../button/button.component';

export interface ResultsPreviewMatch {
  matchId: string;
  route: string;
  customer: string;
  carrier: string;
  bol: string;
  shipmentId?: string;
  sourceLabel?: string;
  sourceVariant?: 'blue' | 'purple';
}

/**
 * ResultsPreviewComponent — organism. The "Best Match" preview panel that
 * drops below the GlobalSearch bar once filter criteria are committed.
 * White rounded panel with a scrollable list of MatchRow results, a filters
 * link, and a footer action bar (Clear all · Show N results).
 *
 * Mirrors the React `ResultsPreview` component in packages/ui.
 * Figma node: 2462-149
 *
 * Usage:
 *   <od-results-preview
 *     title="Best Match"
 *     [matches]="matchList"
 *     (clearClicked)="onClear()"
 *     (showResultsClicked)="onShowResults()"
 *     (filtersClicked)="onFilters()"
 *   />
 */
@Component({
  standalone: true,
  imports: [CommonModule, MatchRowComponent, ButtonComponent],
  selector: 'od-results-preview',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="results-preview">
      <div class="results-preview__body">
        <span *ngIf="title" class="results-preview__title text-label-sm-medium">
          {{ title }}
        </span>
        <div class="results-preview__list">
          <od-match-row
            *ngFor="let m of matches; trackBy: trackMatch"
            [matchId]="m.matchId"
            [route]="m.route"
            [customer]="m.customer"
            [carrier]="m.carrier"
            [bol]="m.bol"
            [shipmentId]="m.shipmentId || ''"
            [sourceLabel]="m.sourceLabel || 'FourKites, Inc.'"
            [sourceVariant]="m.sourceVariant || 'blue'"
            (clicked)="matchClicked.emit(m)"
          />
        </div>
      </div>
      <div class="results-preview__filters">
        <od-button variant="link" size="sm" [hasLeadingIcon]="true" (clicked)="filtersClicked.emit()">
          <svg
            slot="icon"
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
          ><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          {{ filtersLabel }}
        </od-button>
      </div>
      <div class="results-preview__actions">
        <od-button variant="secondary" size="md" (clicked)="clearClicked.emit()">
          Clear all
        </od-button>
        <od-button variant="primary" size="md" (clicked)="showResultsClicked.emit()">
          Show {{ resultCount ?? matches.length }}
          {{ (resultCount ?? matches.length) === 1 ? 'result' : 'results' }}
        </od-button>
      </div>
    </div>
  `,
})
export class ResultsPreviewComponent {
  /** Panel heading. Defaults to 'Best Match'. */
  @Input() title = 'Best Match';

  /** Array of match data to render as MatchRow items. */
  @Input() matches: ResultsPreviewMatch[] = [];

  /** Optional explicit count shown on the "Show N results" button. Falls back to matches.length. */
  @Input() resultCount: number | null = null;

  /** Label for the filters link button. */
  @Input() filtersLabel = 'All Filters';

  /** Emitted when "Clear all" is clicked. */
  @Output() clearClicked = new EventEmitter<void>();

  /** Emitted when "Show N results" is clicked. */
  @Output() showResultsClicked = new EventEmitter<void>();

  /** Emitted when the filters link is clicked. */
  @Output() filtersClicked = new EventEmitter<void>();

  /** Emitted when a match row is clicked; emits the match data. */
  @Output() matchClicked = new EventEmitter<ResultsPreviewMatch>();

  trackMatch(_: number, m: ResultsPreviewMatch): string {
    return m.matchId;
  }
}
