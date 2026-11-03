# SKI-FINISH

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/HELI_SKIING.md`; this card names the slice, files and acceptance.

Claude. Needs SKI-VIEW and LAB-SNOW.

Fly a drop and ski every run on the keyboard as a player: carving feels
like leaning, not steering a car; the medal times are fair for an
11-year-old; a tumble never feels like a punishment; the powder bowl is fun
to explore with no clock. Fly the group job and meet the thin air. Send Kyle
pictures of a slalom gate, an aerials jump and the powder bowl with the
yeti. Tune only medal margins, gate spacing and the guide's 92%, with the
reason in the change note. Then Claude decides go live (rule 18).

## From SKI-VIEW's look (Claude, 25 October 2026)

The pickup pad sits where Summit Run is still desert (theme `desert` near
s 800), so the skier is collected on bare sand at 9,469 ft and the aerials
run "from the pickup" starts there. Before `heli-skiing` goes on, move the
pickup pad (SKI-RUNS data) to the first alpine stretch below Devils
Playground so every ski pad stands on snow, and rerun the ski tests and the
ski-view scenario.

## Evidence slice (Kyle, 26 October 2026)

Codex gathers keyboard evidence in `codex/ski-finish`; Claude keeps the final
look and go-live decision. Radio stays on-screen text and the switch stays dev.
Use discrete A/D/S/W/Shift/Space inputs, with a 150 ms reaction interval for
the steady attempt and a shorter interval for the practised comparison.
This is a scripted proxy, not a claim that an 11-year-old has play-tested it.
Keep the current medal margins, gate spacing and guide pace until the measured
runs show a reason to change them. No other gameplay values may change.

Checks: the existing ski physics, runs, heli and view suites; a private,
memory-only keyboard browser recipe for all five runs, drop/group flights,
thin-air text and snowy pickup; then the lane tier (jobs 4) and build.
Pictures cover slalom, aerials, powder/yeti and pickup. No frame timing.

## Claude answers (26 October 2026): tuning for an 11-year-old on the keyboard

From Codex's evidence pass (`docs/changes/SKI-FINISH.md`). The aim: a
steady first try reaches bronze; gold needs practice.

1. **Slalom is too tight** (37 misses steady, 18 practised; no medal).
   Gate width 2 m to 3.5 m, rows 8.2 m apart to 11 m, centres +/-1.1 m to
   +/-1.5 m. Then set bronze/silver/gold from the steady and practised runs
   as for the other timed runs (bronze about 10% over a steady clean run,
   gold just under the practised run). Target: steady keyboard run misses at
   most 3 gates.
2. **Giant slalom:** bronze margin +18% to +25% (65.69 s), as Codex
   suggested; silver and gold unchanged.
3. **Moguls:** find why the weave wanders to the boundary during jumps and
   fix the cause if it is steering or a too-narrow lane (widen the lane 50%
   first). Then medal points 30 / 50 / 70 (from 50 / 65 / 80), so a clean
   straight run with both jumps landed is near bronze and good turns earn
   more.
4. **Aerials:** add "Hold down to tuck on the inrun" to the drop's tips and
   the on-screen line at the start of the inrun.
5. **Thin air:** the `ski.radio.thin-air` event fires but no text shows.
   Show the line on screen (radio lines are on-screen text; voice is held).

Measure each with the same scripted runs, before and after, in the change
note. `heli-skiing` stays dev until Claude's look and frame check.

## Codex measured (26 October 2026): slalom still needs Claude

The requested layout is implemented within the same 450 m run: 38 gates at
11 m spacing, 3.5 m openings and alternating +/-1.5 m centres. The unchanged
150 ms recipe misses 17 gates (formerly 37); the 50 ms recipe passes outside
the finish, then reaches pickup without a scored result. This does not meet
the <=3 misses target. Its openings also overlap the centre by 0.5 m, so
straight skiing passes them all. Evidence and every assertion change are in
`docs/changes/SKI-FINISH.md`.

Claude: keep that corridor and approve a straight beginner comparison, or
require turns and choose another gate layout? Recommend deciding the intended
line before further tuning. No slalom medal calibration is claimed: the
requested steady/practised clean pair does not exist. Guide pace stays 92%.
GS bronze, moguls width/medals, aerials tuck text and thin-air text are wired;
independent code/numbers review and written assertion review remain for
Claude, followed by final look and frame check. The switch stays dev.

**Claude, 26 October 2026, after the tuning pass:** slalom still misses 17
gates on the steady keyboard run, and the practised run missed the finish.
Second change: gates 5 m wide, rows 13 m apart, centres +/-1.2 m, and the next
gate's poles glow so the line is readable. Find and fix why the practised run
misses the finish. Then set the medals from the runs (bronze about 10% over a
steady run with at most 3 misses). If the steady run still misses more than 3
gates, report it and stop: the slalom may need a different control rather
than more tuning.


## Codex second pass: Claude's stop condition

Second layout: 33 gates, 5 m wide, 13 m rows, centres +/-1.2 m; next poles
glow. The former practice crossing was x8.74, outside the +/-6 m finish;
finish now visibly spans +/-10 m. Same driver: steady nine misses, practice
two, both scored finishes. Per Claude's >3 rule, stop further tuning and
medal calibration. Before/after table and assertion changes are in the
change note. The feature stays dev for Claude's next control/design choice.

**Claude, 26 October 2026, after the second slalom change (steady 9 misses,
practised 2):** the stop rule applies, so the slalom gets a different control
rather than more tuning. **Casual line assist:** on Casual only, while a gate
is ahead, the skier's heading eases toward the gap between the next pair of
poles (at most a third of full carve, fading out when the player steers
against it, off in the air and in a tumble). The player still carves and still
chooses speed. Pro has no assist, as with the cars. Then measure steady and
practised runs on Casual (target: steady misses at most 3) and practised on
Pro, and set the medals per difficulty from those runs (bronze about 10% over
the steady clean run, gold just under the practised run). Keep the second
layout and the glowing poles.


## Codex Casual assist implementation (26 October 2026)

Casual slalom heading assist caps at one third of the stance's full carve,
fades against input and is off in air, tumbles, Pro, after the last gate and
on other runs. The selected game difficulty reaches the menu, run and
restart independently of helicopter flight mode. Layout, glow, speed keys,
penalties, guide and save shape stay as before.

Unchanged keyboard proxy: Casual steady 34.43 s, two misses (bronze);
Casual practice 19.74 s, zero misses (silver); Pro practice 30.59 s, two
misses (silver). Gold is 1% below the practised time. Casual bronze is steady
+10%; Pro bronze uses the only requested Pro baseline, practice +10%; silver
is midway. Targets bronze/silver/gold: Casual 37.88/28.71/19.54 s; Pro
33.65/31.97/30.29 s. The Pro bronze convention and every assertion change
are explicit in the change note for Claude's review. Feature stays dev;
no merge out or release is requested by this lane.

## Claude decides (3 November 2026): finding the pads and the fuel

Kyle, 2 November: "I tried to get to drop off skiers at Summit but I couldn't
find the ski pad, it wasn't clearly marked and I ran out of fuel."

What the numbers show: the cruise leg to Summit Run ends 1.5 km outside the
start line, but Devils Playground is 5.4 km further up the mountain, and the
summit pad 8.9 km. A scripted pilot leaving the home pad on a full tank lands
at Summit with 214 kg and runs dry on the climb to Devils Playground. The two
lower pads were not drawn in the flying world at all. One tank cannot do the
trip as built, so a warning alone would not fix it.

The fix, in order of how much it helps a player:

1. **The ski flight ends at the pads.** With a ski drop or the group job in
   hand, the leg to Summit Run ends 400 m short of Devils Playground on the
   line from home, hovering, facing the pad, clear of the ground on the way
   in (the rescue calls already end their Summit leg hovering). The flight to
   the pads is part of the leg's 160 kg.
2. **Each drop pad is marked.** An orange light column (300 m, visible from
   kilometres away against snow and sky) and an orange ring painted on the
   snow, for each pad that starts a run for the flight in hand, while it waits
   for a skier. The pickup pad has the fuel pump (the existing
   `fuel-pump.glb`) and its own ring.
3. **The autopilot and the map point there.** At Summit with a ski flight in
   hand, the autopilot's goal is the nearest marked pad, not the start line.
   The pilot's map draws the marked pads at Summit Run with their names.
4. **Fuel is planned, not found out.** The job card shows the fuel the trip
   needs and what is in the tank. At the home pad with less than the leg plus
   the 80 kg the jobs keep for flying at each end (240 kg from the Woods), its
   next step is "Fill the tank first". The pickup pad's pump sells fuel at the
   home price during a ski flight; after the run, with less than the way home
   needs, the card's next step is to fill up there. The card names the pump on
   the way in so it is never a surprise.

Why a pump and not a refusal: the run ends at the pickup, so the helicopter is
always standing beside the pump when it needs fuel, and buying fuel there is
the same act as at home. Refusing the drop at the home pad would only move the
problem: the way home still needs more than one tank.

Checks: `tools/test-ski-heli.mjs` (a new test: from the home pad on a full
tank, the scripted pilot reaches Devils Playground with fuel to spare, skis,
fills up at the pickup and flies home without the fuel truck), the job card
words in `tools/test-heli-job-clarity.mjs`, the pilot map's ski pads in
`tools/test-pilot-map.mjs`; a browser play from the home pad with a
memory-only save.

## Claude's finishing verdict (3 November 2026): done

Played from the home pad on the private QA page with a memory-only save
(`tools/scenarios/ski-drop-trip.mjs`): the drop taken on the ski box, P and
ENTER, the leg ending 400 m from Devils Playground under its orange light, the
autopilot to the pad, the slalom (gold, every gate clean), Fill up here at the
pickup pump, P and ENTER home, landed with 94 kg. The card said the next step
at every stage. The keyboard play of every run (`ski-finish` scenario) gives
the 26 October numbers again: slalom steady 34.43 s bronze, practised 19.74 s
silver; giant slalom 64.51 s bronze, 48.90 s gold; moguls 78 and 37.6 points;
aerials 0 untucked and 58.2 tucked (the start line says to hold Shift); powder
finds all three stashes; no tumbles; the group hears the thin-air line at the
summit pad. No medal, gate or guide change. Pictures for Kyle:
`docs/board/looks/ski-finish/look-2.jpg`. Released live under rule 18.
