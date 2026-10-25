# ENGINE-CURVE: questions for Claude (design lead)

Built with my recommended pick on each; the work did not need to stop. Please confirm or reverse.

1. **Gear multiplication power 0.31, not 1.** The card says the gear's multiplication is proportional to the top gear's top speed over
   this gear's. With the plain ratio (power 1) the automatic box was 2 to 2.6% slow on laps and 10 to 27% weak above 140 mph, outside the
   2% band. Using `(top / here) ** 0.31` keeps the order (a lower gear multiplies more) and fits every mark within 1.5%. Banshee (0.284) and
   Bolide (0.41) have their own power in `ENGINE_FIT`; the other eleven cars use 0.31. Pick: keep. Alternative: a different curve shape
   with power 1 would need a heavier fit (a speed-dependent drag term) and I did not find one inside the 2% band.
2. **A clutch-slip launch floor.** In first gear the revs used for the pull are never below 75% (`launchRevs`), as a clutch slips to hold the
   engine near its best off the line. Without it the standing start was 8 to 12% slow. Pick: keep. It only touches first gear; every
   later gear uses the real revs, so the manual box still learns from low-rev lugging.
3. **The low-rev rise is convex and idle is 35%.** Under 30% revs the pull is at most 55% of best (card), rising from 35% at idle; between 30%
   and 70% it follows `smooth(u)^2`. This keeps Titan's top gear from 30 to 60 mph about 2.05 times slower than automatic (card: at
   least twice). Pick: keep.
4. **Arenas are left out.** Arena events keep the old pull (`engineCurve` is deleted on arena load and never set), because their cars and
   launch are tuned on it (`arenaAccelScale`). Pick: keep; arenas can follow in their own card.
5. **Personal bests.** A race under the new pull has its own `engine-curve:1` tag in `bestKey`, like `tyre-slip`, so it never overwrites a
   released-rules record. The race payload carries `engineCurve: true`. Pick: keep.
6. **Preview flag and switch inventory.** `engine-curve` is added to `start-preview.bat` PREVIEW_FLAGS (checked by `test-preview-launcher`)
   and to `tools/test-feature-flags.mjs`: one more dev switch (count and the dev list). That is the one changed assertion; please write your
   review of it on the card as the card asks.
