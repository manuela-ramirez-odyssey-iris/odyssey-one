// @odyssey/ui — normalized component library.
// Grouped by tier to mirror the Figma Design System pages
// (Components-Atoms / Components-Molecules / Components-Organisms).
//
// Notes:
// - ButtonLink (Figma atom) folds into Button via variant="link" — no separate export.
// - WidgetContent (Figma organism) folds into Widget — no separate export.
// - Sidebar (Figma organism) is app-local (apps/odyssey-one) — depends on routing.

// ── Atoms ──────────────────────────────────────────────
export { default as Badge } from './Badge.jsx';
export { default as Button } from './Button.jsx';
export { default as IconButton } from './IconButton.jsx';
export { default as IconButtonGhost } from './IconButtonGhost.jsx';
export { default as FilterButton } from './FilterButton.jsx';
export { default as PaginationButton } from './PaginationButton.jsx';
export { default as PillTab } from './PillTab.jsx';
export { default as Tab } from './Tab.jsx';
export { default as Checkbox } from './Checkbox.jsx';
export { default as Radio } from './Radio.jsx';
export { default as FieldSelect } from './FieldSelect.jsx';
export { default as SidebarButton } from './SidebarButton.jsx';
export { default as OdysseyLogo } from './OdysseyLogo.jsx';
export { default as EmptyState } from './EmptyState.jsx';
export { default as SectionLabel } from './SectionLabel.jsx';
export { default as AddSectionDivider } from './AddSectionDivider.jsx';
export { default as AddSectionButton } from './AddSectionButton.jsx';
export { default as StepIndicator } from './StepIndicator.jsx';
export { default as MenuRow } from './MenuRow.jsx';
export { default as DropdownButton } from './DropdownButton.jsx';
export { default as Breadcrumb } from './Breadcrumb.jsx';
export { default as MenuRowRadio } from './MenuRowRadio.jsx';
export { default as MenuRowCheckbox } from './MenuRowCheckbox.jsx';
export { default as StopBadge } from './StopBadge.jsx';

// ── Molecules ──────────────────────────────────────────
export { default as LeadNav } from './LeadNav.jsx';
export { default as GlobalSearch } from './GlobalSearch.jsx';
export { default as TrailNav } from './TrailNav.jsx';
export { default as PageHeader } from './PageHeader.jsx';
export { default as SectionHeader } from './SectionHeader.jsx';
export { default as HeaderStrip } from './HeaderStrip.jsx';
export { default as TitleSubtitle } from './TitleSubtitle.jsx';
export { default as StepperButtonsFooter } from './StepperButtonsFooter.jsx';
export { default as EntityChip } from './EntityChip.jsx';
export { default as WidgetMetricRow } from './WidgetMetricRow.jsx';
export { default as WidgetPieChart } from './WidgetPieChart.jsx';
export { default as WidgetCtaRow } from './WidgetCtaRow.jsx';
export { default as WidgetMini } from './WidgetMini.jsx';
export { default as MenuDropdown } from './MenuDropdown.jsx';
export { default as DropdownMenu } from './DropdownMenu.jsx';
export { default as Dropdown } from './Dropdown.jsx';
export { default as ActionMenu } from './ActionMenu.jsx';
export { default as Paginator } from './Paginator.jsx';
export { default as DataTable } from './DataTable.jsx';
export { default as CustomerRow } from './CustomerRow.jsx';
export { default as FormField } from './FormField.jsx';
export { default as TextArea } from './TextArea.jsx';
export { default as FilterSuggestions } from './FilterSuggestions.jsx';
export { default as MatchRow } from './MatchRow.jsx';
export { default as MatchSimpleRow } from './MatchSimpleRow.jsx';
export { default as Alert } from './Alert.jsx';
export { default as Accordion } from './Accordion.jsx';
export { default as SubAccordion } from './SubAccordion.jsx';
export { default as SummaryStrip } from './SummaryStrip.jsx';
export { default as Timeline } from './Timeline.jsx';
export { default as ButtonToggle } from './ButtonToggle.jsx';
export { default as Tooltip } from './Tooltip.jsx';
export { default as CalendarPicker } from './CalendarPicker.jsx';
export { default as DatePicker } from './DatePicker.jsx';
export { default as TimePicker } from './TimePicker.jsx';

// ── Organisms ──────────────────────────────────────────
export { default as GroupTable } from './GroupTable.jsx';
export { default as SearchChip } from './SearchChip.jsx';
export { default as Spinner } from './Spinner.jsx';
export { default as MultiSelect } from './MultiSelect.jsx';
export { default as Navbar } from './Navbar.jsx';
export { default as Sidebar } from './Sidebar.jsx';
export { default as Widget } from './Widget.jsx';
export { default as WidgetsLeftMenu } from './WidgetsLeftMenu.jsx';
export { default as ModalLarge } from './ModalLarge.jsx';
export { default as ModalMedium } from './ModalMedium.jsx';
export { default as WidgetVariantPicker } from './WidgetVariantPicker.jsx';
export { default as AuthModal } from './AuthModal.jsx';
export { default as AuthContent } from './AuthContent.jsx';
export { default as ComboBox } from './ComboBox.jsx';
// SearchField — former name — prefer ComboBox
export { default as SearchField } from './ComboBox.jsx';
export { default as GlobalSearchPanel } from './GlobalSearchPanel.jsx';
export { default as GlobalSearchResults } from './GlobalSearchResults.jsx';
export { default as FieldSearchResults } from './FieldSearchResults.jsx';
export { default as ModalHeader } from './ModalHeader.jsx';
export { default as ModalFooter } from './ModalFooter.jsx';
export { default as RightPanel } from './RightPanel.jsx';
export { default as ShipmentsBar } from './ShipmentsBar.jsx';

// ── Hooks / positioning ────────────────────────────────
// Anchored, flip-aware popover positioning. `useAnchoredPortal` is used
// internally by Dropdown and exported so consumers can compose their own
// anchored menus (e.g. a table row-action menu) and inherit the boundary flip.
// `computeVerticalPlacement` is the pure up/down decision — exported for
// consumers that own their own positioning (right-aligned menus, etc.) but want
// the same flip math.
export { useAnchoredPortal, computeVerticalPlacement } from './useAnchoredPortal.jsx';
export { useFieldPopover } from './useFieldPopover.js';
export { useCountdown, formatHMS, formatMMSS } from './useCountdown.js';
export { default as DurationPicker } from './DurationPicker.jsx';
export {
  UNIT_CONFIG, durationOptions, formatDuration, parseDuration, formatRemaining, countdownVariant,
} from './DurationPicker.jsx';
