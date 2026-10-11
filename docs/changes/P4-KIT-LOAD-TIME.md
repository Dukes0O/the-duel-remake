# P4-KIT-LOAD-TIME

Status: building; focused source checks passed; native timing remains queued.

## Design before code

Trust is the required full build/test clearance of repo-owned offline metadata.
Direct createTrackKits callers default to full geometric clearance. Only the
renderer passes validateClearance:false to skip that expensive step. Metadata, real source finite
geometry/bounds, lift, lamps/materials, actual terrain roots, readiness and
resource ownership stay unchanged. No receipt, hash or Claude metadata burden.

Full validation first checks transformed model boxes against conservative road
segment boxes expanded by maximum road width plus4.5m. Nearby or uncertain
placements retain every original vertex, centroid and edge-midpoint check.
Physical bank footprints always retain full checks. The owned test CLI fully
validates a verified circuit source module with its actual High/LOD GLBs;
registered authored placements also run in the mandatory lane suite. Every
track card runs this full validation before merge with:
node tools/test-track-kits.mjs --validate-circuit <tracked circuit module>.

Batch by roughly100m of road. Main chooses one High/distant version per visible
chunk using actual camera distance/frustum, keeping the160m detail boundary.
Only actual placement matrices enter packed batches; inactive mesh.count is0.
Rear temporarily selects nearby behind-car chunks, distant only within the
existing220m range, then restores main counts, visibility and statistics in
finally. It reads the real player orientation and never changes race state.
No rear-view module edit, placement removal or new art round.

## Checks

Focused trust regression was RED before implementation:672 triangle projections
instead of0. It is now GREEN, including packed counts, real camera frustum,
near/spanning/full physical-patch clearance, moved poses, nested rear scopes,
exact restoration on success/throw, and disposal during a rear draw.

Native activity witnesses now read visible mesh.count rather than obsolete
nonzero hidden-matrix storage. The no-High Performance assertion stays exact;
new checks require count/placement indices equality and no submitted zero scale.
The functional gallery camera is80m above ground, within the actual160m detail
range. Native GPU main/rear counts and exact main restoration are prepared.
Full High/LOD clearance passed for all1969 placements in Claude's frozen
Harbour91ef3e20 via the owned --validate-circuit CLI. Native timing is pending.
Current source has no asset, road, simulation, save or placement edits.
Focused source-only checks pass; syntax and whitespace checks pass.

Owner presentation constructionMs is entry-to-genuine-ready elapsed, including
actual asset wait/parse, source validation and assembly. Disjoint activeCpuMs
sums normalization, real source validation and assembly only. Pending/failed
owners never fabricate completed timing. Focused actual20ms asset-wait test
passes; acceptance uses the total, with no subtraction.

Dense QA config is unpacked and explicitly env-pinned to actual frozen Harbour
91ef3e20; alias only authored definition and additive own-field QA admission.
It preserves our engine, jitter, form and laps. No production course/flag edit.
Fresh paired off/on native fixtures use identical seeds/rules/eight cars. Only
kitPlacements is omitted before the baseline world builds, so CPU work is not
masked by merely hiding the group. Exact full state and actor poses match;
each native sample retains complete state/profile/storage before/after.
Same120 unmeasured/360 measured frames, two pair orders, original10% limit and
18.5ms delivered p95. GPU timers cover genuine main plus rear; none discarded.
Reusable owned exports: installMainRearMeasurement and measureMainRearFrames;
other track recipes may import the sampler after this exact source is reviewed.
Native actual eight-car grid/old-town witnesses are prepared; the native .95
circuit driver reaches old town through actual rules, with no position staging.

Genuinely synced approved integration fbc7d76c; source/native timing remain
unclaimed. Existing required gate/build and ordinary QA-patch review are queued.

Actual dense Harbour construction under1s and quiet High/Performance grid and
old-town frame checks (original10%/18.5ms limits) remain queued; no pass claimed.

## Removed

Replace the whole-route zero-scale hidden instance path in the same change.
Remove repeated geometric clearance only from the explicitly trusted runtime
renderer path; preserve full clearance in tests and build validation.
