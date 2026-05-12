import figma from '@figma/code-connect'
import WidgetPieChart from './WidgetPieChart'

// Master: Components-Molecules page, node 1881:77.
// Two size variants (md=72, lg=96); `Show center text` BOOLEAN + `Center text` TEXT
// component properties. Segments + segment colors are not exposed in Figma — they're
// data-driven in code (consumers pass `segments` and `chartSegments[i].color` tokens).
figma.connect(
  WidgetPieChart,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1881-77',
  {
    imports: ["import { WidgetPieChart } from '@odyssey/ui'"],
    props: {
      size: figma.enum('Size', {
        md: 'md',
        lg: 'lg',
      }),
      centerText: figma.boolean('Show center text', {
        true: figma.textContent('Center text'),
        false: undefined,
      }),
    },
    example: ({ size, centerText }) => (
      <WidgetPieChart
        size={size}
        centerText={centerText}
        segments={[
          { value: 42, color: 'var(--chart-1)' },
          { value: 28, color: 'var(--chart-2)' },
          { value: 18, color: 'var(--chart-3)' },
          { value: 12, color: 'var(--chart-4)' },
        ]}
      />
    ),
  },
)
