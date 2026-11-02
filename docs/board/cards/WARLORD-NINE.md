# WARLORD-NINE

Part of The Water Road, `docs/story/wasteland-water-road.md`.

Gratian's own warlord, chapter 9, built from his answers to packet section 6 (name, car, trick, hideout, words, friend or enemy, prize). Winnable on Easy; Gratian plays it.

## Claude answers

2 November 2026. Kyle: "Gratian would like to be surprised for the section 6 design
answers." So Claude chose all seven: **Magnus the Magnet**, a Falcone Heritage with
scrap plates and a roof crane holding a giant magnet; the Big Pull (a blue ring, then you
are dragged in; drive away to get free; then his magnet is red hot and he sits still); his
scrapyard on the Salt Flats; an enemy you can rematch from the Territory Map; the Tesla Coil
as the prize. The plain-words answers are in the packet's section 6, "Answers"; the build
rules in `docs/SCRAPDOME.md`, "Settled for build: Magnus the Magnet".

Checks that prove the card: `tools/test-warlord-magnus.mjs` (unlock, switch, pull and
escape, clang, red-hot window, phase two, Easy numbers, pay, Tesla Coil, map card);
`tools/test-water-screens.mjs` chapter 9 block; `node tools/test-water-easy.mjs --rates
magnus --seeds 30` (the child-pace driver on Easy, at least 8 in 10). Laptop-only: a
browser play of chapter 9 and a look at the magnet, its ring and its glow.
