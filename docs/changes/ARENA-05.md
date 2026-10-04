# ARENA-05: Ambush Alley

status: partial mode source; native entry and shared hooks pending

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

The module exposes AMBUSH_RULES, initializeAmbushAlley, ambushSpawnPlan,
stepAmbushAlley, ambushBuggySpawn, ambushBuggyGoal, ambushFortTargets,
damageAmbushFort and ambushRepairTarget. Native entry must initialize combat
armor, foot transition and weapons before initializeAmbushAlley. Waves four
and five cannot complete without a real buggy tagged arenaRole ambush-buggy
and ambushWave equal to the current wave. No substitute vehicle was added.

## Pending shared hooks

- Game/flags/App: independent default-off dev flag, Pit/Salt admission,
  rank 12, mode registration and initializer order; preallocate one real
  buggy/participant and keep it inactive through the first three waves.
- arena-event.js: tick raiders and on-foot rules, call stepAmbushAlley,
  apply ambushBuggySpawn to the real actor with placeActor and existing
  armor, disable its within-wave respawn and finish win/loss results. Fort
  loss returns winnerId raiders, which needs a non-car result path.
- raiders.js: native movement/hostile RPG production against the fort and
  no within-wave fighter return, keyed by each native record's ambushWave.
- onfoot-weapons.js/projectile/contact hooks: actual 40-over-4 fort wrench
  action, rocket hits on ambushFortTargets and native buggy ram damage.
- settlement/HUD/render/audio: once-only wave pay/hold, real cover and
  fighter/buggy presentation. Wave cues use interface.go; wave completion
  uses interface.bonus; fort impacts reuse existing combat impact cues.

Existing onfoot.js already uses arena walls in place of the car tether.
Its authored native movement acceptance still awaits real mode admission.

## Checks

The authored suite remains 25 cases, 33 checks, one pass and 24 failures at
missing native entry, dev flag and App routing. No assertion changed.
node --check passes. Focused module probes use real Duel/venue/armor/fighter
initialization, then select the unregistered mode only at the module boundary.
They pass native raider damage, all five counts, live/missing buggy guards,
real armor wrecks, exact gaps, fort wear/loss and repair contact on both
venues. Thirty seeds per venue give 300 repeatable spawn plans, all clear
and at least 60 metres away. These are controller checks, not full gameplay.

The Director reserved broad gates for the running integration check. No
lane/build, browser, audio, balance, full-tier or merge-ready pass is claimed.
No saves, dependencies, shared files or replay fingerprints were changed.

## Removed

Removed the obsolete source-not-started note and folded the current contract
into this handoff. No code or assets replaced; no assertion weakened.
