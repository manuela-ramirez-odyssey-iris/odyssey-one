import figma from '@figma/code-connect'
import EntityChip from './EntityChip'

/**
 * Code Connect — Figma BOOLEAN visibility props (Show handshake 2/3, Show count) map to
 * a derived `count` in code via shared display rules:
 *   count 1–3   → that many handshakes shown
 *   count 4+    → 3 handshakes + "+N" slot
 *
 * The Figma master ships with Show count=true to surface the feature; consumers in code
 * decide based on actual entity count.
 */
figma.connect(
  EntityChip,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1716-60',
  {
    imports: ["import { EntityChip } from '@odyssey/ui'"],
    props: {
      name: figma.textContent('Entity name'),
      showAddButton: figma.boolean('Show add button'),
    },
    example: ({ name, showAddButton }) => (
      <EntityChip name={name} count={4} showAddButton={showAddButton} />
    ),
  },
)
