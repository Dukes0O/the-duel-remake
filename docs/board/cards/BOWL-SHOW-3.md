# BOWL-SHOW-3

The short board entry controls current state, ownership, dependencies and locks.

Show Night, round 3: Kyle's two enhancements of 20 November 2026, for the round after the first release of nights 1 to
5. Claude designs it here and cuts it into slices. Nothing here is built before BOWL-FINISH has released round 2.

**On hold for a future release (Kyle, 20 November 2026):** "that will be for a future release, I would like Gratian to
first play the nights as they are for a bit. then we'll build that as an upgrade." Every card of this round stays in the
backlog, and nobody starts one, until Gratian has played the released nights for a while and Kyle says to build it
(AGENTS rule 18: anything he asked to try first).

## Kyle's word (20 November 2026)

> The monster truck should be able to pull anything into the crowd, even cars and dead opponents. You'd get huge bonus
> scrap for pulling the dead opponent truck into the stands! Maybe during last one rolling, the other trucks could drive
> into the stands along with you. and you could maybe we put in a gate or some easy mechanic for getting into the stands.

> Then you should also be able to shoot weapons like a missile you can aim with the mouse. hitting the opponent with the
> missile should be relatively smooth and the aim should be like you're looking through a sight and you're trying to get
> the truck in the cross hairs by aiming with the mouse. the missiles should sail through the arena on their way to their
> target. If there's a hit, then we should consider having a cut scene replay of the (or the same example of) the
> missile exploding onto the opponent. Can you make the camera follow the missile for part of the replay, maybe about
> half the distance, then stop so you can watch the missile and the whole scene from a distance.

**How this squares with the secret (Claude's reading).** Earlier the same day Kyle ruled that flying into the stands is a
funny thing to find and never a round's objective (`docs/board/decisions.md`). His new word asks for an easy way in and a
bonus for a truck dragged there. Both hold if the way in is a piece of the arena that a driver can see and try, and the
game never tells the driver to use it: no goal, picker line, lesson, hint or weapon line names the stands, the ramp, the
tow or the bonus before the driver has done it. Once it is done, Big Mo, the crowd, the pop-up and the result card make
a great deal of it. If Kyle wants the bonus announced, that is one line on the night card to add later.

## Design

### 1. The tow hook for every truck

The Scrapasaurus fight's hook and cable (BOWL-REX-2, `src/bowl/bowl-hook.js`) becomes the show truck's own tool in every
Bowl event except the Scrapasaurus, which keeps its own hook on F.

- **G fires the hook** at the nearest thing within 25 m and 60 degrees of the nose that is not driving: a parked car, a
  junk car, a crushed car, a bus, a Bus Pile's top bus, a knocked-out truck. G again lets go. The hook's reach and bite
  are the fight's, so a driver who has learned one has learned both.
- **Not picked: hooking a rival that is still driving.** A live truck on the cable is a tug of war, which is a second fight
  to design and tune. A rival becomes towable the moment it is knocked out.
- **The towed thing follows the truck's path** on 15 m of cable, as a trailer does: a rule over the truck's own track,
  not a new piece of physics. Over a jump it flies after the truck and comes down where the truck came down. It bumps
  walls by the wall rules and never passes through a solid.
- **Weight:** with a car on the cable the truck keeps nine tenths of its top speed, with a bus seven tenths, with a
  knocked-out truck six tenths. Nitro helps as it always does.
- **The cable lets go** if the towed thing is caught behind a solid for more than a second (the cable is drawn tight and
  then snaps), and when the event ends.

### 2. A way into the stands: the crowd ramp

- **One dirt ramp against the stand wall** on the Crush Straight, outside the racing line, built like the floor's other
  dirt ramps and dressed like them, with no sign, arrow, light or line. A truck that reaches its foot at 25 mph or more
  rolls up and over the wall top onto the first terrace; slower, it rolls back down. Claude places it exactly in the look
  card (BOWL-SHOW-3-LOOK) where it can be seen from the floor and does not block a race.
- **The gates stay** as they are, and the leap off the Big Jump stays. The ramp is the easy way; the leap is still there to
  find.

### 3. Into the crowd, and what it pays

- **Delivered:** a towed thing that comes to rest on the terraces (beyond the wall line) has been delivered to the crowd.
  The people round it scatter and come back, as they do for a truck (BOWL-OUT-SIM), and it stays where it lies until the
  event ends.
- **Points,** through the crowd multiplier, once for each thing: a car 150, a bus 300, a knocked-out truck 500.
- **The bonus (Kyle's "huge bonus scrap"):** the first knocked-out rival truck that the driver delivers to the crowd in a
  night pays **300 scrap** into the driver's own wallet, paid as the purse is paid and recorded with it, so that the
  night pays it once however often it is played. 300 is more than Rookie Night's whole purse (250) and half of the
  Scrapasaurus Night's (600). A design number for Claude's review with one independent review (rule 17: pay). In a Turn
  Show it is paid to that driver's own wallet, once a night, as Turn Show purses are.
- **Said only after:** the pop-up "INTO THE CROWD! +500", the crowd's scream and cheer, and Big Mo: "Did that truck just
  drag Rust Rhino into the crowd? Somebody give our driver a bonus!" The result card: "You dragged Rust Rhino into the
  crowd, and Big Mo paid you a bonus of 300 scrap."

### 4. Last Truck Rolling on the terraces

- **The stands become part of the fight.** A truck on the terraces is still in the Bowl. Only the car park is out, and the
  driver's own truck has 15 seconds there, counted on screen, to come back through a gate (as now). This replaces "a truck
  over the wall is out of the Bowl" (BOWL-SHOW-2 section 3). The launcher still throws a truck into the crowd, where it
  can be finished or towed.
- **Rivals follow the driver up.** A rival that is chasing the driver's truck when it goes up the crowd ramp follows it
  up the ramp and fights on the terraces. A rival never goes up first. On Easy only one rival follows at a time; on
  Medium two; on Hard all of them. The terraces' ground rules are the ones the driver's truck already uses.
- **A rival knocked out on the terraces** lies there and pays 200 points. Only a truck towed there pays the scrap bonus,
  because the bonus is for pulling it there, as Kyle said.

### 5. The missile and its sight

A fourth weapon, open in Last Truck Rolling from Night 5 (with the launcher) and on the tour nights. It is chosen on the
weapon card like the others, with the line "Look through the sight with the mouse, put a truck in the cross hairs and
fire." Rivals do not carry missiles this round.

- **The sight.** A right click raises the sight and a second right click lowers it (a click, not a hold, so a laptop's
  touchpad works as well as a mouse; Q does the same). The camera moves in 0.4 seconds to the truck's roof, looking where
  the sight points, with cross hairs in the middle, a ring round them and the range in metres. The mouse turns the sight
  up to 70 degrees either side of the nose, from 5 degrees down to 30 up. The keys still drive, and while the sight is up
  the truck's top speed is half. Lowering it eases the show camera back in 0.4 seconds (the camera never cuts).
- **The lock.** A rival inside the ring (4 degrees) and within 90 m starts a lock: a second ring closes on it in 0.5
  seconds on Easy, 0.8 on Medium and 1.1 on Hard, and holds while the rival stays within 8 degrees. While it closes a
  beep quickens; when it is locked the ring turns red and the tone is steady.
- **Fire** with a left click. One missile is in the tube; the next takes 6 seconds to load (a gauge beside the cross
  hairs).
- **Flight (Kyle's "sail through the arena").** The missile leaves the roof tube, climbs 3 m and flies at 40 m a second
  with a smoke trail, so a shot across the floor takes about two seconds and can be watched all the way. Locked, it
  turns towards the rival at up to 120 degrees a second in a smooth curve, so a locked shot hits unless a solid comes in
  the way (the Spine, a Bus Pile, the Scrapasaurus) or the rival dodges. Unlocked, it flies straight where the cross
  hairs pointed. That is Kyle's "relatively smooth": the lock does the fine aiming once the driver has put the truck in
  the ring.
- **Dodging:** a rival with a locked missile within 20 m swerves on none of its shots on Easy, one in four on Medium and
  one in two on Hard, chosen by the seeded generator.
- **A hit** takes a quarter of full health, throws the truck up 2 m and round a quarter turn, and sets it smoking for 2
  seconds. A miss bursts where it lands: a 3 m blast that pushes any truck in it and damages none (the driver's own truck
  included).
- **Repeatable:** the sight's two angles are inputs, read at the fixed step and recorded as the keys are, so a race with
  missiles replays from its seed and inputs.

### 6. The replay of a hit (Kyle's cut scene)

- **When:** every missile hit that knocks a truck out, and the first missile hit in each event. In a Turn Show as well.
- **What stops:** the event pauses for the replay as it does for the pause screen: the clock and every truck stand still.
  The replay is drawn from a store of the last 6 seconds of what was drawn on screen (positions, poses, the missile, the
  smoke and the blast). The rules are not run again and nothing in the race changes.
- **The camera (Kyle's "follow the missile for part of the replay, maybe about half the distance, then stop"):** it starts
  just behind and above the missile as it leaves the tube and follows it, 4 m behind and 1 m up, for the first half of the
  distance it flew. There it stops, and stays where it stopped, turning only to keep the missile and its target both in the
  picture, so the missile flies away from the camera across the arena and bursts on the truck with the whole scene in
  view. The last 0.6 seconds before the hit play at half speed, then 1 second after the blast at full speed. A replay
  lasts about 3 to 5 seconds. A shot shorter than 0.8 seconds skips the chase and is watched from the side.
- **On screen:** "REPLAY" in a corner, and a thin film bar at the top and bottom. The missile's sound and the blast play
  again, and the crowd roars after.
- **Skip:** any key or click after the first half second. The event comes back with a 0.4 second fade.

## Slices

All behind `titan-bowl`, after BOWL-FINISH. Each Codex card names its model (Kyle, 20 November 2026).

| Card | Owner | What it builds | Section |
| --- | --- | --- | --- |
| BOWL-TOW | Codex (Astra) | the hook for every truck, the towed thing on the cable, the crowd ramp, delivery and its points and bonus, rivals on the terraces in Last Truck Rolling | 1 to 4 |
| BOWL-MISSILE | Codex (Astra) | the missile weapon, the sight and its mouse aim, the lock, the flight and the hit, rivals' dodges | 5 |
| BOWL-REPLAY | Claude | the replay of a hit: the store of drawn frames, the pause, the chase-then-hold camera, slow motion, skip | 6 |
| BOWL-SHOW-3-LOOK | Claude | the crowd ramp placed and dressed, the towed things in the crowd, the roof tube, sight, missile, trail and blast drawn, and every new cue chosen and listened to | all |

BOWL-TOW changes pay and the save (the bonus), and BOWL-MISSILE changes `src/app.js` (the mouse), a shared file, so
neither is a rule 23 small-set card: each runs the lane tier and its reviews before the merge.

## Sound cues

Named on each slice. Tow: `bowl.tow.fire`, `bowl.tow.bite`, `bowl.tow.drag`, `bowl.tow.snap`, `bowl.tow.letgo`,
`bowl.crowd.delivered`, `bowl.tow.bonus`. Missile: `bowl.missile.sight`, `bowl.missile.seek`, `bowl.missile.lock`,
`bowl.missile.fire`, `bowl.missile.fly`, `bowl.missile.hit`, `bowl.missile.miss`, `bowl.missile.loaded`. Replay:
`bowl.replay.start`, `bowl.replay.end`.

## Done when

Claude has played Last Truck Rolling by hand on Easy and Hard with the missile and the hook, dragged a knocked-out truck
up the ramp and been paid once, watched a replay of a hit from the sight, and Kyle has tried it.
