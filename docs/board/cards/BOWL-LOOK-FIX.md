# BOWL-LOOK-FIX

The short board entry controls current state, ownership, dependencies and locks.

Claude's card. Looks owed from the batch drive of the merged game at `57e478340` (20 November 2026; pictures in
`.evidence/2026-11-20/batch-1/` of the integration folder).

## What to draw

1. **The car park is too dark:** parked cars show only within about 20 m. Light it (floodlights on poles, their pools on
   the ground) so the cars and both arches can be seen from the back of the stands.
2. **The crowd does not run.** A cleared patch moves with the truck in the stands, but nobody is seen running. Draw people
   scattering from the truck's path.
3. **Damage is easy to miss on the truck itself:** the smoke at one fifth is thin, and at nothing there are no flames on
   the truck, only burning debris on the floor. Thicker dark smoke, and fire on the truck when it is out.
4. **The saw cannot be seen from the chase view,** because the cab hides it. Show it from behind: a spray of sparks to
   both sides while it spins, and the arm it rides on standing proud of the bonnet.
5. **Old Bess's plate drops in one frame** if she is wrecked in mid throw (left from BOWL-WEAPONS-LOOK).

## Files and locks

`src/bowl/bowl-outside-view.js`, `src/bowl/bowl-weapons-view.js`, `src/bowl/bowl-stadium.js`,
`docs/board/looks/bowl-out/`, `docs/board/looks/bowl-weapons/`. No lock.

## Checks

One before-and-after sheet for each of the two families, from the real game at the driver's seat, with Claude's verdict;
the frame check's busiest view unchanged in cost (measured at BOWL-FINISH).

## Sound cues

None new.

Behind `titan-bowl`. Tested and merged under AGENTS rule 23, recorded in `docs/changes/BOWL-LOOK-FIX.md` with a Removed line.
Memory-only saves. No new dependency, network request or key.
