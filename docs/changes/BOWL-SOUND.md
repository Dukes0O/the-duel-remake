# BOWL-SOUND

- **What changed:** 89 Show Night cues now play a recording of their own instead of a stand-in: the weapons (Kyle's
  try: a grinding disc on steel for the saw, hydraulic rams and an anvil clang for the hammer, an air hiss and bang for
  the launcher), walls, tricks, secrets, HUD, school, crush chain, the trip outside, rivals, jump events, Night 4, the
  nights, Big Mo's PA chime and the Scrapasaurus with its hook. 93 CC0 Freesound recordings, cut by
  `tools/audio/build-bowl-sound.mjs` into `public/assets/audio/bowl/` (one take per cue, 2.0 MB), credited in
  `CREDITS.md`. Four cues that played nothing now sound (wheelie, in the stands, hook tight, box drag).
- **Loudness against the car-to-car crash** (crash files -17.2 to -18.0 LUFS; every cue plays at the crash's 4.2 gain;
  every take's true peak -1.1 dBTP or lower): strikes and the beast's big moments -14 to -16 (hammer hit -14.6,
  knockout -14.5, launcher fire -15.0, saw cut -15.5, Rex falls -13.5); walls and landings -17 to -19; tells -18 to -19
  (hammer rise -19.1, saw spin -17.7, roar -17.0); crowd -18 to -20; chimes and screens -21 to -24 (Big Mo -23.0, card
  -23.9). Each take's measured loudness and peak are in its catalog row; the listening sheet renders all of them.
- **Checks** on `bfd840ed1` plus this change: `tools/test-bowl-sound.mjs` (new: every cue named in `src/bowl/`, `app.js`
  and `sim-contacts.js` is its own recorded cue, built by its recipe, no file shared); rule 23's set with
  `--filter audio` and the Bowl suites that read the cue table: 35 passed; hygiene; `npm run build`. One review: its
  two faults fixed (the P4 bank pin, the crush script dropping this card's rows) and the check widened.
- **Changed assertions** (reviewed on the card): `test-bowl-hud` expects `bowl.card.open` instead of the stand-in;
  `test-p4-audio` leaves every `bowl.*` cue out of its pre-P4 hash, not only `bowl.crush.*`; the hash is unchanged.
- **Not done:** the five `bowl.free.*` cues (BOWL-FREESTYLE-NIGHTS unmerged), BOWL-REX-3's eleven, `bowl.trick.go`
  (built, but `app.js` does not play `bowlTrickGo`), and the by-ear listening in play.
- **Removed:** every stand-in in `BOWL_SOUND_CUES` and `BOWL_HUD_SOUNDS`.
