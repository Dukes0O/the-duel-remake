# BOWL-SOUND

The short board entry controls current state, ownership, dependencies and locks.

Every other new sound of Show Night round 2, chosen and listened to. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md). Claude's card:
sounds are chosen by ear (rule 15). The crush set has its own card, BOWL-SOUND-CRUSH, which does not wait for this one.

Each building card names its cues and points each at a stand-in already in the sound bank (`BOWL_SOUND_CUES` in
`src/bowl/bowl-lines.js`). This card replaces the stand-ins with sounds of their own, from library sounds as recipes in
`tools/audio/catalog.json`, and pays what BOWL-FINISH still owes: nobody has listened to the Bowl's stand-in cues.

## The cues, by the card that names them

- **BOWL-WALLS:** `bowl.wall.bounce`, `bowl.wall.hard`, `bowl.wall.big`, `bowl.wall.scrape`.
- **BOWL-TRICKS:** `bowl.trick.land`, `bowl.trick.new`, `bowl.trick.slam`, `bowl.trick.wheelie`, `bowl.trick.cyclone`.
- **BOWL-HUD:** `bowl.health.hit`, `bowl.health.danger`, `bowl.card.open`.
- **BOWL-TRICK-SCHOOL:** `bowl.school.tick`, `bowl.school.next`, `bowl.school.why`, `bowl.school.done`.
- **BOWL-CRUSH:** `bowl.crush.chain`, `bowl.crush.fullhouse`.
- **BOWL-OUT-SIM:** `bowl.out.over`, `bowl.out.stands`, `bowl.out.leap`, `bowl.out.gate`, `bowl.out.back`.
- **BOWL-RIVALS-2:** `bowl.race.lights`, `bowl.race.finish`, `bowl.rival.jump`.
- **BOWL-WEAPONS:** `bowl.hammer.rise`, `bowl.hammer.hit`, `bowl.hammer.miss`, `bowl.saw.spin`, `bowl.saw.cut`,
  `bowl.saw.hot`, `bowl.launcher.fire`, `bowl.launcher.fill`, `bowl.rhino.horn`, `bowl.dragon.fire`,
  `bowl.out.of.the.bowl`, `bowl.knockout`, `bowl.weapon.pick`.
- **BOWL-REX-2:** the eleven kept `bowl.rex.*` cues and `bowl.rex.burst`, `bowl.rex.sag`, `bowl.rex.rise`,
  `bowl.rex.sweep`, `bowl.rex.brace`, `bowl.rex.box.out`, `bowl.rex.box.drag`, `bowl.hook.fire`, `bowl.hook.bite`,
  `bowl.hook.clang`, `bowl.hook.tight`, `bowl.hook.jerk`, `bowl.hook.letgo`.
- **BOWL-JUMP-EVENTS:** `bowl.go.ready`, `bowl.long.clear`, `bowl.high.clear`, `bowl.high.fail`, `bowl.home.ring`.
- **BOWL-NIGHTS:** `bowl.night.open`, `bowl.night.new`.
- **Already in the game on stand-ins:** `bowl.mo`, `bowl.crowd.rise`, `bowl.event.won`, `bowl.event.lost`, `bowl.purse`,
  `bowl.turn.up`, `bowl.turn.winner`.

## What done looks like

No Bowl cue plays a stand-in. Each tell (the hammer's rise, the saw's spin, the Scrapasaurus's roar and sag) can be told
from the others with eyes shut. Claude has played each night with sound on and written one line on this card for each cue
changed after listening. Big Mo's voice follows `memory/voice-ships-without-listening`.

## Files and locks

`tools/audio/catalog.json`, `public/assets/audio/`, `src/sound-bank.js`, `src/bowl/bowl-lines.js` (`BOWL_SOUND_CUES`),
the Bowl's branch in `src/audio.js`. Lock: `sound-bank`.

## Checks

1. The audio budget check and `tools/test-repo-hygiene.mjs` (file homes and sizes).
2. A check that every cue named in `BOWL_SOUND_CUES` is in the bank and that none points at another event's sound.
3. Laptop only: Claude listens, as above.
