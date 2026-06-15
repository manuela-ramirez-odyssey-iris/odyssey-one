import figma, { html } from '@figma/code-connect';

// ─── CustomerRow ──────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 2029-461
// Reference: packages/ui/src/CustomerRow.figma.tsx (read-only — not imported)
// Variant axes: Mode=List|Result × Favorite=False|True
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2029-461',
  {
    imports: ["import { CustomerRowComponent } from '@odyssey/ui-angular'"],
    props: {
      mode: figma.enum('Mode', { List: 'list', Result: 'result' }),
      favorite: figma.boolean('Favorite', {
        true: true,
        false: false,
      }),
      label: figma.string('Label'),
    },
    example: ({ mode, favorite, label }) =>
      html`<od-customer-row
  mode="${mode}"
  [favorite]="${favorite}"
  label="${label}"
  (favoriteToggled)="onFavoriteToggle($event)"
  (deleteClicked)="onDelete()"
></od-customer-row>`,
  },
);
