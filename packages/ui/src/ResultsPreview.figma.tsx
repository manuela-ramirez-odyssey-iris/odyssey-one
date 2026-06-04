import figma from '@figma/code-connect'
import ResultsPreview from './ResultsPreview'

// Master: Components-Organisms page (Modals artboard), `ResultsPreview` at 2462:149.
// Composed organism — the result rows, filters link and footer buttons are all
// nested instances with no ResultsPreview-level component properties. The React
// API is data-driven (`matches` array + handlers), so the mapping uses a static
// example that demonstrates the contract.
figma.connect(
  ResultsPreview,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2462-149',
  {
    imports: ["import { ResultsPreview } from '@odyssey/ui'"],
    example: () => (
      <ResultsPreview
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
        onClear={() => {}}
        onShowResults={() => {}}
        onFiltersClick={() => {}}
      />
    ),
  },
)
