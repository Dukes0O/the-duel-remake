# WASTELAND-GATE-ROAD-LOOK

Kyle approved the moving visual study after driving it and confirming the trailing shadow was fixed. Claude's look review of WASTELAND-ART-DIRECTION at `030a640a9` selected the centre lamp and darker wheel impressions for a real south-gate trial. This card applies those two changes in the game's Scablands renderer. [Art review](https://github.com/Dukes0O/the-duel-remake/pull/45)

Use the existing `scablands-realism` developer preview. A player driving the last 48 m of East Road into Tin Town should see interrupted wheel impressions at Big Bess's track width. Under the existing centre lamp, a small warm pool should help a driver find the opening at dusk. Both marks stay on the road when the camera or truck moves.

## Scope

- Use the road ribbon's existing world coordinates, gravel, relief and wear noise. Measure the approach and track width in metres using the canonical Tin Town gate pose.
- Own the optional material treatment in `src/world/scablands-ground-look.js` and its call in `src/world/scablands-scene.js`. Reuse the game renderer's per-frame sun and established camera. Keep the existing driving, gate movement, collision and saved state.
- Add a focused regression covering the control shader, distinct shader cache program and bounded gate treatment. Record comparisons in the handoff.

## Review

The cloud checks the normal game entry, shader controls, selected lane, production build and rendering evidence available. Claude drives the same approach on the baseline and candidate at identical dusk, viewpoint, resolution and preset. Judge the opening, light falloff, wheel width and contrast from the chase camera, including while turning. Measure 120 delivered frames on the gate approach and run `everburn-frames` on the target laptop. Its busiest Performance view has an 18.5 ms delivered-p95 limit. Record the independent verdict on the exact feature head.
