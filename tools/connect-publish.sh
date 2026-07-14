#!/usr/bin/env bash
# connect-publish.sh — wrapper around `npm run connect:publish` (Figma Code Connect).
# Prints only: mapping count, NEW mappings vs the previous run, and error lines.
# Full log saved to /tmp/connect-publish.log. Previous-run mapping names live in
# tools/.connect-publish.last (updated after each real run).
#
# Usage:
#   bash tools/connect-publish.sh                  # run the real publish
#   bash tools/connect-publish.sh --parse-only <log>  # parse an existing log (testing; does NOT update .last)
#   bash tools/connect-publish.sh --help
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG=/tmp/connect-publish.log
LAST="$ROOT/tools/.connect-publish.last"

usage() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; }

# parse_log <logfile> — emit mapping names (one per line, deduped).
# ponytail: mapping name = the *.figma.tsx basename mentioned in the publish output;
# adjust the pattern if the figma CLI output format changes.
parse_log() {
  grep -oE '[[:alnum:]_./ -]*[[:alnum:]_-]+\.figma\.(tsx|ts|jsx|js)' "$1" | sed 's|.*/||' | sort -u
}

UPDATE_LAST=1
case "${1:-}" in
  -h|--help) usage; exit 0 ;;
  --parse-only)
    LOG="${2:?usage: --parse-only <logfile>}"
    UPDATE_LAST=0
    ;;
  '')
    (cd "$ROOT" && npm run connect:publish) >"$LOG" 2>&1
    STATUS=$?
    ;;
  *) usage; exit 2 ;;
esac

mappings="$(parse_log "$LOG")"
count=$(printf '%s' "$mappings" | grep -c . || true)
echo "mappings published: $count"

if [[ -s "$LAST" ]]; then
  new="$(comm -13 <(sort "$LAST") <(printf '%s\n' "$mappings" | grep .) || true)"
  if [[ -n "$new" ]]; then
    echo "NEW mappings:"
    printf '  + %s\n' $new
  fi
else
  echo "(no previous run recorded — this run becomes the baseline)"
fi

errors="$(grep -iE 'error|fail(ed|ure)?' "$LOG" | grep -vE '0 errors?' || true)"
if [[ -n "$errors" ]]; then
  echo "errors:"
  printf '%s\n' "$errors" | sed 's/^/  ! /'
fi

if [[ "$UPDATE_LAST" == 1 ]]; then
  printf '%s\n' "$mappings" | grep . > "$LAST" || true
fi
echo "full log: $LOG"
exit "${STATUS:-0}"
