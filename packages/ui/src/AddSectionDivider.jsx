/**
 * AddSectionDivider — atom. Purely decorative row separator that announces
 * the start of the "to be added" section in Home edit mode. Sits directly
 * above the AddSectionButton — clicking the button below it inserts a new
 * section right where the divider sits.
 *
 * NOT a button. No hover/active states. No onClick. The clickable affordance
 * is the AddSectionButton that follows it.
 *
 * Figma master: `AddSectionDivider` 2203:297 on Components-Atoms (Panels artboard).
 */
export default function AddSectionDivider({
  label = 'Add Section',
  className = '',
  ...rest
}) {
  const classes = ['add-section-divider', className].filter(Boolean).join(' ')
  return (
    <div className={classes} role="separator" aria-label={label} {...rest}>
      <span className="add-section-divider__label text-label-sm-medium">{label}</span>
    </div>
  )
}
