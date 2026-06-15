import figma, { html } from '@figma/code-connect';

// ─── EmptyState ───────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 2159-295
// Reference: packages/ui/src/EmptyState.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2159-295',
  {
    imports: ["import { EmptyStateComponent } from '@odyssey/ui-angular'"],
    props: {
      message: figma.string('Message'),
    },
    example: ({ message }) =>
      html`<od-empty-state message="${message}">
  <!-- <lucide-icon slot="icon" name="search"></lucide-icon> -->
</od-empty-state>`,
  },
);
