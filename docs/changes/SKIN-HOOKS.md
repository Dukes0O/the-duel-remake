# SKIN-HOOKS: skins, gear, dirt, the wash and the wildlife count wired in

Card: SKIN-HOOKS (Claude, SIM lane). Design: `docs/HELI_WILDLIFE.md` sections 5.2,
6 and 7. Switches: `heli-skins` and `wildlife` (both dev), passed to the session
as `skinsEnabled` and `wildlifeEnabled`. With both off, or left out, every result
is what it was (proof below). The app does not pass either yet (see Open).

## What the player can now do (with the switches on)

- **Paint shop** on the board at the home pad: every coat with its tally ("Fire
  service 3/5"), price, Wear (a new coat says "fresh coat"), Buy, and the wash
  with the grime. Buying takes the whole price once and only at the pad. A coat
  earned by five missions of its kind arrives by itself, even for missions done
  before H3, with Brian's line for the first and a note on the board.
- **Wash**: 100 credits on the ground at the pad, everything back to 0. Brian
  suggests it the first time the grime passes 80. A dirty helicopter flies the
  same as a clean one.
- **Dirt** builds from the flight and is saved on the profile: engine time,
  landings off the pad, bucket dips, water dropped on a fire and time low and
  near a fire, all through the rules of `heli-skins.js`, settled at each
  landing, crash, cruise leg and the end of the visit.
- **Fit buttons** offer the matching coat in the same click: "Fit the bucket and
  wear Fire service", "Fit the rescue line and wear Medevac" (a hoist call) or
  "... Search and rescue" (a hiker or avalanche call), "Take job and wear
  Wildlife" on the count.
- **Gear** from the worn coat: the winch (H held, W reels in, S pays out, 5 to
  40 m), the stretcher (bump limits, +200 on a hoist rescue), the searchlight
  (hiker search 8 minutes longer), the heat camera and the water gauge and drop
  sight as numbers in the view, quiet tips and zoom camera in the count, the
  cargo net (two crates in one hook, carried and set down together) and the
  stronger hook (5 m reach), the nose camera (C cycles five views).
- **The wildlife count** on the board below the car jobs ("Count the moose at
  Tremblant Woods", up to 600 credits, the same in Assisted and Real). Taking
  it at the pad starts the square; the panel shows the species, the count and
  the share covered. R (with no call waiting) or the board's Report button
  reports it once a quarter is covered and pays by `finishSurvey`. Taking a car
  job, Fly my car, Drop job or leaving the course drops it; it can be taken again
  the same day. The fifth count earns the wildlife coat.

## Files

- `src/heli/heli-session.js`: options `skinsEnabled`, `wildlifeEnabled`,
  `wildlife`, `surveyStand`; methods `paintShop`, `buyPaint`, `wearPaint`,
  `washHelicopter`, `reportCount`; `fitBucket`, `fitRescueLine` and `takeJob`
  take `{wear}`; getters `gear` and `cameraCount`; `view().skins` and
  `view().survey` (only with their switch on); events `skinEarned`, `skinBought`,
  `skinWorn`, `washed`, `surveyTaken`, `surveyCount`, `surveyScare`,
  `surveyRare`, `surveyDone`, `surveyDropped`. The view's `rescue.ground` line was
  not touched.
- `src/heli/heli-board.js`: the paint shop panel, the coat offers on the fit
  buttons, the count's row, its panel text and Report button, and the actions
  `bucket-fit-wear`, `rescue-fit-wear`, `survey-wear:<id>`, `survey-report`,
  `paint-buy:<kind>`, `paint-wear:<kind>`, `wash`. The gauge's litres replace the
  word on the bucket line when worn.
- `src/heli/heli-missions.js`: `peoplePay(r, bonus)`; `rescueLimit(kind, gear)`,
  `clockLeft(r, gear)` and `tickRescue(..., {gear})` take the searchlight.
- `src/app.js`: one line, C cycles `% (this.heliSession?.cameraCount ?? 4)`.
- `tools/test-heli-skin-session.mjs` (new, 200 checks).

## Proof that the switches off change nothing

Before any edit, on 91ab8a10, six scenarios were run and their events, save,
view, board markup and fingerprint hashed (a car job with the hook, a hiker, an
avalanche and a hoist rescue with the line fitted, a supply crate hooked, a fire
day with the bucket): carJob 2639427997, hiker 4027545282, avalanche 382890534,
hoist 2433107444, supply 1784988904, fire 1685599464. The new suite recomputes
them and they are equal with the options left out, with both false, and with
non-true values (only `true` turns a switch on). The fingerprints pinned by
SKIN-GEAR (`test-heli-skin-gear.mjs`) and the fire session's
(`test-heli-rescue-session.mjs`) pass unchanged. Stock paint with the switch on
passes null for the gear, which the rules read as the base kit.

## Choices made (Open for Claude)

1. **The app passes the switches (Director's change).** `visitHeli` now passes
   `skinsEnabled` (heli-skins), `wildlifeEnabled` (wildlife), the wildlife module and
   `surveyStand` (`App._surveyStand`, the placement checker with the whole square
   allowed). With both off the app behaves as before.
2. **No new import of `heli-camera` in `app.js`.** The line wanted `cameraViewsFor(gear).length`,
   but `test-heli-mode.mjs` lists the approved `heli/` imports of `app.js` and
   `heli-camera.js` is not one. The session offers `cameraCount`; `app.js` uses
   that. Passing the worn gear to `heliCameraPose` in `render3d.js` goes to SKIN-VIEW.
3. **The H key (Director's change).** W and S are the collective (lift), so the winch
   reels on `controls.lift` while H is held (or a plain `controls.reel`); the lift is
   not also applied. With the medevac coat the game calls `hookKey()` on key-down,
   which only notes that H is held; letting go hooks or releases, unless W or S
   reeled the winch meanwhile. With any other coat, or the switch off, `hookKey()`
   is `pressHook()` on key-down exactly as before.
   A held H is forgotten (`cancelHook`) on window blur, a crash, `start`, `enter` and
   `leave`, and `hookKey` does nothing outside flight, so it never reads as a tap later.
   Changing coats (`wearPaint`) is refused while a rescue is in hand, so the searchlight
   clock cannot be shortened; the fit buttons' wear offer works while the call is waiting.
4. **The count is reported in the air or on the ground** (R or the Report
   button), not only on landing, since the board is only at the home pad and
   most counts are at other courses. If "on landing" was meant, the check is one
   line in `reportCount`.
5. **One job in hand.** A count cannot be taken while a car job is in hand;
   taking a car job (or Fly my car) drops the count.
6. **The searchlight does not move the cold.** The casualty still gets cold at
   two thirds of the plain 15 minutes; only the end of the search moves. Dusk
   (the radio line and the drawn dusk) stays at the plain clock; the view's
   `skins.night` says how long it has been dark and whether the light is on.
7. **Sea salt is not built.** No destination is by the sea, so `overSea` is
   always false and salt stays 0.
8. **The gauge and sight are in the view only.** `view().bucket.reading` and
   `.sight` are present only with the fire service coat worn; the sight uses the
   aim ring the session already works out five times a second.
9. **Dirt clock.** Engine time and place are added every half second of flying
   (plain data, so any step size gives the same levels); whole levels go on the
   save at each landing, crash, cruise and the end of the visit. Part intervals
   are carried within the visit only (SKIN-RULES item 5).
10. **Winch with a bucket.** With the winch
    worn and the bucket fitted, the bucket's line follows the winch too.

## Changed assertions

None. No existing test is edited.

## Checks

- `tools/test-heli-skin-session.mjs`: 200 checks, about 60 s. Every heli suite
  passes (listed in the hand-back).
- Lane tier and build: see the hand-back.

## Removed

Nothing replaced; no old code, test or document is removed.
