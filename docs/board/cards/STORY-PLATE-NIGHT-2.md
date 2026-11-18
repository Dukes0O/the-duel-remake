# STORY-PLATE-NIGHT-2

One painted plate, tried once: the opening of Night 2, the Walkers at Tin Town's gate at dusk. Kyle, 18 November 2026,
said yes to trying one plate, after the study WASTELAND-ART-DIRECTION showed that an illustration can carry a still
moment far better than the game's own picture, and that an illustration drawn freely shows a different truck from the
one a player drives. Codex's card, for its cloud. Claude judges the pair before Kyle sees it. The people in the picture
are the figures STORY-PEOPLE made (merged 18 November).

## The two conditions

1. **The plate is drawn over a render of the playable scene.** The gate, the fence, the lamps, the carts and the eleven
   Walkers in the plate are the game's own models, in the positions the scene gives them. The illustration adds light,
   air, dust, cloth and faces. It does not add, remove, move or resize a thing.
2. **A plate is used only where the camera is still.** Anything driven, walked around or fought stays in 3D.

## The moment

`docs/story/five-cold-nights.md`, section 4, scene 2: "Outside, in the last light: eleven people, four handcarts and no
fire." Seen from inside the gate, at a standing person's eye height (1.62 m), looking out through the opening. The
town's three lamps are lit and warm; the people outside stand in cold blue dusk, just beyond the reach of the light. Rell
is in front. Dace is a boy at a cart, looking past the viewer into the town. Wim is six, in her mustard work jacket, seated on a cart. Nobody
carries a weapon. The tone is gritty reportage, never a toy and never a poster: no text, no border, no logo.

## Part 1. The pair (stop here for Claude)

1. **The base render.** Stage the south gate (`createTinTownGate`, `createTinTownShacks`, as
   `tools/art/wasteland-direction/stage.mjs` does) with the Walkers and their handcarts from STORY-PEOPLE in the
   scene's positions. Render it in Blender at 16:9, 1,920 by 1,080, with the camera above. Keep the recipe under
   `tools/art/story-plates/`.
2. **The plate.** Make the illustration from that render as its first reference, with the instruction that the render
   fixes every outline and position. Then check it against the render: lay the two over each other and list every
   outline that moved by more than 2% of the picture's width. A plate with a moved gate post, a changed cart or a
   different count of people is made again, not explained.
3. **The sheet.** One comparison sheet, `docs/board/looks/story-plates/night-2.jpg` (500 KB at most), with a review
   note beside it: the base render, the plate, and the overlay with the differences marked. Leave a labelled empty
   place for the picture from the running game; the laptop takes it, because a cloud cannot.
4. Set `waiting_on: claude`. Nothing is put where the game loads it in this part.

## Part 2. In the game (only after Claude's written yes on this card)

- The plate goes to `public/assets/story/plates/night-2.jpg` (JPEG, 1,920 wide, 400 KB at most), loaded only when
  `story-choices` is on and only when Night 2 opens.
- A small view, `src/story/plate-view.js`: the plate fills the picture for the scene's first line, Auntie Solder's line
  about the gate bell is shown over it as a caption, and on the player's key it fades in one second to the 3D scene with
  the camera at the same place and aim, so that the plate and the game are seen to be one place. No state of the game
  changes while the plate is up. STORY-NIGHT-2 calls it; if that card is not merged yet, leave the call as a named hook
  and say so in the note.
- Sound: `story.plate.open`, the wind outside the gate, made from the bank's own layers, fading with the plate.

## What stays fixed

- One plate. No second plate, no gallery and no general system for plates until Claude and Kyle have judged this one.
- The generated image cannot be rebuilt from its prompt. Keep the one selected version and no others; the base render's
  recipe and the prompt are the record. Credit it as original work for this project in a `CREDITS.md` beside it.
- No small-screen layout. The game is played on one laptop.

## Checks

- Part 1: the overlay list (every difference over 2%, or "none"); `tools/test-board.mjs` and
  `tools/test-repo-hygiene.mjs`.
- Part 2: a new `tools/test-story-plate.mjs` (the plate is asked for only with `story-choices` on; the view changes no
  game state; the fade ends on the scene's own camera); the lane tier; `npm run build`.
- For Claude to run and judge: the picture from the running game at the same camera, placed on the sheet; Part 2's
  browser scenario `story-plate` (the plate, the middle of the fade, the 3D scene); listening to the wind.

The verdict Claude owes on Part 1: do the plate and the game look like one place, and does the game look poor beside
it? If the game looks poor, the trial stops at this one plate.
