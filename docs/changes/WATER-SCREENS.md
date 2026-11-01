# WATER-SCREENS: the Water Road on screen

Claude (Director), 1 November 2026. Card `docs/board/cards/WATER-SCREENS.md`, part of
The Water Road (`docs/story/wasteland-water-road.md` sections 2 and 3). Behind
`water-road` (dev). Every word and button comes from `src/story/water-road.js`.

## What changed

- `src/story/water-ui.js` (new): the Water Road's Story card ("THE WATER ROAD", Hollis's
  note as the letter, V.'s notes under it, chapters 0 to 8 with ticks); the Story
  Wall section in the yard (the same chapters, one button on the open one); the
  yard's "Next up" (the open chapter, its words and its button); the results line
  ("Water Road: chapter 2 job done. The pump coughs into life." or "chapter 8, The
  Cistern, is done.").
- `src/story/story-ui.js` (shared card): a step may carry a bar (drawn under its words
  while open), a story may say itself when a message waits, notes show under the
  letter, and one action can serve every step of a story (told which step). Kogane's
  card is unchanged (its suites pass with no changed assertion). `story-ui.css`: the
  bar and the notes.
- `src/screen-menu.js`: the Water Road's card joins the STORY button (the chooser
  when both stories show). A race chapter fills the setup; a Scrapdome game or fight
  goes to the yard; a road not owned opens Your Courses.
- `src/screen-yard-home.js`: with the story on, the yard's Next up is the open
  chapter and its one button; the Story Wall shows the Water Road above the warlord
  cards. With it off the yard is byte for byte as before.
- `src/screen-router.js`: the yard gets the Water Road props; opening the STORY WALL
  reads Hollis's note and V.'s notes so far.
- `src/screen-results.js`: the tick line on a won story job or a warlord's first
  defeat. `src/app.js`: `result.waterChapter` on a warlord's first defeat (Vesper's
  line after the Baron, as before), and `waterYardStage()`.
- `src/scrapdome-yard.js` and `src/render3d.js`: the water works
  (`water-works.glb`, WATER-YARD-ART) load only when the story first asks for a
  stage, stand at (-4, 0, 31) in the yard, and show each chapter's part (patched
  pipe, fuel, valve, roof, lit boiler, truck, one tower level at a time, well water
  and the running tap at the end). Stage = warlord chapters done in order.
- `tools/test-water-screens.mjs` (new, 50 checks).

## Checks

- `node tools/test-water-screens.mjs`: 50 checks pass. Story, yard, arena and warlord
  suites pass unchanged: test-story-ui, test-story-registry, test-story-hooks,
  test-water-hooks, test-yard-next, test-arena-ui, test-warlord-format,
  test-warlord-gunn.
- Lane tier, build, browser look and the yard frame check: see below.

## Changed assertions

None.

## Removed

Nothing.
