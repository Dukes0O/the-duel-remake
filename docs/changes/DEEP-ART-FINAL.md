---
task: DEEP-ART-FINAL
status: review
kind: art
flag: the-deep
player_facing: yes (behind the-deep, dev)
---

# DEEP-ART-FINAL: the sardine, sea lion, sea otter and gray whale (24 October 2026)

Card `docs/board/cards/DEEP-ART-FINAL.md`, design `docs/THE_DEEP.md` sections 5 and 9.
Round 1 of 3. Claude's verdicts after DEEP-LOG's pictures set the four jobs.
Sheet and notes: `docs/board/looks/deep-art-final/round-1.jpg` and `round-1-review.md`.

## What changed

- **Four original models**, built in `tools/blender/deep-art-fit.py` with no donor
  file (the same recipe that made the moray and the clam). Each is one mesh with one
  material and vertex colours, so the game can instance it:
  - `silver-school`: a 32 cm sardine, slim, silver flanks, dark blue-green back, pale
    belly, gill cover, forked tail. 567 triangles, 22 KB. The log card shows a school
    of 34 of them; in the water the existing fish school instances it.
  - `sea-lion`: 2.3 m, deep chest, thick neck, sloped forehead with a tan crest, ears,
    dark eyes, whiskers, long foreflippers, two hind flippers. 2,100 triangles, 95 KB,
    body-wave clip.
  - `otter` (new): 1.3 m, floating on its back, pale head, frosted dark fur, paws on
    the chest, wrapped in kelp. 1,836 triangles, 91 KB, float clip.
  - `whale`: 14 m gray whale, mottled slate with pale scars and barnacle patches,
    short paddle flippers, a low hump and seven knuckles down the tail instead of a
    dorsal fin, throat grooves, notched flukes. 3,820 triangles, 160 KB, tail-pump
    clip (a morph target, no longer a skinned rig).
  The refit writes only the role it was asked for (`--only`) and replaces that row of
  `manifest.json`, so the other fourteen models stay byte for byte as they were.
- **The otter is in the sea** (`src/deep/sea-life-rules.js`, `sea-life.js`): a cap of 2,
  a plan row from the zone's `otter` spot, and one motion rule. It drifts in a small
  slow circle, floats at the surface, rolls a little, and eases away from the car
  without diving. Nothing else changed in the rules. `deep-log.js` gives it its card
  picture (`public/assets/deep/log/otter.webp`).
- **Pictures rerun** (`tools/scenarios/deep-log-pictures.mjs`): sardine, sea lion and
  whale cards redone and the otter's added; the sardine card is now a fixed school of
  34. The `deep-life` scenario has an otter picture. The sheet recipe is
  `tools/scenarios/deep-art-final-sheet.mjs`.
- Catalogue and credits: the three donor rows become original-geometry rows and the
  otter has one; the Quaternius mackerel and whale and the Poly by Google sea lion
  credits are removed from `public/assets/models/CREDITS.md`.

## Changed assertions (for Claude's review)

All follow from the otter now being drawn or a model being replaced; none is loosened.
- `tools/test-deep-life.mjs`: the plan holds one otter (was: held); five instanced
  types (was four); the otter is `ready` (was `held`); `HELD_CREATURES` is gone, so is
  the held check; the ceiling on drawn animals gains the otter's 2; the whale clip
  check wants one mesh with a morph target and a clip over 2 s (was: a skinned mesh).
  New: one test for the otter's float, drift and return, and the otter joins the
  smoothness, repeatability, cap and read-only-car checks.
- `tools/test-deep-log.mjs`: the otter has a picture (was: none).
- `tools/test-blender-output.mjs`: the Deep recipe lists `otter.glb` among its outputs.
- `tools/test-p4-kits.mjs` and `tools/test-tanker-valve-source.mjs`: the two pinned
  hashes of the catalogue (all rows but their own) changed because the Deep rows did.
  Proof: all 50 other rows are equal to `HEAD` in order; only `deep-silver-school`,
  `deep-sea-lion`, `deep-whale` changed and `deep-otter` was added. P4: `c781ab75…`
  becomes `2f86e1fb84b1fa222e0459fafd7050512771514681c88fd77143c6237f7027ff`.
  Tanker: `262e8fe0…` becomes
  `5430dfb0311a0336597bc6203b5469225b03fd8b000dbdf3b2dfea3e444f2886`.
- `tools/scenarios/deep-art.mjs`: eighteen roles (the otter is back).

## Checks

See the run log line for this branch. Race fingerprints are untouched (no race code
changed). No frame timing was taken; the deep-life scenario prints its own frame cost
as a side effect and nobody should read that as a frame check.

## Removed

- Superseded donor fitting in `deep-art-fit.py` for the sardine, sea lion and whale
  (their palette, pose and morph branches, `DIMENSIONS` rows and the whale rig colours).
- The held-creature mechanism (`HELD_CREATURES`, `plan.held`, the `held` status) and
  the otter's "no picture" case in `deep-log.js`.
- The three superseded GLBs were replaced in place; their donors stay in the external
  library only for the other models' history and are no longer credited here.
- Review evidence stays in `.evidence/`, not in Git.
