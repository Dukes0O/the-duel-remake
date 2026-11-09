# WW-ART-PEACE

The short board entry controls current state, ownership, dependencies and locks.

The funny props for what became of the warlords, from `docs/story/the-polite-letter.md` section 3. Each should make a child laugh from the car before anyone says a word.

**Files you own:** `tools/blender/town-peace-props.py`, `public/assets/models/wasteland/town/peace-props.glb`, `docs/board/looks/ww-art-peace/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/WW-ART-PEACE.md` with a Removed section.

**Recipe,** each a named part:
- `sal-pipe-trailer`: a rusty pickup towing a long sagging trailer stacked with sawn pipe, the ends cut clean and bright.
- `dust-tanker`: a battered fuel tanker with goggles painted on the cab and a tarpaulin tied over everything that sticks out.
- `mirage-billboard`: a very good painting of a Treatment Plant on a flat board, on two poles, plainly a board from the side. `mirage-decoy-tent`, the same trick, with a smaller board behind it. `mirage-decoy-oasis`, a blue tarpaulin with a palm tree drawn on it. `mirage-caravan`, a real caravan with a dummy in a big hat. `mirage-camp`, a small plain camp with no sign at all.
- `gunn-turret`: a big, beautifully made turret on a base with three huge bolts, every part cleaner than anything else in the Wasteland. `gunn-rock`, a large rock scarred with bullet marks on one side only.
- `kettles-chair`: a huge dentist's chair built from truck parts and boiler plate, with a drill on an arm, that fits on a flatbed and looks wrong there.
- `magnus-crane`: a crawler crane with a huge round magnet on its cable and tin roofs stuck all over it. `magnus-roof`, one sheet of tin, for dangling. Reuse `tools/blender/magnus-magnet.py`'s materials.
- `toll-cabinet`: a dented steel filing cabinet as tall as a person, with one drawer open. `bound-stone`, a squat old stone with a carved mark. `bound-sign`, a sign reading DO NOT DIG HERE, with the words painted by hand.
- `vane-bottle`: a clear glass bottle with a white label, big enough to read on a car roof, and `receipt`, a curled paper slip about a metre across as a marker.

Show each from car height at 15 m on one sheet, and name each on the sheet.

Budget: 40,000 triangles, 2 MB, read back from the glb. Original shapes only, gritty and hand-built, never toy-like, except the bottle and Gunn's turret, which are meant to look too clean for this place. Metres, +Y up, one root empty, named parts as `tools/blender/magnus-magnet.py` does. Reuse the materials of the town base recipe first. Earlier rounds failed for these reasons, so do not repeat them: ground standing as a wall (check your up axis first), dark sheets, subjects too small in the frame, one mottled colour. Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`.

**Rounds:** at most three, each with one Blender-rendered sheet, JPG at most 500 KB. Look at your own sheet and fix it before you submit. Then set `waiting_on: claude`. Commit the model with every submitted round.

**Checks:** `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

## Claude answers
