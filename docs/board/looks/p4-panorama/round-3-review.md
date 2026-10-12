# Panorama Ridge Sunset: round three, Claude's verdict

Round three of three; the cap is reached, so there is no fourth art round.

Judged on the seven High golden views from the 12 October native retry at
0a50336d (Pit Straight grid, Ridge Top, Skyline, Esses 1, Conrod, Murray
Corner, chase). That run stalled on lap 2 at Hell Gate, so the two final-lap
dusk views were never taken and no sheet was built.

Scores (round two in brackets): lighting 3.5 (3), readability 4 (4),
grounding 4 (3.5), consistency 4 (3.5).

What check-in 7 asked for, and what the pictures show:

- Tall striped walls became plain concrete with catch fence; red and white
  stays on the low kerbs only. Met on Ridge Top, the Esses, Conrod and the
  chase view.
- Sharp white ridge spikes became grey rocky outcrops. Met; the far peaks
  are still pointed but read as rock, not snow.
- The ridge drop reads clearly from Ridge Top and the Esses. Met.
- The valley town shows along Conrod. Met.
- Skyline must show the drop and the town. Not met: the inspection camera
  sits inside the radio mast lattice and looks at a green bank.
- Warm-to-violet final-lap dusk. Not shown yet (no lap 3).

Verdict: the art is accepted. What remains is camera framing and evidence,
not art, so it uses no art round:

1. Skyline inspection camera (tools/scenarios/p4-panorama.mjs): move the
   camera position clear of the radio mast (at least 15 m from it, on the
   valley side of the road) and keep the existing target on the town, so the
   frame shows the road, the drop and the town below.
2. The native retry on the Hell Gate wall fix supplies the final-lap dusk,
   Skyline and Conrod frames. Build round-3.jpg (500 KB at most) from that
   run, place it beside this note and remove round-2.jpg and
   round-2-review.md in the same commit.
3. Acceptance holds if the retry pictures match the golden views above and
   the dusk frames read warm to violet with the town lights visible. If the
   dusk frames are unreadable, raise ambient light on the existing palette
   once; that is a tuning step, not a new round.

Any later nit becomes a finishing note for Kyle's play review, not a new
art round.
