import figma, { html } from '@figma/code-connect';

// Master: Components-Organisms page, node 2006:663 (ModalLarge organism).
// Content / Footer are SLOT properties — they map to ng-content slots.
// (closeClicked) is a code-only output supplied by the consumer.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2006-663',
  {
    imports: ["import { ModalLargeComponent } from '@odyssey/ui-angular'"],
    props: {
      title: figma.textContent('Title'),
      subtitle: figma.textContent('Subtitle'),
      showSubtitle: figma.boolean('Show subtitle'),
    },
    example: ({ title, subtitle, showSubtitle }) =>
      html`<od-modal-large
  title="${title}"
  subtitle="${subtitle}"
  [showSubtitle]="${showSubtitle}"
  (closeClicked)="onClose()"
>
  <!-- body content -->
  <div slot="footer"><!-- footer actions --></div>
</od-modal-large>`,
  },
);
