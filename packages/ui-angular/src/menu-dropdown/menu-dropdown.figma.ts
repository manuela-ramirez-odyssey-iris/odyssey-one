import figma, { html } from '@figma/code-connect';

// ─── MenuDropdown ─────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1981-79
// Reference: packages/ui/src/MenuDropdown.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1981-79',
  {
    imports: ["import { MenuDropdownComponent, MenuRowComponent } from '@odyssey/ui-angular'"],
    props: {
      title: figma.string('Title'),
      expanded: figma.boolean('Expanded', {
        true: true,
        false: false,
      }),
    },
    example: ({ title, expanded }) =>
      html`<od-menu-dropdown title="${title}" [expanded]="${expanded}" (toggled)="onToggle()">
  <od-menu-row label="Total Orders"></od-menu-row>
</od-menu-dropdown>`,
  },
);
