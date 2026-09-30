---
task: WAR-SAL-RELEASE
status: review
kind: release
flag: warlords
player_facing: yes
---

# Sawtooth Sal in the real game (30 September 2026)

Kyle beat Sal 3-0 on Medium in the Preview and asked for her in the main
game. `warlords` goes from dev to on: the territory map launches Sal's fight,
the first win pays 600 times the difficulty factor (WAR-PAY), and the Side
Saws are earned and equipped as settled in docs/SCRAPDOME.md section 5.
Nothing is added to the main menu; the fight is reached from the Wasteland.
Dome steering (ARENA-STEER) and shoving sitting cars (ARENA-SHOVE) are still
being built and release separately; Sal's tuning waits for Gratian's play.

## Changed assertions (reviewed)

Each checked that warlords was off in production; the release turns it on
by Kyle's written go-ahead.

- `tools/test-feature-flags.mjs`, `tools/test-wasteland-beta.mjs`: warlords is
  expected on, and production has it on.
- `tools/test-warlord-format.mjs`: "keeps warlord development off" becomes
  "released alongside the Scrapdome".
- `tools/test-preview-launcher.mjs`: drops the check that warlords is a
  development switch; the rule (every development switch is requested) stays.
- `tools/test-side-saws.mjs`, `tools/test-warlord-settlement.mjs`: the
  switch-off cases now force the switch off with an override instead of
  relying on the default, so the switch-off path stays tested until the switch
  is removed.

## Tests

Lane tier and build; full tier and release evidence on the release commit
(docs/board/run-log.md).

## Removed

Nothing yet: the warlords switch and its off path go with
BALANCE-W2-OFF-RETIRE's switch clean-up once the release settles.
