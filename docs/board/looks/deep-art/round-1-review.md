# The Deep — source round 1

**Verdict: pending Claude. The card is incomplete.** One 353,078-byte source
sheet covers all fourteen exact creature IDs and four set-piece roles.
It uses published source previews, not an adapted asset or game capture.
No Deep runtime model was installed and no frame measurement was made.

## Claude verdict request for Root to post on the card

Please judge this source sheet under AGENTS rules 15–16. Approve or reject
the donor choices and give one bounded next step. This is round one of at
most three; no formal visual scores or acceptance are claimed.

1. Are the natural donor silhouettes suitable for a later fitting pass?
   The generic fish needs reef colours; the shark is not species-labelled;
   the turtle needs natural greens; jellyfish needs restrained translucent
   paint; the cargo donor needs a real open hold and hull breach.
2. May the **river otter** be adapted into a sea otter by fitting its existing
   body, rear feet, tail and back-floating pose? It is not sea-otter art now.
   If that is unsuitable, hold this role and name a better existing source.
3. The genuine CC0 moray, grouper and Tridacna leads need authenticated mesh
   downloads; their public download APIs each return **HTTP 401**. Should
   these roles wait for usable source files, or is there another available
   licensed pack? Nothing was fetched through a login or API token.

Root owns the card's `Claude answers` section and shared waiting state;
this lane does not edit the card, inbox, board or STATUS on integration.

## Source and license checks

All fifteen downloaded GLBs have valid glTF 2 headers/lengths, nonempty
meshes/nodes and verified SHA-256 hashes. Their declared external images
are present. Kenney's two models share the existing pack colormap; that
image is recorded too. Source triangles below are read from the actual GLB
accessors, not copied from the search listings. Only manta, shark and whale
include swimming clips among the chosen downloaded donors. No shader,
rig, animation retargeting, LOD or runtime compatibility pass is claimed.

The fifteen donor GLBs total **4,220,680 bytes**, outside the repository.
The runtime increase is **zero bytes**. The Deep's 20 MB runtime aim remains
for later fitting and integration. Existing catalog rows and top-level
metadata are preserved exactly: normalized-object SHA-256
`bb28af43422d33bfc606c072a8f7112829b7bd4b1972da517641ca298183ebce`.

| Exact role | Source | License | Actual GLB triangles / clips | Current gap |
| --- | --- | --- | --- | --- |
| `silver-school` | [Fish Mackerel donor, shown unmodified.](https://poly.pizza/m/uassUTYYae) | CC0-1.0 | 888 / 0 | Natural silhouette; instance; silver paint |
| `reef-fish` | [Fish donor, shown unmodified.](https://poly.pizza/m/aEyLrUMMoUK) | CC-BY-3.0 | 506 / 0 | Generic fish donor; reef colours pending |
| `turtle` | [Turtle donor, shown unmodified.](https://poly.pizza/m/fklSEvGm1Q8) | CC-BY-3.0 | 1,788 / 0 | Sea flippers; mute yellow; strokes pending |
| `ray` | [Eagle ray donor, shown unmodified.](https://poly.pizza/m/675H-fzHW3-) | CC-BY-3.0 | 480 / 0 | Eagle ray donor; sand-rest pose pending |
| `manta` | [Manta ray donor, shown unmodified.](https://poly.pizza/m/yzD8b7ZHZm) | CC0-1.0 | 696 / 1 | CC0; Swim clip; natural silhouette |
| `sea-lion` | [Sea lion donor, shown unmodified.](https://poly.pizza/m/45HRvXYpvUG) | CC-BY-3.0 | 714 / 0 | Static mesh; swimming pose/rig pending |
| `otter` | [River otter donor, shown unmodified.](https://poly.pizza/m/dJW3JeUWXQ-) | CC-BY-3.0 | 1,084 / 0 | RIVER otter; sea anatomy/pose unresolved |
| `crab` | [Crab donor, shown unmodified.](https://poly.pizza/m/2DgM36qZW2u) | CC-BY-3.0 | 624 / 0 | Static donor; mute red; scuttle pending |
| `moray` | [CC0 ウツボ 🐟 Brutal Moray, Gymnothorax kidako](https://sketchfab.com/3d-models/cc0-brutal-moray-gymnothorax-kidako-f7b2e7e06e454392bf7d7ab739658d57) | CC0-1.0 | 1,987,725 listed; not downloaded | CC0 true moray lead; download 401; scan needs reduction and animation/fitting. |
| `grouper` | [CC0 キジハタ 🐟 Hong Kong Grouper, E. akaara](https://sketchfab.com/3d-models/cc0-hong-kong-grouper-e-akaara-4ddbc1a350904a8e9ea2f4985e55edee) | CC0-1.0 | 1,533,064 listed; not downloaded | CC0 true grouper lead; download 401; scan needs reduction and animation/fitting. |
| `reef-shark` | [Shark donor, shown unmodified.](https://poly.pizza/m/AyHTK3zUSG) | CC0-1.0 | 644 / 1 | Generic shark donor; reef species pending |
| `jellyfish` | [Jellyfish donor, shown unmodified.](https://poly.pizza/m/dA5osnS0Rzj) | CC-BY-3.0 | 3,704 / 0 | Shape only; pink paint/glow need fitting |
| `whale` | [Whale donor, shown unmodified.](https://poly.pizza/m/JGFwp6xWgk) | CC0-1.0 | 447 / 1 | CC0; Swim clip; muted whale silhouette |
| `octopus` | [Octopus donor, shown unmodified.](https://poly.pizza/m/9-b6-yqrwEe) | CC-BY-3.0 | 754 / 0 | Static donor; pose/colour change pending |
| `wreck-hull` | [ship-cargo-a original donor.](https://kenney.nl/assets/watercraft-kit) | CC0-1.0 | 1,060 / 0 | CC0 cargo donor; breach/interior pending |
| `giant-clam` | [CC0 ヒメシャコガイ Boring Clam, Tridacna crocea](https://sketchfab.com/3d-models/cc0-boring-clam-tridacna-crocea-af688a0ed6044ab99d0ec20c57fd3b18) | CC0-1.0 | 945,861 listed; not downloaded | CC0 Tridacna lead; download 401; scan needs reduction and animation/fitting. |
| `anchor` | [Anchor donor, shown unmodified.](https://poly.pizza/m/ejWQny9Gcz) | CC0-1.0 | 544 / 0 | CC0; fit scale and aged metal pending |
| `sunken-boat` | [boat-fishing-small original donor.](https://kenney.nl/assets/watercraft-kit) | CC0-1.0 | 237 / 0 | CC0 fishing donor; weathering pending |

## Rejected leads

The Cute Fish Royal Gramma and Coral Grouper have oversized round eyes and
were rejected for this natural-look shortlist. A walking land turtle,
cartoon crab, generic eel variants, the pale cartoon octopus, flat clam
shells and the Kenney wooden shipwreck were also rejected. A generic
container ship was superseded by the already-cached CC0 Watercraft donor.
The Oregon State University Sea Otter FW1506 is a **skull**, not a whole
animal; it was rejected after inspecting its original preview. No skull
or wrong species was installed as a finished creature.

These decisions are builder observations for Claude's review, not Claude's
verdict. Downloaded source previews retain their original materials and
backgrounds. Low-resolution Kenney pack previews are labelled as sources;
no invented detail or synthetic scene disguises their limits.

## Evidence and next work

- Source sheet: `docs/board/looks/deep-art/round-1.jpg`.
- Sheet SHA-256: `ac0cd047a3c423ae824bd047d6ee0450acd6c828051373e0daae0ca2cd75a198`.
- Published source URL, exact author, license URL, GLB/image/license checksums,
  original download URLs and external cache paths: the 18 `deep-*` catalog
  entries in `tools/art/catalog.json`.
- This source-only packet does not meet the whole card's acceptance. Three
  genuine meshes remain unavailable; sea-otter anatomy and several natural
  fits await Claude. No placeholder asset enters `public/`.
- Download access diagnosis stopped inside the 30-minute per-problem cap.
  No account, key, purchase, new pipeline or heavy browser check was added.
- Existing art-sourcing check and `git diff --check` passed. The canonical
  nearby lane plan selects 26 suites including native Blender rendering in
  `tools/test-rustwall-p2-relief.mjs`. Its execution waits for night unchanged;
  no canonical lane pass or merge clearance is claimed. Build/source review
  evidence is supplied separately; formal art completion waits for Claude.

## Removed

No prior game assets or other lane work was removed. The rejected new donor
copies and temporary source previews are recycled after the selected cache
and packet are verified. The original existing Kenney pack stays intact.

## Deferred checks

No frame, browser scenario, full tier or balance claim. DEEP-LIFE and the
world finishing/night cards own reachable placement, motion and timing.
