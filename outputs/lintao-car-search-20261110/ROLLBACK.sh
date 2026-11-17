#!/usr/bin/env bash
set -euo pipefail

target="${1:-}"
if [[ -z "$target" ]]; then
  printf 'ROLLBACK_ERROR missing_target_root\n' >&2
  exit 2
fi

target="$(cd "$target" && pwd)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
patch_file="$script_dir/MODIFIED_FILE.patch"

if [[ ! -d "$target/途越" ]]; then
  printf 'ROLLBACK_ERROR invalid_target=%s\n' "$target" >&2
  exit 3
fi

git -C "$target" apply -R --check "$patch_file"
git -C "$target" apply -R "$patch_file"
printf 'ROLLBACK_OK target=%s restored_base=b421df9\n' "$target"
