import figma, { html } from '@figma/code-connect';

// ─── WidgetPieChart ───────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1881-77
// Reference: packages/ui/src/WidgetPieChart.figma.tsx (read-only — not imported)
// Segments and colors are data-driven in code — not exposed as Figma properties.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1881-77',
  {
    imports: ["import { WidgetPieChartComponent } from '@odyssey/ui-angular'"],
    props: {
      size: figma.enum('Size', {
        md: 'md',
        lg: 'lg',
      }),
      showCenterText: figma.boolean('Show center text'),
    },
    example: ({ size, showCenterText }) =>
      html`<od-widget-pie-chart
  size="${size}"
  [showCenterText]="${showCenterText}"
  centerText="42%"
  [segments]="[
    { value: 42, color: 'var(--chart-1)' },
    { value: 28, color: 'var(--chart-2)' },
    { value: 18, color: 'var(--chart-3)' },
    { value: 12, color: 'var(--chart-4)' }
  ]"
></od-widget-pie-chart>`,
  },
);
