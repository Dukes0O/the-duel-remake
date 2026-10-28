# SIRENA-KIT

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/THE_DEEP.md`; this card names the slice, files and acceptance.

Claude, on the laptop (it needs Blender, which the cloud sessions do not have).
Needs SIRENA-CAR, which added the Falcone Sirena and left its armor kit for here.
Switch `the-deep` (dev).

Every car has a fitted armor kit, three tiers of plates, built by
`tools/blender/armor-kits.py` into `public/assets/models/wasteland/kits/<car>.glb`.
The Sirena has none yet, and `tools/test-armor-kit-assets.mjs` waits for it by name
(`LAPTOP_KITS`). Nobody can own the Sirena before the Lab restores it, so nothing
is exposed meanwhile.

- Build `falcone_sirena.glb` with `tools/blender/armor-kits.py` from the Sirena's own
  model (`src/sirena-vehicle.js`): three armor tiers fitted to its body, the same
  node names, UVs and tier parts as the other cars' kits, and geometry distinct
  from theirs. Add the car to the script's roster as the other cars were.
- Fit-check it like the other cars (the kit sheet and its review note under
  `docs/board/looks/`), within the three-round art cap.
- In the same change, empty `LAPTOP_KITS` in `tools/test-armor-kit-assets.mjs` so the
  Sirena is checked like every other car, and delete the comment that explains the wait.

Owns: `public/assets/models/wasteland/kits/falcone_sirena.glb`,
`tools/blender/armor-kits.py` (the Sirena's row), `tools/test-armor-kit-assets.mjs`
(the one list), `docs/changes/SIRENA-KIT.md`. Locks: none. Sound: none.

Acceptance: `tools/test-armor-kit-assets.mjs` passes with `LAPTOP_KITS` empty; the kit
sheet is judged and recorded; lane tier, build. Removed: the `LAPTOP_KITS` wait.
