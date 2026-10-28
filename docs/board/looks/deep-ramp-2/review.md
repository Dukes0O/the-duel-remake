# DEEP-RAMP-2 picture review

`round-1.jpg` shows the actual private QA game, not a mockup. 1600 by 1020, 281,763 bytes. The supplied Kyle screenshots are not included or committed.

- Turn-off: open road edge, two short posts, faded double-sided BOAT RAMP sign.
- From the road: worn concrete, low kerbs, full-width level cross-section and graded side banks. No hillside crosses the deck.
- Descent: higher chase view looks down the ramp toward the water; the car sits on the deck.
- Water: the existing stopped Dive or Turn back choice remains.
- The misleading loose-surface warning is replaced only on the ramp with slow-roll and backing-up guidance.

Builder verdict: acceptance look passes. Readability, grounding and scene consistency each 4/5. Driving and reverse are proved by actual fixed-step tests, rather than inferred from the still pictures. No frame-timing claim is made by this sheet.

Recipe: `node tools/run-browser-scenarios.mjs --scenarios deep-ramp-2 --jobs 1`. Arrange turn-off, ramp-from-road, descent-chase and water-choice as two rows of two, each resized to 782 by 440 pixels with Lanczos, on a 1600 by 1020 dark background. Add captions in Segoe UI and save JPEG quality 85 (lower only if needed to stay under 500 KB). The source recipe keeps QA on a private port with memory-only storage.
