# scripts/check-required-files.ps1
# Verifies that essential project files are present.
# Used in CI quality gates.

$ErrorActionPreference = "Stop"

Write-Host "Checking required files..."

$files = @(
  "README.md",
  "package.json",
  "pnpm-workspace.yaml",
  ".gitignore",
  ".editorconfig",
  "eslint.config.mjs",
  "prettier.config.mjs",
  "tsconfig.json"
)

foreach ($file in $files) {
  if (-not (Test-Path $file)) {
    Write-Host "ERROR: Missing required file: $file"
    exit 1
  }
}

Write-Host "All required files present."
