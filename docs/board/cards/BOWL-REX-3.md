# BOWL-REX-3

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics: a beam along the floor, and a bomb dragged on the cable). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

Two new attacks for the Scrapasaurus: a beam from its eyes and bombs that the driver can send back. Design:
[BOWL-SHOW-2](BOWL-SHOW-2.md), section 10, "Lasers and bombs". Kyle, 20 November 2026: "maybe scrapasuarus should be able
to shoot lazers or bombs at you." This card starts when BOWL-REX-2 has merged, on the fight as that card leaves it. It
changes nothing that BOWL-REX-2 built: the fire, the sweep, the thrown cars, the tow hook and the three boxes stay.

## The fight after this card

| Boxes out | What it does between tired spells |
| --- | --- |
| none | breathes fire (as built) |
| one | fire that sweeps (as built), and **the eye beam** |
| two | all of that, thrown cars (as built), and **bombs** |

The fire and the beam keep one rule: the floor shows orange where they will burn, before they burn. **The bombs do not
shout.** Kyle, 20 November 2026: "don't mark the bombs on the floor so obviously. something very subtle like the ring can
still be the same size and shape but the colour contrast should be close to the colour of the ground. like really close.
the player will be able to notice it even if the gradient is just a tiny smidge different so it should be really close
in colour." So a bomb's rings are barely darker than the dirt (item 4), and its whistle, its shadow and its tick carry
the timing. The orange is learned on the first two boxes; the bombs come last and ask the driver to look harder.

## What to build

The rules in `src/bowl/bowl-rex.js` and `src/bowl/bowl-hook.js`, from seed and inputs alone, with every place from the
course's own data.

1. **When each attack comes.** An extra attack is made when the beast gets up from a tired spell, before it walks.
   - One box out, every level: the eye beam.
   - Two boxes out, Easy: one extra attack each time it gets up, in the order bomb, eye beam, car, and round again.
   - Two boxes out, Medium and Hard: when it gets up, a bomb or a car in turn, the bomb first. Between its two breaths
     of fire, the eye beam. On Hard the beam fires twice running.
   - Nothing is added while it is tired, and the fire along the cable on the third box is unchanged.
2. **The eye beam.**
   - **The tell:** it stops, drops its head level with the truck's cab, and its two eyes turn red. A thin red line runs
     along the floor from its head through the truck and 60 m on, and the line follows the truck: for 1.8 seconds on
     Easy, 1.4 on Medium, 1.0 on Hard.
   - **The line stops** where the truck then is, turns orange and widens to 3 m: for 0.7 seconds on Easy, 0.5 on Medium,
     0.4 on Hard. It never moves again.
   - **The beam** burns along the orange for 0.5 seconds. A truck whose middle is within 2.5 m of the middle of the line
     at any moment of the burn takes one scorch (one only), exactly as from the fire.
   - **The way out:** drive across the line, not along it. A truck moving across the line when it stops is clear
     before the beam comes; a truck standing still, or running straight at the beast or straight away from it, is hit.
     Being far away does not help, and that is how the beam differs from the fire.
   - **Over the beam:** a truck whose wheels are more than 3 m above the floor is missed. If it was over the orange
     during the burn, `beamOver` is emitted, Big Mo calls it and the crowd meter fills as for a new trick.
   - On Hard's second beam the line follows for 0.6 seconds and stops for 0.4.
3. **A bomb.**
   - **The tell and the throw** are the thrown car's in the rules (the place fixed where the truck is when the tell
     begins, the same tell times, one second in the air, a scorch for a truck within 3.5 m of where it lands). The
     landing ring is the same size and shape as a car's, drawn in the faint tone of item 4. The bomb whistles as it
     falls, and its shadow grows on the floor where it will land. A hatch between its
     shoulders opens in place of the lift from the pen. Bombs are not counted against the cars in its pen.
   - **It lies where it landed and ticks:** for 10 seconds on Easy, 8 on Medium, 6 on Hard. A ring 7 m in radius
     lies on the floor round it from the moment it lands, in the faint tone of item 4, and stays under the bomb when
     the bomb is dragged. The ring does not fill. The tick quickens and the bomb's own lamp blinks faster as the time
     runs out. A bomb that lands on the truck bursts at once (the one scorch).
   - **It bursts** when the time is up: a truck within 7 m takes one scorch. Never more than one bomb is on the floor.
   - **The hook takes it.** With no open box in reach, a bomb within 25 m and within 60 degrees of the truck's nose is
     what the hook flies to, and the marker over the bomb shows the F key whenever a shot would bite (the box's own
     marker, on the bomb). An open box in reach always comes first. The bomb is then dragged on the cable as a box that
     has come out is dragged (BOWL-REX-2, rule 7), and its clock keeps running. F lets it go where it lies.
   - **Sent back:** a bomb on the cable that comes within 6 m of the beast's legs, body or tail bursts there at once.
     The beast staggers and sags on the spot: a tired spell that is **not** counted towards the six (five on Medium and
     Hard) after which it walks out, and the box that opens starts with 1 second of pull already earned. The truck takes
     a scorch from that burst only if it is within 7 m of the bomb, and at the cable's end it is 15 m away.
   - A bomb let go, or one that bursts on the cable away from the beast, harms only a truck within 7 m.
4. **A bomb's two rings are barely there** (the landing ring and the 7 m ring). The number the builder checks:
   - The ring is the floor's own colour made a little darker, not a colour of its own: it is drawn as a darkening of
     whatever floor is under it, so the difference is the same under the flame jets' light as in the dark.
   - In CIE Lab, the ring's lightness (L*) is 4 points below the floor's under it, and never less than 3 or more than 5.
     Its a* and b* are within 1 point of the floor's: no new hue.
   - It gives off no light, has no outline and no brighter or darker rim, and its tone never changes: no filling, no
     pulsing, no flashing, no fading in. It is there or it is not.
   - Its size and shape are the rules' own: 3.5 m in radius where the bomb will land, 7 m round a bomb that lies.
   - The arena plan shows neither a bomb nor its rings.
   - The bomb's shadow is the ordinary shadow of a thing in the air, growing as it comes down. It is not a mark and
     takes none of these limits.
   - The fire's orange, the beam's red line and orange strip, and the thrown car's ring stay as they are.
5. **The first time,** on Easy and Medium, each new attack's tell lasts half as long again, once in a fight.
6. **The goal line** (five words or fewer, as now): "TURN ACROSS THE RED LINE" while the line follows; "HOOK THE BOMB"
   while a shot at a bomb would bite; "DRAG IT INTO ITS LEGS" while a bomb is on the cable. An open box's lines come
   first. No goal line points at a bomb's ring: the driver finds it.
7. **Why a try failed,** once each in a fight: "The beam burns along the red line, so turn across the line and not along
   it." "The bomb came down on you, so watch for its shadow on the floor." "The bomb went off beside you, so move away
   when its tick gets fast." "The bomb went off before it reached the Scrapasaurus, so hook it sooner."
8. **Big Mo,** each a whole sentence, once each in a fight: "Its eyes are lighting up, so do not stand still!" "Now it
   is lobbing bombs across the floor!" "The bomb is on the hook, so take it back where it came from!" "That bomb went
   off right under the Scrapasaurus!" "The truck went clean over the beam!"
9. **Events,** each with its cue: `beamAim`, `beamLock`, `beam`, `beamOver`, `bombTell`, `bombThrow`, `bombLand`,
   `bombBurst {truck, beast}`, `stagger`. State carries the line (where it is, whether it has stopped), the bomb (where
   it is, the share of its time left, whether a shot would bite, whether it is on the cable) for the view and the arena
   plan.
10. **Drawn plainly here:** the red line and the orange strip on the floor, the bomb as a ball with a lamp, its shadow,
    the beam as a bright bar, and the two rings exactly as item 4 says. The rest of the look is BOWL-REX-LOOK's, and
    item 4 binds that card too.

Not in this card: a beam that solid things stop (a truck sheltering behind a wreck), a beam that sweeps, more than one
bomb at once. Each can follow if the hand drive asks for it.

## Files and locks

`src/bowl/bowl-rex.js`, `src/bowl/bowl-hook.js`, `src/bowl/bowl-rex-view.js` (follow the new state; plain shapes only),
`src/bowl/bowl-lines.js` (the goal lines, the reasons, Big Mo's lines and the cue names), `tools/test-bowl-rex.mjs`,
`tools/scenarios/bowl-rex-fight.mjs`. No lock. `src/bowl/bowl-hud.js` and `src/bowl/bowl-screens.js` are not changed:
the card before the fight keeps its three pictures, because the new attacks are learned from the orange on the floor.

## Checks

1. `tools/test-bowl-rex.mjs`, without driving:
   - no beam and no bomb before the first box is out, the beam alone after it, and the orders of item 1 on each level;
   - a truck crossing the line at 20 mph when it stops is not hit, and a truck standing on it is;
   - a truck 50 m away on the line is hit, and a truck 3.5 m above the floor on the line is not and gets `beamOver`;
   - the line does not move after it has stopped;
   - a bomb bursts when its time is up and scorches only a truck within 7 m;
   - the hook takes a bomb only with no open box in reach;
   - a bomb on the cable brought within 6 m of a leg bursts there, the beast sags, the count of tired spells is
     unchanged and the box that opens has 1 second of pull;
   - the goal line is never over five words;
   - **the rings' tone:** for the floor colours of the Bowl's dirt and of its darkest and lightest floor pieces, the
     ring's drawn colour is between 3 and 5 points of L* below the floor's, with a* and b* within 1 point; the ring's
     material gives off no light and has no outline; its tone is the same at every moment from the tell to the burst.
2. The scripted drive stays the one BOWL-REX-2 names. Its child-pace driver now also turns across the line while the
   line follows, moves 8 m or more from a bomb within 3 seconds of its landing, and never hooks a bomb. As everywhere,
   it sees each tell 0.3 seconds late. That driver wins Easy at least 6 times in
   10 and not on all ten. The driver without Space and without a run-up still wins on none. Report both counts and the
   scorches by cause (fire, beam, bomb) in the change note.
3. `tools/scenarios/bowl-rex-fight.mjs` brought up to date so that it still wins. Claude runs it.
4. Every assertion of the suite that changes is listed in the change note for Claude's review (rule 18). The fight's
   replay fingerprint is re-recorded with the reason; every other course's fingerprint is unchanged.

Laptop only, Claude runs: the fight by hand on Easy and on Hard, and a bomb sent back ten times on Easy. One picture
from the driver's seat of each ring in the real game, measured: the mean L* of the ring against the floor beside it is
between 3 and 5 points apart. Claude says on this card whether the ring can be found by a driver who is looking for it
and missed by one who is not, which is what Kyle asked for. If Claude
cannot send one back in five of those ten, the time on the bomb or the 6 m is changed before the look is drawn.

## Sound cues

New, each named on its event: `bowl.rex.eyes.aim` (a rising whine, held while the red line follows; stand-in: name
only), `bowl.rex.eyes.lock` (two sharp beeps as the line stops; stand-in `interface.countdown`), `bowl.rex.beam` (the
beam; stand-in `weapon.tesla.pulse`), `bowl.rex.beam.over` (the crowd as the truck clears it; stand-in `crowd.cheer`),
`bowl.rex.bomb.hatch` (the hatch clanks open and a klaxon sounds; stand-in `raider.warning`), `bowl.rex.bomb.launch` (a
thump from the tube; stand-in `weapon.harpoon.fire`), `bowl.rex.bomb.whistle` (a falling whistle for the second it is in
the air, ending as it lands; it carries the timing now that the ring is faint; stand-in: name only), `bowl.rex.bomb.land` (a heavy clank; stand-in
`heli.setdown.thud`), `bowl.rex.bomb.tick` (a tick that quickens, held while the bomb lies or is dragged; stand-in: name
only), `bowl.rex.bomb.burst` (stand-in `vehicle.crash-impact`), `bowl.rex.stagger` (it is caught by its own bomb;
stand-in `yeti.roar`). Kept: a hit from the beam or a bomb is `bowl.rex.scorch`, and the hook on a bomb is
`bowl.hook.bite`.

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-REX-3.md`
with a Removed line (nothing is removed). Before CARD DONE, search `tools/` for `scrapasaurus`, `rex`, `thrownLand` and
`throwDue` and bring each older suite and scenario that names them up to date. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key. Clean up nothing outside this
lane.

## Kyle, 20 November 2026: after the first release

Kyle chose to ship Show Night's first release (nights 1 to 5) without the eye beam and the bombs, so Gratian plays sooner.
This card no longer holds BOWL-FINISH or BOWL-SOUND; it is built after the release, on the fight as BOWL-REX-2 leaves it, and
goes live in a later release once Claude has driven it.
