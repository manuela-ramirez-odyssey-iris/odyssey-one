# Spec — Progression workbooks, visual design pass (STAGED, do not touch masters)

**Session:** S146 · **Author:** main thread (Opus) · **Implementer:** Sonnet subagent

## Why

The generated workbooks are factually right and structurally identical, but they look
unfinished: one navy header row, a plain grid, 10pt default font that Quick Look renders as a
serif, and prose columns with no visual hierarchy. User verdict: *"still looks dull"*. These go
to Cognizant PMs as the search specification, so they have to read like a designed document.

## HARD constraint — this run is STAGED

Write **nothing** to:

- `docs/story-packs/*.xlsx`
- `vault/10-domains/*/data/attributes-progression-grouping.csv`

Add a `--out <dir>` flag to `tools/progression-sheets.mjs` and render into
`.stage/progression/` instead. The masters get replaced only after the user approves the
renders. Leave `progression:sheets` and `progression:audit` behaving exactly as they do today
when `--out` is absent — `--check` must still pass against the committed masters after your
changes, because the DATA is not changing in this pass, only the styling. If restyling changes
the xlsx bytes (it will), that is fine: `--check` is only run against the masters once they are
regenerated, which is a later step the user gates. Verify `--out` staging works and do not run
a bare `npm run progression:sheets`.

## Also add — per-sheet PNG renders so the design can be reviewed

Quick Look only ever renders a workbook's FIRST sheet. So `--out` must ALSO write, per domain,
one single-sheet workbook per sheet into `<out>/preview/`, named
`<domain>-<NN>-<sheet-slug>.xlsx`, each containing only that sheet with identical styling.
Then render every one to PNG with:

```
qlmanage -t -s 1800 -o <out>/preview/png <file>.xlsx
```

`qlmanage` is at `/usr/bin/qlmanage`; there is no LibreOffice on this machine. List the PNG
paths in your report.

## The design

One style function, both domains, identical by construction. Nothing below is per-domain.

### Typography

Set the font **by name** on every cell — the current files set only a size, which is why the
preview came out serif. Body `Aptos Narrow` with `Calibri` as the practical fallback (just name
`Calibri`; it is present on both Mac and Windows Excel and will not surprise anyone).

| Where | Font | Size | Weight |
|---|---|---|---|
| Title banner | Calibri | 14 | bold |
| Subtitle | Calibri | 9 | italic |
| Column headers | Calibri | 10 | bold |
| Body, primary columns | Calibri | 10 | normal |
| `Attribute (bar label)` | Calibri | 10 | **bold** |
| `dataKey` | Consolas | 9 | normal |
| `Enum values` | Calibri | 9 | normal |
| `Description` | Calibri | 9 | normal |
| `Notes` | Calibri | 9 | normal, colour `404040` |

### Sheet skeleton — every sheet, both workbooks

| Row | What |
|---|---|
| 1 | **Title banner.** Merged across every used column. Fill `1F3864`, white 14pt bold, left-aligned with an indent. Text: `<Domain> — <Sheet name>` e.g. `Orders — Attributes`. Row height 30. |
| 2 | **Subtitle.** Merged the same way. Fill `EDF1F8`, italic 9pt, colour `44546A`. One sentence: what this sheet is, and where the data comes from. Row height 20. |
| 3 | **Column headers.** Fill `2E5496` (deliberately lighter than the title so the hierarchy reads), white bold 10pt, `wrap_text`, vertical centre, horizontal centre for the narrow columns and left for prose columns. Row height 34. Thin white (`FFFFFF`) borders between header cells. |
| 4+ | Data. |

`freeze_panes = 'A4'` on every sheet. `auto_filter.ref` spanning row 3 to the last row on
`Attributes` and `Panel Filters` only.

### Data rows

- **Group spine.** Insert a narrow first column, width `2.6`, no header text, filled with the
  group's accent colour for every row in that group. This is what makes a group read as a
  block at a glance. On sheets with no group concept (README, Match Types, Open Questions) fill
  it with the sheet's own tab colour instead, so the spine is a constant across the workbook.
- **Group banding.** Alternate GROUPS (not alternate rows) get fill `F7F9FC` across the whole
  data row. A group is one block of one tone.
- **Borders.** Thin `D9D9D9` on all four sides of every data cell. On the FIRST row of each new
  group, a medium `8EA9DB` top border across the row.
- **Alignment.** `wrap_text` on prose columns, vertical `top` everywhere, horizontal `center`
  on `#`, `Match`, `Exact?`, `Free-text`, `Status`.
- Row height: leave automatic; do not pin it, or wrapped prose gets clipped.

### Accent palette — 10 muted accents, cycled by group index

`1F3864` · `2E75B6` · `2E9599` · `548235` · `7F6000` · `BF8F00` · `C55A11` · `A02B93` ·
`6B5B95` · `595959`

Assign by the group's index in the progression, so Shipments' 10 groups take all ten and
Orders' 9 take the first nine. Both workbooks therefore colour *Route & Geography* identically,
which is the point.

### Column treatments

- **`Match`** — a chip. Light tint fill, bold 9pt in the darker paired tone, centred:

  | Match | Fill | Font |
  |---|---|---|
  | `both` | `DEEBF7` | `1F4E79` |
  | `letters` | `E2EFDA` | `375623` |
  | `digits` | `FFF2CC` | `7F6000` |
  | `date` | `FBE4D5` | `833C0C` |
  | `enum` | `E4DFEC` | `5B2C6F` |

- **`Exact?`** — replace the word `Yes` with a bold `✓` in `375623`, centred. Blank stays blank.
- **`Free-text`** — same `✓` treatment. For Orders, whose every row is `n/a`, render an en dash
  `–` in `808080` and say why in the subtitle, not in every cell.
- **`Status`** — keep today's three fills and font colours, add bold and centre them:
  `Implemented` `E2EFDA`/`375623` · `Proposed — not built` `FFF2CC`/`7F6000` ·
  `Skipped` `EDEDED`/`595959`.
- **`Panel control`** and **`Panel label`** — when the value is `— none`, render it in
  `808080` italic so the seven bar-only Orders attributes are visibly absent rather than
  looking like data.

### Tab colours — identical in both workbooks

README `1F3864` · Progression `2E75B6` · Attributes `2E9599` · Match Types `548235` ·
Panel Filters `BF8F00` · Not Implemented `C55A11` · Open Questions `A02B93`

### Print setup — these get printed

Per sheet: `orientation='landscape'`, `fitToWidth=1` / `fitToHeight=0` with
`sheet_properties.pageSetUpPr.fitToPage = True`, `print_title_rows='1:3'`, and margins at 0.4.

### Column widths

Re-tune them for the new fonts rather than keeping today's numbers. Prose columns
(`Description`, `Notes`, `Detail`, `The conflict`) want 48–64; code columns (`dataKey`) 18;
narrow flags (`#`, `Exact?`, `Free-text`) 6–8; `Match` 10. No column at default width.

## Verification before reporting done

1. `node tools/progression-sheets.mjs --out .stage/progression` completes clean.
2. Both staged workbooks open with openpyxl; print for each: sheet names in order, tab colours,
   `freeze_panes`, and the A1 merged title text.
3. Confirm A1 is merged across the full used width on every sheet, and that row 3 is the header
   row carrying the same column names the current masters have (the DATA and COLUMNS do not
   change in this pass — only presentation).
4. Every PNG in `<out>/preview/png` exists and is non-trivial in size. List the paths.
5. `git status --short` — confirm `docs/story-packs/*.xlsx` and the two vault CSVs are
   UNCHANGED, and that `.stage/` is the only new output location.
6. Add `.stage/` to `.gitignore` if it is not already ignored.

Do not commit. Do not touch anything under `apps/odyssey-one/src/`.
