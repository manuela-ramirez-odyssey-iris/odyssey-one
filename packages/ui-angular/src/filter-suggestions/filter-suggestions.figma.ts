import figma, { html } from '@figma/code-connect';

// ─── FilterSuggestions ────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 2400-2
// Reference: packages/ui/src/FilterSuggestions.figma.tsx (read-only — not imported)
// The chip list is data-driven via `items` — not a Figma property. Only the
// section title is editable on the Figma master component.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2400-2',
  {
    imports: ["import { FilterSuggestionsComponent } from '@odyssey/ui-angular'"],
    props: {
      title: figma.string('Title'),
    },
    example: ({ title }) =>
      html`<od-filter-suggestions
  title="${title}"
  [items]="['Status: Delivered', 'Client: Delaware Inc.', 'Carrier: Delaware Logistic Service']"
  (itemSelected)="onFilterSelect($event)"
></od-filter-suggestions>`,
  },
);
