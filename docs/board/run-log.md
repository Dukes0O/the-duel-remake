# Wasteland run log

## 2026-09-23 PDT — final held-lane reviews

- Audio-forward `2f5e3cc` passed its final 170-suite lane, 162 replay checks,
  build and all ten measured sound checks in a fresh private browser race.
  Remaining cues and human listening keep it off integration.
- The independently reviewed FOOT-00 throwaway spike `4cc9556` supports
  course-lookup movement. Its code will not merge; FOOT-01/03 still need the
  production body, car-centered boundary and target-aligned aim.
- Charged CPU crossbow `8d9bc24` passed independent review, 93-suite lane,
  build, private browser smoke and the unchanged 162 replay comparisons.
  Fixed-seed balance retains wins 8/6/2 and CPU hits 1/2/10; only the six
  existing UFO rows fail. The branch stays held by the balance stop line.
- A spec review recorded open live-cutover, autonomous-profile and beta-gate
  wording decisions in `overnight-handoff-2026-09-23.md`.

## 2026-09-23 PDT — overnight handoff prepared

- The latest exact integration gameplay commit is `a3ad4ee`; docs are at
  `26a006b` before this handoff. The merge, browser and art partial checks
  pass, but all six UFO time-gain targets remain red. No live release was made.
- `overnight-handoff-2026-09-23.md` lists the held, tested branches, the UFO
  design decision, and the resume order. Audio-forward `2f5e3cc` now keeps
  the final 250 ms cue tail, corrects a pitch-check octave error, and passes
  all ten measured sound checks in a fresh private race. It remains held for
  unfinished cues, human listening and the balance stop line.

## 2026-09-23 PDT — CPU bomb pickup range corrected

- Reviewed BUG-07 balance fix `40e01a0` and cherry-picked it as `a3ad4ee`.
  A collected bomb replaces a scheduled CPU crossbow only within 35 to under
  50 m. Real pickup use remains: Medium collected/used 17/8, Hard 4/3 in 30
  races. Wins remain 8/6/2 and CPU hits 1/2/10.
- The changed lane passed 93/93 suites. Exact integration passed 160/160
  merge suites in 166.12 seconds, build and private High/Performance browser
  smoke with four screenshots and zero console issues. All 11 private browser
  scenarios and art intake also pass on this source. The exact balance run
  still fails only the six UFO-gain rows; Hard stock gain returned from 57.87
  to the pre-pickup 22.11 seconds. See
  `checks/2026-09-23-a3ad4ee-balance-hold.md`.
- The live game and real saves are unchanged. No full-check success or
  release is claimed.

## 2026-09-23 PDT — physical CPU pickups merged; balance hold remains

- Reviewed BUG-07 pickup slice `4bfeb30` and cherry-picked it as `505639e`.
  Easy ignores pickups; Medium and Hard collect only on physical contact and
  use a star or a scheduled bomb/crossbow without extra shots or changed
  attack timers. Ten-seed wins remain 8/6/2; CPU hits remain 1/2/10.
- The changed lane passed 168/168 suites. Exact integration passed 160/160
  merge suites in 212.50 seconds, build, private High/Performance smoke, all
  11 browser scenarios, and art intake. Browser reports contain 13 screenshots
  and no warnings or errors. The exact balance run fails only the six UFO
  time-gain targets. See `checks/2026-09-23-505639e-balance-hold.md`.
- CPU UFO pickup use and BUG-04's design decision remain open. The live game
  and real saves remain untouched; no full-check success or release is claimed.

## 2026-09-23 PDT — current integration code tier passed

- On `b48e3cf`, the standalone full code tier passed 167/167 suites in
  243.53 seconds. The live checkout remains unchanged. This is a partial
  check; the six known UFO time-gain failures still hold the composite full
  check and release.

## 2026-09-23 PDT — art intake validation merged

- QA-02 `6ba035b` and `96a8e1f` add the missing full-check art command and
  harden PNG, alpha, prompt and credit validation after independent reviewers
  found false passes. The actual ART-A reference board validates in its
  isolated branch; integration reports all seven Batch A images as planned
  and absent, not delivered.
- The final lane passed 165/165 suites. Exact integration passed 159/159 merge
  suites in 261.42 seconds, production build, the art command and private
  High/Performance browser smoke: four screenshots, zero warnings or errors.
  The UFO balance stop line still blocks a live release.

## 2026-09-23 PDT — Easy CPU balance and replay review merged

- BUG-07 Easy tune `a26319a` raises physical Wasteland rival pace and sets
  its aim error to the spec's 10°. With Q5 police off, ten no-weapon Pacific
  races give player wins Easy 8/10, Medium 6/10, Hard 2/10, all inside their
  bands. CPU hits are 1/2/10; crossbow hits are 13/26 (50%) and own-bomb
  speed loss peaks at 4.53%. All six UFO time-gain checks remain red.
- The first exact merge gate caught the expected Pacific Wasteland replay
  fingerprint change. Independent review approved the one changed case at
  30/60/144 FPS; 17 other cases and inputs were unchanged. Reviewed update
  `2077364` passed 158/158 exact merge suites in 203.16 seconds, build and
  private High/Performance smoke with four screenshots and zero console
  issues. The balance stop line and live-release hold remain.

## 2026-09-23 PDT — prompt checkpoint recovery and combat police exclusion merged

- BUG-13 `1fd711f` resets immediately after a physically missed lap gate.
  Medium Pacific Canyon seed 1989 no longer loses nearly a lap after a
  crossbow shove. Its exact merge gate exposed a real interaction: CPU hits
  fell to one, below the required 2–6 band.
- Q5/BUG-14 `1f6d418` removes legacy radar, pursuit and tickets from Wasteland
  only. Its focused fixture failed before and passed after; ordinary Duel
  radar stays active. The combined Pacific CPU hits are Easy 1, Medium 2,
  Hard 10. Exact integration passed 158/158 merge suites in 291.74 seconds,
  production build and private High/Performance smoke with four screenshots,
  zero warnings and zero errors. The balance stop line remains for Easy wins
  and UFO gains; no live release.

## 2026-09-23 PDT — exact CPU attack intervals integrated

- BUG-06/BUG-07 combat slices through `a85acad` use the spec's exact 10 / 7 /
  5 second repeat intervals. The changed lane passed 154/154 suites and build;
  the exact integration state passed 156/156 merge suites in 244.36 seconds,
  build, and private High/Performance smoke with four screenshots and no
  warnings or errors.
- Pacific Canyon seed 1989 CPU hits are Easy 1, Medium 5, Hard 4; Titan Arena
  hits are 0, 5, 10. Ten Pacific seed wins are 10/10, 6/10, 2/10. Easy's
  win-rate target, CPU UFO/pickup behavior, and the UFO gain target remain open.
  The balance stop line and live-release hold remain in force.

## 2026-09-23 PDT — TST-03 balance win-rate gate merged

- The balance report printed ten-race win rates but omitted their target ranges
  from `--check`. TST-03 `c20e8f0` now enforces Easy 80–95%, Medium 45–65%,
  and Hard 20–40%, and rejects missing samples. Independent review was clean.
- The changed lane passed 161/161 suites and build. The exact integration merge
  passed 153/153 suites in 379.97 seconds, build, and private High/Performance
  browser smoke with four screenshots and no warnings or errors.
- The current game measures Easy and Medium 10/10, so the corrected balance
  gate remains red alongside the known UFO and CPU-hit gaps. No live release.

## 2026-09-23 PDT — QA-01 browser evidence runner merged

- The full check had no supported all-scenarios command and manual QA rebuilds
  erased earlier screenshots. QA-01 `a0682b1` now runs every named browser
  scenario in sequence and archives each report and screenshot outside the
  rebuilt QA bundle.
- On its final lane source, 11/11 scenarios passed with zero warnings or
  errors. All 11 archived reports and 13 screenshots exist. The lane passed
  160/160 suites in 300.82 seconds and private High/Performance smoke.
- Exact integration `a0682b1` passed 152/152 merge suites in 171.89 seconds,
  the production build and private High/Performance smoke: four screenshots,
  zero warnings or errors. The separate combat balance hold remains.

## 2026-09-23 PDT — OLD-03 and test-debt fixes merged

- Reviewed OLD-03's assertion audit and merged it as `518c99d`. The audit found
  two tests that could pass without reading a saved record or switching players.
- Reviewed and merged TST-01/TST-02 as `ed46beb`. The new tests save and reload
  real route and named-player records. Mutation checks prove the assertions
  catch dropped and shared best times; production source was not changed.
- Exact integration state: 152/152 merge suites in 308.44 seconds, production
  build passed, and private High/Performance browser smoke passed with four
  screenshots and zero warnings or errors. The prior full-check balance hold
  remains in force, so only its fix work can merge until that gate is green.

## 2026-09-23 PDT — five-merge full check held for balance

- On exact integration commit `731a075`, `npm ci --offline` and the 160-suite
  full code gate passed in 327.67 seconds. All 11 available private browser
  scenarios passed. The 64-player origin budget and short master-versus-
  integration frame pacing comparison passed.
- The combat balance `--check` failed: stock/max UFO gains exceed four seconds
  at every difficulty, and the standard race gives Medium/Hard only one CPU
  hit each. The art-intake command named in the playbook is absent. No release
  was made. See `docs/board/checks/2026-09-23-731a075.md` for measurements and
  fix proposals.

## 2026-09-23 PDT — RFX-05 input contexts merged

- Reviewed and cherry-picked `8bc9d35` as `881759a`. The exact integration
  state passed 152 merge suites in 186.24 seconds and the production build.
  Private High/Performance smoke passed with four screenshots, zero warnings
  and zero errors.
- A branch-only browser smoke failed in its second tab because that branch
  preceded the FND-10 QA tab-isolation fix. The same browser flow passed on
  integration with that fix. Menu, foot and photo contexts cannot drive the
  car or fire car weapons; future foot/photo actions remain mapped for their
  later features.

## 2026-09-23 PDT — RFX-06 attachment registry merged

- Independent review found duplicate object ownership and incomplete car
  retirement. Both were fixed and tested before cherry-picking `2f9bfdb` and
  `c28d919` as `b9a1c7e` and `b9e40c5`.
- The exact integration state passed 151 merge suites in 196.19 seconds and
  the production build. Private High/Performance smoke and the focused slide,
  spin, tumble and jump browser scenario passed with zero warnings or errors.
  The pose screenshots were inspected for detached rigs.
- RFX-05 and RFX-07 reached review on isolated branches; FOOT-00 started as a
  throwaway spike. TOOL-02 reached review with measurement failures filed for
  later sound and feel work.

## 2026-09-23 PDT — BUG-05 bomb momentum merged

- Reviewed and cherry-picked `bcb4272` as `660119a`. The exact integration
  state passed 151 merge suites in 320.77 seconds and the production build.
  Private High/Performance smoke passed with zero warnings or errors.
- Bomb rings inherit the thrower's forward and sideways speed. The quarter
  strength self-blast leaves 0%, 0%, 0%, and 4.36% speed loss at the four
  required speeds, below the 15% limit. BUG-04 remains open independently.

## 2026-09-23 PDT — OLD-02 shared best-time retirement merged

- Independently reviewed the backup-before-delete sequence, durable storage
  flush, both import paths, and per-player result settlement. Cherry-picked
  `ceb78b0` as `fbe4389`.
- The exact integration state passed 150 merge suites in 161.15 seconds and
  the production build. Private High/Performance smoke passed with four
  screenshots, zero warnings and zero errors. The legacy shared key is removed
  after a verified backup; player-specific best times remain.

## 2026-09-22 PDT — FND-10 storage budget merged

- Reviewed and cherry-picked the verified archive prerequisite, origin budget
  and QA tab-isolation fix through `4222720`. The exact integration state
  passed 149 merge suites in 152.70 seconds and the production build.
- Private High/Performance smoke, two-tab career isolation, and the focused
  career-backup browser scenario passed with zero warnings or errors. The
  64-player fixture is 5,515,688 raw UTF-16 bytes; the migrated origin uses
  230 physical bytes including an unrelated key. A maximum-size future ghost
  journal peaks at 2,500,604 of the 4,000,000-byte limit. The complete career
  stays in IndexedDB with verified backup and recovery.

## 2026-09-22 PDT — OLD-01 crash counter merged

- Independently reviewed and cherry-picked `7e55462` as `6fc9133`. The exact
  integration commit passed 147 merge suites in 350.80 seconds, the production
  build, private High/Performance smoke and the focused crash-counter browser
  scenario; both browser runs had zero warnings or errors.
- Five moderate rock hits use five ordinary-race crash slots and the HUD now
  counts each one. Wasteland still reports recoverable armor hits.

## 2026-09-22 PDT — TOOL-01 balance report merged

- Reviewed and cherry-picked `6ed7600` and `215a748` as `5fbf24f` and
  `5cf591e`. The exact integration commit passed 147 merge suites in
  200.96 seconds, the production build, and private High/Performance smoke
  with zero warnings or errors.
- The measured `--check` reports real remaining combat failures: stock and
  maximum UFO time gains exceed four seconds at all three difficulties,
  own bombs remove 68.37% of speed, and Medium/Hard CPU hit counts are low.
  TOOL-01 is complete; these gameplay cards remain open.

## 2026-09-22 PDT — DISC ghost lifecycle finding merged

- Cherry-picked `aa22498` as `10645f2`. The exact integration commit passed
  147 merge suites in 237.17 seconds, the production build, and private
  High/Performance smoke with zero warnings or errors.
- The focused browser scenario confirmed the Time Trial ghost leaves the
  production scene after playback, with ambient shading restored. Discovery
  remains active for later findings.

Read the latest entry before resuming. Add one entry when a card starts,
reaches review, merges, is parked, or is released. Keep the board status
in sync with this log.

## 2026-09-22 PDT — BUG-12 blast guard merged

- Independent review found the `alive: false` traffic guard narrow and the
  new test discriminating. Cherry-picked `2404468` as `558b378`.
- The exact integration commit passed 143 merge suites in 260.38 seconds,
  production build and private High/Performance browser smoke with zero
  warnings/errors. BUG-09 started in the ordered combat lane.

## 2026-09-22 PDT — FND-12 profile install rejected by auto-review

- The playbook's profile example was corrected to the installed CLI's
  separate-file syntax and literal Windows paths. The installed CLI confirmed
  `--profile` reads `$CODEX_HOME/<name>.config.toml`.
- Automatic approval review rejected creating a persistent profile with
  `approval_policy = "never"` and network access. It said the overnight work
  approval did not authorize those exact security-setting changes. No
  profile file was created. Continue in this managed session; FND-12 remains
  open for a later explicit authorization and a copy-only dry run.

## 2026-09-22 PDT — Save fixtures integrated; storage target open

- FND-10 fixture commits `716cfc1` and `ff00d7d` were cherry-picked as
  `d5cc701` and `5a447bd`. Seven historical save shapes passed 246 checks
  on integration. The decimal budget model uses 3.67 MB for one stated case;
  four valid archived ghosts project to 4.08 MB. The card stays building.
- FND-11 backup work started in a separate SAVE lane. No real saves or live
  folder were read or changed.
- FND-12 setup audit found an invalid sample profile and unimplemented
  feel/audio commands. A zero-prompt copy-only dry run is still needed.

## 2026-09-22 PDT — FND-06 runner merged

- Cherry-picked `d127709` and review fix `77bfbc5` as `ee27207` and
  `c434200`. The exact integration commit passed 141 merge suites in 174.19
  seconds, production build, and private High/Performance browser smoke with
  four screenshots and zero warnings/errors. The lane full tier passed all
  146 jobs in 241.64 seconds, below the 15-minute limit.
- BUG-01, POLISH-01 and BUG-12 are now ready. Work is underway in separate
  lanes; the live checkout remains untouched.

## 2026-09-22 PDT — Browser harness and feature switches merged

- FND-08 was cherry-picked as `c8b8ed6`. The integration smoke reached an
  active race in High and Performance, saved four screenshots and found zero
  console errors. The lane's deliberate console error caused the expected
  failure.
- FND-09 was cherry-picked as `f12d7e7`. Its 21 unit checks and private
  Experimental menu scenario passed with memory-only saves and zero browser
  errors. No Wasteland feature is in the switch catalog yet.
- A 1280×800 menu screenshot shows the large title crowding the player row.
  Track this as a UI polish card after the runner gate.

## 2026-09-22 PDT — FND-07 replay fingerprints merged

- Reviewed and cherry-picked replay lane commit `288645a` as integration
  commit `0881f73`. The integration run passed 162 checks for 18 replay cases
  across all 16 events, three frame rates and three repeat runs.
- A disposable physics constant change failed the lane check as expected.
  The traces pin the first 10 seconds; longer outcomes remain in the existing
  campaign and event suites.

## 2026-09-22 PDT — FND-03 old worktree retired

- The old worktree's 22 changed paths were preserved as `4237c2e` on its
  existing branch. Against `7564c7d`, 20 matched and the two differences
  are recorded in `docs/changes/FND-03.md`.
- `git worktree remove` succeeded without force. `git worktree list` no longer
  shows `.codex/worktrees/4555`, and the archival branch remains available.

## 2026-09-22 PDT — Integration opened and foundation cards merged

- `integration/wasteland` opened at d86cf4e from the green isolated foundation.
  FND-04 and FIX-01..03 are included in that base; FND-05 installed the board,
  change notes and role profiles.
- FND-02 moved through cold read, correction, commit and cherry-pick to
  integration as 4ebc906. This served as the first lane-to-integrator dry run.
- FND-01 was cherry-picked as 96f8852. Its private build passed, as did 194
  update-notice checks. Desktop and save-continuity acceptance await release.
- FND-06, FND-07 and FND-08 started in separate lane worktrees. No live release
  or GitHub push has occurred.

## 2026-09-22 PDT — First full suite green

- `node tools/run-tests.mjs` passed 138/138 suites in 836.34 seconds on the
  isolated `codex/wasteland-foundation` branch.
- FIX-01, FIX-02 and FIX-03 are committed as 215c7e5, 08d467c and a116397.
  FND-04 is committed as b746171. All four await integration and release.
- FND-05 setup is in progress. No live game release has occurred.

## 2026-09-22 PDT — Wave 0 board seeded

- FND-04 is committed at b746171 on codex/wasteland-foundation. It has not
  merged into integration or master.
- FIX-01, FIX-02, and FIX-03 passed focused checks; they were committed after
  the full suite finished.
- FND-01 and FND-02 have uncommitted edits. Their live and cold-read checks
  still need to be completed.
- The full suite was running. The integration branch had not been created.
- No release has been recorded from this board.

## Handoff

Review and merge FND-06..08 one card at a time after their gates. Complete
FND-01 desktop and save acceptance during the first release. Keep the live
checkout untouched until the final integration commit passes the full gate.

## 2026-09-22 PDT — BUG-01 arrow-key controls merged

- Independently reviewed UI lane commit `eba94d1` and cherry-picked it as
  `3221765`. The 143-suite integration merge gate passed in 229.08 seconds;
  the production build and private High/Performance browser smoke also passed
  with four screenshots and no warnings or errors.
- A is neutral for steering. Left/Right Arrow steer; D resets chase; W/S remain
  pedals. The trajectory fingerprint stays `cfe859d2a6aea7e9`.
- The live `master` checkout is unchanged. README control text will be updated
  in the release documentation pass.

## 2026-09-22 PDT — POLISH-01 menu spacing merged

- Reviewed lane commit `fe1e539` and cherry-picked it as `71f2034`, resolving
  only the board status conflict. The 143-suite integration merge gate passed
  in 181.68 seconds. The production build and private High/Performance browser
  smoke passed with four screenshots and no warnings or errors.
- At 1280×800, the title and player row have a 16-pixel gap. Phone and short
  desktop screenshots show the controls remain separate and reachable.

## 2026-09-22 PDT — BUG-10 gamepad weapons merged

- Independently reviewed lane commit `4c6c857` and cherry-picked it as
  `9ce4bb5`. All 144 merge-gate suites passed in 173.68 seconds. The build
  and private High/Performance browser smoke passed with four screenshots,
  zero warnings and zero errors.
- D-pad Up/Right/Down/Left fires UFO/bomb/crossbow/star on press edges. The
  direction choice is recorded in `decisions.md`; BUG-11 will show it in HUD.

## 2026-09-22 PDT — BUG-09 directional dents merged

- Reviewed CMB lane commits `d78e23c` and `cc7747f`; cherry-picked them as
  `6912ea3` and `cfc1925`. The 144-suite merge gate passed in 211.10 seconds.
  The production build and private High/Performance browser smoke passed with
  four screenshots and zero warnings or errors.
- Front/rear/side dents follow the displayed heading for the player, rival,
  and oncoming traffic. Existing impact force and replay fingerprints hold.
- OLD-03's assertion audit found a rear-only check for a blast placed exactly
  at a traffic car's center. The automatic approval reviewer rejected an
  attempt to change it; the assertion remains intact and is tracked by OLD-03.

## 2026-09-22 PDT — FND-11 career backup merged

- Reviewed SAVE lane commits `e40d2f5` and `910a610`, cherry-picked as
  `89fb708` and `4ec2815`. The 145-suite merge gate passed in 209.99 seconds.
  The production build, High/Performance browser smoke, career import, and
  blocked-backup recovery scenarios passed with zero browser warnings/errors.
- Seven historical saves export/import byte for byte. Import validates values,
  makes a verified IndexedDB recovery copy, and restores prior localStorage on
  quota failure. A blocked backup prevents migration before `App` starts and
  offers a raw export. The feature stays behind its development switch.
- FND-10's 4 MB budget remains open. The fixture portion allowed backup to
  precede the archive migration; this order is recorded in `decisions.md`.

## 2026-09-22 PDT — BUG-11 weapon bar merged

- Independently reviewed UI lane commits `8f17473` and `f55f66c`; cherry-
  picked them as `5cd694e` and `ebf3af3`. The 145-suite merge gate passed
  in 183.75 seconds. Build, High/Performance smoke, and focused browser QA
  passed with zero warnings/errors.
- The bar now updates only changed values: zero DOM changes in a steady
  500 ms race sample, down from 145. Keyboard 1–4 and gamepad D-pad names are
  shown and spoken. Browser QA found no click-then-Space repeat after a
  weapon recharged; no focus change was needed.

## 2026-09-22 PDT — BUG-02 lap history merged

- Reviewed CMB lane commits `2a3cf7f` and `5d6059c`; cherry-picked as
  `7f87cae` and `1b0e1e7`. All 145 merge-gate suites passed in 162.11 seconds.
  The production build and private High/Performance browser smoke passed with
  four screenshots and zero warnings or errors.
- A UFO swap keeps each driver's completed lap history and running lap timer.
  Both current laps receive assisted flags that survive into stage results.
  Full-race best and leaderboard rules remain unchanged.

## 2026-09-22 PDT — BUG-03 safe swap landing merged

- Reviewed CMB lane commit `456a03e` and cherry-picked it as `26a5795`.
  The 146-suite integration gate passed in 173.30 seconds. The build and
  private High/Performance smoke passed with four screenshots, zero warnings
  and zero errors.
- A swap carries the destination heading and route context, caps landing
  speed to the surface and previous occupant, protects both cars for 1.2
  seconds and rebases the rival's shortcut plan. The seeded 100-swap matrix
  covers all 11 combat courses and 19 shortcut landings with no crash or
  reset in the two seconds after landing.

## 2026-09-22 PDT — BUG-08 vehicle sockets merged

- Independently reviewed VIS commits `b2b27ba`, `214d747` and `f44d1f7`;
  cherry-picked as `6a8b29f`, `aca188c` and `3c2ffd1`. The 147-suite merge
  gate passed in 178.40 seconds. The build, High/Performance smoke and
  production slide/spin/tumble/jump browser scenario passed with zero
  warnings/errors. The integration jump screenshot was inspected.
- Bumper, bow and shield now inherit the real model transform for both roles
  on all nine cars. The follow-up made the shield smaller and checked that
  each rig detaches before its car retires.
- CMB commit `0c8eb59` was also cherry-picked as `1d9110f` before this gate:
  combat hit events identify player, rival or traffic without changing physics.
  TOOL-01 will use that identity for accurate CPU hit counts.

## 2026-09-23 PDT — RFX-04 combat field merged

- Integrated independent acceptance tests and the reviewed combat split as
  `0fdb099` and `9fd42dd`. All 172 merge suites passed in 319.82 seconds,
  including 162 unchanged replay fingerprints and 213 scripted multi-car
  checks across all 16 courses. The production build passed.
- Private High and Performance browser smoke passed with zero warnings or
  errors. The three-opponent combat scene showed a counted player hit on CPU 2,
  CPU 3's shield, CPU 2's visible rig and rank 04/04. The normal player menu still
  starts one opponent; no live release was made for this internal split.
- CMB-01 armor work started in separate builder and test-author worktrees.
  ART-A runtime sheets are in final visual and intake review.

## 2026-09-23 PDT — ART-A runtime images merged

- Integrated two reference studies and six exact-size runtime images as
  `3961bdd` and `b99216f`. The seven planned Batch A catalog entries are all
  present and pass intake at 15,569,098 of 32,000,000 allowed bytes. Originals,
  prompts and deterministic finishing steps are recorded in WASTELAND_ART.md.
- Reviewed the repeat previews and each effect sequence. Removed a detached
  lower shadow from explosion and smoke cells. Plating repeats visibly at tile
  scale, and the effect sheets contain clear fade tails; both need in-game
  playback review when the renderer uses them.
- All 172 exact merge suites passed in 292.33 seconds. The production build
  and private High/Performance browser smoke passed with zero browser issues.
  These assets are prepared but are not yet visible in the live game.
- Expanded CMB-01's owned hooks to cover a temporary wreck's AI, firing and
  pickup guards, its HUD callout, positional blast audio, and the new dev
  feature switch assertion. Independent reviewer findings drive those hooks.

## 2026-09-23 PDT — Combat follow-up cards prepared

- The Director scoped CMB-02 front-spike ramming, CMB-04 seeded weapon and
  armor pickups, and VIS-01 pooled flipbook effects from independent read-only
  proposals. All wait for CMB-01 armor to integrate. CMB-07 projectile carry
  and guidance has an isolated source branch and independent tests; its final
  flag-on gate also waits for CMB-01's feature-switch wiring.
- The ramming card latches one contact incident per actor pair until physical
  separation, so sustained overlap cannot drain armor each frame. The
  pickup card avoids showing on-foot ammo before fighters exist. The visual
  card consumes the accepted Batch A sheets without changing ordinary crash
  effects or reintroducing a first-blast light-count stall.

## 2026-09-23 PDT — CMB-01 armor and recovery merged

- Integrated the CMB-01 lane at `8cf1173`. Its exact lane gate passed 186/186
  suites, 162 unchanged replay fingerprints, the production build, and a
  memory-only High/Performance browser wreck-and-recovery scene.
- The first combat wreck still has one frame above 33 ms in each quality mode.
  The separate combat explosion pool avoids the earlier multi-second shader
  stall and keeps ordinary crash effects unchanged. VIS-01 will retain that
  pool and measure the first-frame cost again.
- CMB-02, CMB-03, CMB-04 and VIS-01 are now ready. CMB-07 can be rebased and
  tested against the integrated armor feature switch.

## 2026-09-23 PDT — CMB-07 projectile carry merged

- The independent 30/60/144 FPS swept-height failure was fixed before
  forward-port. On the CMB-01 base, all 9 projectile tests, 19 armor tests,
  162 pinned replay fingerprints and 104 changed lane suites passed. The
  production build and private High/Performance browser smoke also passed,
  with zero browser warnings or errors.
- Integrated the reviewed CMB-07 branch. Its limited guidance cone and
  velocity carry remain behind the Wasteland2 development switch until
  flagged combat balance is measured.

## 2026-09-23 PDT — Play-test feedback on movable obstacles

- Kyle reported that traffic and sign posts stay put in the live Mad Max
  build. The live roadside destruction switch is still Experimental, traffic
  has one wreck response, and signs and smaller scenery mostly rotate.
- CMB-08 now owns two clear impact tiers based on closing speed versus half
  the striking car's upgraded top speed. Lower impacts slow the car and shove
  traffic or light scenery out of the lane; higher impacts retire them after
  visible debris. Fixed major obstacles and ordinary racing keep their rules.
  Its independent red suite starts with 15 expected failures and 2 controls
  passing. The roadside switch will be considered for normal Wasteland only
  after the full balance and visual gate.

## 2026-09-23 PDT — CMB-02 armored ramming merged

- Reviewed and merged `codex/cmb02-ramming` as `c755986`. The lane passed
  187/187 suites, including 162 pinned replays, and a production build. Its
  private High/Performance scene showed an offset Viper ram to 15.42 m off
  center and 1.18 m airborne, a local wreck and recovery, and no crash slot.
- The exact merge commit passed 180/180 suites in 360.98 seconds. Its build and
  private High/Performance smoke passed with four screenshots, zero warnings
  and zero errors. Wasteland2 remains in development; this is not yet live.
- CMB-08 is unblocked. Its new impact path preserves the old direct traffic
  helper and test, while a separate flagged helper enforces the 50% boundary.

## 2026-09-23 PDT — Roadside release and next combat core

- CMB-08 is live on `master` at `eb879e5` and backed up on GitHub. The live
  build version is `20260924002834-86f3e7fb6e36`; the previous build is kept
  in `dist-previous`. Low-speed traffic and light scenery move clear; high
  closing-speed hits remove them with debris. The exact 189-suite integration
  lane passed before a small balance tune. After that tune, focused combat,
  replay and full balance checks passed, the production build passed, and
  all 24 private browser scenarios passed with no warnings or errors. Kyle
  asked for proportional testing, so the 189-suite lane was not repeated for
  the final tuning-only change. The live race tab was not refreshed.
- CMB-04 pickups, VIS-01 pooled effects, CMB-03 scoring, CMB-05 CPU decisions,
  SAVE-01 credit bonus, CMB-06 deterministic combat replays and VIS-02 armor
  visuals are integrated behind the `wasteland2` development switch. Focused
  checks and each feature's private browser scenario passed where visual
  review applies. The 162 old replay fingerprints remain unchanged.
- UI-01 combat HUD, PRG-01 versioned save migration and FOOT-01 fighter
  simulation are being built in isolated worktrees. The development switch
  stays closed in the live build while those cards finish and the combat
  balance and frame budget are reviewed.

## 2026-09-23 PDT — HUD, profile and fighter core

- UI-01 combat HUD integrated at `43295ea`. Focused HUD and armor checks
  passed; the private browser scenario covered desktop and mobile in High and
  Performance with four screenshots and no browser errors.
- FOOT-01 fixed-step fighter simulation integrated at `b21b9b8`. Its nine
  focused movement, collision, knockdown and replay cases passed. It is
  headless until FOOT-02 and FOOT-03 connect car transitions and controls.
- PRG-01 versioned Wasteland profile integrated at `bcca621`. The existing
  weapon levels migrate into the nested profile after a verified career
  backup. Historical save, backup, purchase, budget and App checks passed;
  no real career was opened.
- One combined armor visual frame sample found ordinary play at about 18 ms
  p95 in High and Performance. The first armored wreck had a 414 ms maximum
  in High and 89 ms in Performance, so its one-time hitch is under review.
  This development feature remains off in the live build.
- FOOT-02 car transitions and PRG-02 Notoriety are now building in isolated
  worktrees. Each feature gets focused checks; combined checks are reserved
  for meaningful joins and release candidates.

## 2026-09-23 PDT — Shield and rank rules

- BUG-15 corrected the Wasteland2-only shield rule at `32bf195`: a rival's
  Star shield no longer protects traffic from a bomb or impact. Two focused
  flag-on/off cases and the production build passed.
- Combat atlas preparation now finishes before the race clock starts at
  `24cb4d0`. A private frame sample reduced the High first-wreck maximum
  from 413.8 ms to 89.8 ms. A residual first-wreck hitch is under review.
- PRG-02 Notoriety XP and ranks integrated at `632b60b`. Completed combat
  hits, wrecks and results award XP once; ordinary races and incomplete
  events award none. Seven focused cases, historical saves and build passed.
  PRG-04 armor-kit purchases and FOOT-02 car transitions are in progress.
- One bounded frame diagnostic found the remaining first-wreck delay in
  rendering, not game simulation: about 32 ms in damage geometry/normals and
  the first visible damaged-effect draw up to 83 ms. High and Performance
  maxima were 71 and 89 ms in that run. PERF-01 is trying a small measured
  improvement without changing the visible dents.
- FOOT-02 car exit, bailout, re-entry and parked-car combat/recovery integrated
  at `7240e57`. Its six focused transition cases, FOOT-01 baseline and build
  passed. FOOT-03 walking controls and camera are now underway; on-foot play
  is not yet usable in a browser without them.
- FOOT-06 on-foot HUD integrated at `c8c20e5`. It shows fighter health,
  reticle and distance/direction to the parked car while hiding car weapons;
  the ammo area states that no foot weapon is equipped until that card exists.
- PERF-01 dent preparation integrated at `85ca3ef`. A single private frame
  sample reduced first-wreck maxima from 71 to 53 ms on High and 89 to 72 ms
  on Performance, with p95 near 18 ms. Two frames still exceeded 33 ms.
  The cache adds about 6 MiB per detailed F42 and 0.36 MiB per generic traffic
  car; this remains a development-only tradeoff to review before beta.

## 2026-09-23 PDT — Walking flow and lean feature checks

- FOOT-03 first-person walking controls/camera integrated at `e34f2cc`.
  The focused control/transition checks, one private exit/walk/re-entry
  browser flow and build passed. No broad suite was run for this isolated
  feature.
- PRG-04 per-car armor kit purchases and equip state integrated at
  `8d5eb3b`. Focused save/armor/replay checks, one private Armory scene
  and build passed.
- FOOT-07 traffic and rival behavior around a fighter integrated at
  `937926e`. Focused race/transition/opponent cases and build passed.
- FOOT-04 fighter figures integrated at `45b586c`. One figure check and
  private standing/knockdown screenshots confirmed four shared instanced
  meshes, first-person hiding and zero browser errors. The screenshots
  revealed car-only HUD panels while walking; `345838c` hides those
  displays and skips the rear-view render pass on foot. Focused HUD and
  mirror checks plus build passed.
- Kyle asked for a baby bear testing approach. Development cards now get
  one focused check and a build, with a private browser scenario only when
  the change is visual or spans controls and simulation. One combined
  playthrough will check the joined walking/RPG/loadout flow. The exact
  release-candidate gate still applies before Wasteland2 is enabled live.

## 2026-09-23 PDT — Armory loadout and crew art

- PRG-03 four car weapon slots integrated at `0cbdca0`. Review found a save
  write that could create a version 1 profile before verified migration;
  `77127bd` now refuses that edit. The focused loadout cases, private
  memory-only Armory flow and build passed.
- ART-C added two front/side/back sheets for all eight original crew
  members as non-runtime reference art. The original prompts and credits
  are recorded. One intake check verified both opaque wide PNGs, their
  provenance and the 4.44 MB total; no game build was needed for reference
  files.
- Four distinct current-weapon fire cues integrated at `09e9353`. UFO,
  bomb, crossbow and Star now have separate short sounds in Wasteland2,
  with the legacy tone retained outside the switch. A focused sound
  check, build and one private waveform capture passed. Full-mix
  listening and later arsenal cues remain for AUD-01.
- FOOT-05 RPG and wrench integrated at `9911602`. Review kept the
  PRG-03 car loadout input mapping and the new on-foot gear mapping
  separate. Thirty focused weapon/transition/race/projectile/HUD cases,
  a production build, and one private memory-only interaction passed.
  The screenshots show the walking HUD without car gauges or mirror.
  FOOT-08 is assessing whether the stops repay their time cost.

## 2026-09-23 PDT — Focused fixes from the first stop sample

- UI-02 player-owned wrecks now show a pending Notoriety cue; the result
  scorecard shows settled XP and rank. Integrated at `31a571a`, with
  clear toast placement at `e45b5fd`. Focused feedback/HUD checks and build
  passed; a joined private visual check remains.
- The first small FOOT-08 stop sample exposed two independent simulation
  problems. Hard CPU pace had an artificial near-player cap while the player
  was walking; `4121dfc` removes that cap on foot. An unattended car held in
  reverse drove itself away from the fighter; `39b5e85` opposes signed speed
  and selects neutral at rest. A focused seven-case transition check and
  production build passed. FOOT-08 is rerunning one paired sample with
  normal roadside destruction before any weapon tuning.
- CREW-01 integrated at `68bbb8a`: eight rank-gated crew choices are saved
  per player. Rook's health and Wren's sprint perks work in the fixed-step
  fighter simulation; the remaining perks and signature gear are clearly
  marked as later work. Four pooled figure meshes keep the same draw-call
  budget. Three focused checks, one private memory-only
  Armory→Garage→race flow and build passed.
- RAID-01 integrated at `9565ed5`: each of the 11 combat courses has three
  seeded roadside camps of three raiders. Warning posts and callouts precede
  bounded crossbow fire at passing cars. Raider damage has separate ownership
  so it cannot grant player combat credit. Four focused cases, one private
  memory-only scene and build passed. Stationary, invulnerable raiders and
  salvage crates are next-card limits; frame pacing has not been sampled.
- FOOT-08 bounded balance report integrated at `d38f37d`. In one seed and
  three paired route/difficulty cases with roadside raiders, routine RPG
  and wrench stops lost ground against continuous driving. A constructed
  clear RPG shot on a wounded rival and an emergency repair before a wreck
  each repaid their stop. The focused check and build passed. No weapon
  numbers changed; actual aiming and broader win rates remain to be played.
- CREW-01 follow-up at `ce12e38` activates Nell's wider RPG blast,
  Odessa's faster wrench, and Dune's longer lock range. Review found the
  extended lock outran the four-second rocket lifetime; `0154121` grants a
  fully locked Dune rocket five seconds and proves a direct hit beyond
  250 m. A migration guard now disables crew selection when the career is
  not ready. Four focused cases and build passed. The full crew card remains
  open for perks tied to boarding, fire, salvage and parked-car shoves.
- AUD-02 current-action sound slice integrated at `6898579`. RPG launch
  and impact, wrench start/completion/interruption, and raider warnings and
  shots have distinct short cues. Bomb audio remains its own sound. Focused
  audio/weapon/raider checks and build passed; the whole-race mix and future
  weapon sounds remain open.
- RAID-02 integrated at `0ced0a1`: RPGs can knock raiders down, with one
  Notoriety award per raider per race. Each camp has a solid raised crate
  that a fighter can collect once for ammo and armor; Wren can reach it from
  four metres. Eleven focused cases, one private memory-only visual scene
  and build passed. The bounded FOOT-08 stop check also passed after this
  join. Raider movement, frame pacing and broader balance remain open.

## 2026-09-23 PDT – Outside review, FIX-04 and Kyle's v3 direction

- An outside review (Claude Code, at Kyle's request) ran the full tier on
  `91187af`: 200 passed, 13 failed. Four causes, none affecting play; see
  `docs/changes/FIX-04.md` and `docs/board/review-2026-09-23.md`. Integration
  had been failing since FOOT-03 `e34f2cc` at 18:38.
- FIX-04 merged by fast-forward as `6d827dc`. On that commit the full tier
  passed 213/213 in 411.6 s (`--jobs 8 --keep-going`), the production build
  passed, and browser smoke passed on a private port with four screenshots,
  zero warnings and zero errors. No replay fingerprint changed.
- The same checkpoint test also fails on live `master` (`eb879e5`) since the
  17:23 balance release `0cdf190`, which shipped without a full run. Not a
  play problem: recovery still lands 1 m before the missed gate. The fix
  reaches `master` with the next release.
- Kyle's v3 direction is in SPEC.md section 0: the Hidden Road easter egg,
  graphics refined in Blender over many measured rounds, first person with an
  overhead option, gritty with no blood, a separate Wasteland career with
  scrap, and a minimum test floor with a status page (0.5). The Director adds
  the SPEC 0.6 cards to the board and works them in order. The overnight start
  prompt is in the review note. D8 (push integration to GitHub) waits for Kyle.

## 2026-09-23 PDT — v3 autonomous run starts

- Read SPEC section 0 first, then the complete specification, playbook,
  operations guide and board history. Section 0 supersedes the earlier
  focused-only testing policy and image/poster work.
- Added FIX-04 and all fifteen ordered section 0.6 cards; TRACK-01 is ready.
  Later cards stay backlog until expanded into owned files, checks and shots.
  Corrected two CMB-02 YAML indentation errors found while reading the board.
- This run starts from beff383. Last full result is 213/213 on 6d827dc,
  not a claim of an exact-head full pass. No live update is planned until
  the release gate passes. D8 remains pending; integration stays local.
- Kyle left the percentage placeholder unspecified. Use the overnight window
  through approximately 07:00 PDT September 24 and the previously authorized
  5 percent quota floor. At start, weekly quota has 50 percent remaining.
  Stop new cards early enough to finish active cards and the final full tier.
- Enforce lane jobs 8 plus build before every task merge. Count task merges
  from this run; full jobs 8 keep-going after five merges or two hours, and
  at run end. Read-only review of existing open cards may use spare lanes.

## 2026-09-23 PDT — first v3 lanes and worktree cleanup

- TRACK-01 independent tests and builder preparation started in
  .lanes/track01. Implementation waits for the committed failing tests.
- Existing AUD-02 uses a spare lane for eight foot/raider waveform checks.
  This is evidence for implemented sounds, not a claim that the full mix or
  future arsenal cues are finished. Independent tests precede the scenario.
- Blender 4.5.13 LTS is available at the specified headless executable path.
- Removed three clean, ancestor-proven worktrees without force:
  wasteland-win-rate-gate, wasteland-checkpoint-cpu, and cmb05-cpu.
  Their branches remain. Kept merged folders containing local QA evidence.

- TRACK-01 red tests committed as 6b570be: 24 checks, 18 expected missing-tool
  or missing-evidence failures. The builder has started implementation.
- AUD-02 waveform red tests committed as 8e51328: 30 acceptance checks;
  initial run fails because the validator module is absent. Builder started.
- Expanded BAL-01 acceptance before dispatch: selected flags must reach all
  real probes, both complete reports retain targets, and diagnostic failures
  become combat work rather than weakened checks.

## 2026-09-23 PDT — AUD-02 verification merged (run merge 1)

- Merged existing audio verification slice as ff5d63b at 04:26 UTC. Eight
  stereo foot/raider cues and four prior car cues have private browser WAVs.
  Clean-source capture, independent code review and independent PCM checks
  pass; no subjective listening or whole-race mix pass is claimed.
- Required lane tier: 214/214 in 307.16 seconds; production build passed.
  The exact lane command selected all campaign shards through its fallback.
- TRACK-01 review found a false-green case for contradictory full evidence.
  Independent regression tests f4aa57d failed before builder fix 3c20dce;
  201 acceptance checks now pass. Review confirmation and lane gate follow.
- Full-tier cadence: one task merge this run. Full due by merge five or
  06:02 UTC (conservative two-hour run checkpoint), and again at run end.
  STATUS refresh starts when TRACK-01 is integrated.

## 2026-09-23 PDT — TRACK-01 merged (run merge 2)

- Integrated 06e378c after independent review, stronger false-green regression
  tests, six selected lane suites (1,483 checks, 39.25 s) and build.
- Ran tools/build-status.mjs on integration and committed its first snapshot.
  It reports the live build and local branches, cached remote refs, and no
  current exact-head full ledger. The historical 6d827dc pass is not reused.
- The page explicitly names its observation commit. Committing the snapshot
  makes a later metadata commit; that commit does not inherit a test pass.
- TRACK-02 is ready. Full cadence remains merge five or 06:02 UTC, then run end.

## 2026-09-23 PDT — overlap independent preparation, preserve finish order

- SPEC 0.6 says finish the listed cards in order. Independent preparation
  within that list may overlap: BAL-01 tests start while TRACK-02 docs are
  built and reviewed, but BAL-01 cannot merge before TRACK-02. The board
  records merge_after separately from actual implementation dependencies.
  Other new work remains behind the ordered list; existing open work can
  continue in spare lanes. This avoids idle lanes without changing priority.
- TRACK-02 started in .lanes/track02. BAL-01 starts in .lanes/bal01.
  Quota check before dispatch: 47 percent remains; keep the 5 percent floor.

## 2026-09-23 PDT — TRACK-02 merged (run merge 3)

- Integrated f57ceda after independent review, five-suite lane gate
  (37.11 seconds) and build. Gates and active prompts now match SPEC 0.5.
  STATUS refreshed after merge. Release-specific evidence remains required.
- BAL-01 is building after its independent red tests 99c7795. GFX-00 is ready
  for independent test preparation; its merge must follow BAL-01.
- Quota before GFX dispatch: 46 percent remaining. Full tier is due after
  two more task merges or 06:02 UTC, whichever comes first.

## 2026-09-23 PDT — flagged balance measured; Blender build started

- BAL-01 candidate 4b50311 passed its thirteen acceptance groups and six-suite
  lane gate/build. Its full flag-off report passes: wins 9/6/2, hits 1/3/7,
  crossbow 50 percent, maximum own-bomb slowdown 4.53 percent.
- Flag-on report fails seven gameplay targets: wins 2/2/4, enemy hits 12/10/9,
  crossbow 69 percent, stock UFO Easy gain 4.75 s and max UFO Hard 5.27 s.
  Both complete reports finished all races, in about 70 and 73 seconds.
- Independent review proved modern traffic obliteration was missing from
  wreck totals. Focused regression tests precede that reporting fix. A
  separate read-only analyst is tracing the gameplay failures before tuning.
- GFX-00 red suite ed739a3 has twelve expected missing-pipeline failures;
  unchanged ordinary replay fingerprints pass all 162 checks. The Blender
  builder now implements the owned rig, loader and matched contact sheet.

## 2026-09-23 PDT — existing BUG-06 tuning slice authorized

- Three bounded flagged traces split the seed-1989 enemy hits into rival /
  raider counts: Easy 6/6, Medium 6/4, Hard 9/0. Each player wrecks once;
  no opponent wrecks in those baseline traces. Raider targeting follows the
  nearest moving car; the faster Hard opponent absorbs its camp shots.
- The 12-degree guidance cone can correct Easy's 10-degree aiming error.
  Authorize one 3-degree candidate in wasteland-tuning.js only, followed by
  one controlled accuracy probe and a complete flagged report. Do not change
  armor, pace, UFO distance or attack cadence in this first slice.
- Existing BUG-06 continues in a spare lane and cannot merge before BAL-01.
  It temporarily uses the BAL-01 tool candidate whose missing traffic count
  is under repair; that omission does not affect these accuracy/win targets.

## 2026-09-23 PDT — reporting fix and held tuning candidate

- BAL-01 traffic fix 052bf76 passes 21 acceptance checks. Refreshed reports
  retain all gameplay results; traffic wrecks now count 5/5/2 off and 14/24/6
  on. Independent re-review and the required lane/build gate are running.
- Hold BUG-06 candidate dfe157e. The 3-degree cone improves Easy wins from
  2/10 to 5/10 but drops Hard from 4/10 to 1/10; Medium stays 2/10.
  Crossbow accuracy stays 18/26. Six flagged targets still fail. All UFO
  samples now pass, showing their measured gains depend on combat outcomes.
  No integration merge or threshold change is justified by this candidate.
- GFX-00 has a complete matched contact sheet and unchanged ordinary replay
  fingerprints. The builder is correcting floating boots in the walk clip
  before independent visual and code review.
- Removed clean, fully merged TRACK-01 and TRACK-02 lane folders with
  git worktree remove after checking paths, ancestry and absence of QA
  artifacts. Their branches remain. The AUD-02 lane keeps its WAV evidence.
- Merge count remains 3; full tier is due at merge 5 or 06:02 UTC.

## 2026-09-23 PDT — BAL-01 merged (run merge 4)

- Integrated e84f299 after independent clean re-review and six-suite lane
  gate: 1,303 checks in 38.18 seconds; build passed in 1.03 seconds.
  STATUS regenerated on the merge. Reported gameplay failures remain visible.
- GFX-00 candidate ac722a8 is in independent code and visual review.
  EGG-01 read-only route/bounds scoping has begun; it merges after GFX-00.
- Quota check: 44 percent remains. The next task merge triggers the full
  tier; the time deadline remains 06:02 UTC if no fifth merge happens first.

## 2026-09-23 PDT — targeted review fixes and Hidden Road preparation

- GFX-00 art review accepts the pipeline evidence, with resemblance 2 and
  grounding 2-3. Scores and five concrete crew-round fixes are retained in
  docs/board/looks/test-fighter/round-1-review.md. No beta promotion.
- Code review found frame-rate-dependent walk selection, temporary roster
  allocations and capture paths tied to the lane folder. Independent red
  regressions 2e066bd reproduce the movement and relocation failures. Builder
  now fixes these, including a narrow simulation-authored movement-speed field.
- EGG-01 is scoped and tests start in .lanes/egg01. The candidate mouth is
  s=1408 m, right lateral +8.5 m, outside a Mojave bend on A/B/C. Full footprint
  clearance and driving still require verification. A separate corridor keeps
  it out of NPC shortcuts and the undiscovered map. Its merge follows GFX-00.
- Approved test maintenance for EGG-01: expand the exact feature catalog from
  three to four entries, retaining existing states and requiring hidden-road
  dev. Builder owns that existing assertion change. Test author may add a new
  pre-change ABC baseline fixture; no existing fingerprints may change.
- One bounded crossbow probe pair found eight gained and three lost hits
  under flagged rules. Some accepted bolts pass above the actual roof because
  collision uses a plus/minus 4 m vertical band. BUG-06 now scopes real swept
  vehicle-height bounds, with independent red tests in .lanes/bolt-height.
  Preserve lead, velocity inheritance, homing and the existing balance bands.
- Two old projectile test fixtures aim above real roofs but expect hits.
  Builder may correct their trajectories to cross the actual body, retaining
  all hit-count and frame-rate assertions, with exact changes reviewed and
  documented. Separate uphill launch-height error remains a later fix.

- EGG-01 red commit c60faad has 31 bounded groups: six baseline invariants
  pass and 25 missing-feature checks fail; existing 162 replay checks pass.
  Builder starts in .lanes/egg01 with the separate corridor API and eight
  authorized source files. No existing fingerprints changed.
- BUG-06 collision red commit ae860fb has 23 passes and 12 false-hit failures;
  builder starts in .lanes/bolt-height. Its small pre-change control fixture
  is authorized for legacy bolts and unchanged bomb/RPG contact behavior.
- GFX-00 fix 10daa29 passed independent re-review. Its required lane command
  selected all 216 suites through the runner's conservative fallback; it is
  running while browser QA and the other builders continue. No extra broad
  tier was requested. The next task merge still triggers the scheduled full.
- Removed the fully merged, clean BAL-01 lane without force after checking
  ancestry and absence of private QA artifacts. Its branch and note remain.

- Independent GFX browser scenario passed at 10daa29 on private port 50991:
  18 captures, no errors/warnings, loaded-body eye hiding and independent
  skeletons. The older onfoot-figures scenario failed on its primitive-only
  query at port 6132. Add that scenario to GFX ownership; its assertions must
  still prove visible body, eye hiding and outside view using the loaded rig.
- BUG-06 body-bound tests now pass. A third injected fixture in the combat
  replay also placed bolts above real roofs; authorize only its position
  correction to the actual body centre, retaining all assertions. One real
  CPU attack replay changes from three hits to one. Its expectation remains
  untouched pending a before/after geometry trace and independent review.

## 2026-09-23 PDT — GFX-00 merged (run merge 5; full tier due now)

- Integrated 0389eea. Final independent gate on df81d39 passed 216 suites
  in 320.32 seconds and build in 0.93 seconds. Code, loaded-rig browser and
  visual reviews passed their scoped requirements. The stale primitive-only
  browser assertion was replaced with reviewed bound-skin behavior checks.
- STATUS refreshed after merge. Commit this metadata, then start the full
  tier on the clean resulting integration commit. No further task merge
  until this scheduled run completes; a failure stops feature merges.
- BUG-06 candidate 24108dd is reviewed and awaiting its lane/build gate.
  Its crossbow probe is 12/26; independent review approved only the real CPU
  encounter's three-to-one hit correction and its matching FPS hashes.
- Three follow-up races separate the remaining enemy hits into CPU/raider:
  Easy 3/7, Medium 6/5, Hard 3/1. Raider accuracy lacks difficulty input and
  CPU guidance can erase seeded aiming error. Preserve these findings for
  a bounded BUG-07 correction after the body-bound fix, without changing bands.
- EGG-01 passes its headless checks and actual all-car turnaround/return;
  browser work fixes a menu-world cache reuse defect before review.
- ART-W prepared three reference sheets with the imagegen skill and built-in
  tool. Independent critic accepts them for modeling. Rustwall scale must be
  authored numerically: 35 m wall, at least 400 m span, 9 by 7 m opening;
  generated proportions are not a measuring guide. Merge remains after EGG-01.
- Quota at ART-W start: 41 percent remaining. D8 remains unapproved; no push
  or live release has occurred in this run.

## 2026-09-23 PDT — scheduled full tier passed

- Full tier passed on exact clean 653e442: 217 suites, zero failures and zero
  not run in 334.73 seconds. All eight campaign shards passed. HEAD stayed
  unchanged and the runner ledger records clean start/end source state.
  Completed at 2026-09-24 05:39:12 UTC. STATUS was regenerated while that
  commit was still current, before this later metadata update.
- Reset the task-merge counter to zero. The next full tier is due after five
  more task merges or 07:39 UTC, whichever comes first, and at run end.
  A release still needs its own exact-final-commit full and composite evidence.
- EGG-01 e36a44f is in independent code and visual review. Its final private
  scenario retained 33 ABC High/Performance captures with zero warnings/errors;
  physical outbound drive is 33.92 seconds. Terrain patch is 10,000 triangles.
- BUG-06 final reviewed candidate 24108dd is running its required lane/build
  gate. No further balance matrix is needed for that unchanged source.
- ART-W 062ab83 has three accepted references and a passing targeted intake
  check (7,221,395 bytes). Its lane/build gate and merge wait behind EGG-01.
  GFX-01 read-only scoping identifies existing crew IDs and required narrow
  animation-state hooks; no simulation or renderer work has begun there yet.

## 2026-09-23 PDT - GFX-01 preparation and targeted corrections

- Expand GFX-01 into explicit Blender asset, runtime presentation and fidelity evidence ownership. Independent tests start from the merged GFX-00 pipeline; completion remains after ART-W.
- EGG-01 return sinking was stale synthetic support height in the browser fixture. Corrected wheel clearance is about 10 mm. Honest replacement views exposed fitted ground crossing the asphalt; authorize a narrow patch clip and additive ABC road-ray regression in its owned render test.
- BUG-06 candidate 280b25d corrects ten reviewed direct-hit fixture positions without changing assertions or runtime. Its 42 repaired unit checks pass; representative wreck/results browser checks and the final required lane/build gate follow.
- Budget before GFX-01: 39 percent remaining; no push or release. Scheduled full remains due at 07:39 UTC or after five further task merges.


## 2026-09-23 PDT - BUG-06 body contact merged (1 since full)

- Integrated 9139575 after clean 280b25d passed 216 lane suites in 305.90 s, build in 0.90 s and private armor-wreck/results checks with zero warnings/errors. STATUS refreshed immediately. Full BUG-06 remains open for the seven flagged balance failures; no tuning threshold changed.
- EGG-01 source and nine replacement images pass targeted independent review. The earlier 33-image scratch directory was removed by a harness rebuild; its prior critic review remains, but its images cannot be reopened. Correct the note and commit the nine current PNGs and measurements under looks/hidden-road/review-fixes before the required gate. No redundant full screenshot sweep.
- GFX-01 red tests 8cb51d6 are committed. Blender and runtime builders now share a lane with separate file ownership. Approved a narrow render3d camera-reference hook so distant models follow actual camera distance. Three fidelity rounds remain required.
- Full cadence: one task merge since 05:39 UTC; next full by 07:39 UTC or four more task merges.


- EGG-01 lane stopped at 51 passed, one failed and 165 not run: the existing shortcut freshness check detected the course source edit. Authorized generated-shortcut-presets.js stamp refresh only. Generator output is byte-identical apart from sourceFingerprint; 241 checks with all 15 fresh solver comparisons pass. Corrected candidate 5ec61ad awaits the repeated required gate after ART-W's gate frees the runner.
- GFX-01 independent test-author corrected its new draw-count helper after inspecting Three: geometry groups produce separate draws only with material arrays. Budget assertions remain unchanged; runtime 5/5 and presentation 10/10 pass. Historical GFX-00 browser scenario may explicitly load its retained test asset; new crew scenario covers production models.
- Quota check: 38 percent remaining. No release or push.


## 2026-09-23 PDT - EGG-01 merged (2 since full)

- Integrated 3dab9cd after clean 5ec61ad passed all 217 lane suites in 314.89 s and build in 375 ms. Source and nine replacement images independently reviewed; required STATUS refreshed immediately. Hidden-road stays dev, with final Rustwall art, departure/invitation and discovery still separate.
- ART-W is ready next: independent gate on b3fcd56 passed 217 suites in 338.18 s and build. No source changes since; final note 82d29f8 adds evidence only.
- Crew R1 evidence and independent scores remain in its lane. Runtime review found four timing/allocation defects; six independent red checks reproduce them. Fix 0d8c37d passes re-review, selector 12/12 and crew 26/26. The private original-asset control passed with 18 images and zero errors. R2 now corrects body shape, texture mapping and weighted poses.


## 2026-09-23 PDT - ART-W merged (3 since full)

- Integrated c736150 in the required order after EGG-01. Accepted references, provenance/intake and the independent 217-suite lane/build gate are recorded. STATUS refreshed immediately. Runtime assets remain separate Blender cards.
- Full cadence is now three task merges since 05:39 UTC: due after two more or at 07:39 UTC. No broad test is active. All four crew runtime findings are resolved at 0d8c37d and independently re-reviewed; R2 assets/captures are in progress.
- Expand existing BUG-07's bounded aim-error slice after body-contact fix 9139575. Three baseline traces separated CPU/raider hits as Easy 3/7, Medium 6/5 and Hard 3/1. Raider accuracy ignores difficulty, and crossbow guidance erases launch error. Fix those rules with independent tests before further numeric tuning. CPU UFO use remains separate.
- Budget before BUG-07: 36 percent remaining. D8 is still unapproved; no push or release. Corrected the GFX-01 board indentation to match the other cards.

- Removed the clean, fully merged ART-W, EGG-01 and body-contact worktrees without force after verifying each absolute path and branch ancestry. Kept their branches. Copied all QA logs and browser evidence to .lanes/evidence/{artw,egg01,bolt-height}/ first; committed Hidden Road PNGs remain in looks/.
- The board parses as valid YAML with 100 unique cards. GFX-02 receives read-only scope preparation while crew round 2 builds; implementation still waits for GFX-01 completion.


- Enemy aim rule candidate 61a5e9 passed independent source review. Its one report improves wins to 9/5/3, keeps crossbow12/26, and leaves only Easy/Medium hit ceilings red. Owner traces are CPU/raider1/5 and6/4. Independent replay reproduction approves only the affected encounter's three hashes plus metadata; no events or actor samples changed.
- Authorize one raider-only spread candidate at20/10 degrees, Hard unchanged .03rad. CPU settings and all target bands remain fixed. Independent author adds a config regression; builder may update the single reviewed shared-cone assertion to the separate raider bound. Two short probes precede the one complete candidate report.
- Crew R2 eac8dcd has76PNG/twoWebM, zero browser issues, and one controlled course frame comparison with no p95 increase. WebM binary attributes repaired the stored blobs to match retained originals. Critic is assessing R2 against R1; no broad gate yet.


## 2026-09-24 PDT - crew round 3 and bounded guidance correction

- Crew round 2 is independently scored and retained in its lane. Likeness remains 2 or 3; supported recovery, individual heads and clothing are round 3 priorities. Root took the narrow capture-tool hook after the runtime agent became unavailable: center the prone side view and match Tusk's left-facing reference. Assets remain the Blender worker's responsibility.
- The approved raider cone candidate reduced short-probe hits from 6 to 5 on Easy and 10 to 4 on Medium. Its unchanged common-time guidance check exposed a close-range error at the wider angle. The full balance report waits for a bounded correction and independent review; no assertion tolerance or target band changed.
- Read-only CPU UFO preparation is in checks/2026-09-24-cpu-ufo-scope.md. Implementation waits for the enemy-aim slice because both own weapons. No new feature card started out of order.
- Last quota check: 34 percent remaining. Three task merges since the 05:39 UTC full pass; next full remains due by 07:39 UTC or after two more task merges. No release or push.

## 2026-09-24 PDT - enemy aim merged (4 since full)

- Integrated a1bc113 after independent review and the required gate on clean fceff63: 169 passed, zero failed/not run, all eight campaign shards, 276.75 s; build passed. Final evidence note is 73c3887. STATUS refreshed immediately after merge.
- Final flagged balance is wins 9/5/3, enemy hits 6/4/6 and crossbow 12/26. Only Easy hit ceiling remains red. The rejected wide Easy candidate stays recorded; Medium improvement remains. No balance target or legacy behavior changed.
- Crew round 3 assets are frozen at 98fb529. No runtime source changed since independent review 0d8c37d. Private game capture starts after the gate; its initial attempt stopped before capture because the redirected log was inside Vite's cleared QA folder. Retry keeps the log outside that folder.
- Existing CPU UFO work has an isolated lane based on fceff63. Independent red tests precede the separate builder; physical collection, own checkpoints/laps and safe actor-local relocation are the scope.
- Four task merges since the 05:39 UTC full pass. Run the full tier after one more task merge or by 07:39 UTC. Quota is 33 percent remaining; no release or push.

## 2026-09-24 PDT - crew initial rounds merged (5 since full)

- Integrated c040e69 after independent runtime/art review, three immutable contact sheets, 219 passing lane suites in 317.58 s and build on exact clean c603646. Final review/evidence note d45f944 changes documentation only. STATUS refreshed immediately.
- Family stays dev. Likeness is 2 or 3; recovery improves to 3. Visible neck gaps, texture projection bands and functional action poses remain recorded. Five crew trigger the SPEC approach-change rule; GFX-01-P1 requires continuous meshes and authored UV/baked textures after the ordered initial family cards. No beta claim.
- Five task merges since the 05:39 UTC full pass: run the scheduled full now on the next clean integration commit before further feature merges. GFX-02 independent tests can start in its own lane while the full runs.
- CPU UFO source9c519fd has 37 focused checks, pickup controls, 100 player landing controls and 12 unchanged combat replay checks. Independent author and Director source review found no defect; balance reports and required lane/build still pending.
- Removed the clean fully merged enemy-aim lane without force; branch retained. All thirteen QA logs, diagnostics and traces were copied with matching hashes to .lanes/evidence/enemy-aim/. No release or push.

## 2026-09-24 PDT - second scheduled full passed

- Exact clean integration b6b9677a4c0e4ad3cbc7b00cdef3acd01fd138ae passed all 221 full-tier suites, zero failures/not run, in 305.27 s. All eight campaign shards passed. Ledger records clean start/end and unchanged HEAD; completed 07:36:36 UTC. STATUS was refreshed against that exact commit before this metadata update.
- Reset the task-merge counter to zero. Next full is due after five more task merges or 09:36 UTC, whichever comes first, and at run end. This later metadata commit does not inherit an exact-HEAD pass.
- GFX-02 has its own lane, independent test author and separate runtime/Blender ownership. Public API and camera-local asset contract agreed; builders wait for the red test commit before implementation. Quota before this card: 31 percent remaining.
- CPU UFO9c519fd is undergoing its first actual off/on balance reports. Initial command stopped before simulation because the new lane had no QA log directory; created that directory and retried. Required lane/build and merge remain pending. No release or push.

## 2026-09-24 PDT - defensive CPU UFO policy after measured regression

- Initial CPU UFO reports on 9c519fd: flag off, 70.26 s, wins 9/4/2 and hits
  1/3/7; flag on, 71.62 s, wins 9/4/3 and hits 6/7/6. Medium wins regress in
  both paths, as do flagged Medium hits. Easy's six hits are pre-existing.
  Hold this candidate out of integration.
- Forty pinned Medium races in 61.51 s against 1900297 show six baseline
  wins with the flag off, not five. Changed winning seeds are off 1989/1995
  and on 1992. Their jumps began 130/184/82 m behind, so a minimum deficit
  rule would not fix wins. Authorize defensive AI using existing incomingBolt
  rules, with independent red tests before Root's narrow AI edit.
- GFX-02 red tests 07af83c precede assets/runtime. Runtime e0a394d passes
  focused synthetic checks. Independent review found reserve ammunition keeps
  a fired rocket visible during recoil; the author adds red coverage before
  the builder fixes it.
- Removed the clean merged GFX-01 lane without force. All three fidelity
  rounds remain committed under integration docs/board/looks/crew; gate logs
  are in .lanes/evidence/gfx01 and its branch remains. No release or push.

## 2026-09-24 PDT - defensive UFO restored; hands round 1 reviewed

- Independent defensive red tests febfe5e preceded Root's narrow AI guard
  f8b5b06. All 37 focused groups and existing pickup checks pass. Independent
  review 479643a found no defect; four affected probes exactly restore the
  pinned baseline results and hit timing, with no free CPU jump.
- Final reports on 479643a: flag off passes all targets in 68.81 s, wins
  9/6/2 and enemy hits 1/3/7. Flag on takes 69.43 s, wins 9/5/3 and hits
  6/4/6. Its only failure is the pre-existing Easy hit ceiling. Stock/max UFO
  gains remain within limits. Required lane/build is running before merge.
- GFX-02 round 1 assets c92e8fc and actual game evidence 8577a49 are frozen.
  Private port 36720, memory-only storage, zero browser warnings/errors;
  42 matched PNGs and 10 durable input-action PNGs. The largest combination
  is 4,060 triangles and three draws. The 120-frame sample covers the wrench,
  not the largest RPG; both qualities show p95 18.1/18.2 ms hidden/visible.
- Director review scores likeness 2. Round 2 addresses thin forearms, glove
  volume and grip, tool silhouettes, material identity and action contact.
  A supplementary weapon-reference sheet will preserve the original sheet.
  Later rounds measure the largest hands with RPG. No beta claim.
- No task merge since the 07:36 UTC full pass. The next full remains due after
  five task merges or 09:36 UTC, and at run end. No release or push.

## 2026-09-24 PDT - defensive CPU UFO merged (1 since full)

- Integrated c15026d after independent review and the final off/on reports.
  Exact clean 479643a passed 127 lane suites, including all eight campaign
  shards, in 249.13 s; build passed in 352 ms. Evidence-only note d2d4c5d
  followed. STATUS refreshed immediately after merge.
- The remaining Easy six hits are one CPU and five raider hits. Four raider
  hits come from camp 1. The rejected wider-spread trace removes only one;
  it cannot identify the extra winning seed. Retain current tuning rather
  than select an unsupported number. BUG-07 stays open.
- All thirteen CPU UFO QA files were archived with matching hashes under
  .lanes/evidence/cpu-ufo. Removed the clean merged lane without force;
  its branch remains. GFX-02 round 2 modeling is underway.
- One task merge since the 07:36 UTC full pass; next full after four more
  merges or 09:36 UTC, and at run end. Quota is 27 percent remaining.
  No live change, release or push.

- Cleanup follow-up: Git traversed the removed CPU lane's node_modules junction
  and emptied integration's shared dependency directory. GFX-02's focused check
  caught the missing Three package before capture. Restored all 16 locked
  packages offline in two seconds (Three 171, Vite 8.0.16), with no tracked
  change. Future cleanup detaches only the verified lane junction first;
  docs/OPERATIONS.md now records this step. Existing source/gate evidence is
  unchanged. No live folder or save was involved.

## 2026-09-24 PDT - hands round 3 and uphill launch diagnosis

- GFX-02 round 2 improved likeness from 2 to 3; its 46 matched and 10 input
  images remain committed in 752416a. The largest RPG combination's 120-frame
  sample is p95 18.1/18.2 ms hidden/visible in both qualities, with no frame
  over 33 ms. Director review lists five specific round-3 refinements.
- Final initial assets 14a51e3 reduce the largest combination to 6,932
  triangles and three draws. Round-3 private capture is running. The capture
  fixture now refreshes the HUD from the same state as the rendered pose;
  older images' stale labels remain documented instead of replaced.
- A bounded BUG-06 probe proves that a 50 m uphill crossbow shot from two
  cars moving at 80 mph hits the road after 0.15 s, 17 m short. Flat/moving
  and uphill/stationary controls hit. Scoped an isolated launch-height lane.
  Independent red tests 96f13ad give 11 passes and nine geometric failures;
  an initial CPU hit-counter fixture mistake was corrected and documented.
- Root source 5cf533e fixes all 20 geometric checks and passes 35 existing
  projectile checks. Horizontal launch/guidance, legacy bolts, bombs and RPG
  trajectories stay unchanged. Independent source review finds no defect.
- Hold this candidate: the bounded accuracy probe rises to 24/26, above the
  unchanged 35–60 percent band. Misses are case indices 10 and 25. Authorize
  one diagnostic guidance-off probe with launch components unchanged to
  distinguish initial aim from later steering. This is not a shipping rule;
  no broad report, gate, merge or target change is authorized by that result.

## 2026-09-24 PDT - first-person integration and Rustwall start

- GFX-02 merged as f626618 after 223 passing lane suites in 302.41 s and
  a passing build. Three immutable Blender/game fidelity rounds are retained.
  Likeness improved from two to three, then stayed three. Development only;
  GFX-02-P1 records anatomy, materials, contact and texture-budget work.
- STATUS refreshed after the merge. Two task merges since the 07:36 UTC full
  pass; next full after three more merges or 09:36 UTC, and at run end.
- Removed the clean merged GFX-02 worktree after preserving its two gate logs
  with matching hashes and safely detaching its dependency junction. The
  branch and committed fidelity evidence remain. No integration dependency loss.
- BUG-06 launch candidate is held at 5cf533e, evidence c3efb1f. It passes all
  20 geometric checks, but the accuracy probe is 24/26. A diagnostic with only
  guidance disabled gives 18/26. The final flagged report has six failures:
  wins 1/2/2 and enemy hits 10/7/13. No parameter grid or further merge gate.
- EGG-02 now has an independent test author and separate runtime and Blender
  builders. Contract: 420 by 35 m wall, 9 by 7 m opening, 7.25 m gate lift,
  eight 1.8 m figures, bounded wash modules and four 1024 texture sets total.
- The placement probe found high terrain burying outer wall sections. Scoped
  only a final salt-flat widening from 120 to 225 m half-width, with independent
  all-route grounding checks and unchanged path, wash and racing controls.
- Last quota observation: 25 percent remaining. No live change, release or push.

## 2026-09-24 PDT - Rustwall refinement and scheduled full checkpoint

- EGG-02 independent red contract ca7234c preceded runtime d19c027 and
  first assets bb31758. Independent scene 17/17 and actual-asset 8/8 checks
  pass; review found no geometry, placement or disposal defect.
- R1 game capture on private port 63305 retained 20 PNGs and raw frame samples.
  Wall scores 2/3/4/2 and wash 1/3/3/2 for resemblance/readability/grounding/fit.
  Model cost stayed within ten percent in the recorded stopped-course views.
  The comparison uses greybox models on widened ground, not the previous
  commit's complete scene. The fitted ground patch adds 832 triangles.
- An isolated Performance wash image was blank despite 144 submitted triangles.
  Preserve it as a capture failure. The reviewer traced a Three instance-upload
  cache effect during QA relocation; prepare a frame before capturing. Check
  restored course views too. R2 remains in progress until actual images pass.
- R2 assets 522c39d reduce the wall to 51,020 triangles and 13 draws while adding
  coherent rock strata, directional steel wear, irregular salvage, torn banners
  and stronger gate machinery. The planned R2 capture is being corrected;
  no runtime source change or extra balance report is involved.
- One final read-only BUG-06 launch-angle probe takes 8.99 s on unchanged c3efb1f.
  All 24 hits are within 11.94 degrees of car yaw; a 12-degree initial limit would
  not remove any of them. The larger 34.83-degree outlier already misses. The
  evidence and note-only a341cdd remain on the held launch-height branch.
  No further aim-cone probe, tuning, source change or merge is authorized.
- Two task merges since the 07:36 UTC full pass. Reserve the next full run
  around 09:31 UTC, before the 09:36 deadline, while the next art round is planned.
  Latest quota observation: 22 percent remaining. No live change, release or push.

## 2026-09-24 09:36 UTC - scheduled full tier passed

- Exact clean c66386d566d52c4a7838c0e1554d45bcbbccc306 passed all 224 suites,
  zero failed and zero not run, in 305.99 s. All eight campaign shards passed.
  Ledger completion: 2026-09-24T09:36:17.115Z. Log:
  .qa-dist/scheduled-full-03.log. HEAD stayed unchanged during the run.
- Merge count resets to zero. Next full is due after five task merges or
  11:36 UTC, and at the end of the run. This does not grant a release pass to
  any later commit. No live change or push.
- EGG-02 round 2 improves wall resemblance to three and wash to two. All
  corrected images are valid, but High wash CPU p95 is 2.5 to 2.8 ms (+12%)
  while RAF p95 stays 18.1 ms. The planned third round will assess cost again.
- Independent red 034430b preceded the prepared-bank half-turn variation
  34bfd6c. All 18 scene checks pass; independent review 27c6b95 finds no defect.
  Only visual instance yaw changes. Round 3 Blender rendering is released.
- Preserved all five launch-height diagnostic files with matching hashes at
  .lanes/evidence/launch-height/. Its clean unmerged worktree and branch remain.

## 2026-09-24 09:55 UTC - Rustwall integrated, arrival begins

- EGG-02 merged as 7f8d43f after 226 passing lane suites in 301.17 s and a passing build on clean 8445913. Final 2308bd8 changes evidence only. All three fidelity rounds remain committed; wall and wash stay in development with explicit polish cards.
- STATUS refreshed on the clean merge commit. One task merge since the 09:36 UTC full pass; next full after four more merges or 11:36 UTC, and at run end.
- EGG-03 begins with independent tests, separate simulation/App and presentation owners, then independent save review. Arrival state remains a safe temporary endpoint until discovery and yard cards land.
- Latest quota observation: 20 percent remaining. No live change, release or push.

## 2026-09-24 10:14 UTC - arrival runtime reviewed

- EGG-03 core red contract b74d51f precedes runtime 5776623. All 37 journey
  and seven synthetic-save departure checks pass. The presentation red
  contract 6c91568 separately precedes the camera, dialog and sound work.
- Independent runtime and Save Guardian review finds no defect. All seven
  historical save shapes and 247 preservation checks pass, with backup,
  archive and storage-budget suites. Evidence-only review note: cdf9e03.
- Presentation and two bounded visual/audio rounds remain in progress. The
  card has not merged. One task merge since the 09:36 UTC full pass; the next
  full remains due after four more merges or 11:36 UTC, and at run end.
- EGG-04 has concrete discovery, named-player isolation, backup, map and hint
  acceptance lines. It waits for EGG-03 integration. No live change or push.

## 2026-09-24 10:45 UTC - bounded arrival refinement

- EGG-03 R1 exposes a covered car, unclear inside endpoint and masked gate
  sounds. R2 improves desktop/phone framing and the inside camera, with
  actual PCM and clear drum/chain transients. Source review fixes the legacy
  weapon-strip selector and repeated dialog text writes.
- A settled legacy view reveals a real main-road tunnel camera constraint
  pulling the hidden-spur view into terrain. Independent red b16de98 precedes
  the physical-spur helper in 7ad8a32; all 11 presentation groups pass.
  Actual R3 driving and gate-passage images are now readable.
- R3 source review identifies a remaining handover jump from using the old
  main-road base during the cinematic blend. Its narrow repair is in progress.
  Earlier CPU comparisons skipped ordinary HUD work in the baseline, so they
  cannot attribute the whole difference to this feature. Preserve them and
  run one corrected comparison with ordinary work equal in both conditions.
- R1/R2 recordings, capture failures, R3 canvas video and the real frame strip
  remain under the lane's docs/board/looks/hidden-road-arrival directory. No
  subjective audio-listening or full-race performance claim is made.
- Latest quota observation at 10:23 UTC: 17 percent remaining. One task merge
  since the 09:36 UTC full pass; next full by 11:36 UTC or four more merges,
  and at run end. No live change, release or push.

## 2026-09-24 11:12 UTC - arrival integrated, discovery begins

- EGG-03 merged as be75f60 after 229 passing lane suites in 301.17 seconds
  and a passing build on clean 8b3cb80. Final 0ab0ce8 records evidence only.
  The earlier failed gate and precise reviewed assertion correction remain
  recorded. All three visual rounds and measured audio evidence are retained.
- STATUS refreshed on the clean merge commit. Two task merges since the
  09:36 UTC full pass; next full by 11:36 UTC or three more merges, and at end.
- EGG-04 begins with independent red tests, then separate persistence/runtime
  and menu/map/hint owners. Synthetic saves and independent Save Guardian
  review are required. Direct visits cannot create a payable or abandoned race.
- Quota check at 11:11 UTC: 14 percent remaining. Reserve enough to finish
  active work and the final full tier before the five-percent floor.
- No live change, release, beta promotion or push.

## 2026-09-24 11:21 UTC - scheduled full tier passes

- Scheduled full tier passed all 229 suites in 306.60 seconds on exact clean
  016833692d9793e36a8c079a5c2e7204532b51bf, completed at 11:20:34 UTC.
  All eight campaign shards ran. Log: .qa-dist/scheduled-full-04.log.
  STATUS was refreshed before changing metadata; its full-pass observation
  belongs to that commit, not the following documentation commit.
- This was the scheduled check moved into the lane's initial test-writing
  window, replacing the planned 11:30 start. No second run is due at 11:36.
  Reset merge count to zero; next full after five merges or 13:20 UTC, and
  at run end.
- EGG-03's failed gate, passing rerun and build logs were copied with matching
  hashes into .lanes/evidence/egg03/. Its clean fully merged worktree was
  removed after verifying normal local dependencies; the branch is retained.
- EGG-04 independent red contracts b17ca69 and 991b963 precede implementation.
  Runtime f0f3ae4 passes ten focused groups and independent Save Guardian
  review, including seven historical shapes and 247 preservation checks.
  Presentation and two bounded visual rounds remain before its required gate.

## 2026-09-24 11:41 UTC - discovery ready for gate

- EGG-04 final clean a5fe405 is frozen for its mandatory lane tier and build.
  Independent runtime/save and presentation reviews pass. Two retained actual
  browser rounds cover player isolation, Turn-back/reload, automatic scenic
  entry, direct visits, hints, map reveal and phone controls with memory-only saves.
- R1 found a buried garage hint and small menu action. Reviewed R2 source
  77aa6ce makes the hint visible on opening, provides a 344 by 44 pixel phone
  action and labels the dotted route. Both rounds and Director scores remain.
  Short absolute frame samples are not a percentage-overhead measurement.
- CAM-01 is expanded with concrete scope and waits for EGG-04 merge. It will
  retain car cameras and weapon rules while adding the requested overhead view.
- Quota at 11:40 UTC: eleven percent remaining; the five-percent floor still
  applies. Zero merges since the 11:20 full pass. Next full by 13:20 UTC or
  five merges, and at run end. No live change, release or push.

## 2026-09-24 12:05 UTC - discovery integrated, camera choice begins

- EGG-04 merged as 81b268c after 231 passing lane suites in 304.54 seconds
  and a passing build on clean fdcf7eb. Final c4edc08 is evidence only.
  All three failed attempts are retained with independently reviewed fixes:
  preserve update synchronization order, guard optional legacy menu controls,
  and add the two approved fields to the exact expected profile shape.
- STATUS refreshed on the clean merge commit. One task merge since the
  11:20 UTC full pass; next full after four more merges or 13:20 UTC, and at end.
- CAM-01 starts with independent red tests, separate preference/input and
  camera/presentation owners, then independent save and source review.
  Known saved-preference assertion changes are scoped before implementation;
  related existing short checks run before its broad gate.
- Fresh quota observation before taking this card: nine percent remaining.
  Treat this as the final planned card, reserving the end-of-run full check
  and handoff above the five-percent floor. No live change, release or push.

- EGG-04's three failed logs, passing rerun and build log were copied with
  matching hashes into .lanes/evidence/egg04/. Its clean fully merged worktree
  was removed after checking normal local dependencies; branch retained.

## 2026-09-24 12:28 UTC - camera choice reviewed, final gate begins

- CAM-01 preference/runtime e3ae8ac and final presentation 670f81f pass
  independent source and Save Guardian review. Eight focused groups cover
  all eleven combat courses, defaults, player isolation and aim projection.
  Independent red 30481d5 exposed a 21.476-metre remote-tunnel camera pull;
  reviewed fix 1b76d26 preserves the bounded camera and normal first person.
- Affected short checks caught the current-format backup fixture before the
  broad gate. Its one added default and the saved-preference expectation were
  independently approved; existing assertions and historical fixtures remain.
- Two private browser rounds retain eleven matched images each, plus the
  failed initial resume-script attempt. R2 fixes phone minimap obstruction
  and hides only specific QA panels. Real controls remain visible. Director
  review 45ec1e8 accepts the result with explicit timing and art limitations.
- Required clean lane tier/build is next. After this final planned card,
  run the integration full tier, refresh STATUS and write the handoff. Latest
  quota at 12:22 UTC: seven percent remaining; floor five percent. No new
  card, live change, release or push is planned.

## 2026-09-24 12:35 UTC - camera integrated, end full tier starts

- CAM-01 merged as c1ff020 after 232 passing lane suites in 302.18 seconds
  and a passing build on clean 45ec1e8. Final 39c34e8 changes evidence only.
  STATUS refreshed on the clean merge commit. Two task merges since the
  11:20 UTC full pass; the mandatory end-of-run full follows now.
- Its lane and build logs were copied with matching hashes into
  .lanes/evidence/cam01/. The clean fully merged worktree was removed after
  verifying normal local dependencies; branch and committed visual evidence
  remain. All helper agents have finished; no new card is starting.
- CAR-01 is next in the ordered plan, followed by GFX-03 and GFX-04. This run
  stops after the final full/status/handoff to preserve the quota floor.

## 2026-09-24 12:42 UTC - end-of-run handoff

**Stopped above Kyle's five-percent quota floor.** Latest observation: six
percent remaining. All helpers are finished. No lane has an active builder.

- Final full tier: **232 passed, zero failed, zero skipped**, 299.74 seconds,
  all eight campaign shards. Exact clean tested commit:
  `4264cf087e50b8b7d2dac48a54502ad7773bb4f8`. Completed at
  `2026-09-24T12:40:53.275Z`; log `.qa-dist/end-of-run-full-05.log`.
  STATUS was generated on that commit before this handoff edit. The following
  documentation commit does not inherit an exact-commit release pass.
- Ordered work reached CAM-01. This run integrated tracking, the flagged
  balance report, Blender tooling, initial crew/first-person/Rustwall assets,
  Hidden Road geometry, gate arrival, saved discovery and on-foot camera choice.
  Recent merges: EGG-02 `7f8d43f`, EGG-03 `be75f60`, EGG-04 `81b268c`,
  CAM-01 `c1ff020`. Related enemy-aim, projectile-height and defensive CPU UFO
  slices are also integrated; their exact reviews and limits are recorded above.
- **Next: CAR-01**, then GFX-03 and GFX-04, before the recorded art polish
  cards. CAR-01 still needs a concrete file slice and independent save tests.
  Scrap, territory progression and the live Scrapdome yard home are unfinished;
  entering the gate currently reaches the safe temporary inside endpoint.
- Keep `hidden-road` and `wasteland2` in development. Initial asset rounds do
  not meet every fidelity target. GFX-01-P1, GFX-02-P1 and EGG-02-P1 retain
  the remaining work; use the exact board IDs and their recorded approach rules.
  Contact sheets and reviews are committed under `docs/board/looks/`.
- BUG-06 and BUG-07 remain unfinished, with no active builder. The launch-height
  candidate `5cf533e` is held in `.lanes/launch-height` (latest note `a341cdd`):
  its accuracy and balance regressions prevent merge. The earlier flagged
  guidance candidate in `.lanes/flagged-balance` is also held. Preserve both.
  Current integrated flagged balance still exceeds the Easy enemy-hit ceiling;
  do not relax target bands or restart an unbounded tuning grid.
- Clean merged lanes were removed only after archive/hash checks. Their
  branches remain, and gate logs are in `.lanes/evidence/`. EGG-04 retains
  all three failed gates and precise reviewed corrections. No assertions or
  fingerprints were silently weakened. Visual/PCM limitations remain explicit.
- **No release or push occurred.** Live remains `eb879e5`, build
  `20260924002834-86f3e7fb6e36`. No live race, port 5174 or real save was used.
  D8 is unapproved. D3 release still requires every release gate and a fresh
  full pass on the exact release commit; this handoff grants no release.
- Resume with SPEC 0 and this handoff. Merge count resets to zero at the final
  full. If work resumes continuously, next full is due after five task merges
  or by 14:40 UTC, and at the next run end. Budget must be checked before
  starting another card. Do not recreate completed work or discard held lanes.

## 2026-09-24 PDT – Kyle: cleanup before features

- An outside review (Claude Code) of `463eac0` independently confirmed the
  full tier (232 passed, 0 failed) and build, and found the repository and
  build bloated: about 745 MB added to Git overnight, 417 MB of evidence in
  `docs/board/looks/`, 22 `.blend` files (185 MB) under `public/`, and a 487 MB
  build against 176 MB live. Details: `docs/board/cleanup-run-2026-09-24.md`.
- Kyle directed cleanup only before further feature work. SPEC.md section 0.7
  and AGENTS.md now define where files live, size limits enforced by a test,
  removal as part of done, and the ordered cards CLEAN-01 to CLEAN-08. CLEAN-09
  (rewriting development history to drop the large files) is parked until
  Kyle approves it. SPEC 0.6 cards 13 to 15 resume after CLEAN-08.
