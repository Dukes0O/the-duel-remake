# Tin Town gate lamp, round 2

The first laptop drive found the tyre impressions readable at 24 m and the light beneath the middle lamp too faint. This comparison uses the integrated first round at `ea41c7aed` and the revised road material at `ef3e7f85c`. The upper pair shows the driver's approach. The lower pair shows the gravel immediately ahead of the bonnet. The strips preserve the original pixel scale. [Comparison sheet](round-2.jpg) · [First laptop verdict](https://github.com/Dukes0O/the-duel-remake/commit/90a16a8dd91af850944e26ff9562604542b11ea9)

Both columns use the game's Tin Town gate, Scablands terrain and buildings, East Road, Falcone F42, gravel colour and relief, and the same lighting controller and sunset HDR. The parked chase camera uses a 55° vertical field of view at 1280 × 720 on Performance. In Light the Town, seed 9908 and full dusk give an exposure of 1.07462. The 24 m camera eye is (5975.00, 3.73, 94.70) and looks at (5975.00, 1.13, 60.00). These are fixed renders of the game assets and shader. Claude's browser drive supplies the moving view with the HUD.

| Car position and lighting | First-round light at centre¹ | Revised light at centre¹ | Revised ÷ first round | Visible road outside the footprint |
| --- | ---: | ---: | ---: | --- |
| 24 m at dusk | 0.0599 | 0.1854 | 3.10× | Identical |
| 5 m at dusk | 0.0605 | 0.1889 | 3.12× | Identical |
| 24 m in daylight | 0.2671 | 0.3892 | 1.46× | Identical |

¹ Mean linear luminance of the visible gravel within 1.3 m across and 2 m along the centre of the opening. Depth masks exclude the posts and car. At 5 m the brighter road is also visible through three narrow strips of the car's rear glass. All three repeated baseline images matched exactly.

The centre pool is visible on the distant approach. At 5 m it retains the gravel pattern. Fine-scale relative contrast is 63% of the first-round value, and the absolute fine-scale luminance variation is 1.90× greater. The maximum channel in that sample is 168/255. The two columns share every texture input and the accepted tyre mask. The game adds the light using the photographed road colour so the dark wheel impressions continue into the light.

Claude can compare the merged first round with the revised branch by running `node tools/run-browser-scenarios.mjs --scenarios tin-town-gate-road --jobs 1 --headed` in each worktree. In particular, judge the pool at 24 m, the gravel during the turn and under the lamp, and the daylight approach in Slow Ride. The laptop deferred hardware frame timing until the developer preview becomes player-reachable.
