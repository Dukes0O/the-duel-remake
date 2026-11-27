# HOME-GROUND-2-DRIVE

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol), small, behind `home-ground` (rule 23). The seven things Claude's drive by hand of step 2 found
(`docs/board/looks/home-ground/drive-2.md`, with pictures described there). Words live in
`src/world/open/content/home-ground.js`; rules in `src/world/open/home-rule.js`; drawing in
`src/world/open/parts/home.js` and `src/world/open/looks/home-hens-look.js`; the HUD in `src/world/world-hud.js` and
`.css`.

1. **The board's lines** show only while he stands within about 6 m of the board (and never in the overhead view), and
   are rewritten when the numbers change: after a gather the store line gives the new count.
2. **A nest box is placed a step ahead of him**, where he looks, so the box and its outline sit in the middle of the
   view above the HUD panels, not under his feet. The same reach then offers F to gather.
3. **Moss is drawn at the crate** while the hens are waiting, using the open world's existing Moss figure, standing
   beside it facing the gate. He walks back toward Tin Town (or simply is no longer drawn) after his lines.
4. **The hen's name box** drops "Press F at the board to change it later." Its hint becomes "Type a name and press
   Enter."
5. **The weapon panel** (LONGHORN RPG, AMMO) is hidden while the hammer or wrench is in his hands.
6. **The away line** is left out when the gap is under an hour; the board then opens with its first real news.
7. **The hens are easier to find**: check their drawn size against a real laying hen (about 40 cm tall standing); if
   they are smaller, scale them to it. From the gate they should read as hens, not dots. No new art.

Checks: `test-home-ground` and `test-home-hens` gain one assertion each for items 1, 2, 4 and 6 (by behaviour, not
exact numbers); the rule 23 set; `npm run build`. Claude drives it by hand after the merge, with the hen art round 5.

## Claude answers
