# ARS-01: Harpoon, Caltrops and wave-one computer use
The native weapons and presentation are implemented. This card remains held:
Kyle must approve the saved CPU assertion and new sound-file permissions;
complete balance coverage, Claude's cable picture and lane/build gates remain.

## What changed
- Harpoon uses a leading 70 m/s projectile, full carrier velocity, a 4 degree
  launch cone and a literal 50 m travelled range. A hit deals 6 armor with
  existing damage levels, adds exactly 6 m/s body-sideways toward the shooter
  and tethers for 3 s. Private road-lateral and forward impulses use ordinary
  damping; active knock takes the yank directly without a deferred duplicate.
- Actual player input or CPU steering requests break the tether after 0.5 s
  of inclusive 0.6 steering away, accumulated across neutral intervals.
  Shield, either wreck, separation over 60 m and expiry also break it.
- Caltrops places an 8 by 5 m terrain strip 3 m behind the car for 8 s. The
  owner has one second of grace. Each body takes 4 armor once; contact refreshes
  four seconds of grip 0.75 and speed 0.9. Tether caps speed at 0.8.
- Native player, road CPU and arena CPU share the limits. Rank-three/five
  purchases and levels extend saves; normalization never grants ownership.
- CPU checks four positional conditions without a cooling weapon hiding a
  ready one. Arsenal Medium decisions now take 4.5 s; pace eight, all armor,
  other difficulties and released decision intervals stay unchanged.
- Four actual rust-orange cable meshes sag about 0.4 m at midspan. Pooled
  geometry, positions, normals and scratch update in place at actual anchors.
  Forty spikes per strip, at most twenty-four strips and four cables remain
  bounded. Rendering is read-only. Menu and restart clear visible effects;
  the cable pool is reused until disposal releases its resources.
- The report retains every historical sample and target, adding separately
  labelled complete pursuit and fixed rear-defense races with legal inputs.
  All four real CPU uses count; Harpoon fire counts once, separately from flight.

## Tests first and independent review
Independent weapon tests preceded Source at 37924a1; motion/contact regressions
preceded each repair. All 77 native cases now pass, including twelve decision
checks added before Source at 320ba2b. The real cable regression preceded its
repair at 56a67d6. Independent Source review clears timing, geometry and lifecycle.
Attachment error is at most 0.000012 m; measured midspan sag error is 0.000002 m.
Current 35 projectile, 13 ram, 7 solid-contact and knock cases pass with old
replay pins exact; prior accounting passed 33 cases. Every reset clears impulses.
Independent review reproduced and approved these narrow new-fixture corrections:
- The rotated yank fixture's old road scalar measured the wrong axis and side.
  World magnitude and body-sideways six toward the shooter, body-forward zero,
  exact road projection and exp(-1.5/120) damping now measure the real impulse.
- Road CPU ceiling fixtures start 5 mph above the ceiling; 0.05 let both native
  controls brake below it in one step. Literal ceilings 160.8 and 180.9 compare
  with controls 164.2167 and 184.3167; player and arena assertions stay intact.
- Genuine Harpoon/Caltrops validator rows are appended, preserving all original
  policy/difficulty samples, three-row assertions and zero-use Oil/Smoke controls.
  Bounded use rows are never called complete; full-report fixture rows are retained.
- A 60 degree, 196 mph barrier was glancing (0.557927 below sin(35 degrees)).
  The reviewed 55 degree, 170 mph fixture has incidence 0.636269 and 108.502 mph
  above the 100.5 threshold. Opposing control is 97.212 mph; exact damage,
  threshold, signed forward contribution and quarter-damping assertions remain.
- Real mesh endpoint checks replace the old Line reader and strengthen the native
  limit from four metres to 0.05 m in three dimensions. Pool, buffer identity,
  disposal and browser's existing 0.05 m endpoint limit remain checked.
- Two new timing assertions allow only Float64 roundoff: a native 0.025 s
  boundary evaluates as 0.025000000000000355. Independent review confirmed that
  one extra tick still fails; exact tick limits, counts and actor order remain.
No settled rule, historical sample, balance target or replay pin changed.

## Saves
Backup regressions came first at f03c568. All 14 new cases pass with 88 reached
checks; seven historical fixtures, quota and recovery checks pass unchanged.
The real normalizer adds level zero only to earned future Harpoon/Caltrops.
Verified backup retains original formatting, future fields and every career.
Save Guardian approves byte preservation and the front-attack correction:
rank-six Easy seed 1989 naturally carries Harpoon, Star, Caltrops and Oil.
The Crossbow-only assertion remains 99/100 because automatic approval review
requires Kyle's explicit permission to accept Crossbow or Harpoon.

## Remaining acceptance
The first timing lever wins 19 of 30 Medium races (63.33 percent); all finish,
with 7.53 CPU hits per race and complete attribution. Armor stays unchanged.
All six fixed rear-defense races finish; Oil and Harpoon have measured uses,
but Smoke remains zero. The complete Arsenal report finishes all 147 races
and 36 probes; every other target passes. CPU uses are Oil 5, Smoke 0,
Harpoon 81 and Caltrops 34. The released Wasteland control passes all 141 races
and 36 probes. Native diagnosis finds ready Smoke windows between scheduled
decisions or ending in wrecks; the next natural coverage direction goes to Claude.
Fresh actual High/Performance browser passes twenty checks with no errors,
warnings or failed requests; QA panels are absent. The clear rust-orange cable
picture goes to Claude. Frame pacing remains; old UI overlaps go to Phase 3 polish.
Audio measurement regression 09cdeb6 failed before Source. Analysis-only silence
makes short cues measurable without changing OGG bytes or playback; independent
review clears it. All 18 private CC0 variants rebuild: true peak -4.72 to -2.43
and 157061 bytes. Padding is labelled; mixed capture and listening remain.
Audio tests pass 17 controls and fail the same 19 missing-runtime checks.
Automatic review requires Kyle's shared bank, renderer and catalog permission;
all remain unchanged. No silent cue or failed coverage trial is complete.

## Removed
Replaced two-user rear scheduling, level-blind backup, wrong-axis yank,
airborne strip height, per-frame tether arrays, clipped forward wall impulse,
raw-Source browser imports and the thin Line presentation in the same work.
No current asset or replay pin was removed. Raw review output stays ignored.
