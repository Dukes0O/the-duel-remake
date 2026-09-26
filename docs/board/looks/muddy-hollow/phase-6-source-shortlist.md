# Muddy Hollow phase 6 source shortlist

Decision needed from Kyle: pick one mud surface and one prop family. No
adaptation or download has started. Every candidate is CC0, and the source
facts are also recorded in `tools/art/catalog.json`.

## Recommended pair

Pick **Surface A, Brown Mud 02**, and **Props A, Quaternius Ultimate Nature
Pack**. Brown Mud is neutral enough for three different pits and does not bake
in a false driving line. Quaternius supplies rocks and logs in one lightweight,
coherent family. The main risk is matching its faceted materials to the current
High Country scene; that is cheaper to test than reducing a 124,000-triangle
photogrammetry boulder or making Kenney's tiny flat-color props read as final
art.

Water, splash and mud particles are not source decisions. They will use a
code-native water material and the existing pooled effect approach. The
detailed Hollow ground remains a deterministic mesh from the authored height
field. Only the chosen mud maps and prop starting models enter the external art
library.

## Mud surface

### Surface A — Brown Mud 02 (recommended)

![Brown Mud 02 preview](https://cdn.polyhaven.com/asset_img/primary/brown_mud_02.png?height=360&quality=95&v=e736736c)

- Catalog ID: `polyhaven-brown-mud-02`
- Source: [Poly Haven — Brown Mud 02](https://polyhaven.com/a/brown_mud_02)
- Author and licence: Rob Tuytel, CC0-1.0.
- Fit: neutral wet and compact patches; diffuse, normal and roughness maps are
  available; use only a compressed 1K or 2K runtime set after selection.
- Risk: its realism needs color matching and careful tiling beside the current
  stylized terrain.

### Surface B — Muddy Tracks

![Muddy Tracks preview](https://cdn.polyhaven.com/asset_img/primary/muddy_tracks.png?height=360&quality=95&v=99ac7961)

- Catalog ID: `polyhaven-muddy-tracks`
- Source: [Poly Haven — Muddy Tracks](https://polyhaven.com/a/muddy_tracks)
- Author and licence: Amal Kumar, CC0-1.0.
- Fit: wet sheen, deep ruts and coarse mud read clearly from the driving
  camera.
- Risk: the photographed tracks may point across the player's route and repeat
  visibly over all three pits.

## Rock and log props

### Props A — Quaternius Ultimate Nature Pack (recommended)

![Quaternius Ultimate Nature Pack preview](https://quaternius.com/assets/images/fullres/ultimatenature.jpg)

- Catalog ID: `quaternius-ultimate-nature-pack`
- Source: [Quaternius — Ultimate Nature Pack](https://quaternius.com/packs/ultimatenature.html)
- Author and licence: Quaternius, CC0-1.0.
- Fit: 150 models in FBX, OBJ and Blend, including rocks and logs; one family
  can cover the rock garden and stacked-log ramp with a small runtime budget.
- Risk: faceted geometry and flat materials need a restrained recolor pass to
  blend with High Country.

### Props B — Kenney Nature Kit

![Kenney Nature Kit preview](https://kenney.nl/media/pages/assets/nature-kit/5ee9643237-1677698893/preview.png)

- Catalog ID: `kenney-nature-kit`
- Source: [Kenney — Nature Kit](https://kenney.nl/assets/nature-kit)
- Author and licence: Kenney, CC0-1.0.
- Fit: 330 game-ready files with very small geometry and easy material edits.
- Risk: the miniature scale and flat-color style may look like blockout art
  beside the existing vehicles and terrain.

### Props C — Poly Haven Boulder 01

![Poly Haven Boulder 01 preview](https://cdn.polyhaven.com/asset_img/primary/boulder_01.png?height=360&quality=95&v=b3b100e5)

- Catalog ID: `polyhaven-boulder-01`
- Source: [Poly Haven — Boulder 01](https://polyhaven.com/a/boulder_01)
- Author and licence: Rico Cilliers, CC0-1.0.
- Fit: realistic weathered hero boulder with source LODs for the seven-rock
  garden.
- Risk: 124,000 source triangles need aggressive LOD selection, it brings a
  more realistic style, and it does not solve the log ramp.

## Selection and next action

Reply with `Surface A` or `Surface B`, plus `Props A`, `Props B` or `Props C`.
After the choice, the art lane will download only the selected sources to
`C:\Users\kyleb\dev\art-library\`, record checksums and exact files in the
catalog, and build one representative pit and one representative prop group
before extending them across the Hollow.
