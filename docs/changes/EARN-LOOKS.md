# EARN-LOOKS

- Task: one more art round on the three earned cars (Ferrari Enzo, McLaren F1,
  Bugatti Bolide), judged against the Wikimedia reference photos in
  `C:/Users/kyleb/dev/art-library/<car>/reference/` (viewing only, never
  shipped). Kyle asked for it before the earned cars go live. Lane
  `claude/earn-looks`. Kind: car look. The `earned-cars` switch stays dev.
- How it was judged: each car was drawn by the game's own vehicle router
  (the same model the garage shows) in front, side, rear (or rear
  three-quarter) and three-quarter views, framed like the matching photo,
  and set beside the photo on one sheet. The drawing page was a temporary
  tool and is not kept (rule 10); the sheets are the record.
- Sheets (one per car, photos left, model right, front / side / rear /
  three-quarter, each under 500 KB):
  `docs/board/looks/earned-cars/enzo-photo-round.jpg`,
  `mclaren-f1-photo-round.jpg`, `bolide-photo-round.jpg`.

## Scores against the photos (honest, out of 5)

| Car | Before | After | What still separates it from the photos |
| --- | --- | --- | --- |
| Ferrari Enzo | 1.5 | 2.5 | Reads as a red wedge with a bubble canopy. Still missing the raised centre ridge of the bonnet and the deep rounded fender humps; the canopy is a dome set on a long flat deck where the real car has a large raked glasshouse; the tail is a shelf, not a body-coloured integrated tail. |
| McLaren F1 | 1.5 | 2.5 | Teardrop is closer (higher haunches, roof running back into the deck, rounder nose). Still a small hat on a body: the real roof is broader and flows into the tail, the front wings are taller humps with a wide bumper mouth, and the door swage line is missing. Silver paint reads white in the render. |
| Bugatti Bolide | 2.5 | 3.0 | Right stance, X lamps on the fender tops, bonnet intakes, big roof airbox and tall fender end plates now show. Still a soft rolled nose where the real one is a hard shield with a carbon splitter; the canopy is a bubble, not an angled windscreen; the wing mounts are simpler. |

Before-scores are Claude's reading of the three baseline sheets; after-scores
are the final sheets.

## What changed per car

- Ferrari Enzo (`src/enzo-vehicle.js`)
  - Body stations redrawn from a side outline traced off the side photo
    (scaled by the wheel centres, then corrected for lens distortion against
    the real 1.14 m roof): a higher, blunter nose face (about .5 m at the tip),
    a lower belt along the doors with the glasshouse sitting taller above it,
    taller rear haunches either side of the engine cover that fall to a lower
    tail (.62 m), and a wider, rounder nose in plan.
  - Two big black intakes now fill the nose face, as on the front photo,
    replacing the small corner panels; the splitter is shorter and sits under
    the nose face.
  - Silver twin-spoke wheels (the real wheels are silver); the dark intake
    trims now use the car's carbon material instead of the wheel-dark metal.
  - The side scoop is a narrow slot just behind the door, as on the photo,
    instead of a large black slab. Door outline and sill line added, projected
    onto the curved flank.
  - Bigger round tail lamps at the rear corners (two each side).
  - Canopy sections lowered at the base and widened a little; same top height.
- McLaren F1 (`src/mclaren-f1-vehicle.js`)
  - Body stations redrawn from the side photo: tall haunches (.86 m) behind
    the cabin, the deck rising into the roof, a short rounded tail, taller
    front wings and a rounder nose; the cabin's back end deepens to join the
    higher deck (a fastback join instead of a hat on a low deck).
  - Larger headlamp housings, a smaller front mouth and thinner splitter.
- Bugatti Bolide (`src/bolide-vehicle.js`)
  - Taller front fenders and taller rear fenders (crest .88 to .92 m) with a
    carbon end plate rising on each rear fender, as on the rear photos.
  - The X lamps moved from the nose face to the top of each front fender,
    where the real car carries them. Two big dark intakes cut into the
    bonnet.
  - A much bigger roof airbox with a dark mouth, open to the front.

Kept as they were: the declared sizes (Enzo 2.04 x 4.70 x 1.15, F1 2.00 x 4.28
x 1.14, Bolide 2.06 x 4.82 x 1.18), wheel positions and radii, collision
footprints, the driver and steering hooks, damage and crush behaviour, and the
vehicle contract each test checks. No photo proved a dimension wrong.

Budgets (all under the Jesko's 73,600 triangles and 66 draws): Enzo 64,710 /
54 (was 66,442 / 56), F1 54,793 / 54 (was 54,655 / 54), Bolide 65,871 / 55 (was
65,660 / 55).

## Tests and checks

- Vehicle suites: `test-enzo-vehicle` (417 checks), `test-mclaren-f1-vehicle`
  (351), `test-bolide-vehicle` (430), `test-vehicle-assets` (147), `test-heli-cable`
  (103, the lift weight is unchanged), `test-earned-cars-ui`, `test-medals`:
  all pass.
- Lane tier `--changed --jobs 2 --keep-going`: 38 suites; the only failure was
  the repository placement check on the three new sheets (see changed
  assertions); it passes after the fix (run on its own, with
  `test-repo-hygiene-rules`: 150 checks).
- `npm run build`: passes.
- Browser scenarios at `--jobs 1`: `enzo-look`, `mclaren-f1-look` and
  `earned-cars` all passed with no browser errors.
- Not run: frame timing (rules 8 and 9: art rounds are not frame-timed), the
  full tier (rule 19: only car look code changed, covered by each car's own
  suite), the combat and Deep suites (not touched).
- Two test-driven corrections during the round, no test touched: the Enzo's
  length check caught a tail lamp ring that stuck out 2.8 cm too far, and the
  F1's lens-size check caught headlamp lenses made too large; both were fixed
  in the model.

## Changed assertions

- `tools/test-repo-hygiene.mjs`: the list of allowed look sheets in
  `docs/board/looks/earned-cars/` gains the three names
  `enzo-photo-round.jpg`, `mclaren-f1-photo-round.jpg` and
  `bolide-photo-round.jpg`. Why: the brief names these sheets and the rule only
  allowed `car-N-round-N.jpg`. Nothing is loosened: the check still refuses
  any other picture outside `public/`, and the three names are exact.

## Removed

- The Enzo's four small corner intake panels and louvres, the old large side
  scoop slab, the beak lump on the nose and the old lamp ring size are gone,
  replaced by the nose-face intakes, the narrow side slot and bigger lamps.
- The Bolide's nose-face X lamp holder (moved to the fender tops) and its
  small roof scoop box (replaced by the larger airbox).
- The temporary drawing page, its scenario and the QA build output were
  deleted from the lane after the sheets were made (nothing was added to
  `tools/` or the QA bundle list).

## Open

- One round only, as asked. Another round would go first at the Enzo's
  raised bonnet ridge and rounded fenders, the F1's broad roof and tall front
  wings, and the Bolide's hard nose shield and angled windscreen.
- Not merged. Ready for Claude's review of the sheets.
