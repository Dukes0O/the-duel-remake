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
| Cargo net (supply) | `heli-rescue.js` | `canNetCrate`, `netCrate`, `carryNet`, `spillNet`, `netCrates`: a second crate rides with the first, weights add, set down beside it, each paid on its own |
| Stronger hook (supply) | `heli-cable.js` | `hookPoint`, `canHook`, `hook` take `gear`: reach 5 m; hook limit stays 1,500 kg |
| Nose camera (TV) | `heli-camera.js` | `cameraViewsFor(gear)` and `heliCameraPose(view, index, gear)`: a fifth view "nose", 3 m ahead, looking level along the heading; pitch and roll do not move it |

## Hooks the session and app need (not in this card's files)

1. `src/heli/heli-session.js`: pass `gearStats(profile, {enabled: heli-skins})`
   into `hookPoint`/`canHook`/`hook` (also its own copies of `CABLE.length` and
   `CABLE.hookReach` at the hook, the arrival hang and the hover height), call
   `reelWinch` each step with W/S while H is held, call `rescueHit(..., {gear})`,
   `stepSurvey(..., gear)`, `carryNet` after each `stepCable`, skip crates with
   `netted` in `stepCable`, and call `netCrate` and `spillNet` for the supply run.
2. `src/heli/heli-missions.js`: `peoplePay(r, bonus = 0)` passing the bonus on to
   `rescuePay` as its third argument (the session gives `hoistBonus(gear, r.kind)`),
   and `rescueLimit`/`clockLeft`/`tickRescue` taking the extra seconds from
   `searchLimit` for a hiker search (the light dims over the original last
   3 minutes; `searchNight` says where dark falls).
3. `src/app.js` line 1810: `% 4` becomes `% cameraViewsFor(gear).length`.
4. SKIN-VIEW: gauge text, sight dot, heat inset and the nose view are drawing.

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
6. **Net rules.** The first crate is the cable's load; the second joins while the
   first sits on the ground and the second is within the hook reach (5 m with the
   stronger hook) and not moving. Two crates is the net's limit; the hook limit
   (1,500 kg) is checked against the weights together. Crates are 8 m or more
   apart at the sites, so the pilot drags or sets the first down near the second.
7. **Nose camera** is 3 m ahead of the mast and 0.4 m up; SKIN-VIEW may move it to
   the model's nose.
8. The older `stretcher: true` flag and `RESCUE.stretcher*` numbers stay (existing
   tests use them); the new `gear` path reads `gearStats` and wins when both are
   given. A test checks they agree.

## Changed assertions

None. No existing test is edited.

## Checks

- `tools/test-heli-skin-gear.mjs` (new, 262 checks): fingerprints of the old
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
