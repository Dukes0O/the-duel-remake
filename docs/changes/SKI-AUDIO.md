# SKI-AUDIO: sound effects (25 October 2026)

## Decision before code

Kyle's sound-effects-only split controls this lane. Use authored, seeded synthesis:
filtered snow and air noise, low impact tones, and short binding/pole transients.
Render compressed runtime files with reproducible catalogue recipes. No voice
service, voice take, voice registration or radio text change. Voice half stays
open pending Kyle's word. `heli-skiing` stays dev.

The requested wiring needs two small presentation hooks beyond the original
card: `src/heli/heli-audio.js` consumes the existing ski events and readout;
`src/app.js` passes its existing ski view to that adapter. No rules or save edits.

Checks: Node render/decoded true-peak check (every cue <= -1 dBTP), event and
loop lifecycle checks, lane tier with four jobs, production build. No browser
or frame check required for this sound-only slice. Claude's listening verdict
remains separate from the measured render check.

## Cues

All cues use seeded synthesis, dedicated CC0-1.0 recipes in
`tools/audio/build-ski.mjs` and catalogue rows; no library downloads or takes.
Ten mono Vorbis files total 204,800 bytes.

| Cue | Made from | Decoded true peak |
| --- | --- | --- |
| ski.carve | Bright filtered noise: ski-edge hiss | -7.22 dBTP |
| ski.skid | Mid-band scrape plus low snow rasp | -6.54 dBTP |
| ski.wind | Low air rush plus a higher air band | -7.08 dBTP |
| ski.gate | Short noise slap and two falling pole tones | -6.74 dBTP |
| ski.pop | Snow flick and low push-off thump | -7.15 dBTP |
| ski.land (soft) | Low snow noise and a 95 Hz falling thump | -6.91 dBTP |
| ski.land.hard | Longer snow crunch, 72 Hz thump and bright transient | -7.04 dBTP |
| ski.tumble | Three staggered thumps with a snow scrape tail | -7.16 dBTP |
| ski.powder | Dark snow rush with a soft higher band | -7.28 dBTP |
| ski.step-out | Two snow steps, then a short binding click | -7.14 dBTP |

Carve, skid, wind and powder are persistent loops. Speed controls their gain
and pitch; powder also uses SKI-VIEW's existing `skiDeepSnow` readout. Airborne
skis have no snow beds. Pickup, pause, exit, mute and switch-off stop loops.
Passed gates slap; missed gates stay silent. Safe landings select the soft
file; unsafe landings select the hard file, followed by the tumble cue.
The existing generic cue hook plays step-out. Frozen helicopter rotor/wind
beds are suppressed while the pilot skis.

## Results

- Node render and decoded FFmpeg oversampled true-peak check: all ten pass
  (ceiling -1 dBTP). Short hits receive silence padding only for measurement,
  so the loudness meter can inspect them; padding is not shipped.
- Event routing, speed, switch and loop lifecycle checks pass.
- Independent reviewer: clear, including the powder follow-up.
- Lane tier: PASS, all 90 unique suites in the final selected plan. Started
  with `node tools/run-tests.mjs --tier lane --changed --jobs 4`; after the
  catalogue fix, 52 passed before the tar tool error. Filtered completion
  batches retained those results: 16 passed, then 22 passed (including two
  conservative overlaps), then the two checks added by the STATUS snapshot
  (`test-full-check`, `test-integrate-lane`) passed. Zero suites remain unrun.
  Every batch used four jobs. No game code changed between those batches.
- Replay fingerprints: 225 checks passed across 25 cases, 23 events and nine
  categories, three frame rates and three runs. World signatures unchanged.
- On this shell PATH, Git's GNU tar treats Windows drive letters as remote
  paths. `TAR_OPTIONS=--force-local` still failed; prefixing
  `C:\Windows\System32` on PATH selects Windows tar and passes drive-through.
  This is a process environment fix, with no test or game change.
- `npm run build`: PASS (541 modules, 906 ms; existing chunk-size and dynamic-import warnings).
- Initial lane found missing top-level catalogue `file` metadata. Fixed the
  synthesis source path to its build recipe; no assertion changed for this fix.
- No browser, frame, native recording or listening verdict claimed. Claude
  can audition the sound-bank cues in the existing listening page before
  feature sign-off. Voice half remains open.
- No simulation, replay data, world signature, save or feature flag changes.
- Branch started at the same game code as current integration; its one newer
  commit at start was board-only (4dedb99b). No merge or push performed.
- Status snapshot refreshed. Cockpit sync inspected through the protected
  runner with `--dry-run`; this lane's older board must not overwrite the
  newer integration board. It reported unrelated missing task HELI-CARRY-CLEAR
  for the Director to reconcile.

## Changed assertions

`tools/test-p4-audio.mjs`: exclude exactly `Object.keys(SKI_CUES)` from
both historical pre-P4 bank/catalogue projections, as the existing helicopter,
Lab, Deep and lesson exclusions already do. Both expected SHA-256 constants
stay unchanged: every old cue and source credit remains pinned. New ski routing,
switch and lifecycle behaviour is checked in `tools/test-ski-audio.mjs`.
Independent reviewer identified this necessary scope update. Claude's written
assertion review is still required before merge (this lane does not merge).

## Removed

Nothing replaced. Generated `dist/`, `.qa-dist/` and `.evidence/` from this run
were sent to the Recycle Bin after checks. Only the runtime Ogg files remain.
No voice takes were recorded.

## Claude review (26 October 2026)

Approved and merged: the ten sound effects. The test change only leaves the new ski cues out of the old sound list fingerprint; the pinned fingerprint is unchanged. Claude hears them at SKI-FINISH. The voice half stays open on the card until Kyle agrees to spend voice credits.
