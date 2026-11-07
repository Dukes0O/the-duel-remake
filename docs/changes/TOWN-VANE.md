# TOWN-VANE, third pass

## Changed

- Crisp, kiosk and letter reports use stable Vane report keys. Their panel rows update in place rather than growing each year. The full letter archive remains in `town.vane.letters`.
- Every delivered letter also becomes a full-text Town Book entry. The 100-year test checks that each saved letter appears in the Book view and that the report panel stays bounded.
- From Year 8, `updateVane` records `quiet-yearly-visit` and `quiet-yearly-no-reply` in alternating years. This fixed turn-taking needs no random choice. The 100-year test checks that letters arrive yearly and do not repeat back to back.
- Ten seeded 30-year tests now outbid every deed bid and clean each street after Vane opens kiosks. They check that kiosks close, she stays polite, letters continue and her state remains active.
- Added a test-only unregister/restore function to compare the six-year save with the Vane system registered and skipped. After removing `town.vane` from the registered save, all other saved data matches.

## Waiting conditions for Claude

The current town state does not expose these events, so their content rows are marked `waiting`: building burned, wet month, winter spent in canvas, Bo reaching fifteen, warlord peace choices, Magnus's second visit, Vane truck raid, fuel escort, player winning a deed bid as a retained event, family departure, Kestrel over Vane's tower, Scrapdome win, Scrapasaurus beaten, annual road change, Town Book read and player reply. Please add durable event sources in their owning cards before expecting these letters to arrive.

Chapter conditions also depend on town story fields (`tollkeeperArrived`, `settledWarlords`, `dotStanding`) that town systems do not yet populate. The chapter state follows these fields when a story system supplies them.

## Checks

- `node tools/test-town-vane.mjs`: passed. Includes the 100-year archive and bounded-report check, the 10-seed 30-year adversarial run, and the Year 1–6 save comparison.
- `node tools/test-town-visits.mjs`: passed.
- `node tools/test-town-deeds.mjs`: passed.
- `npm.cmd run build`: passed. Vite reported its existing dynamic-import and large-chunk warnings.
- Lane tier: not run; Claude runs it as requested.
- Browser and look checks: not run. Claude should inspect the Book's full Vane letters, the latest-in-place report rows, Year 7 activation, yearly letter order, kiosk closure, Crisp's annual visit, chapter progression and deed pause after twelve Vane deeds.
- Changed assertions: none were changed or weakened. New assertions cover this pass's acceptance points.
- Race fingerprints: no race code or fingerprints changed. The new Year 1–6 save fingerprint matches outside `town.vane`.

## Removed

- No files or game behavior were removed. The earlier passive long-run assertions were replaced by the requested stronger adversarial checks.
