import figma, { html } from '@figma/code-connect';

// ─── WidgetMetricRow ──────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1814-7
// Reference: packages/ui/src/WidgetMetricRow.figma.tsx (read-only — not imported)
// `indicatorColor` is consumer-driven (chart-N token) and not exposed as a Figma
// property — designers override per-instance to a Chart/* token.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1814-7',
  {
    imports: ["import { WidgetMetricRowComponent } from '@odyssey/ui-angular'"],
    props: {
      label: figma.string('Label'),
      value: figma.string('Value'),
      showIndicator: figma.boolean('Show indicator'),
    },
    example: ({ label, value, showIndicator }) =>
      html`<od-widget-metric-row
  label="${label}"
  value="${value}"
  [showIndicator]="${showIndicator}"
  (clicked)="onRow($event)"
></od-widget-metric-row>`,
  },
);
