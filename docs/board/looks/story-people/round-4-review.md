# The Walkers at Tin Town

The retained comparison uses the body export from `57a8200d6`. The gate pair uses the same eleven placements, four carts, dusk light, camera and ground. The left stages the existing procedural on-foot fallback. The right shows the exported Walker skins posed by the actual Three.js presentation. The two strips below retain the native pixels of the 1280 × 720 frames. The camera is 20 m from Rell, with the game’s 1.62 m eye height and 72-degree vertical field of view. [Comparison sheet](round-4.jpg)

Rell is the 1.78 m scarfed woman in the rust coat and the trader’s canvas pack. Dace is 1.58 m, lean and blue-grey, with a patched knee and a satchel worn on the same hip as he turns. Wim is 1.16 m, in a mustard work jacket. In the 20 m view they span 18 × 44, 7 × 37 and 8 × 28 pixels. A triangle-depth check found all three silhouettes fully visible and every other Walker at least 71% visible. The near frames show Rell speaking, the group attending, Dace running, the cart in motion, and Wim asleep by Auntie’s stool.

The standing coat, individual boots and one continuous face survived the turned views. The coat now bends over Rell’s knees and Auntie’s apron clears Wim’s head. Skin-to-handle measurements over a stride put Walker 3’s hands within 2.1 cm of the grips and Walker 8’s within 3 mm. Running Dace’s supporting sole stayed within 5 mm of the ground. At the front camera Rell’s gesture has a small screen-space movement. Her source face is softer than Dace’s original teenager reference, and Dace is only seven pixels wide at the gate distance. Auntie retains the shipped Rook face, raised visor and rectangular leather apron specified for the existing cast. Claude’s laptop look still needs to judge these at play speed.

The eleven Walkers use one material, one photographic atlas and one skinned draw each. The twelve-person gate with Auntie and four carts has 33,102 triangles in 32 visible game meshes before shadow passes. The stopped-frame images use Blender lighting and a dust plane. The gate sign’s canvas lettering and the animated glow and flecks on the ember pot are left to the game.

## Reproduce the retained view

Run these from the repository root. The shell variable may point to any scratch directory. The sheet script uses Pillow. DejaVu Sans reproduces the retained labels. Other system fonts can supply the labels when it is unavailable.

```sh
blender -b -t 4 --python-exit-code 1 --python tools/blender/story-walkers.py -- --root .
people_evidence=.evidence/2026-11-18/STORY-PEOPLE/final
node tools/art/story-people-poses.mjs "$people_evidence"
blender -b -t 4 --python-exit-code 1 --python tools/blender/story-people-review.py -- "$people_evidence"
python tools/art/story-people-sheet.py "$people_evidence" docs/board/looks/story-people/round-4.jpg
```

The laptop browser scenario uses the actual Scablands world job, twelve people, their solid grid and the first-person camera on Performance. It stages a dusk group, Rell speaking, Dace running and Wim beside Auntie. Run headed for timing with the laptop graphics card free. The harness holds simulation steps while the regular Three.js render loop continues. The gate comparison fixes the camera and viewport, warms each view for 30 delivered frames, then samples 121 more. It captures the empty gate, full gate, full gate and empty gate in that order. The JSON records the paired p95 additions in renderer CPU time, main-scene GPU time when timer queries are available, and delivered frame intervals. Claude can compare these to the remaining 1 ms target on the laptop.

```sh
node tools/browser-harness.mjs scenario story-people --headed
```
