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
Real assets/terrain, dense runtime work and native timing are not yet rerun.
Current source has no asset, road, simulation, save or placement edits.
Focused source-only checks pass; syntax and whitespace checks pass.

Actual dense Harbour construction under1s and quiet High/Performance grid and
old-town frame checks (original10%/18.5ms limits) remain queued; no pass claimed.

## Removed

Replace the whole-route zero-scale hidden instance path in the same change.
Remove repeated geometric clearance only from the explicitly trusted runtime
renderer path; preserve full clearance in tests and build validation.
