import figma, { html } from '@figma/code-connect';

// Master: Components-Organisms page, node 2032:915 (ModalMedium organism).
// Content / Footer are SLOT properties — they map to ng-content slots.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2032-915',
  {
    imports: ["import { ModalMediumComponent } from '@odyssey/ui-angular'"],
    props: {
      title: figma.textContent('Title'),
    },
    example: ({ title }) =>
      html`<od-modal-medium
  title="${title}"
  (closeClicked)="onClose()"
>
  <!-- body content -->
  <div slot="footer"><!-- footer actions --></div>
</od-modal-medium>`,
  },
);
