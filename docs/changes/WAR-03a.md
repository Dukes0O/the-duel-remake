# WAR-03a: Gearhead Gunn

Gunn's rules, approved turret and native recording are built; listening and final gates remain.

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
- Existing scenario keeps its motion/art modes; opt-in GUNN_AUDIO_REVIEW=1
  records real-time native tell/lock/window capture at native rate, WAV stems
  and a compressed final mix for listening. Recording passed; no ear verdict yet.
  Actual App entry and one approved clear pose precede real physics throughout.
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
- Grounded-Stuttgart witness was red at missing lift, then passes three mouths
  with unchanged 1e-5 tolerance over 6.1 s. Raw-ground expectations now use actual
  surface plus clearance; fit/geometry/trajectory assertions stay exact.
  Native/art 31/514 pass, including fresh imports; vehicle grounding passes
  4,967 checks across nine models. Moved point function is byte-exact.
- Lane 109/1/245 stopped; a logged diagnostic repeat identified the omitted
  additive whine in Arsenal core audio's old-bank fixture (108/1/246). Director
  approved only that cue's admission; both historical hashes and other pins stay.
- Whole integration 872ea0b1 is received in db3dc2fa. Approved launcher/catalog
  union keeps every released state and existing dev flag, adding Gunn to thirteen.
  Current Gunn/art/flags/beta 45 cases, Convoy 42/390 and Ambush 35/797 pass;
  launcher 22 checks pass. Existing assertions stay, with the required dev entry.
- Four native aimed-rocket controls preceded contacts: two missing-hit failures,
  two friendly-fire passes. Real exit/walking and seeded raiders now pass via
  existing fighter body/splash helpers, with no invented state.
  Native cue dispatch/default-spatial control passes. Earlier focused controls
  passed 128 cases: 279/299/397/797 checks; car rules remain exact.

## Remaining

- Claude approved round two on 5 October 2026; no third round. Whole source
  review is clear. Real-time capture: private 31658, zero errors/warnings, 48 kHz
  stereo, 9.13 s, final peak 0.799, unchanged memory career and zero paused voices.
  Tell 5.0 s, rockets 5.5/5.75/6.0 s, cooled 9.042 s; ear verdict and lane/build remain.

## Removed

Round-one GLB and broad texture bands are replaced, not retained. Approved
textures and nine fitted kits stay exact. Old unanswered move questions,
parallel-ray assertion, renderer fight imports and invalid capture fixtures
were already removed. No existing Rocket Pods behavior was removed.
The new cue is additive; prior sound recipes and runtime assets stay exact.
The duplicate surface policy was removed from vehicle-grounding; its public
exports remain. Raw-ground mouth expectations are replaced by established lift.
