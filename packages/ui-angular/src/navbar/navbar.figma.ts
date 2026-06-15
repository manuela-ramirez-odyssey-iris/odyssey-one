import figma, { html } from '@figma/code-connect';

// ─── Navbar ───────────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1661-206
// Reference: packages/ui/src/Navbar.figma.tsx (read-only — not imported)
// `compact` shortens vertical padding so the bar stays balanced in editor mode.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1661-206',
  {
    imports: ["import { NavbarComponent } from '@odyssey/ui-angular'"],
    props: {
      compact: figma.boolean('Compact', { true: true, false: false }),
    },
    example: ({ compact }) =>
      html`<od-navbar [compact]="${compact}">
  <!-- slot="lead": place od-lead-nav here -->
  <!-- slot="search": place od-global-search here -->
  <!-- slot="trail": place od-trail-nav here -->
</od-navbar>`,
  },
);
