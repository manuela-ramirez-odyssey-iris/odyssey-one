import figma, { html } from '@figma/code-connect';

// ─── EntityChip ───────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1716-60
// Reference: packages/ui/src/EntityChip.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1716-60',
  {
    imports: ["import { EntityChipComponent } from '@odyssey/ui-angular'"],
    props: {
      name: figma.string('Entity name'),
      showAddButton: figma.boolean('Show add button'),
    },
    example: ({ name, showAddButton }) =>
      html`<od-entity-chip
  name="${name}"
  [count]="4"
  [showAddButton]="${showAddButton}"
  (addClicked)="onAddEntity()"
></od-entity-chip>`,
  },
);
