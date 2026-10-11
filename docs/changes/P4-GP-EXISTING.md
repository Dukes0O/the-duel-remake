# P4-GP-EXISTING

Status: building. Claude settled best-lap ghosts; playback remains Time Trial only.

## Design before code

Offer Grand Prix on the three original closed road circuits and six expansion
circuits, behind the existing grand-prix switch. Use the settled eight-car,
three-lap field with no traffic, police or radar. Keep course IDs, geometry,
layout versions and every existing mode unchanged. Widen only if the full-field
check proves a particular section cannot work.

Grand Prix records use additive mode keys and three-lap validation; legacy
record and ghost keys remain exact. The score screen offers a separate GP
filter; All existing modes retains its old event key. A valid finish records without credits,
loss charges or milestones; pay belongs to P4-CAREER. Grand Prix records a separate best-lap ghost per event, route and mode,
for the later Team Room. Playback stays Time Trial only. The same course access rules still apply.

The Director granted narrow hooks in race-field, app and progression, plus
FIELD test updates. The previous High Country rejection expectation will use
Titan Arena instead: the test still requires unsupported events to reject GP.
This reflects newly supported road circuits, with no tolerance change. Internal
leaderboard deduplication now includes mode so old Duel and Time Trial rows can
coexist; their serialized event keys remain unchanged.

## Checks

Test-first eligibility failed on missing High Country support before code.
The GP best-lap recorder starts from native grid and interpolated line crossings;
completed unassisted laps alone can replace the mode best. Existing ghost keys,
Time Trial playback and storage caps remain exact. Native checks cover
every grid, first corner and narrow stretch with eight cars. The focused
246-check pass covers eligibility, state parity, mode rows and pure lap ghosts.
The later native App run was interrupted for the four-lane cap; no verdict.
A failing twelve-valid-TT fixture proved new GP admission silently evicted an
old recording. GP admission now rejects count/byte overflow before eviction,
keeps the original store bytes (including archives), and retains a queryable
session candidate. Results explicitly say storage full or save failed; no claim
of persistence. Eleven pure storage checks pass; old TT admission is unchanged.
Restored original UTF-8 punctuation in owned sources. Browser, save re-review,
current lane/build remain pending. Root source review and named save-guardian
review cleared 4cb54419 (11 storage checks plus 247 save fixtures). This final
presentation-only cleanup keeps the new GP notice readable. No art change.

## Removed

No runtime asset or legacy mode is replaced. Remove the stale menu claim that
Grand Prix cannot record once recording is wired. No width change is assumed.
