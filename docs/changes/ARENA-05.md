# ARENA-05: Ambush Alley

status: native fight and presentation built; browser and merge gates pending

## Settled rules

Kyle's 4 October answers are recorded in SCRAPDOME section 10. Waves have
3, 4, 5, 6 and 8 fighters, with a buggy in waves four and five. Every fighter
must be down and the buggy wrecked; neither returns during that wave.

The Pit cover ring is eight metres clear of the solid pile: radius 16 with
the native radius-8 pile. The parked car must also clear that pile. Salt uses
the midpoint of its longest low-curvature run. No world geometry changed.

Pay is 60 per completed wave plus 150 for all five, times difficulty.
Hold is five per completed wave in the existing venue territory, once.

## Changed

The mode owns fort health/wear, seeded native waves, ten-second gaps and
win/loss. It reuses createRaidZones/createFighter and existing player gear.

Scrap cover uses real collision boxes registered only on the event's Course
instance. The Pit car clears its solid centre pile; Salt uses sample 160,
the midpoint of a longest low-curvature run. Both spawn approaches stay
inside native walls, at least 60 metres from the fort. No world recipe or
world signature changed. The view reuses the released salvage-hulk kit at
the actual physical cover poses, with read-only state and explicit disposal.

Native entry initializes armor, foot transition and gear. A real Dusthawk
stays inactive until waves four/five, then rams solid cover with normal
armor/contact rules. Its weapons stay held; it cannot return in its wave.

The arena ticks waves and normal raider/foot hooks. The new mode cannot
enter without its own dev switch, a discovered career, rank 12 and Pit or
Salt admission. Foot exit/re-entry allows Ambush and released Fuel only;
other arenas remain denied. No substitute participant was added.

Existing pure settlement and durable owner/retry write pay verified waves
once. Saves, credits and unknown fields stay unchanged. Yard/HUD/results
offer two venues and show fort health, waves and saved pay. The real wrench
repairs forty fort health over four seconds; normal car repair is unchanged.
The buggy targets solid cover; its actual drive/contact witness passes.

## Fighter, contact and sound

Wave raiders use existing fixed-step fighter movement and collision, with
a bounded sidestep at blocked terrain. They fire real RPGs through clear
terrain approaches, cannot return within their wave, and use swept fort
impacts. Raiders receive no friendly RPG damage or player RPG hit credit.
Ordinary camps retain their original movement, shots and respawn rules.
Wear measures native cover targets rather than only the centre pile.
Wave/clear cues are interface.go/interface.bonus; RPG launch/impact reuse
weapon.rpg.fire and combat.rpg-direct/splash. Ram hits use combat.hit.
The Pit selector survives view refresh; warningless waves render no stale
roadside warning posts. Released marker matrices and counts stay unchanged.

## Checks

Crew's isolated registry/launcher prerequisite 2f02bff2 was inspected and
picked as 74e62833: four wiring files only, no unfinished Crew runtime.
The authored suite covers native admission, five waves, pay/hold, loss,
wrench, geometry, actual buggy fire/ram, hostile RPG flight and no return.
Additive controls cover view purity, disposal and wear near outer cover.
Current native result: 35 cases, 797 checks, all pass.
Four primary review defects had additive red controls before fixes:
Native movement retains fixed time and consumes stopped ticks; crew stats match
normal exit for all eight crews, including Wren's existing sprint perk after
an additive red control; the reserve buggy stays hidden until
placement (wrecks stay visible); enemy RPG hits retain enemy attribution.

Director approved these fixture corrections; no threshold was weakened:
the buggy has 112.746282 armor and the unchanged per-hit cap is 80. Its wreck
setup now makes at most four real hits, rather than assuming one uncapped
hit. No armor or damage cap was reduced. The final wreck assertion is exact.
The 9.9/10.1-metre wear fixture now measures actual outer cover; its rate,
range, checks and tolerance are exact. An additive native case first failed
at zero wear outside the centre, then passed after the cover fix. The RPG
case retains its four-second flight bound and damage/range assertions, and
now waits for a source=rpg impact so passive wear cannot supply its proof.
The isolated buggy-ram witness downs its raiders through damageRaider, so
cover wear cannot end the event before the unchanged 30-second ram bound.

Released arena event, settlement, UI, Fuel and on-foot transition suites
pass 103 cases unchanged, including their existing repeatability checks.
Wrench/transition/UI checks also pass 19 cases unchanged. Diff check passes.
Earlier module probes passed 300 repeatable clear spawn
plans across both venues; no world signature changed.

No lane/build, browser or merge-ready pass is claimed yet. Real saves,
dependencies and unfinished peer runtime were not touched. Reviewed pay,
entry and settlement files remain unchanged from a8ffe6aa.

## Removed

Removed the obsolete source-not-started note and folded the current contract
into this handoff. No code or assets replaced; no assertion weakened.
