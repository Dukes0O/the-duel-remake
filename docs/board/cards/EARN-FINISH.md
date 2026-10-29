# EARN-FINISH

The short board entry controls current state, ownership, dependencies and locks.
This file holds the checks Claude runs before the earned cars are offered to
Kyle for release. Design: `docs/EARNED_CARS.md`.

```yaml
  - id: EARN-FINISH
    title: "Claude's finishing pass on earned cars and medal sheets"
    owner: claude
    lane: FINISH
    size: S
    needs: [EARN-CAR-1, EARN-CAR-2, EARN-CAR-3]
    flag: earned-cars
    owns: [docs/changes/EARN-FINISH.md]
```

## The pass

1. **Play the ladder** on a memory-only career with the switch on, twice:
   - as a child would: Easy only, starter cars first, a few purchases;
   - as a parent would: Medium and Hard, Duel and Grand Prix.
   Count the races to each car. Targets: car 1 within about 6 to 10 won
   races; car 2 needs a new car or harder rivals; car 3 needs Hard wins. If a
   step feels too slow or too quick, change the medal numbers in the config
   (a tuning change with the lane tier), never the rules.
2. **Look at the screens** at 1280 x 720: the sheet panel, the locked page,
   the results lines, the menu picker. Medal colours read clearly; nothing
   overlaps; the words are plain.
3. **Listen:** the `interface.bonus` cue plays once per results screen.
4. **Fly one in** with the `helicopter` switch on: an earned car waits at
   Tremblant Woods and races only where it was set down.
5. **Send Kyle** one picture of a full medal sheet and the three cars, with a
   short note, and prepare the `earned-cars` switch for beta on his word.

## Acceptance

The four checks recorded in `docs/changes/EARN-FINISH.md` with their numbers;
any tuning change merged with its lane tier; Kyle has the picture.

## Carried from the three car cards (Claude, 24 October)

All three earned cars are merged behind `earned-cars`. Each still owes one
frame check with the laptop to itself: a Panorama Ridge Grand Prix with a
field of that car (Enzo, F1, Bolide), High and Performance. Run them here,
in one quiet window, before the earned-cars release.

## Kyle decided (28 October 2026)

One more round on the three earned cars against reference photos before the earned-cars switch goes on.
