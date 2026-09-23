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
