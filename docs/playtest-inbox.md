# Wasteland play-test inbox

## Claude: Fuel Run fighter projectile rules needed, 30 September

Independent review used actual F exit and fuel pickup on seed 1989. A hunter chased the parked car, 52.55 m from the carrying fighter; its crossbow aimed 109.602 degrees away from the fighter. Those chase and aim bugs will be fixed under the settled rule that hunters pursue the carrier. A real bolt then swept through the fighter's torso without a hit: health stayed 110, fuel remained carried and the bolt stayed live. Current projectile contacts enumerate cars; vehicle sweeps already knock fighters down and drop fuel.

Please settle the missing contact rules in writing: how much damage a car crossbow bolt deals to a fighter, whether car bomb splash affects fighters and by how much, and whether a surviving fighter drops cargo on a hit or only on knockdown. Fuel's settled drop rule names more than 25 armor in one car hit; it does not name fighter health thresholds. We will keep the parked car's physical hitbox, use a separate actual fighter aim pose, and wait for your decision before adding fighter projectile damage. No temporary invulnerability or invented damage values will be merged.

The proposed 0.75-second original-carrier pickup delay is withdrawn. A test will enforce the literal rule that anyone can recover dropped fuel.

## Claude: women crew source sheet; keep current pending parts, 30 September

ART-SRC-CREW-W is frozen clean at 9c2dee0 on lane/art/crew-w-src. [Comparison](C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/crew-w-src/docs/board/looks/crew-w-src/round-1.jpg), 376150 bytes. Two actual downloaded CC0 choices are inspected: Universal Base Standard (15060 triangles,65bones,no embedded actions; free Standard only) and Kenney Survivors (1604triangles,58bones,three motion clips). Both lack the settled four crew silhouettes and full actions, so the recommendation is to keep current women and find compatible garment/action parts. Requested Modular Women is ON HOLD: its pack page says CC0, current general page says QAL, and actual model/license downloads returned quota HTML. No rights or shared-rig claim is made for that pack; existing cached CC0 rights are unchanged. Current Nell/Odessa/Wren are byte-identical; no Vesper placeholder or fitting occurred.

Please review the sheet and show Kyle. The source card stops waiting_on:kyle: choose compatible existing garments/actions for Standard, or resolve Modular Women access and actual terms first. Independent source review and lane/build gates are underway for the source artifacts only. No adaptation or runtime replacement starts before the source choice. The detailed note and catalog retain exact primary URLs, hashes and access findings.

## Claude: Mirage build dependency and early reward, 30 September

The settled Mirage build note calls targetFor, but the shared targeting module does not exist yet. Current CPU crossbow aim, bolt homing and RPG locking each bypass a shared resolver, and current normalization discards new weapon IDs. WAR-02c now explicitly waits for ARS-CORE and WAR-PAY. Its old src/arena/warlords.js hook was a nonexistent path and is corrected to src/warlords.js. Please confirm the settled "early and working" reward means Mirage supplies the working Decoy Drone using its reusable decoy implementation, then ARS-03 reuses that same file; waiting for ARS-03 would create a dependency cycle. No Mirage code or duplicate targeting has started. Fuel Run proceeds separately under SPEC0.12 with a fuel-run dev switch in addition to released scrapdome and discovery/rank gates.

## Claude: crew round 1 fails; current art kept

Independent critic inspected the sheet, reference boards and all 40 fitted captures. All five are worse than current: direction/resemblance 1 to 2, materials 2, scene consistency 1. Jax lacks a continuous long coat; Dune reads as a helmet; Cinder has wrong hair and an arm assembly problem; Tusk reads as clean fantasy armor. Material or normal changes alone cannot meet the card. No second round or runtime replacement is authorized on this result. Kyle has been asked to choose better existing source parts or stop fitting. The clean review lane is lane/art/crew-fit-m at587e6ec. Its comparison is [round 1](C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/crew-fit-m/docs/board/looks/crew-fit-m/round-1.jpg). The recipe and original licensed source can rebuild it; all current runtime assets remain unchanged. Please review the source gap and show Kyle the sheet.

## Claude: early crew fitting look request, 30 September

ART-FIT-CREW-M is building from the approved Quaternius source. Jax keeps the reference long coat: trimmed source Suit trouser fabric supplies overlapping back and side panels below the source jacket. Dune keeps the reference hood: a trimmed source SpaceSuit helmet shell is fitted around the source face and repainted as worn cloth. These are fitting techniques, not new costume designs; the settled silhouettes and accents stay the target. Round 1 will show current and fitted figures in the game at both detail and quality settings. Please judge whether the coat and hood read correctly before further rounds. If these source parts cannot meet the references within the cap, the card stops with the gap written down. No runtime art will merge before your comparison review.

Add a note here after trying a build. Include the event, car, difficulty and
what happened. Screenshots and short recordings help when a problem is visual
or hard to repeat. Do not include saved career data.

## Director review handoff to Claude, 30 September 2026

WAR-02a-SAL is ready for your required Preview play-through before merge.
Retained branch: `lane/cmb/war-02a-sal`; exact clean source:
`1b5f3365a9717f477e85d6503d1f2bb88375c272`. Lane tier 304/304 and build pass.
The 23 focused acceptance tests and 12 private High/Performance captures pass;
independent source and visual review found no issues. A real sweep-hit and
first-wreck replay has the same complete-state/event hash at 30/60/144 FPS.

Please judge fun, fair tells/counters, scream/roar balance and the standard
chase-camera nameplate/callout view in Preview. The browser is muted and its
labelled inspection camera only proves move/effect/callout presentation.
Final captures/report: integration's `.evidence/2026-09-30/WAR-02a-SAL/`.
Keep the lane until your verdict. This Director has not merged Sal or touched
Preview. Reward is merged as de3eb0f and remains behind warlords: dev.

The end full tier passed 303/303 and build on exact clean `0f7818f6a351b4ce0f728a9a8cde3354ee99ec75`.
The verdict and tested source are recorded at the end of run-log.md. Kyle's
art picks and your gritty fitting rules are preserved; new fitting/source
cards remain for the next run. Sal's Preview review remains required.

## What's new to try

### Crash physics (released 27 September 2026)

- In any race, rear-end a car: it is smashed ahead, spins and slides to a stop
  off the road. Your own car feels the hit too.
- In Mad Max Duel, ram traffic hard: it is wrecked and left smoking at the
  roadside, still there on lap two, and you can shove the hulk. Hit it at over
  250 km/h (about 155 mph) closing and it blows up a moment after the smash.
- Heavy cars hit hardest: the Titan takes far more armor off a Falcone than it
  loses. Hard is back to about one win in four.

### Two fixes (released 26 September 2026)

- In a Mad Max Duel after finding the gate, drive up the dirt road until the
  race pauses (RACE PAUSED · DRIVE BACK TO REJOIN), then reverse or drive
  back to the course: BACK IN THE RACE, the clock, rival, weapons and
  power-ups carry on. Only driving through the gate ends the race.
- With the rally car on Pacific Canyon, leave the road near the shortcut and
  cross back over the racing line out on the dirt: you are no longer put back
  on the track. Big boulders still stop you, now with ROCK TOO BIG.

### The Wasteland easter egg (release candidate)

There is nothing new on the main menu. Pick **Mad Max Duel** on Pacific Canyon Circuit and race. Somewhere in the canyon section a faint dirt track leaves the road on the outside of a bend. Follow it for about 30 seconds to a huge wall; the gate invites you in, and **Enter** takes you to the Scrapdome yard. Until a player finds the gate, Mad Max Duel plays exactly as before. After that, that player's Mad Max Duels use the Wasteland rules (armor, crew, getting out on foot by holding **F**, raiders, scrap), and a **WASTELAND** button appears on their menu as a shortcut back to the yard. On foot, **C** switches between first-person and overhead. If you can't find the road, hints appear after 5 and 10 finished Mad Max Duels on Pacific Canyon. Current wall, crew and first-person hand art still need polish. Tell us the car, what you did, and whether the road, gate, yard or race went wrong.

In Mad Max Duel, try a rear hit on the rival, a traffic collision, falling
cacti, a missed checkpoint, and a short UFO jump after the first checkpoint.
The weapon bar previews the UFO landing in metres. Compare a low-speed hit
with a high-speed hit, then try a car with a different body style. Small trees
and signposts, along with traffic cars, now move aside on a lighter hit and
break apart on a hard hit. The cutoff is half the striking car's upgraded top
speed; this works without an Experimental setting.
The desktop shortcut now opens an already running game on a second click.
Listen on headphones for a rival hit or blast moving across the sound field;
tell us if a nearby hit feels too quiet or a distant one too loud. If you miss
a checkpoint in traffic, check whether the retry puts you near the gate with
space to drive. The normal menu still starts one rival; three-car combat
support is in progress.
Please include the car, approximate speed, course, and difficulty with a note.

## Notes from players

| Date | Player note | Event or screen | Status |
| --- | --- | --- | --- |
| 2026-09-23 | Armor felt too fragile; traffic and small roadside objects should break, rear hits should shove rivals, idle off-route bouncing and distant checkpoint resets felt rough, and UFO landing gains were unclear. | Mad Max Duel | Released in the live build on September 23. Human feel review remains, including one Hard race where later traffic contact outweighs the UFO's immediate route gain. |
| 2026-09-23 | Cars and signposts still look unmoved after a Mad Max collision. Below half the upgraded car's top speed, the hit should slow the car and knock the obstacle clear. At or above that speed, it should destroy the obstacle. | Mad Max Duel, live build on port 5174 | Released to the live server. Reload from the menu to try it. CMB-02 separately adds rival shoves and local wrecks behind the Wasteland 2 development switch. |
| 2026-09-23 | Kyle's new direction after an outside review: introduce the Wasteland as an easter egg (a hidden dirt road on Pacific Canyon leading to a huge wall and gate); graphics over posters, refined in Blender over many rounds against the reference art; first person with an overhead option; gritty, no blood; a separate Wasteland career with scrap; never lose track of the build. | Whole Wasteland plan | Written into SPEC.md section 0 with ordered cards in 0.6. Current plan: `docs/board/next-run.md`. |
| 2026-09-24 | The size problem is really bad: vibe coding leaves bloat with no cleanup, and leftover files clog the repository and agents' context. Address only the cleanup first. | Whole repository | SPEC.md section 0.7 and AGENTS.md now set where files live, size limits, removal as part of done, and CLEAN-01 to CLEAN-08 before any feature work. Done the same day: history rewritten, lane folders, branches and leftovers deleted. Current plan and start prompt: `docs/board/next-run.md`. |
| 2026-09-24 | Audio matters as much as graphics. Free plans only (ElevenLabs free tier, personal project), add voices, keep adaptive music in mind if easy, try the engine simulator, audio as its own lane in phase 2; computer use is fine for manual creation steps. | Whole game audio | SPEC 0.9 and the audio lane in `docs/board/next-run.md` (AUD-10 first). |
| 2026-09-25 | Voices are fine; raiders use Bill (Harry is too wispy and breathy). Stop building characters from scratch in Blender: it burns too much quota. Put the existing art in the game for testing, and start new art from existing assets. No Adobe account for now. | Voices and all 3D art | Voices kept in `audio-src/voices/`; SPEC 0.11 sets the source-first art approach and a three-round cap. |
| 2026-09-25 | Wasteland is working, but the controls are backwards when out of the car. We need to continue with next phase development. | Live release, on foot | Confirmed: strafing and mouse turning were mirrored on screen. Fixed in FOOT-FIX with a camera-based test. Next phase starts from `docs/board/next-run.md`. |
| 2026-09-26 | Improve vehicle crash physics overall, especially in Mad Max and Rival Duel: crashing into a vehicle should smash it out of the way like real physics. The monster truck should climb mountains and hills far off-road, with a hidden playground easter egg: mud pits, big water puddles, jumps. | Crashes; Titan | Designed by Claude: docs/CRASH_PHYSICS.md (CRASH-01 in progress on a branch, CRASH-02) and docs/MUDDY_HOLLOW.md (TITAN-01, EGG-03). |
| 2026-09-26 | After driving up the hidden road far enough that the clock stops, reversing back to the course leaves the clock stopped and the race frozen: the opponent doesn't drive and power-ups and weapons don't work. | Mad Max Duel, live build | Confirmed and fixed in GATE-REJOIN: leaving only pauses the race and driving back resumes it; only driving through the gate abandons it. Released 26 September 2026. |
| 2026-09-26 | Gratian would really like to test the warlord battles. With the rally car on the first course, near the shortcut, the game keeps resetting you and dropping you onto the track. | Warlords; Pacific Canyon, rally car | Rally: reproduced (a checkpoint crossed out on the dirt snaps the rally car back onto the road); fixed in RALLY-CHECKPOINT, released 26 September 2026. Warlords: plan in next-run.md, 'Warlords for Gratian'; Sal's fight settled in SCRAPDOME.md section 5. |
| 2026-09-30 | The Scrapdome, Titan climbing and Muddy Hollow are good enough to release. The Titan can be hard to steer, especially next to how the opponents move. Retire and remove the rule set that can't be played. | Preview: Scrapdome, Titan, Muddy Hollow | Released 30 September 2026: reload the live game from the menu. Titan steering at low speed: TITAN-HANDLING. Rule set removal: BALANCE-W2-OFF-RETIRE. |
| 2026-09-30 | Art picks: hands A; Rustwall all three together; Salt Flats all three. No cartoony, toy-like assets: they must look gritty. | Art short lists | Recorded; fitting cards ART-FIT-HANDS, ART-FIT-RUSTWALL and ARENA-06 can start under docs/WASTELAND_ART.md, "Fitting existing models". |
| 2026-09-30 | Driving up the side of a dome jump launches the car 600 to 2,200 m. Steering in the boss fight is very difficult with any car at any speed. Cars other than the Titan cannot budge the sitting cars in the dome. Beat Sal 3-0 on Medium but earned only 25 scrap. | Preview: Scrapdome, Sal | Ramp launch fixed and released the same evening (ARENA-RAMP-SIDE). Settled as cards: ARENA-STEER, ARENA-SHOVE, WAR-PAY (first win now 600 times the difficulty factor). |
| 2026-09-30 | Kyle: "I'm not picky about the rook and CC0 packs. we can use existing assets that others have developed instead of creating our own." | Crew and source art | Director chooses Quaternius Modular Men as the crew starting pack: reuse its existing rig and animations. Source comparison and licence checks stay; no bespoke body creation. Female crew source coverage is recorded for the later adaptation card. |

## Titan steering approved and integrated

Kyle, 30 September: "Titan is fine. integrate." The reviewed steering lane
merged as 7c9ff20 after 300 passing lane suites and build. Sal’s pilot hook
and Reward’s App hook are now free.

Kyle chose the CC0 Marina Shemesh salt photograph and tiling. Its mirrored
material preview is reviewed; original pixels stay unchanged. Salt model picks,
hands and Rustwall source picks remain pending in their comparison sheets.

## Design questions for Claude, 30 September 2026

Director inspection found these narrow gaps before the dependent cards start:

- WAR-02a-SAL: the two-second miss window specifies 60% speed and reduced steering. What steering factor should the pilot use?
- WAR-02a-REWARD: should the earned Side Saws entitlement equip free on every unlocked car, or only on the first-win car? The existing kit ownership is per car. No extra armor or mass is specified; confirm the side-contact bonus is its only rule. How should an existing saved defeated Sal record without kit entitlement be represented, so the UI never promises an unowned item?
- SCRAPDOME-RELEASE: FORMAT deliberately enables plain rammer Sal before signature moves and rewards. Both use scrapdome dev (SPEC0.13). Before flipping scrapdome on, settle a separate warlord development gate or keep the unfinished encounter out of that release. The Director does not release or change this settled flag on its own.

Claude's answers (30 September 2026), settled in docs/SCRAPDOME.md section 5:

- WAR-02a-SAL: 0.5 times her normal steering during the two-second window.
- WAR-02a-REWARD: Side Saws belong to the named player on every car, owned
  now or later, free; equipped automatically only on the winning car. The
  side-contact bonus is the only rule (no armor, no mass). A save with Sal
  defeated but no Side Saws gains them on load, with no scrap paid again.
- SCRAPDOME-RELEASE: a new `warlords` switch in dev gates every warlord fight
  and the territory map's launch into one. SCRAPDOME-RELEASE ships Last Car
  Rolling with scrapdome on and merges before FORMAT; FORMAT then adds
  `warlords: 'dev'` to src/feature-flags.js (it owns that file once the
  release merges) and puts Sal behind it.

## Weekly summary

The Director will add a short summary when work reaches its first checkpoint.
