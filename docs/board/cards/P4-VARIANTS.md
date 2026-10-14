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
