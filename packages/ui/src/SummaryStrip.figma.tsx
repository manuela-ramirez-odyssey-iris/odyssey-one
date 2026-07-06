import figma from '@figma/code-connect'
import SummaryStrip from './SummaryStrip'

// Master: `SummaryStrip` COMPONENT 4254:904 (Components-Molecules › Sections;
// né `Overview` frame 4178:8365 — componentized by us 2026-07-06 with Label
// 1–6 / Value 1–6 TEXT props, value fills bound Text/primary, band flattened
// to Background/primary). The master's 6 fixed cells map onto the `items`
// array; code labels are natural-case (CSS uppercases). `tone` remains a
// code-only extension (no Figma axis). STAGING — publish with the batch.
figma.connect(
  SummaryStrip,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4254-904',
  {
    imports: ["import { SummaryStrip } from '@odyssey/ui'"],
    props: {
      label1: figma.string('Label 1'),
      value1: figma.string('Value 1'),
      label2: figma.string('Label 2'),
      value2: figma.string('Value 2'),
      label3: figma.string('Label 3'),
      value3: figma.string('Value 3'),
      label4: figma.string('Label 4'),
      value4: figma.string('Value 4'),
      label5: figma.string('Label 5'),
      value5: figma.string('Value 5'),
      label6: figma.string('Label 6'),
      value6: figma.string('Value 6'),
    },
    example: ({ label1, value1, label2, value2, label3, value3, label4, value4, label5, value5, label6, value6 }) => (
      <SummaryStrip
        aria-label="Shipment KPIs"
        items={[
          { label: label1, value: value1 },
          { label: label2, value: value2 },
          { label: label3, value: value3 },
          { label: label4, value: value4 },
          { label: label5, value: value5 },
          { label: label6, value: value6 },
        ]}
      />
    ),
  },
)
