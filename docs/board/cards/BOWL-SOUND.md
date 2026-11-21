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
- **BOWL-TRICKS-ALL:** `bowl.trick.go`, `bowl.trick.late`, `bowl.secret.start`, `bowl.secret.found`, `bowl.secret.armed`, `bowl.secret.hint`.
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
- **BOWL-REX-3:** `bowl.rex.eyes.aim`, `bowl.rex.eyes.lock`, `bowl.rex.beam`, `bowl.rex.beam.over`,
  `bowl.rex.bomb.hatch`, `bowl.rex.bomb.launch`, `bowl.rex.bomb.whistle`, `bowl.rex.bomb.land`, `bowl.rex.bomb.tick`,
  `bowl.rex.bomb.burst`, `bowl.rex.stagger`.
- **BOWL-JUMP-EVENTS:** `bowl.go.ready`, `bowl.long.clear`, `bowl.high.clear`, `bowl.high.fail`. (`bowl.home.ring` and
  `bowl.home.ring.high` go with Home Run, BOWL-NIGHT-4.)
- **BOWL-NIGHT-4:** `bowl.best.rival`, `bowl.best.rival.slam`, `bowl.best.round.won`, `bowl.best.round.lost`.
- **BOWL-FREESTYLE-NIGHTS:** `bowl.free.rival`, `bowl.free.lead`, `bowl.free.behind`, `bowl.free.beaten`, `bowl.free.bar`.
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

## Kyle's try in the Preview (20 November 2026, integration at `bfec511bb`)

Kyle: "night for last truck rolling saw was really janky, especially the sound. a funny buzz instead of a saw cutting
metal", "Buzzes for sounds are terrible and need proper weaponry sounds." This card now goes first among the Bowl's
sound work, and the weapons first within it:

- **The saw:** a cutting disc on steel, a rising whine as it spins up, a hard metal scream while it touches a truck, with
  the sparks, and a ticking cool-down. Never a buzz.
- **The hammer:** a heavy hydraulic rise, then a deep clang on a truck and a thud in the dirt on a miss.
- **The launcher:** a hiss as it fills and a hard air bang when it fires.
- **The rivals' weapons and the Scrapasaurus's** (the horn's charge, Big Kettle's hammer, Tin Lizard's saw, Dragon
  Wagon's fire, the beast's roar and breath) by the same standard.
- Start from recorded library sounds (`tools/audio/catalog.json`, `memory/reuse-before-building`), not tones made in
  code. Each one is listened to in a fight before it is kept.

## Built on 21 November 2026 (Claude)

Every cue of a merged card plays a recording of its own: `tools/audio/build-bowl-sound.mjs` cuts 93 CC0 recordings
into one take per cue in `public/assets/audio/bowl/`, and `tools/test-bowl-sound.mjs` fails any named cue that plays a
stand-in or shares a file. Measured against the car-to-car crash (the change note has the levels). The saw is an angle
grinder starting, cutting steel and winding down with a hiss; the hammer is hydraulic rams, an anvil clang and a heavy
dirt thud; the launcher is a valve hiss and a large air blast; the trick that comes too late is a short crowd groan, not a
buzzer. The takes were chosen by measurement (onset, envelope, a check that the saw and hammer are not tonal buzzes),
not yet by ear. Freestyle's five and BOWL-SCREEN-FIX's `bowl.crush.hint` were added after those cards merged. Still owed on this card:

- **BOWL-REX-3's eleven**, when that card merges, the same way.
- **`bowl.trick.go`** is built and in the bank, but `src/app.js` does not play the `bowlTrickGo` event: one line in the
  Bowl's cue block, on a card that owns that hook.
- **The listening:** Claude plays each night with sound on during the final drive and writes one line here for each cue
  changed after listening; a changed cue is one edited recipe line and `node tools/audio/build-bowl-sound.mjs --only <cue>`.

**Changed assertion (Claude's review, 21 November 2026):** `tools/test-bowl-hud.mjs` pinned the card's stand-in,
`interface.radar`; it now expects `bowl.card.open`, the card's own sound. The check is as exact as before (the cue, the
output limiter as destination and the .42 scale), so nothing is loosened.

**Changed assertion (Claude's review, 21 November 2026):** `tools/test-p4-audio.mjs` pins every cue made before P4 by a
hash, leaving out the cues made since. Its Bowl exclusion covered only `bowl.crush.*`; it now covers every `bowl.*` cue,
all of which were made after P4. The hash and its expected value are unchanged, so every older cue is still pinned.
