# TOWN-ART-MACHINES-2 - round 28: loader

Third loader round. The loader side reference is now measured directly from
the full current photo (877 x 434 px): silhouette x=58..748, ground y=400,
tyre centres x=160 and 540 at y=321, and tyre radius 80 px. At 5 m body
length this gives 0.58 m tyre radius and axle positions -1.76 m and 0.99 m.
The carve underside remains at Claude's 0.5 m.

The bucket is scaled from its side photo to about 1 m tall, its pin is placed
ahead of the front tyres, and its lower edge meets the ground. Paired lift arms
run from the front-frame pins beside the cab (about 1.55 m high) down to the
bucket pin. The four passed machines were not edited in the recipe.

## Scores

| Measure | Score | Finding |
| --- | ---: | --- |
| Resemblance | 2/5 | The carved body reads as a loader, but its cab/body projection remains streaked and doubled. |
| Readability | 3/5 | The bucket is ahead of the tyres and the two arms now connect the frame pins to its pin. The arms look like plain painted beams. |
| Grounding | 3/5 | Built tyres meet the ground; the bucket lower edge is at the ground line. |
| Scene consistency | 3/5 | Worn photo paint and dark tyres are retained. A dark ball artifact remains below the machine. |
| Frame cost | 4/5 | `test-blender-output.mjs` passed: 389 checks, 0 failures. |

## Biggest differences for Claude to review

1. Confirm the built tyre centres line up with both tyres in the current side photo.
2. Judge whether the arms' simple beams visibly read as a pair and meet the bucket pin in the rest and work poses.
3. The bucket is placed ahead of the front tyre, but its side plate partly overlaps the tyre in the side view; judge the clearance.
4. The dark ball below the loader and streaked/doubled cab are still visible; they were outside this round's three requested fixes.
5. Check the front, rear and overhead views against the whole source photos on the sheet.

The sheet shows all four source photos uncropped. The Blender output check
passed: 389 checks, 0 failures.
