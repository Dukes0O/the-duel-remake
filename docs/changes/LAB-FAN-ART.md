# LAB-FAN-ART: accepted Blender Speirling and Project Fan blueprint

Claude selected try 04 with the closed engine cover; Kyle supplied the
reference photographs. The sheet and verdict are round-5.jpg and
round-5-review.md. This lane merged claude/lab-fan-art (7a707622), preserving
the accepted pinned blueprint, its recipe, manifest and byte-for-byte checks.

## Design settled before code

The car now loads public/assets/models/unlocks/mcmurtry_speirling.glb through
loadSpeirlingVehicle, following loadHeroVehicle's GLTFLoader -> synchronous
instance factory pattern. This supersedes the earlier code-built body decision.
Usage: `const make = await loadSpeirlingVehicle(); const car = make(options);`.
No substitute body is created while loading or after failure. The cached default
loader clears a rejected promise for retry; injected loaders are isolated.
Each instance has private body geometry and materials. Imported wheel hub
origins become steering pivots and local spin groups. Driver, steering, hidden
fan rotors, two boost plumes, braking, glass cracks, directional damage,
crush, exact reset and grounding use the established shared car helpers.

The accepted asset is 40,601 triangles, 1,118,608 bytes and seven materials.
The runtime car with driver, cockpit and moving fans is 47,541 triangles / 40
draws, below the unchanged 50,000 / 66 caps. Metres, +Y up and +Z forward;
size metadata now matches the accepted 1.610 x 3.204 x 1.142 m model and
.292 m wheel radius. The GLB is unchanged from Claude's accepted version.
No roster/config changes: LAB-FAN still owns registration, as specified on
Claude's branch. This card supplies its production loadable vehicle factory.

The pinned Project Fan sheet remains 1.2 x .85 m, hung from the top edge,
with the Chaparral 2J, Brabham BT46B and Speirling airflow drawings. Its
360,952 bytes, SHA-256, vertex colours and deterministic rebuild are unchanged.

## Changed assertions

All changes below replace measurements of retired generated geometry with
measurements of the accepted GLB. No budget, damage, reset or grounding
accuracy limit increases. Claude's assertion review is needed before integration.

- Construction now parses the actual committed GLB and passes it through the
  production loader. Added exact URL, unloaded-null, rejected-load and missing
  wheel checks. Unsupported keys retain the same null assertions.
- Added raw GLB triangle cap (50k), exact seven-material inventory, four exact
  wheel names, hub height within 1 mm and forward/rear axle direction checks.
  Runtime finite vertices/normals and 50k/66 limits remain unchanged.
- Size/grounding assertions retain their tolerances; their metadata changes
  to the approved GLB dimensions/radius instead of the old 1.64/3.47/1.24/.33.
- Floor: replace the old generated skirt's 2-6 cm range with agreement to
  the accepted GLB floor within 1 micrometre, plus positive clearance below
  6 cm. The accepted diffuser's low point is 6 mm. This tests the approved
  mesh exactly rather than raising it or reproducing the retired skirt.
- Skirt material membership changes from separate Rubber skirt to shared
  Black bodywork, matching the GLB's material batching.
- Front fender samples move from Z=1.06 to the GLB axle at .94 and require
  a rise over the nose of more than .30 m. The accepted fenders are about
  .732 m high. Nose sample moves from 1.55 (past the GLB painted shell)
  to 1.45; the same .45 m upper limit remains.
- Cabin channel uses the accepted .314 m surface: above .25 m and at least
  .40 m below canopy top instead of the old generated tub's .40-.56 m.
- Rear grilles use Black bodywork instead of Dark machined metal; ray
  centres move from X=+/-.27,Y=.37 to the actual X=+/-.37,Y=.315.
  Tail hit changes from Z<-1.6 to Z<-1.4 for the shorter approved car.
- Spine ray uses the GLB's painted skin instead of black, retaining Z<-1.1.
  Its fin ray and .7 m height check remain unchanged.
- Red ring rays move from X=+/-.60+.042,Y=.50 to X=+/-.665+.023,Y=.546,
  matching the accepted rings. The same rear Z<-1.5 limit remains.
- Diamond ray moves to its actual luminous outline at X=.042,Y=.326,
  instead of the hollow centre. Rear hit changes from Z<-1.65 to Z<-1.5.
- Nose intake hit changes from Z>1.6 to Z>1.5 for the shorter accepted car.
- Added seven runtime-vs-GLB painted-surface samples within 1 micrometre:
  both front fenders, nose, cabin channel, both haunches and engine cover.
- Remaining silhouette differences, driver containment/steering, four real
  glass fracture zones, each damage direction, crush, stable-wreck upload
  avoidance, exact geometry/normal/wear reset, sibling isolation and tumble
  support assertions are unchanged. The total check count changes because
  finite-geometry/damage/reset assertions run per mesh, and this car is batched.
- Blueprint assertions are unchanged, including manifest and byte rebuild.
- The first lane run exposed an unregistered Blender recipe. Added a recipe-only
  entry to test-blender-output and --paths-only to the recipe, so all existing
  output-location, side-effect and coverage assertions also cover this GLB.
  No assertion in that guard was changed or removed.

## Checks

- Targeted Speirling suite: 392 checks PASS; runtime 47,541 triangles / 40 draws.
- Repository hygiene: PASS after renaming the requested sheet by round.
- Production build: PASS (`npm.cmd run build`, 1.04 s), existing bundle
  warnings only. Vite needed access to the integration-linked node_modules
  temporary config.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: all 41 selected
  suites covered with passing results. First attempt stopped on the missing
  recipe registration (7 passed / 1 failed / 33 unrun). After the fix,
  30 passed / 1 sandbox-blocked / 10 unrun in 114.20 s. The failed review-evidence
  suite could not spawn ffmpeg (EPERM); an elevated filtered completion ran
  only that suite and the ten unrun suites: 11/11 PASS in 188.66 s.
  A retry wrapper initially misread PowerShell's UTF-16 log and selected all
  suites; that owned run was stopped, its fixture copies recycled, and the
  corrected parser retained the 30 passing suites. No assertions changed for
  these tool restrictions. Replay fingerprints and world signatures matched.
- Session-end status refreshed as AGENTS requires. No board.yaml, integration
  merge, push, live installation or save access.
- No tools/scenarios file contains speirling or lab-fan; no matching browser
  scenario exists to run. No browser result is claimed.

## Removed

Removed the generated tub, canopy, fenders, nose, haunches, spine, grilles,
wing, lights, skirt, fitted patches, wheel builder and their shape constants
from src/speirling-vehicle.js. Retained only runtime fan/exhaust/cabin hooks;
the GLB supplies the body and wheels. Renamed the final sheet/note to round 5
and updated the recipe's sheet destination and asset credits. No redundant
body implementation remains. The pinned blueprint is kept unchanged.
Own gate/build logs, build output and the interrupted test copies were
recycled after recording the verdicts.
