# SCABLANDS-JOB-MAP

Found by Claude on 12 November 2026 in pictures of the battle on the Boneyard road (card FIELD-BATTLE-ASH). Kyle,
11 November: "each of these bosses just runs around in a circle."

Owner: Codex. Design settled by Claude below. Switches: none of its own; it shows wherever a Scablands job runs
(`story-everburn` and `scablands-runs`, both off).

## What is wrong

During a job in the Scablands the screen is still a race screen:

- the map panel draws the venue's oval, which no job follows, with the player as the only mark;
- the panel is headed CIRCUIT / LIVE and ARENA;
- PLACING 01 and KEEP YOUR LINE show, and mean nothing in a job.

A player who reads the map sees a circle while driving a road from the Boneyard to Tin Town.

## Settled design (Claude)

- In a world job the map panel draws **the job's own road** (the current step's path) as the line, fitted to the
  panel with a margin, north up.
- Marks on it: the player; the machine being escorted (Big Bess) when there is one; the hunter (the furnace) when it
  is out; riders of an ambush that has appeared; the place the step ends at, with its name (TIN TOWN).
- The panel's heading reads the job's name and the road's name (GAS RUN / BONEYARD ROAD), not CIRCUIT and ARENA.
- PLACING and KEEP YOUR LINE are hidden in a world job. The clock stays.
- A job with no path (free driving in the yard) keeps the map as it is today.
- The map only reads the job's state. It changes nothing in it.

## Checks (named before code)

1. A test of the map's data for a world job: the line is the step's path; each mark is present exactly when its
   actor is; the end place is named; a job with no path gives today's map.
2. The `run-gas` and `field-battle` browser checks, each with one picture of the map panel, for Claude's look.
3. Lane tier and build.

## Result (built by Codex; reviewed by Claude, 12 November 2026): merged

Change note: `docs/changes/SCABLANDS-JOB-MAP.md`. The panel draws the road with its start and end named (EVERBURN,
TIN TOWN), marks for the player, Big Bess, the furnace and riders, and a legend. The heading is the job's name and
the road's name. PLACING and KEEP YOUR LINE are hidden in a world job.

Claude's review asked for four fixes, all made: no writing to the page on every frame of an ordinary race, the
road's points kept between frames, the player's mark following the player on foot, and larger marks and names.
Claude ran the `field-battle` and `run-gas` browser checks, `test-review-evidence` and the build; Codex ran the map's
test (20), the lane tier and the replay fingerprints (unchanged). No existing assertion changed.

Still odd, left as it is: the old legend's small "YOU" shows under the new legend's "YOU".

## Removed

The race headings and the oval in world jobs.
