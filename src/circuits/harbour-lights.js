// Harbour Lights (docs/CIRCUITS.md section 5.2): a night street race between
// walls with a crawling hairpin. Road layout only; art, neon, harbour,
// Lantern Tower, escape roads and the full field belong to Codex's P4-HARBOUR
// card.
//
// The drafted script ended 1,885 m from where it began (its first leg runs
// 1,050 m one way and nothing runs back), and three Old Town turns were too
// short to hold a 25 m eased join. It was fitted with tools/track-script-fit.mjs
// keeping the Seafront Straight and the Lantern Hairpin. Changes from the draft:
//   turn degrees: Lantern Kink 20 to 14, Casino Corner 95 to 152, Temple Hill 40
//     to 28.5, Bell Tower Bend 60 to 59.5, Esses 1 45 to 50 (radius 30 to 32),
//     Esses 2 50 to 48, Esses 3 40 to 48.5 (radius 35 to 36), Esses 4 35 (radius
//     40 to 41), Precinct Bend 70 to 57.5, Hairpin 175 to 173.5, Fishmarket Bend
//     60 to 96, Reservoir Sweep 80 to 71.5;
//   straights: Seafront 600 to 599, Casino Approach 450 to 60 (the overtaking run
//     into Casino Corner is now the Seafront plus the kink, about 660 m), 120 to
//     200, 90 to 66, 140 to 294, Hillside 160 to 320, Hairpin Approach 120 to 254,
//     220 to 60, 300 to 375, last 200 to 60.
// Claude's finishing pass should redraw this layout; the numbers here make the
// loop close and keep the named corners in the drafted order.
// Redrawn by Claude, 10 October 2026: Seafront Straight, Lantern Kink and the
// Casino Approach give about 900 m into Casino Corner (the overtaking zone); the
// old town climbs away from the start; Precinct Bend turns further away and the
// Lantern Hairpin turns the road for home; the Reservoir Run and Harbour Road
// bring it back. Closest separate stretches: the hairpin approach and exit.
import { defineScriptedCourse } from '../track-script.js';

export const HARBOUR_LIGHTS = defineScriptedCourse({
  id: 'harbour-lights', name: 'Harbour Lights', flag: 'harbour-lights',
  theme: 'city', timeOfDay: 'night', stage: 17, kind: 'circuit', layoutVersion: 1,
  closed: true, laps: 4, hasRival: true, hasRadar: false, noTraffic: true, speedLimitMph: 100,
  airborne: true, terrainHalfWidth: 64, scenery: { trees: 100, rocks: 40, mountains: false },
  sections: [
    { theme: 'city', name: 'Seafront', share: .30 },
    { theme: 'city', name: 'Old Town', share: .45 },
    { theme: 'city', name: 'Reservoir', share: .25 },
  ],
  scriptStart: 100,
  scriptDefaults: { walls: 'both' },
  script: [
    ['straight', 500, { name: 'Seafront Straight', width: 14 }],
    ['turn', 'L', 20, 300, { name: 'Lantern Kink' }],
    ['straight', 294, { name: 'Casino Approach' }],
    ['turn', 'R', 104, 22, { name: 'Casino Corner' }],
    ['straight', 150, { climb: 6 }],
    ['turn', 'L', 40, 60, { climb: 6, name: 'Temple Hill' }],
    ['straight', 78, { climb: 6 }],
    ['turn', 'R', 60, 35, { climb: 5, name: 'Bell Tower Bend' }],
    ['straight', 192, { climb: 4, width: 10 }],
    ['turn', 'L', 46.5, 32, { climb: 3, name: 'Old Town Esses 1' }],
    ['turn', 'R', 51.5, 30, { name: 'Old Town Esses 2' }],
    ['turn', 'L', 43, 36, { name: 'Old Town Esses 3' }],
    ['turn', 'R', 40, 41, { name: 'Old Town Esses 4' }],
    ['straight', 103, { name: 'Hillside' }],
    ['turn', 'L', 29.5, 60, { climb: -6, name: 'Precinct Bend' }],
    ['straight', 220, { climb: -6, name: 'Hairpin Approach', width: 12 }],
    ['turn', 'R', 175, 9, { climb: -2, name: 'Lantern Hairpin' }],
    ['straight', 99, { climb: -8 }],
    ['turn', 'L', 60, 45, { climb: -4, name: 'Fishmarket Bend', width: 14 }],
    ['straight', 827, { climb: -4, name: 'Reservoir Run' }],
    ['turn', 'R', 59, 120, { name: 'Reservoir Sweep' }],
    ['straight', 500, { name: 'Harbour Road' }],
    ['turn', 'R', 109, 60, { name: 'Harbour Turn' }],
    ['straight', 61, { name: 'Harbour Return' }],
  ],
});
