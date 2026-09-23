---
task: VIS-01
status: red-tests
kind: independent-test-author
flag: wasteland2
---

# VIS-01 independent effects tests

## Provisional API agreed with the Director

`src/combat-vfx-atlas.js` exports
`flipbookFrameUV(frame, {columns, rows})`, returning `{offset, repeat}`
with `x` and `y` values for top-left source order. `src/combat-effects.js`
exports `createCombatEffects({loadTexture})`, returning `group`,
`update({state, course, dt})`, `dispose()`, and `resources`. The dedicated
loader returns a Three.js texture or `null` synchronously. The factory owns
its returned textures and disposes each exactly once. Missing sheets are
reported through `available` on the factory result or `resources`; the
renderer keeps CMB-01's procedural explosion pools and combat-scene bursts
active as fallback. The test does not prescribe the internal resource layout.

## Coverage

`tools/test-combat-effects.mjs` verifies the accepted 2048-square 8×8 fire,
explosion, and smoke sheets and the 1024-square 2×2 muzzle sheet. Exact UVs
cover row turns and first and last frames. A fake loader checks that all four
paths load once, bind to prebuilt transparent resources, and never load again
during 80 impacts. Object, geometry, material, and texture identities stay
fixed across those hits; disposal releases each dedicated sheet once.

The runtime fixtures check a visible hit on its first paused frame, no
visual state change on another paused update, progression with age, retired
draw calls after an effect ends, and separate player, later-CPU, and impact
positions. Rendering must not modify simulation state. A null loader reports
unavailable without per-hit allocations; positive controls keep the existing
procedural CMB-01 blast and combat-scene burst usable. Pinned controls keep
the ordinary fatal-crash shader and light and the flag-off Wasteland burst
presentation unchanged.

## Baseline and handoff

Based on integration commit `fc6cbc7`. Focused baseline
`node --test tools/test-combat-effects.mjs`: three controls pass and six new
behavior tests fail because `src/combat-vfx-atlas.js` and
`src/combat-effects.js` do not exist yet. `node --check` and staged diff checks
pass. No existing assertion changed. No source, browser, build, or heavy lane
gate ran in this test-author lane. The VIS builder should cherry-pick the
test commit, then run the focused file against the new modules. The private
High/Performance browser scenario is still needed to judge actual pixel
quality, missing-asset fallback selection in `render3d`, and frame pacing.
