import figma, { html } from '@figma/code-connect';

// ─── AddSectionDivider ────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 2203-297
// Reference: packages/ui/src/AddSectionDivider.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2203-297',
  {
    imports: ["import { AddSectionDividerComponent } from '@odyssey/ui-angular'"],
    props: {
      label: figma.string('Label'),
    },
    example: ({ label }) =>
      html`<od-add-section-divider label="${label}"></od-add-section-divider>`,
  },
);
