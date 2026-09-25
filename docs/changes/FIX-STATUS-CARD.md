# FIX-STATUS-CARD: preserve phase suffixes in lane ownership

## Design before code

The generated status page reports `codex/gfx-01-p2` as GFX-01. Its branch-name regex stops after the base number, hiding the actual active polish card. Preserve an optional `-P<number>` suffix in the recognized card identifier while retaining ordinary base IDs and unknown branch names. A title or extra branch-description suffix must not become part of the card ID. This is display metadata only: branch age, dirty state, merge ancestry, deletion protection and full-tier evidence rules remain unchanged. Reverse by restoring the prior extraction if the fixture finds a compatibility issue.

## Tests first

An independent fixture must fail for GFX-01-P2 and EGG-02-P1 before the regex changes, and retain the base-card and unknown cases. Required lane/build and independent review follow the fix.

## Removed

Replace the truncated phase-card extraction. No branch, runtime code, save or test assertion is removed.


## Red and focused green

The independent fixture failed on the unchanged source: `codex/gfx-01-p2` reported GFX-01 rather than GFX-01-P2 (229 checks reached, one failing scenario). The narrow regex now retains an optional numeric P suffix. All 250 checks pass, including EGG-02-P1, a descriptive suffix after GFX-01-P2, ordinary BAL-02 and unknown names. Existing source/evidence validity and no-side-effect assertions are unchanged.
