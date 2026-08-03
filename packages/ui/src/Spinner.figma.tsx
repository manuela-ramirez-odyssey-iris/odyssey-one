import figma from '@figma/code-connect'
import Spinner from './Spinner'

// Single 48px master; size scales in code (ring stroke keeps the Figma 8/48
// ratio). Rotation is code-only (900ms linear infinite).
figma.connect(
  Spinner,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4876-7331',
  {
    imports: ["import { Spinner } from '@odyssey/ui'"],
    props: {},
    example: () => <Spinner size={48} />,
  },
)
