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

## Checks

- Independent review cleared the round-two recipe and numeric scaling.
- Blender 4.5.13 isolated export: 208,192 bytes, 1,052 triangles. Existing
  art/native suite: ten cases, 259 checks, all pass. All nine kit hashes match.
  Local resources, named parts, open-mouth rays, Stuttgart/Falcone fit,
  material isolation, purity, disposal, fresh imports and real trajectories
  pass. The combined kit remains within the existing 12,000-triangle ceiling.
- Earlier tests preceded source: art seven cases/23 checks, one pass/six red;
  fresh renderer imports also started red. Both import checks now pass.
- Reviewed trajectory correction replaces the obsolete one-muzzle parallel
  assertion with five distinct mouths reaching one locked world point after
  the player turns. Other assertions stay exact: 14 cases/144 checks passed.
- Round-one capture passed twelve real views, framing, pixels, cold heat and
  state/profile purity, with zero browser errors. Two setup failures spent no
  art round. Critic requested darker metal, corrected UVs and clearer collars.
- Yard/Armory flag witnesses remain one pass/two red, three cases/21 checks:
  injected Gunn-on is lost; default/off and released Sal pass. Hooks are held.
- Whole integration 55f44edf is received; README/VERIFICATION stay byte-exact.
  Two reviewed merge resolutions retain both Gunn and Arsenal Wave Three dev
  checks/launcher requests, with actual catalog length ten. All 42 flag checks
  pass; no other flag behavior changed. Native art suite remains 10/259 green.
- Round-two existing capture passed twelve views with zero errors/warnings,
  private port 58294 and memory-only saves. Sheet is 256,682 bytes; its short
  look note records source and hashes. Only the harness's isolated QA build
  ran; no broad gate, audio, balance or pacing. Existing assertions stay exact.
- Motion fixture started red at its missing helper, then passed sixteen new
  native checks. Art/native suite now passes eleven cases/275 checks; prior
  259 checks, approved kit hashes and current GLB remain unchanged. Scenario
  syntax and diff checks pass. Motion browser/pacing await the heavy slot.
- Round-two critic: art/material 3; readability, grounding and visibility 4.
  Cleaner metal/collars/fit, but broad panels and distant chips/welds need
  Claude's judgment. No art was changed or new round requested.

## Remaining

- Claude reviews round-two side, three-quarter and top views on Stuttgart
  and Falcone. Three-round cap applies; no finished look is claimed.
- Receive shared yard/router flags, rising-whine audio and fighter contact
  hooks from their owner. CREW.md already settles fighter splash numbers;
  current Rocket Pods car-target policy remains unchanged meanwhile.
- Complete motion/pacing and card checks, lane/build and required reviews
  on the final integration base before merge.

## Removed

Round-one GLB and broad texture bands are replaced, not retained. Approved
textures and nine fitted kits stay exact. Old unanswered move questions,
parallel-ray assertion, renderer fight imports and invalid capture fixtures
were already removed. No existing Rocket Pods behavior was removed.
