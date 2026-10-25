# Speirling: one-pass Blender studies

Pick: **04-rear-tunnels**, subject to Claude's verdict. Its taller rear
haunches give the strongest match to the supplied rear photograph, with
clear channels around the narrow spine. Try 03 is the alternative if the
front silhouette matters more.

## Design settled before modelling

Four body studies in metres, Blender -Y forward (glTF +Z forward). A continuous
sculpted shoulder surface connects the fenders and cabin channels. Common
detail geometry, paint, lighting and cameras keep the comparison fair.
The supplied rear screenshot and Kyle's description guide the shapes.
Dedicated front and side reference photographs were not supplied.

| Try | Construction and emphasis | Triangles |
| --- | --- | ---: |
| 01-loft | Dense cross-section loft; balanced front and rear shoulders | 37,663 |
| 02-subdivision | Coarse closed control cage with subdivision; softer shoulders | 37,057 |
| 03-front-sculpt | Analytic loft with higher front fenders and lower rear shoulders | 37,687 |
| 04-rear-tunnels | Analytic loft with higher rear haunches; stronger rear tunnel silhouette | 37,679 |

These are two construction methods and two differently tuned loft studies.
All have a brown clear canopy and side glass, low W intake, corner light
strips, side inlets, mirrors, fin, swan-neck wing mounts, mesh grilles,
stacked red rings, diamond light, plate and straked diffuser. Grime is a
simple lower-sill material. Overall bounds: 3.204 m long, 1.610 m wide,
1.142 m high including the wing; canopy about 1.0 m.

## Verdict and limits

Rear resemblance is strongest in 04. None is a finished likeness: the front
wheel arches open into the channels, the lamp recesses are too square,
the grilles are too small, the spine is too flat and the wing mounts too
heavy. The glass is reflective and the low grime is basic. These are
candidates for Claude to choose from, not accepted runtime art.

## Rebuild and checks

```powershell
& 'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe' -b -t 4 -P tools/blender/speirling-tries.py -- --root .
python tools/blender/speirling-tries.py --root . --sheet
```

Outputs: `.qa-dist/speirling-tries/<try>/`, five PNG views and one GLB per
try. The sheet contains only renders; no reference photographs enter Git.
Cycles CPU, four threads, 20 samples, 840 x 520, AgX, fixed orthographic
cameras. Overhead camera rolls 90 degrees so the full length fits.

Blender checked evaluated triangle budgets, metre-scale bounds and four
named wheel meshes with hub-centred origins. Exported GLB index counts and
wheel nodes were also checked. Recipe syntax, board checks (209) and
repository placement passed. No gameplay files changed; lane, production
build, browser and frame checks were not run for these unselected assets.
One modelling pass; initial mesh-budget and shell construction faults were
fixed before rendering. Only the overhead framing was corrected afterward;
no additional art variants or aesthetic iterations.

## Removed

None replaced. Existing models and reference originals remain untouched.
Temporary run logs were recycled. Requested renders, GLBs and their small
summary remain local for Claude's choice.
