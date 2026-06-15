import figma, { html } from '@figma/code-connect';

// ─── SectionHeader ────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1696-49
// Reference: packages/ui/src/SectionHeader.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1696-49',
  {
    imports: ["import { SectionHeaderComponent } from '@odyssey/ui-angular'"],
    props: {
      title: figma.string('Title'),
      supportingText: figma.string('Supporting Text'),
    },
    example: ({ title, supportingText }) =>
      html`<od-section-header
  title="${title}"
  supportingText="${supportingText}"
></od-section-header>`,
  },
);
