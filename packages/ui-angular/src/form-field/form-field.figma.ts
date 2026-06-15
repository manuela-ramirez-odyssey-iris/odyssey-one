import figma, { html } from '@figma/code-connect';

// ─── FormField ────────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 2255-98
// Reference: packages/ui/src/FormField.figma.tsx (read-only — not imported)
// State=Default|Focus map to default rendering (focus is a CSS :focus-within state);
// State=Error maps to a non-empty error message; State=Locked sets locked=true.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2255-98',
  {
    imports: ["import { FormFieldComponent } from '@odyssey/ui-angular'"],
    props: {
      label: figma.string('Label'),
      placeholder: figma.string('Placeholder'),
      locked: figma.enum('State', {
        Default: false,
        Error: false,
        Locked: true,
      }),
    },
    example: ({ label, placeholder, locked }) =>
      html`<od-form-field
  label="${label}"
  placeholder="${placeholder}"
  [locked]="${locked}"
  value=""
  (valueChange)="onValueChange($event)"
></od-form-field>`,
  },
);
