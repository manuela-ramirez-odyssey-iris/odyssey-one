import figma from '@figma/code-connect'
import SearchResults from './SearchResults'

// Master: Components-Organisms page (Modals artboard), `SearchResults` at 2684:1040.
// The Best Match content that fills the SearchPanel Content slot. Composed organism
// (MatchRow instances + a link row); the React API is data-driven (`matches` array
// + handlers), so the mapping uses a static example that demonstrates the contract.
figma.connect(
  SearchResults,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2684-1040',
  {
    imports: ["import { SearchResults } from '@odyssey/ui'"],
    example: () => (
      <SearchResults
        title="Best Match"
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
