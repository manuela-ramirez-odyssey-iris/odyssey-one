import { Alert, Badge } from '@odyssey/ui'
import './spotboard.css'

/**
 * RfqLinksPanel — the CE-1 email stand-in (spec 2026-08-03 line 55). Shown
 * after Send RFQ: one `/spot-bid/:token` link per INCLUDED carrier, so the
 * planner can click through and demo the carrier side instead of a real
 * email going out. Dismissible; SpotBoardTab also hides it once the quote
 * leaves `open`.
 */
export default function RfqLinksPanel({ carriers, onClose }) {
  const included = (carriers ?? []).filter((c) => c.incl)
  if (included.length === 0) return null

  return (
    <Alert variant="success" onClose={onClose} className="rfq-links">
      <div className="text-label-sm-medium">
        RFQ sent — one bid link per included carrier (CE-1 stand-in; goes out by email in production)
      </div>
      <ul className="rfq-links__list">
        {included.map((c) => {
          const href = `/spot-bid/${c.token}`
          return (
            <li key={c.scac} className="rfq-links__row">
              <Badge variant="gray">{c.scac} · {c.name}</Badge>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open bid link for ${c.scac} · ${c.name}`}
              >
                {href}
              </a>
            </li>
          )
        })}
      </ul>
    </Alert>
  )
}
