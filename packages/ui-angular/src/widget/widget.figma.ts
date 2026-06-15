import figma, { html } from '@figma/code-connect';

// ─── Widget ───────────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1825-7
// Reference: packages/ui/src/Widget.figma.tsx (read-only — not imported)
// Content props (value, label, rows, chartSegments) are consumer-driven and
// not exposed as Figma properties — they live inside the component.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1825-7',
  {
    imports: ["import { WidgetComponent } from '@odyssey/ui-angular'"],
    props: {
      variant: figma.enum('Variant', {
        '1x': '1x',
        '2x': '2x',
        '3x': '3x',
        '3xChart': '3xChart',
        '3xCta': '3xCta',
      }),
      title: figma.string('Title'),
    },
    example: ({ variant, title }) =>
      html`<od-widget
  variant="${variant}"
  title="${title}"
  value=""
  label=""
  [rows]="[]"
  [chartSegments]="[]"
  (closeClicked)="onClose()"
  (goToClicked)="onGoTo()"
></od-widget>`,
  },
);
