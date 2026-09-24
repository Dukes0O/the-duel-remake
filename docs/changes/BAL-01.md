---
task: BAL-01
status: review
kind: tooling
flag: none
player_facing: no
---

## What changed

The headless balance tool accepts `--flags wasteland2`. The selected flag reaches
all production App races and Duel weapon probes, including the ten-seed baseline,
all seven weapon policies, 26 crossbow cases, and ten own-bomb speeds. The default
keeps Wasteland 2 off. Both modes use the same existing target limits.

Importing the tool no longer starts a report. Its exported functions support
small acceptance tests; only programmatic race calls can shorten the frame
limit. CLI reports still run the original complete race workload. Invalid CLI
flags, values, probe seeds and incompatible options fail before races start.
The App uses disposable memory storage, restored after each call.

Reports identify selected flags, sample scopes, win rates, hits and wrecks by
difficulty. Wrecks separate player, opponent and traffic victims, with attacker
counts for player, CPU, raider, environment and unknown. The tool observes
combatWreck and trafficWrecked events. Legacy vehicleCrushed events are outside
that stated scope. TrafficWrecked currently identifies a player collision;
missing armor-wreck ownership remains unknown, except scenery is environment.

## Evidence

Independent acceptance tests were committed first at `99c7795`; all 13 failed
before implementation. `node tools/test-combat-balance.mjs` now passes all 13.
It verifies real armor activation for every race policy and both weapon probes,
flag-off defaults, genuine victim/owner wreck events, aggregation, strict CLI
validation and every retained target boundary. `git diff --check` passes.

Each complete report below was run exactly once, sequentially, on the implemented
BAL-01 tool and the lane's existing game code. Each covers 21 policy races and
30 baseline samples (three baseline races are reused from the policy set), for
48 unique races. No short frame limit was supplied.

| Command | Exit | Total seconds | First 12 races, seconds |
| --- | ---: | ---: | ---: |
| `node tools/combat-balance.mjs --check` | 0 | 69.72 | 13.02 |
| `node tools/combat-balance.mjs --flags wasteland2 --check` | 1 | 72.93 | 13.77 |

### Baseline targets

Win samples use the no-weapon policy and seeds 1989 through 1998. The existing
CPU-hit check uses only the no-weapon race at seed 1989. That legacy metric
counts enemy combatHit events whose victim is player; with Wasteland 2 enabled
it also includes raider hits. It is retained unchanged and stated in the report.

| Mode | Difficulty | Wins / 10 | Win target | Baseline enemy hits | Hit target |
| --- | --- | ---: | --- | ---: | --- |
| Off | Easy | 9 | 80-95% | 1 | 0-3 |
| Off | Medium | 6 | 45-65% | 3 | 2-6 |
| Off | Hard | 2 | 20-40% | 7 | 4-10 |
| wasteland2 | Easy | 2 | 80-95% | 12 | 0-3 |
| wasteland2 | Medium | 2 | 45-65% | 10 | 2-6 |
| wasteland2 | Hard | 4 | 20-40% | 9 | 4-10 |

### Weapon targets and measurements

| Measure | Off | wasteland2 | Target |
| --- | --- | --- | --- |
| UFO gains, Easy / Medium / Hard, seconds | 0.28 / 0.36 / 0.16 | 4.75 / 2.06 / -0.30 | Each at most 4 |
| Maximum-level UFO gains, Easy / Medium / Hard, seconds | 0.57 / 0.07 / -0.72 | 1.88 / 2.62 / 5.27 | Each at most 4 |
| Crossbow probe | 13 / 26 (0.50) | 18 / 26 (reported 0.69) | 0.35-0.60 |
| Own-bomb maximum speed loss | 4.53% | 4.53% | At most 15% |
| Crossbow race shots / hits | 11 / 5 | 15 / 11 | Informational |

Mean time gains across the three seed-1989 difficulty samples, in policy order
UFO / max UFO / bomb / crossbow / star / all:

- Off: 0.27 / -0.03 / 1.10 / -0.74 / 0.86 / 3.76 seconds.
- wasteland2: 2.17 / 3.26 / 1.62 / -0.51 / 4.63 / 0.10 seconds.

### All-race hit and wreck totals

Each difficulty below covers 16 unique races: seven policies at seed 1989 and
nine additional no-weapon seeds. These are totals, not per-race target samples.
All enemy hits have victim identities; all observed wrecks have known owners.

| Mode | Difficulty | Rival hits | Enemy hits on player | Wreck victims: player / opponent / traffic | Wreck owners: player / CPU / raider / environment / unknown |
| --- | --- | ---: | ---: | --- | --- |
| Off | Easy | 5 | 18 | 0 / 0 / 0 | 0 / 0 / 0 / 0 / 0 |
| Off | Medium | 8 | 61 | 0 / 0 / 0 | 0 / 0 / 0 / 0 / 0 |
| Off | Hard | 6 | 123 | 0 / 0 / 0 | 0 / 0 / 0 / 0 / 0 |
| wasteland2 | Easy | 14 | 213 | 17 / 5 / 0 | 1 / 5 / 16 / 0 / 0 |
| wasteland2 | Medium | 14 | 207 | 19 / 2 / 0 | 1 / 6 / 14 / 0 / 0 |
| wasteland2 | Hard | 11 | 155 | 12 / 6 / 0 | 2 / 5 / 11 / 0 / 0 |

### Open gameplay gaps

The flag-off report passes every check. The flag-on report fails exactly seven:

1. Easy wins: 20%, below 80-95%.
2. Medium wins: 20%, below 45-65%.
3. Easy UFO gain: 4.75 seconds, above 4.
4. Hard maximum-level UFO gain: 5.27 seconds, above 4.
5. Crossbow hit rate: 0.69, above 0.60.
6. Easy legacy enemy-hit count: 12, above 3.
7. Medium legacy enemy-hit count: 10, above 6.

Both reports finish every policy and baseline race, meet the 120-second pace
limit, and report no enemy hits without victim identity. These gameplay gaps
need combat follow-up cards. No limits were relaxed and no gameplay was tuned.
The diagnostics may merge independently of those open balance gaps under BAL-01.

## Behavior and test changes

No runtime source or acceptance-test assertions changed. No world signatures or
race fingerprints were regenerated. The independent short flag-off comparison
passes; a separate fingerprint suite was not run by the builder. Browser checks
are not applicable to this headless tool. No live server or real saves were used.

Independent runner and reviewer results, the required lane/build gate, and
TRACK-02 completion remain required before integration. The Director coordinates
those checks; the builder did not repeat a broad gate.
