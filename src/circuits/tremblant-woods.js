// Tremblant Woods (docs/CIRCUITS.md section 5.3): a rolling forest circuit with
// a plunge to a lake, crests, a hairpin at the end of a short spur and the long
// Timber Straight back. Road layout only; autumn light, the lodge, lake,
// chairlift and the full field belong to Codex's P4-TREMBLANT card.
//
// Redrawn by Claude, 10 October 2026: a clockwise loop. The top edge runs east
// from the lodge down to the lake and through the Fir Esses; Ridge Corner turns
// south; the road kinks east onto a short spur, turns back through Beaver
// Hairpin and runs the length of Timber Straight west; Devil's Chicane, then
// Lodge Bend and the climb north to the Final Turn. Closest separate stretches
// of road: 66 m centre to centre, at the hairpin spur (wall between).
import { defineScriptedCourse } from '../track-script.js';

export const TREMBLANT_WOODS = defineScriptedCourse({
  id: 'tremblant-woods', name: 'Tremblant Woods', flag: 'tremblant-woods',
  theme: 'alpine', stage: 18, kind: 'circuit', layoutVersion: 1,
  closed: true, laps: 3, hasRival: true, hasRadar: false, noTraffic: true, speedLimitMph: 100,
  airborne: true, terrainHalfWidth: 64, defaultMood: 'golden',
  sections: [
    { theme: 'alpine', name: 'Lodge and Lake', share: .35 },
    { theme: 'alpine', name: 'Ridge Run', share: .25 },
    { theme: 'alpine', name: 'Timber Straight', share: .40 },
  ],
  scriptStart: 100,
  script: [
    ['straight', 414, { climb: -6, name: 'Lodge Straight' }],
    ['turn', 'R', 60, 90, { crest: 2, climb: -10, name: 'Pine Drop' }],
    ['turn', 'L', 70, 50, { climb: -12, name: 'Lakeside Plunge' }],
    ['straight', 258, { climb: -4, name: 'Lakeshore' }],
    ['turn', 'R', 40, 55, { climb: 2, name: 'Fir Esses 1' }],
    ['turn', 'L', 35, 60, { climb: 2, name: 'Fir Esses 2' }],
    ['straight', 326, { crest: 2.5, climb: 12, name: 'Ridge Run' }],
    ['turn', 'R', 90.5, 45, { climb: 4, name: 'Ridge Corner' }],
    ['straight', 323, { climb: 6, name: 'Beaver Run' }],
    ['turn', 'L', 80, 40, { name: 'Beaver Kink' }],
    ['straight', 80, { name: 'The Spur' }],
    ['turn', 'R', 170.5, 22, { climb: 2, name: 'Beaver Hairpin' }],
    ['straight', 1302, { climb: -8, name: 'Timber Straight' }],
    ['turn', 'R', 30, 60, { name: "Devil's Chicane 1" }],
    ['turn', 'L', 30, 60, { name: "Devil's Chicane 2" }],
    ['straight', 283, { climb: 4 }],
    ['turn', 'R', 114, 50, { climb: 6, name: 'Lodge Bend' }],
    ['straight', 500, { climb: 2, name: 'Lodge Climb' }],
    ['turn', 'R', 70, 70, { name: 'Final Turn' }],
  ],
});
