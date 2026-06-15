import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * AddSectionDividerComponent — atom. Purely decorative row separator that
 * announces the start of the "to be added" section in Home edit mode.
 * Sits directly above the AddSectionButton.
 *
 * NOT a button. No hover/active states. No click output.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2203-297
 *
 * Usage:
 *   <od-add-section-divider label="Add Section"></od-add-section-divider>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-add-section-divider',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="add-section-divider" role="separator" [attr.aria-label]="label">
      <span class="add-section-divider__label text-label-sm-medium">{{ label }}</span>
    </div>
  `,
})
export class AddSectionDividerComponent {
  /** Label text shown alongside the divider. */
  @Input() label = '';
}
