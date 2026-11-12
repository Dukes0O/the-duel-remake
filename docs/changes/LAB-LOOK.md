# LAB-LOOK and LAB-UX-FIXES

Claude, 11 November 2026, with Sonnet helpers and Codex's image tool. Both cards stay open (the plan is on
`docs/board/cards/LAB-LOOK.md`).

## What changed

- Round 1 (Claude): `src/lab/classroom/board-art.js` and `src/lab/lessons/lift-board.js`, described in
  `docs/board/looks/lab-look/round-1-review.md`.
- Brian's portraits (a Sonnet helper): `public/assets/lab/brian-{talk,cheer,hint,explain}.jpg` with credits;
  `src/lab/classroom/brian-faces.js` (new) maps the classroom's four moods to them and preloads them;
  `classroom-ui.js` and `classroom.css` show the portrait at 132 x 132 with a 150 ms fade.
- Routine fixes (the same helper): titles and names are no longer broken into word buttons (`src/lab/word-links.js`,
  new, with `data-name` marks on the door board, shop, rust parts, machine choice and Ask Brian); G-force's last
  button reads "Start the lap"; `docs/LAB.md` gives the Projectile challenge's 10 m and the Fire challenge's 7
  minutes and names the recipes that build the Lab's models; two narrow-window style rules are removed; one gold and
  one off-white replace two near-identical pairs.

## Checks

- All 32 `tools/test-lab-*.mjs` files pass, with two new ones (`test-lab-brian-faces`, `test-lab-title-words`) and one
  added assertion (G-force's label). No assertion was loosened or removed.
- All 24 `lab-*` browser scenarios pass, including the new `lab-brian-faces`.
- Lane tier 120 of 120 and `npm run build`.
- Look (Claude): the two sheets under `docs/board/looks/lab-look/`.

## Sound

No new game event.

## Removed

`src/lab/classroom/brian-portrait.js` (the 3D render of Brian); the brushed-steel board background and the outline
helicopter and car.

## Left for later (on the card)

The older five-step lesson frame still ships with no lesson in it, because the walking room and the lesson opener
import it; three modules nothing imports (`tunnel-model.js`, `tunnel-packet.js`, `workshop-display.js`) go with it.
