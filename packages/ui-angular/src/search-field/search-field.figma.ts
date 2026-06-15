import figma, { html } from '@figma/code-connect';

// ─── SearchField ──────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1959-76
// Reference: packages/ui/src/SearchField.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1959-76',
  {
    imports: ["import { SearchFieldComponent } from '@odyssey/ui-angular'"],
    props: {
      showLabel: figma.boolean('Show label', {
        true: true,
        false: false,
      }),
      placeholder: figma.string('Placeholder'),
      label: figma.string('Label'),
    },
    example: ({ showLabel, placeholder, label }) =>
      html`<od-search-field
  [showLabel]="${showLabel}"
  placeholder="${placeholder}"
  label="${label}"
  value=""
  (valueChange)="onSearch($event)"
  (cleared)="onClear()"
></od-search-field>`,
  },
);
