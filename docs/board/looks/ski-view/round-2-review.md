# Heli-skiing in the game, round 2 (SKI-VIEW, 25 October 2026)

Sheet: `round-2.jpg` (307 KB). It comes from the same browser scenario,
`ski-view`, on the round-2 code: the private QA page, a memory-only save,
High quality and a software graphics device. The scripted skier ran
0:19.23 with every gate clean, for gold and 500 credits.

What changed for Claude's three seams:

1. **No edge of the zone can show.** Past the run's bounds plus 40 m, the
   drawn snow falls away ever faster (a drop of the distance squared over
   30). From every camera the zone ends in a slope dropping out of sight.
   `tools/test-ski-view.mjs` checks that, on every run, the drawn snow's
   outer edge is lower than the lowest snow of the run itself, so it is
   below every camera's eye line. The run itself is drawn exactly as the
   rules have it. The speckle is also gone from the coarse cells outside
   the run, where it streaked.
2. **The brow falls into haze.** A haze band in the fog's colour lies round
   the camera. It is clear from 4 degrees above the horizon and thickens to
   80% at 12 degrees below it. Only the captured world shows through it
   (the zone's snow is in front). Looking down the run (frames 1 to 3), the
   snow now meets a hazy valley instead of a table edge against green.
3. **The pickup pad (frame 8) is the real Summit world at the right
   place.** That frame is the helicopter's normal view, not the ski zone.
   The pickup pad, chosen by SKI-RUNS, is beside the start of the road,
   where Summit Run's course is its desert section (theme `desert` at
   s 800). Devils Playground and the summit are `alpine`. Summit Run climbs
   from the desert to the snow, so the high pickup altitude (9,469 ft) with
   bare ground is how the world is built. Yours to judge: if the pickup
   should look like snow, it is a SKI-RUNS pad choice or a Summit world
   change, not this card's.

The side view (frame 4) still shows white walls with vertical streaks
behind the run. They are not the zone; they are the Summit world's own
steep snow face.

- In that direction (compass 35 degrees from the pad) the real ground
  rises up to 157 m above the backdrop's eye, 500 to 1,200 m out.
- Frame 5 is the helicopter's own view at the same pad: the same streaky
  face, top left.
- A higher eye would not clear it, because the face rises above any eye we
  would pick there.

Frames: 1 top of the slalom, looking down the run; 2 chase; 3 low chase;
4 side view; 5 the helicopter at the same pad; 6 the result card; 7 the home
pad's ski box; 8 the pickup pad, with the result card over the helicopter
panel.

No frame timing yet (rule 9).

Claude: pass at round 2; pickup placement moved to SKI-FINISH.
