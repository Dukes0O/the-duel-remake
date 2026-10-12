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
import { defineScriptedCourse, buildTrackScript } from '../track-script.js';

const PANORAMA_ROAD = defineScriptedCourse({
  id: 'panorama-ridge', name: 'Panorama Ridge', flag: 'panorama-ridge',
  theme: 'alpine', stage: 16, kind: 'circuit', layoutVersion: 1,
  closed: true, laps: 3, hasRival: true, hasRadar: false, noTraffic: true, noCombat: true, speedLimitMph: 100,
  airborne: true, terrainHalfWidth: 64, defaultMood: 'golden', markings: 'circuit',
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
    ['turn', 'L', 110.5, 20, { climb: 9, name: 'The Cutting', width: 13 }],
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
  // Team Room intel (docs/CIRCUITS.md section 7b.1), written by Claude. Target
  // speeds and gears come from the reference lap; these notes give the line.
  intel: {
    sectors: [1760, 3060],
    flags: [
      { id: 'skyline', kind: 'signature', s: 2560, title: 'Skyline', camera: { back: 30, up: 1.2, ahead: 70 } },
      { id: 'conrod', kind: 'overtaking', s: 4120, title: 'Conrod into The Chase' },
      { id: 'murray', kind: 'overtaking', s: 4640, title: 'Murray Corner' },
      { id: 'hell-gate', kind: 'corner', s: 420, title: 'Hell Gate' },
      { id: 'the-cutting', kind: 'corner', s: 1640, title: 'The Cutting' },
      { id: 'summit-park', kind: 'crest', s: 2330, title: 'Summit Park' },
      { id: 'forrest-elbow', kind: 'corner', s: 2940, title: 'Forrest Elbow' },
    ],
    notes: {
      'hell-gate': { brakeBoard: 100, line: 'Stay right on the way in, clip the inside kerb, let it run out to the left.', note: 'Lap one is a scramble: brake early and stay out of trouble. After that, brake at the 100 board.' },
      'griffin-bend': { line: 'Hold the inside and keep your foot in.', note: 'Fast and uphill. A lift is all it needs.' },
      'the-cutting': { brakeBoard: 100, line: 'Wide on entry, late apex, straight up the hill.', note: 'The slowest corner on the climb. Get the exit right: the next 200 m are steep.' },
      'reid-rise': { line: 'Use the walls as your guide, middle of the road.', note: 'Narrow now. No room for a mistake until Forrest Elbow.' },
      'summit-park': { line: 'Straight line over the crest, then turn.', note: 'The car goes light over the top. Never steer while it is in the air.' },
      'skyline': { line: 'Aim at the radio mast, turn as the road appears.', note: 'Blind. You see sky, then the Esses drop away beneath you. Commit, but brake before the crest, not on it.' },
      'the-esses-1': { line: 'Left, right, left: straight-line it, kerb to kerb.', note: 'Downhill and narrow. Smooth is fast here; a wide car sliding is slow.' },
      'the-esses-2': { line: 'Kerb to kerb.', note: 'Keep the rhythm.' },
      'the-esses-3': { line: 'Set up wide right for the Dipper.', note: 'The road falls away into the Dipper. Be straight before it.' },
      'forrest-elbow': { brakeBoard: 100, line: 'Wide, late apex, everything on the exit.', note: 'The most important corner on the lap. Every km/h you carry out of here lasts all the way down Conrod.' },
      'the-chase': { line: 'Flat out, a touch of steering, stay off the kerbs.', note: 'Frightening at the end of Conrod, but it is flat. Lift only if a car is alongside.' },
      'chase-exit': { line: 'Stay left for Murray.', note: 'Line up for the braking zone.' },
      'murray-corner': { brakeBoard: 100, line: 'Brake in a straight line, turn late, inside kerb.', note: 'Last chance to pass. Out-brake them here, and defend the inside if you are ahead.' },
    },
  },
});


// Static authored scenery is independent of route RNG and race state. Kit
// dimensions are metres, Y-up; heading is an offset from the sampled road.
function panoramaPlacements(road) {
  const placements = [{id: 'start-gantry', s: 0, lateral: 0, scale: [1.06, 1, 1]}];
  for (let s = 120; s <= 400; s += 35) {
    placements.push({id: 'pit-garage', s, lateral: -27, heading: Math.PI / 2});
  }
  for (let s = 70; s <= 420; s += 55) {
    placements.push({id: 'grandstand', s, lateral: 25, heading: -Math.PI / 2});
  }
  for (let s = 100; s <= 380; s += 4) {
    placements.push({id: 'pit-wall', s, lateral: -8.4, heading: Math.PI / 2});
  }
  for (const name of ['Hell Gate', 'The Cutting', 'Forrest Elbow', 'Murray Corner']) {
    const corner = road.pieces.find(piece => piece.name === name);
    const s = Math.max(0, corner.s0 - 30);
    placements.push({id: 'marshal-post', s, lateral: road.halfWidthAt(s) + 6, heading: Math.PI});
  }
  // The approved fence sits behind the unchanged physical ridge walls.
  for (let s = road.pieces.find(p => p.name === 'The Cutting').s0; s < road.pieces.find(p => p.name === 'Forrest Elbow').s1; s += 8) {
    for (const side of [-1, 1]) placements.push({id: 'catch-fence', s,
      lateral: side * (road.halfWidthAt(s) + 1.8), heading: Math.PI / 2, scale: [2, 1, 1], lift: 1.05});
  }
  // A real lower town on the descent: two staggered streets, with an open
  // foreground below Skyline rather than houses on its crest or racing line.
  const conrod = road.pieces.find(piece => piece.name === 'Conrod Straight');
  for (let i = 0; i < 16; i++) for (const row of [0, 1]) {
    placements.push({id: (i + row) % 2 ? 'shopfront-a' : 'shopfront-b',
      s: conrod.s0 + 180 + i * 12, lateral: 100 + row * 24,
      heading: row ? Math.PI : 0, scale: .9 + (i % 3) * .05});
  }
  return Object.freeze(placements.map(Object.freeze));
}
const road = buildTrackScript(PANORAMA_ROAD);
const ridge = road.pieces.find(piece => piece.name === 'Ridge Top');
const named = name => road.pieces.find(piece => piece.name === name);
const ridgeLandform = Object.freeze({
  hillside: Object.freeze([named('Mountain Straight').s0, named('The Cutting').s0 + 80]),
  ridge: Object.freeze([named('The Cutting').s0 - 80, named('Forrest Elbow').s1 + 80]),
  valleyFloor: 0, hillsideGrade: .8, ridgeGrade: 1.25,
});
export const PANORAMA_RIDGE = Object.freeze({...PANORAMA_ROAD,
  name: 'Panorama Ridge Sunset',
  ridgeLandform,
  scenery: Object.freeze({trees: 1600, rocks: 280, clusteredTrees: true}),
  plainSafetyWalls: true,
  // Existing circuit safety controls; difficulty pace and variation stay at defaults.
  racingLine: Object.freeze({lineMargin: 2.6, lineSwing: .6, holdRacers: true}),
  fieldFollow: Object.freeze({leadBraking: 1.6, wallRoom: 1,
    firstLap: Object.freeze({margin: 5, reaction: .5, closeIn: .8, wallRoom: 1.4})}),
  pitLane: Object.freeze({straight: 'Pit Straight', side: 'right'}),
  lightPath: Object.freeze({axis: 'race-progress', palette: 'mountain-sunset', keyframes: Object.freeze([
    Object.freeze({at: 0, look: 'golden'}),
    Object.freeze({at: 1 / 3, look: 'golden'}),
    Object.freeze({at: 2 / 3, look: 'dusk'}),
    Object.freeze({at: 1, look: 'dusk'}),
  ])}),
  kitPlacements: panoramaPlacements(road),
  circuitLandmarks: Object.freeze([
    Object.freeze({id: 'ridge-radio', type: 'radio-mast', s: ridge.s1 - 24,
      lateral: -24, height: 28}),
    Object.freeze({id: 'pit-timing', type: 'scoreboard', s: 45,
      lateral: 21, height: 16, title: 'PANORAMA'}),
  ]),
});
