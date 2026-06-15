import figma, { html } from '@figma/code-connect';

// ─── SectionLabel ─────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 2198-308
// Reference: packages/ui/src/SectionLabel.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2198-308',
  {
    imports: ["import { SectionLabelComponent } from '@odyssey/ui-angular'"],
    props: {
      label: figma.string('Label'),
      mode: figma.enum('Mode', {
        Default: 'default',
        Edit: 'edit',
      }),
    },
    example: ({ label, mode }) =>
      html`<od-section-label
  label="${label}"
  mode="${mode}"
  (editClicked)="onEdit()"
  (deleteClicked)="onDelete()"
></od-section-label>`,
  },
);
