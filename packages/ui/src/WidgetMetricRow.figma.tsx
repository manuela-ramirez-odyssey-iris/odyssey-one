import figma from '@figma/code-connect'
import WidgetMetricRow from './WidgetMetricRow'

// Master: Components-Molecules page, node 1814:7.
// `indicatorColor` is consumer-driven (chart-N token); not exposed as a Figma
// property — designers override the dot fill per-instance to a Chart/* token.
figma.connect(
  WidgetMetricRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1814-7',
  {
    imports: ["import { WidgetMetricRow } from '@odyssey/ui'"],
    props: {
      label: figma.textContent('Label'),
      value: figma.textContent('Value'),
      showIndicator: figma.boolean('Show indicator'),
    },
    example: ({ label, value, showIndicator }) => (
      <WidgetMetricRow label={label} value={value} showIndicator={showIndicator} />
    ),
  },
)
