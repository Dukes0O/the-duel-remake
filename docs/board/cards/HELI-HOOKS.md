# HELI-HOOKS

Plug the helicopter into the game: the menu entry, the app hooks, the renderer's scene hook and the cue list line.

Owner: Claude. Design: `docs/HELICOPTER.md` (the packet, section 9). The
board entry holds state, needs and locks.

Holds `busy-game-files` and `sound-bank` together, once, for as short a
time as possible. Files: `src/app.js` (`visitHeli()`, the session in
`_simulate` and `_applyInput`, `returnToMenu`, dispose, Race here),
`src/render3d.js` (a private scene hook like the Deep's),
`src/screen-router.js` and `src/screen-menu.js` (a menu entry shown only
with the `helicopter` switch on), and one line in `src/sound-bank.js`
mapping the cue list from `src/heli/heli-audio.js`. With the switch off
nothing changes: race replays, world signatures and the menu stay exactly
as they are. Re-sliced from HELI-MODE, HELI-RADIO and HELI-DISPATCH on
14 October 2026 while AUD-15-P1 held both locks.
