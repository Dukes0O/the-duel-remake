# CREW-04: Computer crews

status: merged after current lane/build and independent review

## Rules

Claude's 4 October gear answer: repairs use the wrench, including Odessa's
2 s perk. A reachable signature attack is used once, then RPG, at most
three attacks. Dune uses bolts; Jax and Wren use RPG only; Rook keeps his perk.
Claude's 5 October pacing answer: braking, exit, return and one-car pull-away
add at most 2.5 s beyond native repair/weapon work. Idle waiting is overhead;
lock/reload and the player's unchanged 3 s recovery are work. Ordinary Hard
catch-up follows. The permitted fallback limits Hard repair to once per race;
Medium remains once per lap. Triggers, weapons and ranges remain unchanged.

Claude's 9 October admission answer: road and stop conditions must hold for
one continuous second, owned by ordinary driving outside overhead. Breaking
a condition resets the timer; crossing the road center does not. Once braking
starts, finish the stop without aborts. An enemy car within 80 m during repair
causes immediate entry before another repair tick.
The later answer applies both admission remedies: choose the nearest existing
safe shoulder on either side; reject without cost when the unchanged whole
stop cannot fit 2.5 s. Exterior shoulders keep priority. The existing inner
edge fallback remains eligible only when BOTH exterior corridors are blocked.

## Source

The cpu-crews dev switch admits discovered Wasteland races. Seeded members
use native driving, fighter contact/damage, gear, recovery, laps and contacts.
A stopped car cannot drive or fire. Rendering does not change race state.
Computer fighters reuse the bounded scene pool and spatial landing/repair/
RPG/crew cues. No sound asset or player save is added.

Admission previews the exact shared pull-over math at 1/120 s on private pose
and push scalars, reserving the existing .6 s return/car-length window. Existing
collision geometry rejects blocked corridors and swept approaches. No race
clone, events, RNG or live actor writes occur during preview.
The Director granted a narrow read-only raiders hook: reuse native target
order, speed and 82 m range, nextShotAt and the player's currentLap shot limits.
Known recovery within the sample and already-fired targeted raid shots keep
unsafe admission closed. Native camp fire, aim, timing and damage are unchanged.

Whole Baron integration 9ab1476a was synced without conflicts as 579a555b. Gunn's aimed rocket origin,
flight and car behavior remain; Crew's shared fighter path replaces the obsolete
player-only adapter. Independent review restored the original raider bounds
(feet−.25 to feet+2.05 m), with native upper/lower Rocket Pod controls.

## Checks and review

Acceptance tests preceded each remedy. The exact exterior position, blocked
fallback, no-cost wide-road and scheduled-threat rejection, continuous road
qualification, committed braking, 80 m entry and native recovery remain checked.
No cap, attack, finish or existing equality assertion was relaxed.
Positive arranged ambush fixtures first run actual native camp fire/projectile
steps, then arrange initial stop conditions. They do not mark firedLap, alter
nextShotAt or clear projectiles. The original full-native seed3004 retains real
seeded traffic/camp and every stop/cap assertion. Delayed safe admission gives
.3916666666666653 s braking and .6833333333333442 s whole overhead.
The query interleaving replay preserves every native race/raider field.

Current Crew: 66 cases / 323 checks pass, including the recovery-edge fix.
Exact union 579a555b passes 360/360 lane tests in 960.23 s; build passes in 461 ms.
Rocket contacts: 94 checks; Gunn: 279; Crew gear: 33; twelve released combat
fingerprints unchanged. Independent Frames review covers source and fixture
corrections. Ordinary replay: 162 checks unchanged. Final matching Hard passes.

Final matching recipe: Arsenal + cpu-crews, none, Hard seeds1989–2018,
unchanged club driver/Falcone F42, casual, startStage0. Ten wins (33.33%);
all30 finish. Six repairs/returns; no ambushes, attacks, aborts or unfinished
stops. Maximum braking .7583333333339368 s, actual whole-stop overhead
1.0500000000009815 s. The read-only observer changes neither race nor driver.
Source SHA-256: dfa9dd7695398f5cec1df79c7a12f23530ebb8a71d68190f7cde5c7e24934af1.
The matching prior-source sample has the same wins/stop totals and maxima;
earlier cpu-only reports are supplemental. The previous native cross-road
cap failure (2.7167 s) remains in text history; its same assertion now passes.
Original seed3004 first-camp browser passes High/Performance: three RPGs,
entry, .2833333333333474 s one-car pull-away and full two-lap finish. Four
screenshots, zero issues/warnings, private memory-only port56368. Reviewed fixture
lead160 m instead of200 m allows ordinary admission motion within150–400 m.
Cleanup EBUSY was separate from the scenario verdict. Exact private browser,
harness and port are stopped; temporary profile awaits OS-unlocked cleanup.

## Diagnosis retained

Unchanged b1b7a419 thirty Hard comparison: off 6/30, members without stops 6/30,
full 18/30; all90 finish and in-car matches off exactly. Full had21 attempts,
six repairs/five ambushes/ten aborted attempts; five extra wins had only aborts.
Medium pursuit1989 had no departure shove or lingering fighter but reached a
later turn faster without braking. The separately merged all-seed driver card
fixes that legal input policy; Crew did not edit the driver.

## Removed

The duplicate player-only fighter/body/damage/splash paths and obsolete held
hook notes were removed. The pull-over overhead abort was removed. The private
maneuver calls the same motion helper as native braking. No asset, licensed
file or save format was replaced.
