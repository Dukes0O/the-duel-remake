# RESCUE-PROPS, rounds 1 and 2 (14 October 2026)

Sheet: `round-2.jpg`: winch, stretcher, searchlight, avalanche beacon, avalanche
debris, and the food, medical and fuel supply loads. Recipe:
`tools/blender/rescue-props.py`; one GLB each in `public/assets/heli/rescue/`.

- Round 1: every prop reads right; the medical cross showed a dark square where
  its two bars shared a face, and the fuel pallet's strap floated outside the
  drums.
- Round 2: cross bars no longer share a face; the strap hugs the four drums.

Verdict (Claude): **pick.** Contract from `docs/HELI_RESCUE.md` section 13:
winch origin at its bolt plate with `line_out`; stretcher origin at the
`harness` point with the litter 1.2 m below; searchlight `beam` empty points
down and forward; debris blocks `block_1` to `block_6`, each based at its
foot; crates have their origin at the top centre. The medical cross is green
because the red cross emblem is protected. Triangles: 216 (beacon) to 1,264
(food crate), all within the packet's limits.
