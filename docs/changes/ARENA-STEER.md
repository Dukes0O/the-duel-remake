# ARENA-STEER

## Settled rule and scope

Kyle's30September rule requires full lock of at least100degrees/s at15–50mph and75degrees/s at each car's floor top speed. Only a course whose definition has both `venue === true` and `arena === true` gets the arena factor. Road courses and legacy Titan arena race aliases keep the released formula. The shared authority function takes the actual course as an optional fifth argument; existing three- and four-argument callers remain exact.

One factor,3.4, multiplies both the steering and tyre limits. The stock Falcone at15mph with the Scrapdome's.95traction sets the lower bound; the existing filters retain their response times. Player integration and the arena computer pilot pass their actual course. Sal's vulnerability window retains its separate.5scale on the resulting authority. The App demo driver hook waits for WAR-PAY to merge before editing its shared file.

## Tests first

Independent test-author commit `8fc29c9` added179checks:112intended failures and67passing controls. Before runtime code,36additional checks cover every car with engine-only upgrades and with full upgrades plus its matching driver. They measure actual player and computer full lock, each upgraded floor cap and monotone release at the resulting grip. The combined suite is215checks:130failures and85passes before implementation. Existing assertions and road pins are unchanged.

## Validation

Pending runtime implementation, focused regressions, full108-round arena balance and private High/Performance browser checks. No lane or build gate claimed. Kyle's Preview steering feel review remains pending.

Baseline arena full-state hashes (seed1989,120Hz,12seconds, recipe in the unchanged arena replay helper):

- Last Car Rolling: `0232347a421e1538010224b6a9318fab706212f254838c085a6be1d3d865ed7b`.
- Sal: `98591aee36e0b8ee0087e40b7cd28b315aed0e46f8c908356043b45605137348`.

The baseline balance report is in integration `.evidence/2026-09-30/ARENA-STEER/balance-before.json`; the after report is pending. Road controls are the ten full-state traces committed by the independent author in `tools/replays/arena-steering-controls.json`.

## Changed assertions

None. New upgrade/driver checks supplement the independent stock suite. No existing assertion or fingerprint was changed.

## Sound

No new event: existing tyre, engine and Sal cues remain unchanged.

## Removed

No behavior or asset is replaced. The arena's old steering ceiling is superseded only inside the real venue gate; the same function retains the released road ceiling. No duplicate driving path or runtime dependency is added.
