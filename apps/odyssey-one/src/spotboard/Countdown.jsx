import { useEffect, useRef, useState } from 'react'
import { Badge } from '@odyssey/ui'
import './spotboard.css'

const URGENT_MS = 15 * 60000

function formatMMSS(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const mm = Math.floor(totalSec / 60)
  const ss = totalSec % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export default function Countdown({ closeAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => closeAt - Date.now())
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    expiredRef.current = false
    let interval
    const tick = () => {
      const next = closeAt - Date.now()
      setRemaining(next)
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true
        clearInterval(interval)
        onExpireRef.current?.()
      }
    }
    tick()
    interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [closeAt])

  const expired = remaining <= 0
  const urgent = !expired && remaining < URGENT_MS

  return (
    <span className={urgent ? 'countdown--urgent' : undefined}>
      <Badge variant="time">{expired ? 'Closed' : formatMMSS(remaining)}</Badge>
    </span>
  )
}
