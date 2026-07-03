import figma from '@figma/code-connect'
import GlobalSearchResults from './GlobalSearchResults'

// Master: `GlobalSearchResults` set at 3237:3439 (Components-Organisms). Three states:
// State=SearchMainResults (scrollable "Best N Matches" header + up to 12 MatchRow rows +
// a trailing "Filter More" CTA) | SearchNoMatch (matches=[] → empty message) | SearchAlert
// (the `error` prop → red alert message). The React API is data-driven (`matches` + handlers);
// the example shows the populated contract. The compact field-lookup variant is a separate
// component — see FieldSearchResults (3170:2989).
figma.connect(
  GlobalSearchResults,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3237-3439',
  {
    imports: ["import { GlobalSearchResults } from '@odyssey/ui'"],
    example: () => (
      <GlobalSearchResults
        matches={[
          {
            matchId: 'C814956',
            route: 'Allentown, PA → Henderson, KY',
            customer: 'Kemira Americas',
            carrier: 'CAPITAL TRANSPORTATION',
            bol: 'S378003JB3',
            source: { label: 'FourKites, Inc.', variant: 'blue' },
          },
          {
            matchId: 'C7645814',
            route: 'Allentown, PA → Henderson, KY',
            customer: 'A Hartrodt',
            carrier: 'AACT - AAA COOPER',
            bol: 'TH545725',
            source: { label: 'EDI 214', variant: 'purple' },
          },
        ]}
        onFiltersClick={() => {}}
      />
    ),
  },
)
