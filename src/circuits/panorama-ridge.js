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
import { defineScriptedCourse, buildTrackScript, TRACK_SCRIPT } from '../track-script.js';

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
      { id: 'skyline', kind: 'signature', s: 2560, title: 'Skyline', camera: { back: 30, ahead: 70 } },
      { id: 'conrod', kind: 'overtaking', s: 4120, title: 'Conrod into The Chase' },
      { id: 'murray', kind: 'overtaking', s: 4640, title: 'Murray Corner' },
      { id: 'hell-gate', kind: 'corner', s: 420, title: 'Hell Gate' },
      { id: 'the-cutting', kind: 'corner', s: 1640, title: 'The Cutting' },
      { id: 'summit-park', kind: 'crest', s: 2330, title: 'Summit Park' },
      { id: 'forrest-elbow', kind: 'corner', s: 2940, title: 'Forrest Elbow' },
    ],
    notes: {
      'conrod': { line: 'Stay in the slipstream down Conrod and pull out as The Chase comes into view.', note: 'The longest run on the lap. Get alongside here, then finish the move into Murray.' },
      'murray': { line: 'Take the inside on the way in and out-brake them at the 100 board.', note: 'Last chance to pass. If you are ahead, hold the inside.' },
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
// The valley town's streets, metres along Conrod Straight from its start and beside the road.
const TOWN_STREETS = Object.freeze([
  Object.freeze({from: 170, to: 470, lateral: 80, bend: 6, wave: 95, phase: 0}),
  Object.freeze({from: 215, to: 505, lateral: 118, bend: 5, wave: 120, phase: 1.4, square: 330}),
]);
export function panoramaPlacements(road, pitSide = -1) {
  const placements = [{id: 'start-gantry', s: 0, lateral: 0, scale: [1.06, 1, 1]}];
  for (let s = 120; s <= 400; s += 35) {
    placements.push({id: 'pit-garage', s, lateral: pitSide * 27, heading: -pitSide * Math.PI / 2});
  }
  for (let s = 70; s <= 420; s += 55) {
    placements.push({id: 'grandstand', s, lateral: -pitSide * 25, heading: pitSide * Math.PI / 2});
  }
  const pitStraight = road.pieces.find(piece => piece.name === 'Pit Straight');
  // Match the existing 65 m entry/exit openings of the actual pit divider.
  for (let s = Math.max(0, pitStraight.s0) + 75; s < pitStraight.s1 - 75; s += 4) {
    placements.push({id: 'pit-wall', s, lateral: pitSide * 8.4, heading: -pitSide * Math.PI / 2, solid: true});
  }
  // Hell Gate has no script wall, and both Mountain Straight walls begin where it
  // ends. A plain concrete wall on its outside closes the run-off, so a car that
  // slides wide stops against it instead of rejoining behind the right wall.
  // Its face lines up with that wall; the step keeps the outer arc closed.
  const hellGate = road.pieces.find(piece => piece.name === 'Hell Gate');
  const outer = -hellGate.dir, face = TRACK_SCRIPT.wallSetback, depth = .72;
  for (let s = hellGate.s0 - 6; s < hellGate.s1; s += 2.8) {
    placements.push({id: 'concrete-wall', s, lateral: outer * (road.halfWidthAt(s) + face + depth / 2),
      heading: outer < 0 ? Math.PI / 2 : -Math.PI / 2, solid: true});
  }
  for (const name of ['Hell Gate', 'The Cutting', 'Forrest Elbow', 'Murray Corner']) {
    const corner = road.pieces.find(piece => piece.name === name);
    // On the walled ridge the slope outside the fence is too steep for a post's feet (they floated 1.4 to
    // 1.6 m). The Cutting's post stands on the hill side behind the fence; Forrest Elbow's stands on the
    // outside of the exit, past the walls, where the ground is gentle. Both clear the 0.3 m float check.
    if (name === 'The Cutting') {
      const s = corner.s0 - 40;
      placements.push({id: 'marshal-post', s, lateral: -(road.halfWidthAt(s) + 4.5), heading: Math.PI});
    } else if (name === 'Forrest Elbow') {
      const s = corner.s1 + 38;
      placements.push({id: 'marshal-post', s, lateral: -(road.halfWidthAt(s) + 6), heading: Math.PI});
    } else {
      const s = Math.max(0, corner.s0 - 30);
      placements.push({id: 'marshal-post', s, lateral: road.halfWidthAt(s) + 6, heading: Math.PI});
    }
  }
  // The approved fence sits behind the unchanged physical ridge walls.
  for (let s = road.pieces.find(p => p.name === 'The Cutting').s0; s < road.pieces.find(p => p.name === 'Forrest Elbow').s1; s += 8) {
    for (const side of [-1, 1]) placements.push({id: 'catch-fence', s,
      lateral: side * (road.halfWidthAt(s) + 1.8), heading: Math.PI / 2, scale: [2, 1, 1], lift: 1.05});
  }
  return Object.freeze(placements.map(Object.freeze));
}
// The town below Conrod Straight (PANORAMA-TOWN, Claude, 14 October 2026), drawn by circuitLandmarks 'town'
// (src/circuit-landmarks.js): two streets that bend with the slope instead of a grid, weatherboard houses of
// one or two storeys and mixed widths facing their street, gaps for yards and lanes, street lamps, and an open
// square on the upper street where the church stands. The open foreground below Skyline stays clear. A fixed
// hash keeps the layout the same every load; nothing here touches the road, the field or a race.
function valleyTown(road) {
  const conrod = road.pieces.find(piece => piece.name === 'Conrod Straight');
  const hash = n => {const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x);};
  const houses = [], lamps = [], taken = [];
  // Nothing stands on another thing: houses, lamps and the church each keep their own ground.
  // Footprints are rectangles along the road (houses face across it): half length along, half depth across.
  const free = (s, lateral, along, across) => taken.every(t =>
    Math.abs(t.s - s) >= t.along + along || Math.abs(t.lateral - lateral) >= t.across + across);
  taken.push({s: conrod.s0 + TOWN_STREETS[1].square, lateral: TOWN_STREETS[1].lateral, along: 11, across: 6});
  let n = 0;
  for (const street of TOWN_STREETS) {
    const lateralAt = along => street.lateral + street.bend * Math.sin(along / street.wave + street.phase);
    for (let along = street.from; along < street.to; along += 12 + 6 * hash(n++)) {
      const centre = lateralAt(along), turn = Math.atan2(lateralAt(along + 1) - lateralAt(along - 1), 2);
      for (const side of [-1, 1]) {
        const k = n++;
        // The square: the upper street's houses and the lower street's upper row step back from the church.
        if (Math.abs(along - TOWN_STREETS[1].square) < 22 && (street.square || side > 0)) continue;
        if (hash(k + 900) < .15) continue;                        // a yard or a lane between houses
        const width = 6 + 3 * hash(k + 1300), depth = 7 + 3 * hash(k + 1700);
        const s = conrod.s0 + along + (hash(k + 2500) - .5) * 3, lateral = centre + side * (6.5 + depth / 2 + hash(k + 2900));
        // The footprint includes the veranda on the street side and half a metre of eaves all round.
        // The veranda reaches 2.3 m toward the street, so the rectangle sits 1.15 m off the house centre.
        const halfAlong = width / 2 + .6, halfAcross = (depth + 2.3) / 2 + .5, middle = lateral - side * 1.15;
        if (!free(s, middle, halfAlong, halfAcross)) continue;
        taken.push({s, lateral: middle, along: halfAlong, across: halfAcross});
        houses.push(Object.freeze({s, lateral,
          heading: side * -Math.PI / 2 + turn + (hash(k + 3300) - .5) * .14,  // front door to the street
          width, depth, storeys: hash(k + 2100) < .3 ? 2 : 1}));
      }
    }
    for (let along = street.from + 20; along < street.to; along += 44) {
      // Just inside the upper edge of the street, a metre clear of the verandas (which stop 4.2 m out).
      const s = conrod.s0 + along, lateral = lateralAt(along) + 3;
      if (!free(s, lateral, .5, .5)) continue;
      taken.push({s, lateral, along: .5, across: .5});
      lamps.push(Object.freeze({s, lateral}));
    }
  }
  return {houses: Object.freeze(houses), lamps: Object.freeze(lamps)};
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
  // Existing circuit safety controls; only difficulty pace is tuned.
  racingLine: Object.freeze({lineMargin: 2.6, lineSwing: .6, holdRacers: true}),
  fieldPace: Object.freeze({easy: .75, medium: .725, hard: .716}),
  fieldFollow: Object.freeze({leadBraking: 1.6, wallRoom: 1,
    firstLap: Object.freeze({margin: 5, reaction: .5, closeIn: .8, wallRoom: 1.4})}),
  pitLane: Object.freeze({straight: 'Pit Straight', side: 'right', kitDivider: true}),
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
    // The valley town under Conrod Straight, and its anchor: a weatherboard church on the upper street's square.
    Object.freeze({id: 'valley-town', type: 'town', s: named('Conrod Straight').s0 + 330,
      lateral: TOWN_STREETS[0].lateral, height: 12, ...valleyTown(road)}),
    Object.freeze({id: 'town-church', type: 'church', s: named('Conrod Straight').s0 + TOWN_STREETS[1].square,
      lateral: TOWN_STREETS[1].lateral, height: 22}),
  ]),
});

// Registration belongs to this course; generation and geometry stay unchanged.
export const manifest = Object.freeze({
  id: 'panorama-ridge', flag: 'panorama-ridge', state: 'on', price: 1600,
  grandPrix: true, releaseOrder: 3,
  driver: Object.freeze({car: 'stuttgart_959s', driverId: 'club', controller: 'racing-line', skill: .95}),

});
