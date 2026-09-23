# Narrow CPU bomb-use fix — `a3ad4ee`

**Release decision: hold.** This fix preserves physical CPU pickup use while
restoring the earlier Hard stock UFO comparison. The exact integration merge
gate, build and private browser smoke pass. The six UFO time-gain targets
still fail, so the composite full check and live release remain held.

| Check | Result |
| --- | --- |
| Changed lane | 93/93 suites, 162 unchanged replay comparisons, production build. |
| Exact integration merge gate | 160/160 suites in 166.12 s. |
| Production build | Passed; existing large render-chunk advisory remains. |
| Private High/Performance smoke | Four screenshots, zero warnings and zero errors. |
| Combat balance | 21 policy races and 30 baseline races in 56.79 s; only six UFO gain failures. |

| Measure | Easy | Medium | Hard | Target |
| --- | ---: | ---: | ---: | --- |
| No-weapon player wins | 8/10 | 6/10 | 2/10 | 80–95% / 45–65% / 20–40% |
| CPU hits on player | 1 | 2 | 10 | 0–3 / 2–6 / 4–10 |
| Stock UFO two-lap gain | 9.59 s | 45.52 s | 22.11 s | ≤4 s each |
| Max UFO two-lap gain | 26.31 s | 62.24 s | 76.18 s | ≤4 s each |

Crossbow aim remains 13/26 hits (50%, target 35–60%); own-bomb speed loss
peaks at 4.53% (target ≤15%). A collected CPU bomb now replaces a scheduled
crossbow only at 35 to under 50 m, where its close-range use makes sense.
At 50–65 m, the CPU fires its ordinary crossbow and retains the bomb. In 30
no-weapon races, Medium collected 17 pickups and used eight; Hard collected
four and used three; Easy collected none. The Hard stock UFO gain is back to
22.11 s, its value before CPU pickups were introduced.

The exact-distance BUG-04 branch, target-only swap and smaller once-per-race
prototypes all remain isolated. The narrowest trial can make the existing
four-second checker green while giving Medium 8/10 UFO-policy wins and slowing
Hard; it is not an acceptable gameplay fix. No test threshold was changed.

The previous composite full check was red. This report is a partial merge
check, not a second composite full check or a live release. The live `master`,
game server and real saves were not changed.
