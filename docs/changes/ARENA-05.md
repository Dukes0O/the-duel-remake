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

The new mode module owns fort health, passive wear, native raider wave
rosters, seeded spawn poses, ten-second gaps and win/loss decisions. It
reuses released createRaidZones records and createFighter. The selected
fighter starts beside the parked car with the existing weapon state.

Scrap cover uses real collision boxes registered only on the event's Course
instance. The Pit car clears its solid centre pile; Salt uses sample 160,
the midpoint of a longest low-curvature run. Both spawn approaches stay
inside native walls, at least 60 metres from the fort. No world recipe or
world signature changed. The view reuses the released salvage-hulk kit at
the actual physical cover poses, with read-only state and explicit disposal.

Native Game entry now initializes armor, foot transition and gear before
placing the fort and fighter. It allocates one real Dusthawk through the
existing arena factory. That actor stays inactive for waves one to three;
later waves place it at the seeded clear pose. Its weapon hold is permanent,
its arena brain rams the fort, and it cannot respawn within a wave. Ram
damage uses the existing armor ram formula and real swept body contact.

The arena ticks waves and normal raider/foot hooks. The new mode cannot
enter without its own dev switch, a discovered career, rank 12 and Pit or
Salt admission. Foot exit/re-entry allows Ambush and released Fuel only;
other arenas remain denied. No substitute participant was added.

Pay uses the existing pure arena settlement and durable owner/retry write.
It validates completed waves, fort health, winner and placings, then applies
the settled wave pay and hold once. Input saves, credits and unknown fields
stay unchanged. HUD/results show fort health, wave count and saved pay.
Yard rendering and router offer the mode at rank 12 with only its two venues.
The real wrench repairs fort cover at 10 health per second for four seconds;
it preserves normal car repair, hit interruption and release controls.
The buggy targets the nearest solid cover rather than an empty gap in the
ring. A real native drive/contact witness fails before that fix and passes.

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
Current native result: 31 cases, 660 checks, all pass.

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
