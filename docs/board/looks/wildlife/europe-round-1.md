# Europe, round 1 of 3

Claude's brief (3 November 2026): the Europe group for Ardennes, Eifel
Crown, Alpine Serpent and Azure Riviera, priority roe deer, red deer, wild
boar and red fox, then chamois, ibex and alpine marmot, then the wildcat
and the birds. Real fur from round 1: grain, mottling, darker and lighter
zones, never a smooth single-tone body.

## Sheets

- `europe-round-1a.jpg`: roe deer, red deer, wild boar, red fox, chamois, ibex.
- `europe-round-1b.jpg`: alpine marmot, wildcat, black stork, golden eagle, gull.

Same columns as the Western mountains rounds: 14 m, 55 mm side and
three-quarter at Idle frame 1, then close Idle and Walk or Fly frames, all
from actual GLB imports. No reference column.

## How each was made

| Species | Recipe | Base |
| --- | --- | --- |
| Roe deer, red deer, chamois, ibex | `donor_shape.py` + species file | Quaternius deer (CC0), every donor clip kept |
| Red fox, wildcat | `donor_shape.py` + species file (the wildcat reuses `cougar.shape` for the cat head, ears and paws) | Quaternius wolf (CC0), every donor clip kept |
| Wild boar | species file + `original.py` | Original sections, shared quadruped rig and gait; the bear donor is round-backed and short-snouted, so it did not fit |
| Alpine marmot | `alpine-marmot.py` | The passed yellow-bellied marmot recipe, loaded unchanged and recoloured |
| Black stork, golden eagle, gull | species file + `bird.py` | Original bird recipe: perched or standing Idle, looping Fly |

Coat zones: `donor_shape` gains optional `MOTTLE` (darker and lighter zones)
and `GRIZZLE` (pale hair tips), both off for the earlier species so their
recipes give the same output. Boar, chamois, ibex, red deer, wildcat and the
marmot use the coarse fur grain; the marmot and birds use 512 maps.

## Numbers

| Animal | Triangles | GLB bytes | Clips | Size L x W x H, m (Idle) | Lowest Idle / motion, mm |
| --- | ---: | ---: | --- | --- | --- |
| Roe deer | 4,163 | 1,725,948 | Idle, Walk + 24 donor | 1.18 x 0.46 x 1.39 | 0 / -3.2 |
| Red deer | 4,399 | 1,763,280 | Idle, Walk + 24 donor | 2.19 x 1.19 x 2.86 | 0 / -5.7 |
| Wild boar | 3,258 | 871,072 | Idle, Walk | 1.73 x 0.60 x 1.03 | -3.8 / +1.9 |
| Red fox | 4,100 | 1,788,484 | Idle, Walk + 22 donor | 1.10 x 0.18 x 0.52 | 0 / -3.9 |
| Chamois | 4,083 | 1,725,876 | Idle, Walk + 24 donor | 1.24 x 0.41 x 1.18 | 0 / -3.2 |
| Ibex | 4,485 | 1,774,760 | Idle, Walk + 24 donor | 1.98 x 0.72 x 1.82 | 0 / -4.4 |
| Alpine marmot | 1,916 | 462,768 | Idle, Walk | 0.71 x 0.31 x 0.25 | -10.2 / -10.3 |
| Wildcat | 4,300 | 1,903,652 | Idle, Walk + 22 donor | 0.92 x 0.24 x 0.45 | 0 / -3.5 |
| Black stork | 1,828 | 376,340 | Idle, Fly | 0.82 x 0.22 x 0.97 | -6.4 / +273.6 (Fly) |
| Golden eagle | 1,828 | 396,304 | Idle, Fly | 0.66 x 0.24 x 0.57 | -84.1 / -87.8 (Fly) |
| Gull | 1,700 | 440,060 | Idle, Fly | 0.53 x 0.17 x 0.26 | +1.0 / -108.6 (Fly) |

Heights include antlers, horns and ears. Bird Idle lows are tails hanging
below the perch; Fly numbers are relative to a bird the game holds in the
air. The marmot's belly fur sits in the ground plane as the passed one does.

## Unsure, for Claude

- **Wild boar** reads right in shape (wedge, snout disc, tusks, bristle
  ridge) but its hooves are round lumps from the shared leg, and the coat is
  still fairly even from a distance.
- **Wildcat** has the cat head and a thick ringed tail, but the body still
  carries some of the wolf's long-legged build; the flank stripes are soft.
- **Red deer** rack spreads wide from the front but reads tall from the side.
- **Ibex** horns are at the long end for an old billy (about 1 m).
- **Chamois** eye stripes are thin at 14 m.
- **Gull** head meets the grey back with a visible line, as the kookaburra's
  first head did; the gull's white head and grey mantle make it read as a
  colour edge.
- **Black stork** shows its white belly mainly from below.
