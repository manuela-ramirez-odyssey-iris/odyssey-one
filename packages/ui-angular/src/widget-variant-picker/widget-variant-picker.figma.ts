import figma, { html } from '@figma/code-connect';

// Master: Components-Molecules page, node 2005:554 (WidgetVariantPicker set).
// Four Variant states — each maps to a separate connect() call with a
// Figma variant filter. Interactive arrows/dots are code-only.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2005-554',
  {
    variant: { Variant: '1x' },
    imports: ["import { WidgetVariantPickerComponent } from '@odyssey/ui-angular'"],
    example: () =>
      html`<od-widget-variant-picker
  variant="1x"
  (variantChange)="onVariantChange($event)"
/>`,
  },
);

figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2005-554',
  {
    variant: { Variant: '2x' },
    imports: ["import { WidgetVariantPickerComponent } from '@odyssey/ui-angular'"],
    example: () =>
      html`<od-widget-variant-picker
  variant="2x"
  (variantChange)="onVariantChange($event)"
/>`,
  },
);

figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2005-554',
  {
    variant: { Variant: '3x' },
    imports: ["import { WidgetVariantPickerComponent } from '@odyssey/ui-angular'"],
    example: () =>
      html`<od-widget-variant-picker
  variant="3x"
  (variantChange)="onVariantChange($event)"
/>`,
  },
);

figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2005-554',
  {
    variant: { Variant: '3xChart' },
    imports: ["import { WidgetVariantPickerComponent } from '@odyssey/ui-angular'"],
    example: () =>
      html`<od-widget-variant-picker
  variant="3xChart"
  (variantChange)="onVariantChange($event)"
/>`,
  },
);
