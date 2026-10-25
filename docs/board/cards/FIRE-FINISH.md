# FIRE-FINISH

Claude flies a fire out and lets one burn, fixes what feels wrong, sends Kyle pictures, prepares the release.

Owner: Claude. Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds state,
needs and locks.

Packet section 16. Pictures of the call, a drop, the fire out and each
regrowth stage. The release waits for Kyle's word and holds `release` only
then; the `forestFire` switch turns on only after a release that already
carries FIRE-SAVE's unknown-key rule.

## Claude answers (15 October): what the play-through settled

- **The fire's clock.** One spread step per 200 s of engine time, the
  length of a real bucket round trip with refuels (measured headless and in
  the browser), so the section 4.5 targets, tuned at one drop a step, hold
  in the air. At 90 s a fire answered at once took 11 drops and 36 minutes.
- **Sarah's regrowth news** takes the one save field FIRE-HOOKS left for
  this card: `burnt[course].heard`, the last news heard, only forward. She
  speaks at the first helicopter visit of each stage; one line a visit.
- **Pictures for Kyle:** the FIRE-VIEW round 2 sheet (fire, drop, each
  regrowth stage from the air and in a race) and this card's play-through
  sheet (call, drop, fire out, lost, closed course), sent directly; the
  looks folder has no room to commit a second sheet.
- **The release** waits for Kyle's word; `forest-fire` stays `dev`.
## Claude decision under rule 18, 15 October 20:50

Kyle's new standing approval (AGENTS rule 18) makes go-live Claude's call for
finished, green work. The forest-fire missions are finished and their
finishing pass is done; `forest-fire` switches on in the next release (tonight's
Summit release if it goes green, otherwise the next one). The release note
tells Kyle afterwards. waiting_on is cleared.
