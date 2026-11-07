# TOWN-ART-TRUCKS-1, round 11

Kept the approved fire truck and tanker. The three photo-carved truck hulls
now bleed each measured image's background with the fire truck's wider colour
match. Hull faces fall back to the next photo that covers them.

The supply load is a photo-carved `supply-truck:load` child, measured from
four generated loaded-truck views. It sits above the retained bed floor and
fits within the bed. The tow crane is traced and thickened from its side photo;
its open lattice, vertical cable and hook line up below the measured boom tip.
The round 11 sheet uses larger comparisons and the round 9 side road camera.

## Checks

- `node tools/test-blender-output.mjs` — passed, 292 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs` — passed.
- Fresh Blender import render — passed visual review; the family GLB is
  3,400,356 bytes. Truck triangle counts: fire 10,352; tanker 10,092;
  supply 11,252; tow 10,360. Each is under 12,000.
- Browser and game look check — Claude runs after merge; inspect the tanker,
  supply load with `supply-truck:load` visible and hidden, and tow boom, cable
  and hook from the side and road views. The fire truck remains unchanged.
- Assertions changed: none.
- Race fingerprints: not applicable to this art-only change.

## Removed

Removed the supply truck's plain crate boxes and sphere sacks, and the floating
tow hook path. The round 10 sheet and review note are superseded by round 11.

## Tyres (Claude, 6 November, from Kyle's eye)

Kyle found the tyres wrong in their cutouts. Up close: the arch's wall still wore the photo's tyre, the tread showed the photo's background, an axle's end poked through the wheel face, and three trucks' wheel measurements were up to 40 pixels out. `hull_model.py` now has `tyre` and `wheel_well`; the wheel numbers were measured again from grids over the photos. The undersides are dark. Lamps: the pale blobs are gone, and the glowing lenses now sit inside the bodies until the night look is built.

Checks: `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs`, build. No assertion changed.

Removed: the old tread and wheel-face code.
