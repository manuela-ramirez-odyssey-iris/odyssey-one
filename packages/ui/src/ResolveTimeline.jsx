import StepIndicator from './StepIndicator.jsx'

/**
 * ResolveTimeline — molecule (STAGING / NORMALIZING, S145). Horizontal
 * 3-dot progress stepper for the OIF resolution page: one StepIndicator per
 * step on a track, label + detail under each. Steps, not tabs — the user
 * progresses left → right; a dot is clickable only when its `onClick` is set
 * (the consumer decides: passed steps re-open read-only, locked ones don't).
 *
 * Track segment i sits between step i and i+1 and takes step i+1's status
 * (`on` = green fill, `error` = red fill, `off` = neutral), so the line
 * "arrives" in the colour of the step it reaches.
 *
 * steps: [{ key, label, detail, status: 'off'|'on'|'error', onClick? }]
 * current: key of the step whose body is rendered (bold label).
 * Figma master + Code Connect owed at batch close.
 */
export default function ResolveTimeline({ steps = [], current, className = '', ...rest }) {
  return (
    <ol
      className={`resolve-timeline${className ? ` ${className}` : ''}`}
      aria-label="Resolution progress"
      {...rest}
    >
      {steps.map((step, i) => {
        const isCurrent = step.key === current
        const next = steps[i + 1]
        const cls = [
          'resolve-timeline__step',
          isCurrent && 'resolve-timeline__step--current',
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
            aria-disabled={step.onClick ? undefined : 'true'}
          >
            {step.onClick
              ? <button type="button" className="resolve-timeline__button" onClick={step.onClick}>{content}</button>
              : <span className="resolve-timeline__static">{content}</span>}
            {next && (
              <span className={`resolve-timeline__segment resolve-timeline__segment--${next.status}`} aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
