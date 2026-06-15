import figma, { html } from '@figma/code-connect';

// ─── MatchRow ─────────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 2460-2
// Reference: packages/ui/src/MatchRow.figma.tsx (read-only — not imported)
// The avatar icon is a switchable INSTANCE_SWAP slot in Figma — in Angular it
// is projected via `slot="icon"`. The source badge variant and label are not
// Figma component properties, so sensible defaults are shown in the example.
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2460-2',
  {
    imports: ["import { MatchRowComponent } from '@odyssey/ui-angular'"],
    props: {
      sourceVariant: figma.enum('Source Variant', { Blue: 'blue', Purple: 'purple' }),
      route: figma.string('Route'),
      customer: figma.string('Customer'),
      carrier: figma.string('Carrier'),
    },
    example: ({ sourceVariant, route, customer, carrier }) =>
      html`<od-match-row
  matchId="M-001"
  route="${route}"
  customer="${customer}"
  carrier="${carrier}"
  bol="BOL-1234"
  sourceLabel="FourKites, Inc."
  sourceVariant="${sourceVariant}"
  (clicked)="onMatchRow($event)"
></od-match-row>`,
  },
);
