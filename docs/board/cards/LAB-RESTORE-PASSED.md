# LAB-RESTORE-PASSED

The short board entry controls current state, ownership, dependencies and locks.
Design: `docs/LAB.md`.

Found in the FINISH-DEEP update (28 October 2026, night): in the walking Lab
(`lab-2` on) the Rust bench's Restore button opens only after the five-step
Rust lesson, even for a player who already passed Rust.

Claude decides: a player who has passed Rust reaches Restore straight away
from the Rust bench (the lesson stays available to replay, never required
twice). Same for any other bench whose action sits behind a passed lesson.
Update `tools/scenarios/lab-restore.mjs` to the walking Lab's real clicks.
No save shape change. Lane tier and build.