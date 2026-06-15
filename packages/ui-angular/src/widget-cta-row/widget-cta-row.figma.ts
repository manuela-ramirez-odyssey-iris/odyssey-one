import figma, { html } from '@figma/code-connect';

// ─── WidgetCtaRow ─────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1927-84
// Reference: packages/ui/src/WidgetCtaRow.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1927-84',
  {
    imports: ["import { WidgetCtaRowComponent } from '@odyssey/ui-angular'"],
    props: {
      label: figma.string('Label'),
    },
    example: ({ label }) =>
      html`<od-widget-cta-row label="${label}" (clicked)="onCta($event)">
  <lucide-icon slot="icon" name="package"></lucide-icon>
</od-widget-cta-row>`,
  },
);
