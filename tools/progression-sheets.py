#!/usr/bin/env python3
"""tools/progression-sheets.py — openpyxl renderer for the Shipments/Orders
search-progression workbooks. Reads a JSON payload on stdin (written by
tools/progression-sheets.mjs) and writes, per domain, ONE xlsx (single sheet
"Progression Grouping") and its byte-for-byte-consistent sibling CSV.

This is the approved v4 design (user, 2026-09-11) — see the working prototype
this was ported from. It supersedes the old 7-sheet 'legacy'/'designed'
renderer; there is only one workbook shape now.
"""
import sys
import csv
import json
import re
import io
import datetime
import zipfile
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = __import__('pathlib').Path(__file__).resolve().parent.parent
FALLBACK_PATH = ROOT / 'docs/progression/csv-fallback.json'

# Fixed (not "now") so two saves of byte-identical content produce byte-identical
# files — required for `progression:audit` (--check) to byte-compare.
FIXED_DT = datetime.datetime(2026, 1, 1)
ZIP_EPOCH = (1980, 1, 1, 0, 0, 0)


def normalize_zip_timestamps(path):
    # openpyxl's writer forcibly stamps workbook.properties.modified = now() at
    # save() time — core.xml's <dcterms:modified> is patched here too, alongside
    # per-member zip timestamps, so two saves of identical content agree byte-for-byte.
    with open(path, 'rb') as f:
        src = zipfile.ZipFile(f)
        infos = src.infolist()
        contents = {i.filename: src.read(i.filename) for i in infos}
    core = contents.get('docProps/core.xml')
    if core is not None:
        fixed = FIXED_DT.strftime('%Y-%m-%dT%H:%M:%SZ').encode()
        contents['docProps/core.xml'] = re.sub(
            rb'(<dcterms:modified[^>]*>)[^<]*(</dcterms:modified>)',
            lambda m: m.group(1) + fixed + m.group(2),
            core,
        )
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as out:
        for i in infos:
            i.date_time = ZIP_EPOCH
            out.writestr(i, contents[i.filename])


def argb(h):
    """6-char hex -> opaque ARGB. openpyxl pads a bare 6-char hex to '00'+hex,
    whose 00 alpha makes Excel render NO fill at all (Quick Look ignores alpha,
    which is why previews lied). Every fill in this file MUST go through this."""
    h = h.lstrip('#')
    return h if len(h) == 8 else 'FF' + h


def solid(h):
    return PatternFill('solid', fgColor=argb(h))


COLS = ['Progression\n(suggestions panel header)', 'Stakeholder Group',
        'Suggested Group\n(search bar grouping)',
        'Attribute', 'Example', 'Description', 'Field Type\n(as built on Vercel)',
        'Filters panel\nfield label', 'Filters panel\nsection', 'Search status', 'Notes']
WID = [26, 24, 24, 24, 26, 38, 22, 26, 22, 19, 42]
NGROUP = 3

RAMP = ['EAF4FC', 'D6EAF8', 'AED6F1', '5DADE2', 'EAF7EA', 'D4EFDF', 'BFE5CC', 'A9DFBF', 'FADBD8', 'F5CBA7']
GREY = 'EDEDED'

# AS BUILT — every value below is the control the deployed app actually renders.
# Keys are the exact `Panel control` strings the generator derives from the code.
AS_BUILT = {
    'text':                             'Text Input',
    'text field':                       'Text Input',
    'combobox':                         'Autocomplete Text (lazy)',
    'combobox (lazy)':                  'Autocomplete Text (lazy)',
    'combobox (typable, lazy in live)': 'Autocomplete Text',
    'location':                         'Autocomplete Text (City/State/Country)',
    'location (lazy)':                  'Autocomplete Text (City/State/Country)',
    'date-range':                       'Date Picker + Range',
    'date picker + date range':         'Date Picker + Range',
    'enum':                             'Dropdown (multi-select)',
    'enum chips':                       'Dropdown (multi-select)',
    'enum chips (multi-select)':        'Dropdown (multi-select)',
    'comparator':                       'Operator + Number',
}
# No panel field at all: the attribute is reachable only by typing in the bar.
BAR_ONLY = {'enum': 'Search bar only — enum value', 'digits': 'Search bar only — number',
            'both': 'Search bar only — text/number', 'letters': 'Search bar only — text',
            'date': 'Search bar only — date'}

NOT_FILTER = 'Not a filter — search bar only'
NO_SECTION = '—'

SEARCH_STATUS = {'Implemented': 'Live in search',
                  'Proposed — not built': 'Not in search',
                  'Skipped': 'Not in search (skipped in proposal)'}

# Verified present on a seeded shipments.json row, but with no search attribute.
DATA_EXISTS = {'Shipment Sequence Leg': 'shipmentSequenceLeg',
               'Next Shipment ID': 'nextShipmentId',
               'Validation Message': 'validationMessage'}


def field_type(r, ix, fallback, a):
    """What Vercel renders for this attribute today. Falls back to the 2026-05
    proposed type ONLY for rows that were never built, where a proposal is all
    that exists and the Status column already says so."""
    if r[ix['Status']] != 'Implemented':
        return fallback['fld'].get(a) or 'Proposed — no control built'
    ctrl = (r[ix['Panel control']] or '').strip().lower()
    if not ctrl or ctrl.startswith('—'):
        return BAR_ONLY.get(r[ix['Match']], 'Search bar only')
    if ctrl not in AS_BUILT:
        raise SystemExit(f'unmapped panel control {ctrl!r} for {a!r} — refusing to guess')
    return AS_BUILT[ctrl]


def short(t, n=110):
    t = re.sub(r'\s+', ' ', (t or '').strip())
    if not t:
        return ''
    if len(t) <= n:
        return t
    cut = t[:n]
    sp = cut.rfind('. ')
    return (cut[:sp + 1] if sp > 40 else cut.rstrip() + '…')


def panel_section(r, ix):
    """Which section of the FILTERS PANEL holds this attribute. Per attribute,
    not per group."""
    return r[ix['Panel section']] or NO_SECTION


def search_status(raw):
    return SEARCH_STATUS.get(raw, raw)


def note_for(a, raw, note):
    if raw != 'Implemented' and a in DATA_EXISTS:
        extra = f"Field `{DATA_EXISTS[a]}` EXISTS on the shipment row; never exposed to search."
        return (extra + ' ' + (note or '')).strip()
    return note


def panel_field(r, ix):
    """What the FILTERS PANEL calls this attribute, or that it has no filter at
    all."""
    ctrl = (r[ix['Panel control']] or '').strip()
    if not ctrl or ctrl.startswith('—'):
        return NOT_FILTER
    return r[ix['Panel label']] or r[ix['Attribute (bar label)']]


def compute_rows(dom_key, attrs, fallback):
    """Groups attrs['rows'] by Group (in first-seen order) and returns, per
    group: (drill_label, stakeholder, group_name, [computed attribute rows]).
    Each computed attribute row is the 11 values for columns D..K (Attribute..
    Notes) — the shared truth both the xlsx and the csv render from."""
    H = attrs['headers']
    ix = {k: H.index(k) for k in ['Group', 'Suggestions panel header', 'Attribute (bar label)',
          'Example (seeded)', 'Description', 'Match', 'Panel control', 'Status', 'Notes',
          'Panel section', 'Panel label']}
    order, blocks = [], {}
    for r in attrs['rows']:
        g = r[ix['Group']]
        if g not in order:
            order.append(g)
            blocks[g] = []
        blocks[g].append(r)

    groups = []
    for gi, g in enumerate(order):
        rows = blocks[g]
        built = any(r[ix['Status']] == 'Implemented' for r in rows)
        attr_rows = []
        for r in rows:
            a = r[ix['Attribute (bar label)']]
            ft = field_type(r, ix, fallback, a)
            desc = r[ix['Description']] or fallback['desc'].get(a, '')
            attr_rows.append([
                a, r[ix['Example (seeded)']], short(desc), ft,
                panel_field(r, ix), panel_section(r, ix),
                search_status(r[ix['Status']]),
                short(note_for(a, r[ix['Status']], r[ix['Notes']]), 110),
            ])
        drill = rows[0][ix['Suggestions panel header']] or ''
        if dom_key == 'shipments':
            stk = fallback['stk'].get(rows[0][ix['Attribute (bar label)']], 'n/a — grid-column derived')
        else:
            stk = 'n/a — grid-column derived'
        if gi == 0:
            drill += '\n(What is it?)'
        arrow = '' if gi == len(order) - 1 else '\n↓'
        groups.append({'drill': drill + arrow, 'stk': stk, 'group': g, 'built': built, 'rows': attr_rows})
    return groups


def write_xlsx(groups, path):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Progression Grouping'
    wb.properties.created = FIXED_DT
    wb.properties.modified = FIXED_DT

    for j, h in enumerate(COLS):
        c = ws.cell(1, j + 1, h)
        c.fill = solid('D9D9D9')
        c.font = Font(name='Calibri', bold=True, size=11)
        c.alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[1].height = 22

    row = 2
    for gi, grp in enumerate(groups):
        fill = solid(RAMP[gi % len(RAMP)] if grp['built'] else GREY)
        start = row
        for vals in grp['rows']:
            for j, v in enumerate(vals):
                col = j + NGROUP + 1
                c = ws.cell(row, col, v)
                c.fill = fill
                c.font = Font(name='Calibri', size=11)
                c.alignment = Alignment(vertical='center', wrap_text=col in (6, 11),
                                         horizontal='center' if col == 10 else 'left')
                if col in (8, 9) and v in (NOT_FILTER, NO_SECTION):
                    c.font = Font(name='Calibri', size=11, italic=True, color=argb('808080'))
            row += 1
        end = row - 1
        for j, text in ((1, grp['drill']), (2, grp['stk']), (3, grp['group'])):
            if end > start:
                ws.merge_cells(start_row=start, start_column=j, end_row=end, end_column=j)
            c = ws.cell(start, j, text)
            c.fill = fill
            c.font = Font(name='Calibri', size=11, bold=j in (2, 3))
            c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

    for j, w in enumerate(WID):
        ws.column_dimensions[get_column_letter(j + 1)].width = w
    ws.freeze_panes = 'E2'
    ws.page_setup.orientation = 'landscape'
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
    ws.print_title_rows = '1:1'
    wb.save(path)
    normalize_zip_timestamps(path)
    return row - 2


def write_csv(groups, path):
    # Mirrors the merge semantics of the xlsx: columns A-C (Progression,
    # Stakeholder Group, Suggested Group) are blank on every row after a
    # group's first, matching the pre-regeneration CSV precedent this sheet
    # descends from.
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(COLS)
    for grp in groups:
        for i, vals in enumerate(grp['rows']):
            lead = [grp['drill'], grp['stk'], grp['group']] if i == 0 else ['', '', '']
            w.writerow(lead + vals)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        f.write(buf.getvalue())


def build(dom_key, attrs, fallback, xlsx_path, csv_path):
    groups = compute_rows(dom_key, attrs, fallback)
    n = write_xlsx(groups, xlsx_path)
    write_csv(groups, csv_path)
    return n


def main():
    payload = json.load(sys.stdin)
    all_fallback = json.load(open(FALLBACK_PATH))
    for dom_key in ('shipments', 'orders'):
        d = payload[dom_key]
        n = build(dom_key, d['attrs'], all_fallback[dom_key], d['xlsxPath'], d['csvPath'])
        print(f"wrote {d['xlsxPath']}  ({n} rows)")
        print(f"wrote {d['csvPath']}")


if __name__ == '__main__':
    main()
