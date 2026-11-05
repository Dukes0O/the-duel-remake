# SKIN-WASTE

## Changed

- Added eight appearance-only Wasteland paint finishes, gated by the
  `wastelandTownEnabled` API option and a discovered version 1 Wasteland
  career.
- Purchases cost 250 scrap each and debit only the Wasteland scrap balance.
- Recorded the missing test and garage wiring contract on the card for Claude.

## Checks

- Card test (`node tools/test-paint-presets.mjs`): not run. An active
  FULL TIER FOR RELEASE hold in `docs/playtest-inbox.md` blocks gates.
- `npm run build`: not run for the same hold.
- Blender comparison sheet: not rendered for the same hold. The inbox says
  art jobs wait.
- Browser checks and in-game look review: Claude runs. Check all eight colors
  on the Titan, rally car, and a supercar; verify the scrap price and switch
  gating in the garage.

## Changed assertions

- None. The existing paint test expects 11 catalog entries, so it will need a
  reviewed contract update before the eight entries can merge. The garage
  click handler also expects every visible paint ID in the exported catalog.

## Race fingerprints

- No race rules, replay paths, or course data changed. Fingerprints are not
  applicable.

## Removed

- Nothing.
