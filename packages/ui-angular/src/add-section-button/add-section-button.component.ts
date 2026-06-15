import { Component, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * AddSectionButtonComponent — atom. Prominent "add new section" affordance
 * shown at the bottom of all sections in Home edit mode.
 *
 * Visual: full-width row with a decorative top border line and a centred pill
 * that straddles it. The pill is the interactive element.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2210-302
 *
 * Usage:
 *   <od-add-section-button (clicked)="addSection($event)">
 *     Add Section
 *   </od-add-section-button>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-add-section-button',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="add-section-btn">
      <button
        type="button"
        class="add-section-btn__pill"
        (click)="clicked.emit($event)"
        aria-label="Add section"
      >
        <!-- plus icon -->
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14"/>
          <path d="M12 5v14"/>
        </svg>
        <ng-content />
      </button>
    </div>
  `,
})
export class AddSectionButtonComponent {
  /** Emitted when the pill button is clicked. */
  @Output() clicked = new EventEmitter<MouseEvent>();
}
