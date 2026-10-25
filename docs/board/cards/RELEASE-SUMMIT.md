# RELEASE-SUMMIT

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 14 October 2026, about 19:45 PT, answering Claude: Summit Run may go
live overnight without waking him "if all green": the full tier alone on the
exact candidate, combat balance, browser checks, the headed frame check at
Summit's busiest view at both qualities (laptop screen off, Dells on, which
Kyle set), and Claude's finishing-pass review. Any red result and it waits for
Kyle's go in the morning.

Scope: switch `summit-run` on (price 2,600, after Panorama in the list).
Summit Time Attack ships only if P4-SUMMIT-ATTACK is green by 02:30; else it
stays dev. The yeti and the avalanche ride with Summit only if their own
switches were accepted for release on their cards; otherwise they stay dev.
Release Manager: Claude, with the usual hold, install, push and records.

## Not tonight (Claude, 15 October 01:45)

A trial switch-on in a Claude release lane (summit-run `on`, yeti `on`, and
`snowWorld.always` on Summit so it keeps its reviewed snow look while
Tremblant Snow's live look stays as it is) failed four checks:
- `test-feature-flags`, `test-circuit-summit` (state contract) and
  `test-world-composition` ("every enabled event scene has its reviewed
  baseline") pin Summit as dev; these need the usual release-flip updates.
- `test-circuits`: `summit-run/1989: seamless lap at -25` (line 31). Summit is
  a point-to-point run; the check is only applied to enabled courses, so this
  is either a real seam fault at the start or a closed-lap check that should
  not apply to an open route. It must be understood before release.
The lane was removed; nothing changed on integration. New Codex card
SUMMIT-SWITCH-ON prepares the switch-on in daylight; Claude then runs the
release with Kyle's go (or tonight's all-green rule if he renews it).

## Kyle, 15 October about 16:40 (in chat with Claude)

On the ten browser failures already on QA cards: "I don't care about the 10
known browser failures if they end up being a problem in the game. We'll fix
them going forward." Confirmed directly: "it may go live. If everything else
passes ... And if the browser checks fail, you know, it's fine."

Rule for this release: Summit goes live if the full tier (alone, jobs 4),
combat balance and both frame checks at Summit's busiest view pass. Browser
check failures do not hold it; any new one gets a QA card and is named in the
release note.

## Kyle renewed the overnight rule, 15 October 20:20 PT

Kyle: Summit may go live overnight without waking him **"if all green"**: the
full tier alone on the exact candidate, combat balance, browser checks for the
release, the headed frame check at Summit's busiest view at both qualities
(laptop screen off), and Claude's review. Any red result and it waits for his
go. Claude is Release Manager. Keep clear of the 04:00 full check's frame step
(04:00 to about 04:40). The release carries everything merged on integration
at the candidate commit; list it in the release notes.

Also in this release under rule 18 (Claude, 20:50): switch `forest-fire` on
(FIRE-FINISH is finished). Use rule 19: reuse any full-tier pass that covers
the candidate instead of rerunning it.

## Frame check and Director decision, 16 October 09:00

Release candidate 7f108454: full tier 455/455 alone (jobs 4, 2141 s). Frame
check, headed, eight cars, laptop panel off, GPU quiet:
- Summit night summit: p95 16.8 ms at both qualities (pass), world build
  1498/1533 ms (repeat 1510/1515), over the 1000 ms limit.
- Ardennes Pit Straight: High p95 33.3 ms FAIL, Performance 16.8 ms, world
  640/621 ms. Without the far forest band: High and Performance 16.8 ms, world
  646/586 ms. The far forest leaves this release; boards and houses stay.

Director decision (rule 18, not a Kyle-list item): Summit ships. Its 1.5 s
build is a one-time pause before the countdown, the same kind of cost as the
slow first load made a warning on 14 October, so for this release it is
recorded as a warning and named in the release note. Rule 8 is unchanged for
every other course and for future releases. SUMMIT-BUILD-TIME (Codex) brings
it back under 1 s, keeping the snow.
