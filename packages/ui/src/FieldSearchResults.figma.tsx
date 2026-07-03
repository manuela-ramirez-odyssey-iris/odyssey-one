import figma from '@figma/code-connect'
import FieldSearchResults from './FieldSearchResults'

// Master: `SearchResultsMedium` set at 3170:2989 (Components-Organisms).
// State=SearchMainResults|SearchNoMatch|SearchAlert. Compact MatchSimpleRow rows, no
// title/footer; the SearchAlert state maps to the `error` prop, SearchNoMatch to the empty
// state (matches=[]). Sibling of SearchResults (global search, 3237:3439).
figma.connect(
  FieldSearchResults,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3170-2989',
  {
    imports: ["import { FieldSearchResults } from '@odyssey/ui'"],
    example: () => (
      <FieldSearchResults
        matches={[
          {
            matchId: '61-CU0000010352',
            customer: 'HERCULES CHILE LIMITADA',
            address: '1481 Dr. Carlos Charlin, 7500511 Providencia, Región Metropolitana, Chile',
          },
          {
            matchId: '61-CU0000010419',
            customer: 'Delaware Inc.',
            address: '200 W Madison St, Chicago, IL 60606, USA',
          },
        ]}
      />
    ),
  },
)
