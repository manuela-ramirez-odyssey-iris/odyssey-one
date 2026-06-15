import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TrailNavMode = 'profile' | 'editor';

/**
 * TrailNavComponent — molecule. Right side of the application navbar.
 *
 * In `mode='profile'` it shows notification bell, avatar, name/role, and chevron.
 * In `mode='editor'` it shows primary/secondary action buttons plus help and close icons.
 *
 * Source Figma node: https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1565-648
 *
 * Usage — profile:
 *   <od-trail-nav mode="profile" name="Jane Doe" role="Admin" [showNotification]="true">
 *     <img slot="avatar" src="/avatar.png" alt="Jane Doe" />
 *   </od-trail-nav>
 *
 * Usage — editor:
 *   <od-trail-nav mode="editor" [showPrimaryButton]="true" [showSecondaryButton]="true">
 *   </od-trail-nav>
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'od-trail-nav',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClasses">

      <!-- Profile mode -->
      <ng-container *ngIf="mode === 'profile'">
        <div class="trail-nav__notifications">
          <button
            type="button"
            class="trail-nav__bell"
            aria-label="Notifications"
          >
            <!-- bell icon -->
            <span *ngIf="showNotification" class="trail-nav__badge">
              {{ notificationCount > 0 ? notificationCount : '' }}
            </span>
          </button>
        </div>

        <div class="trail-nav__profile-section">
          <button
            type="button"
            class="trail-nav__profile"
            aria-label="User menu"
            (click)="profileClicked.emit($event)"
          >
            <span class="trail-nav__avatar">
              <ng-content select="[slot=avatar]" />
            </span>
            <span class="trail-nav__identity">
              <span class="trail-nav__name text-label-sm-medium">{{ name }}</span>
              <span class="trail-nav__role">{{ role }}</span>
            </span>
            <span class="trail-nav__chevron">
              <ng-content select="[slot=chevron]" />
            </span>
          </button>
        </div>
      </ng-container>

      <!-- Editor mode -->
      <ng-container *ngIf="mode === 'editor'">
        <div class="trail-nav__actions">
          <button
            *ngIf="showPrimaryButton"
            type="button"
            class="trail-nav__btn trail-nav__btn--primary btn btn--ghost btn--lg"
          >
            Cancel
          </button>
          <button
            *ngIf="showSecondaryButton"
            type="button"
            class="trail-nav__btn trail-nav__btn--secondary btn btn--outline btn--lg"
          >
            Save
          </button>
        </div>
        <div class="trail-nav__icons">
          <button
            *ngIf="showHelpIcon"
            type="button"
            class="trail-nav__icon-btn"
            aria-label="Help"
          >
            <!-- help icon -->
          </button>
          <button
            *ngIf="showRightIcon"
            type="button"
            class="trail-nav__icon-btn"
            aria-label="Close"
          >
            <ng-content select="[slot=rightIcon]" />
          </button>
        </div>
      </ng-container>

    </div>
  `,
})
export class TrailNavComponent {
  /** Display mode — 'profile' shows user info, 'editor' shows action buttons. */
  @Input() mode: TrailNavMode = 'profile';

  /** User display name (profile mode). */
  @Input() name = '';

  /** User role / subtitle (profile mode). */
  @Input() role = '';

  /** Whether to show the notification badge (profile mode). */
  @Input() showNotification = false;

  /** Number shown in the notification badge (profile mode). */
  @Input() notificationCount = 0;

  /** Whether to show the primary (Cancel) button (editor mode). */
  @Input() showPrimaryButton = true;

  /** Whether to show the secondary (Save) button (editor mode). */
  @Input() showSecondaryButton = true;

  /** Whether to show the help icon (editor mode). */
  @Input() showHelpIcon = true;

  /** Whether to show the right/close icon (editor mode). */
  @Input() showRightIcon = true;

  /** Emitted when the profile button is clicked (profile mode). */
  @Output() profileClicked = new EventEmitter<MouseEvent>();

  get hostClasses(): string {
    return ['trail-nav', `trail-nav--${this.mode}`].join(' ');
  }
}
