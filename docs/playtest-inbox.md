# Wasteland play-test inbox

Add a note here after trying a build. Include the event, car, difficulty and
what happened. Screenshots and short recordings help when a problem is visual
or hard to repeat. Do not include saved career data.

## What's new to try

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

## Weekly summary

The Director will add a short summary when work reaches its first checkpoint.
