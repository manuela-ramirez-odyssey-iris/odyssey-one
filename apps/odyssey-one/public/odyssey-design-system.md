# Odyssey One — Design System (tokens & usage)

> Generated from code. Every value below is read from `packages/tokens/tokens.css`, and every
> "Used for" line from the live Design System Explorer (the per-component token tables).
> Regenerate with `npm run ds:md`; never edit the generated file by hand.
>
> **Who this is for:** people and AI agents (e.g. a Gemini/ChatGPT agent building slides,
> one-pagers or mockups) that need to reproduce the Odyssey One look without access to our code.

## The look and feel, in one paragraph

Odyssey One is an enterprise logistics platform (shipments, orders, carriers, tracking). It looks
**calm, dense and precise**: white cards on a very light cool-gray canvas, a near-black navy as
the one strong color, and small amounts of saturated color reserved for *meaning* (status, links,
charts), never decoration. Type is **Inter** throughout, mostly 12–16px, medium/semibold for labels
and values, regular for body. Corners are small (4–8px), borders are hairline (1px, cool gray),
shadows are faint. There are no gradients, illustrations or brand flourishes inside the product —
the data is the hero.

## How to reproduce it (rules of thumb)

- **Canvas & surfaces:** page background `#F7F8FA` (`--bg-secondary`), cards/panels white
  (`--bg-primary`) with a `#E4E6EB` 1px border (`--border-subtle`) and 8px radius.
- **The one dark color:** Deep Sea Neutral 900 `#1B2537` — the top navigation bar, primary buttons,
  and primary text. Use it for title bars and emphasis blocks in slides.
- **Text hierarchy:** primary `#1B2537`, secondary `#384253`, tertiary/muted `#6B7280`,
  placeholder `#9DA3B0`. Small uppercase muted labels (12px medium, `#6B7280`) over larger
  semibold values is the signature "stat" pattern (see SummaryStrip).
- **Links / interactive accent:** Carolina Blue 600 `#276DA2`; focus rings Carolina Blue 400.
- **Meaning colors (use only for meaning):** success Caribbean Green 600 `#237E70`, error
  Bittersweet 600 `#D23930`, warning Sunrise Yellow (`#F8CE51` fill / `#8F3F11` text).
- **Badges / pills:** soft 100-tint background + dark 800 text of the same hue, 4px radius,
  12px medium text. Never a saturated fill with white text (except the notification dot).
- **Charts:** use the `--chart-1 … --chart-11` sequence in order — hue pairs (dark then light of
  the same hue), with `--chart-rest` gray for "other".
- **Spacing:** 4px grid (4, 8, 12, 16, 20, 24, 32 …). Generous outer padding (24–48px), tight
  inner rhythm (4–12px).
- **Density:** information-dense tables and strips; prefer compact rows and many small facts over
  big hero numbers. One accent per view.

## Reading the tables below

Tokens come in three layers. **Primitives** are raw palette values (`--deep-sea-neutral-900`).
**Semantic** tokens give them a job (`--text-primary`). **Component** tokens bind a semantic to one
component (`--btn-primary-bg`). When building something new, pick the *semantic* token whose
"Used for" matches your intent; fall back to a primitive only for charts or illustrations.

_Generated 2026-10-01 from tokens.css (217 tokens) and 572 DSM token-usage rows._

## Primitives: Deep Sea Neutral

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--deep-sea-neutral-50` | `#F7F8FA` |  | ButtonToggle: thumb hover bg (mirrors .btn--icon hover); DropdownButton: hover background; PaginationButton: secondary hover bg; ShipmentsBar: tab hover fill (code-only); Spinner: the arc — Figma angular gradient DSN/50 → DSN/700 (was raw white → #2D2D2D) |
| `--deep-sea-neutral-100` | `#F2F3F5` |  | ButtonToggle: thumb pressed bg (mirrors .btn--icon pressed); CalendarPicker + DatePicker: day hover background (code-only); DropdownButton: pressed / open background; EmptyState: surface background; MenuRow: hover bg + selected bg; MenuRowCheckbox: hover surface; MenuRowRadio: hover surface; PaginationButton: secondary pressed bg; +3 more |
| `--deep-sea-neutral-200` | `#E4E6EB` |  | Badge: toggle gray badge — hover + selected bg; CalendarPicker + DatePicker: in-range day background; GlobalSearch: clear-button icon color when focused; MatchRow: row pressed background (interactive); MatchSimpleRow: avatar surface + pressed row background; MenuRow: active / dragging bg; PillTab: metric Badge background on unselected hover (local --badge-gray-bg override); Sidebar: rail background; +2 more |
| `--deep-sea-neutral-300` | `#D0D4DB` |  | Button: secondary/icon/error border; CalendarPicker + DatePicker: card border; DropdownButton: idle border; DurationPicker: field border, default state (FormField); LeadNav: hamburger icon color on hover (code-only state); MenuRowCheckbox: bordered (Type=Line) outline; MenuRowRadio: default border; Navbar: profile name label color; +6 more |
| `--deep-sea-neutral-400` | `#9DA3B0` |  | AddSectionDivider: dashed top-border color and label text color; Breadcrumb: link-segment label + chevron (always); Button: outline + ghost pressed border; ButtonToggle: thumb hover/pressed border + pressed icon (mirrors .btn--icon); CalendarPicker + DatePicker: pending-start ring color; DataTable: NEUTRAL sort icon (one tone below --text-tertiary; driving/hover icon = --text-primary); DropdownButton: hover / pressed border; GlobalSearch: nav arrow + clear-button icon color at rest; +7 more |
| `--deep-sea-neutral-500` | `#6B7280` |  | CalendarPicker + DatePicker: weekday labels + adjacent-month day text; DurationPicker: trailing chevron stroke; LeadNav: hamburger icon color at rest (Menu state=Off); Navbar: hamburger + trail icon color; ShipmentsBar: prev/next arrows; TimePicker: trailing chevron-down stroke; TrailNav: icon button color (bell, customers, chevron, editor icons) |
| `--deep-sea-neutral-600` | `#4C5463` |  | Button: primary hover bg; ComboBox: focused 2px input border; PaginationButton: current page hover bg; WidgetMini: label + donut center text |
| `--deep-sea-neutral-700` | `#384253` |  | Breadcrumb: current-segment label + link hover; Button: secondary label; CalendarPicker + DatePicker: selected / range-start / range-end background; DropdownButton: label + chevron color; Navbar: profile section divider; PaginationButton: inactive page + arrow fg; SearchChip: badge — inherits .global-search-chip canon (mock's 600/200 flagged as drift); TrailNav: divider between bell/customers area and profile section |
| `--deep-sea-neutral-800` | `#283142` |  | Tab: hover label (not current) — code + DSM only |
| `--deep-sea-neutral-900` | `#1B2537` |  | AddSectionButton: pill background — active/pressed; Badge: toggle gray badge — selected ring; Button: primary bg (idle/pressed); GlobalSearch: bar background; MenuRowRadio: selected border; OdysseyLogo: dark variant wordmark fill; PaginationButton: current page bg (idle/pressed); Tooltip: card background; +2 more |
| `--deep-sea-neutral-950` | `#0F182A` |  | SearchChip: panel surface / code text |
| `--carolina-blue-100` | `#DCE8F7` |  | WidgetCtaRow: icon container bg — hover/pressed |

## Primitives: White

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--white` | `#FFFFFF` |  | AddSectionButton: plus icon color inside the pill; CalendarPicker + DatePicker: card background; DropdownButton: idle background; DropdownMenu: surface background; DurationPicker: field + dropdown surface (via FormField / DropdownMenu); GlobalSearch: title-mode text color; MenuRowRadio: row surface; MultiSelect: field + dropdown + table cell surface; +10 more |

## Primitives: Carolina Blue

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--carolina-blue-50` | `#F3F7FC` |  | WidgetCtaRow: icon container bg — idle |
| `--carolina-blue-200` | `#C6DEF1` |  | Figma-deprecated as a primitive (Efrain, — kept code-side; backs --status-info-message (Alert "info" surface). |
| `--carolina-blue-400` | `#5BA4D4` |  | AddSectionButton: pill background — hover; Badge: count bg; LeadNav: hamburger icon color when active (Menu state=On); OdysseyLogo: "One" suffix fill — both variants; SearchChip: panel border (mock's Carolina Blue/500 is not a canon token — mapped down); TimelineDot: color="info" fill |
| `--carolina-blue-600` | `#276DA2` |  | AddSectionButton: top-border line and pill background (rest) |

## Primitives: Bittersweet

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--bittersweet-100` | `#FDE5E3` |  | Palette primitive — not used directly by components |
| `--bittersweet-200` | `#FBD0CD` |  | ComboBox: error border — idle; FieldSelect: divider — error-default; FormField: error border — idle; TextArea: error border (idle/focus) + message — inherited from FormField |
| `--bittersweet-300` | `#F7AEAA` |  | Added by Efrain — Alert error-list row dividers.; Alert: error-list row dividers (token's first consumer); SearchChip: invalid code text (red legible on the dark panel) |
| `--bittersweet-600` | `#D23930` |  | Badge: notification bg; Button: error label; ComboBox: error border — focused; DurationPicker: error border + message on invalid blur (FormField); FieldSelect: divider — error; FormField: error border — focused; StepIndicator: error circle fill; StopBadge: issue pill + status-circle fill (white label/glyph); +4 more |
| `--bittersweet-800` | `#922922` |  | Palette primitive — not used directly by components |

## Primitives: Caribbean Green

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--caribbean-green-100` | `#D4F3EB` |  | StepIndicator: on circle ring (1px) |
| `--caribbean-green-200` | `#A8E7D7` |  | Figma-deprecated as a primitive (Efrain, — kept code-side; backs --status-success-message (Alert "success" surface). |
| `--caribbean-green-600` | `#237E70` |  | ComboBox: validated border — focused; FormField: validated border — focused; StepIndicator: on circle fill; StopBadge: completed pill + status-circle fill (white label/glyph); SummaryStrip: tone: 'positive' / 'negative' value color (code-only); TimelineDot: color="green" fill |
| `--caribbean-green-800` | `#1D524A` |  | Palette primitive — not used directly by components |

## Primitives: Sunrise Yellow

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--sunrise-yellow-50` | `#FFFBEB` |  | Palette primitive — not used directly by components |
| `--sunrise-yellow-100` | `#FDF1C8` |  | Palette primitive — not used directly by components |
| `--sunrise-yellow-200` | `#FADF7E` |  | Palette primitive — not used directly by components |
| `--sunrise-yellow-300` | `#F8CE51` |  | TimelineDot: color="amber" fill |
| `--sunrise-yellow-600` | `#B46E05` |  | The ramp jumped 300 -> 800, i.e. from a true yellow straight to a rust, with nothing usable as a standalone mark on a light surface: 300 is ~1.7:1 on white, 800 reads brown. |
| `--sunrise-yellow-800` | `#8F3F11` |  | Palette primitive — not used directly by components |

## Primitives: Bay of Many

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--bay-of-many-100` | `#D0F1FF` |  | Palette primitive — not used directly by components |
| `--bay-of-many-950` | `#063A83` |  | Palette primitive — not used directly by components |

## Primitives: Purple

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--purple-100` | `#EDE9FE` |  | StopBadge: changed pill + status-circle fill |
| `--purple-800` | `#5B21B6` |  | StopBadge: changed label, dot glyph, and the circle ring (white cannot separate a pale circle from a pale pill); TimelineDot: color="purple" fill |

## Primitives: Ice Blue

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--ice-blue-200` | `#C0DEFD` |  | Palette primitive — not used directly by components |
| `--ice-blue-600` | `#296DE7` |  | TimelineDot: color="blue" fill; WidgetMini: donut arc (was raw in the mock — bound during normalization) |

## Primitives: Tan Hide

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--tan-hide-300` | `#FFB872` |  | Palette primitive — not used directly by components |
| `--tan-hide-600` | `#FC6F13` |  | Palette primitive — not used directly by components |

## Semantic: Text

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--text-primary` | `var(--deep-sea-neutral-900)` | `#1B2537 (Deep Sea Neutral 900)` | Accordion: title · description + chevron; AuthContent: form field labels; CalendarPicker + DatePicker: current-month day text, month title; CustomerRow: label text color; GroupTable: column-header labels (semibold) · group id + header values + TOTAL (medium); GroupTable: child lead cell + footer (TOTAL) row; GroupTable: nested table header labels / nested row values — same treatment as the outer table, over the gray band; MatchRow: matchId + meta label text; +14 more |
| `--text-secondary` | `var(--deep-sea-neutral-700)` | `#384253 (Deep Sea Neutral 700)` | AuthContent: account prompt text; ButtonToggle: unselected icon hover (code + DSM only — interaction state); ComboBox: label text; IconButton: icon color at rest; IconButtonGhost: icon color; MatchRow: route + meta value text; MatchSimpleRow: customer + address; MenuRow: label + leading icon color; +5 more |
| `--text-secondary-soft` | `var(--deep-sea-neutral-600)` | `#4C5463 (Deep Sea Neutral 600)` | Softer secondary text: supporting lines that sit under a primary label. |
| `--text-tertiary` | `var(--deep-sea-neutral-500)` | `#6B7280 (Deep Sea Neutral 500)` | Accordion: title · description + chevron; ActionMenu: trigger icon at rest; ButtonToggle: icon color (both states, via currentColor); ComboBox: disabled input text; CustomerRow: Trash / Star icon color; DropdownMenu: empty message color; FieldSearchResults: empty-state message; FilterSuggestions: section title color; +18 more |
| `--text-placeholder` | `var(--deep-sea-neutral-400)` | `#9DA3B0 (Deep Sea Neutral 400)` | ComboBox: Search icon at rest; ComboBox: disabled bar icons (search / chevron); EmptyState: icon and message color; MenuRow: disabled label + icon + grip color; MenuRowRadio: disabled label; SubAccordion: info glyph |
| `--text-inverse` | `var(--white)` | `#FFFFFF (White)` | GlobalSearch: input text color; Navbar: search input text color |
| `--text-inverse-muted` | `var(--deep-sea-neutral-300)` | `#D0D4DB (Deep Sea Neutral 300)` | Muted text on dark (navy) surfaces, e.g. secondary info in the top bar. |
| `--text-link` | `var(--carolina-blue-600)` | `#276DA2 (Carolina Blue 600)` | AuthContent: "Create an account." link color; Button: link label; GlobalSearchResults: "Filter More" CTA; GroupTable: detailNote Show more/less toggle — a link Button, offset from the clamped text; ModalFooter: ButtonLink text (filters / link) |
| `--text-error` | `var(--bittersweet-600)` | `#D23930 (Bittersweet 600)` | ActionMenu: danger item label; Alert: error-list rows (field + reason); FieldSearchResults: alert-state message; GlobalSearchResults: alert-state message; GroupTable: groups[].actionTone — danger \| warning \| success \| info, via the --gt-action-bg/--gt-action-fg pair each tone declares; TextArea: error border (idle/focus) + message — inherited from FormField |
| `--text-success` | `var(--caribbean-green-600)` | `#237E70 (Caribbean Green 600)` | AuthContent: valid-state check icon color on prefilled fields; ComboBox: validated message; FormField: validated message |
| `--text-warning` | `var(--sunrise-yellow-600)` | `#B46E05 (Sunrise Yellow 600)` | Repointed 800 -> 600, so all three state colors sit on a 600. |

## Semantic: Chart palette

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--chart-1` | `var(--ice-blue-600)` | `#296DE7 (Ice Blue 600)` | Widget: chart segment + matching indicator dot; WidgetMetricRow: default indicator dot color; WidgetPieChart: segment 1 color |
| `--chart-2` | `var(--ice-blue-200)` | `#C0DEFD (Ice Blue 200)` | Widget: chart segment + matching indicator dot; WidgetMetricRow: segment 2 indicator dot color; WidgetPieChart: segment 2 color |
| `--chart-3` | `var(--tan-hide-600)` | `#FC6F13 (Tan Hide 600)` | Widget: chart segment + matching indicator dot; WidgetMetricRow: segment 3 indicator dot color; WidgetPieChart: segment 3 color |
| `--chart-4` | `var(--tan-hide-300)` | `#FFB872 (Tan Hide 300)` | Widget: chart segment + matching indicator dot; WidgetMetricRow: segment 4 indicator dot color; WidgetPieChart: segment 4 color |
| `--chart-5` | `var(--caribbean-green-600)` | `#237E70 (Caribbean Green 600)` | Same dark/light hue-pair shape as 1-4, built from primitives that already exist -- no new hexes.; Widget: chart segment + matching indicator dot |
| `--chart-6` | `var(--caribbean-green-200)` | `#A8E7D7 (Caribbean Green 200)` | Widget: chart segment + matching indicator dot |
| `--chart-7` | `var(--sunrise-yellow-600)` | `#B46E05 (Sunrise Yellow 600)` | Widget: chart segment + matching indicator dot |
| `--chart-8` | `var(--sunrise-yellow-300)` | `#F8CE51 (Sunrise Yellow 300)` | Widget: chart segment + matching indicator dot |
| `--chart-9` | `var(--purple-800)` | `#5B21B6 (Purple 800)` | 9-11 added, user request.; Widget: chart segment + matching indicator dot |
| `--chart-10` | `var(--bittersweet-600)` | `#D23930 (Bittersweet 600)` | Widget: chart segment + matching indicator dot |
| `--chart-11` | `var(--bittersweet-300)` | `#F7AEAA (Bittersweet 300)` | Widget: chart segment + matching indicator dot |
| `--chart-rest` | `var(--deep-sea-neutral-200)` | `#E4E6EB (Deep Sea Neutral 200)` | Widget: unfilled remainder of donut arc — never a legend color; WidgetMini: donut track; WidgetPieChart: background ring + unfilled arc when total > sum |

## Semantic: Background

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--bg-primary` | `var(--white)` | `#FFFFFF (White)` | Accordion: card surface; AuthModal: card surface; ButtonToggle: sliding thumb fill; ComboBox: input bar background; CustomerRow: row background; DataTable: card / header-inner / body background; FilterSuggestions: panel background; GlobalSearchPanel: panel background; +10 more |
| `--bg-secondary` | `var(--deep-sea-neutral-50)` | `#F7F8FA (Deep Sea Neutral 50)` | ActionMenu: trigger hover fill; ComboBox: disabled input bar surface; CustomerRow: icon container fill; DataTable: sticky header strip background; GroupTable: child-row band background / group-row + card surface; GroupTable: nested flavor: the gray band hosting the second table, inset 48px on the LEFT only (a right inset would cut it short of the scroll extent); HeaderStrip: root background; ModalLarge: header background; +4 more |
| `--bg-tertiary` | `var(--deep-sea-neutral-100)` | `#F2F3F5 (Deep Sea Neutral 100)` | ButtonToggle: track background; MatchRow: avatar container fill + row hover background (interactive); MatchSimpleRow: hover row background; WidgetCtaRow: row background — pressed |
| `--bg-inverse` | `var(--deep-sea-neutral-900)` | `#1B2537 (Deep Sea Neutral 900)` | The signature dark navy surface: top navigation bar, primary buttons, dark tooltips. In slides: title bars and emphasis blocks. |
| `--bg-error` | `var(--bittersweet-100)` | `#FDE5E3 (Bittersweet 100)` | Button: error idle bg; GroupTable: groups[].actionTone — danger \| warning \| success \| info, via the --gt-action-bg/--gt-action-fg pair each tone declares |
| `--bg-success` | `var(--caribbean-green-100)` | `#D4F3EB (Caribbean Green 100)` | Light green background for success messages and success states. |
| `--bg-warning` | `var(--sunrise-yellow-50)` | `#FFFBEB (Sunrise Yellow 50)` | Very light yellow background for warning messages. |

## Semantic: Border

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--border-default` | `var(--deep-sea-neutral-300)` | `#D0D4DB (Deep Sea Neutral 300)` | ButtonToggle: thumb border; ComboBox: idle 1px input border; FieldSelect: divider — default; GroupTable: detailSections: the 1px seam between SIBLING nested tables — on the 2nd and later only, since the group row above the first already carries one. A step darker than the --border-subtle hairlines INSIDE a table: the seam divides two independent tables, the hairlines divide rows within one; Sidebar: group divider hairline; Tab: hover underline (not current) — code + DSM only; WidgetVariantPicker: inactive dot stroke |
| `--border-subtle` | `var(--deep-sea-neutral-200)` | `#E4E6EB (Deep Sea Neutral 200)` | Accordion: card border (card-surface convention); AuthModal: card border / header divider; GlobalSearchPanel: header and footer dividers; GroupTable: 1px hairline on col-header, group rows, child rows — uniform in all states (footer has no own border); GroupTable: pinned action column (68px, sticky right) + its left shadow — DataTable's exact value, and the table is border-collapse: separate because Chrome will not paint cell shadows in collapsed tables; HeaderStrip: root bottom border; MatchRow: row bottom divider + panel border; MenuDropdown: header bottom divider; +12 more |
| `--border-strong` | `var(--deep-sea-neutral-900)` | `#1B2537 (Deep Sea Neutral 900)` | FieldSelect: divider — focus; FormField: focus border |
| `--border-focus` | `var(--carolina-blue-400)` | `#5BA4D4 (Carolina Blue 400)` | Badge: toggle gray badge — keyboard focus ring; PaginationButton: keyboard focus ring; Tab: :focus-visible outline |
| `--border-inverse` | `var(--deep-sea-neutral-600)` | `#4C5463 (Deep Sea Neutral 600)` | Dividers and outlines on dark navy surfaces. |
| `--border-success` | `var(--caribbean-green-200)` | `#A8E7D7 (Caribbean Green 200)` | validated-field border, mirrors --text-success/--bg-success; ComboBox: validated border — idle; FormField: validated border — idle |

## Semantic: Status

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--status-info-message` | `var(--carolina-blue-200)` | `#C6DEF1 (Carolina Blue 200)` | Border/accent of informational message banners (blue). |
| `--status-success-message` | `var(--caribbean-green-200)` | `#A8E7D7 (Caribbean Green 200)` | Border/accent of success message banners (green). |
| `--status-warning-message` | `var(--sunrise-yellow-200)` | `#FADF7E (Sunrise Yellow 200)` | Border/accent of warning message banners (yellow). |
| `--status-error-message` | `var(--bittersweet-200)` | `#FBD0CD (Bittersweet 200)` | Border/accent of error message banners (red). |

## Component: Navbar

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--navbar-bg` | `var(--bg-inverse)` | `#1B2537 (Deep Sea Neutral 900)` | Navbar: navbar background — context='internal' |
| `--navbar-text` | `var(--deep-sea-neutral-50)` | `#F7F8FA (Deep Sea Neutral 50)` | Main text and icons in the dark top navigation bar. |
| `--navbar-text-muted` | `var(--text-placeholder)` | `#9DA3B0 (Deep Sea Neutral 400)` | Secondary text in the top navigation bar (placeholders, hints). |
| `--navbar-search-bg` | `var(--bg-inverse)` | `#1B2537 (Deep Sea Neutral 900)` | Background of the search field inside the top navigation bar. |
| `--navbar-search-focus` | `var(--border-focus)` | `#5BA4D4 (Carolina Blue 400)` | Focus ring of the top-bar search field. |
| `--navbar-search-dropdown` | `var(--deep-sea-neutral-700)` | `#384253 (Deep Sea Neutral 700)` | Background of the search suggestions dropdown under the top bar. |
| `--navbar-divider` | `var(--border-inverse)` | `#4C5463 (Deep Sea Neutral 600)` | Thin separators between groups in the top navigation bar. |
| `--navbar-notification` | `var(--bittersweet-600)` | `#D23930 (Bittersweet 600)` | Red notification count bubble on the bell icon. |
| `--navbar-user-name` | `var(--text-inverse-muted)` | `#D0D4DB (Deep Sea Neutral 300)` | User name and role next to the avatar in the top bar. |

## Component: Button

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--btn-primary-bg` | `var(--bg-inverse)` | `#1B2537 (Deep Sea Neutral 900)` | Primary button fill — dark navy. The main action on a screen. |
| `--btn-primary-text` | `var(--text-inverse)` | `#FFFFFF (White)` | Primary button label and icon — white. |
| `--btn-primary-hover` | `var(--deep-sea-neutral-700)` | `#384253 (Deep Sea Neutral 700)` | Primary button fill on hover — slightly lighter navy. |
| `--btn-secondary-bg` | `var(--bg-primary)` | `#FFFFFF (White)` | Secondary button fill — white. |
| `--btn-secondary-border` | `var(--border-default)` | `#D0D4DB (Deep Sea Neutral 300)` | Secondary button 1px outline — light gray. |
| `--btn-secondary-text` | `var(--text-secondary)` | `#384253 (Deep Sea Neutral 700)` | Secondary button label and icon — dark gray. |
| `--btn-link-text` | `var(--text-link)` | `#276DA2 (Carolina Blue 600)` | Text-only link buttons — blue. |

## Component: Input

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--input-bg` | `var(--bg-primary)` | `#FFFFFF (White)` | Background of text inputs, dropdown fields and date fields. |
| `--input-border` | `var(--border-default)` | `#D0D4DB (Deep Sea Neutral 300)` | TextArea: box surface + border (→ --input-border-focus on focus-within) |
| `--input-border-focus` | `var(--border-strong)` | `#1B2537 (Deep Sea Neutral 900)` | Input border while focused — dark navy. |
| `--input-text` | `var(--text-primary)` | `#1B2537 (Deep Sea Neutral 900)` | Text typed into inputs. |
| `--input-placeholder` | `var(--text-placeholder)` | `#9DA3B0 (Deep Sea Neutral 400)` | Placeholder text inside empty inputs. |
| `--input-label` | `var(--text-secondary)` | `#384253 (Deep Sea Neutral 700)` | Label above a form field. |

## Component: Checkbox / Radio

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--control-bg` | `var(--bg-primary)` | `#FFFFFF (White)` | Checkbox: unchecked box fill; Radio: unchecked dot fill |
| `--control-border` | `var(--border-default)` | `#D0D4DB (Deep Sea Neutral 300)` | Checkbox: unchecked box border; Radio: unchecked border |
| `--control-border-hover` | `var(--deep-sea-neutral-400)` | `#9DA3B0 (Deep Sea Neutral 400)` | Checkbox: hover border |
| `--control-checked-bg` | `var(--bg-inverse)` | `#1B2537 (Deep Sea Neutral 900)` | Checkbox: checked/indeterminate fill; Radio: checked fill |
| `--control-checked-hover-bg` | `var(--deep-sea-neutral-700)` | `#384253 (Deep Sea Neutral 700)` | Checked checkbox/radio fill on hover. |
| `--control-indicator` | `var(--text-inverse)` | `#FFFFFF (White)` | The check mark / radio dot inside a checked control — white. |
| `--control-border-disabled` | `var(--border-subtle)` | `#E4E6EB (Deep Sea Neutral 200)` | Checkbox/radio outline when disabled. |
| `--control-checked-bg-disabled` | `var(--border-default)` | `#D0D4DB (Deep Sea Neutral 300)` | Checked checkbox/radio fill when disabled. |
| `--control-label` | `var(--text-secondary)` | `#384253 (Deep Sea Neutral 700)` | Text label beside a checkbox or radio. |
| `--control-label-disabled` | `var(--text-placeholder)` | `#9DA3B0 (Deep Sea Neutral 400)` | Checkbox/radio label when disabled. |
| `--control-focus` | `var(--border-focus)` | `#5BA4D4 (Carolina Blue 400)` | Checkbox: focus ring; Radio: focus ring |

## Component: Tabs

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--tab-active-bg` | `var(--deep-sea-neutral-200)` | `#E4E6EB (Deep Sea Neutral 200)` | PillTab: selected pill background |
| `--tab-active-text` | `var(--text-primary)` | `#1B2537 (Deep Sea Neutral 900)` | PillTab: selected label color |
| `--tab-inactive-text` | `var(--deep-sea-neutral-600)` | `#4C5463 (Deep Sea Neutral 600)` | PillTab: unselected label color |

## Component: Panel

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--panel-bg` | `var(--bg-primary)` | `#FFFFFF (White)` | Card and panel background — white. |
| `--panel-border` | `var(--border-subtle)` | `#E4E6EB (Deep Sea Neutral 200)` | Card and panel 1px outline — light gray. |
| `--panel-heading` | `var(--text-primary)` | `#1B2537 (Deep Sea Neutral 900)` | Card and panel title text. |
| `--panel-footer-border` | `var(--border-subtle)` | `#E4E6EB (Deep Sea Neutral 200)` | Divider line above a card's footer actions. |

## Component: Badge

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--badge-blue-bg` | `var(--bay-of-many-100)` | `#D0F1FF (Bay Of Many 100)` | Badge: blue variant background |
| `--badge-blue-text` | `var(--bay-of-many-950)` | `#063A83 (Bay Of Many 950)` | Badge: blue variant text/icon |
| `--badge-yellow-bg` | `var(--sunrise-yellow-100)` | `#FDF1C8 (Sunrise Yellow 100)` | Amber/yellow badge background (pending, warning-ish statuses). |
| `--badge-yellow-text` | `var(--sunrise-yellow-800)` | `#8F3F11 (Sunrise Yellow 800)` | Amber/yellow badge text — dark brown-orange on the light yellow fill. |
| `--badge-red-bg` | `var(--bittersweet-100)` | `#FDE5E3 (Bittersweet 100)` | Badge: red variant background |
| `--badge-red-text` | `var(--bittersweet-800)` | `#922922 (Bittersweet 800)` | Red badge text (failures, errors) on the light red fill. |
| `--badge-green-bg` | `var(--caribbean-green-100)` | `#D4F3EB (Caribbean Green 100)` | Badge: green variant background |
| `--badge-green-text` | `var(--caribbean-green-800)` | `#1D524A (Caribbean Green 800)` | Badge: time icon-badge icon |
| `--badge-purple-bg` | `var(--purple-100)` | `#EDE9FE (Purple 100)` | Purple badge background — reserved for external (customer-originated) changes. |
| `--badge-purple-text` | `var(--purple-800)` | `#5B21B6 (Purple 800)` | Purple badge text on the light purple fill. |
| `--badge-gray-bg` | `var(--deep-sea-neutral-100)` | `#F2F3F5 (Deep Sea Neutral 100)` | Badge: gray + metric background; MultiSelect: label + description badge fill; PillTab: metric Badge background (from Badge component) |
| `--badge-gray-text` | `var(--deep-sea-neutral-700)` | `#384253 (Deep Sea Neutral 700)` | MultiSelect: label + description badge text |
| `--badge-info-bg` | `var(--carolina-blue-200)` | `#C6DEF1 (Carolina Blue 200)` | icon-badge "info" surface (= --alert-info-bg); Badge: info icon-badge bg |
| `--badge-info-text` | `var(--carolina-blue-600)` | `#276DA2 (Carolina Blue 600)` | icon-badge "info" icon; Badge: info icon-badge icon |

## Component: Dropdown

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--dropdown-bg` | `var(--bg-primary)` | `#FFFFFF (White)` | Dropdown menu background — white. |
| `--dropdown-border` | `var(--border-subtle)` | `#E4E6EB (Deep Sea Neutral 200)` | Dropdown menu 1px outline. |
| `--dropdown-hover-bg` | `var(--bg-tertiary)` | `#F2F3F5 (Deep Sea Neutral 100)` | Highlighted (hovered) option in a dropdown menu. |

## Component: Alert

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--alert-info-bg` | `var(--status-info-message)` | `#C6DEF1 (Carolina Blue 200)` | Alert: info surface |
| `--alert-success-bg` | `var(--status-success-message)` | `#A8E7D7 (Caribbean Green 200)` | Alert: success surface |
| `--alert-warning-bg` | `var(--status-warning-message)` | `#FADF7E (Sunrise Yellow 200)` | Alert: warning surface |
| `--alert-error-bg` | `var(--status-error-message)` | `#FBD0CD (Bittersweet 200)` | Alert: error surface |
| `--alert-text` | `var(--deep-sea-neutral-900)` | `#1B2537 (Deep Sea Neutral 900)` | Alert: uniform text + icon color (via currentColor) |

## Typography

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--font-primary` | `'Inter', sans-serif` |  | The only typeface in the product: Inter, for every heading, label, value and body text. Use Inter for all text in slides and mockups. |

## Typography Scale

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--font-size-xs` | `12px` |  | ModalHeader: subtitle (label-xs); TitleSubtitle: subtitle (label-xs-medium); Tooltip: all text (label/xs regular); WidgetVariantPicker: variant label (label-xs-regular) |
| `--font-size-sm` | `14px` |  | AuthContent: forgot-password + account link text; Breadcrumb: label type (.text-label-sm-medium); PageHeader: supportingText (label/sm regular); SectionHeader: supporting text font-size (via text-label-sm-regular); TitleSubtitle: title (label-sm-medium) |
| `--font-size-base` | `16px` |  | 16px — default value text: stat values in summary strips, larger body copy, section titles inside cards. |
| `--font-size-lg` | `18px` |  | ModalHeader: title (heading-lg-semibold); ModalMedium: title font size (heading-lg); RightPanel: title (heading-lg-semibold) |
| `--font-size-xl` | `20px` |  | 20px — page and modal titles. |
| `--font-size-2xl` | `24px` |  | SectionHeader: title font-size (via text-heading-2xl-semibold); WidgetMini: value typography (deliberate 1.0 leading, per Figma) |
| `--font-size-3xl` | `32px` |  | PageHeader: title font-size (via text-display-3xl-semibold utility) |
| `--font-size-4xl` | `40px` |  | 40px — big display numbers (e.g. a bid countdown). Rare; the product prefers many small facts over one hero number. |
| `--line-height-xs` | `16px` |  | TitleSubtitle: subtitle line-height; Tooltip: all text (label/xs regular) |
| `--line-height-sm` | `20px` |  | Breadcrumb: label type (.text-label-sm-medium); TitleSubtitle: title line-height |
| `--line-height-base` | `24px` |  | Line height paired with the 16px size. |
| `--line-height-lg` | `24px` |  | WidgetMini: value typography (deliberate 1.0 leading, per Figma) |
| `--line-height-xl` | `28px` |  | Line height paired with the 20px size. |
| `--line-height-2xl` | `32px` |  | SectionHeader: title line-height |
| `--line-height-3xl` | `32px` |  | PageHeader: title line-height |
| `--line-height-4xl` | `48px` |  | Line height paired with the 40px display size. |
| `--font-weight-regular` | `400` |  | 400 — body text, descriptions, table cell text, timestamps. |
| `--font-weight-medium` | `500` |  | Breadcrumb: label weight; TitleSubtitle: both lines |
| `--font-weight-semibold` | `600` |  | PageHeader: title weight; SectionHeader: title weight |
| `--letter-spacing-wide` | `0.05em` |  | RightPanel: uppercase group labels |

## Spacing Scale

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--spacing-1` | `4px` |  | Alert: error-row padding (y / left / right); Breadcrumb: label↔chevron gap; ButtonToggle: track padding + segment gap; DurationPicker: running state's label→badge gap (FormField's own label gap); FieldSearchResults: row gap; GroupTable: detailNote Show more/less toggle — a link Button, offset from the clamped text; HeaderStrip: root padding (block / inline). The block value is only what a 32px icon-button trail needs to clear inside the 48px band.; HeaderStrip: title-group block padding — carries the asymmetric 12 top / 8 bottom optical offset both Figma sources read, without constraining the trail.; +4 more |
| `--spacing-2` | `8px` |  | ButtonToggle: selected segment h-padding; CalendarPicker + DatePicker: header gap; EmptyState: gap between icon and message; EntityChip: negative offset for stacked slots; FieldSearchResults: body padding; HeaderStrip: title-group block padding — carries the asymmetric 12 top / 8 bottom optical offset both Figma sources read, without constraining the trail.; HeaderStrip: gap between icon / title / trail; LeadNav: icon button padding; +8 more |
| `--spacing-3` | `12px` |  | Accordion: header gap; DropdownMenu: surface padding; GlobalSearch: bar horizontal padding (left side); MenuDropdown: header top padding (group separation); MenuRow: vertical / horizontal padding + gaps; MenuRowCheckbox: row padding/gap (shared chrome); ModalFooter: vertical padding + button-cluster gap; Paginator: root top padding; ellipsis horizontal padding; +10 more |
| `--spacing-4` | `16px` |  | AuthContent: gap between form fields; FilterSuggestions: panel padding + gap between chips; GroupTable: cell h-padding; every row fixed 48px tall (no row-height token — Cell family convention); HeaderStrip: root padding (block / inline). The block value is only what a 32px icon-button trail needs to clear inside the 48px band.; LeadNav: gap between hamburger and logo; MenuDropdown: header horizontal padding; MultiSelect: table cell horizontal padding; Navbar: leading horizontal padding — context='internal'; +10 more |
| `--spacing-5` | `20px` |  | AuthContent: form / content area padding; AuthModal: content area padding; ModalLarge: header / footer padding; ModalMedium: header / footer / content padding; StepperButtonsFooter: padding bottom; TrailNav: left padding of the profile section from divider; WidgetVariantPicker: picker internal padding |
| `--spacing-6` | `24px` |  | Accordion: card horizontal padding; AuthModal: header padding; EmptyState: container padding; GlobalSearchPanel: header / footer horizontal padding; GlobalSearchResults: body padding; ModalFooter: horizontal padding; ModalHeader: horizontal padding; Navbar: trailing horizontal padding; also leading padding when context='external'; +6 more |
| `--spacing-8` | `32px` |  | Accordion: content gap above/below; Paginator: gap between the rows-per-page group and the page bar; TextArea: count footer right/bottom padding (32 clears the resize grip — flagged to Efrain) |
| `--spacing-9` | `36px` |  | 36px — occasional larger gap between page sections. |
| `--spacing-12` | `48px` |  | SummaryStrip: band horizontal padding (row centered inside it) |

## Layout Dimensions

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--field-height` | `36px` |  | Single-line form-control height (FormField / ComboBox / DatePicker / TimePicker / FieldSelect).; DurationPicker: min-height of the running badge shell, so the field does not jump when it locks |
| `--navbar-height` | `64px` |  | ShipmentsBar: full-stage height: 100dvh − navbar-height — the bar's top edge sits exactly at the navbar's bottom edge (2026-08-15; replaces the retired --bottombar-top-clearance mid-page-title cap) |
| `--sidebar-width` | `64px` |  | Sidebar: collapsed rail width |
| `--sidebar-width-expanded` | `240px` |  | Sidebar: expanded rail width |
| `--bottombar-collapsed` | `48px` |  | ShipmentsBar: strip height (the Figma bar is exactly 48) |
| `--bottombar-partial` | `calc(60dvh + 50px)` |  | the bar's middle (partial) expansion height — three-state bar. |
| `--edit-panel-width` | `240px` |  | Width of the right-side edit drawer that slides over a page. |
| `--right-panel-width` | `343px` |  | RightPanel: panel width (code-side layout token) |
| `--main-padding-top-edit` | `52px` |  | Top padding of the main content area while an edit drawer is open. |

## Home Widget Grid

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--home-grid-columns` | `6` |  | Number of columns in the Home dashboard widget grid. |
| `--home-grid-col-min-width` | `170px` |  | Narrowest a Home dashboard widget column may get before the grid reflows. |
| `--home-grid-row-min-height` | `184px` |  | Minimum height of one Home dashboard widget row. |

## Widget height ceiling

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--widget-height-max` | `420px` |  | Widget: height ceiling for 3x / 3xChart / 3xCta |

## Border Radius

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--radius-sm` | `4px` |  | Badge: standard badge radius; SearchChip: badge / panel corners; Tooltip: card corner |
| `--radius-md` | `6px` |  | ButtonToggle: unselected segment radius (hover target); DurationPicker: field corner radius (FormField); FilterButton: button corner radius; MenuRow: row corner radius; MenuRowCheckbox: row corner (shared .menu-row chrome); MenuRowRadio: row corner (shared .menu-row chrome); RightPanel: panel corner radius; SidebarButton: submenu corner rounding; +2 more |
| `--radius-lg` | `8px` |  | AuthModal: card corner radius; ButtonToggle: track + thumb radius; CalendarPicker + DatePicker: card + day-cell corner radius; DropdownButton: corner radius; DropdownMenu: surface corner radius; DurationPicker: dropdown panel corner radius (DropdownMenu); EmptyState: container corner rounding; FilterSuggestions: panel corner radius; +12 more |
| `--radius-xl` | `12px` |  | Alert: banner corner radius (docked: 0); GlobalSearchPanel: panel corner radius; WidgetMini: card corner radius |
| `--radius-2xl` | `16px` |  | Accordion: card corners; DataTable: card radius + the header strip top corners; SubAccordion: card corner radius |
| `--radius-pill` | `10px` |  | Corner radius for small pill shapes (count chips, toggles). |
| `--radius-full` | `9999px` |  | AddSectionButton: pill shape (circle); IconButton: circular shape; PillTab: pill shape; Spinner: ring shape; StepIndicator: circle; StopBadge: pill + status-circle rounding; TimelineDot: 10×10 circle |

## Icon Sizing

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--icon-size-md` | `16px` |  | Standard icon size (Lucide line icons) inside buttons, menus and rows. |
| `--icon-size-lg` | `20px` |  | Breadcrumb: chevron-right size; PaginationButton: chevron size |
| `--icon-stroke-md` | `2.25px` |  | Odyssey override of Lucide default 2 |
| `--icon-stroke-lg` | `2px` |  | Lucide default |

## Shadows

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--opacity-disabled` | `0.4` |  | Disabled controls: enabled look at this opacity (Figma Opacity/disabled = 40%,.; Button: every variant disabled = its idle look at this opacity, no shadow (S158) |
| `--opacity-muted` | `0.6` |  | : de-emphasised but still active (consolidation pair-marker fade) |
| `--shadow-sm` | `0px 1px 2px 0px rgba(0, 0, 0, 0.05)` |  | Button: raised variants (idle); ButtonToggle: thumb elevation; ComboBox: input bar elevation; DropdownButton: elevation; GlobalSearch: bar elevation; PaginationButton: per-segment shadow; Paginator: ellipsis cell (matches the PaginationButton segments); SearchChip: panel elevation; +3 more |
| `--shadow-base` | `0px 1px 2px 0px rgba(0, 0, 0, 0.06), 0px 1px 3px 0px rgba(0, 0, 0, 0.10)` |  | IconButton: resting elevation; TimelineDot: drop shadow (Figma effect style) |
| `--shadow-md` | `0 4px 12px 0 rgba(0, 0, 0, 0.12)` |  | Floating surfaces: dropdown menus, popovers, tooltips. |
| `--shadow-lg` | `0 8px 32px 0 rgba(0, 0, 0, 0.16)` |  | AuthModal: card elevation (sits over a bg.webp backdrop); ModalLarge: dialog elevation; ModalMedium: dialog elevation; Tooltip: card elevation (shadow/lg) |
| `--shadow-2xl` | `0 25px 50px -12px rgba(0, 0, 0, 0.25)` |  | FilterSuggestions: panel elevation (floating dropdown); GlobalSearchPanel: panel card elevation |
| `--shadow-panel` | `0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1)` |  | CalendarPicker + DatePicker: card shadow (popover altitude); DropdownMenu: surface elevation; RightPanel: panel elevation; Widget: card elevation; WidgetsLeftMenu: panel left-edge shadow |
| `--shadow-up-md` | `0 -4px 16px rgba(0, 0, 0, 0.08)` |  | Upward shadow under bars docked to the bottom of the screen (sticky footers, bottom panels). |
| `--shadow-up-lg` | `0 -8px 40px rgba(0, 0, 0, 0.24)` |  | ShipmentsBar: expanded bar (Figma shadow/up-lg) — clipped up-only via clip-path: inset(-64px 0 0 0) so it never paints over the sidebar/side panels (code-only) |
| `--shadow-down-lg` | `0 4px 16px rgba(0, 0, 0, 0.28)` |  | Strong downward shadow for elements lifted over content while dragging or expanding. |

## Overlay

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--overlay-bg` | `rgba(0, 0, 0, 0.4)` |  | Dimmed backdrop behind modals. |

## Transitions

| Token | Value | Resolves to | Used for |
| --- | --- | --- | --- |
| `--transition-fast` | `150ms ease` |  | AddSectionButton: pill background transition; CalendarPicker + DatePicker: day background transition; GroupTable: group-row hover + chevron rotation + action-tone fill |
| `--transition-base` | `200ms ease` |  | ButtonToggle: thumb slide + segment padding; ShipmentsBar: height eases on the non-linear drawer curve in BOTH directions plus content growth (S79d: JS-measured length→length transitions — interpolate-size retired, its uncapped auto endpoint slammed into the max-height clamp; close keeps the last pane mounted, inert, while shrinking); right (panel inset) on base; reduced-motion snaps; StepIndicator: off↔on tint |
| `--transition-slow` | `300ms ease` |  | Duration of slower motion: panels expanding/collapsing, accordions opening. |
| `--transition-chart-grow` | `1000ms cubic-bezier(0.22, 1, 0.36, 1)` |  | Chart grow-in: deliberate non-linear curve (ease-out-quart) so the stroke-dasharray sweep reads as a designed motion, not a clock-tick. |
| `--transition-panel` | `220ms cubic-bezier(0.22, 1, 0.36, 1)` |  | Sidebar: collapse/expand width transition |
| `--transition-sidebar` | `300ms cubic-bezier(0.22, 1, 0.36, 1)` |  | Sidebar rail expand/collapse. |
| `--transition-drawer` | `300ms cubic-bezier(0.16, 1, 0.3, 1)` |  | Drawer slide-in (RightPanel docks): ease-out-expo — strong deceleration so the panel arrives with weight rather than a linear glide.; RightPanel: drawer slide-in (open); ShipmentsBar: height eases on the non-linear drawer curve in BOTH directions plus content growth (S79d: JS-measured length→length transitions — interpolate-size retired, its uncapped auto endpoint slammed into the max-height clamp; close keeps the last pane mounted, inert, while shrinking); right (panel inset) on base; reduced-motion snaps |
| `--transition-reveal` | `300ms cubic-bezier(0.22, 1, 0.36, 1)` |  | Content reveals (accordion expand/collapse): longer ease-out-quart so the height change reads as a designed motion at larger travel distances.; Accordion: reveal + chevron animation; the travel-line is glued to the card bottom edge so it rides the reveal geometrically (no opacity handoff); SubAccordion: grid-rows expand + chevron rotation |
| `--transition-modal-nav` | `360ms cubic-bezier(0.22, 1, 0.36, 1)` |  | Modal view navigation (ModalMedium push/pop,.modal-nav-view): the slowest of the ease-out-quart family. |

## Type styles

| Style | Size / line-height / weight | Used for |
| --- | --- | --- |
| `label/base semibold` | 16px / 24px / 600 | HeaderStrip: title typography (text-label-base-semibold utility); SummaryStrip: value typography, --text-primary (Figma: Text/primary — bound 2026-07-06) |
| `label/sm medium` | 14px / 20px / 500 | DropdownButton: label typography |
| `label/xs medium` | 12px / 16px / 500 | StopBadge: label typography (--font-size-xs / --line-height-xs / --font-weight-medium); SummaryStrip: label typography, --text-tertiary, letter-spacing 0 |
