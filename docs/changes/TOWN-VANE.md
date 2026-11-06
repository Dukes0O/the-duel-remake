# TOWN-VANE, second pass

## Changed

- `updateVane` now reads current water quality from the town's tap results each month. Kiosks close when their own tap no longer has brown water. A report identifies each new kiosk and its street; letters also arrive as readable town reports.
- State inspection is read-only. Old saves gain Vane state when the monthly system first runs. Commands and the monthly update remain the only writers.
- The letter content rows now include their detection source. Detectors cover finished service buildings, drought weather, population marks, deed ownership and deed sets. Mr Crisp leaves a readable town report once a year. The existing deed system makes one bid at a time on its four-month rhythm; after twelve Vane-owned deeds, new bids are paused for two years.
- Chapter 18 opens after two kiosks. Chapters 19 and 20 follow saved story facts, and chapter 21 checks Year 11, chapter 19, a tanker and Dot standing.
- Added ten seeded 30-year `stepTown` runs. They assert that Vane starts and does not remove every resident or the Town Hall.

## Waiting conditions for Claude

The current town state does not expose these events, so their content rows are marked `waiting`: building burned, wet month, winter spent in canvas, Bo reaching fifteen, warlord peace choices, Magnus's second visit, Vane truck raid, fuel escort, player winning a deed bid as a retained event, family departure, Kestrel over Vane's tower, Scrapdome win, Scrapasaurus beaten, annual road change, Town Book read and player reply. Please add durable event sources in their owning cards before expecting these letters to arrive.

Chapter conditions also depend on town story fields (`tollkeeperArrived`, `settledWarlords`, `dotStanding`) that town systems do not yet populate. The chapter state follows these fields when a story system supplies them.

## Checks

- `node tools/test-town-vane.mjs`: passed, including 10 seeds over 30 years each, read-only state inspection and old-save initialization.
- `node tools/test-town-visits.mjs`: passed.
- No other `test-town-*.mjs` imports the changed Vane modules.
- `npm.cmd run build`: passed. Vite reported the existing dynamic import and large-chunk warnings.
- Lane tier: not run; Claude runs it as requested.
- Browser and look checks: not run. Claude should inspect Year 7 activation, real tap-driven kiosks and closure, kiosk and letter reports, Crisp's annual report, 18-21 chapter progression, and the deed pause after twelve Vane deeds.
- Changed assertions: no assertions were weakened or changed. The existing kiosk test fixture now supplies water-system tap results instead of relying on manual street injection.
- Race fingerprints: no before-Year-7 on/off fingerprint comparison was available in the lane. Vane retains order 82 and one-tick spacing and consumes no random numbers. This should leave other systems' pre-Year-7 results unchanged.

## Removed

- Removed state writes from `townVaneState`; no feature behavior was removed.
