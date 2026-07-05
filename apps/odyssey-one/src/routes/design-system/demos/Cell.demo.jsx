import { ArrowUpDown, Filter } from 'lucide-react'
import { Badge, Button, Checkbox, FormField, Radio } from '@odyssey/ui'

export const meta = {
  name: 'Cell',
  tier: 'molecule',
  codeOnly: true,
  figmaNode: '2714:505',
}

// Cell is a CSS contract, not a React component — tables are rendered by
// TanStack Table, so normalization defines how cells look. The "props" below
// document the classes in apps/odyssey-one/src/styles/components.css.
export const props = [
  { name: '.odyssey-table', type: 'class', desc: 'Root class on <table> — width 100%, border-collapse; scopes all cell styles.' },
  { name: 'th', type: 'element', desc: 'Head cell (Variant=Head) — --text-primary, pair with text-label-sm-semibold; 14px/16px padding → 48px cell.' },
  { name: 'td', type: 'element', desc: 'Default data cell (Variant=Text) — --text-tertiary, pair with text-label-sm-regular; bottom border --border-subtle, nowrap.' },
  { name: '.odyssey-table__cell--title', type: 'class', desc: 'Emphasis cell (Variant=Title) — --text-primary, pair with text-label-sm-medium; for columns like Customer.' },
  { name: '.odyssey-table__cell--control', type: 'class', desc: 'Checkbox/Radio cell (Variant=Checkbox input) — 16px padding all sides.' },
  { name: '.odyssey-table__cell--gray', type: 'class', desc: 'Background=Gray axis — --bg-secondary cell background.' },
  { name: '.odyssey-table__th-sub', type: 'class', desc: 'Subtitle <span> inside a th (Variant=Head with Subtitle) — block, 12px/12px regular line above the semibold label.' },
  { name: 'tr[data-selected]', type: 'attribute', desc: 'Selected row — tds get --bg-secondary; same treatment on tbody tr:hover (code + DSM only).' },
]

export const tokens = [
  { token: '--border-subtle', resolves: 'DSN/200', usage: 'cell bottom border' },
  { token: '--bg-primary', resolves: 'White', usage: 'cell background' },
  { token: '--bg-secondary', resolves: 'DSN/50', usage: 'Background=Gray cells + hover/selected rows (code + DSM only — interaction state)' },
  { token: '--text-primary', resolves: 'DSN/900', usage: 'Head + Title cell text' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'default Text cell text' },
  { token: '--spacing-4', resolves: '16px', usage: 'cell h-padding + control-cell padding (all sides)' },
  { token: '--font-size-sm / --line-height-sm', resolves: '14px / 20px', usage: 'all cell text via the text-label-sm-* utilities' },
  // 14px vertical padding is cell-internal raw geometry (like Button's 14px), not a token.
]

// No outer border — the page bg already contrasts with the white table;
// the 16px radius alone defines the container (mirrors .odyssey-data-table).
const wrapStyle = {
  borderRadius: 'var(--radius-2xl)',
  overflow: 'hidden',
}

export default function CellDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Cell-visual contract for data grids — CSS classes, not a React
        component. Tables are rendered by TanStack Table, so normalizing the
        Figma Cell set (read-only intake — nothing pushed back) means defining
        how its variants map to <code>.odyssey-table</code> markup: element
        defaults for Head/Text, modifier classes for Title/control/gray cells,
        and plain composition (Button, Badge, FormField inside a cell) for the
        rest. The Head trailing 16px icon slot is the future sort affordance.
        Consumed by the Orders Summary table.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Composed example</h4>
        <div style={wrapStyle}>
          <table className="odyssey-table">
            <thead>
              <tr>
                <th className="odyssey-table__cell--control">
                  <Checkbox showLabel={false} aria-label="Select all" />
                </th>
                <th className="text-label-sm-semibold">Customer</th>
                <th className="text-label-sm-semibold">Origin</th>
                <th className="text-label-sm-semibold">Status</th>
                <th className="text-label-sm-semibold">
                  <span className="odyssey-table__th-sub text-label-xs-regular">lbs</span>
                  Weight
                </th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="odyssey-table__cell--control">
                  <Checkbox showLabel={false} aria-label="Select Jane Cooper" />
                </td>
                <td className="odyssey-table__cell--title text-label-sm-medium">Jane Cooper</td>
                <td className="text-label-sm-regular">Chicago, IL</td>
                <td><Badge variant="blue">In Transit</Badge></td>
                <td className="text-label-sm-regular">12,400</td>
                <td><Button variant="link">Edit</Button></td>
              </tr>
              <tr data-selected>
                <td className="odyssey-table__cell--control">
                  <Checkbox showLabel={false} defaultChecked aria-label="Select Wade Warren" />
                </td>
                <td className="odyssey-table__cell--title text-label-sm-medium">Wade Warren</td>
                <td className="text-label-sm-regular">Dallas, TX</td>
                <td><Badge variant="green">Delivered</Badge></td>
                <td className="text-label-sm-regular">8,150</td>
                <td><Button variant="link">Edit</Button></td>
              </tr>
              <tr>
                <td className="odyssey-table__cell--control">
                  <Checkbox showLabel={false} aria-label="Select Esther Howard" />
                </td>
                <td className="odyssey-table__cell--title text-label-sm-medium">Esther Howard</td>
                <td className="text-label-sm-regular">Atlanta, GA</td>
                <td><Badge variant="amber">Pending</Badge></td>
                <td className="text-label-sm-regular">21,300</td>
                <td><Button variant="link">Edit</Button></td>
              </tr>
              <tr>
                <td className="odyssey-table__cell--control">
                  <Checkbox showLabel={false} aria-label="Select Cameron Williamson" />
                </td>
                <td className="odyssey-table__cell--title text-label-sm-medium">Cameron Williamson</td>
                <td className="text-label-sm-regular">Denver, CO</td>
                <td><Badge variant="red">Exception</Badge></td>
                <td className="text-label-sm-regular">5,900</td>
                <td><Button variant="link">Edit</Button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <span className="ds-demo-label" style={{ display: 'block', marginTop: 'var(--spacing-2)' }}>
          Second row carries <code>data-selected</code>; hover any row for the same --bg-secondary treatment.
          Wrapper div mirrors .odyssey-data-table (16px radius, no outer border — page bg provides the contrast).
        </span>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Cell variants</h4>
        <div style={wrapStyle}>
          <table className="odyssey-table">
            <thead>
              <tr>
                <th className="text-label-sm-semibold">Figma variant</th>
                <th className="text-label-sm-semibold">Code treatment</th>
                <th className="text-label-sm-semibold">Rendered</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-label-sm-regular">Head</td>
                <td className="text-label-sm-regular"><code>th</code> + text-label-sm-semibold</td>
                <th scope="row" className="text-label-sm-semibold">Customer</th>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Head with Subtitle</td>
                <td className="text-label-sm-regular"><code>.odyssey-table__th-sub</code> span above the label</td>
                <th scope="row" className="text-label-sm-semibold">
                  <span className="odyssey-table__th-sub text-label-xs-regular">lbs</span>
                  Weight
                </th>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Blind Head</td>
                <td className="text-label-sm-regular">empty <code>th</code> (action columns)</td>
                <th scope="row" aria-label="Blind head example" />
              </tr>
              <tr>
                <td className="text-label-sm-regular">Head with Icon Button</td>
                <td className="text-label-sm-regular"><code>{'<Button variant="icon">'}</code> in a th</td>
                <th scope="row" className="text-label-sm-semibold">
                  <Button variant="icon" icon={<Filter size={20} />} aria-label="Filter column" />
                </th>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Head with Icon</td>
                <td className="text-label-sm-regular">trailing 16px icon — future sort affordance</td>
                <th scope="row" className="text-label-sm-semibold">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                    Weight
                    <ArrowUpDown size={16} aria-hidden="true" />
                  </span>
                </th>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Title</td>
                <td className="text-label-sm-regular"><code>.odyssey-table__cell--title</code> + text-label-sm-medium</td>
                <td className="odyssey-table__cell--title text-label-sm-medium">Jane Cooper</td>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Text</td>
                <td className="text-label-sm-regular">default <code>td</code> + text-label-sm-regular</td>
                <td className="text-label-sm-regular">Chicago, IL</td>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Link</td>
                <td className="text-label-sm-regular"><code>{'<Button variant="link">'}</code> in a td</td>
                <td><Button variant="link">Edit</Button></td>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Badge</td>
                <td className="text-label-sm-regular"><code>{'<Badge>'}</code> in a td</td>
                <td><Badge variant="blue">In Transit</Badge></td>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Field</td>
                <td className="text-label-sm-regular"><code>{'<FormField>'}</code> in a td — future inline-edit pattern</td>
                <td>
                  <div style={{ width: 180 }}>
                    <FormField showLabel={false} placeholder="Add note" aria-label="Field cell example" />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Trailing Button</td>
                <td className="text-label-sm-regular">FormField + trailing action — future inline-edit pattern</td>
                <td className="text-label-sm-regular">no render — composition lands with inline edit</td>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Checkbox input</td>
                <td className="text-label-sm-regular"><code>.odyssey-table__cell--control</code> + Checkbox</td>
                <td className="odyssey-table__cell--control">
                  <Checkbox showLabel={false} aria-label="Checkbox cell example" />
                </td>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Radio input</td>
                <td className="text-label-sm-regular"><code>.odyssey-table__cell--control</code> + Radio</td>
                <td className="odyssey-table__cell--control">
                  <Radio showLabel={false} aria-label="Radio cell example" />
                </td>
              </tr>
              <tr>
                <td className="text-label-sm-regular">Background=Gray (axis)</td>
                <td className="text-label-sm-regular"><code>.odyssey-table__cell--gray</code> on any cell</td>
                <td className="odyssey-table__cell--gray text-label-sm-regular">gray cell background</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
