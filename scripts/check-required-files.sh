#!/bin/bash
# scripts/check-required-files.sh
# Verifies that essential project files are present.
# Used in CI quality gates.

set -e

echo "Checking required files..."

FILES=(
  "README.md"
  "package.json"
  "pnpm-workspace.yaml"
  ".gitignore"
  ".editorconfig"
  "eslint.config.mjs"
  "prettier.config.mjs"
  "tsconfig.json"
)

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: Missing required file: $file"
    exit 1
  fi
done

echo "All required files present."
