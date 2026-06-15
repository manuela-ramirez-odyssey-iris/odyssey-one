import figma, { html } from '@figma/code-connect';

// ─── SidebarButton ────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 514-2479
// Reference: packages/ui/src/SidebarButton.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=514-2479',
  {
    imports: ["import { SidebarButtonComponent } from '@odyssey/ui-angular'"],
    props: {
      state: figma.enum('State', {
        Default: 'default',
        Hover: 'hover',
        Selected: 'selected',
      }),
    },
    example: ({ state }) =>
      html`<od-sidebar-button state="${state}">
  <!-- icon -->
</od-sidebar-button>`,
  },
);
