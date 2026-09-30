# ART-SRC-TANKER: existing source comparison

Status: review, waiting_on: kyle. Recommend Kenney delivery-flat plus the
horizontal Industrial detail-tank as an existing-parts lead. Neither option
supplies a separate trailer or hitch; no adaptation or runtime change starts
until Kyle chooses the source path.

## Changed

- Added source-inspection and comparison recipes in `tools/art/`.
- Added one 372,770-byte comparison and its review note under
  `docs/board/looks/tanker-src/`. It shows two actual truck/tank leads and the
  Kyle-picked loose door, container, drivetrain and tyre armor donors.
- Appended two reuse records and the declined downloaded Toy Car Kit record
  to the art catalog. All prior 20 records retain identical values.
- Verified original ZIP licenses and 18 catalog file hashes/byte counts.
  Cached licensed originals stay outside the repository.

## Verification

The existing validators passed before source work and again after additions:

```text
node tools/test-art-sourcing.mjs
node tools/test-runtime-art-sources.mjs
node tools/test-repo-hygiene.mjs
```

Runtime-art-source reported 12 checks and zero failed. Placement passed;
size targets remain advisory. Full reproduction commands, geometry and rights
are in the round review note. Blender imported ten unchanged originals:
22 meshes, 9,618 triangles, no armatures or actions. Reproduction gave identical
report/JPEG bytes and ten pixel-identical RGBA renders. A raw-PNG byte check
initially failed on Blender timestamp/render-time metadata, with no pixel
difference. No existing test assertion was changed or weakened.

All 143 current public files, 236,249,990 bytes, retain their baseline hashes.
No simulation, replay, save, browser renderer, dependency or game sound cue
changed. No gameplay fingerprint or frame-budget pass is claimed for separate
source samples. The mandatory lane tier/build and independent review are
pending Director verification on the final clean commit.

## Stop and handoff

The separate trailer/chassis/hitch, three fuel valves and opening boarding
hatch are absent. Scale, trimming, articulation, worn materials and frame cost
are unproven. The source bodies are simple and bright; they are not finished
gritty art. The next action is Kyle's source choice, reviewed with Claude.
Do not broaden source searches or create missing geometry in this card.

## Removed

Nothing in the game was replaced, so no old runtime model, generator or credit
is removed. The boxed truck, upright large tank and Toy Car Kit are declined
as leads, not installed substitutes. Raw Blender renders/reports are ignored
review evidence and are deleted after their verdict is committed. Keep the
licensed original source archives and their licenses in the external cache.
