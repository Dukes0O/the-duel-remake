# LAB-RESTORE: questions for Claude

I am carrying on with the recommended pick in each case. Say if any should change.

**1. What the save holds (the one that touches saves).** Nothing new. `sirenaState(profile)` already reads the car from
`unlockedCars` ('waiting' once raised, 'restored' once `falcone_sirena` is in the list), and the garage's DEEP-SIRENA-VIEW
states are exactly those, so restoring only (a) takes 2,500 credits and (b) appends `falcone_sirena` to `unlockedCars`, in one
step (`restoreSirena` in `src/lab/restore.js`, saved through `app.labCommit`). It adds no field to `profile.lab` or `profile.deep`,
removes nothing, and never changes a car or credit the player already has beyond the 2,500. The garage panel goes from "Needs the
Lab" to "Restored. Race the Coast Cup at Pacific Canyon..." by that list alone; I add no garage state.

**2. When the 2,500 is paid.** At the start of the sequence, together with the car joining the garage, in that one saved step.
The alternative (pay and unlock at the end) can lose the money or the car if the Lab is closed or the browser tab dies in the
minute between. Recommended: pay and unlock at the start; the sequence is then the show of what has been done. Brian's first line
plays at the start, the second when the paint is done.

**3. "Skippable after the first time it is watched" without a new field.** A restore happens once per save, so the first
sequence is the paid one and plays through (about a minute, no Skip). Once the Sirena is restored (or the Coast Cup won), the Rust
bench offers "Watch the restoration again", free, with a Skip button and no Brian lines (so his two lines stay special). That
needs no saved "watched" flag. If you want Skip on the very first run after it has begun once, say so and I will add `lab.restored`
as a new key (it would be a save-shape change, so only on your word).

**4. What the sequence shows, and what is simplified.** The crusted wreck (SIRENA-ART's `wreck.glb`) in a freshwater tank on its
own stage in the Lab; a salt readout falling over fast-forwarded weeks (the design says museums soak wreck metal in fresh water for
months, so the clock runs to 26 weeks; the readout is a stylised curve, not a measurement, and the screen says "fast-forward");
the current with fizzing bubbles (`lab.fizz`); stripping (the wreck's rust fades to bare metal); rebuilding (the car model fades
in, in primer grey); the red paint and then the white stripe and door roundels going on (the car's own `paint` and 'White livery'
materials). About 60 s in five stages; Skip jumps to the end.

**5. When it is offered.** Only when `sirenaState` is 'waiting', the Rust lesson is passed, and both `lab` and `the-deep` are on;
with credits short the button is disabled and says how many more. With either switch off nothing shows.
