#!/bin/bash
# PostToolUse: po edycji data/*.json uruchom kontrolę danych; błędy wracają do Claude (exit 2).
f=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)
case "$f" in
  */data/*.json)
    cd "$CLAUDE_PROJECT_DIR" || exit 0
    out=$(node tools/check-data.js 2>&1) || { echo "$out" | tail -25 >&2; exit 2; }
    ;;
esac
exit 0
