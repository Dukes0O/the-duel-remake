# WW-ART-PEACE round 3

Date: 6 November 2026

Added the `toll-cabinet` root with a traced front photo, steel case and a real
projecting open-drawer box. The cabinet stands 1.8 m high. Its generated front
and side photos are compressed to JPGs in the town texture folder and credited.

Added the `bound-sign` root as a traced, thick board and a separate post. The
render keeps the three hand-painted lines right-reading and spelled exactly
`DO NOT DIG HERE`.

Added the `bound-stone` root, carved to 1 m from the front and side photos. Its
front carries a shallow crossed-tools mark with a smiley. The full-size JPGs are
kept as sources; only these new photos are downsampled in Blender for the GLB.

Added `mirage-decoy-tent` with a large painted front, a smaller offset rear
board and support poles hidden behind the painting. Its exported side view
shows both flat boards. The painting and exported front were compared at the
same size.

## Checks

- Blender export and GLB re-import/render succeeded. The front reference and
  exported front render were compared at matching size; the three-quarter view
  shows the open drawer as a box.
- `tools/test-blender-output.mjs` and `tools/test-repo-hygiene.mjs`: pending
  until all five requested props are in the candidate.
- Browser and in-game look checks: Claude should review the round-3 sheet after
  it is assembled. This art lane does not run Chrome.
- Changed assertions: none. Race fingerprints: not applicable; no race rules
  changed.

## Removed

- No files or behavior removed.
