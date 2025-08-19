#!/bin/bash
set -euo pipefail

SOURCE_DIR="../../../../node_modules/bootstrap-icons/icons/"
OUTPUT_FILE="./source/icons.ts"

{
  echo "export const iconNames = ["

  find "$SOURCE_DIR" -maxdepth 1 -name "*.svg" -print0 | \
    xargs -0 -n1 basename -s .svg | \
    sort | \
    sed "s/.*/  '&',/"

  echo "] as const;"
  echo ""
  echo "export type IconName = typeof iconNames[number];"
} > "$OUTPUT_FILE"
