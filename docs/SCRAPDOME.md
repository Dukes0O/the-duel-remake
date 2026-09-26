# The Scrapdome and the warlords

Play design and architecture for arena events and warlord fights. Written
25 September 2026 at Kyle's request: Claude sets the design and builds the
foundation; Codex (Sol) builds the rest from the cards at the end. SPEC 3.7
and 3.9 name the modes and warlords; this page decides how they play. Where
this page and an older card disagree, this page wins; log any change in
`docs/board/decisions.md`.

## 1. What makes it fun

The players are Kyle and his son Gratian. Every rule below serves six pillars.

1. **Always in the fight.** A compact bowl, so any car can reach any other in
   under ten seconds. Wrecked cars are back in three and a half seconds. No
   round leaves you driving alone.
2. **Readable chaos.** You can always tell who is coming for you and what they
   are about to do. A car hunting you wears a red marker. Every big attack has
   a tell (a sound and a visible sign) before it lands.
3. **Fair, not flat.** Computer cars obey the same car physics as yours, with
   the same top speed, grip and turning. Difficulty changes their decisions,
   never their physics. They do not gang up on the player; they do not camp
   spawn points.
4. **Every car works.** Light cars win on speed and aim, heavy cars on ramming.
   Armor already scales with mass; keep it that way.
5. **Short and replayable.** Rounds of two and a half minutes. Rematch is one
   button on the results screen.
6. **Learn by losing, win the trick.** A warlord teaches their signature move
   by using it on you. Beat them and that move is yours, working immediately.

## 2. The venue

The Scrapdome sits inside the Rustwall, reached from the Scrapdome yard. It is
an oval junkyard bowl:

- **The floor** is a ring about 36 metres wide around **the Heap**, a
  mountain of crushed cars in the middle. The Heap blocks sight and shots, so
  circling it creates chases and escapes.
- **Walls** of stacked hulks on the outside and the Heap's edge on the inside
  are solid. There is no out-of-bounds reset; you cannot leave the floor. A
  glancing touch slides you along the wall; a steep hit stops you; only a hit
  faster than 30 mph into the wall costs armor.
- **The floor is packed dirt and scrap, with a speed limit.** Top speeds (116
  to 298 mph) are squeezed toward 70 mph, keeping their order: the Titan
  about 58, the rally car 68, the fastest supercar 80. At that speed every car
  can turn round inside the floor, so the bowl plays as fights, not laps.
  Without it, cars circled at 100 mph, 70 metres apart, and slammed the walls.
- **Three jump ramps** across the ring give air and escape lines.
- **Junk cars** scattered on the floor are breakable cover.
- **Eight spawn slots** around the ring, alternating inner and outer lanes,
  facing along the ring.

Size: the centreline is 480 metres around, so the bowl is roughly 220 by 150
metres. Two cars on opposite sides closing on each other meet in about five
seconds. The venue is not a menu circuit: it never appears in the main menu's
circuit list.

## 3. Last Car Rolling

The first mode. Up to four cars: you and one to three computer cars, every car
for itself.

- **Clock:** 2:30. A countdown of three seconds starts it.
- **Points:** +1 for each wreck you cause. Your line reads "WRECKS 3 ·
  WRECKED 1". Ranking is wrecks caused minus times wrecked, then wrecks caused,
  then damage dealt.
- **Credit:** the last car to damage a victim within five seconds gets the
  wreck, even if the wall finished the job. Wrecks nobody caused (your own
  bomb, a wall with no recent hit) count against the victim and give nobody a
  point.
- **Respawn:** a wrecked car sits for 3.5 seconds (the existing wreck time),
  then returns with full armor at the free spawn slot farthest from its
  enemies, facing along the ring. It is protected for two seconds: it cannot
  take damage and cannot deal it, so nobody can spawn and shoot.
- **Tie at the top when the clock runs out:** sudden death, "NEXT WRECK
  WINS", for up to 30 seconds; then most damage dealt wins.
- **Pickups:** weapon crates on the three ramp tops (commit to the jump
  line) and repair crates at two spots on the inner floor by the Heap, where
  fights are closest. A crate comes back 12 seconds after it is taken; any car
  collects from any direction. Easy computer cars leave crates alone.
- **Armor** in the arena is half of race armor: every wreck is a point and a
  car is back in four seconds, so wrecks should come every half minute or so.
- **Result:** placing, wrecks, wrecked, damage, and scrap (section 6).

## 4. Computer drivers

Each computer car has a **pilot** (how it drives) and a **brain** (what it
wants).

**Pilot.** Drives in open space with the same limits as the player's car: top
speed and acceleration from its car and upgrades, turning from the same
steering curve and grip, and the floor speed limit. It:

- steers straight at close goals and follows the ring round the Heap to far
  ones;
- probes its line at two distances and, near a wall, turns along it and away
  from it, slowing to make the turn;
- commits to U-turns: it picks the side with more room once and keeps turning
  until it faces its goal, braking near walls instead of giving up;
- steers round junk cars (only the Titan can crush them) and backs out at once
  when pinned nose-first against one;
- reverses out only when it wants to move but has not covered 1.5 metres in a
  second, then has a grace period so reversing never counts as being stuck.

**Jousting.** A shove at walking pace does no damage, and two rammers pushing
nose to nose once froze a round for 30 seconds. A rammer that stalls against
its target backs out, retreats about 30 metres and charges again from speed.
A badly damaged car (Medium and Hard) breaks off for a nearby repair crate,
which gives the player a window.

**Brain.** Three built-in styles, one per computer car so a field has variety:

| Style | Wants | Signs |
| --- | --- | --- |
| Rammer | Close the gap and hit hard; boosts into charges | Headlights flash before a charge |
| Gunner | Hold 25 to 45 metres, circle, fire; breaks away when rammed | Keeps distance |
| Brawler | Mixes both; switches when armor drops below half | Varies |

**Choosing a target** (every 1.5 seconds, with a preference to keep the current
one so cars do not flicker between targets):

- A target far round the ring is met head-on by going the other way when
  that is quicker than chasing it from behind (cars of equal speed never catch
  each other from behind).
- Closer cars score higher; a car that just damaged me scores higher
  (revenge); the current leader scores a little higher.
- **Hunter cap:** at most one computer car may hunt the player on Easy, two on
  Medium, three on Hard. The others fight each other. This is the rule that
  keeps a free-for-all from turning into three against one.
- Never target a protected (just respawned) car.

**Difficulty** changes reaction time, pace and aggression, never physics:

| | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Reaction | 0.6 s | 0.35 s | 0.2 s |
| Pace (share of car top speed) | 0.85 | 0.95 | 1.0 |
| Boost | no | charges only | yes |
| Tell before a big attack | 1.2 s | 0.8 s | 0.5 s |
| Hunters on the player | 1 | 2 | 3 |

Weapon use keeps the existing difficulty timing (`CPU_COMBAT`), aimed at the
brain's current target instead of always at the player.

## 5. Warlords

A warlord fight is a one-on-one duel in the Scrapdome. **First to three
wrecks wins.** The warlord has one and a half times normal armor and a second
phase after their first wreck: the same moves, faster, plus one extra. There
is a four-minute limit, then sudden death. Losing costs nothing but time.
Each win gives a story card, scrap, and the warlord's signature move as a
working item.

Every signature move follows one rule: **tell, then attack, then a window.**
The tell gives time to react; the window after the attack is the moment to
hit back.

### 1. Sawtooth Sal: Banshee Muscle with side saws

- **Style:** rammer.
- **Signature, Saw Sweep:** pulls alongside and swerves into your flank; the
  saws deal heavy side damage.
- **Tell:** saws spin up with sparks and a rising scream (1.2 s on Easy).
- **Counter:** brake hard or boost clear as the saws spin; Sal overshoots and
  shows her rear for two seconds.
- **Phase two:** "Charge", a straight boosted run across the ring, often off a
  ramp. Tell: engine roar and headlight flash.
- **Reward: Side Saws.** Your side contacts deal saw damage; equipped in the
  yard's armory like a kit.

### 2. The Dustmonger: Dusthawk Rally

- **Style:** gunner and trickster.
- **Signature, Dust Veil:** drops a smoke cloud that hides him and blocks
  crossbow aim through it, and leaves an oil patch behind on straight runs.
- **Tell:** brown puffs from the exhaust before each cloud.
- **Counter:** go around the cloud, not through his line; the oil only lies
  where he drove straight.
- **Phase two:** a dust storm lowers visibility across the bowl; his clouds
  come faster.
- **Reward: Smoke Screen** (the ARS-01 weapon, delivered early and working).

### 3. Mother Mirage: Aurora GTR

- **Style:** evasive gunner.
- **Signature, Mirage:** splits into three matching cars. Only the real one
  fires; a decoy bursts into scrap on its first hit.
- **Tell:** a heat shimmer before the split; afterwards the real car alone
  leaves tire marks.
- **Counter:** watch who fires and whose tires mark the floor.
- **Phase two:** decoys come back faster, and decoys ram.
- **Reward: Decoy Drone.** One decoy of your car that draws computer fire for
  five seconds.

### 4 to 8

Gearhead Gunn, Kettle Kingpin, The Twin Vultures, The Tollkeeper and Baron
Blackiron follow the same rules (SPEC 3.9 table): one signature move with a
tell, a counter and a window; a phase two; a working reward. Design each in
writing, in this format, before code.

## 6. Where it lives and what it pays

- **Entry:** only from the Scrapdome yard (a SCRAPDOME panel: mode, number of
  computer cars, the player's usual difficulty) and, for warlords, from the
  territory map. Never from the main menu. Everything is behind the
  `scrapdome` switch until Kyle approves a release.
- **Pay:** scrap by placing, using the CAR-01 contracts; Scrapdome events grow
  the Scrapdome territory's hold. Settle once per event, like races.
- **Results screen:** placing, the scoreboard, REMATCH and BACK TO THE YARD.

## 7. Architecture

The simulation stays deterministic, headless and independent of the renderer
(AGENTS.md). Arena events reuse the combat stack instead of forking it.

### Key decisions

1. **Positions stay track-relative.** Every system (weapons, contacts,
   rendering, HUD) describes a car by distance along a centreline, sideways
   offset and heading. The venue is a ring around the Heap, so the same
   coordinates cover the whole floor, provided the floor is narrower than the
   centreline's tightest bend radius. `src/arena/venues.js` checks this.
2. **Venues are not courses.** `ARENA_VENUES` lives beside, not inside,
   `COURSE`, so no venue reaches the circuit picker. `Course` accepts a venue
   definition; the arena flag reuses stadium rendering. `titan-arena` and
   every ordinary course are unchanged.
3. **One event object.** `state.arena` holds the whole event. Its presence
   selects arena rules: no laps, finish line, traffic, police or raiders.
   `state.mode` is `'wasteland'`, so combat, armor and weapons run as in Mad
   Max Duel. The HUD, results and app read `state.arena`; nothing else changes
   behaviour for ordinary races.
4. **Teams.** `src/combat-teams.js` answers "whose side is this car on?".
   Outside an arena the answer is exactly today's: the player against the
   computer cars. In Last Car Rolling every car is its own team; in a warlord
   fight the warlord and any escorts share a team. Weapons, projectile hits,
   ram damage, wreck credit and computer targeting all ask this module.
5. **Pilot and brain are separate.** `src/arena/arena-pilot.js` turns a goal
   (a point to reach, a speed, boost or not) into motion within the car's
   limits. Brains (`src/arena/arena-brains.js`) choose goals and targets. A
   warlord is a brain plus a car plus a signature move.

### Files

| File | Holds |
| --- | --- |
| `src/arena/venues.js` | `SCRAPDOME_VENUE` and its layout numbers, `arenaFloorSpeed`, spawn slots, the curvature check |
| `src/arena/arena-event.js` | Event creation, the step, wreck credit, respawn, ranking, sudden death, results |
| `src/arena/arena-floor.js` | Wall containment and wall damage, `worldPose` |
| `src/arena/arena-pilot.js` | The pilot, car stats with upgrades, ring distance |
| `src/arena/arena-brains.js` | Difficulty table, target choice with the hunter cap, styles, head-on interception |
| `src/combat-teams.js` | Teams, owners, strike candidates, protection and damage notes |
| `src/game.js` | `startArenaEvent`, `_loadArena`, the step branch; `_resetStageDriving` shared with races |
| `tools/test-arena-event.mjs` | The invariants below plus the driving guard rails |
| `tools/scenarios/scrapdome.mjs` | Private browser check that a fight draws and plays at High and Performance |

Every tuning number lives in a frozen table at the top of its file (`PILOT`,
`BRAIN_DIFFICULTY`, `TARGETING`, `STYLES`, `ARENA_RULES`, `ARENA_MODES`,
`FLOOR_RULES`, `SCRAPDOME_LAYOUT`). Balance by changing those, not the logic.

### State contract (`state.arena`, version 1)

```
{
  version: 1, venueId: 'scrapdome', mode: 'last-car-rolling',
  phase: 'countdown' | 'fight' | 'sudden-death' | 'over',
  clockSec, timeLimitSec, suddenDeathSec,
  participants: [{
    id: 'player' | 'cpu-1' | 'cpu-2' | 'cpu-3', team, kind: 'player' | 'cpu',
    brain: 'rammer' | 'gunner' | 'brawler' | <warlord id>,
    wrecks, wrecked, damageDealt, lastHitBy, lastHitAt,
    protectedSec, targetId, targetHeldSec, reactionSec,
  }],
  spawnSlots: [{s, lateral, headingError}],
  result: null | {placings: [participant ids], winnerId, reason},
}
```

Computer actors stay in `state.opponents` and carry `arenaId`. The player is
`state` with id `'player'`.

### Events emitted

`arenaPhase {phase}`, `arenaWreck {victimId, creditedId}`, `arenaRespawn {id}`,
`arenaResult {result}`. The app settles scrap once on `arenaResult`.

### Entry point

`duel.startArenaEvent({venueId, mode, car, driverId, upgrades, cpuDifficulty,
opponents: [{car, brain}], seed, playerId, weaponLevels, weaponLoadout,
combatArmorKit, crewId})`. It returns false unless the `scrapdome` switch is
on, `wasteland2` applies to this player, and the request is valid.

### Invariants the tests guard

- Ordinary races, Mad Max Duel, time trials and every replay fingerprint are
  unchanged with the switch on or off.
- Same seed and inputs give the same arena positions, hits, wrecks and result.
- No car leaves the floor; no spawn overlaps a car or wall.
- A protected car neither takes nor deals damage.
- The hunter cap holds at every step.

## 8. Where the foundation stands (26 September 2026)

Built and tested on `lane/arch/scrapdome`: everything marked Claude below.
Measured over full rounds with three computer cars and a simple scripted
player (six rounds, three difficulties):

After ARENA-02 part 1 (crates, jousting, junk avoidance, half armor),
`node tools/arena-balance.mjs` (36 rounds per difficulty: four seeds, three
player cars, one to three computer cars) reports:

| Measure | Easy | Medium | Hard | Target |
| --- | --- | --- | --- | --- |
| Wrecks per round, three computer cars | 14.5 | 12.5 | 16.1 | 10 to 14 on Medium |
| Scripted player wins | 18 of 36 | 2 of 36 | 2 of 36 | see note |
| Computer cars within 40 m of their target | 53 % | 50 % | 46 % | at least 45 % |
| Hard wall hits by computer cars per round | 1.1 | 1.6 | 1.8 | at most 3 |
| Computer cars reversing | 6.6 % | 8.1 % | 8.7 % | at most 10 % |

Note: the scripted player only chases and fires a crossbow every four
seconds, so its win rates say little about a real player. A person with
boost, bombs and the shield should win Medium regularly; check that in play
and, if not, ease Medium (reaction, pace or hunters) rather than Easy.

Known gaps, all for Codex:

- **HUD:** the race display still shows lap, position and distance to the next
  opponent, and a "GRAVEL TRACK" message from `src/screen-hud.js`. Replace it
  with the arena display in ARENA-01-UI.
- **UFO jump** is built around laps and checkpoints; in the arena it reports
  "charges at first gate". Decide its arena rule (for example once per 30
  seconds, landing anywhere on the floor) in ARENA-01-UI.
- **The Heap** has walls but no model yet; the infield is flat ground. Art per
  SPEC 0.11 (existing assets first).
- **App entry:** there is no `app.startArenaEvent` yet. The app must pass only
  an unlocked player's car, upgrades, loadout, kit and crew, and must not run
  race settlement for arena events (`state.arena` set). ARENA-01-UI.
- **On foot** is disabled in arena events (`canLeaveCar`); Ambush Alley will
  need it.

## 9. Handoff cards for Codex

The foundation branch builds the parts marked **Claude**. Codex takes the rest
in order. Each card settles its open detail in writing before code, writes
tests first, and keeps everything behind the `scrapdome` switch.

| Card | Owner | Scope |
| --- | --- | --- |
| ARENA-01 | Claude | Venue, event state and lifecycle, spawns, respawn, scoring and credit, teams, pilot, three brains, `startArenaEvent`, `scrapdome` switch, headless tests |
| ARENA-01-UI | Codex | `app.startArenaEvent` for unlocked players only; SCRAPDOME panel in the yard; arena HUD (clock, scoreboard, red "hunting you" marker, respawn countdown) replacing the race display; UFO rule in the arena; results screen with REMATCH and BACK TO THE YARD; extend `tools/scenarios/scrapdome.mjs` to the real yard flow; frame pacing with four cars |
| ARENA-02 | Codex | Last Car Rolling settlement: scrap by placing through CAR-01, territory hold, idempotent settlement and abandonment (Save Guardian); pickups on ramps and the Heap; balance to the targets in section 8 across nine cars, one to three computer cars and three difficulties |
| ARENA-FEEL | Codex | Tells and sounds: rammer headlight flash, charge roar, respawn shimmer, wreck credit callouts ("YOU WRECKED CPU 2"); audio rule from SPEC 0.9 |
| WAR-01 | Codex | Warlord data for all eight and the ladder on the territory map, as SPEC 3.9 and section 5 |
| WAR-02a | Codex | Sawtooth Sal: warlord fight format (first to three, phase two), Saw Sweep with tell and window, Side Saws reward |
| WAR-02b | Codex | The Dustmonger: Dust Veil, oil, dust storm; Smoke Screen reward (build it here, reused by ARS-01) |
| WAR-02c | Codex | Mother Mirage: Mirage decoys; Decoy Drone reward |

Warlord cards may add a brain in `src/arena/arena-brains.js` and a move module
under `src/arena/moves/`; they must not change the pilot's physics limits.
