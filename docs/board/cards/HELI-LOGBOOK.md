# HELI-LOGBOOK

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/HELICOPTER.md` section 14 and 14.1 (Kyle decided,
26 October 2026); 14.1 wins.

Codex. Needs HELI-RETURN-LOADS (a crate job is one of the kinds counted).
Switch: a new switch `heli-logbook` (dev) until Claude's finishing pass.

Build:
1. **Counting.** Flights (a take-off and a landing at a place), jobs by kind
   (car, crate, fire, rescue, ski drop) and places visited, saved in `heli`
   through `normalizeHeli` (unknown keys kept), with an old-save fixture.
2. **Ranks** from the counts, per 14.1's table. A new rank shows once on
   landing at the home pad: the rank name, what it stands for in real life
   (one line), Roger's line as on-screen text, and the new paint.
3. **Gus's four logbooks**: a page in the pad hut (the side panel at home:
   "THE SHELF"), the text below, readable again any time. Each marks its
   place on the pilot's map when `pilot-map` is on.
4. **Paints**: five Kestrel One paints from 14.1, as Blender-recipe texture
   variants of the current model (original art, gritty, not toy-like); at
   most three look rounds, one sheet per round under
   `docs/board/looks/heli-logbook/`. They join the helicopter's paint list.

Gus's pages (final wording; keep it):

- **1964.** "Coast route home, 1.4 hours. Flat-topped mesa off the left side,
  something like a tower on top. Fuel too low to look. Next time."
- **1966.** "Spare parts down the coast for the Falcone team, 2.1 hours, at
  night. Wind came up hard off the cove. Watched the *Marguerite*'s lights,
  then I didn't. Rosa will be heartbroken."
- **1972.** "Summit, above the trees, 0.9 hours. Footprints the size of a snow
  shovel. Nobody at the lodge believes me. Drew one anyway."
- **1981.** "Last entry in this book. Found the *Marguerite*'s last position
  in her captain's log: past the drop-off off the cove, too deep for anyone
  to reach. If you are reading this, Kestrel One, maybe one day you will."

Roger at each rank (on-screen text): Private: "That is your licence, Kestrel
One. Gus would have liked that. There is a book for you on the shelf."
Commercial: "Commercial pilot. The lodge would like you flying for us
properly now. New paint's on her." Mountain: "Mountain rated. You are the
one they call when it goes wrong up high." Chief: "Chief pilot of the lodge
air service. That was Gus's job. His last book is yours."

Acceptance: tests for counting, each rank's rule, old saves, the shelf; a
scripted career reaching each rank; the paint sheet accepted by Claude;
independent save review; lane tier and build. The submarine job is a later
card with The Deep.

## Claude's verdict, paints round 1 (26 October 2026)

Student (white, orange training stripes) and Mountain (rescue red, white
reflective bands) are accepted as they are. Round 2 for the other three:
- **Private, midnight blue:** the silver line must read: a bright silver
  cheat line along the whole cabin and tail boom, about a hand's width.
- **Commercial, forest green and cream:** the cream should be a clear band
  along the cabin side; the kestrel moves from the door (hidden) to the tail
  boom, large enough to read in the near view.
- **Chief, Gus's 1964 cream and signal red:** more red, so it reads cream and
  red at distance: a broad signal-red belly band and a red tail fin; the
  hand-painted kestrel on the tail boom as above.
- **Wear, all five:** light and real (exhaust soot behind the engine, scuffed
  skids), never cartoon, never new-car clean.
The changed assertions (switch count 41, the five paints in the skin roster,
the paint recipe in the generator roster and manual scenarios, logbook
completions in the job scripts) are approved: each adds the new thing and
nothing is loosened.
