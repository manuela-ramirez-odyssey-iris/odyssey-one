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
  # vault/00-inbox is a TRANSIENT drop zone and the vault is markdown-only by
  # architecture — raw binaries there are destined for vault-sources/ (already
  # excluded above), so committing them would put them in history permanently
  # and then record a deletion the moment /analyze archives them. Markdown IS
  # committed: an intake's notes/artifact-map are durable knowledge.
  # (S114: a SpotBoard intake would otherwise have added ~1.5MB of PNGs + a
  # 143KB .vtt to history for one session's use.)
  ':(exclude,glob)vault/00-inbox/**/*.png'
  ':(exclude,glob)vault/00-inbox/**/*.jpg'
  ':(exclude,glob)vault/00-inbox/**/*.jpeg'
  ':(exclude,glob)vault/00-inbox/**/*.vtt'
  ':(exclude,glob)vault/00-inbox/**/*.pdf'
  ':(exclude,glob)vault/00-inbox/**/*.docx'
  ':(exclude,glob)vault/00-inbox/**/*.pptx'
  ':(exclude,glob)vault/00-inbox/**/*.xlsx'
  ':(exclude,glob)vault/00-inbox/**/*.html'
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
# ponytail: overridable so it stops going stale silently — this has now drifted
# TWICE (S87 fixed a stale "Fable 5"; S114 found it stale again while the session
# ran Opus 5). Callers that know the model should pass CO_AUTHOR; the default is
# just the last-known-good value.
CO_AUTHOR="${CO_AUTHOR:-Claude Opus 5 (1M context) <noreply@anthropic.com>}"
git commit -m "$MSG" -m "Co-Authored-By: $CO_AUTHOR"
echo
echo "committed (not pushed)."
