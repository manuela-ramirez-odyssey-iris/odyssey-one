import figma, { html } from '@figma/code-connect';

// ─── PageHeader ───────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1693-49
// Reference: packages/ui/src/PageHeader.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1693-49',
  {
    imports: ["import { PageHeaderComponent } from '@odyssey/ui-angular'"],
    props: {
      title: figma.string('Title'),
    },
    example: ({ title }) =>
      html`<od-page-header title="${title}"></od-page-header>`,
  },
);
