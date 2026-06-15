import figma, { html } from '@figma/code-connect';

// ─── GlobalSearch (Search mode) ───────────────────────────────────────────────
// Figma node: Design-System---MCP › 658-18
// Reference: packages/ui/src/GlobalSearch.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18',
  {
    imports: ["import { GlobalSearchComponent } from '@odyssey/ui-angular'"],
    variant: { State: 'Default' },
    props: {
      placeholder: figma.string('Placeholder'),
    },
    example: ({ placeholder }) =>
      html`<od-global-search
  mode="search"
  placeholder="${placeholder}"
  (valueChange)="onSearch($event)"
  (cleared)="onClear()"
></od-global-search>`,
  },
);

// ─── GlobalSearch (Focused state — same props as Default) ─────────────────────
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18',
  {
    imports: ["import { GlobalSearchComponent } from '@odyssey/ui-angular'"],
    variant: { State: 'Focused' },
    example: () =>
      html`<od-global-search
  mode="search"
  (valueChange)="onSearch($event)"
  (cleared)="onClear()"
></od-global-search>`,
  },
);

// ─── GlobalSearch (Title mode) ────────────────────────────────────────────────
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18',
  {
    imports: ["import { GlobalSearchComponent } from '@odyssey/ui-angular'"],
    variant: { State: 'Title' },
    props: {
      title: figma.string('Title'),
    },
    example: ({ title }) =>
      html`<od-global-search mode="title" title="${title}"></od-global-search>`,
  },
);
