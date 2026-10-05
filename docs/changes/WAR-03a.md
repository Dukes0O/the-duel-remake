# WAR-03a: Gearhead Gunn

Native Gunn rules and the round-two turret are built. Claude's look approval,
remaining shared hooks and merge gates are still required.

## Changed

- Gunn drives the Stuttgart in the Pit with tracked tells, predictive locked
  aim, spaced rockets and the earned overheat window. Rocket Pods numbers stay
  unchanged; moving launches compensate inherited speed.
- First win earns Rocket Pods and a free cosmetic turret look on any unlocked
  car. It adds no armor, mass or weapon effect. Settlement saves once.
- The dev switch gates registry/territory entry. Pure JSON layout and pose
  helpers keep presentation outside the fight graph and race state.
- Native mouths reuse the established surface lift and tire clearance from
  pure vehicle-surface exports; renderer imports/re-exports retain exact policy.
- Round two follows Claude's direction: dark gunmetal box, blackened steel
  collars, dark welded seams and small edge/corner chips, without long bands.
  New UVs keep square texture scale; approved textures are unchanged.
- The whole turret grows 15%. Shared head/mouth numbers grow with it; mount
  centres remain exact. Named base, head, heat panel and hollow mouths stay
  separate. Per-actor heat materials and cold cosmetic looks are preserved.
- Only --gunn-turret exports the replacement runtime GLB. Blender sources
  stay in scratch; none of the nine approved kit recipes or models changed.
- Existing Gunn scenario gains opt-in GUNN_FIGHT_REVIEW=1: actual App entry,
  native tell tracking, turned-player lock, rendered mouth/rocket alignment,
  overheat/cooling and the existing 120-frame High/Performance profiler.
  One tested pose fixture is followed by real physics; no fake move state.
- Gunn's native tell names arena.gunn-barrage and keeps its settled seconds
  and position. A switched procedural rising whine fits the shortest tell;
  the generic audio consumer selects the event cue, retaining arena.tell as fallback.
- Main-menu Armory forwards injected flags to its read-only territory panel.
  Defaults, released Sal and the absence of fight launch buttons stay exact.
- Router and yard now forward the same native flags. The motion scenario
  uses real Territory Map and Gunn FIGHT buttons, verifies profile purity
  and the actual intro, then preserves all earlier motion/pacing assertions.
  Stopped-App advance now presents the actual yard before clicking its UI;
  the first browser attempt exposed stale approach markup, not changed state.

## Checks

- Independent review cleared the round-two recipe and numeric scaling.
- Blender 4.5.13 isolated export: 208,192 bytes, 1,052 triangles. Existing
  art/native suite: twelve cases, 299 checks, all pass. All nine kit hashes match.
  Local resources, named parts, open-mouth rays, Stuttgart/Falcone fit,
  material isolation, purity, disposal, fresh imports and real trajectories
  pass. The combined kit remains within the existing 12,000-triangle ceiling.
- Art/fresh-import tests preceded source (art 7/23, one pass/six red).
  Reviewed trajectory witness keeps five mouths at one lock after a player turn.
- Yard/Armory witnesses all pass: three cases/21 checks. The existing yard
  test reproduced the lost flag before source; defaults/released Sal stay exact.
- README/VERIFICATION stay byte-exact; no released flag behavior changes.
- Round-two existing capture passed twelve views with zero errors/warnings,
  private port 58294 and memory-only saves. Sheet is 256,682 bytes; its short
  look note records source and hashes. Only the harness's isolated QA build
  ran; no broad gate, audio, balance or pacing. Existing assertions stay exact.
- Round-two critic: art/material 3; readability, grounding and visibility 4.
  Cleaner metal/collars/fit, but broad panels and distant chips/welds need
  Claude's judgment. No art was changed or new round requested.
- Sound probes preceded source: two cases red at missing recipe/event cue.
  Both now pass 50 checks, including the exact old arena.tell recipe and
  native timing. Full Gunn suite: 19 cases/215 checks, all pass after the yard fix.
- Motion browser reaches the real yard buttons/intro and tracks a moving
  target without changing race/profile. First-shot mouth check proves a
  0.045 m missing native ground lift (rendered x/z agree within 2e-9).
  The corrected motion run passes both qualities with 12 captures, no errors or
  warnings; 120 advancing frames give High p95 19.0 ms and Performance 18.2 ms.
- Real grounded-Stuttgart witness started red at the missing lift, then passes
  all three mouths with unchanged 1e-5 tolerance. Its new fixture runs 6.1 s
  to observe the complete barrage, not only the first shot at 5.6 s.
  Reviewed raw-ground expectations now use actual surface plus clearance;
  fit/geometry/trajectory assertions stay exact. Combined native/art 31/514
  pass, including both fresh imports. Existing vehicle grounding passes 4,967
  checks across nine actual models; moved point function is byte-exact.
- Whole integration 2e7862fb is received. Narrow flag union retains every
  released state and existing dev flag, adding Gunn dev only (catalog twelve).
  Beta's exact catalog lacked Gunn; approved addition retains every old assertion.
  Flags 51, Preview 22 and all eight beta cases pass; Arsenal core/wave-two pass.
- Four native aimed-rocket controls preceded contacts: two missing-hit failures,
  two friendly-fire passes. Real exit/walking and seeded raiders now pass via
  existing fighter body/splash helpers, with no invented state.
  Native cue dispatch/default-spatial control passes. Gunn/art/car-contact/Ambush
  focused run passes 128 cases: 279/299/397/797 checks; car rules remain exact.

## Remaining

- Claude reviews round-two side, three-quarter and top views on Stuttgart
  and Falcone. Three-round cap applies; no finished look is claimed.
- Whole-source review and remaining sound/card checks, then lane/build on the
  final integration base before merge. No broad gate while the look waits.

## Removed

Round-one GLB and broad texture bands are replaced, not retained. Approved
textures and nine fitted kits stay exact. Old unanswered move questions,
parallel-ray assertion, renderer fight imports and invalid capture fixtures
were already removed. No existing Rocket Pods behavior was removed.
The new cue is additive; prior sound recipes and runtime assets stay exact.
The duplicate surface policy was removed from vehicle-grounding; its public
exports remain. Raw-ground mouth expectations are replaced by established lift.
