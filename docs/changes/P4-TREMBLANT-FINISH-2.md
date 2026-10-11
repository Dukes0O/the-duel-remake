# P4-TREMBLANT-FINISH-2: second finishing round on Tremblant Woods

Claude (Opus agent), 11 October 2026, from Claude's fix list after the first
finishing pass. Circuit file: `src/circuits/tremblant-woods.js`. The road,
race rules, timing, laps, field settings and intel block are untouched. Every
new behaviour is an option in a circuit's data and does nothing for a circuit
that does not set it.

## What changed, in plain words

1. **Sun glare on the cars.** The white blobs came from a low sun (15 degrees)
   glancing off the flat tops of the cars when driving toward it, and the
   bloom spreading it. The morning sun is now about 25 degrees up (still long
   shadows, same warm tone), its strength 2.0 (was 6.2), bloom .10 (was .28),
   exposure 1.18, and the sky light a little stronger (1.4) to fill the shade.
   Strength matters twice: the open ground facing the sun was burning out to a
   cream colour, which is also why the corner run-offs looked like sand.
2. **Hill walls.** The big flat green walls were the land itself (the shared
   ground relief rises up to 70 m beyond 80 m from the road on alpine courses),
   not the rounded backdrop hills. New generic option `relief { from, to, scale
   }` eases the land beyond `from` metres from the road edge down to `scale` of
   its height by `to` metres. Tremblant sets 25 / 100 / .38. The hills behind
   it (rounded, with tree crowns) now carry the skyline. The ground beyond 14 m
   from the road is a darker forest green, and the stripes that read as a cliff
   in frame 03 are gone with the height. The backdrop hills were not changed.
3. **Ski runs.** The ski mountain has four wider runs (34 to 40 m) from near
   the summit down its face, each two straight pieces that meet, instead of
   seven short ones. From the road the lower face is hidden behind the lodge's
   foothill, so what shows are the tops of the runs as pale breaks in the forest.
   Open: the crown texture still shows through the pale colour, so they read as
   clearings rather than clean white strips.
4. **Run-offs.** New generic option `groundLeaves.gravel { colour, width, fade,
   ends, grass, to }`: the ground beside every scripted turn is tinted darker
   and greyer out to `width` metres, then dark meadow green out to `to` metres,
   and fallen leaves are taken out of it. Colour only, on the existing ground.
5. **Grandstands.** The repository already had seated spectators, a cut-out
   people picture the arena stands use (`public/assets/textures/stadium-crowd.png`,
   `src/stadium-crowd.js`). New `src/stand-crowd.js` seats them in any kit
   grandstand marked `crowd: true` (about 70 people in each stand, in muted
   mixed clothing, from the same seeded random stream every time, one extra draw
   per stand). The five stands at the start are marked. The picture is a texture
   the arena already loads; no new file.
6. **Beaver Hairpin boards.** The script only has room for the 50 m board (the
   150 and 100 m points fall on the kink). Boards for 150 and 100 m now stand on
   the outside of the hairpin along the approach, in the same kit style as the
   boards at Ridge Corner and the chicane.

## New generic options (all opt in, in circuit data)

- `relief { from, to, scale }` (`src/circuit-hills.js` `installReliefScale`,
  one line in the course constructor in `src/course.js`, outside the part the
  shortcut generator's fingerprint covers).
- `groundLeaves.gravel { colour, width, fade, ends, grass, to }`
  (`src/world-surfaces.js`).
- `kitPlacements[].crowd: true` on a `grandstand` (`src/stand-crowd.js`,
  called from `src/circuit-effects.js`; `crowdTexture` exported from
  `src/stadium-crowd.js`).

## Changed assertions (please review)

Both are in `tools/test-circuit-tremblant.mjs`, test "the light is an autumn
morning". Claude's fix list asked for a higher sun (20 to 25 degrees), which the
old assertions forbade.

- `elevation(morning) < elevation(golden)` became `elevation(morning) <
  elevation(clear)` and a morning sun between 20 and 28 degrees. The golden hour
  is 18 degrees, so a 25 degree morning sun cannot be below it.
- `morning.sun > golden.sun` ("the sun keeps the scene bright as it drops")
  became `morning.sun <= golden.sun && morning.bloom <= .16`. The brightness
  rule was what made the ground and the cars burn out.

## Pictures and numbers

- Review sheet: `docs/board/looks/p4-tremblant/round-2.jpg`, taken at the committed 25 degree sun (frames 08, 09 and
  11 have no white blob any more; 03, 07 and 10 run-offs are dark olive and
  grey instead of bright tan).
- Frame cost (`tools/scenarios/tremblant-views.mjs`, 8 cars, graphics card idle, nothing else heavy running, delivered): High grid p50 16.7 ms, p95 16.8 ms, 0 over 33 ms (1,793 draws, 3.89 M triangles); High Timber Straight p95 16.8 ms; Performance grid p95 16.8 ms (1,137 draws, 3.01 M); Performance Timber Straight p95 16.8 ms. Limit 18.5 ms. (An earlier pair of runs while a Chrome window used 84% of the graphics card read 33 to 50 ms and was discarded.)

## Tests

- `tools/test-circuit-tremblant.mjs`: four new checks (hairpin boards, filled
  stands inside their seating, the gentler land untouched near the road, the
  gravel only ever darker and only beside corners). 23 pass.
- Lane gate on commit ad2a0e1d: `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`, 322 passed, 0 failed. `npm run build` passes. After merging integration (79ba1a96) the lane tier was 321 passed, 1 failed (the repository placement check, which only accepts review sheets named `round-N.jpg`; the sheet was renamed to `round-2.jpg` and the check passes).

## Removed

The seven short ski run pieces (replaced by eight longer ones), the 6.2 sun,
the .28 bloom and the 38 m start of the forest ground colour (replaced by 14 m).
Nothing else was replaced; the arena stands still use the same people picture.
