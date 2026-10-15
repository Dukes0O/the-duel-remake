# P4-CUPS

Adds the approved Mountain, Night and Winter Cups and Grand Tour. The pure rules own eight-place points, countback and final-race tie breaks. The running cup fixes car, driving difficulty, CPU difficulty and actual field seed, and receives only native eight-car classifications through the current App/result/player identity. Normal course ownership, air transport and fire closure admission remain. Cup controls and garage trophies require both grand-prix and the existing dev grand-prix-career switch; no production switch changes.

Optional per-player cups state preserves old saves without adding a field. Only completed, individually settled race receipts can bank a final cup; one trophy/bonus per cup+difficulty, once per run, existing wallet ceiling and history limits. Abandonment discards cup progress and pays nothing, keeping prior race earnings. Grand Tour needs wins in the three earlier cups at any difficulty. Audio uses the existing native Grand Prix finish cue; no new sound or audio hook.

## Assertions and validation

New card-owned tests were authored before the pure implementation; no existing assertion, tolerance, fixture or fingerprint changes. First nine focused tests pass, including actual memory-only App admission and optional-save/banking guards. A complete actual Mountain Cup acceptance has been added using existing native App/line-driver fixture, all three real races and actual classifications, but is UNRUN pending shared capacity. Final lane gate/jobs4, build and independent save/pay/code review remain pending. No live install.

## Removed

Nothing replaced. Ordinary individual Grand Prix starts, race settlement, records and ghosts remain on their existing path. No temporary runtime substitute or generated placements.

Independent review found a real long-break failure:60unrelated race results could evict an early cup receipt from display history and strand the final round. Added regression failed first. Each native cup result now retains its exact existing race settlement key, validated against settledResults; no short-history dependency or inferred current menu index. Existing real-result/player/sequence guards remain. Review confirmation and native acceptance pending.

The same review found App reads into preserved future cups state. A new native fixture reproduced its missing-results crash. App now treats versions above1 as opaque, preserving them while allowing ordinary races. The broad negative-pattern focused command was interrupted after partial output and is not a pass; use positive named checks and the final full native suite.

Review confirms corrected production66eaf555 CLEAR. Added stronger native acceptance inside the same3races: reload the real App after race1 from memory storage, preserve exact series/seed/classification, switch to a new named player with no cup or bonus, return to the owning player and continue. No extra race/harness or production change.13historical save fixtures/437checks and27pure progression checks pass unchanged; review additionally passed damaged-save/backup/storage/combat-wallet/quit guards, storage model3.54/4MB. Full native/lane/build remain queued, not pass.

Corrected frozen implementation passes11/11bounded cases in5.05s; the full3race run is separately queued. The native admission case also explicitly refuses owned-but-unflown Jesko at the NightCup Harbour entry with helicopter on, keeping actual default location and active cup empty. No fake placement or admission bypass.

The named existing GrandPrix result-screen hook now displays actual cup round progress and final points/placing plus the separately banked bonus/trophy. Off-state and individual GP markup stay exact. A new result-presentation case failed first and then passed; full native acceptance also renders each actual race result. Reuses MainMenu/Courses controls; no router/action or audio change. Removed the unused App cup-availability wrapper; presentation uses the existing pure availability function directly. Final review confirmation pending for the narrow result hook.
