import figma, { html } from '@figma/code-connect';

// ─── WidgetsLeftMenu ──────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1961-393
// Reference: packages/ui/src/WidgetsLeftMenu.figma.tsx (read-only — not imported)
// `groups` and `searchValue` are consumer-driven data props, not Figma properties.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1961-393',
  {
    imports: ["import { WidgetsLeftMenuComponent } from '@odyssey/ui-angular'"],
    props: {
      title: figma.string('Title'),
    },
    example: ({ title }) =>
      html`<od-widgets-left-menu
  title="${title}"
  searchValue=""
  [groups]="[]"
  (searchChange)="onSearch($event)"
></od-widgets-left-menu>`,
  },
);
