# Tanker source comparison: round 1

Date: 30 September 2026. Status: `review`; `waiting_on: kyle`.
No fitting or runtime replacement has started.

Recommend **A: Kenney delivery-flat plus the horizontal detail-tank** as the
existing-parts lead. Its open flat chassis needs less trimming than the
alternate truck-flat tray. Neither source provides the separate trailer,
hitch or boarding parts required by Convoy Raid. Kyle's source decision is
needed before adaptation. This is one source comparison, not a fitted-art
round or an approval to invent missing geometry.

[Open the comparison](round-1.jpg). It is 1800 by 1490 pixels, 372,770 bytes.
SHA-256: `04889185f7f369e0263f700927887935d99005c12a3da61d0d566c1529b399d6`.

## The two source leads

| Choice | Actual original sources | Why consider it | Work still needed |
| --- | --- | --- | --- |
| A, recommended lead | Car Kit 3.1 delivery-flat, City Kit Industrial 2.0 detail-tank and Car Kit wheel-truck | Existing forward cab, open flat chassis and horizontal tank with bands and support feet. | Split or trim the combined cab/bed mesh; establish an existing-geometry trailer frame and hitch; match scale and worn materials. No assembly has been tried. |
| B, alternate | Car Kit 3.1 truck-flat, the same detail-tank and wheel-truck | Existing cab and lower triangle count. | Raised tray sides require more trimming; pickup proportions are a weaker heavy-rig lead. The same trailer and boarding gaps apply. |

The truck body and bed are one mesh. Each truck has four separate wheel
meshes. The tank is one mesh. Reusing these shapes is compatible with the
settled trim/combine approach, but feasibility within three fitting rounds
is unproven. The original bright palettes and simple proportions are shown
honestly; they must become worn paint, steel, rust and dust before use.
No final gritty resemblance score or frame-cost pass is claimed.

The 2,574-triangle delivery-flat plus 310-triangle tank totals 2,884 triangles
before any trimming, extra trailer wheels or armor. Truck-flat plus that tank
totals 2,798. These are sums of separate inspected source samples, not totals
for an assembled rig or a runtime budget measurement.

## Approved Salt Flats armor donors

Kyle's existing Salt Flats group picks are recorded in `next-run.md`; this
sheet shows those actual originals separately. No piece has been attached.

| Original donor | Proposed reuse after a source pick | Qualification |
| --- | --- | --- |
| Car Kit debris-door | Cab side or front guard | Existing loose door, 68 triangles. Its window opening remains visible. |
| Industrial shipping-container-a | Tank skirts or side guards | Complete 402-triangle container mesh. A panel must be trimmed from existing geometry; no loose panel is supplied. |
| Car Kit debris-drivetrain | Underbody or ram crosspiece | Existing 412-triangle drivetrain, not a finished bull bar. |
| Car Kit debris-tire | Side or rear impact buffer | Existing loose tyre, 288 triangles. |

A separate wheel-truck mesh has 428 triangles. It is a possible trailer wheel
source after Kyle chooses. It supplies no axle articulation or trailer frame.
These roles are a source proposal, not changes to ARENA-07's settled rules.

## Explicit stop and remaining gaps

Neither inspected pack contains a separate trailer, trailer chassis or hitch.
Neither supplies the three fuel valves, an opening roof boarding hatch,
Tollkeeper trailer doors or spike-strip mechanism. There are no rigs or action
clips. The future event's 12-tonne behavior, 55/35 km/h motion, valve damage,
boarding finish and physics are outside this source card.

Physical scale is not certified. In Blender, delivery-flat spans about 3.25
source units and truck-flat about 2.75 along their long axes; the tank spans
about 0.848. Different-pack proportions need checking. No geometry split,
rig articulation, collision shape, game-camera fit, texture treatment,
draw-call count or frame budget has been validated.

Stop here under Kyle's rule. Choose A as the existing-parts lead, or request a
better articulated truck/trailer source. Do not start adaptation, construct a
new body or present a substitute rigid truck as the finished convoy. Current
game assets stay in place. Claude should review this source sheet with Kyle.

## Rights and originals

Both main sources are by Kenney. The primary pages identify CC0:
[Car Kit](https://kenney.nl/assets/car-kit) and
[City Kit Industrial](https://kenney.nl/assets/city-kit-industrial).
Their retained original ZIPs contain `License.txt` stating Creative Commons
Zero / CC0. Every used extracted model, atlas and license equals its ZIP
member byte for byte. Original archives and licenses remain outside Git in
`C:/Users/kyleb/dev/art-library/kenney-car-kit` and
`C:/Users/kyleb/dev/art-library/kenney-city-kit-industrial`.

The [Toy Car Kit](https://kenney.nl/assets/toy-car-kit) was the only new
archive downloaded, using its creator's free no-donation link. Its embedded
license is also CC0. Its actual archive inventory has no tank or trailer model,
and its toy proportions make it a poor heavy-rig lead. It is declined and
recorded in the catalog; no geometry count or animation claim is made for it.
Its original ZIP and extracted license remain in the external
`kenney-toy-car-kit` cache. No paid download, account or API key was used.

Original download links and all 18 file hashes and byte counts are in the
three appended catalog records. The previous 20 catalog entries retain
exactly the same values, including older rights records and Kyle's choices.
Future runtime credits must name Kenney with the pack links. No runtime
credit or protected audio file is changed by this source-only card.

| Pack | File | SHA-256 |
| --- | --- | --- |
| Car Kit 3.1 | source.zip | `fac7dacac5c7874348cf19729af3ef205f3d366493edaf0a827d93f4fdf3d0c4` |
| Car Kit 3.1 | unpacked/License.txt | `c33b7f6453d134deae7b1b8493717d9ccfa754c25ab97f6de89b88f8fda19b00` |
| City Kit Industrial 2.0 | source.zip | `5b381164e5760f3830a2dbee43b972deee38b2a695d091b56e238ab2910c96d2` |
| City Kit Industrial 2.0 | unpacked/License.txt | `60a8c5c31191256ec9779dc18745dea6d69c46f4b29703459ce064c1765a59ea` |
| Toy Car Kit 1.2 | source.zip | `26c11bbb77102b8dd00cdaf7b2c7ab692416d750dd064de886d809acec346782` |
| Toy Car Kit 1.2 | unpacked/License.txt | `2406ba62730af7633689439c1e3e913b93e54eada8e73da415003a2bb96b099e` |

## Inspection and reproduction

Blender 4.5.13 imported ten unchanged GLBs with auto-execution disabled.
Together they contain 22 mesh objects and 9,618 triangles. Evaluated counts
equal source counts, with no modifiers, armatures or action clips. Each mesh
has one UV layer and its original 512 by 512 color atlas. The boxed truck and
upright large tank were inspected but excluded from the two leads: both need
more body work than the selected open truck and horizontal tank.

| Original | Triangles | Mesh objects |
| --- | ---: | ---: |
| truck-flat | 2,488 | 5 |
| delivery-flat | 2,574 | 5 |
| truck | 2,082 | 5 |
| detail-tank-large | 566 | 1 |
| detail-tank | 310 | 1 |
| wheel-truck | 428 | 1 |
| debris-door | 68 | 1 |
| debris-drivetrain | 412 | 1 |
| debris-tire | 288 | 1 |
| shipping-container-a | 402 | 1 |

Native Blender renders keep the original geometry, transforms, atlas and
palette. Neutral lighting and camera framing are presentation only. The sheet
crops transparent bounds without cutting the silhouette or combining parts.
No Blender source file is saved and no runtime model is exported.

From the lane or integration checkout, using the installed Blender and bundled
Python executables:

```powershell
& C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe --background --disable-autoexec --python tools/art/tanker-source-inspect.py -- --render --output .evidence/2026-09-30/ART-SRC-TANKER/sources
& C:/Users/kyleb/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe tools/art/tanker-source-sheet.py --sources .evidence/2026-09-30/ART-SRC-TANKER/sources --output docs/board/looks/tanker-src/round-1.jpg
```

Independent-directory reproduction in `reproduce/` gave identical source
report bytes, all ten decoded RGBA images and exact comparison JPEG bytes.
An initial raw-PNG byte comparison failed because Blender writes different
`Date` and `RenderTime` metadata. The decoded pixels have zero difference;
this is not a source or visual change. The existing assertions were untouched.

All 143 current `public/` files, 236,249,990 bytes, matched their pre-comparison
SHA-256 inventory. Manifest digest:
`99b28909112ca3a00f8f2378e57388159a897a968b2acfd079e0b50d89f23066`.
No `src/`, replay, scenario, dependency or runtime file changed. No gameplay,
save, audio listening or browser performance pass is claimed. Private source
renders do not launch the Preview or touch player saves.

The existing art-sourcing, runtime-art-source and placement validators passed
before additions and again after the catalog and sheet. Runtime-art-source:
12 checks, zero failed. Independent review and the mandatory lane tier/build
remain Director gates on the frozen final head; their passing evidence is not
asserted here. Raw reports and renders remain ignored evidence until review.
