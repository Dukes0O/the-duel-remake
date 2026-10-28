# Scenario career downloads

## Changed

Set the disposable Chrome browser's download path to its scenario evidence
folder with `Browser.setDownloadBehavior`, before opening the scenario page.
Both career-backup and career-archive exports now use the folder beside their
report and screenshots. The setting also survives page reloads.
No file in Downloads was read, changed or deleted.

## Checks

Passed: `node tools/test-browser-harness.mjs` (17 tests), syntax check and
`git diff --check`.

Lane gate, build and actual export checks remain unrun. Shared heavy-job
capacity stayed full for 30 minutes, so work stopped under the user's time
limit. When capacity is free, run:

```powershell
node tools/run-browser-scenarios.mjs --scenarios career-backup,career-archive --jobs 1
```

Verify each
scenario's evidence folder contains its exported JSON before recycling that
run's evidence. No evidence folder was created by this session.
Independent code review: no findings.

## Changed assertions

None.

## Removed

Removed the browser default download destination from scenario execution.
No game code, existing download or player save was removed.
