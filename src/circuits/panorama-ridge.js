// Panorama Ridge (docs/CIRCUITS.md section 5.1): a circuit that climbs a
// mountain, crosses a narrow walled ridge and plunges back down to the longest
// straight in the game. Road layout only; art, light, landmarks and the full
// field belong to Codex's P4-PANORAMA card.
//
// The drafted script ended 275 m from where it began, so it was fitted with
// tools/track-script-fit.mjs (the smallest changes that close the loop). Changes
// from the drafted numbers (turn degrees, then straight metres):
//   Hell Gate 90 to 86, The Cutting 110 to 110.5, Summit Park 45 to 45.5,
//   Skyline 25 to 24.5, Esses 1 35 to 35.5, Esses 2 35 to 34.5, Esses 3 30 to
//   30.5, Forrest Elbow 100 to 105, Murray Corner 90 to 86.5;
//   Pit Straight 520 to 553, Mountain Straight 880 to 912, 140 to 142, 200 to
//   196, 220 to 218, Ridge Top 160 to 157, Dipper 150 to 147, Conrod 1150 to
//   1127, last straight 260 to 257.
// Climbs were also moved so no corner is steeper than about 25% (the draft's
// Skyline crest on a 12 m drop reached 41%): The Cutting +14 to +9, the straight
// after it +16 to +21, Skyline -12 to -5 and its crest 3 to 2.4, Esses -10, -10, -8 to -7, -7, -8,
// Conrod -55 to -68. The climbs still add up to zero.
// The numbers below then close with every straight within 1%.
import { defineScriptedCourse } from '../track-script.js';

export const PANORAMA_RIDGE = defineScriptedCourse({
  id: 'panorama-ridge', name: 'Panorama Ridge', flag: 'panorama-ridge',
  theme: 'alpine', stage: 16, kind: 'circuit', layoutVersion: 1,
  closed: true, laps: 3, hasRival: true, hasRadar: false, noTraffic: true, speedLimitMph: 100,
  airborne: true, terrainHalfWidth: 64, defaultMood: 'golden',
  sections: [
    { theme: 'alpine', name: 'Mountain Climb', share: .34 },
    { theme: 'alpine', name: 'The Ridge', share: .22 },
    { theme: 'alpine', name: 'Conrod Descent', share: .44 },
  ],
  scriptStart: 80,
  script: [
    ['straight', 553, { name: 'Pit Straight', width: 15 }],
    ['turn', 'L', 86, 28, { name: 'Hell Gate' }],
    ['straight', 912, { climb: 55, name: 'Mountain Straight', walls: 'both' }],
    ['turn', 'R', 40, 110, { climb: 6, name: 'Griffin Bend' }],
    ['straight', 142, { climb: 10 }],
    ['turn', 'L', 110.5, 20, { climb: 9, name: 'The Cutting', width: 11 }],
    ['straight', 196, { climb: 21 }],
    ['turn', 'R', 30, 150, { climb: 6, name: 'Reid Rise' }],
    ['straight', 218, { climb: 8 }],
    ['turn', 'L', 45.5, 160, { crest: 2.5, climb: 4, name: 'Summit Park' }],
    ['straight', 157, { name: 'Ridge Top' }],
    ['turn', 'R', 24.5, 90, { crest: 2.4, climb: -5, name: 'Skyline' }],
    ['turn', 'L', 35.5, 60, { climb: -7, name: 'The Esses 1' }],
    ['turn', 'R', 34.5, 60, { climb: -7, name: 'The Esses 2' }],
    ['turn', 'L', 30.5, 70, { climb: -8, name: 'The Esses 3' }],
    ['straight', 147, { climb: -20, name: 'The Dipper' }],
    ['turn', 'L', 105, 22, { climb: -4, name: 'Forrest Elbow' }],
    ['straight', 1127, { climb: -68, name: 'Conrod Straight', width: 16, walls: 'none' }],
    ['turn', 'R', 25, 200, { name: 'The Chase' }],
    ['straight', 60],
    ['turn', 'L', 15, 220, { name: 'Chase Exit', width: 15 }],
    ['straight', 257, { name: 'Murray Straight' }],
    ['turn', 'L', 86.5, 25, { name: 'Murray Corner' }],
  ],
});
