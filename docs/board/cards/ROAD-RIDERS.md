# ROAD-RIDERS

Kyle, 18 November 2026: "the cars don't fight back", "there is no real crash mechanics at play when I hit the Ash Men's
cars. They kind of bonk out of the way with no crash sound", "it's not clear how you could fail." Riders on the open
land become opponents. Codex's card. Do it after WORLD-FAULTS-18-NOV, whose findings 6, 7 and 8 measure the same code.

## What to build

A **rider** in a world job is today a marker that is driven off by a touch (`src/arena/modes/world-job.js`, the
`ramRetreat` code). It becomes a car that fights, using what the arena's opponents already do
(`src/arena/arena-brains.js`, `src/arena/arena-pilot.js`) and the damage rules the arenas already have.

- **It drives like an arena opponent** on open ground: it closes on its target (the player, or a truck it was sent
  for), rams, circles and comes again. It keeps to ground a car can cross, by the land's own rules.
- **It carries one weapon** from the arsenal, named by the job (the Ash Men: ash sacks that blind for a moment and
  smother fire, and a ram). It uses it as an arena opponent would.
- **Contact is a crash:** the damage, the sound and the shove that two cars have in an arena.
- **It can be wrecked,** by ramming and by every car weapon, each of which must hit a rider as it hits an arena car
  (the crossbow included). A wrecked rider's crew bail out and run. Nobody is seen to die.
- **It gives up:** at a quarter of its health it breaks off and drives home smoking, unless the job says it is one
  that fights to the end.
- **It can wreck the player.** A wrecked player's car ends the fight as lost; the job says what losing costs.
- **Riders can box the player in** (Kyle, 18 November: "there's just too many cars, they've surrounded you, you have
  to give up the ember"). When the riders named for it have the player's car held, front, back and sides, at under
  10 km/h for three seconds, the fight stops and the job is told "surrounded". What happens next is the job's: a
  talk, with handing the cargo down, breaking out, or holding on for a friend. This card gives the holding and the
  signal; five riders or more must be able to do it to a car that drives straight, and a car that keeps moving and
  turning must be able to stay out of it.
- **Three difficulties,** from the game's own Easy, Medium and Hard: how well it aims, how hard it presses, how much
  it takes. On Easy a careful ten-year-old wins a fight of three riders more often than not.
- Every number is one named constant in a new rule file `src/world/jobs/rider-rule.js`.

The riders of jobs 1 to 4 of the remade Everburn keep their old behaviour unless a job asks for the new kind, so
nothing that passes today changes.

## Checks

- New `tools/test-road-riders.mjs`, stepping real Duels without graphics: a rider closes and rams; contact costs both
  cars armour and asks for the crash sound; each car weapon hurts a rider 30 m dead ahead; a rider at a quarter health
  breaks off; three riders can wreck a car that does nothing, on every difficulty; five riders box in a car that
  drives straight and the job hears "surrounded" once; a car that weaves at speed is not boxed in for a minute; the same seed and inputs give the
  same fight.
- One scripted fight (the card's one): a plain driver on Easy beats three riders at the Wash at least 7 times in 10,
  and on Hard fewer than 5.
- Every older suite that names riders, the gas load's raids or the arena brains; the replays must be unchanged.
- For Claude: a fight by hand at the Wash on each difficulty, with sound, before any story uses it.

Sounds: the arenas' own crash, hit and wreck cues. New: `rider.breaks-off` (an engine note falling away), from the bank.
