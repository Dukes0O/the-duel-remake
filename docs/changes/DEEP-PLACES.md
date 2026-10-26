# DEEP-PLACES

Build and save verification; switch `the-deep` is already on.

Design settled before code: keep the existing rule-owned first-visit event,
three-second authored title and optional `deep.places` list. The existing App
Deep settlement saves visits. An old save gets an empty discovery list without
adding fields to its stored profile. Pause an in-progress Ana line for a title,
then resume at its audio position with its caption time preserved.

The base already implements place entry, persistence and HUD titles. This lane
fixes the active-line overlap and adds a direct legacy-save regression.

Checks: `test-deep-story`, `test-deep-save`, lane tier (jobs 4), build;
FINISH-DEEP owns browser story evidence. No frame timing.

Changed assertions: none. Added tests cover a caption interrupted by a title and
legacy saves missing `places`. Existing first-entry, saved-revisit, App save and
three-second HUD tests remain unchanged.

Result: first-visit, saved visits, legacy loads and audio pause/resume tests
pass. Independent code/save review approved, including delayed decoding before
and after a title. The final added pearl-marker test passes separately; the
story/explorer set passed 20/20 before that assertion was appended. Save suite:
32 acceptance groups; broader save safety: 109/109 checks. Production build
passed. Lane evidence and the unchanged sea-life timing failure are recorded
in FINISH-DEEP; this lane is not represented as a fully green gate.

## Removed

Removed the behavior that let Ana continue over a title already on screen.
No save fields or existing progress removed.
