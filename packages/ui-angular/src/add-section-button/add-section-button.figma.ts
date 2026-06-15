import figma, { html } from '@figma/code-connect';

// ─── AddSectionButton ─────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 2210-302
// Reference: packages/ui/src/AddSectionButton.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2210-302',
  {
    imports: ["import { AddSectionButtonComponent } from '@odyssey/ui-angular'"],
    example: () =>
      html`<od-add-section-button (clicked)="onAddSection($event)"></od-add-section-button>`,
  },
);
