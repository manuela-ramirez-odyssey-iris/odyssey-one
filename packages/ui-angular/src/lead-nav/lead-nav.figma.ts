import figma, { html } from '@figma/code-connect';

// ─── LeadNav ──────────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 639-564
// Reference: packages/ui/src/LeadNav.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=639-564',
  {
    imports: ["import { LeadNavComponent } from '@odyssey/ui-angular'"],
    example: () =>
      html`<od-lead-nav>
  <od-odyssey-logo slot="logo"></od-odyssey-logo>
</od-lead-nav>`,
  },
);
