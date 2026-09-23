# BUG-07 CPU combat balance follow-up

Status: building. CPU hit bands pass on the standard Pacific Canyon run and
the contact-heavy Titan Arena run. Medium and Hard ten-seed win rates pass;
Easy remains 10/10 against the standard autopilot, above its 80–95% target.

## Cause and physical changes

The earlier no-weapon Pacific Canyon baseline (seed 1989) produced CPU hits
Easy 1, Medium 7, Hard 1 and ten-seed wins 10/10, 8/10, 1/10. A seed-1989
trace showed Medium's 7 hit events included four near-simultaneous hits from
one bomb ring at 28.0 s. A focused test reproduced eight hits from one
overlapping ring before this fix. Cars now get 0.3 s of blast recovery after
a bomb impact; the same focused ring causes one physical shove and hit.
Player and enemy bombs use the same rule. The recovery follows simulation
time, stops while paused, and resets at stage setup.

Hard fired once at 5.0 s before this follow-up. Its bomb shoved the player
into oncoming traffic at 5.5 s, causing a real head-on crash near road
position 209 m. By 12 s the rival was 349 m ahead; the rival then spent
2,947 of 3,237 race frames more than 180 m ahead and had 20 out-of-range
attack opportunities. The crash is retained. Its existing visible control
lock and recovery are unchanged. The 30 s crash time penalty does not decide
the duel's win flag, which compares actual stage time to the rival finish.

The Medium Wasteland rival now cruises 8 mph faster and fires every 6.8 s
instead of 7 s. The Hard Wasteland rival cruises 15 mph slower, fires every
5.3 s instead of 5 s, and has a 0.03 radian aim cone instead of 0.018. When
Hard pulls more than 90 m ahead, it gradually eases its target speed toward
140 mph by a 180 m lead. Its normal braking, steering, road limits and
traffic still govern the motion. The rule is limited to Wasteland; ordinary
duel pace and replay behavior stay unchanged. The final seed-1989 Hard trace
records 13 fires, 10 in-range and 3 close timer opportunities, seven player
hits, and no crash.

## Measured result

All runs use stock Falcone F42, Casual Wasteland, default driver, memory-only
storage, a 1/30 s fixed step and no player weapons. Ten-seed results use
seeds 1989–1998. All 30 races complete.

| Difficulty | Pacific hits, seed 1989 | Titan hits, seed 1989 | Pacific wins, ten seeds | Target wins |
| --- | ---: | ---: | ---: | ---: |
| Easy | 1 | 0 | 10/10 | 80–95% |
| Medium | 5 | 5 | 6/10 | 45–65% |
| Hard | 7 | 9 | 3/10 | 20–40% |

On Pacific seed 1989, fired attempts changed from Easy 2, Medium 8, Hard 1
to Easy 2, Medium 10, Hard 13. They produced 1, 5 and 7 player hits,
respectively. The trace records each weapon, signed gap and hit victim so a
short bomb ring cannot masquerade as several separate attacks.

Each course's CPU hit count is within the Easy 0–3, Medium 2–6, Hard 4–10
bands. `tools/test-cpu-combat.mjs` now asserts both courses and the single
blast impact. The 792-case player crossbow matrix remains 421/792 (53.2%)
with 141/264 Easy, 140/264 Medium and 140/264 Hard hits. Own-bomb momentum
passes at 48, 97, 193 and 320 km/h, with 4.36% maximum speed loss.

An Easy cruise increase up to 40 mph was tested and removed. It raised the
observed rival peak speed to about 195 mph, yet the player still won all ten
seeds; the closest finish lead was 323 m (seed 1996). A further pace increase
would change the Easy driving feel substantially for a single sampled loss.
Easy's win-rate gap remains visible. The CPU still does not use UFO swaps or
collect pickups; those parts of F7 remain separate gameplay work.

`tools/trace-cpu-combat.mjs` records shot types, range, victim, crashes,
race pace and in-range opportunities. Its `--baseline` mode summarizes all
30 standard races. The canonical `tools/combat-balance.mjs --check` was copied
temporarily from integration and run against this exact branch. It finished
21 policy runs and 30 baseline races in 79.16 s, with the first 12 in
14.72 s. It reported CPU hits 1/5/7, controlled crossbow hits 13/26 (50%),
and own-bomb maximum speed loss of 4.53%. It exited 1 only because all six
stock/max UFO time-gain checks still exceed 4 s: stock Easy/Medium/Hard
9.55/74.25/33.85 s and max 26.27/90.97/50.57 s. Those failures belong to
the separate, still-open BUG-04 balance work. The canonical tool on this
branch reports win rates but does not enforce their target bands. The
separate TST-03 checker change will make Easy's 10/10 result a failing check.
That gap remains open; this follow-up does not claim full BUG-07 acceptance.

Focused CPU combat, bomb momentum, 792-case crossbow aim and 162 replay
checks across 18 cases pass. The production Vite build passes. The changed
lane gate passes 154/154 suites in 320.5 s.
