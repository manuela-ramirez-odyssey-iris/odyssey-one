#!/bin/bash
# Extract text/tables from .docx and .pptx files using python-docx and python-pptx
# Usage: ./tools/convert-docs.sh [file_or_directory]
# If no argument: converts all .docx/.pptx in shipments-documentation/
# Outputs: .md files (readable by Claude) + extracted images

set -e

DOCS_DIR="${1:-shipments-documentation}"
CONVERTED_DIR="shipments-documentation/Documentation/converted"
PYTHON="/tmp/pptx_env/bin/python3"

# Check python env exists
if [ ! -f "$PYTHON" ]; then
  echo "Python env not found. Creating..."
  python3 -m venv /tmp/pptx_env
  /tmp/pptx_env/bin/pip install python-pptx python-docx -q
fi

mkdir -p "$CONVERTED_DIR"

find "$DOCS_DIR" \( -name "*.docx" -o -name "*.pptx" \) ! -name "~\$*" | while read -r file; do
  basename=$(basename "$file")
  name="${basename%.*}"
  ext="${basename##*.}"
  output="$CONVERTED_DIR/${name}.md"

  # Skip if output is newer than source
  if [ -f "$output" ] && [ "$output" -nt "$file" ]; then
    echo "  skip (up to date): $basename"
    continue
  fi

  echo "  converting: $basename"

  if [ "$ext" = "docx" ]; then
    $PYTHON -c "
import sys, os
from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE as RT

doc = Document('$file')
md = '# $name\n\n'

# Extract paragraphs
for p in doc.paragraphs:
    text = p.text.strip()
    if not text:
        continue
    if p.style.name.startswith('Heading 1'):
        md += f'## {text}\n\n'
    elif p.style.name.startswith('Heading 2'):
        md += f'### {text}\n\n'
    elif p.style.name.startswith('Heading'):
        md += f'#### {text}\n\n'
    elif p.style.name.startswith('List'):
        md += f'- {text}\n'
    else:
        md += text + '\n\n'

# Extract tables
for table in doc.tables:
    rows = list(table.rows)
    if not rows:
        continue
    headers = [cell.text.strip() for cell in rows[0].cells]
    md += '\n| ' + ' | '.join(headers) + ' |\n'
    md += '| ' + ' | '.join(['---'] * len(headers)) + ' |\n'
    for row in rows[1:]:
        md += '| ' + ' | '.join(cell.text.strip() for cell in row.cells) + ' |\n'
    md += '\n'

# Extract images
img_dir = '$CONVERTED_DIR/${name}_images'
img_count = 0
for rel in doc.part.rels.values():
    if 'image' in rel.reltype:
        img_count += 1
        os.makedirs(img_dir, exist_ok=True)
        img_data = rel.target_part.blob
        img_ext = rel.target_ref.split('.')[-1]
        img_path = f'{img_dir}/image{img_count}.{img_ext}'
        with open(img_path, 'wb') as f:
            f.write(img_data)

if img_count > 0:
    md += f'\n---\n\n**Images:** {img_count} images extracted to \`${name}_images/\`\n'

with open('$output', 'w') as f:
    f.write(md)
" && echo "  -> ${name}.md"

  elif [ "$ext" = "pptx" ]; then
    $PYTHON -c "
from pptx import Presentation

prs = Presentation('$file')
md = '# $name\n'

for i, slide in enumerate(prs.slides):
    md += f'\n\n---\n\n## Slide {i+1}\n\n'
    for shape in slide.shapes:
        if hasattr(shape, 'text') and shape.text.strip():
            md += shape.text + '\n\n'
        if shape.has_table:
            table = shape.table
            rows = list(table.rows)
            headers = [cell.text.strip() for cell in rows[0].cells]
            md += '| ' + ' | '.join(headers) + ' |\n'
            md += '| ' + ' | '.join(['---'] * len(headers)) + ' |\n'
            for row in rows[1:]:
                md += '| ' + ' | '.join(cell.text.strip() for cell in row.cells) + ' |\n'
            md += '\n'

with open('$output', 'w') as f:
    f.write(md)
" && echo "  -> ${name}.md"
  fi
done

echo ""
echo "Done. Output in: $CONVERTED_DIR"
