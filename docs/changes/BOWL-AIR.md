# BOWL-AIR

## Changed

- Added Bowl-only airborne nose pitch from the player's W/S throttle and brake inputs, behind the `titan-bowl` dev switch.
- Counted completed flips on upright landings and sent roof landings through the existing tumble and recovery.
- Kept the simulation helper out of velocity and jump calculations. The Titan's launch off cars remains identical with the switch on or off.

## Checks

- `node --test tools/test-bowl-air.mjs` — passed, 4 tests: Bowl-only pitch, a ramp backflip and upright landing, roof tumble and recovery, and matching car-launch velocity traces with the switch on and off.
- `node tools/test-replays.mjs` — passed, exit 0; no replay fingerprint changes.
- `npm.cmd run build` — passed. Vite reported dynamic import and large chunk warnings.
- Lane tier — Claude runs it. Browser and look checks — Claude runs them.

## Claude checks

- In the Bowl, verify W and S visibly pitch the truck in opposite directions while airborne; a completed backflip lands on wheels and increments the flip count.
- Verify a roof landing uses the existing tumble and recovery, and ordinary courses keep their prior attitude and replay behavior.

## Changed assertions

- None.

## Race fingerprints

- Unchanged; `tools/test-replays.mjs` passed against the checked-in fingerprints.

## Removed

- None.
