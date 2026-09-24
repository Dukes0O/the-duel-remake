# BAL-02 design: combat payoff and Easy hits

## Choice before code

The current 30 no-weapon baseline races cannot prove that a player can wreck a CPU car. A bounded flagged trace of seed 1989 shows the existing `all` policy fires two UFOs, twelve bombs, zero crossbows and seven Stars, lands one rival hit and causes no wreck. The `crossbow` policy fires no shots in that race. First make a deterministic, legal strong-player scripted policy that can acquire and damage the rival often enough to test wrecks. Keep weapon cadence and damage rules unchanged until that test measures them. This reverses cleanly by removing the policy and restoring the previous report list.

Flagged Easy has six enemy hits against the zero-to-three target, while Medium/Hard have four/six. Earlier retained owner traces show one CPU and five raider hits in the Easy sample. Diagnose the five raider contacts by shot, range and seed before selecting a narrowly scoped aim or firing change. Preserve win-rate bands and the flag-off path. Reverse any selected tuning by restoring its previous seeded parameters; do not alter targets.

## Tests before implementation

Add a red acceptance case that the strong-player policy actually fires at an in-range rival and can produce a CPU wreck across the pinned sample. Add deterministic Easy owner/shot traces and assert the target hit band on the existing sample. Recheck all win-rate bands, Medium/Hard hits, crossbow accuracy, flag-off replay fingerprints and 30/60/144 repeatability after any change. No expected fingerprint or assertion changes without a documented before/after trace and independent review.

## Baseline and limits

The passing 238-suite full tier on integration b2e9380 has 162 unchanged replay fingerprints. Current flagged full combat report: Easy/Medium/Hard CPU hits 6/4/6. The sampled `all` policy has zero opponent wrecks. This note settles the method, not a numeric adjustment before the trace. No browser evidence is claimed yet.

## Removed

Nothing yet. The rejected old BUG-06/07 candidates are not restored.

## Resumed design evidence

The legal-input pursuit diagnostic caused one player-owned opponent wreck on Easy and two on Medium with unchanged damage. It follows the normal steering controller and varies only throttle/brake to remain about 30 m behind the rival. Keep this as a separate strong-policy sample; the historical seven policies and ten-seed no-weapon win samples stay fixed.

Easy seed 1989 takes paired raider hits at 29.69/30.56 s and 81.53/82.35 s. Trial a 1.6-second Easy camp shot gap instead of 0.8 so drivers can recover between aimed shots. Medium/Hard keep 0.8; every member still gets one shot per lap when a target stays present. This is a bounded candidate, accepted only if all existing balance bands pass; aim, damage, and CPU cadence remain fixed for this trial.

## Candidate validation

The first 1.6-second Easy camp-gap candidate passes the complete flagged balance report: wins 8/5/3 of ten; pinned enemy hits 3/4/6; crossbow probe 12/26; maximum own-bomb speed loss 4.53%; maximum UFO gain 3.31 seconds. Separate legal pursuit causes 2/2/0 player-owned CPU wrecks and completes all three races. Its results do not replace the no-weapon win/hit samples. The new 11-case payoff/cadence suite failed in five cases first and now passes all eleven.

Changed assertion: the old enemy-aim target-selection test assumed a 0.8-second gap on its default Easy field. It correctly failed when the second projectile was absent. It now runs the same nearest-target, stationary-exclusion, per-member and lap-renewal assertions on every difficulty at 1.6/0.8/0.8 seconds. No target-selection or shot-count assertion was removed. Independent review is required before merge.

## Gate and independent review

- Lane: 134/134 suites passed in 432.14 seconds, including 162 unchanged replay fingerprints and 48/48 expansion driving races.
- Build: passed. Existing chunk-size advisory remains.
- Legacy complete balance check passed: wins 9/6/2 and enemy hits 1/3/7; crossbow accuracy 0.50. Flagged report results are above.
- Independent review by the separate career-lane agent using reviewer.toml found no actionable defects in source, pursuit inputs, attribution, test changes or documented results. The reviewer did not edit this lane.
- Browser: no presentation changes; headless real-race pursuit and existing gameplay tests provide the card's evidence. No new visual claim.
- Removed: replaced the uniform camp-gap constant with difficulty-specific spacing; no discarded player data, assets or simulation path. No replay expectation changed.
