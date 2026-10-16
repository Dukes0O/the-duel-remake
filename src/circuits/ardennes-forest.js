// Ardennes Forest (docs/CIRCUITS.md section 5.5): a fast, flowing forest circuit
// with big height changes, the longest lap in the game. The approved road stays
// unchanged while this card adds its course-owned forest and circuit dressing.
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
import {defineScriptedCourse, buildTrackScript} from '../track-script.js';

const ARDENNES_ROAD = defineScriptedCourse({
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


const LONG_LEFT_RUNOFF = Object.freeze([Object.freeze({s0: 3330, s1: 3730, side: -1, width: 20, taper: 40})]);
const road = buildTrackScript({...ARDENNES_ROAD, runoffBands: LONG_LEFT_RUNOFF});
const named = name => road.pieces.find(piece => piece.name === name);
const wrap = s => ((s % road.length) + road.length) % road.length;
const row = (id, s, lateral, extra = {}) => Object.freeze({id, s: wrap(s), lateral, ...extra});
const PIT_END = named('Pit Straight').s1;
// The stream crosses Red Water on a line midway between two of the near ground's 4 m rows (it is drawn in rows
// at every 4 m of road), so the channel has two rows of bed and a bank row on each side.
const RED_WATER_S = Math.floor((named('Red Water').s0 + named('Red Water').s1) / 8) * 4 + 2;

// Finishing pass (Claude, 15 October): the garages and the main grandstand now run back past the grid
// from s -72.5, so the first view from the grid has the paddock beside it. The native pit lane starts at
// s 10 and stays inside 18 m of the road centre, well short of the garages at 31 m. s -72.5 stays 7.5 m
// inside the paddock's tree-free stretch, so no planted tree moves, and the 7.5 m garage spacing steps
// over the 4 m closing seam just before the line (s -3.9 to 0), where no ground is drawn under an anchor.
const PADDOCK_START = -72.5;
function paddock() {
  const out = [row('start-gantry', 0, 0, {heading: Math.PI})];
  for (let s = PADDOCK_START; s < PIT_END - 65; s += 7.5)
    out.push(row('pit-garage', s, -31, {heading: Math.PI / 2, solid: true}));
  for (let s = PADDOCK_START; s < PIT_END - 30; s += 15)
    out.push(row('grandstand', s, 31, {heading: -Math.PI / 2, solid: true, crowd: true}));
  // The existing native pit divider owns both drawing and collision.
  // Do not duplicate its wall with a second kit face.
  return out;
}

function safety() {
  const out = [];
  // Standard run-off stays at 12 m; the answered Long Left outside band
  // widens to 20 m. The right-hand paddock and native pit openings stay clear.
  for (let s = 4; s < road.length - 4; s += 8) for (const side of [-1, 1]) {
    if (side < 0 && (s <= PIT_END + 15 || s >= road.length - 75)) continue;
    const band = LONG_LEFT_RUNOFF[0];
    const lateral = side === band.side && s >= band.s0 && s <= band.s1
      ? side * (road.halfWidthAt(s) + road.runoffWidthAt(s, side, 12) + 2.3)
      : side * (road.halfWidthAt(s) + 14.3);
    out.push(row('catch-fence', s, lateral,
      {heading: Math.PI / 2, scale: Object.freeze([2, 1, 1]), solid: true}));
  }
  for (const name of ['La Fontaine', 'Red Water', 'The Wall', 'Les Combes', 'Malmedy',
    'Riverside', 'Woodland Left', 'Long Left', 'Fagnes', 'Campus', 'Stavelot',
    'Woodcutter', 'Whitewood', 'Bus Stop', 'Bus Stop 2']) {
    const piece = named(name), side = -piece.dir;
    for (let s = piece.s0 - 8; s < piece.s1 + 8; s += 4) {
      if (side < 0 && wrap(s) <= PIT_END + 15) continue;
      const lateral = name === 'Long Left' && side === -1
        ? side * (road.halfWidthAt(s) + road.runoffWidthAt(s, side, 12) + .8)
        : side * (road.halfWidthAt(s) + 12.8);
      out.push(row('armco', s, lateral,
        {heading: Math.PI / 2, solid: true}));
    }
  }
  return out;
}

// Braking boards (150, 100, 50 m) before the slow corners the track script leaves without them (its own
// boards stand only before turns tighter than 40 m). Finishing pass, Claude, 15 October. Like the script's
// own boards and Tremblant's, they stand on the outside on straight road, 2.4 m from the road edge, and face
// the oncoming cars. They are not solid. (Round 2 stood them 13 m out, beyond the run-off: too small to read.)
const BOARD_CORNERS = Object.freeze(['Les Combes', 'Malmedy', 'Woodland Left', 'Fagnes', 'Campus', 'Stavelot']);
function brakingBoards() {
  const out = [];
  for (const name of BOARD_CORNERS) {
    const corner = named(name), side = -corner.dir;
    for (const distance of [150, 100, 50]) {
      const s = corner.s0 - distance;
      if (road.pieceAt(wrap(s)).kind !== 'straight') continue;
      out.push(row(`braking-board-${distance}`, s, side * (road.halfWidthAt(s) + 2.4), {heading: Math.PI}));
    }
  }
  return out;
}

function landmarks() {
  const out = [];
  const fontaine = named('La Fontaine'), wall = named('The Wall'), red = named('Red Water');
  // The outside terrace uses the accepted lodge and shopfront kits.
  out.push(row('ski-lodge', fontaine.s0 + 20, 44, {heading: -Math.PI / 2, scale: .7, clear: 12}));
  out.push(row('wooden-dock', fontaine.s0 + 20, 35, {heading: -Math.PI / 2, scale: .75, clear: 10}));
  out.push(row('stone-stream-bridge', RED_WATER_S, 36, {heading: Math.PI / 2, clear: 12}));
  for (let i = 0; i < 6; i++) out.push(row('grandstand', wall.s0 - 15 + i * 15, -34,
    {heading: Math.PI / 2, crowd: true, solid: true, clear: 11}));
  const kestrel = named('Kestrel Straight');
  out.push(row('forest-footbridge', kestrel.s0 + (kestrel.s1 - kestrel.s0) * .58, 0, {clear: 38}));
  out.push(row('forest-timing-tower', named('Bus Stop Exit').s0, -42, {heading: Math.PI, clear: 12}));
  return out;
}

// Two compact streets on the low ribbon beside Stavelot, not the old far hillside.
// The shared helper seats each footing; whole church support still needs review.
const VILLAGE = Object.freeze({s: named('Stavelot').s0 + 30, lateral: 38});
function valleyTown() {
  const houses = [], lamps = [], taken = [{s: VILLAGE.s, lateral: VILLAGE.lateral, along: 12, across: 11}];
  const free = (s, lateral, along, across) => taken.every(other =>
    Math.abs(other.s - s) >= other.along + along || Math.abs(other.lateral - lateral) >= other.across + across);
  for (const street of [28, 48]) for (let along = -65, i = 0; along < 135; along += 13, i++) {
    const s = named('Stavelot').s0 + along, centre = street + 1.2 * Math.sin(along / 70);
    for (const side of [-1, 1]) {
      const width = 6.2 + i % 3 * .5, depth = 6.4 + i % 2 * .6;
      const lateral = centre + side * 8.5, middle = lateral - side * 1.15;
      const halfAlong = width / 2 + .6, halfAcross = (depth + 2.3) / 2 + .5;
      if (!free(s, middle, halfAlong, halfAcross)) continue;
      taken.push({s, lateral: middle, along: halfAlong, across: halfAcross});
      houses.push(Object.freeze({s, lateral, heading: -side * Math.PI / 2,
        width, depth, storeys: i % 4 === 0 ? 2 : 1}));
    }
    if (i % 4 === 0 && free(s, centre + 3, .5, .5)) {
      taken.push({s, lateral: centre + 3, along: .5, across: .5});
      lamps.push(Object.freeze({s, lateral: centre + 3}));
    }
  }
  const streets = [28, 48].map(lateral => Object.freeze({width: 4,
    points: Object.freeze(Array.from({length: 196}, (_, i) => {
      const s = named('Stavelot').s0 - 65 + i;
      return Object.freeze({s, lateral: lateral + 1.2 * Math.sin((s - named('Stavelot').s0) / 70)});
    }))}));
  return {houses: Object.freeze(houses), lamps: Object.freeze(lamps), streets: Object.freeze(streets)};
}
// The Red Water stream: two long, narrow basins cut across the road line, one each side, so the existing
// circuit water (src/circuit-water.js) lies in a channel dug 0.6 to 1 m into the ground. The ground within
// 6 m of the road edge is never touched, so the road and its shoulders cover the crossing as before.
const RED_WATER_BASINS = Object.freeze([
  // Bridge side: the stone arch stands at lateral 36 in the middle of this channel.
  Object.freeze({id: 'red-water-bridge', s: RED_WATER_S, lateral: 35, along: 3, across: 19, surface: -.25, depth: .2,
    bank: .5, blend: 6, keep: 6, colour: 0x4a2418, shallow: 0x2c170f}),
  Object.freeze({id: 'red-water-far', s: RED_WATER_S, lateral: -33, along: 3, across: 17, surface: -.95, depth: .4,
    bank: .5, blend: 6, keep: 6, colour: 0x4a2418, shallow: 0x2c170f}),
]);
export const ARDENNES_FOREST = Object.freeze({
  ...ARDENNES_ROAD,
  water: Object.freeze({glitter: false}),
  basins: RED_WATER_BASINS,
  fieldSize: 8, grandPrixLaps: 2,
  // Team Room intel (docs/CIRCUITS.md section 7b.1), written by Claude in the finishing pass. Sectors stay
  // the default thirds, so the course fingerprint and reference lap are unchanged. Target speeds and gears
  // come from the reference lap; boards are named only where boards stand. Wall Crest keeps the
  // generated crest flag (crest-2): engineer notes apply only to analysed corners.
  intel: {
    flags: [
      {id: 'red-water', kind: 'signature', s: 785, title: 'Red Water and The Wall', camera: {back: 40, ahead: 90}},
      {id: 'kestrel', kind: 'overtaking', s: 1950, title: 'Kestrel into Les Combes'},
      {id: 'bus-stop', kind: 'overtaking', s: 6259, title: 'The Bus Stop'},
      {id: 'la-fontaine', kind: 'corner', s: 390, title: 'La Fontaine'},
      {id: 'riverside', kind: 'corner', s: 2755, title: 'Riverside'},
      {id: 'long-left', kind: 'corner', s: 3519, title: 'Long Left'},
    ],
    notes: {
      'la-fontaine': {brakeBoard: 100, line: 'Stay left on the way down, brake in a straight line, late apex, let it run out to the left.', note: 'Downhill into the tightest corner on the lap. Lap one is a scramble: brake at the 150 board and stay out of trouble.'},
      'red-water': {line: 'Wide on the left, clip the left kerb over the stream, then straight across for The Wall.', note: 'The car squats at the bottom. Keep it straight through the dip; the stream is where you lose it.'},
      'the-wall': {line: 'Inside kerb on the right, then let the climb carry you left.', note: 'Twenty-three percent. The car is pressed into the road, so it takes more throttle than you think.'},
      'les-combes': {brakeBoard: 100, line: 'Brake in a straight line on the right, turn in late, inside kerb.', note: 'The place to pass after Kestrel. Finish braking before you turn: it goes light over the top.'},
      'combes-exit': {line: 'Hold the right, late apex on the left, drift right for Malmedy.', note: 'A clean exit here is free time down the hill.'},
      'malmedy': {brakeBoard: 100, line: 'Brake early, it is downhill, middle apex.', note: 'The road falls away on the exit. Stay off the grass.'},
      'riverside': {brakeBoard: 100, line: 'Wide on the left, brake at the 100 board, very late apex.', note: 'Downhill hairpin: the car pushes wide. Wait for the exit before the throttle.'},
      'woodland-left': {line: 'Hug the left, use all the road on the way out.', note: 'Downhill and blind to the exit. Settle the car for Long Left.'},
      'long-left': {line: 'Two apexes: touch the first, wait, take the second, throttle from the middle.', note: 'Fast, long and downhill. Brake before it, not in it; the gravel outside is there for a reason.'},
      'fagnes': {line: 'Brake on the left, quick right, set up for the left.', note: 'First of a pair. Give a little here to get Fagnes Exit right.'},
      'fagnes-exit': {line: 'Clip the left kerb, straight line on the way out.', note: 'The slower of the pair.'},
      'campus': {line: 'Late apex, keep left on the exit.', note: 'Short run to Stavelot. Do not overdo it.'},
      'stavelot': {line: 'Wide entry, early throttle, use the exit kerb.', note: 'The lowest point. Every km/h out of here counts all the way up to the Bus Stop.'},
      'woodcutter': {line: 'Flat, inside line.', note: 'Uphill and fast: a touch of steering only.'},
      'whitewood': {line: 'Flat out in a good car, tight on the left.', note: 'The brave corner. Lift if unsure; a lift costs less than the trees.'},
      'bus-stop': {brakeBoard: 100, line: 'Brake at the 100 board, right kerb, then straight across.', note: 'Last chance to pass: go down the inside. Do not run wide; the left comes at once.'},
      'bus-stop-2': {line: 'Clip the left kerb, keep the car straight over it.', note: 'The slowest point on the lap. The exit matters more than the entry.'},
      'bus-stop-exit': {line: 'Early throttle, run out to the left onto Pit Straight.', note: 'Timing tower on your left. Flat from here to the line.'},
    },
  },
  runoffBands: LONG_LEFT_RUNOFF,
  circuitLandmarks: Object.freeze([
    Object.freeze({id: 'stavelot-valley-town', type: 'town', ...VILLAGE, height: 12,
      // Ardennes stone houses under steep dark slate (ARDENNES-STAVELOT-STONE, Kyle: "if Belgian, then
      // Belgian look"); the same houses, footprints and positions as before.
      houseStyle: 'ardennes-stone', roofColours: Object.freeze([0x2c3034, 0x363a3e, 0x303236]), ...valleyTown()}),
    Object.freeze({id: 'stavelot-church', type: 'church', ...VILLAGE, height: 22, churchStyle: 'stone', grounding: 'footprint'}),
  ]),
  lightPath: Object.freeze({axis: 'distance', wrap: false, palette: 'forest-morning', keyframes: Object.freeze([
    Object.freeze({at: 0, look: 'golden'}), Object.freeze({at: road.length, look: 'day'}),
  ])}),
  kitLook: Object.freeze({'autumn-tree': Object.freeze({leafColour: 0x38592c}),
    'lantern-tower': Object.freeze({glow: .15})}),
  effects: Object.freeze({
    // The wet banks, rocks and reeds along the two basins below; the water itself is the existing circuit water.
    stream: Object.freeze({s: RED_WATER_S, width: 5, reach: 68, colour: 0x1c100b, basins: Object.freeze(RED_WATER_BASINS.map(basin => basin.id))}),
    valleyMist: Object.freeze([
      Object.freeze({s: named('Red Water').s0, lateral: 42, along: 75, across: 25, count: 12, height: 2, opacity: .23, colour: 0xd1ddda, fadeEnd: 1}),
      // Finishing pass: Riverside's bank is fainter (.2 to .12) so its edge does not show from above the hairpin.
      Object.freeze({s: named('Riverside').s0, lateral: -42, along: 100, across: 26, count: 12, height: 2, opacity: .12, colour: 0xd1ddda, fadeEnd: 1}),
      Object.freeze({s: named('Stavelot').s0, lateral: -38, along: 95, across: 22, count: 10, height: 2.5, opacity: .18, colour: 0xd1ddda, fadeEnd: 1}),
      Object.freeze({s: named('Kestrel Straight').s1 - 70, lateral: 44, along: 110, across: 26, count: 10, height: 22, opacity: .18, colour: 0xe4e9e7, fadeEnd: 1}),
    ]),
  }),
  // Existing damp asphalt presentation. No tyre or surface-grip change.
  wetRoad: Object.freeze({performanceShare: .5}),
  dampRoad: Object.freeze({colour: 0x747474, dryRoughness: .9, dampRoughness: .58, mist: true,
    shadeRanges: Object.freeze(['Kestrel Straight', 'Forest Run', 'Whitewood'].map(name => {
      const piece = named(name); return Object.freeze({from: piece.s0, to: piece.s1});
    })),
  }),
  // Beeches stand only 40 m or more beyond the road edge (26 m behind the catch fence); nearer trees stay fir.
  beech: Object.freeze({scales:Object.freeze([.9,1,1.1]),setback:40,
    groves:Object.freeze([['Kestrel Straight',.28],['Kestrel Straight',.68],['Forest Run',.3],['Forest Run',.75]].map(([name,fraction])=>{
      const piece=named(name);return Object.freeze({s:piece.s0+(piece.s1-piece.s0)*fraction,reach:45});
    }))}),
  scenery: Object.freeze({
    trees: 800, rocks: 120, mountains: false,
    // First fir row is about 9 m behind the ordinary catch fence (14.3 m).
    forest: Object.freeze({from: 23, to: 60, spacing: 3.8, rows: 7, thin: .12,
      scale: Object.freeze([1.1, 2]), jitter: .8}),
    // Current Tremblant grove renderer, in summer greens rather than autumn orange.
    autumn: Object.freeze({share: .35, colours: Object.freeze([
      Object.freeze([.22, .46, .16]), Object.freeze([.28, .52, .18]), Object.freeze([.19, .40, .14]),
    ])}),
    clear: Object.freeze([
      Object.freeze({s0: 0, s1: PIT_END + 20, from: -60, to: 55}),
      Object.freeze({s0: road.length - 80, s1: road.length, from: -60, to: 55}),
      Object.freeze({s0: named('The Wall').s0 - 35, s1: named('The Wall').s0 + 90, from: -55, to: -20}),
      Object.freeze({s0: named('Stavelot').s0 - 80, s1: named('Stavelot').s0 + 150, from: 12, to: 64}),
    ]),
  }),
  // Gravel and grass colour only. The road and run-off grip stay unchanged.
  groundLeaves: Object.freeze({strength: 0, gravel: Object.freeze({colour: Object.freeze([.64, .61, .54]),
    width: 12, fade: 8, ends: 24, grass: Object.freeze([.56, .76, .52]), to: 55})}),
  kitPlacements: Object.freeze([...paddock(), ...safety(), ...brakingBoards(), ...landmarks()]),
});

// Registration belongs to this course; generation and geometry stay unchanged.
// Released by Kyle: production admission still requires course ownership.
export const manifest = Object.freeze({
  id: 'ardennes-forest', flag: 'ardennes-forest', state: 'on', price: 2000,
  grandPrix: true, releaseOrder: 5,
  driver: Object.freeze({car: 'stuttgart_959s', driverId: 'club', controller: 'racing-line', skill: .95}),
});
