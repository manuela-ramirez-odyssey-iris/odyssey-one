import { Menu } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import OdysseyLogo from './OdysseyLogo.jsx'

export default function LeadNav({
  logo = <OdysseyLogo />,
  onMenuClick,
}) {
  return (
    <div
      className="flex items-center shrink-0"
      style={{ gap: 'var(--spacing-4)' }}
    >
      <button
        type="button"
        onClick={onMenuClick}
        className="flex items-center justify-center border-none bg-transparent cursor-pointer shrink-0"
        style={{
          width: 36,
          height: 36,
          padding: 'var(--spacing-2)',
          color: 'var(--deep-sea-neutral-500)',
        }}
        aria-label="Open menu"
      >
        <Menu {...ICON_LG} />
      </button>
      {logo}
    </div>
  )
}
