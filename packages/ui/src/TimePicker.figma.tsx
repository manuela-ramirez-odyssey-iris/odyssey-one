import figma from '@figma/code-connect'
import TimePicker from './TimePicker'

// Master: `TimePicker` at 4534:5204.
figma.connect(
  TimePicker,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4534-5204',
  {
    imports: ["import { TimePicker } from '@odyssey/ui'"],
    props: {
      // Figma is a visual master (Closed/Open state); the code API is
      // value/onChange/format/step — no 1:1 Figma property to map.
    },
    example: () => (
      <TimePicker label="Time" value="08:30" onChange={() => {}} />
    ),
  },
)
