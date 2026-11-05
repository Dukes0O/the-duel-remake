# The nightly full check, run by Codex with its safety limits off so Chrome can start (Kyle, 5 November 2026: tests only).
# The rules are in night-check-codex.md.
$root = Split-Path $PSScriptRoot -Parent
$date = Get-Date -Format 'yyyy-MM-dd'
$out = Join-Path $root ".evidence\$date"
New-Item -ItemType Directory -Force $out | Out-Null
Get-Content (Join-Path $PSScriptRoot 'night-check-codex.md') -Raw |
  codex exec --dangerously-bypass-approvals-and-sandbox -C $root -o (Join-Path $out 'night-codex-last.txt') - *> (Join-Path $out 'night-codex.log')
