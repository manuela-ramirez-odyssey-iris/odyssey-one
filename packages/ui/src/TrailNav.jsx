import { Bell, ChevronDown, ChevronUp, CircleHelp, X } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import Badge from './Badge.jsx'
import Button from './Button.jsx'

export default function TrailNav({ mode = 'profile', ...rest }) {
  if (mode === 'editor') return <TrailNavEditor {...rest} />
  return <TrailNavProfile {...rest} />
}

function TrailNavProfile({
  name,
  role,
  avatar,
  notificationCount = 0,
  showNotification,
  chevron,
  dropdownOpen = false,
  onNotificationClick,
  onProfileClick,
}) {
  const showBadge = showNotification ?? notificationCount > 0
  const ChevronIcon = dropdownOpen ? ChevronUp : ChevronDown

  return (
    <div className="flex items-stretch shrink-0" style={{ gap: 'var(--spacing-4)' }}>
      <button
        type="button"
        onClick={onNotificationClick}
        className="trail-nav-bell relative flex items-center justify-center border-none bg-transparent cursor-pointer self-center"
        style={{
          width: 32,
          height: 32,
          padding: 'var(--spacing-1) 6px',
          color: 'var(--deep-sea-neutral-500)',
        }}
        aria-label="Notifications"
      >
        <Bell {...ICON_LG} />
        {showBadge && (
          <span
            style={{
              position: 'absolute',
              top: -6,
              left: 16,
              pointerEvents: 'none',
            }}
          >
            <Badge variant="notification">{notificationCount}</Badge>
          </span>
        )}
      </button>

      <div
        className="flex items-center"
        style={{
          gap: 'var(--spacing-2)',
          paddingLeft: 'var(--spacing-5)',
          paddingRight: 'var(--spacing-1)',
          borderLeft: '1px solid var(--deep-sea-neutral-700)',
        }}
      >
        <button
          type="button"
          onClick={onProfileClick}
          className="trail-nav-profile flex items-center border-none bg-transparent cursor-pointer p-0"
          style={{ gap: 'var(--spacing-3)' }}
          aria-label="User menu"
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {avatar}
          </div>
          <div className="flex flex-col items-start whitespace-nowrap">
            <span
              className="trail-nav-profile-name text-label-sm-medium"
              style={{
                color: 'var(--deep-sea-neutral-300)',
              }}
            >
              {name}
            </span>
            <span
              className="trail-nav-profile-role"
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 400,
                lineHeight: '12px',
                color: 'var(--deep-sea-neutral-400)',
              }}
            >
              {role}
            </span>
          </div>
          <span
            className="trail-nav-profile-chevron"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--deep-sea-neutral-500)',
            }}
          >
            {chevron ?? <ChevronIcon {...ICON_MD} />}
          </span>
        </button>
      </div>
    </div>
  )
}

function TrailNavEditor({
  showPrimaryButton = true,
  primaryButtonLabel = 'Cancel',
  onPrimaryButtonClick,
  showSecondaryButton = true,
  secondaryButtonLabel = 'Save',
  onSecondaryButtonClick,
  showHelpIcon = true,
  helpIcon,
  onHelpClick,
  showRightIcon = true,
  rightIcon,
  onRightIconClick,
}) {
  return (
    <div
      className="flex items-center justify-end shrink-0"
      style={{ gap: 'var(--spacing-4)' }}
    >
      <div className="flex items-center" style={{ gap: 'var(--spacing-3)' }}>
        {showPrimaryButton && (
          <Button variant="ghost" size="lg" onClick={onPrimaryButtonClick}>
            {primaryButtonLabel}
          </Button>
        )}
        {showSecondaryButton && (
          <Button variant="outline" size="lg" onClick={onSecondaryButtonClick}>
            {secondaryButtonLabel}
          </Button>
        )}
      </div>
      <div className="flex items-center" style={{ gap: 'var(--spacing-5)' }}>
        <IconSlot show={showHelpIcon} onClick={onHelpClick} ariaLabel="Help">
          {helpIcon ?? <CircleHelp {...ICON_LG} />}
        </IconSlot>
        <IconSlot show={showRightIcon} onClick={onRightIconClick} ariaLabel="Close">
          {rightIcon ?? <X {...ICON_LG} />}
        </IconSlot>
      </div>
    </div>
  )
}

function IconSlot({ show, onClick, ariaLabel, children }) {
  if (!show) {
    return <span style={{ width: 20, height: 20, display: 'inline-block', flexShrink: 0 }} aria-hidden="true" />
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="trail-nav-editor-icon flex items-center justify-center border-none bg-transparent cursor-pointer p-0"
      style={{ width: 20, height: 20, flexShrink: 0, color: 'var(--deep-sea-neutral-500)' }}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}
