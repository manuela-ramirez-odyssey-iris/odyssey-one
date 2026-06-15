import figma, { html } from '@figma/code-connect';

// ─── TrailNav (Profile mode) ──────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1565-648
// Reference: packages/ui/src/TrailNav.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1565-648',
  {
    imports: ["import { TrailNavComponent } from '@odyssey/ui-angular'"],
    variant: { Mode: 'Profile' },
    props: {
      name: figma.string('Name'),
      role: figma.string('Role'),
      showNotification: figma.boolean('Show notification'),
    },
    example: ({ name, role, showNotification }) =>
      html`<od-trail-nav
  mode="profile"
  name="${name}"
  role="${role}"
  [showNotification]="${showNotification}"
  [notificationCount]="6"
  (profileClicked)="onProfile($event)"
>
  <img slot="avatar" src="/avatar.png" alt="" style="width:32px;height:32px;border-radius:8px;object-fit:cover" />
</od-trail-nav>`,
  },
);

// ─── TrailNav (Editor mode) ───────────────────────────────────────────────────
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1565-648',
  {
    imports: ["import { TrailNavComponent } from '@odyssey/ui-angular'"],
    variant: { Mode: 'Editor' },
    props: {
      showPrimaryButton: figma.boolean('Show button 1'),
      showSecondaryButton: figma.boolean('Show button 2'),
      showHelpIcon: figma.boolean('Show help icon'),
      showRightIcon: figma.boolean('Show close icon'),
    },
    example: ({ showPrimaryButton, showSecondaryButton, showHelpIcon, showRightIcon }) =>
      html`<od-trail-nav
  mode="editor"
  [showPrimaryButton]="${showPrimaryButton}"
  [showSecondaryButton]="${showSecondaryButton}"
  [showHelpIcon]="${showHelpIcon}"
  [showRightIcon]="${showRightIcon}"
></od-trail-nav>`,
  },
);
