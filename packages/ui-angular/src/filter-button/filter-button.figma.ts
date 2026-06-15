import figma, { html } from '@figma/code-connect';

// ─── FilterButton ─────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 2347-325
// Reference: packages/ui/src/FilterButton.figma.tsx (read-only — not imported)
// State variants: Default / Hover / Pressed map to CSS pseudo-classes.
// Active = drawer-open (the `active` prop = true).
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2347-325',
  {
    imports: ["import { FilterButtonComponent } from '@odyssey/ui-angular'"],
    props: {
      active: figma.enum('State', {
        Default: false,
        Hover: false,
        Pressed: false,
        Active: true,
      }),
    },
    example: ({ active }) =>
      html`<od-filter-button [active]="${active}" (clicked)="onFilter($event)">
  Filter
</od-filter-button>`,
  },
);
