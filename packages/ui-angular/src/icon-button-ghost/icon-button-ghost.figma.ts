import figma, { html } from '@figma/code-connect';

// ─── IconButtonGhost ──────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 2138-304
// Reference: packages/ui/src/IconButtonGhost.figma.tsx (read-only — not imported)
// State (Idle | Hover | Pressed) is CSS-driven via :hover / :active.
// No Angular prop needed — the snippet shows the static structure.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2138-304',
  {
    imports: ["import { IconButtonGhostComponent } from '@odyssey/ui-angular'"],
    props: {},
    example: () =>
      html`<od-icon-button-ghost ariaLabel="Action" (clicked)="onAction($event)">
  <!-- icon goes here -->
</od-icon-button-ghost>`,
  },
);
