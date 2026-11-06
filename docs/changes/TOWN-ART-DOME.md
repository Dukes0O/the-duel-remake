# TOWN-ART-DOME

Round 3 adds the gate, sign, Heap and rim details from Claude's round 2 verdict. The two upright bus bodies use the stated 11 x 2.5 x 4.4 m size, individual nose crops, red paint photos, grille bars, lamps, wheels and two rows of broken windows. The thick sign plate uses the photographed SCRAPDOME lettering, with bolts and hanging chains. The mound reaches 18 m and carries 90 overlapping 4.5 m wreck bodies over a wrapped stacked-car picture. The rim uses 100 mm square-section tube at about 3 m post spacing, plus hanging canvas and flags. The gate approach has an uneven skirt that fades to ground level.

Every loaded picture is a separate repeating JPEG in the GLB. The maximum metallic factor is 0.22. The review views are rendered from the exported GLB imported into a fresh empty Blender scene. The rendered candidate in `.qa-dist/town-dome/dome.glb` is 2,955,740 bytes and 28,722 triangles. The working runtime copy at `public/assets/models/wasteland/town/dome.glb` is a different export: 2,976,484 bytes and 27,442 triangles. The review sheet renders the QA candidate, so the runtime copy must be synchronized after the art correction passes.

## Checks

- `node tools/test-blender-output.mjs`: passed, 239 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets remain advisory.
- Blender export and three fresh-scene renders: completed. The QA candidate stays under the 3 MB and 30,000 triangle budgets, but the side view fails the visual target and the runtime copy does not match it.
- `node tools/test-review-evidence.mjs`: 7 of 9 subtests passed; two unrelated failures remain. The crew evidence test expects 5 November while the current date resolves to 6 November, and the audio-analysis test could not start `ffmpeg` (`EPERM`).
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 12 suites passed, `tools/test-circuit-eifel.mjs` failed because its loudness check could not start `ffmpeg`, and 34 suites did not run after that failure.
- `npm run build`: passed through `npm.cmd run build`; PowerShell blocked the `npm` script shim.
- Browser checks: not run; Claude owns those for this art card.
- Race fingerprints and world signatures: unchanged; this lane changes no simulation or course rules.

## Changed assertion

The dome output check no longer expects one embedded atlas. It now requires separate JPEG pictures, no atlas name, a photographed sign with no font mesh, and metallic factors at or under 0.3. This follows tonight's art rule and makes the check stricter about the exported material contract; no tolerance was loosened. Claude should review the assertion change on this card.

## Look review status

The round 3 sheet still falls short from the outside: the side view reads mostly as a smooth gray wall, with few wrecks visible. The gate reads better, but the exterior bowl does not yet meet the card's stacked-wreck requirement. Correct the asset and replace the round 3 sheet before it passes. The saved sheet is in `docs/board/looks/town-art-dome/round-3.jpg`.

## Claude look review

After correction, check the bus proportions and two broken window decks against the reference, confirm the mound bodies rest on the Heap, and inspect the tube posts, hanging canvas, flags and sloped skirt from the side view.

## Integration merge

The requested `git merge integration/wasteland` was blocked by automatic review because this lane's rules forbid the builder from merging. No workaround was used. This recipe implements separate picture materials locally and does not change the shared `town_base.py` helper.

This lane also predates current `integration/wasteland` (`cbf8fc37`). Do not hand it to integration until the lane is brought current and its required checks pass.

## Removed

- Deleted the round 1 sheet and review note as requested.
- Removed superseded `bus-front.jpg`, `bus-side.jpg` and `scrapdome-sign.jpg`; their uses are now separate crops.
- Removed the dome atlas-building code and computer-font SCRAPDOME lettering.
- The Blender candidate and editable `.blend` remain in ignored `.qa-dist/town-dome` while the visual correction is unresolved.
