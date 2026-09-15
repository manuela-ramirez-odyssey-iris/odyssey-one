import StepIndicator from './StepIndicator.jsx'

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
 * steps: [{ key, label, detail, status: 'off'|'on'|'error', passed?: boolean, onClick? }]
 * current: key of the step whose body is rendered (bold label).
 * Figma master + Code Connect owed at batch close (user: "later we can refine").
 */
export default function ResolveTimeline({ steps = [], current, className = '', ...rest }) {
  return (
    <ol
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
            <StepIndicator position="start" status={step.status} className="resolve-timeline__dot" />
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
