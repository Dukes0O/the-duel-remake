# OPEN-SITES

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## What to build

Sections 16 and 17.

1. **The sites table and its rule.** Each site lists two or three possible positions; the land's seed (kept by
   OPEN-STATE; today the save's own seed) picks one by a named draw. Claude gives the positions in "Claude answers"; a check proves each is flat, clear of solids and can be
   reached by the way-finder.
2. **Finding.** A site is found when the car or the player on foot is within its `foundWithin` and `sees` it. Once:
   `rememberWorldFound`, the `find` and `met` effects, one line at the top of the screen, and the cue.
3. **The maps.** `landMarks` takes found sites as extra places, so both maps draw a found site as a place is drawn. A
   rumour draws a circle 600 m across with "said to be near here". A burned site keeps its mark with "(burned)". The big
   map draws ground the car has driven over in full and ground never driven paler, with its hills still showing (Kyle,
   21 November 2026: yes). The land is kept as squares 500 m across, one bit each, in the open record; a square is
   driven once the car has been inside it.
4. **Two camps built:** the Glasshouse (windscreen frames over bean rows, a wind pump, a store tent, a water cart)
   and Radio Hill (a mast, a hut, a generator). Use things in the Scablands' and the town's sets; new things are drawn
   in code. Each has its tell (thin smoke at dusk; the mast, and a voice on the radio within 800 m), residents with
   routines, and a talk table. Claude judges the look in the batch drive.
5. **Needs.** On each visit after a banked night a camp may have one need, by a named draw from its list. A thing to
   mend: walk to it, hold the wrench on it for its seconds, pay its scrap; it gives a favour and a mark. A thing to
   fetch: a promise with its night, kept by bringing the thing.
6. **Goodwill,** exactly as the table in section 17: the first mend makes Strangers Friendly; later mends give a
   favour; a promise kept makes Friendly Sworn; a promise broken and an attack on their people lower the word. A
   camp's people walk out to meet a Friendly driver and watch a Wary one from the fence.
7. **Favours spent:** a tow home, and a car that rides out to a fight within 1.5 km of the camp.

## Files and locks

New: `src/world/open/content/sites.js`, `src/world/open/content/needs.js`, `src/world/open/site-rule.js`,
`src/world/open/goodwill-rule.js`, `src/world/open/site-view.js`, `tools/test-open-sites.mjs`,
`tools/scenarios/open-find-camp.mjs`. Rows in the people and talk tables. Named hooks: extra places in `landMarks`
(`src/world/scablands-picture.js`) and the rumour circle in `src/world/scablands-map.js`; the sites' solids in
`src/world/scablands-solids.js`. No lock.

## Checks

1. `tools/test-open-sites.mjs`: one seed always gives the same positions and two seeds differ; every possible
   position is flat, clear and reachable; a site is found only within its distance and in sight, and not through a
   hill; the found list never shrinks; the maps mark found sites and no others; a square is drawn in full only after the car has been in it; the goodwill
   table of section 17, row by row.
2. `tools/test-scablands-map.mjs` and `tools/test-scablands-solid.mjs`, brought up to date.
3. Laptop only: the browser scenario `open-find-camp` (drive to the Glasshouse's position for a fixed seed, see it
   join the map, mend the pump, read "Friendly" on the page What people remember).

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition`
with a `--filter` for each suite named above, and `npm run build`. It merges when that is green. Claude drives it in
the merged batch.

## Sound cues

`open.site.found`: a place joining the map. `open.need.mended`: a seized pump turning again. `open.rumour`: a pencil
circle drawn on paper. `open.radio.voice`: a voice through static, for Radio Hill's tell.

## Claude answers

Written 21 November 2026. Every position below was checked against the land the same day: flat (no more than 2 m of
fall across 56 m), clear of solids, at least 600 m from a road, 1,500 m from Tin Town and 800 m from every neighbour's
outpost, inside the land's edge, and reached from the nearest road over ground a car can grip.

**Where the sites stand.** The land's seed picks one position for each camp. The Rats' Nest has one position, because
OPEN-BURNED-SCOUT cuts its ground.

| Site | Possible positions | Notes |
| --- | --- | --- |
| The Glasshouse | `land.at('ships-in-sand', 2000, 700)` on the salt pan north-east of the ships; `land.at('dead-mall', -1500, -2150)` among the hills south of the Burn Road, seen from fewer than one in ten of the road points within three kilometres; `land.at('tin-town', -200, 1900)` on the flats south of Tin Town | `foundWithin` 160 m. Its tell is thin smoke at dusk, drawn from 1,500 m |
| Radio Hill | `land.at('tin-town', -2245, -992)`, the top of the mesa north-west of Tin Town; `land.at('tin-town', -1400, 1100)`, the top of the mesa south-west of Tin Town; `land.at('ridge', -750, -550)`, the top of the foothill north-west of the Ridge | Each mesa is climbed by its own ramp. `foundWithin` 120 m. Its tell is the mast, drawn from 1,400 m, and the voice within 800 m |
| The Rats' Nest | `land.at('boneyard', -150, -900)`, in the wreck fields north of the Boneyard | Not built by this card. Its row is added now with its stage `den`, so that the thread can cast it |

The other sites of section 16 get their positions when their threads are written.

**Words that depend on where a site stands.** A line may hold `{camp.bearing}`, which is one of the eight compass
words worked out from the speaker's place to the site's.

### The Glasshouse

Nine growers. **Marigold** leads them, and is kinder to her bean plants than to people. **Finch**, her grandson, is
twelve, drives the water cart and thinks ahead. The three growers with figures hoe, carry glass and sit.

**Routines.** By day Marigold walks a track between the bean rows, the wind pump and the store tent, and stops at each
to look things over. Finch takes the water cart from the pump to the far rows and back. The growers hoe at a post
each, and two carry a glass frame between them from the store tent to a row. At dusk everybody wanders within eight
metres of the stove. After dark all sleep in the store tent, and one grower sits by the stove.

**First meeting, when the site is found.** The growers stop work and watch. Marigold walks to the edge of the rows.

> **Marigold:** You can stop right there, where I can see your hands. We've nothing here worth taking, unless you're
> very fond of beans.
>
> **Finch:** Gran, that car isn't one of the buggies. It's too clean, and it only has one person in it.
>
> **Marigold:** I'm Marigold, and that boy is my grandson Finch, who notices everything. We grow beans under old car
> windows, because glass keeps the wind off them. Who are you, and where have you come from?

| You say | The answer | What it does |
| --- | --- | --- |
| "I'm from Tin Town. We have a hearth burning again." | **Marigold:** Tin Town has a fire? Then somebody has done a brave thing, or a foolish one. I'd like to hear which it was, when you've time to sit down. | Nothing changes. The Glasshouse is Strangers |
| "I'm only looking around. I didn't know anyone lived out here." | **Marigold:** Nobody is meant to know, and that's how we've kept our glass in one piece. I'd thank you not to tell the whole road about us. | Nothing changes. Both answers leave the Glasshouse at Strangers |

If the car is grey with ash, Marigold's first line is this one instead, and the Glasshouse begins at Wary.

> **Marigold:** That's Ash ground all over your car. You can turn round and go back to Old Smoke, and you can tell him
> that we haven't any fire here for him to put out.

**Marigold's greetings, by the growers' word.**

| Word | The line |
| --- | --- |
| Sworn | **Marigold:** Here's our driver! Finch, put the kettle on the stove, and bring out the good beans, not the ones we sell. |
| Friendly | **Marigold:** It's good to see you again. The beans have come on well since you were last here, and I've told them that it's partly your doing. |
| Strangers | **Marigold:** You've come back, then. Most people who find us by accident don't manage to find us twice. |
| Wary | **Marigold:** I'd sooner you said what you want and went on your way. We've work to do, and I haven't made up my mind about you. |
| Cold | **Marigold:** You aren't welcome here, and you know the reason. Please go, before I have to ask Finch to fetch the others. |

**Finch, when spoken to.**

| When | The line |
| --- | --- |
| Strangers | **Finch:** Does your car go fast? I only drive the water cart, and it goes at the speed of the goat that pulls it. |
| Friendly or Sworn | **Finch:** I've been watching the road for your dust. You always come from the same side, so I think I know where Tin Town is now. |
| The wind pump was mended | **Finch:** I oil the pump every morning now, the way you showed me. It hasn't stuck once since you were here. |
| Friendly, once | **Finch:** At night there's a red light a long way off, high up, and it blinks. Gran says it's a star, but stars don't blink like that. I think it's on a hill to the {radio-hill.bearing}. *(A rumour: the circle for Radio Hill.)* |

**The needs.** One may be asked on each visit after a banked night, by a named draw among those not yet done.

| Need | Kind | Marigold asks | Doing it | When it is done |
| --- | --- | --- | --- | --- |
| `glasshouse/pump` | Mend | **Marigold:** The wind pump has seized, and without it we carry every drop of water by hand. I don't suppose you know anything about pumps? | The wrench on the pump head for 12 seconds, and 8 scrap for a bearing | **Marigold:** Listen to that. It's turning as sweetly as the day we put it up. I shan't forget this, and neither will the beans. |
| `glasshouse/cart-axle` | Mend | **Marigold:** The water cart's axle has cracked, and Finch has been dragging it along on one wheel. Could you look at it for us? | The wrench on the axle for 10 seconds, and 6 scrap for a clamp | **Finch:** It rolls straight now! I'd got so used to it pulling to the left that I nearly fell over. |
| `glasshouse/frames` | Mend | **Marigold:** The wind got under three of the glass frames last night and split them. If they aren't wired up before dark, the cold will have the young plants. | The wrench on each of three frames for 4 seconds, and 4 scrap for wire | **Marigold:** That's the frames safe, and the little ones under them. You've a good pair of hands for a driver. |
| `glasshouse/seed` | Fetch | **Marigold:** We've nearly finished our seed beans, and Dot at the diner keeps a sack of the old kind. It's a long way, and I'm not asking you to go today. Would you bring us a sack when you're next passing her door? | A promise, due in three nights. Dot gives the sack for 10 scrap, or for nothing if she is Friendly. Bring it in the car | **Marigold:** These are the old seed, the kind my mother grew. You went all that way and you remembered. We don't have a word for what you are to us now, so I'll just say that you're ours. |

- **The promise made:** **You:** I'll bring you a sack of seed beans. You have my word. **Marigold:** Then I'll keep
  a row dug and waiting for them.
- **The promise refused:** **You:** I can't promise that. It's too far out of my way. **Marigold:** That's an honest
  answer, and I'd rather have one of those than a promise that comes to nothing.
- **The promise broken,** on the first visit after its night has passed: **Marigold:** I kept a row dug for your
  seed, and it's still empty. I told the others that you'd come. I shan't be telling them that again.

**Favours spent.**

| When | The line |
| --- | --- |
| Towed home | **Marigold:** We saw your smoke from the rows and brought the goat cart out. I know it isn't dignified, but it will get you home. We'll call it the favour we owed you. |
| A car rides out to a fight near the camp | **Finch:** *(on the radio)* Gran says to hold on, because she's coming in the truck! She also says that she can't drive, so please keep out of her way. |

### Radio Hill

Two sisters in their fifties. **Hetty** wears headphones round her neck, listens to everything and repeats most of it.
**Bern** carries a coil of wire, mends everything and says little.

**Routines.** By day Hetty sits at the set in the hut's doorway, and every few minutes walks out to the edge of the
hilltop to look at a road. Bern walks a track between the generator, the foot of the mast and the hut, with a task at
each. At dusk both sit outside the hut. After dark Hetty is at the set, Bern sleeps, and the red lamp at the top of the
mast blinks.

**The voice, on the car's radio within 800 m, before the site is found.** One of these, by a named draw.

> **Hetty:** *(on the radio, through static)* This is Radio Hill, calling anybody who can hear us. We can see dust on
> the road below us. If that's your dust, flash your lamps twice.
>
> **Hetty:** *(on the radio, through static)* There's weather coming in from the west, and three buggies out on the
> Mall Road. That's all the news there is. Is there anybody out there to hear it?

**First meeting, when the site is found.**

> **Hetty:** Bern, there's somebody here! I told you that somebody was listening. I've been telling you that for
> eleven years.
>
> **Bern:** You have. Hello, driver. Please mind the wires, because they're holding the mast up.
>
> **Hetty:** I'm Hetty and this is my sister Bern. I do the listening and she does the mending. We hear every radio
> between the ships and the wall, and nobody ever answers us. Would you like a cup of something hot?

**Hetty's greetings, by the sisters' word.**

| Word | The line |
| --- | --- |
| Sworn | **Hetty:** There's our driver! I had your engine on the set ten minutes ago. I'd know the sound of it anywhere now. |
| Friendly | **Hetty:** Come in and sit down. I've three days of news saved up for you, and Bern has stopped listening to me. |
| Strangers | **Hetty:** You came back up the hill. Hardly anybody climbs up here twice, because of the wind. |
| Wary | **Hetty:** We heard what happened on the road, driver. We hear everything up here. I'd like you to tell me your side of it. |
| Cold | **Bern:** My sister doesn't want to talk to you, and so I don't either. I'd like you to go back down the hill, please. |

**What Hetty knows.** When the sisters are Friendly or better, she gives one piece of news on each visit after a
banked night: the first row below whose condition is true and which has not been said.

| When | The line | What it does |
| --- | --- | --- |
| The Glasshouse is not found | **Hetty:** There's a camp out to the {glasshouse.bearing} that never uses a radio, but I can hear their wind pump squeaking on a still night. They grow something, I think. | A rumour: the circle for the Glasshouse |
| A feud is at Raiding or worse | **Hetty:** The {enemy.name} have been talking to each other all week, and your town's name keeps coming up. I'd keep to the wide roads if I were you. | A tell: the feud is said aloud |
| A sign is alive that the player has not seen | **Hetty:** Somebody lit something big to the {sign.bearing} this morning. I can't see it from here, but two different drivers have mentioned the smoke. | A rumour: the sign's direction |
| Otherwise | **Hetty:** It's been a slow week on the set. A trader lost a wheel on the Salt Road, and somebody's goat has learnt to answer to its name. That's all of it. | Nothing |

**The needs.**

| Need | Kind | Who asks | Doing it | When it is done |
| --- | --- | --- | --- | --- |
| `radio-hill/generator` | Mend | **Bern:** The generator has been coughing since the dust storm, and I can't hold the housing and turn the bolts at the same time. Could you lend me a pair of hands? | The wrench on the generator for 14 seconds, and 10 scrap for a filter | **Bern:** That's running clean. Thank you. I don't say much, but I do remember things. |
| `radio-hill/guy-wire` | Mend | **Bern:** One of the wires that hold the mast has come loose at the ground. If the wind gets up tonight, the whole mast will lean. | The wrench on the wire's anchor for 8 seconds, and 3 scrap for a shackle | **Hetty:** The mast has stopped humming! I'd got so used to the noise that the quiet gave me a fright. |
| `radio-hill/aerial` | Mend | **Hetty:** The top aerial blew down in the night, and I can only hear half the land without it. Bern won't let me climb the mast any more, because of my knees. | The wrench at the foot of the mast for 10 seconds, and 5 scrap for a bracket | **Hetty:** Listen, that's the ships! I haven't heard the ships in a month. Oh, they're still arguing about the same thing. |
| `radio-hill/copper` | Fetch | **Bern:** I'm nearly out of copper wire, and the only place left with any is the Boneyard, inside the old airliners. It isn't work for today. Would you bring me a coil, when you're next over that way? | A promise, due in four nights. The coil is found on foot inside a wreck at the Boneyard. Bring it in the car | **Bern:** That's good copper, and there's a lot of it. Hetty, put the kettle on. This driver can come up our hill for as long as there's a hill. |

- **The promise made:** **You:** I'll bring you a coil of copper wire. You have my word. **Bern:** Then I'll leave
  the last of mine on the mast, and trust you for the rest.
- **The promise refused:** **You:** I can't promise that. I've too much to do for my own town. **Bern:** That's
  fair. I'd sooner hear it now than wait for a coil that isn't coming.
- **The promise broken:** **Bern:** I left a gap in the wiring for your copper, and the gap is still there. Hetty
  made excuses for you. I've asked her to stop.

**Favours spent.**

| When | The line |
| --- | --- |
| Towed home | **Bern:** We heard your engine stop, and then we didn't hear it start again. I've brought the winch truck. Hetty wanted to come too, but somebody has to mind the set. |
| A warning, when a car comes to fight within 1,500 m of the hill | **Hetty:** *(on the radio)* Driver, there are two engines coming up behind you from the {encounter.bearing}, and they aren't traders. I thought you'd want to know before they arrived. |

The sisters do not ride out to a fight. Their favour is the warning, which shows the encounter's cars on the small map
ten seconds before they would otherwise be seen.

## Rules for every open Scablands card

Design: [docs/story/open-scablands.md](../../story/open-scablands.md), the sections this card names; it wins over this
card where they differ. Everything is behind `story-choices`, and nothing the released game does with that switch off
may change. A rule is a plain function that returns new data and reads no graphics. Every draw is a named draw from the
save's seed (`src/rng.js`, as `namedThrow` in `src/story/ledger.js`). Every position is written with `land.at` or
`land.between` (`src/world/scablands-names.js`). Content is rows in tables: adding a person, a building, a checkpoint, a
site or a thread must need no change to a rule. Every word a player reads is a whole plain sentence with no em dash.
Stay inside the files named here. If another file is needed, write the choice under "Codex decided (Claude to review)"
and carry on, unless it touches saves or a released course; then stop and say so. Before CARD DONE, search `tools/` for
every older suite and scenario that names what this card changes, and run them. Checks use memory-only saves. Do not
clean up anything in Claude's scratchpad. A commit from the lane needs approval: rerun git and ask for it. Write
`docs/changes/OPEN-SITES.md` with a **Removed** line.
