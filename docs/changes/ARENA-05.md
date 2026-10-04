# ARENA-05: Ambush Alley

status: tests-first; source not started

## Settled rules

Kyle's 4 October answers are recorded in SCRAPDOME section 10. Waves have
3, 4, 5, 6 and 8 fighters, with a buggy in waves four and five. Every fighter
must be down and the buggy wrecked; neither returns during that wave.

The Pit cover ring is eight metres clear of the solid pile: radius 16 with
the native radius-8 pile. The parked car must also clear that pile. Salt uses
the midpoint of its longest low-curvature run. No world geometry changed.

Pay is 60 per completed wave plus 150 for all five, times difficulty.
Hold is five per completed wave in the existing venue territory, once.

## Checks

Merged the whole current integration branch automatically as c57ca423.
Focused native suite: 25 cases, 33 executed checks, one pass and 24 expected
failures. The off/invalid-entry control passes. Both venue admissions fail;
the independent dev flag is missing; 18 rule cases stop at missing native
entry; two geometry cases stop at entry; the real App rank-12 entry fails.

The blocked checks cover native wave counts, completion and no respawn,
ten-second gaps, fort wear and hostile RPG flight, wrench timing, venue and
spawn geometry, free foot movement inside walls, rank, partial/full pay,
hold, owner/repeat protection, and seeded fixed-step results. No successful
gameplay, browser or full-tier evidence is claimed.

Existing admission assertions are unchanged. Their positive fixture flags
now name the card's independent ambush-alley switch. The two-direction test
requires distinct bearings, without adding an angle threshold.

Minimal observable contract for the builder: arena.ambushAlley holds wave,
completedWaves and fort (x/y/z, health/maxHealth, cover); real wave fighters
use the existing raids roster; the actual buggy has arenaRole ambush-buggy.
Tests progress through Duel.step, native damage and native settlement, not
fixture-written wave results. Fort health tests measure distance to its
defence point; its cover supplies the wrench contact position.

Native entry, dev flag, App rank routing, arena progression, raider/buggy
respawn rules, fort projectile and wrench hooks, foot boundary and settlement
remain to build. The Director must grant shared files beyond the card's
current hooks. No source, saves, dependencies or replay fingerprints changed.

## Removed

Removed obsolete unanswered-rule questions after Kyle settled them. No code
or assets removed; no acceptance assertion weakened.
