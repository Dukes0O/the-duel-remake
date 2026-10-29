// C2 road with C4 round 1 scenery. C3 owns field pace; C5 owns lake and torii.
import {buildTrackScript, defineScriptedCourse} from '../track-script.js';
import {buildKitPlacements} from '../circuit-kit-layout.js';

const script = [
  ['straight', 300, {name: 'Lakeside Start', climb: -4}],
  ['turn', 'L', 54, 90, {name: 'Torii Bend', climb: -5}],
  ['straight', 320, {name: 'Shrine Straight', climb: -16}],
  ['turn', 'R', 66, 45, {name: 'Car Park Corner', climb: -6}],
  ['straight', 180, {climb: -12}],
  ['turn', 'L', 168, 15, {name: 'Cedar Hairpin', climb: -4, width: 12}],
  ['straight', 150, {climb: -14, width: 10}],
  ['turn', 'R', 43, 60, {climb: -5}],
  ['straight', 300, {name: 'Cedar Descent', climb: -25}],
  ['turn', 'R', 166, 14, {name: 'Maple Hairpin', climb: -4, width: 12}],
  ['straight', 140, {climb: -13, width: 10}],
  ['turn', 'L', 44, 55, {climb: -5}],
  ['straight', 280, {climb: -23}],
  ['turn', 'L', 164, 16, {name: 'Tea House Hairpin', climb: -4, width: 12}],
  ['straight', 160, {climb: -14, width: 10}],
  ['turn', 'R', 74, 70, {climb: -5}],
  ['straight', 420, {name: 'Maple Terraces', climb: -34}],
  ['turn', 'R', 74, 35, {name: 'Stone Wall Right', climb: -4}],
  ['turn', 'L', 54, 40, {name: 'Stone Wall Left', climb: -4}],
  ['straight', 240, {climb: -16}],
  ['turn', 'R', 164, 15, {name: 'Sodium Hairpin', climb: -4, width: 12}],
  ['straight', 180, {climb: -16, width: 10}],
  ['turn', 'L', 53, 60, {climb: -5}],
  ['straight', 380, {name: 'Village Run', climb: -22}],
  ['turn', 'L', 70, 28, {name: 'Bridge Corner', climb: -3}],
  ['straight', 260, {climb: -15}],
  ['turn', 'R', 44, 80, {climb: -3}],
  ['straight', 300, {name: 'Finish Straight', climb: -9}],
];

const base = {
  id: 'kogane-pass', name: 'Kogane Pass', flag: 'kogane-pass', kind: 'circuit',
  stage: 22, layoutVersion: 1, layoutSeed: 1989, closed: false, baseHeight: 320,
  theme: 'alpine', script, scriptDefaults: {width: 10, walls: 'both'},
  laps: 1, grandPrixLaps: 1, fieldSize: 6, gridStartS: 45, defaultMode: 'grandprix',
  hasRival: true, hasRadar: false, noTraffic: true, noCombat: true, airborne: true,
  terrainHalfWidth: 64, speedLimitMph: 100, finishArea: true,
  racingLine: {roadShare: .85, maxSlope: .08, lineMargin: 1.8},
  fieldFollow: {leadBraking: 1.6, wallRoom: 1, firstLap: {margin: 5, reaction: .5, closeIn: .8, wallRoom: 1.4}},
};
const road = buildTrackScript(base);
const starts = [0, 730, 2360, 3230, road.length];
const names = ['Summit Lake', 'Cedar Switchbacks', 'Maple Terraces', 'Village Run'];
const walls = buildKitPlacements(base, {walls: {wall: 'concrete-wall'}});

// Keep the physical walls and their inner faces unchanged. Higher retaining
// stone stands on the uphill verge; low concrete protects the outside bends.
const safety = walls.map(row => {
  const piece = road.pieceAt(row.s);
  const uphill = piece.kind === 'turn' ? piece.dir : 1;
  if (row.s < 730 || Math.sign(row.lateral) !== uphill && row.s < 2897) {
    return {...row, id: 'armco-white',
      lateral: row.lateral - Math.sign(row.lateral) * (.72 - .349) / 2};
  }
  return row.s >= 730 && Math.sign(row.lateral) === uphill &&
    !(piece.kind === 'turn' && piece.radius < 30)
    ? {...row, id: 'stone-retaining-wall',
      heading: row.lateral > 0 ? -Math.PI / 2 : Math.PI / 2} : row;
});

const roadside = [];
for (const piece of road.pieces.filter(piece => piece.name?.endsWith('Hairpin'))) {
  // Mirrors and boards stand beyond the outside wall. No tall object is on
  // the inside of the turn where it could hide the next section of road.
  const side = -piece.dir;
  roadside.push({id: 'curve-mirror', s: piece.s0 - 8,
    lateral: side * 9.5, heading: side > 0 ? -Math.PI / 2 : Math.PI / 2});
  for (const t of [.18, .4, .62, .84]) {
    roadside.push({id: 'chevron-board', s: piece.s0 + (piece.s1 - piece.s0) * t,
      lateral: side * 9.6, heading: side > 0 ? -Math.PI / 2 : Math.PI / 2});
  }
}

// Explicit small groves reuse the existing deciduous kits. The fir bands
// below remain the main forest. Keep clear inside every tight corner.
const maples = [];
for (let s = 120, index = 0; s < road.length - 90; s += 33, index++) {
  const piece = road.pieceAt(s);
  // The near-ground ribbon folds around tight corners. Keep broad maple
  // roots off those folds and keep the whole approach visible to the driver.
  if (road.pieces.some(turn => turn.kind === 'turn' && turn.radius < 30 &&
      s > turn.s0 - 110 && s < turn.s1 + 230)) continue;
  for (const side of [-1, 1]) {
    if (s < 730 && side < 0 || s > 3570 && s < 3930) continue;
    maples.push({id: index % 3 ? 'autumn-tree-copper' : 'autumn-tree-golden',
      s, lateral: side * (15 + index % 4 * 2.5), heading: index * 2.4,
      scale: [.85, 1.05, .95][index % 3], clear: 4});
  }
}

const village = buildKitPlacements(base, {rows: [
  {from: 3620, to: 3920, side: 1, pieces: ['shopfront-a', 'shopfront-b'],
    setback: 9, gap: 17, density: .72, scale: [.55, .7]},
]});

export const KOGANE_PASS = defineScriptedCourse({
  ...base,
  sections: names.map((name, i) => ({name, theme: 'alpine', share: (starts[i + 1] - starts[i]) / road.length})),
  lightPath: {axis: 'distance', wrap: false, keyframes: [
    {at: 0, look: 'dusk'}, {at: 1500, look: 'dusk'}, {at: 2600, look: 'night'},
  ]},
  wetRoad: {performanceShare: .5},
  groundLeaves: {colours: [[1.05, .34, .12], [1.1, .68, .2], [.74, .3, .13]],
    strength: .65, reach: 25, far: .08,
    wood: {green: [.32, .47, .3], colours: [[.7, .32, .13], [.8, .5, .18]], share: .28, from: 12}},
  scenery: {trees: 350, rocks: 100, mountains: false, continuousGround: true,
    forest: {from: 10, to: 60, spacing: 4.8, rows: 8, thin: .22, jitter: .9,
      scale: [1.5, 2.5]},
    farForest: {from: 60, to: 150, spacing: 12, rows: 5, thin: .5, jitter: .9, scale: [1.6, 2.7]},
    clear: [
      {s0: 0, s1: 730, from: -180, to: -10},
      {s0: 65, s1: 150, from: 10, to: 38},
      {s0: 3570, s1: 3930, from: 10, to: 33},
    ]},
  kitLook: {
    'autumn-tree-copper': {leafColour: 0xa53d20},
    'autumn-tree-golden': {leafColour: 0xbc8b26},
    'shopfront-a': {wash: {colour: 0xffc281, strength: .35, height: 6, floor: .08}},
    'shopfront-b': {wash: {colour: 0xffc281, strength: .35, height: 6, floor: .08}},
    'lantern-string': {glow: .8},
  },
  mergeKitMeshes: ['tea-house', 'vending-row', 'shopfront-a', 'shopfront-b',
    'curve-mirror', 'stone-retaining-wall', 'armco-white'],
  effects: {valleyMist: [
    {s: 2490, lateral: -46, along: 100, across: 24, count: 10,
      height: 1.5, opacity: .10, colour: 0xabb9bd, fadeEnd: 1},
  ]},
  // Harbour's lamp geometry and warm road pools, on our alpine lower road.
  // C5 can tune these alongside the final distance light path.
  waterside: {lamps: [{from: 3280, to: road.length - 20, every: 40, side: -1,
    height: 9, colour: 0xffa23c, pool: .22, halo: 1.4, strength: .65}]},
  glows: [
    {piece: 'lantern-string', points: [-3.13, -1.88, -.63, .63, 1.88, 3.13].map(x => [x, 1.85, 0]),
      colour: 0xffb04c, size: .8, strength: .65},
    {piece: 'tea-house', points: [[-2.7, 1.75, 2.6], [2.7, 1.75, 2.6]],
      colour: 0xffc078, size: 2, strength: .5},
    {piece: 'vending-row', points: [[-1.24, 1.4, .46], [0, 1.4, .46], [1.24, 1.4, .46]],
      colour: 0xd1eeed, size: 1, strength: .7},
  ],
  kitPlacements: [
    ...safety, ...roadside, ...maples, ...village,
    {id: 'tea-house', s: 110, lateral: 22, heading: -Math.PI / 2, clear: 12},
    {id: 'vending-row', s: 124, lateral: 17, heading: -Math.PI / 2, clear: 5},
    {id: 'lantern-string', s: 110, lateral: 18.5, heading: -Math.PI / 2, lift: 1.2},
    {id: 'start-gantry', s: 45, lateral: 0, heading: Math.PI, scale: 1},
    ...road.boards.map(board => ({id: `braking-board-${board.distance}`, s: board.s,
      lateral: board.side * (road.halfWidthAt(board.s) + 2.4), heading: Math.PI, scale: 1})),
  ],
});

export const manifest = Object.freeze({
  id: 'kogane-pass', flag: 'kogane-pass', state: 'dev', price: 2200,
  grandPrix: true, releaseOrder: 13,
  driver: Object.freeze({car: 'stuttgart_959s', driverId: 'club', controller: 'racing-line', skill: .95}),
});
