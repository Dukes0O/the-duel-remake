// C2 road with C4 round 2 scenery. C3 owns field pace; C5 owns lake and torii.
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
  terrainHalfWidth: 64, markings: 'single-yellow', speedLimitMph: 100, finishArea: true,
  // C3 field pace. Summit's line and following are the start, with Harbour's
  // and Panorama's controls for racing between walls: racers keep 3 m off the
  // edge, cross a bend by a fifth of its sweep and never turn faster than the
  // line allows (`holdRacers`, which ended the walls-only crashes). Followers
  // keep the room a comfortable stop needs (`leadBraking` 1). A wider spread
  // and form give the field passes, and gentler aggression fewer dives between
  // walls. One pace per difficulty, found with
  // `node tools/test-circuit-kogane.mjs --pace` at skill .95.
  racingLine: {roadShare: .85, maxSlope: .08, lineMargin: 3, lineSwing: .2, holdRacers: true},
  fieldFollow: {leadBraking: 1, wallRoom: 1, firstLap: {margin: 5, reaction: .5, closeIn: .8, wallRoom: 1.4}},
  fieldPace: {easy: .57, medium: .625, hard: .67},
  fieldAggression: .7, fieldSpread: 3, fieldForm: 6,
};
const road = buildTrackScript(base);
// Negative lateral is the right-hand shore in the script coordinate system.
// The basin is dug into the ground and also draws the water (circuit-water.js).
const LAKE = {id: 'kogane-crater-lake', s: 230, lateral: -126,
  along: 215, across: 100, surface: -3, depth: 8, bank: .16,
  blend: 40, keep: 12, colour: 0x143c4e, shallow: 0x5e9a94};
// Rounded wooded hills across the lake (the existing backdrop hills, as on Tremblant Woods):
// cedar green with patches of autumn red and gold, up to the ridgeline.
const farHill = (s, lateral, along, across, height) => {
  const at = road.samples[Math.round(s / road.step)];
  return {x: at.x + Math.cos(at.heading) * lateral, z: at.z - Math.sin(at.heading) * lateral,
    angle: at.heading, along, across, height, cell: 10, drawn: true};
};
const backdrop = {
  // A low front row covers the bare slope from the shore, with two taller ridges behind it.
  hills: [farHill(0, -400, 300, 190, 60), farHill(260, -410, 330, 200, 75),
    farHill(520, -400, 300, 190, 60), farHill(120, -640, 380, 200, 130),
    farHill(420, -650, 380, 200, 120)],
  colours: {forest: [0x2f5f2c, 0x3a7032, 0x275428, 0x44702f],
    autumn: [0xc8501c, 0xb83a28, 0xe0a82c, 0xc4661e], share: .4, cut: .5},
};
const starts = [0, 730, 2360, 3230, road.length];
const names = ['Summit Lake', 'Cedar Switchbacks', 'Maple Terraces', 'Village Run'];
const walls = buildKitPlacements(base, {walls: {wall: 'concrete-wall'}});

// Wall pieces are cut to the drawn wall, not to the road centre line (KOGANE-WALL). The shared layout
// spaces kit pieces by distance along the centre line and stretches each to fit. On the outside of a
// hairpin the wall is half as long again as the centre line (gaps between concrete blocks of up to 1.8 m),
// and on a straight a stone piece was stretched four times its own length. Each piece is cut into parts
// laid end to end along the wall as it really runs, each close to the length the model was made for.
const wallPoint = (s, lateral) => {
  const p = Math.min(road.length, Math.max(0, s)), i = Math.min(road.samples.length - 2, Math.floor(p / road.step));
  const a = road.samples[i], b = road.samples[i + 1], t = (p - a.s) / road.step;
  const heading = a.heading + (b.heading - a.heading) * t;
  return {x: a.x + (b.x - a.x) * t + Math.cos(heading) * lateral, z: a.z + (b.z - a.z) * t - Math.sin(heading) * lateral};
};
const wallRun = (from, to, lateral) => {
  const steps = Math.max(2, Math.ceil((to - from) / .5));
  let sum = 0, last = wallPoint(from, lateral);
  for (let i = 1; i <= steps; i++) {
    const at = wallPoint(from + (to - from) * i / steps, lateral);
    sum += Math.hypot(at.x - last.x, at.z - last.z);
    last = at;
  }
  return sum;
};
const cutWall = (row, aim, overlap) => {
  const size = 4 * row.scale[0] + .1, from = row.s - size / 2, run = wallRun(from, from + size, row.lateral);
  const low = Math.max(1, Math.floor(run / aim)), high = low + 1;
  const count = Math.abs(Math.log(run / low / aim)) < Math.abs(Math.log(run / high / aim)) ? low : high;
  return Array.from({length: count}, (_, i) => ({...row, s: from + size * (i + .5) / count,
    scale: [(run / count + overlap) / 4, row.scale[1], row.scale[2]]}));
};
const wallHash = n => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
const STONE_VARIANTS = ['stone-retaining-wall', 'stone-retaining-wall-b', 'stone-retaining-wall-c'];

// Preserve the script collision and inner faces. Concrete is limited to the
// outside of tight hairpins. Everywhere else the downhill edge stays open.
const safety = walls.flatMap(row => {
  const piece = road.pieceAt(row.s);
  const side = Math.sign(row.lateral);
  const uphill = piece.kind === 'turn' ? piece.dir : 1;
  const hairpin = piece.kind === 'turn' && piece.radius < 30;
  if (hairpin && side === -piece.dir) {
    // Blocks overlap by 12 cm and every other one stands 1 cm further out, so the corner between two
    // blocks on the curve is closed and the overlapped faces do not flicker. The wall behind is unchanged.
    return cutWall(row, 3.4, .12).map((part, i) => ({...part, lateral: part.lateral + side * (i % 2) * .01}));
  }
  if (row.s >= 730 && side === uphill && !hairpin) {
    return cutWall({...row, id: 'stone-retaining-wall',
      lateral: side * (road.halfWidthAt(row.s) + 1 + .796 / 2),
      heading: side > 0 ? -Math.PI / 2 : Math.PI / 2}, 4, .05);
  }
  return [{...row, id: 'armco-white',
    lateral: side * (road.halfWidthAt(row.s) + 1 + .349 / 2),
    heading: side > 0 ? -Math.PI / 2 : Math.PI / 2}];
});
// Three stone patterns, picked by a fixed pseudo-random draw that never repeats the one before on the
// same side, and now and then avoids the one before that too, so a run of wall shows no tiling.
for (const side of [-1, 1]) {
  let before = -1, earlier = -1, count = 0;
  for (const row of safety.filter(row => row.id === 'stone-retaining-wall' && Math.sign(row.lateral) === side)
      .sort((a, b) => a.s - b.s)) {
    const draw = wallHash(count++ + side * 1000);
    const options = [0, 1, 2].filter(v => v !== before && !(v === earlier && wallHash(count + 77) < .5));
    const pick = options[Math.floor(draw * options.length)];
    row.id = STONE_VARIANTS[pick];
    earlier = before;
    before = pick;
  }
}

const roadside = [];
for (const piece of road.pieces.filter(piece => piece.name?.endsWith('Hairpin'))) {
  // Mirrors and boards stand beyond the outside wall. No tall object is on
  // the inside of the turn where it could hide the next section of road.
  const side = -piece.dir;
  roadside.push({id: 'curve-mirror', s: piece.s0 - 8,
    lateral: side * 9.5, heading: side > 0 ? -Math.PI / 2 : Math.PI / 2});
  // The board's arrow points left from the front and right from the back (C6). The outside of a left-hand turn
  // is the right shore: the front faces the road. For a right-hand turn the board is turned round so the
  // back faces the road and the arrow points right, into the turn.
  for (const t of [.18, .4, .62, .84]) {
    roadside.push({id: 'chevron-board', s: piece.s0 + (piece.s1 - piece.s0) * t,
      lateral: side * 9.6, heading: Math.PI / 2});
  }
}

// Small autumn groups sit a few metres beyond the rail. On a hairpin only
// the outside is planted, leaving the inside and the next-turn view open.
const maples = [];
for (let s = 120, index = 0; s < road.length - 90; s += 22, index++) {
  const piece = road.pieceAt(s);
  const nearbyTurn = road.pieces.find(turn => turn.kind === 'turn' && turn.radius < 30 &&
    s > turn.s0 - 65 && s < turn.s1 + 130);
  for (const side of [-1, 1]) {
    if (s < 730 && side < 0 || s > 3570 && s < 3930 ||
        nearbyTurn && side === nearbyTurn.dir) continue;
    maples.push({id: index % 3 ? 'autumn-tree-copper' : 'autumn-tree-golden',
      s, lateral: side * (road.halfWidthAt(s) + 5.8 + index % 3 * 1.2),
      heading: index * 2.4, scale: [.65, .8, .7][index % 3], clear: 2});
  }
}

// Autumn maples on the far shore of the lake, in loose groves up the slope: the same C4 maple
// kit as the road verges, in the lake's own frame so none stands in the water.
const farMaples = [];
const unit = n => { const v = Math.sin(n * 12.9898 + 4.1414) * 43758.5453; return v - Math.floor(v); };
for (let s = 10, i = 0; s <= 460; s += 17) {
  const reach = (s - LAKE.s) / LAKE.along;
  if (Math.abs(reach) >= .93) continue;
  const shore = LAKE.lateral - LAKE.across * Math.sqrt(1 - reach * reach);
  for (let row = 0; row < 7; row++, i++) {
    // Groves: a slow wave along the shore leaves clearings, and the rows thin out up the slope.
    const grove = .55 + .3 * Math.sin(s * .031 + row * .4) + .2 * Math.sin(s * .011 - row * .9);
    if (unit(i) > grove * (1 - row * .09)) continue;
    farMaples.push({id: i % 3 ? 'autumn-tree-copper' : 'autumn-tree-golden',
      s: s + (unit(i + 500) - .5) * 9, lateral: shore - 10 - row * 15 - unit(i + 900) * 9,
      heading: i * 2.4, scale: 1.1 + unit(i + 1300) * .8, clear: 2});
  }
}

// Cedar on the slope across the lake (`scenery.shoreForest`): stretches that keep it out of the water,
// each starting a little beyond the far shore at its most distant point.
const shoreClear = [];
for (let s0 = 0; s0 < 580; s0 += 20) {
  const farShore = s => {
    const reach = (s - LAKE.s) / LAKE.along;
    return Math.abs(reach) >= 1 ? -150 : LAKE.lateral - LAKE.across * Math.sqrt(1 - reach * reach);
  };
  shoreClear.push({s0, s1: s0 + 20, from: Math.min(farShore(s0), farShore(s0 + 20)) - 6, to: 500});
}

const village = buildKitPlacements(base, {rows: [
  {from: 3620, to: 3920, side: 1, pieces: ['shopfront-a', 'shopfront-b'],
    setback: 9, gap: 17, density: .72, scale: [.55, .7]},
]});

// Match the existing lower-road lamp row. Only nearby surfaces take the wash.
const lampPools = [];
for (let s = 3280; s <= road.length - 20; s += 40) {
  const at = road.samples[Math.min(road.samples.length - 1, Math.round(s / road.step))];
  const off = -(road.halfWidthAt(s) + 2.5);
  lampPools.push([at.x + Math.cos(at.heading) * off, at.z - Math.sin(at.heading) * off]);
}
const sodiumWash = {colour: 0xffac55, strength: .85, height: 12, floor: .02,
  pools: lampPools, radius: 17};
// Walls, rails and the autumn trees keep a soft glow of their own colour all along the road, so the roadsides read in
// the dark away from the lamps too (the lamp pools above only reach the lower road).
const roadsideGlow = {colour: 0xc9d3e0, strength: .65, height: 12, floor: .5};
const railGlow = {colour: 0xc9d3e0, strength: .4, height: 12, floor: .4};
const treeGlow = {colour: 0xffb070, strength: .3, height: 14, floor: .4};

export const KOGANE_PASS = defineScriptedCourse({
  ...base,
  ambience: 'kogane',
  landmarkSound: {cue: 'landmark.shrine-bell', s: 168, reach: 40},
  // The existing reflective circuit water (src/circuit-water.js) lies over the basin: it
  // mirrors the dusk sky and the torii with a slow ripple.
  water: {glitter: false},
  basins: [LAKE],
  // Level existing ground for the summit car park and the helicopter circle.
  hills: [{s: 65, lateral: 39, along: 80, across: 32, height: 0, runs: [],
    pads: [{du: -45, dv: 6, radius: 24, blend: 10},
      {du: 45, dv: -13, radius: 18.2, blend: 2.5}]}],
  sections: names.map((name, i) => ({name, theme: 'alpine', share: (starts[i + 1] - starts[i]) / road.length})),
  lightPath: {axis: 'distance', wrap: false, palette: 'mountain-sunset', keyframes: [
    {at: 0, look: 'dusk'}, {at: 1500, look: 'dusk'}, {at: 2600, look: 'night'},
  ]},
  kitSafetyWalls: true, roadKerbs: false,
  groundLeaves: {colours: [[1.05, .34, .12], [1.1, .68, .2], [.74, .3, .13]],
    strength: .85, reach: 25, far: .08,
    wood: {green: [.32, .47, .3], colours: [[.7, .32, .13], [.8, .5, .18]], share: .42, from: 7}},
  scenery: {lampWash: sodiumWash, trees: 350, rocks: 100, mountains: false, continuousGround: true,
    onDrawnGround: true,
    forest: {from: 3.5, to: 60, spacing: 4.2, rows: 9, thin: .12, jitter: .9,
      scale: [1.2, 2.0]},
    shoreForest: {from: 205, to: 345, spacing: 4.5, rows: 16, thin: .1, jitter: .9, scale: [1.5, 2.6],
      sides: [-1], ranges: [{from: 0, to: 580, fadeOut: 60}], clear: shoreClear},
    farForest: {from: 60, to: 150, spacing: 12, rows: 5, thin: .5, jitter: .9, scale: [1.6, 2.7]},
    clear: [
      ...road.pieces.filter(piece => piece.name?.endsWith('Hairpin')).map(piece => ({
        s0: piece.s0 - 35, s1: piece.s1 + 45,
        from: piece.dir > 0 ? 0 : -22, to: piece.dir > 0 ? 22 : 0,
      })),
      {s0: 0, s1: 730, from: -180, to: -10},
      {s0: 65, s1: 150, from: 10, to: 38},
      {s0: 0, s1: 65, from: 10, to: 82},
      {s0: 3570, s1: 3930, from: 10, to: 33},
    ]},
  kitLook: {
    'autumn-tree-copper': {leafColour: 0xcf431a, wash: treeGlow},
    'autumn-tree-golden': {leafColour: 0xe7ac28, wash: treeGlow},
    'shopfront-a': {wash: {colour: 0xffc281, strength: .35, height: 6, floor: .08}},
    'shopfront-b': {wash: {colour: 0xffc281, strength: .35, height: 6, floor: .08}},
    'lantern-string': {glow: .8},
    'torii': {wash: {colour: 0xffa86c, strength: .22, height: 9, floor: .1}},
    'stone-retaining-wall': {wash: roadsideGlow},
    'stone-retaining-wall-b': {wash: roadsideGlow},
    'stone-retaining-wall-c': {wash: roadsideGlow},
    'armco-white': {wash: railGlow},
    'curve-mirror': {wash: {colour: 0xffca85, strength: .24, height: 4, floor: .08}},
    'chevron-board': {wash: {colour: 0xffca85, strength: .24, height: 3, floor: .08}},
  },
  mergeKitMeshes: ['tea-house', 'vending-row', 'shopfront-a', 'shopfront-b',
    'curve-mirror', ...STONE_VARIANTS, 'armco-white'],
  effects: {backdrop, valleyMist: [
    {s: 2490, lateral: -46, along: 100, across: 24, count: 10,
      height: 1.5, opacity: .10, colour: 0xabb9bd, fadeEnd: 1},
  ]},
  // Harbour's lamp geometry and warm road pools, on our alpine lower road.
  // C5 can tune these alongside the final distance light path.
  waterside: {lamps: [{from: 3280, to: road.length - 20, every: 40, side: -1,
    height: 8, colour: 0xffa23c, pool: .55, halo: 1.8, strength: .95}]},
  glows: [
    {piece: 'lantern-string', points: [-3.13, -1.88, -.63, .63, 1.88, 3.13].map(x => [x, 1.85, 0]),
      colour: 0xffb04c, size: .8, strength: .65},
    {piece: 'tea-house', points: [[-2.7, 1.75, 2.6], [2.7, 1.75, 2.6]],
      colour: 0xffc078, size: 2, strength: .5},
    {piece: 'vending-row', points: [[-1.24, 1.4, .46], [0, 1.4, .46], [1.24, 1.4, .46]],
      colour: 0xd1eeed, size: 1, strength: .7},
  ],
  kitPlacements: [
    ...safety, ...roadside, ...maples, ...farMaples, ...village,
    {id: 'kogane-car-park', s: 110, lateral: 26, heading: Math.PI / 2},
    {id: 'torii', s: 168, lateral: -40, heading: Math.PI / 2, clear: 10},
    {id: 'torii-small', s: 370, lateral: 20, heading: Math.PI / 2, clear: 5},
    ...[88, 101, 132, 143].map(s => ({id: 'stone-lantern', s,
      lateral: 14, heading: 0, clear: 2})),
    ...[358, 382].map(s => ({id: 'stone-lantern', s,
      lateral: 18, heading: 0, clear: 2})),
    {id: 'tea-house', s: 110, lateral: 22, heading: -Math.PI / 2, clear: 12},
    {id: 'vending-row', s: 124, lateral: 17, heading: -Math.PI / 2, clear: 5},
    {id: 'lantern-string', s: 110, lateral: 18.5, heading: -Math.PI / 2, lift: 1.2},
    {id: 'start-gantry', s: 45, lateral: 0, heading: Math.PI, scale: 1},
    // The same gantry marks the finish (C6): the race ends at the end of the road, which had no marker.
    {id: 'start-gantry', s: road.length - 2, lateral: 0, heading: Math.PI, scale: 1},
    ...road.boards.map(board => ({id: `braking-board-${board.distance}`, s: board.s,
      lateral: board.side * (road.halfWidthAt(board.s) + 2.4), heading: Math.PI, scale: 1})),
  ],
});

export const manifest = Object.freeze({
  id: 'kogane-pass', flag: 'kogane-pass', state: 'on', price: 2200,
  grandPrix: true, releaseOrder: 13,
  driver: Object.freeze({car: 'stuttgart_959s', driverId: 'club', controller: 'racing-line', skill: .95}),
});
