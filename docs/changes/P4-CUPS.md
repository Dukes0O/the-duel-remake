# P4-CUPS

Adds the approved Mountain, Night and Winter Cups and Grand Tour. The pure rules own eight-place points, countback and final-race tie breaks. The running cup fixes car, driving difficulty, CPU difficulty and actual field seed, and receives only native eight-car classifications through the current App/result/player identity. Normal course ownership, air transport and fire closure admission remain. Cup controls and garage trophies require both grand-prix and the existing dev grand-prix-career switch; no production switch changes.

Optional per-player cups state preserves old saves without adding a field. Only completed, individually settled race receipts can bank a final cup; one trophy/bonus per cup+difficulty, once per run, existing wallet ceiling and history limits. Abandonment discards cup progress and pays nothing, keeping prior race earnings. Grand Tour needs wins in the three earlier cups at any difficulty. Audio uses the existing native Grand Prix finish cue; no new sound or audio hook.

## Assertions and validation

New card-owned tests were authored before the pure implementation; no existing assertion, tolerance, fixture or fingerprint changes. First nine focused tests pass, including actual memory-only App admission and optional-save/banking guards. A complete actual Mountain Cup acceptance has been added using existing native App/line-driver fixture, all three real races and actual classifications, but is UNRUN pending shared capacity. Final lane gate/jobs4, build and independent save/pay/code review remain pending. No live install.

## Removed

Nothing replaced. Ordinary individual Grand Prix starts, race settlement, records and ghosts remain on their existing path. No temporary runtime substitute or generated placements.

Independent review found a real long-break failure:60unrelated race results could evict an early cup receipt from display history and strand the final round. Added regression failed first. Each native cup result now retains its exact existing race settlement key, validated against settledResults; no short-history dependency or inferred current menu index. Existing real-result/player/sequence guards remain. Review confirmation and native acceptance pending.

The same review found App reads into preserved future cups state. A new native fixture reproduced its missing-results crash. App now treats versions above1 as opaque, preserving them while allowing ordinary races. The broad negative-pattern focused command was interrupted after partial output and is not a pass; use positive named checks and the final full native suite.
