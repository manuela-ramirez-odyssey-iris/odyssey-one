import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SectionLabelMode = 'default' | 'edit';

/**
 * SectionLabelComponent — atom. Header row for a widget section on Home.
 *
 * Two modes mirror the Figma `Mode` axis:
 * - `default` — transparent surface, label only.
 * - `edit` — DSN/100 surface, label + edit (pencil) + delete (trash) actions.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2198-308
 *
 * Usage:
 *   <od-section-label label="My Section"></od-section-label>
 *   <od-section-label label="My Section" mode="edit"
 *     (editClicked)="onEdit()" (deleteClicked)="onDelete()">
 *   </od-section-label>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-section-label',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClasses">
      <span class="section-label__text text-label-sm-medium">{{ label }}</span>
      <div *ngIf="isEdit" class="section-label__actions">
        <button
          type="button"
          class="icon-action section-label__action"
          (click)="editClicked.emit()"
          aria-label="Rename section"
        >
          <!-- pencil icon — consumer supplies via global tokens SVG sprite or lucide -->
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </button>
        <button
          type="button"
          class="icon-action section-label__action"
          (click)="deleteClicked.emit()"
          aria-label="Delete section"
        >
          <!-- trash icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class SectionLabelComponent {
  /** Section label text. */
  @Input() label = '';

  /** Display mode — 'default' (label only) or 'edit' (label + action buttons). */
  @Input() mode: SectionLabelMode = 'default';

  /** Emitted when the edit (pencil) button is clicked. */
  @Output() editClicked = new EventEmitter<void>();

  /** Emitted when the delete (trash) button is clicked. */
  @Output() deleteClicked = new EventEmitter<void>();

  get isEdit(): boolean {
    return this.mode === 'edit';
  }

  get hostClasses(): string {
    return [
      'section-label',
      this.isEdit ? 'section-label--edit' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
}
