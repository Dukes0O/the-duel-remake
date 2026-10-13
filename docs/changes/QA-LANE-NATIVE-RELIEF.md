# QA-LANE-NATIVE-RELIEF: defer native renders to night

## Design settled before code

Use only the existing explicit `NIGHT_ONLY_SUITES` list. The original five
entries gain Relief and, under the reviewed scope expansion 4bbd9b7a, three
more proven render suites: Rook candidate, Rustwall P2 and Rustwall atlas
isolation. Lane and changed-only selection defer these nine suites; full and
default selection retain them. No selection algorithm changes.

Actual source proof:
- Relief invokes Blender at test lines 107-120, 174 and 404, including
  source-car still renders.
- Rook candidate invokes `rook-p2.py --stage candidate` at test lines
  375-377; recipe line 1210 renders actual candidate stills.
- Rustwall P2 test lines 470-472 invoke `--p2-wheel-probe`; recipe lines
  1278-1286 render EEVEE views.
- Rustwall atlas isolation test line 211 invokes its real harness; lines
  193-198 call `p2_prepare_relief_atlas`, which renders EEVEE atlases.

Root's bounded audit distinguishes actual rendering from Blender export.
Salt Flats and Vesper export/asset checks remain selected, as do pure geometry
checks and fake missing-Blender controls. No render/browser/frame/balance
operation runs by day. No native recipe or runtime change is made here.

Extend only the existing selector's explicit expected list to the same nine
entries. Keep its existence, lane exclusion, changed-only equivalence,
pure-suite inclusion, replay/world guards, full/default equality and complete
full inclusion checks. The omitted-count assertion still derives from that
independent expected list; its description changes from five to nine overall.
No renderer assertion, tolerance, recipe, detection or test machinery changes.

## Verification

Root's independent review cleared original 09bbfb36. Its unfiltered 404-task
canonical gate was stopped after additional real render workloads appeared;
parent 20064 and verified descendants were stopped, and session 82615 drained
with exit -1. The original JSON receipt is empty/incomplete, with no totals,
pass or build. The exact owned process tree and diagnosis remain in the ignored
packet. No runtime/save fault or unreliable-test rerun is claimed.

The earlier DEEP-ART-SRC 26-task plan also remains an observed deferred plan,
not a passing result. A fresh canonical nearby lane run with jobs 4 and build
will follow review of the corrected frozen source. Root owns integration
metadata, review, merge and cleanup. No full or night pass is claimed.

## Removed

Remove accidental daytime dispatch of the four newly proven render suites.
Nothing is removed from the full/default inventory or any renderer suite.

## Integration acceptance

Frozen source e9d33f511dbaaf8828a7602b7168b404148ae13b passed its original corrected unfiltered canonical lane: 405/405, total405, failed null, failures[], notRun0, exit0, jobs4, 2268762.0174ms. The existing selector regression also passed in that gate. One build on the same unchanged clean source passed, exit0, Vite723ms,359modules; the existing chunk-size warning remains. Root's same-reviewer confirmation of the actual four-suite render classification is clear. The earlier stopped09 run is incomplete, not a pass/failure or unreliable rerun; its truth remains above. This real source merge is conflict-free and gets no rerun. Exactly nine proven renderer suites wait for night; Salt/Vesper exports, all native assertions and full/default inventory remain. Summit and the podium source lanes can now sync this accepted policy and run their ordinary nearby gates. No full/frame/balance/browser pass, release or push is claimed. Root recycles only this run's clean merged lane and consumed evidence after the final verdict is committed.