import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * MatchRowComponent — molecule. One result row in the GlobalSearch `ResultsPreview` panel.
 *
 * Layout: 40×40 avatar (gray surface, slotted icon) · a main line with the match ID
 * (semibold) + route on the left and a source badge on the right · a meta line of
 * Customer | Carrier | BOL cells separated by vertical dividers.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2460-2
 *
 * Usage:
 *   <od-match-row
 *     matchId="M-001"
 *     route="Chicago → Dallas"
 *     customer="Acme Corp"
 *     carrier="FastFreight"
 *     bol="BOL-999"
 *     sourceLabel="FourKites, Inc."
 *     sourceVariant="blue"
 *     (clicked)="onRowClick($event)"
 *   >
 *     <lucide-icon slot="icon" name="package"></lucide-icon>
 *   </od-match-row>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-match-row',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClasses" (click)="clicked.emit($event)" role="button" tabindex="0">
      <div class="match-row__avatar" aria-hidden="true">
        <ng-content select="[slot=icon]" />
      </div>

      <div class="match-row__body">
        <div class="match-row__route">
          <span class="match-row__route-text text-label-xs-regular">
            <span class="text-label-xs-semibold">{{ matchId }}</span>
            <span *ngIf="route">&nbsp;{{ route }}</span>
          </span>
          <span [class]="sourceBadgeClasses">{{ sourceLabel }}</span>
        </div>

        <div class="match-row__meta text-label-xs-regular">
          <span class="match-row__meta-cell match-row__meta-cell--divider">
            <span>Customer:</span>
            <span>{{ customer }}</span>
          </span>
          <span class="match-row__meta-cell match-row__meta-cell--divider">
            <span>Carrier:</span>
            <span>{{ carrier }}</span>
          </span>
          <span [class]="bolCellClasses">
            <span>BOL:</span>
            <span>{{ bol }}</span>
          </span>
          <span *ngIf="shipmentId" class="match-row__meta-cell">
            <span>Shipment #:</span>
            <span>{{ shipmentId }}</span>
          </span>
        </div>
      </div>
    </div>
  `,
})
export class MatchRowComponent {
  /** Unique match identifier shown in bold on the main line. */
  @Input() matchId = '';

  /** Route description shown next to the match ID. */
  @Input() route = '';

  /** Customer name shown in the meta line. */
  @Input() customer = '';

  /** Carrier name shown in the meta line. */
  @Input() carrier = '';

  /** Bill of Lading number shown in the meta line. */
  @Input() bol = '';

  /** Optional shipment ID shown in the meta line after BOL. */
  @Input() shipmentId = '';

  /** Label text for the source badge. */
  @Input() sourceLabel = 'FourKites, Inc.';

  /** Variant for the source badge — maps to `badge--blue` or `badge--purple`. */
  @Input() sourceVariant: 'blue' | 'purple' = 'blue';

  /** Emitted when the row is clicked. */
  @Output() clicked = new EventEmitter<MouseEvent>();

  get hostClasses(): string {
    return 'match-row';
  }

  get sourceBadgeClasses(): string {
    return `match-row__source badge badge--${this.sourceVariant}`;
  }

  get bolCellClasses(): string {
    return this.shipmentId
      ? 'match-row__meta-cell match-row__meta-cell--divider'
      : 'match-row__meta-cell';
  }
}
