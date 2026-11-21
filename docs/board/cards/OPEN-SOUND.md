# OPEN-SOUND

The short board entry controls current state, ownership, dependencies and locks.

Claude's card. Each open Scablands build card names its cues in `src/world/open/open-cues.js`, with one line saying
what each is, and plays them by name. This card registers each in `src/sound-bank.js` behind `story-choices`, chooses
or makes its sound, and listens to it in the game, a batch at a time as the build cards merge. It holds the
`sound-bank` lock only while a batch is being registered.

The cues named so far, by card:

| Card | Cues |
| --- | --- |
| OPEN-ROAM | `open.talk.hail` |
| OPEN-DOORS | `open.door`, `open.wash`, `open.scrap.paid` |
| OPEN-CHECKPOINTS | `open.encounter.near`, `open.encounter.leave`, `open.flag.hail` |
| OPEN-SITES | `open.site.found`, `open.need.mended`, `open.rumour`, `open.radio.voice` |
| OPEN-THREADS | `open.smoke.seen`, `open.clue.found` |
| OPEN-APPRENTICE-RUN | `open.routine.learnt`, `open.routine.home` |
| OPEN-BURNED-SCOUT | `open.scout.seen`, `open.lookout.flare` |
| OPEN-BURNED-PEN | `open.taken`, `open.ransom.paid`, `open.pen.chain`, `open.guard.shout` |
| OPEN-BURNED-RESCUE | `open.party.ride`, `open.rescue.home` |

Checks: the suite that names the sound bank, and each cue heard in Claude's batch drive. Voice lines ship without Kyle
listening first (`memory/voice-ships-without-listening`).
