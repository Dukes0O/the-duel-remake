# ARENA-05: Ambush Alley

status: native entry and pay source; shared fighter hooks pending

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
world signature changed. Renderer work remains pending.

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
Yard rendering offers the mode at rank 12 with only its two venues.

## Pending shared hooks

- Flags/launcher: Crew owns the registry. Await its isolated default-off dev
  prerequisite; no admission override or unfinished Crew import is used.
- Router: selecting Ambush must select Pit rather than the old ring default;
  its venue handler must accept the eligible Pit choice.
- raiders.js: native movement/hostile RPG production against the fort and
  no within-wave fighter return, keyed by each native record's ambushWave.
- onfoot-weapons.js/projectile/contact hooks: actual 40-over-4 fort wrench
  action, rocket hits on ambushFortTargets and native buggy ram damage.
- Render/audio: real cover and fighter/buggy presentation. Wave cues use
  interface.go; wave completion
  uses interface.bonus; fort impacts reuse existing combat impact cues.

Existing onfoot.js already uses arena walls in place of the car tether.
Its authored native movement acceptance still awaits real mode admission.

## Checks

The authored suite is now 27 cases, 120 checks: three pass and 24 stay red
at missing dev admission. Its original assertions are unchanged. The added
foot eligibility witness failed for Ambush before the source edit, then
passed nine checks. Pure pay/hold, invalid facts, owner and duplicate-pay
checks pass: 87 focused checks total. These do not claim full gameplay.

Released arena event, settlement, UI, Fuel and on-foot transition suites
pass 103 cases unchanged, including their existing repeatability checks.
Diff check passes. Earlier module probes passed 300 repeatable clear spawn
plans across both venues; no world signature changed.

No lane/build, browser, audio, balance, full-tier or merge-ready pass is
claimed. Broad gates wait for the Director's slot. Real saves, dependencies
and protected shared fighter sources were not touched.

## Removed

Removed the obsolete source-not-started note and folded the current contract
into this handoff. No code or assets replaced; no assertion weakened.
