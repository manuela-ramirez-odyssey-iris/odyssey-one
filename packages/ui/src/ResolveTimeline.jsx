import { useEffect, useRef, useState } from 'react'
import StepIndicator from './StepIndicator.jsx'

// Fill duration — read at runtime from --resolve-timeline-fill on the
// timeline's own root (S147) so the CSS value is the single source of truth;
// no hand-mirrored JS constant to drift out of sync with the transition it
// times. `FILL_MS` below is only the fallback for when the computed value is
// unreadable (jsdom in tests has no CSS engine and reports '').
const FILL_MS = 900
const POP_MS = 350 // matches the arrival-pop keyframe duration in CSS
function readFillMs(el) {
  const raw = el && getComputedStyle(el).getPropertyValue('--resolve-timeline-fill')
  const parsed = raw && parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FILL_MS
}

/**
 * ResolveTimeline — molecule (STAGING / NORMALIZING, S145). Horizontal
 * 3-dot progress stepper for the OIF resolution page: one StepIndicator per
 * step on a track, label + detail under each. Steps, not tabs — the user
 * progresses left → right; a dot is clickable only when its `onClick` is set
 * (the consumer decides: passed steps re-open read-only, locked ones don't).
 * The current step is never clickable but is NOT locked — you are already on it.
 *
 * Track segment i sits between step i and i+1 and is driven by step i's
 * `passed` flag, NOT its `status` — the dot's status is "this step's errors
 * are cleared", which can go green while the planner is still looking at it;
 * the line only fills once the planner has actually ADVANCED past the step
 * (user ruling, S147: "animated line shows when we hit validate errors").
 * A segment is green when `passed` is true, neutral otherwise — never red;
 * red belongs to the dot alone.
 *
 * Arrival pop: when a step's `passed` flips false → true (the line actually
 * travels), the NEXT step's dot gets a one-shot subtle scale pulse timed to
 * start as the fill completes (user ruling, S147: "next stop should subtle
 * magnify animate and only show when the line collides"). This is tracked
 * with a ref of each step's previous `passed`, not a CSS animation on the
 * `--on` state, so mounting already-passed (deep link, reopened look-back)
 * never replays it — only a real transition fires the pop.
 *
 * `onArrive(stepKey)` (optional, S147): fired at the same moment the pop
 * starts (line lands, not when the pop finishes) — the consumer's cue that
 * "this next step has arrived" so it can swap in the step's real status and
 * body in sync with the animation, instead of showing them ahead of the line.
 * Fully optional — omit it and the timeline behaves exactly as before.
 *
 * @param {{key:string,label,detail,status:'off'|'on'|'error',passed?:boolean,onClick?:Function}[]} [props.steps]
 * @param {string} [props.current] - key of the step whose body is rendered (bold label)
 * @param {(stepKey: string) => void} [props.onArrive] - fired when the line lands on a step
 * steps: [{ key, label, detail, status: 'off'|'on'|'error', passed?: boolean, onClick? }]
 * current: key of the step whose body is rendered (bold label).
 * Figma master + Code Connect owed at batch close (user: "later we can refine").
 */
export default function ResolveTimeline({ steps = [], current, onArrive, className = '', ...rest }) {
  const prevPassed = useRef(null) // null until after first mount — no pop on mount
  const rootRef = useRef(null)
  const [arrivedKey, setArrivedKey] = useState(null)

  useEffect(() => {
    const prev = prevPassed.current
    const flipped = prev && steps.find((s, i) => !prev[s.key] && s.passed && steps[i + 1])
    prevPassed.current = Object.fromEntries(steps.map((s) => [s.key, s.passed]))
    if (flipped) {
      const nextStep = steps[steps.indexOf(flipped) + 1]
      const fillMs = readFillMs(rootRef.current)
      setArrivedKey(nextStep.key)
      const arrive = setTimeout(() => onArrive?.(nextStep.key), fillMs)
      const clear = setTimeout(() => setArrivedKey((k) => (k === nextStep.key ? null : k)), fillMs + POP_MS)
      return () => { clearTimeout(arrive); clearTimeout(clear) }
    }
  }, [steps, onArrive])

  return (
    <ol
      ref={rootRef}
      className={`resolve-timeline${className ? ` ${className}` : ''}`}
      role="list"
      aria-label="Resolution progress"
      {...rest}
    >
      {steps.map((step, i) => {
        const isCurrent = step.key === current
        const next = steps[i + 1]
        const isLocked = !step.onClick && !isCurrent
        const cls = [
          'resolve-timeline__step',
          isCurrent && 'resolve-timeline__step--current',
          isLocked && 'resolve-timeline__step--locked',
        ].filter(Boolean).join(' ')
        const content = (
          <>
            <StepIndicator
              position="start"
              status={step.status}
              className={`resolve-timeline__dot${step.key === arrivedKey ? ' resolve-timeline__dot--arrived' : ''}`}
            />
            <span className="resolve-timeline__label text-label-sm-medium">{step.label}</span>
            <span className="resolve-timeline__detail text-label-xs-regular">{step.detail}</span>
          </>
        )
        return (
          <li
            key={step.key}
            className={cls}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {step.onClick
              ? <button type="button" className="resolve-timeline__button" onClick={step.onClick}>{content}</button>
              : <span className="resolve-timeline__static">{content}</span>}
            {next && (
              <span className={`resolve-timeline__segment${step.passed ? ' resolve-timeline__segment--on' : ''}`} aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
