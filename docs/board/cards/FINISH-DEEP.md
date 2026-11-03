# FINISH-DEEP

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/THE_DEEP.md`; this card names the slice, files and acceptance.

Claude. THE_DEEP sections 6 and 10. Needs DEEP-LIFE, DEEP-LOG, DEEP-AUDIO
and DEEP-SIRENA-VIEW (and with them DEEP-TRAIL, DEEP-SIRENA, DEEP-RADIO,
SIRENA-ART and SIRENA-CAR).

Play the whole Kelp Coast story on the keyboard as a player, Casual and Pro,
from the first dive to the Coast Cup: the goals are findable without a
guide, nothing feels like a chore, Ana's lines land at the right moments and
the facts read true. Send Kyle the postcard sheet (kelp, a turtle, the
Sirena rising, the Coast Cup card). Drive-through check; the frame check at
the kelp forest with a full school (rule 8). Then Claude decides go live
(rule 18) and tells Kyle in the release note.

- Place title cards (section 4): the first time a player drives into each place, a short title card with its name (`deepPlace`, save field `places`). No card built them; DEEP-SIRENA-VIEW keeps Ana quiet while any title card shows (Claude, 25 October 2026).

## Claude's finishing pass (3 November 2026)

Played the Kelp Coast from the garage tip to the Coast Cup card on a
memory-only save in a 1280 x 720 browser (and 1280 x 600, a laptop browser
with its tool bars): the tip and the dive kit, the BOAT RAMP sign, the ramp,
Dive, the badge, the sonar, all five parts and the Sirena on lift bags, sea
life and a pearl, rocks, Surface (U) and driving back up the ramp, the Lab's
restore rule, then a Pacific Canyon race in the Sirena. Everything works; no
stall. What confused, and the fixes settled before code:

1. **The map "collapsing" (Kyle).** On a browser window about 600 px tall the
   map panel (510 px wide, chart drawn full width) squeezed Ana's list into
   two clipped lines under the chart; at 720 px it covered 40% of the view.
   Fix: the panel is 420 px wide (at most 36% of the window), the chart shrinks
   first on a short window and Ana's list keeps its room.
2. **Nothing said what to do next with the map folded away.** Fix: a "Next:"
   line under the panel's header, always shown while diving: the story's next
   goal (badge, parts, the Sirena, the Coast Cup), then the log, pearls and
   chart. Its hint is not repeated in Ana's list below.
3. **Lost after the door.** From the steering wheel the sonar's nearest echo
   is the door on the Drop-off lip; there the wheel and bonnet are out of
   range and every ping says "No echo". Fix: the parts row names where the
   parts still down there lie ("steering wheel and front wheel in the Kelp
   Forest; bonnet at the forest's edge"). The sonar rule and "No echo" stay.
4. **F gave no sign on screen.** Ana says "press F" once; after that nothing
   showed that F does anything here, and the Sirena's 12-second lift showed no
   progress while the bags were hidden under the car. Fix: beside a part, a
   ring reads "Steering wheel: press F for a lift bag" (or "stop here, then
   press F" while moving); during a lift it fills, bag by bag for the Sirena
   ("The Sirena: lift bag 3 of 4"). Read only (`liftPrompt`).
5. **Surface button over Ana's list.** Once the ramp bearing showed, the
   floating Surface button sat on the list's heading. Fix: bearing and Surface
   share one row.
6. **Facts.** The turtle card claimed the green fat comes from seagrass and the
   kelp crab card's sideways claim is not shown for that crab (26 October
   check). Both cards and the design table now say what is true.

Left as they are: the otter line (recorded voice; "No otters, no kelp forest"
simplifies but is the voice line), Surface skipping the Norseman aside (it
plays when driving up the ramp), Ana repeating the sonar line on each dive's
first ping, and the chart's 100% being a long sweep (last in the next-step
order, never needed for the story). Frame check: the 25 October pass
(16.8 ms at both qualities, kelp forest, full schools) holds; this pass
changes only screen text and panel layout, not the scene.
