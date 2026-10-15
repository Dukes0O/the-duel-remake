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
