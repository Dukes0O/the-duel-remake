# FIX-RACE-SCREEN

## Settled scope before code

Claude and Director decisions 35e0fe39/c03e570c control this UI-only change. Mirror X and negate actor/finish headings together: heading grows left in Course but the old map displayed it clockwise. Keep world +Z up. Double the map's linear size (432 px panel, 384 px interior at 1080p), scale with viewport height, and put the unchanged-aspect mirror at top centre with 30% viewport width. Keep the mirror's 320-pixel target and 30 Hz refresh exact.

The pure warning helper caches actual course corners. Script corners use authored entry, direction, radius and .55 apex share; classic closed courses use existing geometric corner detection with the same .55 span share. Resolve existing intel brakeBoard or default 100 m. Show from 250 m before that point: arrow alone above 150 m; 150/100/50 at their thresholds; red BRAKE at the point until the first unpassed apex. Overlapping windows select that apex first. The HUD reads snapshots only.

Only braking sign faces double width/height; chevron faces grow by 1.5. Procedural ICE faces and posts stay exact. For the three actual braking-board GLB IDs, enlarge only their real face mesh around its own centre; preserve loaded source, posts, placement matrices, ground anchors and collider data. Other assets remain exact. Four memory-only driving views are chase, hood, wide and back; obsolete current front/right/left choices become chase. No new saved setting or migration.

## Changed assertions

Tests first add actual named-corner handedness checks across available and authored courses, Harbour/Woods distance, color and overlapping-apex cases, exact four-view/fallback checks and actual High/LOD face-only transforms. Old removed-view expectations change to chase; keyboard driving assertions stay exact. The legacy practice-map digest includes the shared HUD projection, so its exact coordinate pin must follow the approved global mirror; menu preview maps share this projection and inherit the same approved coordinate reflection; their non-map data, course/physics values and every other assertion remain exact. No world signatures or renderer-budget assertions change. Native 1080p/1440p overlap/readability remains UNRUN until the full check.

## Checks

Focused RED and implementation acceptance are recorded below. One original unfiltered nearby (209 suites, jobs 4) and build remain pending. No browser, native, balance or frame run.

## Removed

Remove front/right/left directional branches and the old mirror/map layout. Keep all current runtime assets and the existing rear-view resource and budget paths. No scratch or generated assets are required by this source change.

The first map test used three interpolated positions only 1 m apart on the same straight chord of Course's 8 m sample table. That yields zero geometric turn despite a nonzero stored curvature. The corrected new test uses the actual adjacent centreline samples at each corner; its handedness assertion is unchanged. Initial RED: missing warning API (8/8 groups), actual Pacific map turn reversed, obsolete front view selected. An initial Python default-text read also altered one UTF-8 comment; this own encoding error was repaired and all owned writes now use explicit UTF-8/LF.

Actual High/LOD model metadata proves `_0` is the steel post, `_1` the dark backplate, `_2` the writing panel, and `distance-*` the lettering. Their original panel centre is shared for the read-only XY face transform; depth remains exact. Director f4aba666 grants the coupled displayed bounds and existing triangle-clearance matrices. Source bounds still feed the original placementMatrix/kitBaseHeight, so posts, anchors and colliders are unchanged. The actual High/LOD matrix test failed on the old `_1` transform after every existing kit check passed (including all five actual circuit layouts); no model replacement or synthetic face stands in for this RED.

The actual legacy composite UI map/preview SHA changed from 4a35afd7b957069ab89f165f5b01e2c3371ceb8f638a554fd899962348411f4a to fc5bf66989f7831b1d8a237715e5e6ac50f740b407292f27745c5a18228f91e4. The shared projection also supplies CoursePreview.map, so its route coordinates inherit the same handedness correction; course-preview.js itself is untouched. This is an exact UI-coordinate pin, not a world signature. Director f02b6d7b additionally grants only src/test.js's seven-view array becoming wide/back/chase after hood, retaining all surrounding equality/cycle/state assertions.

Focused implementation checks: warning 8/8 groups; all-course map direction/actor/finish 490 checks pass; camera 38 checks pass; keyboard 443 checks pass with unchanged trajectory70b86b3eec039dc4. Real-kit original checks passed before the appended actual face-only RED. Corrected final face transforms remain pending the required nearby. Native1080p/1440p remains UNRUN.

Final focused practice-map acceptance passed981 checks on the exact new UI pin. Its old console summary said outputs were unchanged; only that summary is corrected to describe the approved shared projection. Native pixels remain UNRUN.

## Actual lane guard correction

The original unfiltered lane on c0ae657b completed205/209, four failures, zero not run,1241762.6074 ms; no build. Runtime/new acceptance, actual High/LOD face matrices and clearance, all443 keyboard checks and original replay/save/ghost checks passed. The four failures were superseded exact visual/UI expectations: old chevron vertices, two consumers of the same three map-containing geometry hashes, and the complete-scene pin.

Before literals changed, swapping ONLY the old/current route-map implementation in the identical current ordinaryGeometry projection reproduced every old hash and current failure value. All non-map projection bytes match; seed, roadFollowing, historical metadata and every other baseline key stay exact. The one unmodified world-composition capture on c0ae657b gave20 enabled rows:17 changed hashes, all102 changed-row counts exact, and three Titan rows entirely exact. Root reviewed the intended visual face geometry and full old/new rows; grants ced2b31e/677 allow only those17 hash keys, three routes.geometry keys and chevron reference1.8x2.025 with depth.08. UV, post/collider, culling, budget, replay and all other assertions/limits stay unchanged. No baseline recorder, new recipe, native photo or fitted tolerance.

The dev Summit row was not captured and is untouched, not proved unchanged. Its six tight hairpins also receive the approved global procedural-face enlargement when enabled. That future scene/native/full acceptance remains open with Summit's art source union. Native1080p/1440p pixels remain UNRUN. The corrected original nearby and build remain pending.

## Verified source integration, 13 October

Frozen514ca4b9136411c457a06d0a244cdacab0449284 passed the corrected original unfiltered nearby211/211, no failures/unrun, jobs4, exit0; aggregate761966.4356ms/wall768165.2926ms. Build exit0, Vite699ms/wall1378.2321ms. Independent production review and exact test-only correction confirmation are CLEAR. Production bytes remain identical to reviewed c0ae657b. The actual High/LOD face/post matrix and unchanged clearance checks pass, along with all443 driving controls and unchanged physical replay/save guards. Only the approved map-component pins and visual sign hashes/widths changed; no tolerance or filtering changed.

The source merged without conflict, so no post-merge gate repeats. busy-game-files is released. Native1080p/1440p overlap/readability remains UNRUN for the full check; Kyle judges in play. The uncaptured dev Summit scene fixture stays untouched/unproved and belongs to its eventual final-art union. No Codex release, push, live-port use or real-save access. Root recycles only this run's own merged screen lane/branch and consumed source receipts after committing these verdicts; older retained lanes and pending art/failed native packets stay.