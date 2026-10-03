# BALANCE-W2-OFF-RETIRE: remove retired switches

Status: building.

## Decision

Kyle approved on 30 September 2026: the released `wasteland2`, `scrapdome`,
`titan-climb`, `muddy-hollow` and `warlords` paths stay on. Remove their
switches and code that exists only to support turning them off. Preserve the
released on behavior and race fingerprints. Combat balance uses one run with
the released rules on.

AUD-17 still owns `src/sound-bank.js`. Its cue gates and feature-catalog
removal stay deferred until that hook is released. No retired-switch guard was
found in `src/warlords/vultures.js`; that file remains untouched.

## Checks

Before code: combat-balance acceptance 40/40, feature-switch suite 32 checks,
and Wasteland beta catalog suite 10/10 pass.

Current focused evidence: the arena event/UI, Wasteland discovery, Warlord
format/hooks/settlement, Side Saws, and preview-launcher suites pass 102/102.
The Muddy Hollow suite passes 49/49 after removing its switch gates while
keeping the discovery checks and unchanged race fingerprints. Full lane tier
The combat-balance CLI suite passes 33/33 after removing its Wasteland on/off
selection and running its default samples with the discovered released rules.
Full lane tier and build are still required after the remaining source, tooling,
and scenario changes.

The first current lane-tier run reached 8/342 tests, then stopped at the
unchanged `tools/test-audio.mjs` check that expects eleven runtime recordings.
That test also fails unchanged on integration. The production build passes;
Vite reports its existing large-chunk advisory. Lane tier must pass before
merge.

## Removed

- Removed the `wasteland2` gate from discovered Wasteland access and the
  `titan-climb` gate from the player's off-road capability. The released
  behavior remains available; gate discovery still controls access to the
  Hidden Road.
- Removed off-switch rejection from warlord start, intro, fight-hook and
  Side Saws paths. Deleted Warlord tests that only proved those switches could
  close released features. Kept territory-hold, discovery, unknown-ID,
  ordinary-race fingerprint, and positive fight checks.
- Removed the arena event's Scrapdome and warlord switch gates. Unfinished Fuel
  Run, Bounty Hunt, Salt Flats, invalid requests and undiscovered Wasteland
  access remain gated.
- Removed the inactive Side Saws visibility gates from the Armory and yard
  router. Deleted off-only Side Saws and arena UI checks; kept positive
  entitlement, discovery, damage, settlement, and yard-only launch checks.
- Removed Muddy Hollow switch checks from course creation, paint, reward
  settlement, exploration collection and garage hints. Discovery still decides
  when a race can enter the Hollow. Removed tests that only proved the switch
  could hide released content; undiscovered-course and ordinary-road checks
  remain.
- Removed the global flag argument from Wasteland unlock checks. Saved gate
  discovery now controls access directly.
- Removed the Wasteland on/off option and duplicate off samples from the
  combat-balance runner. Arena and on-foot balance scripts also use the released
  rules without setting a global Wasteland flag. Arsenal remains an optional
  measurement.
- Updated operations guidance to use one combat-balance report with discovered
  Wasteland rules. The root `AGENTS.md` update stays for the integration owner;
  lane rules forbid editing that file here.
- The global feature catalog, audio hook, remaining tests and scenarios still
  need retirement. `src/sound-bank.js` remains with AUD-17 until that lane
  releases it.
