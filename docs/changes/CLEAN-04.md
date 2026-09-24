# CLEAN-04: Reduce runtime asset and build size

Status: ready for final lane gate and merge.

## Changed

- Removed 59 standalone generated PNGs from the crew, first-person and Rustwall
  runtime model folders. All 21 corresponding GLBs already embed their images
  and buffers, and the shipped GLBs remain byte-identical.
- The three Blender recipes now write their editable generated PNGs under
  ignored `art-build/`. Runtime GLB output paths remain the same. Their
  `--paths-only` plans list both runtime GLBs and editable texture destinations.
- Added `tools/test-runtime-art-sources.mjs` to check the output plans, ignored
  source paths, absent duplicate PNGs, runtime paths and embedded GLB images.

## Size measurements

| Item | Before | After | Target |
| --- | ---: | ---: | ---: |
| `public/` | 312,610,366 B | 250,741,595 B | — |
| Wasteland models | 135,847,059 B | 73,978,288 B | 60,000,000 B |
| Build `dist/` | 316,671,592 B | 254,802,821 B | 250,000,000 B |
| `rustwall/wall.glb` | 15,394,464 B | 15,394,464 B | 8,000,000 B |

The removal saves 61,868,771 B without changing any runtime model. The build
remains 4,802,821 B over target; Wasteland models remain 13,978,288 B over;
and `wall.glb` remains 7,394,464 B over. The wall contains roughly 11.3 MB of
embedded PNG images and 4 MB of geometry. Reaching 8 MB would require changing
the shipped texture resolution or format, or its geometry. That needs a new
matched visual and load-cost review, and the current Blender exporter has
produced differing GLB bytes across rebuilds (CLEAN-02). We kept the accepted
runtime models rather than claiming an unreviewed size reduction. These are
advisory targets, not merge blockers.

## Checks

- The new runtime-source test passes 12/12 checks. No existing assertion was
  changed or weakened.
- The first lane tier passed 237/237 suites in 513.24 seconds, including 162
  unchanged replay fingerprint checks. Build passes at 254,802,821 B. A final
  lane tier and build follow this evidence-note update before merge.
- The memory-only hidden-road-discovery scenario passed before and after on
  private ports, with eight screenshots and zero issues each. Matched views are
  visually equivalent by independent art review. High-quality p95 frame time
  was 16.8 ms in both runs; sampled High draw calls and triangles were also
  unchanged. See `docs/board/looks/runtime-size/round-1-review.md`.
- Simulation code, replay fixtures and runtime GLB bytes did not change.
  Independent code review found no actionable defects. It verified byte-for-byte
  matches between all 59 removed PNGs and their images embedded in the GLBs,
  and found no runtime reader of the removed external files.

## Removed

- Removed exactly 59 duplicate generated PNGs totaling 61,868,771 B. The
  Blender recipe regenerates editable copies under ignored `art-build/`.
- Raw browser captures are removed by the after-merge janitor after the
  committed review verdict; the compact review sheet remains.
