// C2 rough road. The packet owns the geometry; C3 owns field pace.
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

export const KOGANE_PASS = defineScriptedCourse({
  ...base,
  sections: names.map((name, i) => ({name, theme: 'alpine', share: (starts[i + 1] - starts[i]) / road.length})),
  lightPath: {axis: 'distance', wrap: false, keyframes: [
    {at: 0, look: 'dusk'}, {at: 1500, look: 'dusk'}, {at: 2600, look: 'night'},
  ]},
  scenery: {trees: 150, rocks: 60, mountains: false, continuousGround: true,
    forest: {from: 16, to: 60, spacing: 5.2, rows: 7, thin: .35, jitter: 1,
      scale: [1.1, 2.1]}},
  // Existing safety meshes only. Their appearance is replaced in C4.
  kitPlacements: [
    // Armco is .349 m deep versus concrete's .72 m. Keep its inner face
    // on the same physical wall rather than leaving an invisible contact gap.
    ...walls.map(row => row.s < 730 ? {...row, id: 'armco',
      lateral: row.lateral - Math.sign(row.lateral) * (.72 - .349) / 2} : row),
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
