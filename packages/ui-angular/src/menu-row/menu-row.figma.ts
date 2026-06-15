import figma, { html } from '@figma/code-connect';

// ─── MenuRow ──────────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1973-87
// Reference: packages/ui/src/MenuRow.figma.tsx (read-only — not imported)
// Visual states (Default / Hover / Pressed) are CSS pseudo-classes at runtime;
// all three Figma variants resolve to the same Angular snippet.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1973-87',
  {
    imports: ["import { MenuRowComponent } from '@odyssey/ui-angular'"],
    props: {
      label: figma.string('Label'),
    },
    example: ({ label }) =>
      html`<od-menu-row label="${label}" (clicked)="onRow($event)"></od-menu-row>`,
  },
);
