---
task: DEEP-LOG
status: review
kind: feature
flag: the-deep
player_facing: yes (behind the-deep, dev)
---

# DEEP-LOG: the sea-life log, pearls and their pay (25 October 2026)

THE_DEEP sections 5 and 6.4 to 6.6, card `docs/board/cards/DEEP-LOG.md`.
Built on `cloud/deep-log` from `integration/wasteland`, behind `the-deep`
(dev). Claude's answers to the six design questions are on the card.

## What changed

- `src/deep/deep-log.js` (new, pure rules like `deep-sirena.js`):
  - **Creatures and pages.** The 14 creatures, each with its name and the
    fact from section 5's last column, word for word. One page per coast:
    Kelp Coast 7, Wreck Reef 6, Night Harbour 3, three pearls each. The
    turtle and the crab are on two pages.
  - **Logging and pearls.** `createLog` and `stepLog` measure the car
    against the zone's fixed spots and pearls, never the moving creatures.
    A creature is logged within 6 m of its spot, a pearl found within 3 m,
    both under 15 km/h for one second without a break. They emit
    `deepLogged {creature}` and `deepPearl {pearl}`. Something already in
    the save gives no card and no pay.
  - **Pay.** `recordLogged` pays 50 for a first log, plus 250 for each page
    it completes. `recordPearl` pays 150 a pearl and reports the ninth.
    Each pays once and stops at the save's credit cap, as `deep-sirena.js`
    does. Both are refused with the switch off.
  - **Ana and the garage.** `phoneLineFor` picks Ana's lines: the otter
    line the first time, the log line for the others, the page line only
    for the Kelp Coast page, and the pearl line only for Kelp Coast pearls,
    since it speaks of abalone. `logPage` and `logCardMarkup` give the
    garage page and the card that slides in during a dive.
- `src/paint-presets.js`: **Pearl White** (`0xf1ede4`, a soft clear-coated
  sheen), a free reward for every owned car once the save holds all nine
  pearls. It is earned from the save itself, so the `app.js` paint calls are
  unchanged, and it is never taken away.
- `src/screen-garage.js` and `src/screen-garage.css`: the **Sea-life log**
  panel under the dive kit, shown with the switch on once the kit is owned
  or a coast is found. It has one row per coast found, picture cards with
  the name and fact, and grey shapes (the same picture darkened) for
  creatures not yet found. It shows the count logged, "page complete" and
  the pearl count.
- `public/assets/deep/log/*.webp`: 13 working pictures (116 KB), rendered
  from DEEP-ART-SRC's working models by the recipe
  `tools/scenarios/deep-log-pictures.mjs` (the look page's own Three.js,
  transparent background). It writes the pictures and a sheet to evidence,
  and replaces the installed pictures only with `DUEL_DEEP_LOG_INSTALL=1`.
  The otter's role is held, so its card has no picture. Sheet and notes:
  `docs/board/looks/deep-log/round-1.jpg` and `round-1-review.md`, for
  Claude's verdict.
- `.gitattributes`: `*.webp binary`. These are the repository's first WebP
  files, and the `* text eol=lf` default changed their bytes on commit.

**Not in this card (Claude's answer 1):** running `stepLog` during a dive,
saving the pay and showing the card and Ana's caption all need
busy-game-files (`game.js`, `app.js`), held by GP-PASSING-2. DEEP-SIRENA-VIEW
wires them beside the Sirena's calls; the line is on that card. Until then a
player cannot log in the game, and the garage page shows what the save holds.

## Sound cue

`deepLogged` plays `deep.logged` and `deepPearl` plays `deep.pearl`. Both
cues exist and are already mapped in `src/deep/deep-audio.js`. Ana's
`deep.ana.log`, `deep.ana.otter`, `deep.ana.page` and `deep.ana.pearl` are
recorded (DEEP-RADIO); `phoneLineFor` names them for the wiring card.

## Checks

- `tools/test-deep-log.mjs` (new): 12 tests, all pass, after the review fixes:
  - every one of the 14 facts and names matches section 5 of
    `docs/THE_DEEP.md`, read from the file;
  - the pages and pearls;
  - the 6 m and 15 km/h edges, the one-second hold and a break restarting
    it, and two nearby spots each keeping their own second;
  - fixed spots, the switch off and a broken car picture;
  - the 3 m pearl edge and its offset to the left;
  - pay once, a page completing (the whole Kelp Coast pays 600) and never
    paying twice;
  - shared creatures completing their other pages;
  - nine pearls: 150 each, pearl white for owned cars only, kept after a
    reload, a forged selection refused;
  - Ana's lines;
  - the garage page rows and grey shapes, and every picture present;
  - on the real Kelp Coast, on every route, all seven creatures and three
    pearls can be logged by driving to them.
- Lane tier (`--changed --jobs 4 --keep-going`, current integration merged
  in, after the review fixes): 56 suites, 53 passed, 3 failed. All three need
  the laptop (`test-course-kit`, `test-earned-cars-ui`, `test-medals`: the
  Windows Recycle Bin). An earlier run also failed `test-deep-look` on this
  card's own new `src/deep` imports; it passes (5287 checks) after the
  allow-list change below.
- `npm run build`: built.
- Picture recipe:
  `node tools/browser-harness.mjs scenario deep-log-pictures` passed with 0
  console errors. Cloud runs need a Chromium wrapper with `--no-sandbox`,
  because the container runs as root; there is no repository change for
  that.
- **Laptop to run:** `test-course-kit`, `test-earned-cars-ui`, `test-medals`
  (they touch the garage), and a look at the garage log panel.

## Changed assertions (for Claude's review)

- `tools/test-paint-presets.mjs`: catalogue count 5 to 6 ("three reward
  finishes"), because Pearl White is a new finish. Every other assertion is
  unchanged, and the new finish passes the existing per-finish checks (frozen,
  clear-coat fields).
- `tools/test-deep-look.mjs`: the `src/deep` import allow-list gains this
  card's named hooks, `screen-garage.js` and `paint-presets.js`
  (`deep-log.js` only), its test and its picture recipe. Nothing is removed
  from the guard.

## Review

One independent review, because this is money code. Verdict **CLEAR**. It
probed paying twice, the 128-id limit, bad and capped credits, the hold rules
in mph, pearl white on a reload and with forged saves, HTML injection, the
facts, and the switch off. Two small faults it found are fixed here, and
neither can happen on the Kelp Coast:

- At the 1,000,000,000 credit cap a first log pays 0, and Ana stayed quiet.
  The results now carry `recorded`, and `phoneLineFor` uses that.
- Two different creatures' spots less than 12 m apart reset each other's
  second, so a car between them logged neither. Each spot now keeps its own
  second. New test for both cases.

Style notes, also done: picture paths start with `/assets/` like the rest of
`src`; `logCardMarkup(null)` returns nothing instead of throwing; and the
garage summary counts the turtle and the crab once, not once per page.
Remaining note: the coast ids `wreck-reef` and `night-harbour` must match the
zone ids DEEP-REEF and DEEP-NIGHT choose.

## Removed

Nothing.
