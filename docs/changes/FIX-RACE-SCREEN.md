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
