# LAB-RESTORE-2

The short board entry controls current state, ownership, dependencies and locks.

THE_DEEP 6.9 and LAB.md 7 (changed 25 October 2026). Replace LAB-RESTORE's
single 2,500 restore with two steps:

1. **Get her running** on the Rust bench (1,000): the soak, current and
   mechanical strip part of the existing show (no body restoration). Adds
   `falcone_sirena` to `unlockedCars` with her paint set to the new
   `sea-wreck` finish, which is owned for her from then on.
2. **Restored 1966** finish (1,500) in the garage's paint list for the
   Sirena only: plays the rebuild and paint part of the show, then owns and
   applies `restored-1966`. Never removes `sea-wreck`; both stay selectable.

The car loader draws SIRENA-WRECK-ART's crust when `sea-wreck` is applied.
Saves (`save-shape`): owned finishes per car use the existing paint-finish
save; an old save where the Sirena was restored under LAB-RESTORE (dev only,
never live) keeps her and gets both finishes. Money and saves: one
independent review (paying twice, two tabs, short credits, forged values,
old saves). Tests, the lab-restore scenario updated, lane tier, build.
Needs SIRENA-WRECK-ART for the drawn crust (the rules can land first).
