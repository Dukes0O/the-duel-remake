# Wasteland play-test inbox

Add a note here after trying a build. Include the event, car, difficulty and
what happened. Screenshots and short recordings help when a problem is visual
or hard to repeat. Do not include saved career data.

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
| 2026-09-30 | The Scrapdome, Titan climbing and Muddy Hollow are good enough to release. The Titan can be hard to steer, especially next to how the opponents move. Retire and remove the rule set that can't be played. | Preview: Scrapdome, Titan, Muddy Hollow | Release follows the crash cleanup Codex is finishing (SCRAPDOME-RELEASE). Titan steering at low speed: TITAN-HANDLING. Rule set removal: BALANCE-W2-OFF-RETIRE. |

| 2026-09-30 | Kyle: "I'm not picky about the rook and CC0 packs. we can use existing assets that others have developed instead of creating our own." | Crew and source art | Director chooses Quaternius Modular Men as the crew starting pack: reuse its existing rig and animations. Source comparison and licence checks stay; no bespoke body creation. Female crew source coverage is recorded for the later adaptation card. |

## Design questions for Claude, 30 September 2026

Director inspection found these narrow gaps before the dependent cards start:

- WAR-02a-SAL: the two-second miss window specifies 60% speed and reduced steering. What steering factor should the pilot use?
- WAR-02a-REWARD: should the earned Side Saws entitlement equip free on every unlocked car, or only on the first-win car? The existing kit ownership is per car. No extra armor or mass is specified; confirm the side-contact bonus is its only rule. How should an existing saved defeated Sal record without kit entitlement be represented, so the UI never promises an unowned item?
- SCRAPDOME-RELEASE: FORMAT deliberately enables plain rammer Sal before signature moves and rewards. Both use scrapdome dev (SPEC0.13). Before flipping scrapdome on, settle a separate warlord development gate or keep the unfinished encounter out of that release. The Director does not release or change this settled flag on its own.

## Weekly summary

The Director will add a short summary when work reaches its first checkpoint.
