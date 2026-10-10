// Tremblant Woods (docs/CIRCUITS.md section 5.3): a rolling forest circuit with
// a plunge to a lake, crests, a hairpin and the long Timber Straight. Road
// layout only; autumn light, the lodge, lake, chairlift and the full field
// belong to Codex's P4-TREMBLANT card.
//
// The drafted script ended 1,734 m from where it began: after the hairpin its
// long straight ran away from the start and every later turn bent the same way.
// It was fitted with tools/track-script-fit.mjs, keeping the Lodge Straight, the
// Beaver Hairpin and the Timber Straight, after first making Ridge Corner a small
// right bend so the hairpin turns the road back. Changes from the draft:
//   turns: Pine Drop 60 to 61.5, Lakeside Plunge 70 to 75, Fir Esses 1 40 to
//     32.5 (radius 50), Fir Esses 2 35 to 41.5 (radius 55), Ridge Corner 90 at
//     radius 35 to 24.5 at radius 60, Devil's Chicane 30 to 29.5 each, Lodge Bend
//     65 to 133.5, Final Turn 40 to 54.5 (radius 90);
//   straights: Lakeshore 240 to 134, Ridge Run 320 to 153, the boards straight
//     280 to 318, 220 to 219, the straight before the Final Turn 200 to 75.
// The lap is about 3.2 km. Claude's finishing pass should redraw the shape.
import { defineScriptedCourse } from '../track-script.js';

export const TREMBLANT_WOODS = defineScriptedCourse({
  id: 'tremblant-woods', name: 'Tremblant Woods', flag: 'tremblant-woods',
  theme: 'alpine', stage: 18, kind: 'circuit', layoutVersion: 1,
  closed: true, laps: 4, hasRival: true, hasRadar: false, noTraffic: true, speedLimitMph: 100,
  airborne: true, terrainHalfWidth: 64, defaultMood: 'golden',
  sections: [
    { theme: 'alpine', name: 'Lodge and Lake', share: .35 },
    { theme: 'alpine', name: 'Ridge Run', share: .25 },
    { theme: 'alpine', name: 'Timber Straight', share: .40 },
  ],
  scriptStart: 100,
  script: [
    ['straight', 420, { climb: -6, name: 'Lodge Straight' }],
    ['turn', 'R', 61.5, 80, { crest: 2, climb: -10, name: 'Pine Drop' }],
    ['turn', 'L', 75, 45, { climb: -12, name: 'Lakeside Plunge' }],
    ['straight', 134, { climb: -4, name: 'Lakeshore' }],
    ['turn', 'R', 32.5, 50, { climb: 2, name: 'Fir Esses 1' }],
    ['turn', 'L', 41.5, 55, { climb: 2, name: 'Fir Esses 2' }],
    ['straight', 153, { crest: 2.5, climb: 12, name: 'Ridge Run' }],
    ['turn', 'R', 24.5, 60, { climb: 6, name: 'Ridge Corner' }],
    ['straight', 318, { name: 'Beaver Run' }],
    ['turn', 'R', 170, 14, { climb: 2, name: 'Beaver Hairpin' }],
    ['straight', 1100, { climb: -6, name: 'Timber Straight' }],
    ['turn', 'R', 29.5, 60, { name: "Devil's Chicane 1" }],
    ['turn', 'L', 29.5, 60, { name: "Devil's Chicane 2" }],
    ['straight', 219, { climb: 8 }],
    ['turn', 'R', 133.5, 50, { climb: 6, name: 'Lodge Bend' }],
    ['straight', 75],
    ['turn', 'R', 54.5, 90, { name: 'Final Turn' }],
  ],
});
