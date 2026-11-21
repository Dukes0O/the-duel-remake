# BOWL-FEEL-FIX

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (collisions, put-backs and weapon contact). Kyle, 20 November 2026: graphics and physics go to
Astra, the rest to Sol.

From Kyle's try of the five nights in the Preview (20 November 2026, integration at `bfec511bb`). Kyle: "otherwise this
was huge improvement from the last round!" What he found janky is below, in his words. Before the first release.

**Measure before changing anything** (`memory/measure-before-calling-a-picture-a-fault`): for each item, first record the
truck's place, heading and speed every step through the moment Kyle describes, find the step where it goes wrong and name
the rule that does it, in the change note. The leads below are guesses until then.

## What to fix

1. **The truck snaps to the side after hitting anything.** Kyle: "the vehicle janky resetting to the side after
   colliding with anything", "the mechanics of the truck just bouncing and resetting", in Last Truck Rolling and the
   Scrapasaurus fight. One lead: a slide along a wall lines the truck up with the wall in a single step (the Scrapdome's
   floor does this in `src/arena/arena-floor.js` near line 56; find whether the Bowl's walls or truck contacts do the
   same). The rule after the fix: outside a weapon's throw and a trick, a truck's heading never changes by more than 15
   degrees in one step; a turn the wall or a hit causes is eased over a quarter of a second, and the driver can steer
   through it.
2. **Jumping the Spine at the start of Night 3 puts the truck back half under the ground.** Kyle: "I cannot jump over
   the middle barrier without being reset and coming up from half way below the ground." A truck that clears the Spine
   lands on the other straight and drives on; one that lands on it slides off. If any rule puts a truck back, it puts it
   back with all four wheels on top of the ground, facing along the lap, and says why only if the driver can do
   something about it.
3. **The hammer does not work well while driving.** Kyle: "hammer mechanics didn't really work great while driving and
   the reset was janky." The hammer comes down 0.4 seconds after F, by which time both trucks have moved. It hits what is
   within 4 m of the nose where the swinger's truck is when the hammer lands, not where it was when F was pressed. On
   Easy and Medium a swing leans up to 30 degrees towards a truck within that reach. The miss's half second held still
   must not throw the truck sideways (item 1).
4. **The saw jerks the truck to the side while cutting.** Kyle: "really tough with the truck jerking to the side when
   cutting." While the disc touches a truck, the two trucks are held together at the disc with no sideways shove, both
   slow as designed (BOWL-SHOW-2 section 9), and the driver steers normally. Letting go of F or driving away ends it.
5. **Flipping a truck with the launcher needs a near perfect aim.** Kyle: "had to be nearly perfect to flip someone, I
   only flipped someone once on easy." The launcher's reach becomes 4 m on Easy and Medium and 3 m on Hard (it was 2.5 m
   on every level), and it throws a truck anywhere within 40 degrees either side of the nose. BOWL-SHOW-2 section 9 is
   changed to match.

## Files and locks

The files the measurement names; expected among them `src/bowl/bowl-weapons.js`, `src/bowl/bowl-course.js`,
`src/sim-contacts.js`, `src/bowl/bowl-rivals.js` and their suites (`tools/test-bowl-walls.mjs`,
`tools/test-bowl-weapons.mjs`, `tools/test-bowl-rivals.mjs`). `src/sim-contacts.js` is shared with every other mode: a
change there is held to the Bowl or proved to leave every other mode's replays unchanged. Locks: `bowl-rivals`,
`bowl-floor`.

## Checks

1. For each item, a check that drives the moment Kyle describes and proves the rule after the fix: no step's heading
   change over 15 degrees after a wall or truck contact; a Spine jump on Night 3 lands and drives on, and any put-back has
   its wheels on the ground; a hammer swung while both trucks move at 25 mph hits a truck 3 m off the nose; the saw's cut
   moves neither truck sideways; the launcher throws a truck at 3.8 m and 35 degrees on Easy.
2. The replay and world-signature guards unchanged outside the Bowl.
3. Laptop only, Claude runs: Last Truck Rolling on Nights 3, 4 and 5 by hand, then Kyle's try.

Before CARD DONE, search `tools/` for the launcher's reach and every suite that names a changed rule, and bring each up
to date. A changed assertion needs Claude's written review here (rule 18).

## Sound cues

None new. The weapons' sounds are BOWL-SOUND's.

## How it merges

Behind `titan-bowl`. If `src/sim-contacts.js` or another shared file changes, the lane tier and one independent review
before the merge (rule 23 does not cover released behaviour); otherwise rule 23's small set. Recorded in
`docs/changes/BOWL-FEEL-FIX.md`. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or
key. Clean up nothing outside this lane.
