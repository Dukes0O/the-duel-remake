# The road machines and the worked ground, round 1

Sheet: `round-1.jpg`. Every picture is from the real game in a visible window (`?flags=wasteland-town,the-dig`, memory-only
saves), 19 November 2026. The machines were driven with real keys in real time; a machine was set on the start of the
practice strip before each pass, as the browser scenario does. The pictures beside and above the machines are taken by a
second camera placed in the Dig's own scene (the same renderer, light and fog).

## What the game drew before (top row)

- The roller and the paver were a yellow box and a green box with one grey drum each. Their photo-built models were in
  `machines-2.glb`, which the yard never loaded.
- The dozer was a real model, but its blade never moved and its seat view showed no part of the machine.
- After a full pass of the dozer (25 cells cut and spread) the ground showed nothing. The colours were painted on the
  yard floor, which lies under the edited ground.

## Verdict (Claude): better, one more round

| Piece | From the seat | From 30 m | Beside it | Short of right |
| --- | --- | --- | --- | --- |
| Dozer | Bonnet and the curved top of the blade; the blade drops when Space is held | A dozer: blade, tracks, cab, stack | Blade down to cut, half up to spread, earth rolling ahead | The heap is too orange and too smooth beside dark fill |
| Roller | Hood and the steel drum under the eye, the fill ahead | A roller: drum, canopy, rear tyres | Reads as a road roller; the drum turns | The yokes are plain yellow bars across the drum's face; the flank wears a ghost of the photo's tyre |
| Paver | The hopper and its drag chain straight ahead | A paver: hopper, tracks, screed | Screed down on the ground while laying, lifted to travel | A pale panel behind the seat (studio background the carve kept); nothing shows that the surface is hot and new |

**The ground.** Six states tell apart at a glance from above and from standing height: scraped by the blade (plain, the
ground's own grain showing), loose fill (dark clods, ragged edge), rolled (paler and flatter with each pass, tight after
six), paved (a dark mat with a straight edge), paved on soft fill (crazed, earth in the cracks), paved too fast (rippled
and torn). The paved mat and the two kinds of bad work are the strongest. Short of right: the grit in the mat is in
blobs the size of a hand; the cracks in the soft surface run in loops like worm trails; rolled ground is a pale haze
more than a pressed surface; and the stretch the blade only scraped was covered by fill the roller pushed onto it, so
this round shows no clean picture of cut ground.

## Changed before this round was counted

The first load (not kept as a sheet) had a pale flat slab where the yard's practice heap stood (a heap taken for worked
ground), a grey see-through mat (its surface was drawn as shiny), seat views filled by a bonnet or a canopy roof, and a
black lump hanging in the air beside the drill: one of the paver's track wheels, 22 m from the paver. All four are put
right; the last was a fault in the model file and its recipe (`docs/ART_LINE.md`, "A part stands 22 m from its machine").

## Round 2 will

Add steam off the new surface behind the screed, darken the heap ahead of the blade, press stones into rolled ground, make
the mat's grit fine, break up the soft surface's cracks, and keep the roller off the scraped stretch so cut ground shows.
