# BOWL-LOOK-FIX

Changed (drawing only, behind `titan-bowl`): floodlight masts, pools and a warm lift on the parked cars and arches in the
car park; runners in the stands stand, lean, flee further and climb a row, with the ring leading the truck; thick dark
smoke at one fifth and five tall flames on a wreck; the saw on a raised arm with sparks to both sides; Old Bess's plate
falls back over 0.6 s after a mid-throw wreck; steel wire rope cable; sparks sized for distance, a hitch burst at a
tear and scrape sparks from a dragged box; High Jump's gas pipe with real flames; the Scrapasaurus's fire capped close
up. New `src/bowl/bowl-fx.js` holds the shared pieces. ART_LINE learns the chase camera's blind spot.
Checks on `8cd93955f` (integration `e27c0c2c0` merged in): rule 23 set (`core`, `test-replays`, `test-combat-replays`,
`test-world-composition`) passed, with `test-bowl-weapons-view` (new check: the plate falls over the lowering time),
`test-bowl-rex`, `test-bowl-course`, `test-bowl-out`, `test-bowl-camera`; `npm run build`, repo hygiene and board passed.
`test-bowl-night` fails at `bowl-lines.js` `eventRexPoints` with no boxes or fall given, the same on integration
`e27c0c2c0` without this card. Looks: `docs/board/looks/bowl-out/round-2`, `bowl-weapons/round-2`, `bowl-rex/round-8`,
`bowl-jump/round-1`. No assertion changed; no sound cue added.
**Removed:** High Jump's bunting bar (`jumpBar` body in `bowl-view.js`), the flat MeshBasic rope, and the saw's low mount.
