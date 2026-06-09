import figma from '@figma/code-connect'
import SearchPanel from './SearchPanel'

// Master: Components-Organisms page (Modals artboard), `SearchPanel` at 2462:149
// (renamed from ResultsPreview). Modal-pattern shell: a native Content SLOT maps
// to React `children`; the header and baked footer are driven by Show header /
// Show back / Show link / Show secondary booleans + the Title text property.
// onBack / onClose / onClear / onShowResults are code-only consumer callbacks.
figma.connect(
  SearchPanel,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2462-149',
  {
    imports: ["import { SearchPanel } from '@odyssey/ui'"],
    props: {
      showHeader: figma.boolean('Show header'),
      showBack: figma.boolean('Show back'),
      title: figma.string('Title'),
      showLink: figma.boolean('Show link'),
      showSecondary: figma.boolean('Show secondary'),
      showTrailSecondary: figma.boolean('Show trail secondary'),
      children: figma.instance('Content'),
    },
    example: ({ showHeader, showBack, title, showLink, showSecondary, showTrailSecondary, children }) => (
      <SearchPanel
        showHeader={showHeader}
        showBack={showBack}
        title={title}
        showLink={showLink}
        showSecondary={showSecondary}
        showTrailSecondary={showTrailSecondary}
        count={4}
        onClose={() => {}}
        onBack={() => {}}
        onClear={() => {}}
        onShowResults={() => {}}
      >
        {children}
      </SearchPanel>
    ),
  },
)
