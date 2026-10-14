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


const road = buildTrackScript(ARDENNES_ROAD);
const named = name => road.pieces.find(piece => piece.name === name);
const wrap = s => ((s % road.length) + road.length) % road.length;
const row = (id, s, lateral, extra = {}) => Object.freeze({id, s: wrap(s), lateral, ...extra});
const PIT_END = named('Pit Straight').s1;

function paddock() {
  const out = [row('start-gantry', 0, 0, {heading: Math.PI})];
  for (let s = 70; s < PIT_END - 65; s += 7.5)
    out.push(row('pit-garage', s, -31, {heading: Math.PI / 2, solid: true}));
  for (let s = 55; s < PIT_END - 30; s += 15)
    out.push(row('grandstand', s, 31, {heading: -Math.PI / 2, solid: true, crowd: true}));
  // The existing native pit divider owns both drawing and collision.
  // Do not duplicate its wall with a second kit face.
  return out;
}

function safety() {
  const out = [];
  // The whole approved 12 m run-off stays open. Fences are outside it, with
  // the right-hand paddock and the native pit openings left clear.
  for (let s = 4; s < road.length - 4; s += 8) for (const side of [-1, 1]) {
    if (side < 0 && (s <= PIT_END + 15 || s >= road.length - 75)) continue;
    out.push(row('catch-fence', s, side * (road.halfWidthAt(s) + 14.3),
      {heading: Math.PI / 2, scale: Object.freeze([2, 1, 1]), solid: true}));
  }
  for (const name of ['La Fontaine', 'Red Water', 'The Wall', 'Les Combes', 'Malmedy',
    'Riverside', 'Woodland Left', 'Long Left', 'Fagnes', 'Campus', 'Stavelot',
    'Woodcutter', 'Whitewood', 'Bus Stop', 'Bus Stop 2']) {
    const piece = named(name), side = -piece.dir;
    for (let s = piece.s0 - 8; s < piece.s1 + 8; s += 4) {
      if (side < 0 && wrap(s) <= PIT_END + 15) continue;
      out.push(row('armco', s, side * (road.halfWidthAt(s) + 12.8),
        {heading: Math.PI / 2, solid: true}));
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
  out.push(row('stone-stream-bridge', (red.s0 + red.s1) / 2, 36, {heading: 0, clear: 12}));
  for (let i = 0; i < 6; i++) out.push(row('grandstand', wall.s0 - 15 + i * 15, -34,
    {heading: Math.PI / 2, crowd: true, solid: true, clear: 11}));
  const kestrel = named('Kestrel Straight');
  out.push(row('forest-footbridge', kestrel.s0 + (kestrel.s1 - kestrel.s0) * .58, 0, {clear: 38}));
  const stavelot = named('Stavelot');
  for (let i = 0; i < 12; i++) out.push(row(i % 2 ? 'shopfront-a' : 'shopfront-b', stavelot.s0 + 30 + i * 14,
    92 + i % 3 * 14, {heading: Math.PI, scale: .8, clear: 9}));
  // The accepted pointed lantern tower forms the village spire above its roofs.
  out.push(row('lantern-tower', stavelot.s0 + 98, 108, {scale: Object.freeze([.75, 1.5, .75]), clear: 10}));
  out.push(row('forest-timing-tower', named('Bus Stop Exit').s0, -42, {heading: Math.PI, clear: 12}));
  // Existing leafy trees beside the darker fir rows. Their actual leaves use
  // the course-owned material colour; no donor GLB is regenerated.
  for (let s = PIT_END + 100; s < road.length - 100; s += 105) for (const side of [-1, 1]) {
    const at = wrap(s + (side > 0 ? 25 : 0));
    const lateral = side * (road.halfWidthAt(at) + 22);
    const corner = road.pieceAt(at);
    if (corner.kind === 'turn' && side === corner.dir) continue;
    if (Math.abs(at - (kestrel.s0 + (kestrel.s1 - kestrel.s0) * .58)) < 40) continue;
    out.push(row('autumn-tree', at, lateral, {scale: 1.05, clear: 5}));
  }
  return out;
}

export const ARDENNES_FOREST = Object.freeze({
  ...ARDENNES_ROAD,
  fieldSize: 8, grandPrixLaps: 2,
  lightPath: Object.freeze({axis: 'distance', wrap: false, palette: 'forest-morning', keyframes: Object.freeze([
    Object.freeze({at: 0, look: 'golden'}), Object.freeze({at: road.length, look: 'day'}),
  ])}),
  kitLook: Object.freeze({'autumn-tree': Object.freeze({leafColour: 0x38592c}),
    'lantern-tower': Object.freeze({glow: .15})}),
  effects: Object.freeze({
    stream: Object.freeze({s: (named('Red Water').s0 + named('Red Water').s1) / 2, width: 5, reach: 68, colour: 0x704033}),
    valleyMist: Object.freeze([
      Object.freeze({s: named('Red Water').s0, lateral: 42, along: 75, across: 25, count: 12, height: 2, opacity: .23, colour: 0xd1ddda, fadeEnd: 1}),
      Object.freeze({s: named('Riverside').s0, lateral: -42, along: 100, across: 26, count: 12, height: 2, opacity: .2, colour: 0xd1ddda, fadeEnd: 1}),
      Object.freeze({s: named('Stavelot').s0, lateral: -38, along: 95, across: 22, count: 10, height: 2.5, opacity: .18, colour: 0xd1ddda, fadeEnd: 1}),
      Object.freeze({s: named('Kestrel Straight').s1 - 70, lateral: 44, along: 110, across: 26, count: 10, height: 22, opacity: .18, colour: 0xe4e9e7, fadeEnd: 1}),
    ]),
  }),
  // Existing damp asphalt presentation. No tyre or surface-grip change.
  wetRoad: Object.freeze({performanceShare: .5}),
  scenery: Object.freeze({
    trees: 800, rocks: 120, mountains: false,
    forest: Object.freeze({from: 16, to: 40, spacing: 5.2, rows: 4, thin: .35,
      scale: Object.freeze([.9, 1.9]), jitter: 1.1}),
    clear: Object.freeze([
      Object.freeze({s0: 0, s1: PIT_END + 20, from: -60, to: 55}),
      Object.freeze({s0: road.length - 80, s1: road.length, from: -60, to: 55}),
    ]),
  }),
  // Gravel and grass colour only. The road and run-off grip stay unchanged.
  groundLeaves: Object.freeze({gravel: Object.freeze({colour: Object.freeze([.64, .61, .54]),
    width: 12, fade: 8, ends: 24, grass: Object.freeze([.56, .76, .52]), to: 55})}),
  kitPlacements: Object.freeze([...paddock(), ...safety(), ...landmarks()]),
});

// Registration belongs to this course; generation and geometry stay unchanged.
// A dev circuit: it is on COURSE only while its switch is requested for QA.
export const manifest = Object.freeze({
  id: 'ardennes-forest', flag: 'ardennes-forest', state: 'dev', price: 2000,
  grandPrix: true, releaseOrder: 5,
  driver: Object.freeze({car: 'stuttgart_959s', driverId: 'club', controller: 'racing-line', skill: .95}),
});
