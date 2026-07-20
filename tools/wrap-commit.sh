#!/usr/bin/env bash
# wrap-commit.sh — /wrap staging helper for the React repo (odyssey-one).
# Stages everything EXCEPT the /wrap noise exclusions (per .claude/skills/wrap/SKILL.md),
# prints the staged list + diffstat, and commits with the repo's standard trailer.
# Does NOT push.
#
# Usage:
#   bash tools/wrap-commit.sh "session 85: message"
#   bash tools/wrap-commit.sh --dry-run             # show what would be staged, touch nothing
set -euo pipefail

usage() { sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

DRY=0
MSG=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    -h|--help) usage ;;
    *) MSG="$arg" ;;
  esac
done
[[ "$DRY" == 0 && -z "$MSG" ]] && { echo "error: commit message required (or --dry-run)"; usage; }

cd "$(git rev-parse --show-toplevel)"

# /wrap noise exclusions (SKILL.md baseline: settings.local.json, workspace.json,
# vault-sources/, ~$* office lockfiles, *.xlsx.zip)
EXCLUDES=(
  ':(exclude).claude/settings.local.json'
  ':(exclude)vault/.obsidian/workspace.json'
  ':(exclude)vault-sources'
  ':(exclude,glob)**/~$*'
  ':(exclude,glob)**/*.xlsx.zip'
)

if ! git diff --cached --quiet; then
  echo "warning: index already has staged changes — they will be included (and unstaged on --dry-run)."
fi

git add -A -- . "${EXCLUDES[@]}"

echo "staged:"
git diff --cached --name-status
echo
git diff --cached --stat | tail -1

if [[ "$DRY" == 1 ]]; then
  git reset -q
  echo
  echo "(dry-run — nothing staged or committed)"
  exit 0
fi

# trailer convention confirmed from `git log -3 --format=%B`
# ponytail: model name hardcoded — no reliable env source in a bash script; UPDATE this on model change (S87: was stale "Fable 5")
git commit -m "$MSG" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
echo
echo "committed (not pushed)."
