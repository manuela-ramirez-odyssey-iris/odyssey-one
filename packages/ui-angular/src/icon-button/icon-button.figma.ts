import figma, { html } from '@figma/code-connect';

// ─── IconButton ───────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1754-295
// Reference: packages/ui/src/IconButton.figma.tsx (read-only — not imported)
// State variants (Idle / Hover / Pressed) are CSS-driven at runtime via
// :hover / :active — no Angular prop change needed.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1754-295',
  {
    imports: ["import { IconButtonComponent } from '@odyssey/ui-angular'"],
    props: {},
    example: () =>
      html`<od-icon-button ariaLabel="Action">
  <!-- icon goes here -->
</od-icon-button>`,
  },
);
