# WARLORD-NINE: Magnus the Magnet, the ninth warlord

Claude, 2 November 2026. Kyle: "Gratian would like to be surprised for the section 6
design answers." Claude chose all seven (packet `docs/story/wasteland-water-road.md`
section 6, "Answers"; rules in `docs/SCRAPDOME.md`, "Settled for build: Magnus the
Magnet"). Switch `warlord-nine`.

## What a player sees

- Once Baron Blackiron is beaten, the Territory Map has a card for **Magnus the Magnet**,
  "His scrapyard on the Salt Flats", with FIGHT (REMATCH after a win). The yard's Next up
  line names him. With the Water Road on, chapter 9, "The ninth warlord", opens after the
  Baron with one button, "Fight Magnus the Magnet".
- The fight, in the Salt Flats Scrapyard: a Falcone Heritage with scrap plates and a
  roof crane holding a round magnet. **The Big Pull:** the magnet glows blue, a blue ring
  shows its reach (30 m) and `MAGNET! DRIVE AWAY!`; then for 2.5 s the player, inside the
  ring, is dragged towards him. Driving away gets free. Reaching him is a `CLANG!`
  (armor off, thrown clear). Then the magnet glows red for 3 s, he sits still and takes
  1.5 times damage: `HIS MAGNET IS RED HOT. HIT HIM NOW!`. After his first wreck he pulls
  twice in a row.
- Armor: 75 on Medium and Hard (the Heritage's arena 50 times 1.5, like every warlord); his own Easy: armor 60, never shoots, rams for half.
- First win: `THE MAGNET IS BROKEN!`, the Tesla Coil if not yet owned, the ladder's ninth
  pay (1,400 times the level's factor), his story card on the Story Wall, then on the radio
  Magnus ("You broke my magnet!...") and Hollis ("...He'll want a rematch."). He claims no
  territory. The Water Road ends: "Magnus is back in his scrapyard, sulking: rematch him
  any time from the TERRITORY MAP."
- Switch off: the game exactly as before; the Water Road ends with the Baron.

## Checks

UNFINISHED: lane tier, build, art round and browser play still to record here.

- `node tools/test-warlord-magnus.mjs`: 38 checks pass (unlock after the Baron with no
  hold, the Baron's gate unchanged, switch off refuses the fight and hides his card, Salt
  Flats venue, armor by level, the ring, the pull's sound field kept and removed, a parked car dragged in, full throttle away gets
  free, the clang, the red-hot window and its 1.5 times damage, phase two's two pulls,
  Easy never shoots and rams for half, first-win pay, Tesla Coil, no territory row, his
  record and card, the map's FIGHT and REMATCH).
- `node tools/test-water-screens.mjs`: 63 checks (new chapter 9 block: off ends with the
  Baron as before; on, chapter 9 is next, Hollis's end lines still marked once after the Baron, goes to the yard from the menu, fights him from
  the Story Wall, the tower stays full, beating him ends the road).
- **Easy (packet section 4):** `node tools/test-water-easy.mjs --rates magnus --seeds 30`:
  **29/30** (the child-pace test driver; the loss by three wrecks). Before his Easy numbers:
  0/10 (he shot and rammed the child out). Probes on seeds 1 to 10: no shooting on Easy
  0/10; rams at half 6/10; Easy armor 110 to 90, 10/10 (26/30 over 30). After the review
  set Medium and Hard to the rule's 75, Easy went to 60 so it stays lower: 29/30. Only his
  own file's numbers moved.

## Review

One independent review (code, saves, design numbers). Fixed:
1. Armor was twice the rule: a warlord car's arena armor is halved first, so the rule's
   "times 1.5" is 75, not 150. Now 75 on Medium and Hard, 60 on Easy.
2. The pull's hum would stop on the next frame (the audio keeps a field's voice only while
   the field is in the fight's state). The pull now lists its field in
   `state.combat.warlordFields`, which `src/audio.js` reads with the other fields.
3. The two docs now agree: Hollis speaks straight after Magnus, on the results.
4. The red-hot 1.5 times is in the settled table.
5. `tools/preview-player.js` no longer gives a Preview player a Magnus hold row.
6. The results name a warlord's weapon only when it is new (`warlord-settlement.js`):
   a finished player may already own the Tesla Coil. This also applies to the
   Dustmonger, Mirage and Gunn rewards, which was wrong in the same way.
The reviewer found the saves safe: his record survives loading and backups, new careers
keep eight records, no territory row is written, and a finished player's end lines do not
replay with the switch on or off.

## Changed assertions (Claude's rule-18 review)

None loosens a check; each follows the ninth entry.

- `tools/test-warlords.mjs`: the warlord list is the eight then `magnus` (was the eight);
  new checks that Magnus has no territory, roads or hold venues and is frozen. The built
  list adds `magnus`. The eight's own checks and the eight default save records are
  unchanged.
- `tools/test-warlord-blackiron.mjs`: "the seven before the Baron" was
  `WARLORD_LADDER.slice(0, -1)`, which now includes the Baron; it is now the ladder up to
  the Baron, the same seven ids as before.
- `tools/test-water-lines.mjs`: 10 to 12 captions and 18 to 20 lines in all (Magnus's line
  and Hollis's after him); every line still passes the length and wording checks.
- `tools/test-water-save.mjs`: the chapter list's job modes end with one more `null`
  (chapter 9 is a fight alone).
- `tools/test-feature-flags.mjs`: 46 to 47 switches (`warlord-nine`).
- `tools/test-water-easy.mjs`: 15 to 16 cases (chapter 9's fight, with his switch on).

## Removed

Nothing is replaced. `tools/career-rebuild.mjs` keeps Gratian's career short of the
Tollkeeper, the Baron and now Magnus.
