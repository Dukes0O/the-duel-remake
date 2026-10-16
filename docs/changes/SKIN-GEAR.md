# SKIN-GEAR: each skin's gear works

Card: SKIN-GEAR (Claude, SIM lane, no locks). Design: `docs/HELI_WILDLIFE.md`
section 5.3. Switch: `heli-skins` (dev). Nothing is drawn and nothing is wired
into the session yet: these are the rules the session, board and view call
(SKIN-HOOKS and SKIN-VIEW do those). Every number comes from `heli-skins.js`
`gearStats` (the caller passes the result in as `gear`); this card copies none.

## What changed

Every gear argument is optional. Left out, `undefined`, or holding the base kit
(stock paint, or the switch off), every answer is the one the file gave before.

| Gear (skin) | File | What it does now |
|---|---|---|
| Water gauge (fire) | `heli-bucket.js` | `bucketReading(bucket, gear)`: the panel text is the litres ("450 L") instead of the word; words stay in `words` |
| Drop sight (fire) | `heli-bucket.js` | `dropSightDot(bucket, gear, env)`: the exact centre of the aim ring, or null with no water or no gear |
| Winch (medevac) | `heli-cable.js` | `createWinch`, `reelWinch(winch, gear, command, dt, load)`: reels 5 to 40 m at 1.5 m/s (-1 in, +1 out); the load's `lineLength` makes `stepCable` hang it that far down; `hookPoint(heli, {lineLength})` follows |
| Stretcher (medevac) | `heli-rescue.js` | `rescueHit(..., {gear})`: bump only above 8 m/s, two steps only above 14 |
| Hoist pay (medevac) | `heli-rescue.js` | `hoistBonus(gear, kind)` is 200 for a hoist only; `rescuePay(base, condition, bonus)` adds it once, whole, after the condition share |
| Searchlight (rescue) | `heli-search.js` | `searchLimit(base, kind, gear)`: hiker search clock limit plus 8 minutes; `searchNight(clock, base, gear)` says dark, seconds of night and whether the light is on |
| Heat camera (rescue) | `heli-search.js`, `heli-survey.js` | `heatContacts(heli, {hiker, driver, skier}, gear)`: warm people within 150 m, the skier only within 30 m; `heatAnimals(run, heli, gear)`: warm animals within 150 m in a count (shown only) |
| Quiet tips (wildlife) | `heli-survey.js` | `stepSurvey(run, step, gear)`: animals scare at 50 m, not 100 |
| Zoom camera (wildlife) | `heli-survey.js` | same call: counts out to 100 m, not 60; the covered share uses the same reach |
| Cargo net (supply) | `heli-rescue.js` | `hookCrates(heli, crates, gear)` hooks the nearest crate and, with the net, the next nearest within 10 m (`NET_REACH`) in one go; `canNetCrate`, `netCrate`, `carryNet`, `spillNet`, `netCrates`: weights add, the total stays under the hook limit (else only the nearest), set down beside each other, each paid on its own |
| Stronger hook (supply) | `heli-cable.js` | `hookPoint`, `canHook`, `hook` take `gear`: reach 5 m; hook limit stays 1,500 kg |
| Nose camera (TV) | `heli-camera.js` | `cameraViewsFor(gear)` and `heliCameraPose(view, index, gear)`: a fifth view "nose", 3 m ahead, looking level along the heading; pitch and roll do not move it |

## Hooks the session and app need

Moved to SKIN-HOOKS (Director): the session passing `gear` into the hook calls
(`hookCrates` for the supply pickup), `reelWinch`, `rescueHit`, `stepSurvey`,
`carryNet` and `spillNet` (skipping `netted` crates in `stepCable`);
`peoplePay(r, bonus)` and the hiker clock from `searchLimit` in
`heli-missions.js`; `% cameraViewsFor(gear).length` at `src/app.js` line 1810.
SKIN-VIEW draws the gauge, sight, heat inset and nose view.

## Open for Claude

1. **Hoist bonus is flat.** The 200 is added after the condition share (hoist
   rescue, unhurt 1,400, hurt 920, badly hurt 500), not scaled by condition.
2. **Coverage follows the zoom.** The count reach (60 to 100 m) also sets how far
   from the path a square cell counts as covered. Left at 60 m, the zoom would
   count more than the estimate expected and inflate every report.
3. **Heat camera range.** Distances are straight-line, height included. The hoist
   rescue's driver shows within 150 m like the hiker. The warm animals in a count
   show whatever species, scared or not, and the panel does not say which are
   being counted.
4. **Searchlight is the hiker search only** (avalanche, hoist and supply clocks do
   not change), because the packet says "the hiker search".
5. **Winch keys.** `command` -1 reels in and +1 pays out; which of W and S is
   which is the session's. The line starts at 15 m. With no winch the line is
   always 15 m and a leftover `lineLength` is cleared on the next `reelWinch`.
6. **Net rules.** Changed by the Director, see below.
7. **Nose camera** is 3 m ahead of the mast and 0.4 m up; SKIN-VIEW may move it to
   the model's nose.
8. The older `stretcher: true` flag and `RESCUE.stretcher*` numbers stay (existing
   tests use them); the new `gear` path reads `gearStats` and wins when both are
   given. A test checks they agree.

## Claude decided

Items 1 to 5, 7 and 8 stand as built. Item 6 (the net) changed: with the cargo
net worn, hooking up takes the nearest two crates within 10 m of the hook point
in one go (crates are 8 m or more apart, so two neighbours at the yard
qualify), so nothing is set down near the other. The nearest is the cable's
load, the next nearest rides with it, weights add, each crate is still paid on
its own, and the 1,500 kg hook limit covers the total: if two exceed it, only
the nearest is taken. Built as `hookCrates`; the 10 m is `NET_REACH`, a number
in `heli-rescue.js` because the gear table has no net reach. Without the net the
nearest crate within the hook's own reach (3 m) hooks alone, as before.

## Changed assertions

None. No existing test is edited.

## Checks

- `tools/test-heli-skin-gear.mjs` (new, 277 checks): fingerprints of the old
  cable, bucket, rescue, search, survey and camera results taken on f0bd1edb
  before any change; with no gear, stock paint, and each of the seven skins with
  the switch off, all six are identical; each skin changes only its own gear's
  scenario. Then each piece of gear on and off at its edges.
- Owned and neighbouring suites pass: bucket 233, cable 89, rescue 263, search
  1134, survey 9990, skins 62 groups, rescue-session 442, fire-session 79, fire,
  missions, jobs, mode (import guard), view, hooks.
- Lane tier (`--changed --jobs 4 --keep-going`): 38 passed, 0 failed, 0 not run,
  166 s. `npm run build`: built.

## Removed

Nothing replaced; no old code, test or document is removed.

## Review guards (Claude)

The review was CLEAR. Two small guards from its notes: the net falls back to
the stock hook limit (`KESTREL.hookLimitKg`) instead of no limit when a gear
object lacks one, and the winch ignores a non-finite time step. Suites pass.
