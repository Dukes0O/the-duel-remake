// Ardennes Forest (docs/CIRCUITS.md section 5.5): a fast, flowing forest circuit
// with big height changes, the longest lap in the game. Road layout only; art,
// light, landmarks, the safety kit and the full field belong to later cards.
//
// The script below is Claude's fitted layout (13 October 2026), copied exactly
// from CIRCUITS.md 5.5. A width stays in force until a piece sets another, so
// three width options are added that the table's notes call for and that do not
// move the centreline: Les Combes goes back to 15 m after Kestrel Straight's 16 m,
// Bus Stop narrows to 13 m (through Bus Stop Exit), and the last straight is 15 m. It runs clockwise, closes with a 0.7 m gap before the
// builder stretches the straights, and is 6.68 km. The steepest grade is 23.2% on
// The Wall and the tightest radius is 16 m (La Fontaine). The closest separate
// stretches of road are 103 m apart, centre to centre (Malmedy and the run back
// from Riverside).
//
// No full-length walls: the road keeps the default 12 m of run-off on both sides
// (the same open edge Tremblant Woods uses). Barriers are the safety-kit card's job.
import {defineScriptedCourse} from '../track-script.js';

export const ARDENNES_FOREST = defineScriptedCourse({
  id: 'ardennes-forest', name: 'Ardennes Forest', flag: 'ardennes-forest',
  theme: 'alpine', stage: 21, kind: 'circuit', layoutVersion: 1,
  closed: true, laps: 2, hasRival: true, hasRadar: false, noTraffic: true, noCombat: true, speedLimitMph: 100,
  airborne: true, terrainHalfWidth: 64, markings: 'circuit',
  sections: [
    { theme: 'alpine', name: 'Pit and Plunge', share: .154 },
    { theme: 'alpine', name: 'Kestrel and Combes', share: .18 },
    { theme: 'alpine', name: 'Forest Descent', share: .37 },
    { theme: 'alpine', name: 'Forest Run', share: .296 },
  ],
  scriptStart: 60,
  script: [
    ['straight', 417, { climb: -6, name: 'Pit Straight', width: 15 }],
    ['turn', 'R', 132, 16, { climb: -2, name: 'La Fontaine' }],
    ['straight', 331, { climb: -26, name: 'The Plunge' }],
    ['turn', 'L', 30.5, 80, { climb: -4, name: 'Red Water' }],
    ['turn', 'R', 39, 90, { climb: 11, name: 'The Wall' }],
    ['turn', 'L', 20.5, 120, { climb: 6, crest: 2.5, name: 'Wall Crest' }],
    ['straight', 1010, { climb: 34, name: 'Kestrel Straight', width: 16 }],
    ['turn', 'R', 69.5, 40, { climb: 1, name: 'Les Combes', width: 15 }],
    ['straight', 50],
    ['turn', 'L', 60, 40, { climb: -1, name: 'Combes Exit' }],
    ['straight', 204, { climb: -10 }],
    ['turn', 'R', 66, 50, { climb: -4, name: 'Malmedy' }],
    ['straight', 254, { climb: -16 }],
    ['turn', 'R', 159.5, 20, { climb: -4, name: 'Riverside' }],
    ['straight', 180, { climb: -10 }],
    ['turn', 'L', 78.5, 60, { climb: -6, name: 'Woodland Left' }],
    ['straight', 282, { climb: -18 }],
    ['turn', 'L', 121.5, 120, { climb: -6, name: 'Long Left' }],
    ['straight', 286, { climb: -6 }],
    ['turn', 'R', 62, 60, { climb: -2, name: 'Fagnes' }],
    ['turn', 'L', 48.5, 60, { climb: -2, name: 'Fagnes Exit' }],
    ['straight', 181, { climb: -4 }],
    ['turn', 'R', 63, 50, { climb: -2, name: 'Campus' }],
    ['straight', 146, { climb: -2 }],
    ['turn', 'R', 80, 60, { name: 'Stavelot' }],
    ['straight', 330, { climb: 20, name: 'Forest Run' }],
    ['turn', 'R', 35.5, 300, { climb: 8, name: 'Woodcutter' }],
    ['straight', 390, { climb: 14 }],
    ['turn', 'L', 29.5, 400, { climb: 10, name: 'Whitewood' }],
    ['straight', 358, { climb: 22 }],
    ['turn', 'R', 83.5, 25, { climb: 1, name: 'Bus Stop', width: 13 }],
    ['turn', 'L', 71.5, 25, { name: 'Bus Stop 2' }],
    ['straight', 40],
    ['turn', 'R', 29.5, 60, { name: 'Bus Stop Exit' }],
    ['straight', 180, { climb: 4, width: 15 }],
  ],
  // The pit lane runs along the right of Pit Straight, as at Panorama Ridge.
  pitLane: Object.freeze({straight: 'Pit Straight', side: 'right'}),
});

// Registration belongs to this course; generation and geometry stay unchanged.
// A dev circuit: it is on COURSE only while its switch is requested for QA.
export const manifest = Object.freeze({
  id: 'ardennes-forest', flag: 'ardennes-forest', state: 'dev', price: 2000,
  grandPrix: true, releaseOrder: 5,
  driver: Object.freeze({car: 'stuttgart_959s', driverId: 'club', controller: 'racing-line', skill: .95}),
});
