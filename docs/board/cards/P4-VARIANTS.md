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
