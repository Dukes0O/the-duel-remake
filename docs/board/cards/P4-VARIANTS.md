# P4-VARIANTS

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-VARIANTS
    title: "Reverse, night and dusk variants"
    owner: codex
    lane: RACE
    size: M
    needs: [P4-PANORAMA, P4-HARBOUR, P4-TREMBLANT, P4-CAREER]
    status: ready
    owns: [tools/test-circuit-variants.mjs, docs/changes/P4-VARIANTS.md]
    hooks: [src/circuits/index.js, src/circuits/panorama-ridge.js, src/circuits/harbour-lights.js, src/circuits/tremblant-woods.js]
    acceptance:
      - "Build docs/CIRCUITS.md section 6 for Panorama Ridge (Night, Reverse), Harbour Lights (Dusk, Reverse) and Tremblant Woods (Reverse): reverse script builds with rebuilt boards, kerbs and pit lanes; variant light paths; stable appended event ids; variants unlock after a top-three finish on the default event. Each reverse checked with the review tool."
```


## Pre-code reverse pit and terrain questions — 14 October

Career8c2 ismerged: fiveordinaryrace variants can derivefreeowned-default+prospectiveDEFAULTtop3 access, uniqueown devflags/stableeventIDs/noCombat; no pay/save/App/Game/registrymanualroster change. Reverse followsrealtrack-script.reversePieces includinglength−parentScriptStart; donorTerrain/fixtures/privatekitgetters muststayimmutable. AssignfinalappendorderAFTERAttackmerge; sourcepreparation mustpark/release circuit-registry forAttackpriority, never reserve a runtimeplaceholder slot.

Claude: please settle nativePanoramaReversepitacrossits startline. ExistinginstallPitLane truncatesnamedstartstraighttoMath.max(s0,0), leavingabout80m/entry10..70 withcurrent60mtapers. Maythisnewvariant usea narrowwrapped-start-straight pithook retainingalllegacydefaults, or should its newstart/pitlayoutmovewithinthatstraight? Harbour/Woods havevisualpaddocksbutNO nativepitLane; confirmreverse reflectsvisualpaddocks andaddsno inventednativebay. AlsoPanoramaCourse._relief ridgeLandform presentlyhardcodes hillside off<0; mayunreleasedreverse descriptor useexplicitoptionalridge side+1 while default−1 retainsreleasedterrain exactly? ThisrequiresnamedCourse hook onlyafterAttack'sCorepriority; no sourcechange now. Reverse terrain shouldpreservephysicalmountainorientation, notsilentlyswapits side. Section6doesnotsettletheseimplementationdecisions. No lane, code, tests/references/signatures or measurementT starts beforeyouranswer/exactscope. Othercardscontinue.

## Claude answers - reverse pit and terrain, 14 October

- **Panorama Reverse pit:** move the reverse start line along its start
  straight so the existing pit layout (60 m tapers, full bay) fits inside it
  with no wrap; no new pit hook. Only if the straight is too short for that,
  stop and give the lengths here.
- **Harbour and Woods reverse:** mirror the visual paddocks only; no native pit
  bay is invented.
- **Panorama ridge side:** yes, an explicit optional ridge side on the course
  descriptor, default -1 (released Panorama exactly unchanged), +1 for the
  reverse, so the mountain stays where it physically is when you drive the
  other way. Named Course hook after Attack's core priority, as you propose.


## Read-only preparation, 15 October 01:20 PT

Claude's no-wrap answer is feasible without changing pit-lane.js. The existing buildTrackScript geometry reports the fitted Pit Straight length551.9821523470663m. The original reverse start leaves only60m between pit entry and exit, shorter than its two60m tapers. For the future reverse descriptor, use scriptStart = fittedStraightLength - parent.scriptStart =471.9821523470663. The existing reverse transform then puts the straight at about[-80,471.982] and the pit at[10,461.982]:451.982m between entry/exit, including331.982m after both tapers, matching the default layout. Derive this from the actual fitted geometry, not the nominal553m script length; nominal553 puts the line just outside the fitted straight. Parent descriptor remained byte-for-byte equal as serialized. This was a read-only geometry calculation, not a lane/test/build/native acceptance.

The accepted ridge-side hook remains narrow: descriptor default-1 preserves released Panorama; reverse+1 follows the physical mountain. Rebuild direction-dependent safety placements and transform frozen parent landform/scenery coordinates rather than mutating them. Harbour/Woods get visual paddocks only. Existing course-owned manifests already support zero-price default-gp-podium children; five separate dev flags and stable appended ids need no handwritten global roster or new save fields. Attack now occupies releaseOrder6, so future variants append after it; check current orders again before implementation.

No lane was opened or claimed, no source/test/reference/signature changed, and no gate/build/browser job started. New lanes still wait for Kyle's merged-folder cleanup rule to be satisfied; the existing blocked HELI folder is retained without another deletion attempt.

## Daylight build claim and concrete course-owned files

Kyle directed continued building. p4-variants/codex/p4-variants starts at141f6eed and holds circuit-registry. First thin slice: course-owned panorama-ridge-night and harbour-lights-dusk modules, using immutable parent descriptors and constant existing night/dusk light paths. Then panorama-ridge-reverse, harbour-lights-reverse, tremblant-woods-reverse modules. Stable release orders7/8/9/10/11 respectively append after Attack6; each has its own dev flag, zero price and existing default-gp-podium parent unlock. Preserve parent generation stages/seeds, parent terrain/scenery data and all current assets. No manual global roster or save/App/Game/pay edit.

Owns those five new src/circuits/<id>.js modules, a small src/circuit-variants.js derivation helper, tools/test-circuit-variants.mjs, own change note, and only their actual course-owned reference/world-signature fixture files. Approved parent hooks and optional Course ridge side remain as settled above; any extra terrain/placement hook must be named here before editing. Existing manifest/feature/eligibility fixture assertions may be extended only for the five appended dev events, with exact assertion changes named before editing. Do not change a released parent baseline, replay or runtime descriptor. Keep every reverse native review, nearby/jobs4, build and independent review before final merge. Lighting is an incremental source slice, not completion of all five variants. No release/preview install, frame timing or new test framework.

## Named reverse terrain and placement hooks

The reverse source slice additionally owns narrow opt-in hooks in src/course.js (a separately constructed immutable parent terrain donor, road-station/lateral mapping and donor far-ground height; default ridge side remains -1), src/circuit-hills.js (optional reversed hill-noise and basin-outline orientation; all existing defaults exact), and src/circuit-effects.js (lake outline reads that same optional orientation). These preserve the physical hill and lake shape instead of running the parent noise backwards. No renderer state, race rule or new terrain recipe is added. src/circuits/panorama-ridge.js exports its existing placement builder with an optional pit side, default right unchanged; the reverse rebuilds the full native pit paddock on the left at the approved moved start. Other parent modules and their lazy data remain immutable. Reversed buildings, local hill pads/runs, lift cables, street ranges and review stations are copied through explicit transforms; direction-dependent boards/kerbs/walls come from the existing native reverse script. Tests must prove released-parent samples, ground and obstacle fingerprints unchanged, reverse road/ground correspondence, full pit length, physical landform orientation and no invented Harbour/Woods pit. Existing course-intel fallback supplies actual reverse corner directions instead of retaining wrong-direction authored notes. Actual native reverse reviews and the final lane/build/review remain required.

Kyle approved the explained new reverse-test correction in chat15October: retain1cm road-centre bound and add0.0002rad tangent bound, then derive the far-lateral bound from them. Automatic review rejected the first attempt; no rejected edit ran. Existing assertions remain unchanged. Harbour's already named parent hook exports its existing street layout as HARBOUR_STREET for the reverse to rebuild walls/openings, road-facing shops and mirrored visual paddock through the existing buildKitPlacements; default data and getter remain exact. Focused variants suite now5/5, including exact pre-edit parent road/ground/obstacle pins. Native reviews, references and final checks remain pending.

## Existing QA fixture admission hook

The first actual Night reference attempt05478fca was refused by production admission: buying a zero-price variant does not earn its parent podium. The production rule is correct. Name these additional QA-only hooks before edits: tools/build-reference-laps.mjs startReferenceApp, tools/track-review.mjs runHeadlessLaps/review data, tools/scenarios/track-review.mjs disposable browser profile setup, and existing tools/test-reference-laps.mjs cases. Their existing memory-only profiles may contain the actual manifest-required default-event top-three result and parent ownership, representing an eligible player; admission stays real and unchanged. No unlock override, runtime save/policy edit, fake course index, new harness or relaxed deadline. Test the fixture prerequisite and preserve profile data. Actual failed attempt remains a refusal, not a passed reference.

## Reviewed native pictures and safe initial scene capture hook

Actual native sheets for all five events were inspected: Night is the existing dark night look; Dusk retains the lit waterfront under dusk sky; reverse Harbour shows reversed hairpin/street approaches; corrected reverse Woods shows continuous ground, mirrored paddock/lake/lift and correctly directed corners. Panorama reverse road/walls/pit are visible; its stock-review driver crashed and one view is airborne, so no clean stock-driving acceptance is claimed. All five actual three-lap racing-line reference records completed. Private browser reports have16frames each and zero issues/warnings. Old Woods readiness failure remains failed.

Automatic approval review rejected an initial capture command that would have written temporary null fixture headers before picture review; no part ran and no fixture was changed. Safer replacement is explicitly named here: tools/test-world-composition.mjs may add --capture-new=<ids> for this card's five initially absent dev scenes. Preserve the existing enabled-course baseline-coverage assertion verbatim, compare every existing enabled scene as before, and append only explicitly named, known, disabled dev definitions that have no baseline. Reject unknown/duplicate/enabled/already-baselined names. Capture prints actual signatures only; no placeholder, old hash rewrite, assertion/tolerance change or new framework. Save only the five actual new signatures after this reviewed visual difference. Existing ordinary/capture modes remain unchanged. One independent code review covers this hook before merge.

## Final nearby gate fixes —15October

First frozeneca7f07c nearby completed323/327/jobs4/zero unrun in1656.42s. Failed: shortcut generation source fingerprint; test-circuit-layouts assumes every non-Attack child costs credits/has a unique parent generation identity, plus new reverse descriptor length differs from actual reverse build by about4e-12m; test-summit-attack assumes Attack remains the last registry entry after later append-only variants; actual reverse Panorama catch-fence fails unchanged native kit road clearance. Every native line-driver case for all five new variants passed. No green gate or merge claimed.

Name these necessary existing hooks before correction: tools/test-circuit-layouts.mjs registry fixture assertions must retain paid-parent checks and give exactly the five approved zero-price/default-podium children explicit assertions, preserve original parent generation identities and verify child-parent identity. tools/test-summit-attack.mjs keeps exact Attack entry/releaseOrder6 and original parent-route assertions while checking later entries have higher declared order, instead of asserting no future appends. src/generated-shortcut-presets.js may be regenerated by its unchanged generator only if all15route payloads remain exact; verify fresh solvers, no legacy path or replay/signature changes. Reverse helper lengthU must come from its actual native reverse build, leaving the exact existing equality test untouched. Bound the new reverse catch-fence diagnosis/fix to this own variant placement recipe, preserve all kit/road-clearance guards and released parent assets/placements, then actual updated native review/signature if visual placement changes. No threshold/assertion relaxation, renderer/world hook, source-hash-only hand edit or copied baseline.


## Final merge receipt, 15 October afternoon

Frozen 0b41c5b52d62dca2169d6aa14c8fb835be57e849: final nearby327/327/jobs4/zero failures or unrun,1470480.8948ms/exit0; build1439.8983ms/exit0; independent stock_snow_review CLEAR. The original323/327 failure stays recorded. Corrected reverse fence placement passed actual471High/LOD kit checks and16native pictures with no issues/warnings; all25actual scene signatures remain exact. All five actual native three-lap racing-line references and generic line-driver cases passed. Stock Panorama Reverse and Harbour Dusk review drivers ended gameover; no clean stock-driver or frame-timing pass is claimed. Parent road/ground/obstacle hashes and old fixtures remain unchanged. Five own dev flags stay off in the live game; no install/release/push. Root consumes final evidence in .evidence/2026-10-15/P4-VARIANTS and recycles only this new clean merged lane after its integration dependency junction is safely unlinked. HELI and every retained lane stay untouched.
