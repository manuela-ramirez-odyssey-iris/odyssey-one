import figma from '@figma/code-connect'
import GlobalSearchPanel from './GlobalSearchPanel'

// Master: Components-Organisms page (Modals artboard), `GlobalSearchPanel` at 2462:149
// (renamed from ResultsPreview). Modal-pattern shell: a native Content SLOT maps to
// React `children`; the header toggles on the `Header` boolean. The Figma master was
// simplified to Header / Content / Footer — the old granular Show back / Title /
// Show link / Show secondary props were removed, so they're code-only defaults now.
figma.connect(
  GlobalSearchPanel,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2462-149',
  {
    imports: ["import { GlobalSearchPanel } from '@odyssey/ui'"],
    props: {
      showHeader: figma.boolean('Header'),
      children: figma.instance('Content'),
    },
    example: ({ showHeader, children }) => (
      <GlobalSearchPanel
        showHeader={showHeader}
        title="Filters"
        count={4}
        onClose={() => {}}
        onBack={() => {}}
        onClear={() => {}}
        onShowResults={() => {}}
      >
        {children}
      </GlobalSearchPanel>
    ),
  },
)
