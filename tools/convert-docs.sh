#!/bin/bash
# Convert .pdf, .docx, .pptx, .xlsx, and other supported documents to Markdown
# via Microsoft MarkItDown (https://github.com/microsoft/markitdown).
#
# Usage:
#   ./tools/convert-docs.sh                    # convert everything under vault/00-inbox/
#   ./tools/convert-docs.sh <path>             # convert one file or recurse a directory anywhere
#
# Output: <basename>.md placed next to the source file (not a central folder).
# Skips files whose .md output is newer than the source.

set -e

DOCS_DIR="${1:-vault/00-inbox}"
VENV_DIR="/tmp/pptx_env"
PYTHON="$VENV_DIR/bin/python3"
MARKITDOWN="$VENV_DIR/bin/markitdown"

# Bootstrap venv + markitdown[all] if missing. Requires Python 3.10+ — uses
# Homebrew's python3.13 if available, falls back to whatever python3 is on PATH.
if [ ! -f "$MARKITDOWN" ]; then
  echo "Bootstrapping markitdown venv at $VENV_DIR..."
  if [ -x "/opt/homebrew/bin/python3.13" ]; then
    PYBIN="/opt/homebrew/bin/python3.13"
  else
    PYBIN="$(command -v python3)"
  fi
  "$PYBIN" -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --quiet --upgrade pip
  "$VENV_DIR/bin/pip" install --quiet 'markitdown[all]'
fi

# Extensions MarkItDown handles. Add more here if/when needed (e.g. html, msg, epub).
EXTS=(pdf docx pptx xlsx)

# Build the find expression: \( -name "*.pdf" -o -name "*.docx" ... \) ! -name "~$*"
find_expr=()
first=1
for ext in "${EXTS[@]}"; do
  if [ $first -eq 1 ]; then
    find_expr+=( "(" "-name" "*.${ext}" )
    first=0
  else
    find_expr+=( "-o" "-name" "*.${ext}" )
  fi
done
find_expr+=( ")" "!" "-name" "~\$*" )

# If $DOCS_DIR is a single file, convert that one file in place. Otherwise recurse.
if [ -f "$DOCS_DIR" ]; then
  src="$DOCS_DIR"
  dir=$(dirname "$src")
  name=$(basename "$src")
  name_noext="${name%.*}"
  output="$dir/${name_noext}.md"
  echo "  converting: $name"
  if "$MARKITDOWN" "$src" -o "$output" 2>/dev/null; then
    echo "  -> $output"
  else
    echo "  ! failed: $name" >&2
  fi
else
  find "$DOCS_DIR" "${find_expr[@]}" | while read -r file; do
    dir=$(dirname "$file")
    name=$(basename "$file")
    name_noext="${name%.*}"
    output="$dir/${name_noext}.md"

    if [ -f "$output" ] && [ "$output" -nt "$file" ]; then
      echo "  skip (up to date): $name"
      continue
    fi

    echo "  converting: $name"
    if "$MARKITDOWN" "$file" -o "$output" 2>/dev/null; then
      echo "  -> $output"
    else
      echo "  ! failed: $name" >&2
    fi
  done
fi

echo ""
echo "Done."
