#!/bin/bash
# usage: capture.sh <skill dir> <out dir>
set -u
skill=$1; out=$2; rm -rf "$out"; mkdir -p "$out/raw" "$out/logs"
cd "$skill"
ls shared/tests/*.test.ts part-layering/tests/*.test.ts raster-layering/tests/*.test.ts clothing-part-layering/tests/*.test.ts clothing-raster-layering/tests/*.test.ts character-assembly/tests/*.test.ts shadow/tests/*.test.ts workflow/tests/*.test.ts |
  xargs -P 8 -I{} bash -c 'f={}; CAPTURE_ROOT='"$skill"' CAPTURE_DIR='"$out"'/raw CAPTURE_FILE=$f node --import ./shared/tests/ignore-local-env.ts --import "$(dirname "$0")"/preload.mjs --test --test-concurrency=1 $f > '"$out"'/logs/$(echo $f | tr / _).log 2>&1; echo "$? $f"' | sort > "$out/exit.txt"
