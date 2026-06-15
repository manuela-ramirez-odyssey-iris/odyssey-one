import figma, { html } from '@figma/code-connect';

// Master: Components-Organisms page (Modals artboard), ResultsPreview at 2462:149.
// Data-driven component — result rows, filters link and footer buttons are nested
// instances with no top-level component properties. Example uses a static matches
// array to demonstrate the API contract.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2462-149',
  {
    imports: ["import { ResultsPreviewComponent } from '@odyssey/ui-angular'"],
    props: {
      title: figma.string('Title'),
    },
    example: ({ title }) =>
      html`<od-results-preview
  title="${title}"
  [matches]="[
    {
      matchId: 'C814956',
      route: 'Allentown, PA → Henderson, KY',
      customer: 'Kemira Americas',
      carrier: 'CAPITAL TRANSPORTATION',
      bol: 'S378003JB3',
      sourceLabel: 'FourKites, Inc.',
      sourceVariant: 'blue'
    },
    {
      matchId: 'C7645814',
      route: 'Allentown, PA → Henderson, KY',
      customer: 'A Hartrodt',
      carrier: 'AACT - AAA COOPER',
      bol: 'TH545725',
      sourceLabel: 'EDI 214',
      sourceVariant: 'purple'
    }
  ]"
  (clearClicked)="onClear()"
  (showResultsClicked)="onShowResults()"
  (filtersClicked)="onFilters()"
/>`,
  },
);
