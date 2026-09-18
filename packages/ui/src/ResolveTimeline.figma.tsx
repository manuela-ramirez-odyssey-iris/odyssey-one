import figma from '@figma/code-connect'
import ResolveTimeline from './ResolveTimeline'

// Master: ResolveTimeline 6551:921 (Components-Molecules), composed from
// `ResolveTimelineStep` 6551:915 and `ResolveTimelineSegment` 6551:920, both in
// Components-Atoms › Sections beside the StepIndicator atom they build on.
//
// Built D16 (2026-09-18), transcribed from the shipped component rather than
// designed fresh — it went through four rounds of user review in S147 with no
// Figma master behind it, which is why its ladder entry read `figmaNode = —`.
//
// NOTHING IS MAPPED, on purpose. The component's whole API is `steps` — an
// ARRAY of {key,label,detail,status,passed,onClick} — and an array has no
// counterpart in a static Figma composition: the master shows three steps
// because three is what the OIF page has, not because three is the contract.
// Mapping `Label`/`Detail` off one nested instance would describe one cell of
// that array and quietly imply the rest. The example below is therefore a
// SHAPE reference: it shows a consumer what to pass.
//
// What the master DOES encode, and why it matters:
//   • the segment is its own component with its own `State = Off | On`, driven
//     by the departing step's `passed` — NOT by that step's dot status. The dot
//     goes green when a step's errors clear; the line fills only once the
//     planner has actually advanced past it (S147 ruling).
//   • the segment has no error state at all. Red belongs to the dot alone.
//   • `State = Current` recolours the LABEL only; `State = Locked` recolours
//     the whole block. That asymmetry is in the variants, not in a comment.
//
// Code-only, and deliberately absent from Figma: the arrival pop (a one-shot
// scale pulse on the next dot, timed to the fill landing) and `onArrive`.
// Motion and callbacks follow the control-state model — states live in Figma,
// behaviour lives in code + the DSM demo.
figma.connect(
  ResolveTimeline,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=6551-921',
  {
    imports: ["import { ResolveTimeline } from '@odyssey/ui'"],
    example: () => (
      <ResolveTimeline
        current="order-data"
        onArrive={(stepKey) => console.log(stepKey)}
        steps={[
          { key: 'structural', label: 'Structural', detail: 'Resolved', status: 'on', passed: true, onClick: () => {} },
          { key: 'order-data', label: 'Order data', detail: '2 open errors', status: 'error' },
          { key: 'review', label: 'Review', detail: 'Not started', status: 'off' },
        ]}
      />
    ),
  },
)
