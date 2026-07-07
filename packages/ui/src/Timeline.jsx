import { Truck } from 'lucide-react'
import StopBadge from './StopBadge'

/**
 * Timeline — vertical stop-progress timeline (STAGING, S80). Figma staging
 * frames 4274:15599 (simple) / 4274:15672 (detailed, in-between statuses —
 * out of scope for now). Composes StopBadge markers over a 2px track
 * (DSN/100) with a DSN/400 progress fill. Progress comes from the Tracking
 * domain; consumers feed per-item statuses and the segments derive:
 *   completed→completed : full fill
 *   completed→pending   : partial fill (~70%) + truck marker at the tip
 *   pending→pending     : empty track
 * ("issue" counts as reached, i.e. fills like completed.)
 *
 * items: [{ key, label, status, content }] — content renders to the right of
 * the rail; the connector stretches with it, so row height is content-driven.
 * `animate` runs the arrival choreography on mount (CSS-only, disabled under
 * prefers-reduced-motion): reached badges start in the pending skin, fills
 * grow top-down sequentially (one segment per beat), and each badge "lights
 * up" to its status color with a subtle pulse the moment the line hits it.
 */
const reached = (status) => status === 'completed' || status === 'issue'

// One beat = one segment's grow duration; badge i lights at beat i, exactly
// when segment i−1 finishes. Mirrors the 800ms/cubic ease in components.css.
const BEAT_MS = 800

export default function Timeline({ items = [], animate = false, className = '', ...rest }) {
  return (
    <div
      className={`odyssey-timeline${animate ? ' odyssey-timeline--animate' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const next = items[i + 1]
        // Segment below this badge, toward the next stop
        const fill = !isLast && reached(item.status)
          ? (reached(next.status) ? 'full' : 'partial')
          : 'none'
        const lit = animate && reached(item.status)
        return (
          <div className="odyssey-timeline__row" key={item.key ?? item.label}>
            <div className="odyssey-timeline__rail" aria-hidden="true">
              <StopBadge
                label={item.label}
                status={item.status}
                className={lit ? 'odyssey-timeline__badge' : undefined}
                style={lit ? { animationDelay: `${i * BEAT_MS}ms` } : undefined}
              />
              {!isLast && (
                <span className={`odyssey-timeline__segment odyssey-timeline__segment--${fill}`}>
                  <span
                    className="odyssey-timeline__segment-fill"
                    style={animate ? { animationDelay: `${i * BEAT_MS}ms` } : undefined}
                  />
                  {fill === 'partial' && (
                    <span
                      className="odyssey-timeline__marker"
                      style={animate ? { animationDelay: `${i * BEAT_MS + BEAT_MS * 0.75}ms` } : undefined}
                    >
                      <Truck size={16} aria-hidden="true" />
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="odyssey-timeline__content">{item.content}</div>
          </div>
        )
      })}
    </div>
  )
}
