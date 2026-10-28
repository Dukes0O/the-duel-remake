# DRIVE-LESSON-SAVE

Task: DRIVE-LESSON-SAVE. Kind: additive saved progress and settled lesson reward. Status: built; required nearby lane/build/save review pending. The lesson gameplay and driving-lessons switch are separate cards and remain off.

Optional profile.drivingLessons stores version1 plus done/best/rewarded maps. Old profiles gain no field; reading absent progress returns no lessons completed. Known corner values are validated, future lesson keys/additive fields retained, and a newer version is preserved without allowing this build to award through it.

finishDriveLesson accepts only corner, an unlocked valid car and a finite positive challenge margin. It marks completion, keeps the largest winning margin and atomically grants the first reward. grantDriveLessonReward also handles a saved done-but-unrewarded completion. Both return a new profile with ok/changed/reward details; failures leave the original profile intact. Retakes can improve best but never pay again, including after save/reload or changing cars. The reward is exactly one brake level on the passed car; level3 or factory-maxed brakes instead earn600credits, within the existing1billion-credit ceiling. Other upgrades and additive profile fields are retained.

## Acceptance and changed assertions

Seven focused acceptance cases were written first (initially missing module), then passed. The save checker passed13historical fixtures/437first-load and round-trip checks in memory-only storage. Its roster grows12to13 for the new11-driving-lessons fixture; existing heli/fire and medal fixtures remain. Added checker assertions preserve lesson data exactly when present and forbid adding the field to older profiles. No prior fixture expectation was loosened. Cases cover old saves, immutable updates, best retakes, duplicate prevention, maxed/factory rewards, invalid IDs/cars/margins, pending reward, future additive data/version and independent named players.

## Removed

Nothing. This is the card's saved-progress foundation, with no new test framework, runtime dependency, storage key, real-save operation or live installation.

## Save review correction

The independent save review found the existing career-backup suite also pinned12fixtures; its first assertion failed13!==12. Director named that narrow hook and changed only the roster to13. All backup/migration/restore assertions remain. The original0ce86e2b canonical run was cancelled before editing, not passed or a completed gate; final source requires a fresh complete nearby gate/build and same-reviewer confirmation.

The corrected c9a70ed7 gate then found the third save-directory roster pin in test-arena-settlement (13versus12):53passed/1failed/209unrun. Source search identified all three pins; only the remaining roster count changes here, with every settlement assertion retained. Original failed gate is retained as lane-c9a70ed7-failed.json; no runtime reward change.
