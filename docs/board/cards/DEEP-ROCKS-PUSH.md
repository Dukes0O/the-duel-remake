# DEEP-ROCKS-PUSH

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/THE_DEEP.md` section 3; this card names the slice, files and acceptance.

## What Kyle found (27 October 2026, night)

"The rocks in the seabed make driving under there impossible, also you get
these weird course resets too. We should either remove the rocks, be able to
push them aside, or just drive through them. I think we could bounce off small
ones and push large ones aside."

Cause: `stopAtDeepRock` in `src/deep/deep-rocks.js` sets the speed to 0 on any
rock contact and moves the car to `course.nearest(...)` of the contact point.
On the open sea floor the nearest point of the course frame can be somewhere
else entirely: that is the reset.

## Claude decides (27 October 2026)

1. **No rock ever stops the car dead or moves it anywhere.** Remove the
   snap to `course.nearest` and the speed-to-zero. A rock contact never
   damages, wrecks, resets or raises a race contact event (THE_DEEP 3: no
   damage underwater).
2. **Small rocks bounce.** Rocks below the size line (the builder sets it
   from the real size spread, about the smaller half; record the number) push
   the car back out along the contact normal, take away the part of the
   car's speed that points into the rock, and keep at least 70% of its
   speed. The car glances off and drives on.
3. **Large rocks get pushed aside.** Larger rocks slide in the direction the
   car pushes them, by the overlap plus a little, while the car loses speed
   in proportion to the rock's size (a big rock: the car keeps about half
   its speed while pushing; never below a slow crawl, so the car can always
   drive on). A pushed rock settles on the sea floor at its new place and
   keeps its height on the floor.
4. **Things that belong to a rock stay with it.** Check what is placed on or
   by rocks (abalone and pearls on the reef rocks, sea life spots, hints, the
   chart's rock cells). Either they move with a pushed rock, or rocks that
   carry them are the bounce kind. The goals must stay findable.
5. Rock positions are part of the run, rebuilt from the zone seed at the
   start of every dive, changed only by the car's own movement, so a dive is
   repeatable from its seed and inputs. Pushed places are not saved.
6. Drawing: the rock instances follow the run's rock positions (update only
   the instances that moved). Kelp stays soft.

## Files and checks

`src/deep/deep-rocks.js`, the call in `src/deep/deep-journey.js`, the rock
drawing in `src/deep/sea-floor.js` (or the Deep view that owns the rock
instances). Tests: a small-rock glance keeps at least 70% speed and the car
never jumps more than the contact distance; a large rock moves and the car
keeps moving; no contact changes `state.s` by more than the car's own travel;
the same inputs give the same rock positions twice; the Deep suites
(`test-deep-*`), replay and world-signature guards unchanged. Lane tier
(`--jobs 4`) and build. No frame check (no new drawing cost beyond moved
instances).
