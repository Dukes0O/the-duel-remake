// The Glasshouse (OPEN-LOOK-GLASSHOUSE, round 1), drawn in code: the camp of Marigold's nine growers, who raise beans under
// old car windscreens. Design: docs/story/open-scablands.md sections 16 and 21 (Scenes 1 and 2).
//
// Six bean rows under about fifty windscreens propped on stakes, a wind pump of scaffold tube with a wheel of eight tin
// blades, a store tent, a stove that burns bean stalks, a three-wheeled water cart, three sleeping shelters made of car
// bench seats and tarpaulins, a washing line, hoes and a bird-scarer of hubcaps. It is drawn at three stages: the camp whole;
// burned and fresh (frames smashed, tyre marks down the rows, the tent ash on its poles with a broken car lamp in it, the
// cart gone, tracks, ruts, footprints and bean pods leaving to the south-east); and burned two nights later (the tracks,
// ruts and pods gone).
//
// Everything is in metres from the site's centre: x to the east, z to the south, y up from the ground. The layout is a
// fixed list worked out once from a fixed seeded sequence, so it is the same on every run and its solids can be listed
// before anything is drawn. Nothing here changes race state, reads a save or reads the clock of the wall.
//
// What this file gives the cards that place the site and use it:
//   GLASSHOUSE_LAYOUT                       the radius, every named spot, where each thing stands, the lines the buggies took
//   glasshouseSolids(stage)                 the boxes and circles a car or a walker cannot pass
//   buildGlasshouse({stage, fresh, heightAt})  a THREE.Group; `heightAt(x, z)` is the ground under a point of the site, in the
//                                           group's own metres (so a group stood at the site's centre with y = 0 is given
//                                           the land's own height at centre + (x, z))
//   updateGlasshouse(group, seconds, {sun}) the parts that move: the wheel, the pump rod, the smoke, the glint, the wear.
//                                           `sun` is the direction towards the sun in the world. Call it every frame, and
//                                           at least once after the group has been placed.
//   glasshouseGlint(sun, eye, seconds)      how brightly each glinting screen flashes for a viewer, without graphics
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createScrapWear} from '../../scrap-look.js';
import {createSmokeColumn} from '../../smoke-column.js';

export const GLASSHOUSE_STAGES = Object.freeze(['camp', 'burned']);
export const GLASSHOUSE_BUDGET = Object.freeze({draws: 12, triangles: 60000});

const RADIUS = 28;
// The wind blows towards the east-south-east, as Tin Town's chimney smoke does. The pump's wheel faces into it.
const WIND = Object.freeze({x: .94, z: .34});
// The raiders left to the south-east.
const AWAY = Object.freeze({x: Math.SQRT1_2, z: Math.SQRT1_2});
// A point `metres` out along the line the buggies took, `side` metres to its north-east.
const out = (metres, side = 0) => ({x: AWAY.x * metres + AWAY.z * side, z: AWAY.z * metres - AWAY.x * side});

// The bean rows run east and west; the glass over them faces south.
const ROWS = Object.freeze({x0: -13, x1: -1, z: Object.freeze([-5.5, -3.3, -1.1, 1.1, 3.3, 5.5])});
// The frame over a row: a low rail on the south side, a higher rail behind it, and the screen lying across the two.
const FRAME = Object.freeze({lowZ: .3, lowY: .3, highZ: -.12, highY: .56, tilt: 32 * Math.PI / 180});
// Four makes of windscreen, in metres: width along the bottom edge, height up the glass, how much narrower the top is,
// how far the middle bows out, the radius of a corner. The truck's is the old split kind: two flat panes in an iron frame.
const MAKES = Object.freeze({
  saloon: Object.freeze({wide: 1.32, high: .62, top: .86, bow: .075, corner: .09}),
  estate: Object.freeze({wide: 1.48, high: .76, top: .88, bow: .11, corner: .11}),
  van: Object.freeze({wide: 1.62, high: .7, top: .95, bow: .045, corner: .06}),
  truck: Object.freeze({wide: .66, high: .5, top: .97, bow: 0, corner: .035, split: true}),
});
const makeWidth = make => MAKES[make].split ? MAKES[make].wide * 2 + .07 : MAKES[make].wide;

const THINGS = Object.freeze({
  pump: {x: 4.5, z: -9.5, hub: 5, wheelRadius: 1.15},
  trough: {x: 6.55, z: -9.5},
  cart: {x: 9.2, z: -6.2, heading: .68},
  tent: {x: 11.5, z: 1, halfX: 2, halfZ: 1.5, heading: 0},
  stove: {x: 1.5, z: 10.5, pipeTop: 2.08},
  shelters: [{x: 15.5, z: -8, heading: -.7}, {x: 19, z: -2, heading: -1.25}, {x: 18.5, z: 5.5, heading: -1.87}],
  washing: [{x: 13.4, z: -3.6}, {x: 16.8, z: 2.2}],
  scarer: {x: -7.2, z: -7.7},
  lamp: {x: 10.2, z: 2.05},
});

const mulberry = seed => () => {
  seed = seed + 0x6d2b79f5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const mm = value => Math.round(value * 1000) / 1000;
const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = (from, to, value) => { const t = clamp01((value - from) / (to - from)); return t * t * (3 - 2 * t); };

// A smooth line through points ({x, z}), cut into even steps of `step` metres at most, so that a mark laid along it can
// follow the ground.
function lineThrough(points, step = .8) {
  const at = index => points[Math.max(0, Math.min(points.length - 1, index))], fine = [];
  const blend = (a, b, c, d, t) => .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = at(index - 1), p1 = at(index), p2 = at(index + 1), p3 = at(index + 2);
    const pieces = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / .1));
    for (let piece = 0; piece < pieces; piece++) { const t = piece / pieces; fine.push({x: blend(p0.x, p1.x, p2.x, p3.x, t), z: blend(p0.z, p1.z, p2.z, p3.z, t)}); }
  }
  fine.push({x: points.at(-1).x, z: points.at(-1).z});
  // Walk the fine line and keep a point every `step` metres of it.
  const line = [fine[0]];
  let since = 0;
  for (let index = 1; index < fine.length; index++) {
    since += Math.hypot(fine[index].x - fine[index - 1].x, fine[index].z - fine[index - 1].z);
    if (since >= step || index === fine.length - 1) { line.push(fine[index]); since = 0; }
  }
  return line.map(point => ({x: mm(point.x), z: mm(point.z)}));
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(deepFreeze); }
  return value;
}

// The whole layout, worked out from one fixed sequence. `GLASSHOUSE_LAYOUT` below is this, made once.
export function glasshouseLayout() {
  const random = mulberry(0x61a55e), spread = amount => (random() - .5) * 2 * amount;
  let screenCount = 0;
  const rows = ROWS.z.map((z, row) => {
    const screens = [];
    let x = ROWS.x0 + .08 + random() * .1;
    for (;;) {
      const pick = random(), make = pick < .34 ? 'saloon' : pick < .62 ? 'estate' : pick < .86 ? 'van' : 'truck', wide = makeWidth(make);
      if (x + wide > ROWS.x1 + .2) break;
      const cracked = random() < .3, slipped = random() < .09;
      screens.push({
        make, x: mm(x + wide / 2), tilt: mm(FRAME.tilt + spread(.05)), skew: mm(spread(.07)), roll: mm(slipped ? (random() < .5 ? -1 : 1) * (.1 + random() * .08) : spread(.03)),
        dust: mm(.2 + random() * .55), crack: cracked ? {u: mm(spread(.6)), v: mm(.25 + random() * .5), seed: Math.floor(random() * 1e6)} : null,
        taped: cracked && random() < .6,
        // What became of it when the buggies drove down the row: most lie crazed where they fell, some hang from a bent
        // stake, and of some only splinters are left.
        fate: (fate => fate < .68 ? 'crazed' : fate < .84 ? 'hanging' : 'gone')(random()),
        thrown: {x: mm(.3 + random() * 1.4), z: mm(spread(.45)), turn: mm(spread(.9)), seed: Math.floor(random() * 1e6)},
      });
      x += wide + .03 + random() * .09;
    }
    // Stakes, in two lines. Each is timber, an offcut of scaffold tube or a length of reinforcing bar, and leans its own way.
    const stakes = [];
    for (const line of ['low', 'high']) {
      for (let at = ROWS.x0 - .05 + random() * .2; at < ROWS.x1 + .25; at += 1.3 + random() * .45) {
        const kind = random();
        stakes.push({line, x: mm(at), kind: kind < .5 ? 'timber' : kind < .82 ? 'tube' : 'bar', proud: mm(.03 + random() * .12),
          leanX: mm(spread(.09)), leanZ: mm(spread(.09)), rail: (rail => rail < .42 ? 'tube' : rail < .86 ? 'batten' : 'none')(random())});
      }
    }
    screenCount += screens.length;
    // A screen stood nearly upright against the west end of some rows, to keep the wind off the first plants.
    const windbreak = [0, 2, 3, 5].includes(row) ? {make: ['estate', 'van', 'saloon', 'estate'][[0, 2, 3, 5].indexOf(row)], tilt: mm((70 + random() * 6) * Math.PI / 180),
      turn: mm(spread(.14)), dust: mm(.15 + random() * .2)} : null;
    if (windbreak) screenCount++;
    return {z, x0: ROWS.x0, x1: ROWS.x1, screens, stakes, windbreak};
  });
  // Two spare screens lean in the mouth of the store tent, waiting to be carried to a row.
  const spares = [{make: 'estate', x: 1.28, z: 1.66, turn: .06, tilt: 1.31}, {make: 'saloon', x: 1.2, z: 1.78, turn: .13, tilt: 1.34}];
  screenCount += spares.length;

  // Where each buggy went: down its row from the west, out of the east end, round to the south-east and away.
  const offsets = [1.6, .8, .1, -.7, -1.5, -2.4];
  const tracks = ROWS.z.map((z, row) => lineThrough([
    {x: ROWS.x0 - 6, z: z + spread(.5)}, {x: ROWS.x0 - 1, z}, {x: ROWS.x1, z}, {x: ROWS.x1 + 1.4, z},
    {x: 3.1, z: z * .6 + 2.5}, out(11, offsets[row]), out(20, offsets[row]), out(35, offsets[row] * 1.15), out(50, offsets[row] * 1.25), out(66, offsets[row] * 1.3),
  ]));
  // The water cart was dragged from where it stood by the trough, past the tent and off beside the buggies.
  const ruts = lineThrough([
    {x: THINGS.cart.x, z: THINGS.cart.z}, {x: 7.7, z: -2.4}, {x: 7.1, z: 2.3}, out(11.2, 3.3), out(20, 3.3), out(35, 3.4), out(50, 3.2), out(66, 3.3),
  ]);
  // A green bean pod on the track, and another twenty steps on, and another.
  const pods = [out(25, 3.22), out(40, 3.46), out(55, 3.12)].map(point => ({x: mm(point.x), z: mm(point.z), turn: mm(spread(3))}));
  // The screens that can catch the sun: the upright ones. Each has its middle and the way its outer face looks.
  const glints = [];
  rows.forEach((row, index) => {
    if (!row.windbreak) return;
    const lean = Math.PI / 2 - row.windbreak.tilt, turn = -Math.PI / 2 + row.windbreak.turn;
    glints.push({id: `row-${index + 1}-end`, x: mm(ROWS.x0 - .2), y: .36, z: mm(row.z + .05),
      normal: {x: mm(Math.sin(turn) * Math.cos(lean)), y: mm(Math.sin(lean)), z: mm(Math.cos(turn) * Math.cos(lean))}, period: mm(5.3 + index * .9), phase: mm(random())});
  });
  spares.forEach((spare, index) => {
    const lean = Math.PI / 2 - spare.tilt;
    glints.push({id: `spare-${index + 1}`, x: mm(THINGS.tent.x + spare.x), y: .42, z: mm(THINGS.tent.z + spare.z),
      normal: {x: mm(Math.sin(spare.turn) * Math.cos(lean)), y: mm(Math.sin(lean)), z: mm(Math.cos(spare.turn) * Math.cos(lean))}, period: mm(6.1 + index * 1.7), phase: mm(random())});
  });

  const spots = {
    'car-stop': {x: -9, z: 19},
    // The six things to find when the camp is burned (section 21, Scene 2): where a person stands at each.
    frames: {x: .5, z: 1.1}, lamp: {x: 10, z: 3.6}, tracks: out(19.5, -.4), ruts: out(14, 2.3), pods: out(24.2, 2.3), pump: {x: 4.5, z: -7.8},
    stove: {x: .2, z: 10}, tent: {x: 12.7, z: 3.8}, cart: {x: 7.6, z: -7.2},
    // Marigold stands at the edge of the rows, between them and the place where a car stops.
    marigold: {x: -6.4, z: 8.1},
    // Three places in the paths between the rows where a grower hoes.
    'hoe-1': {x: -10.5, z: -2.2}, 'hoe-2': {x: -5.5, z: 2.2}, 'hoe-3': {x: -3, z: -4.4},
    'tracks-away': out(60),
  };
  for (const spot of Object.values(spots)) { spot.x = mm(spot.x); spot.z = mm(spot.z); }
  return deepFreeze({
    radius: RADIUS, across: 45, wind: {...WIND}, away: {...AWAY}, spots,
    // Where each thing itself stands (a spot is where a person stands at it).
    things: JSON.parse(JSON.stringify(THINGS)),
    rows, spares, screens: screenCount, makes: Object.keys(MAKES), tracks, ruts, pods, glints,
  });
}
export const GLASSHOUSE_LAYOUT = glasshouseLayout();

// What a car or a walker cannot pass, for a stage ('camp' or 'burned'). Each is {id, kind, shape ('box' or 'ellipse'), x, z,
// halfX, halfZ, heading, height}: metres from the site's centre, `heading` a turn about the upright (a box's own x runs along
// (cos h, -sin h)), `height` above the ground under it. The smashed frames and the ash of the tent are not solid.
export function glasshouseSolids(stage = 'camp') {
  if (!GLASSHOUSE_STAGES.includes(stage)) throw new RangeError(`The Glasshouse has no stage called ${JSON.stringify(stage)}.`);
  const {things, rows} = GLASSHOUSE_LAYOUT, solids = [];
  const box = (id, kind, x, z, halfX, halfZ, height, heading = 0) => solids.push({id: `glasshouse-${id}`, kind, shape: 'box', x, z, halfX, halfZ, heading, height});
  const post = (id, x, z, radius, height) => solids.push({id: `glasshouse-${id}`, kind: 'post', shape: 'ellipse', x, z, halfX: radius, halfZ: radius, heading: 0, height});
  if (stage === 'camp') rows.forEach((row, index) => box(`row-${index + 1}`, 'prop', (row.x0 + row.x1) / 2 - .15, row.z + .08, (row.x1 - row.x0) / 2 + .4, .6, .9));
  box('pump', 'building', things.pump.x, things.pump.z, 1.05, 1.05, 6.2);
  box('trough', 'prop', things.trough.x, things.trough.z, .78, .42, .6);
  post('stove', things.stove.x, things.stove.z, .5, 2.1);
  if (stage === 'camp') {
    box('tent', 'building', things.tent.x, things.tent.z, things.tent.halfX + .2, things.tent.halfZ + .2, 2.4, things.tent.heading);
    box('cart', 'prop', things.cart.x, things.cart.z, .72, 1.3, 1.3, things.cart.heading);
  } else {
    // Only the tent's two tall poles still stand.
    post('tent-pole-west', things.tent.x - things.tent.halfX, things.tent.z, .12, 2.2);
    post('tent-pole-east', things.tent.x + things.tent.halfX, things.tent.z, .12, 1.3);
  }
  things.shelters.forEach((shelter, index) => box(`shelter-${index + 1}`, 'building', shelter.x, shelter.z, 1.6, 1.35, 1.6, shelter.heading));
  things.washing.forEach((at, index) => post(`washing-post-${index + 1}`, at.x, at.z, .1, 1.9));
  post('bird-scarer', things.scarer.x, things.scarer.z, .15, 3.3);
  return solids.map(solid => Object.freeze(solid));
}

// ---- The glint ---------------------------------------------------------------------------------------------------------
// From far off, in daylight, glass sometimes catches the sun. Only the screens that stand nearly upright can throw the sun
// along the ground: the ones against the west ends of four rows, and the two spares in the mouth of the tent. A bowed
// screen spreads the sun into an upright fan, so what matters is the bearing: a screen flashes for a viewer who stands, on
// the map, within about 20 degrees of where a flat mirror would send the light, while the sun is up and on the glass's own
// side. Each screen shivers in the wind on its own beat, so the flash lasts about half a second and comes again some seconds
// later. The drawing's shader does the same sums as this function.
export const GLASSHOUSE_GLINT = Object.freeze({aimFrom: Math.cos(40 * Math.PI / 180), aimTo: Math.cos(18 * Math.PI / 180), rise: .1, hold: .15, gone: .55, sunFrom: .03, sunTo: .2});
// `sun`: the direction towards the sun ({x, y, z}); `eye`: the viewer, in the site's metres, y above its ground; `seconds`:
// the game's clock. Returns [{id, strength}], each strength 0 to 1. For a site that has not been turned.
export function glasshouseGlint(sun, eye, seconds, glints = GLASSHOUSE_LAYOUT.glints) {
  const length = Math.hypot(sun.x, sun.y, sun.z) || 1, s = {x: sun.x / length, y: sun.y / length, z: sun.z / length};
  const day = smooth(GLASSHOUSE_GLINT.sunFrom, GLASSHOUSE_GLINT.sunTo, s.y);
  return glints.map(glint => {
    const n = glint.normal, ex = eye.x - glint.x, ey = eye.y - glint.y, ez = eye.z - glint.z, far = Math.hypot(ex, ey, ez) || 1;
    const lit = n.x * s.x + n.y * s.y + n.z * s.z, seen = (n.x * ex + n.y * ey + n.z * ez) / far;
    const mx = 2 * lit * n.x - s.x, mz = 2 * lit * n.z - s.z, flat = Math.hypot(mx, mz), level = Math.hypot(ex, ez) || 1;
    const aim = flat > 1e-6 ? (mx * ex + mz * ez) / (flat * level) : 0;
    const lobe = smooth(GLASSHOUSE_GLINT.aimFrom, GLASSHOUSE_GLINT.aimTo, aim) * smooth(.15, .4, flat) * (lit > .05 ? 1 : 0) * (seen > .05 ? 1 : 0);
    const beat = (((seconds / glint.period + glint.phase) % 1) + 1) % 1 * glint.period;
    const flash = smooth(0, GLASSHOUSE_GLINT.rise, beat) * (1 - smooth(GLASSHOUSE_GLINT.hold, GLASSHOUSE_GLINT.gone, beat));
    return {id: glint.id, strength: day * lobe * flash};
  });
}

// ---- Drawing -----------------------------------------------------------------------------------------------------------
// The wheel turns at an easy pace in a light wind, and the pump rod rises and falls once for every three turns.
export const GLASSHOUSE_PUMP = Object.freeze({turnsPerSecond: .52, stroke: .07, rodTurns: 3});

// Colours are made when the camp is first drawn, not when this file is loaded: the rules load this file for the layout and
// the solids, and a colour made at load would carry Three.js into every bundle of the rules.
const tone = (r, g, b, k = .84) => new THREE.Color().setRGB(r * k, g * k, b * k);
let PALETTE = null;
const makePalette = () => {
  const tin = tone(.3, .29, .27), rust = tone(.3, .12, .05);
  // Paint that has stood in the sun for thirty years: mostly gone to bare tin and rust.
  const faded = (r, g, b, bare = .5) => tone(r, g, b).lerp(tin, bare).lerp(rust, .12);
  return {
    tube: tone(.2, .19, .175), iron: tone(.075, .078, .07, 1), rust, timber: tone(.2, .165, .115), paleTimber: tone(.27, .225, .155),
    char: tone(.022, .02, .018, 1), rubber: tone(.03, .03, .032, 1), rope: tone(.26, .22, .14), stone: tone(.25, .225, .19),
    // Bonnets the blades were cut from, long faded.
    bonnet: [faded(.33, .1, .07), faded(.2, .27, .32), faded(.42, .39, .29), faded(.26, .26, .25, .2), faded(.15, .23, .17), faded(.38, .29, .12), faded(.42, .42, .39), rust.clone().multiplyScalar(.8)],
    canvas: tone(.14, .135, .085), canvasPale: tone(.19, .175, .115), tarpBlue: tone(.11, .14, .165), tarpGrey: tone(.17, .17, .16), sack: tone(.25, .2, .12), sackDark: tone(.19, .155, .1),
    vinyl: [tone(.16, .05, .04), tone(.26, .19, .115), tone(.12, .155, .13)], wool: tone(.15, .15, .16), straw: tone(.3, .26, .14),
    cloth: [tone(.27, .235, .175), tone(.24, .1, .075), tone(.12, .15, .18), tone(.25, .24, .215), tone(.18, .2, .13), tone(.3, .26, .165)],
    drum: tone(.15, .2, .225), chrome: tone(.36, .36, .345), tin,
    leaf: [tone(.03, .085, .022), tone(.042, .105, .027), tone(.055, .11, .03), tone(.035, .095, .035)], leafOld: tone(.13, .125, .04), leafDead: tone(.085, .065, .03), pod: tone(.1, .24, .05),
    soil: tone(.058, .041, .027), soilDry: tone(.105, .08, .055), ash: tone(.135, .13, .125), ashDark: tone(.02, .019, .018),
  };
};
// Glass and ground marks carry how solid they are with their colour: red, green, blue and alpha.
const GLASS = Object.freeze({
  clear: [.3, .4, .37, .12], dust: [.4, .36, .28, .5], edge: [.014, .014, .013, .9], crack: [.7, .75, .73, .5], tape: [.47, .47, .43, 1],
  crazed: [.3, .36, .34, .6], water: [.03, .05, .05, .82],
});
const MARK = Object.freeze({trodden: [.05, .04, .03], tyre: [.04, .033, .027], rut: [.022, .018, .014], print: [.03, .025, .02], scorch: [.012, .011, .01], damp: [.035, .03, .026]});

const span = count => Array.from({length: count + 1}, (_, index) => index / count);

// Collects pieces by kind, each with its own colour in its vertices, and merges each kind into one mesh.
// Kinds with `alpha` carry four numbers for each vertex's colour.
function createKit(heightAt, kinds) {
  const lists = Object.fromEntries(Object.keys(kinds).map(kind => [kind, []]));
  const base = new THREE.Matrix4(), local = new THREE.Matrix4(), saved = [], quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1), spot = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), way = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let triangles = 0;
  const ground = (x, z) => heightAt(x, z);
  // Keeps a finished geometry. `colour` is a THREE.Color, or four numbers for a kind with alpha; a geometry that already
  // has colours keeps them.
  function keep(kind, geometry, colour) {
    const size = kinds[kind].alpha ? 4 : 3;
    if (geometry.hasAttribute('uv')) geometry.deleteAttribute('uv');
    if (!geometry.index) geometry.setIndex(Array.from({length: geometry.attributes.position.count}, (_, index) => index));
    if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals();
    if (!geometry.hasAttribute('color')) {
      const count = geometry.attributes.position.count, colours = new Float32Array(count * size);
      const values = colour.isColor ? [colour.r, colour.g, colour.b, 1] : colour;
      for (let index = 0; index < count; index++) for (let part = 0; part < size; part++) colours[index * size + part] = values[part] ?? 1;
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, size));
    } else if (geometry.attributes.color.itemSize !== size) throw Error(`A piece of the Glasshouse has the wrong kind of colour for "${kind}".`);
    geometry.applyMatrix4(base);
    triangles += geometry.index.count / 3;
    lists[kind].push(geometry);
  }
  // Moves a geometry to a place with a turn ([about x, about y, about z], applied y first, then x, then z).
  function place(geometry, x, y, z, turn) {
    if (turn) quaternion.setFromEuler(euler.set(turn[0], turn[1], turn[2], 'YXZ')); else quaternion.identity();
    geometry.applyMatrix4(local.compose(spot.set(x, y, z), quaternion, one));
    return geometry;
  }
  // Everything drawn inside `draw` is drawn in a frame of its own: at (x, y, z), turned.
  function within(x, y, z, turn, draw) {
    saved.push(base.clone());
    if (turn) quaternion.setFromEuler(euler.set(turn[0], turn[1], turn[2], 'YXZ')); else quaternion.identity();
    base.multiply(local.compose(spot.set(x, y, z), quaternion, one));
    try { draw(); } finally { base.copy(saved.pop()); }
  }
  // A frame standing on the ground at a point of the site, turned about the upright.
  const stand = (x, z, heading, draw) => within(x, ground(x, z), z, [0, heading, 0], draw);
  const box = (kind, w, h, d, colour, x, y, z, turn) => keep(kind, place(new THREE.BoxGeometry(w, h, d), x, y, z, turn), colour);
  // A round bar from one point to another; `endRadius` tapers it.
  function tube(kind, a, b, radius, colour, sides = 6, endRadius = radius) {
    from.set(a[0], a[1], a[2]); to.set(b[0], b[1], b[2]); way.subVectors(to, from);
    const length = way.length();
    if (length < 1e-4) return;
    const geometry = new THREE.CylinderGeometry(endRadius, radius, length, sides, 1);
    geometry.applyMatrix4(local.compose(spot.addVectors(from, to).multiplyScalar(.5), quaternion.setFromUnitVectors(up, way.divideScalar(length)), one));
    keep(kind, geometry, colour);
  }
  // A flat bar (a batten, a plank) from one point to another.
  function batten(kind, a, b, wide, thick, colour) {
    from.set(a[0], a[1], a[2]); to.set(b[0], b[1], b[2]); way.subVectors(to, from);
    const length = way.length();
    if (length < 1e-4) return;
    const geometry = new THREE.BoxGeometry(wide, length, thick);
    geometry.applyMatrix4(local.compose(spot.addVectors(from, to).multiplyScalar(.5), quaternion.setFromUnitVectors(up, way.divideScalar(length)), one));
    keep(kind, geometry, colour);
  }
  // A rope, a wire or a bent pipe through points.
  function rope(kind, points, radius, colour, sides = 4, pieces = points.length * 3) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(point[0], point[1], point[2])));
    keep(kind, new THREE.TubeGeometry(curve, pieces, radius, sides, false), colour);
  }
  // A sheet through a grid of points: `point(u, v)` gives [x, y, z]; `colour(u, v)`, if given, each vertex's own colour.
  function sheet(kind, us, vs, point, colour) {
    const positions = [], colours = [], indices = [], size = kinds[kind].alpha ? 4 : 3, columns = us.length;
    for (const v of vs) for (const u of us) {
      const at = point(u, v);
      positions.push(at[0], at[1], at[2]);
      if (colour) { const c = colour(u, v); for (let part = 0; part < size; part++) colours.push(c[part] ?? 1); }
    }
    for (let j = 0; j < vs.length - 1; j++) for (let i = 0; i < columns - 1; i++) {
      const a = j * columns + i;
      indices.push(a, a + 1, a + columns, a + 1, a + columns + 1, a + columns);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (colour) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, size));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
  // Loose triangles and quads gathered into one geometry (leaves, splinters of glass, footprints).
  function loose(kind) {
    const positions = [], colours = [], indices = [], size = kinds[kind].alpha ? 4 : 3;
    const vertex = (point, colour) => { positions.push(point[0], point[1], point[2]); for (let part = 0; part < size; part++) colours.push(colour[part] ?? 1); return positions.length / 3 - 1; };
    return {
      // Each corner may have a colour of its own; one colour serves them all.
      triangle(a, b, c, colourA, colourB = colourA, colourC = colourA) { indices.push(vertex(a, colourA), vertex(b, colourB), vertex(c, colourC)); },
      quad(a, b, c, d, colourA, colourB = colourA, colourC = colourA, colourD = colourA) {
        const i = vertex(a, colourA), j = vertex(b, colourB), k = vertex(c, colourC), l = vertex(d, colourD);
        indices.push(i, j, k, i, k, l);
      },
      keep() {
        if (!indices.length) return;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, size));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        keep(kind, geometry);
      },
    };
  }
  return {lists, ground, keep, place, within, stand, box, tube, batten, rope, sheet, loose, get triangles() { return triangles; }};
}

const paint = (colour, by) => colour.clone().multiplyScalar(by);
const mixed = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t);
const rgb = colour => [colour.r, colour.g, colour.b];

// A point of a windscreen in its own metres: x along its width, y up the glass from its bottom edge, z out of its face.
// u runs -1 to 1 across it and v 0 to 1 up it.
function paneAt(make, u, v) {
  const fromEdge = Math.min(v, 1 - v) * make.high, r = make.corner;
  const inset = fromEdge < r ? r - Math.sqrt(Math.max(0, r * r - (r - fromEdge) * (r - fromEdge))) : 0;
  const x = u * (make.wide / 2 * (1 - (1 - make.top) * v) - inset), bend = x / (make.wide / 2);
  return [x, v * make.high, make.bow * (1 - bend * bend) + make.bow * .9 * v * (1 - v)];
}
const PANE_U = Object.freeze([-1, -.93, -.68, -.4, -.14, .14, .4, .68, .93, 1]), PANE_V = Object.freeze([0, .09, .36, .64, .91, 1]);

// One pane of glass with its dark edge band, its dust (thicker low down) and, if it has them, its crack and its tape.
// Drawn in the pane's own metres; the caller's frame lays it on the rails. `state` is 'whole' or 'crazed' (smashed, the
// glass held together by its middle layer, pale and sagging).
function drawPane(kit, make, {dust = .4, crack = null, taped = false, state = 'whole', seed = 1}) {
  const random = mulberry(seed * 7 + 13), streak = PANE_U.map(() => random());
  const body = state === 'whole' ? null : GLASS.crazed;
  const wave = PANE_U.map(() => PANE_V.map(() => random()));
  const point = (u, v) => {
    const at = paneAt(make, u, v);
    if (state !== 'whole') at[2] = at[2] * .3 + (wave[PANE_U.indexOf(u)][PANE_V.indexOf(v)] - .5) * .09;
    return at;
  };
  kit.keep('glass', kit.sheet('glass', PANE_U, PANE_V, point, (u, v) => {
    if (Math.abs(u) > .95 || v < .02 || v > .98) return state === 'whole' ? GLASS.edge : mixed(GLASS.edge, body, .5);
    if (body) { const shade = .75 + wave[PANE_U.indexOf(u)][PANE_V.indexOf(v)] * .4; return [body[0] * shade, body[1] * shade, body[2] * shade, body[3]]; }
    return mixed(GLASS.clear, GLASS.dust, clamp01(dust * .55 + (1 - v) * .4 + (streak[PANE_U.indexOf(u)] - .5) * .3));
  }));
  if (state !== 'whole') return;
  // A line drawn on the glass through (u, v) points: a crack or a strip of tape.
  const line = (points, wide, lift, colour) => {
    const strip = kit.loose('glass');
    for (let index = 0; index < points.length - 1; index++) {
      const a = paneAt(make, points[index][0], points[index][1]), b = paneAt(make, points[index + 1][0], points[index + 1][1]);
      const dx = b[0] - a[0], dy = b[1] - a[1], far = Math.hypot(dx, dy) || 1, sx = -dy / far * wide / 2, sy = dx / far * wide / 2;
      strip.quad([a[0] - sx, a[1] - sy, a[2] + lift], [a[0] + sx, a[1] + sy, a[2] + lift], [b[0] + sx, b[1] + sy, b[2] + lift], [b[0] - sx, b[1] - sy, b[2] + lift], colour);
    }
    strip.keep();
  };
  if (crack) {
    const lines = mulberry(crack.seed), arms = 3 + Math.floor(lines() * 3), start = lines() * Math.PI * 2;
    const arm = [];
    for (let index = 0; index < arms; index++) {
      const angle = start + index / arms * Math.PI * 2 + (lines() - .5) * .7, points = [[crack.u, crack.v]];
      for (let step = 1; step <= 3; step++) {
        const reach = step / 3 * (.5 + lines() * .9), bend = angle + (lines() - .5) * .5;
        points.push([Math.max(-.92, Math.min(.92, crack.u + Math.cos(bend) * reach)), Math.max(.03, Math.min(.97, crack.v + Math.sin(bend) * reach * .8))]);
      }
      line(points, .005, .004, GLASS.crack);
      arm.push(points);
    }
    if (taped) {
      // Strips of grey tape laid across the worst of the cracks, each a hand long.
      for (const points of arm.slice(0, 2 + Math.floor(lines() * 2))) {
        const [u0, v0] = points[0], [u1, v1] = points[1], mx = (u1 - u0) * make.wide / 2, my = (v1 - v0) * make.high, far = Math.hypot(mx, my) || 1, reach = .09 + lines() * .05;
        const px = -my / far * reach / (make.wide / 2), py = mx / far * reach / make.high, inside = (u, v) => [Math.max(-.94, Math.min(.94, u)), Math.max(.03, Math.min(.97, v))];
        line([inside(u1 - px, v1 - py), inside(u1 + px, v1 + py)], .048, .007, GLASS.tape);
      }
    }
  }
}

// A whole windscreen in the frame the caller has set: one bowed pane, or the truck's two flat panes in their iron frame.
function drawScreen(kit, makeName, look) {
  const make = MAKES[makeName];
  if (!make.split) { drawPane(kit, make, look); return; }
  const gap = .07, middle = (make.wide + gap) / 2, edge = make.wide + gap / 2 + .014;
  for (const side of [-1, 1]) kit.within(side * middle, .02, 0, null, () => drawPane(kit, make, {...look, seed: (look.seed ?? 1) + side, crack: side < 0 ? look.crack : null, taped: side < 0 && look.taped}));
  const iron = look.state && look.state !== 'whole' ? PALETTE.char : PALETTE.iron, high = make.high + .04;
  for (const x of [-edge, 0, edge]) kit.box('hard', .028, high, .03, iron, x, high / 2, -.012);
  for (const y of [.006, high]) kit.box('hard', edge * 2 + .028, .028, .03, iron, 0, y, -.012);
}

// Splinters of glass scattered on the ground about a point.
function drawSplinters(kit, glass, random, x, z, reach, count) {
  for (let index = 0; index < count; index++) {
    const angle = random() * Math.PI * 2, far = Math.sqrt(random()) * reach, px = x + Math.cos(angle) * far, pz = z + Math.sin(angle) * far, y = kit.ground(px, pz) + .1 + random() * .03;
    const size = .03 + random() * .09, turn = random() * Math.PI * 2, corner = k => [px + Math.cos(turn + k * 2.2) * size * (.5 + random() * .5), y + random() * .015, pz + Math.sin(turn + k * 2.2) * size * (.5 + random() * .5)];
    glass.triangle(corner(0), corner(1), corner(2), random() < .5 ? GLASS.crazed : mixed(GLASS.clear, GLASS.dust, .5));
  }
}

// A seat cushion off a car's bench seat: padded, with ribs running front to back.
function cushion(wide, thick, deep) {
  const geometry = new THREE.BoxGeometry(wide, thick, deep, Math.max(4, Math.round(wide / .085)), 1, 2), at = geometry.attributes.position;
  for (let index = 0; index < at.count; index++) {
    const x = at.getX(index), y = at.getY(index), z = at.getZ(index);
    if (y <= 0) continue;
    const rib = Math.abs(Math.sin(x / .17 * Math.PI)), edge = Math.max(Math.abs(x) / (wide / 2), Math.abs(z) / (deep / 2)) > .98 ? 1 : 0;
    at.setY(index, y + rib * .028 - edge * .035);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// A crate made of slats, standing on its base: its middle at (0, high / 2, 0).
function drawCrate(kit, wide, high, deep, colour) {
  for (const x of [-1, 1]) for (const z of [-1, 1]) kit.box('hard', .035, high, .035, colour, x * (wide / 2 - .018), high / 2, z * (deep / 2 - .018));
  for (let slat = 0; slat < 3; slat++) {
    const y = high * (.16 + slat * .34);
    for (const z of [-1, 1]) kit.box('hard', wide, high * .2, .012, paint(colour, .86 + slat * .07), 0, y, z * deep / 2, [0, 0, (slat - 1) * .012]);
    for (const x of [-1, 1]) kit.box('hard', .012, high * .2, deep, paint(colour, .92 - slat * .05), x * wide / 2, y, 0);
  }
  kit.box('hard', wide, .012, deep, paint(colour, .7), 0, .02, 0);
}

// A low rounded heap with a ragged edge, paler or darker at its top than at its foot: a bean bush, a heap of ash. Smoothly
// shaded, so that it has no flat faces. `colourAt(height share)` gives [r, g, b].
function drawMound(kit, random, x, y, z, radius, high, colourAt, around = 6, rings = 2, dome = false) {
  const lump = Array.from({length: rings + 1}, () => Array.from({length: around}, () => .65 + random() * .7)), turn = random() * 6, tip = [(random() - .5) * radius * .5, (random() - .5) * radius * .5];
  const geometry = kit.sheet('plain', span(around), span(rings), (u, v) => {
    // A bell is level at its top and runs out level at its foot. A dome is round on top and tucks under at its foot.
    const ring = Math.round(v * rings), swell = lump[ring][Math.round(u * around) % around], angle = u * Math.PI * 2;
    const top = dome ? 1 - v ** 2.4 : Math.cos(v * Math.PI / 2) ** 2, out = (dome ? Math.sin(v * Math.PI * .56) / Math.sin(Math.PI * .56) : v) * radius * (.35 + .65 * swell);
    return [Math.cos(angle) * out + tip[0] * top, top * high * (dome && ring ? .8 + swell * .25 : 1) - (v > .99 ? .015 : 0), Math.sin(angle) * out + tip[1] * top];
  }, (u, v) => colourAt(dome ? 1 - v : Math.cos(v * Math.PI / 2) ** 2, lump[Math.round(v * rings)][Math.round(u * around) % around]));
  // The top is one point written once for each spoke, and the first spoke is written again as the last: give each of
  // those the same shading, or the heap shows a star and a seam.
  const normals = geometry.attributes.normal, columns = around + 1;
  for (let column = 0; column < columns; column++) normals.setXYZ(column, 0, 1, 0);
  for (let ring = 1; ring <= rings; ring++) {
    const first = ring * columns, last = first + around, nx = normals.getX(first) + normals.getX(last), ny = normals.getY(first) + normals.getY(last), nz = normals.getZ(first) + normals.getZ(last), far = Math.hypot(nx, ny, nz) || 1;
    normals.setXYZ(first, nx / far, ny / far, nz / far); normals.setXYZ(last, nx / far, ny / far, nz / far);
  }
  kit.keep('plain', kit.place(geometry, x, y, z, [0, turn, 0]));
}

// A low rock.
function drawRock(kit, random, x, y, z, size) {
  const geometry = new THREE.IcosahedronGeometry(size, 0);
  geometry.scale(1, .55 + random() * .25, .7 + random() * .3);
  kit.keep('hard', kit.place(geometry, x, y, z, [random(), random() * 6, random()]), paint(PALETTE.stone, .8 + random() * .4));
}

// ---- The rows ----
function drawRows(kit, stage) {
  const random = mulberry(0x3be4a5), camp = stage === 'camp';
  const leaves = kit.loose('plain'), splinters = kit.loose('glass');
  GLASSHOUSE_LAYOUT.rows.forEach((row, rowIndex) => {
    // The bed: carted earth heaped a hand high, darker than the ground. Where the wheels ran it is pressed flat.
    const steps = span(Math.round((row.x1 - row.x0 + .8) / .75)), across = [-.46, -.3, -.05, .22, .42];
    const lump = steps.map(() => across.map(() => random()));
    kit.keep('plain', kit.sheet('plain', steps, across, (u, offset) => {
      const x = row.x0 - .4 + u * (row.x1 - row.x0 + .8), z = row.z + .04 + offset, edge = Math.abs(offset - (-.02)) > .4;
      const high = edge ? .012 : (camp ? .1 : .035) * (.7 + lump[steps.indexOf(u)][across.indexOf(offset)] * .6);
      return [x, kit.ground(x, z) + high, z];
    }, (u, offset) => {
      const shade = .75 + lump[steps.indexOf(u)][across.indexOf(offset)] * .5, dry = Math.abs(offset) > .4 ? .6 : .15;
      return rgb(PALETTE.soil.clone().lerp(PALETTE.soilDry, dry).multiplyScalar(shade));
    }));

    // Stakes and the rails lashed along their tops. When the camp is burned most are snapped off or knocked flat.
    for (const line of ['low', 'high']) {
      // The low stakes stand just outside their rail and stop the glass sliding off it; the high ones stand behind theirs
      // and are cut off level with it, so that no stake comes up through a screen.
      const z = row.z + (line === 'low' ? FRAME.lowZ + .04 : FRAME.highZ - .045), high = line === 'low' ? FRAME.lowY : FRAME.highY;
      let last = null;
      for (const stake of row.stakes.filter(item => item.line === line)) {
        const y = kit.ground(stake.x, z), colour = stake.kind === 'timber' ? paint(PALETTE.timber, .8 + random() * .4) : stake.kind === 'tube' ? PALETTE.tube : PALETTE.rust;
        const thick = stake.kind === 'timber' ? .024 : stake.kind === 'tube' ? .024 : .009;
        let top;
        if (camp || random() < .22) {
          top = [stake.x + stake.leanX * high, y + high + (camp ? 0 : -.05), z + stake.leanZ * high];
          const proud = line === 'low' ? stake.proud : stake.proud * .15, tip = [stake.x + stake.leanX * (high + proud), y + high + proud, z + stake.leanZ * (high + proud)];
          if (stake.kind === 'timber') kit.batten('hard', [stake.x, y - .12, z], tip, .045, .04, colour); else kit.tube('hard', [stake.x, y - .12, z], tip, thick, colour, 5);
        } else {
          // Knocked flat to the east, the way the buggies went, or snapped off a hand above the ground.
          const flat = random() < .6, turn = (random() - .5) * 1.2;
          if (flat) {
            const a = [stake.x + random() * .5, y + .12, z + (random() - .5) * .3], b = [a[0] + Math.cos(turn) * (high + .1), y + .13 + random() * .04, a[2] + Math.sin(turn) * (high + .1)];
            if (stake.kind === 'timber') kit.batten('hard', a, b, .045, .04, colour); else kit.tube('hard', a, b, thick, colour, 5);
          } else kit.tube('hard', [stake.x, y - .1, z], [stake.x + .05, y + .1 + random() * .08, z + (random() - .5) * .06], thick, colour, 5);
          top = null;
        }
        if (camp && last && top && stake.rail !== 'none') {
          const railZ = row.z + (line === 'low' ? FRAME.lowZ : FRAME.highZ), a = [last[0] - .1, last[1] + .005, railZ], b = [top[0] + .1, top[1] + .005, railZ];
          if (stake.rail === 'tube') kit.tube('hard', a, b, .019, random() < .4 ? PALETTE.rust : PALETTE.tube, 5);
          else kit.batten('hard', a, b, .042, .02, paint(PALETTE.paleTimber, .7 + random() * .4));
        } else if (!camp && last && stake.rail !== 'none' && random() < .5) {
          // A rail lying where it was thrown.
          const x = stake.x - .7, turn = (random() - .5) * .9, y = kit.ground(x, z) + .13;
          kit.tube('hard', [x - Math.cos(turn) * .7, y, z - Math.sin(turn) * .7], [x + Math.cos(turn) * .7, y + random() * .1, z + Math.sin(turn) * .7], .019, PALETTE.tube, 5);
        }
        last = top ?? last;
      }
    }

    // The screens.
    row.screens.forEach((screen, index) => {
      const seed = rowIndex * 100 + index + 1;
      if (camp) {
        kit.stand(screen.x, row.z, 0, () => kit.within(0, FRAME.lowY + .02, FRAME.lowZ, [screen.tilt - Math.PI / 2, screen.skew, screen.roll],
          () => drawScreen(kit, screen.make, {dust: screen.dust, crack: screen.crack, taped: screen.taped, seed})));
        return;
      }
      const x = screen.x + screen.thrown.x, z = row.z + screen.thrown.z;
      drawSplinters(kit, splinters, random, screen.x, row.z, .9, screen.fate === 'gone' ? 22 : 7);
      if (screen.fate === 'crazed') kit.stand(x, z, screen.thrown.turn, () => kit.within(0, .13, .25, [-Math.PI / 2 + .06 + (screen.thrown.seed % 7) * .02, 0, 0],
        () => drawScreen(kit, screen.make, {state: 'crazed', seed: screen.thrown.seed})));
      else if (screen.fate === 'hanging') kit.stand(screen.x, row.z, screen.skew * 3, () => kit.within(0, .14, FRAME.lowZ, [screen.tilt * 1.25 - Math.PI / 2, 0, .35 + (screen.thrown.seed % 5) * .06],
        () => drawScreen(kit, screen.make, {state: 'crazed', seed: screen.thrown.seed})));
    });
    if (row.windbreak) {
      const x = row.x0 - .3, z = row.z + .05;
      if (camp) kit.stand(x, z, -Math.PI / 2 + row.windbreak.turn, () => kit.within(0, .03, 0, [row.windbreak.tilt - Math.PI / 2, 0, 0],
        () => drawScreen(kit, row.windbreak.make, {dust: row.windbreak.dust, seed: 900 + rowIndex})));
      else {
        kit.stand(x + 1.1, z + .2, .3 + rowIndex, () => kit.within(0, .13, 0, [-Math.PI / 2 + .05, 0, 0], () => drawScreen(kit, row.windbreak.make, {state: 'crazed', seed: 900 + rowIndex})));
        drawSplinters(kit, splinters, random, x + .4, z, .8, 12);
      }
    }

    // The beans: a low bush every hand and a half, with gaps where one died. Each is a dark mound of leaf with single
    // leaves standing out of it. Under the wheels they are pressed into the earth; between the wheel marks a few still
    // stand, wilting.
    for (let x = row.x0 + .18; x < row.x1 - .08; x += .3 + random() * .12) {
      if (random() < .07) continue;
      const pz = row.z + .04 + (random() - .5) * .2, y = kit.ground(x, pz) + (camp ? .09 : .04), size = .6 + random() * .55;
      const crushed = !camp && (Math.abs(pz - row.z) > .09 || random() < .55), wilt = !camp && !crushed;
      const green = PALETTE.leaf[Math.floor(random() * PALETTE.leaf.length)];
      const dull = colour => crushed ? colour.clone().lerp(PALETTE.leafDead, .5 + random() * .35) : wilt ? colour.clone().lerp(PALETTE.leafOld, .45) : colour;
      const high = crushed ? .03 : (wilt ? .14 : .24) * size, wide = (crushed ? .22 : .2) * size;
      // The bush: one rounded mound of leaf, lumpy, darker underneath and mottled.
      const body = paint(dull(green), .5 + random() * .2);
      drawMound(kit, random, x, y, pz, wide, high, (top, swell) => { const shade = (.55 + top * .45) * (.75 + swell * .35); return [body.r * shade, body.g * shade, body.b * shade]; }, 7, 3, true);
      // Leaves lying on the mound, each a little kite, lighter and darker than it.
      const count = crushed ? 5 : 10 + Math.floor(random() * 4);
      for (let leaf = 0; leaf < count; leaf++) {
        const around = random() * Math.PI * 2, down = crushed ? 1.5 : .2 + random() * 1.3, far = wide * (crushed ? 1 + random() * .5 : .95 + random() * .25);
        const cx = x + Math.cos(around) * Math.sin(down) * far, cy = y + Math.cos(down) * high * 1.02 + .006, cz = pz + Math.sin(around) * Math.sin(down) * far;
        const long = (.08 + random() * .05) * (.75 + size * .3), across = long * (.62 + random() * .2), droop = crushed ? 0 : wilt ? -.05 : -.01 - random() * .025;
        // Along the mound's slope, and across it.
        const sx = Math.cos(around) * Math.cos(down), sy = -Math.sin(down), sz = Math.sin(around) * Math.cos(down), tx = -Math.sin(around), tz = Math.cos(around);
        const colour = dull(random() < .1 ? PALETTE.leafOld : green), shade = .95 + random() * .7, tint = [colour.r * shade, colour.g * shade, colour.b * shade];
        leaves.quad([cx - sx * long * .5, cy - sy * long * .5, cz - sz * long * .5], [cx - tx * across * .5, cy + droop * .3, cz - tz * across * .5],
          [cx + sx * long * .5, cy + sy * long * .5 + droop, cz + sz * long * .5], [cx + tx * across * .5, cy + droop * .3, cz + tz * across * .5], tint);
      }
    }
  });
  leaves.keep();
  splinters.keep();
}

// ---- The wind pump ----
// The tower of scaffold tube, its head and tail, the pump at its foot and the trough. Returns where the wheel's hub is and
// which way it faces, and the pump rod's line, for the parts that move.
function drawPump(kit) {
  const {pump, trough} = GLASSHOUSE_LAYOUT.things, random = mulberry(0x9d07e1);
  const top = 4.7, foot = .9, head = .26, facing = Math.atan2(-WIND.x, -WIND.z);
  const leg = (sx, sz, y) => { const t = y / top; return [sx * (foot + (head - foot) * t), y, sz * (foot + (head - foot) * t)]; };
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  kit.stand(pump.x, pump.z, 0, () => {
    for (const [sx, sz] of corners) {
      // Each leg is two lengths of tube joined by a sleeve, and stands on a flat stone with rocks piled round its foot.
      kit.tube('hard', leg(sx, sz, -.2), leg(sx, sz, 2.75), .03, PALETTE.tube, 7);
      kit.tube('hard', leg(sx, sz, 2.45), leg(sx, sz, top + .12), .03, random() < .5 ? PALETTE.tube : paint(PALETTE.rust, .8), 7);
      kit.tube('hard', leg(sx, sz, 2.42), leg(sx, sz, 2.78), .038, PALETTE.iron, 7);
      for (let rock = 0; rock < 3; rock++) drawRock(kit, random, sx * foot + (random() - .5) * .5, .06, sz * foot + (random() - .5) * .5, .1 + random() * .1);
    }
    // Rails round the tower at four heights, each running past its joints as scaffold does, and a brace across every bay.
    const levels = [.45, 1.75, 3.15, 4.5];
    levels.forEach((y, level) => corners.forEach(([sx, sz], side) => {
      const [nx, nz] = corners[(side + 1) % 4], a = leg(sx, sz, y + side % 2 * .07), b = leg(nx, nz, y + side % 2 * .07);
      const dx = b[0] - a[0], dz = b[2] - a[2], far = Math.hypot(dx, dz), over = .14 / far;
      kit.tube('hard', [a[0] - dx * over, a[1], a[2] - dz * over], [b[0] + dx * over, b[1], b[2] + dz * over], .024, level === 2 && side === 1 ? paint(PALETTE.rust, .9) : PALETTE.tube, 6);
      for (const joint of [a, b]) kit.box('hard', .075, .085, .075, PALETTE.iron, joint[0], joint[1], joint[2], [0, random() * 3, 0]);
      if (level < levels.length - 1) {
        const lift = levels[level + 1], rising = (side + level) % 2 === 0, c = leg(rising ? sx : nx, rising ? sz : nz, y + .12), d = leg(rising ? nx : sx, rising ? nz : sz, lift - .1);
        // One brace on the north face was lost, and a length of timber is lashed in its place.
        if (level === 1 && side === 0) kit.batten('hard', c, d, .07, .028, PALETTE.paleTimber);
        else kit.tube('hard', c, d, .019, random() < .3 ? paint(PALETTE.rust, .85) : PALETTE.tube, 5);
      }
    }));
    // A ladder up the south face, of thin tube with rungs of bar.
    for (const side of [-.19, .19]) kit.tube('hard', [side, -.05, foot + .12], [side, top - .15, head + .1], .015, PALETTE.tube, 5);
    for (let rung = 0; rung < 14; rung++) { const y = .35 + rung * .31, z = foot + .12 + (head + .1 - foot - .12) * ((y + .05) / (top - .1)); kit.tube('hard', [-.21, y, z], [.21, y, z], .009, PALETTE.rust, 4); }
    // Two planks to stand on under the head.
    for (const z of [-.2, .16]) kit.box('hard', .82, .035, .2, paint(PALETTE.paleTimber, .8 + random() * .3), .02, levels[3] + .06, z, [0, random() * .1, .01]);
    // The pump itself, at the foot: a standpipe with a spout that reaches the trough, on a slab.
    kit.keep('hard', kit.place(new THREE.CylinderGeometry(.075, .09, 1.02, 10), 0, .51, 0), paint(PALETTE.rust, .8));
    kit.keep('hard', kit.place(new THREE.CylinderGeometry(.11, .11, .05, 10), 0, 1.03, 0), PALETTE.iron);
    kit.keep('hard', kit.place(new THREE.CylinderGeometry(.16, .18, .06, 10), 0, .04, 0), PALETTE.iron);
    kit.rope('hard', [[0, .74, 0], [.4, .78, 0], [1.2, .74, 0], [1.62, .6, 0], [1.7, .42, 0]], .034, PALETTE.tube, 6, 14);
    // A guide of timber that keeps the rod straight, half way up.
    kit.box('hard', 1.1, .05, .09, PALETTE.timber, 0, 2.52, 0, [0, .78, 0]);

    // The head turns to face the wind: a turntable, a post, the casing of an old axle for its gears, and a tail on a boom.
    kit.within(0, 0, 0, [0, facing, 0], () => {
      kit.keep('hard', kit.place(new THREE.CylinderGeometry(.2, .22, .05, 12), 0, top + .14, 0), PALETTE.iron);
      kit.tube('hard', [0, top + .14, 0], [0, pump.hub + .08, 0], .04, PALETTE.tube, 7);
      const casing = new THREE.SphereGeometry(.15, 9, 7);
      casing.scale(.9, 1, 1.25);
      kit.keep('hard', kit.place(casing, 0, pump.hub, .02), paint(PALETTE.rust, .7));
      kit.tube('hard', [0, pump.hub, .1], [0, pump.hub, .36], .034, PALETTE.iron, 7);
      kit.tube('hard', [0, pump.hub + .02, -.1], [0, pump.hub + .1, -1.75], .019, PALETTE.tube, 5);
      kit.tube('hard', [0, pump.hub + .42, 0], [0, pump.hub + .11, -1.5], .006, PALETTE.iron, 3);
      kit.tube('hard', [0, pump.hub + .08, 0], [0, pump.hub + .42, 0], .016, PALETTE.tube, 5);
      // The tail: tin cut from a car's door, notched at its end, with a patch riveted over a tear.
      const tail = PALETTE.bonnet[1];
      kit.keep('sheet', kit.sheet('sheet', span(4), span(2), (u, v) => {
        const z = -1.08 - u * .92, high = .26 + u * .1, notch = u > .99 ? Math.abs(v - .5) * .0 - (1 - Math.abs(v - .5) * 2) * .16 : 0;
        return [Math.sin(u * 2.4) * .025, pump.hub + .08 + (v - .5) * 2 * high, z - notch];
      }, (u, v) => rgb(paint(v > .62 && v < .9 ? PALETTE.bonnet[6] : tail, .85 + u * .2))));
      kit.box('sheet', .006, .2, .26, PALETTE.bonnet[7], .02, pump.hub + .2, -1.5, [.1, 0, 0]);
    });
  });
  // The trough: half an oil drum on its side on two rows of blocks, with water in it, and two buckets beside it.
  kit.stand(trough.x, trough.z, 0, () => {
    const shell = new THREE.CylinderGeometry(.29, .29, 1.3, 14, 1, true, Math.PI / 2, Math.PI);
    kit.keep('sheet', kit.place(shell, 0, .45, 0, [-Math.PI / 2, Math.PI / 2, 0]), paint(PALETTE.rust, .85));
    for (const end of [-1, 1]) kit.keep('sheet', kit.place(new THREE.CircleGeometry(.29, 8, Math.PI, Math.PI), end * .65, .45, 0, [0, Math.PI / 2, 0]), paint(PALETTE.rust, .75));
    kit.keep('glass', kit.place(new THREE.PlaneGeometry(1.26, .5), 0, .37, 0, [-Math.PI / 2, 0, 0]), GLASS.water);
    for (const x of [-.42, .42]) for (const z of [-.14, .14]) kit.box('hard', .22, .17, .11, paint(PALETTE.stone, .7 + random() * .5), x, .085, z, [0, random() * .3, 0]);
    for (const [x, z, tip] of [[.2, .62, 0], [-.35, .7, 1.45]]) {
      kit.keep('sheet', kit.place(new THREE.CylinderGeometry(.14, .11, .25, 10, 1, true), x, tip ? .13 : .125, z, [tip, x * 9, 0]), PALETTE.tin);
      kit.keep('sheet', kit.place(new THREE.CircleGeometry(.11, 10), x, tip ? .13 : .005, z + (tip ? -.12 : 0), [tip - Math.PI / 2, x * 9, 0]), paint(PALETTE.tin, .7));
    }
  });
  return {facing, hub: [pump.x + Math.sin(facing) * .34, pump.hub, pump.z + Math.cos(facing) * .34], rod: {x: pump.x, z: pump.z, from: 1.08, to: pump.hub - .12}};
}

// The wheel, about its own hub with its axle along z: eight blades of tin cut from bonnets, each a different faded colour,
// one a rusty replacement and one broken short, held by two hoops of bar and eight spokes.
function drawWheel(kit) {
  const random = mulberry(0x77e31), radius = GLASSHOUSE_LAYOUT.things.pump.wheelRadius;
  kit.keep('wheel', kit.place(new THREE.CylinderGeometry(.11, .11, .13, 10), 0, 0, 0, [Math.PI / 2, 0, 0]), PALETTE.iron);
  kit.keep('wheel', kit.place(new THREE.CylinderGeometry(.045, .045, .2, 8), 0, 0, .03, [Math.PI / 2, 0, 0]), PALETTE.rust);
  for (const [hoop, z] of [[.42, .0], [.97, -.02]]) kit.keep('wheel', kit.place(new THREE.TorusGeometry(hoop, .011, 4, 26), 0, 0, z), PALETTE.rust);
  for (let blade = 0; blade < 8; blade++) {
    const angle = blade / 8 * Math.PI * 2, short = blade === 5, reach = short ? radius * .8 : radius, colour = blade === 2 ? PALETTE.bonnet[7] : PALETTE.bonnet[(blade * 3) % 7];
    kit.within(0, 0, 0, [0, 0, angle], () => {
      kit.tube('wheel', [0, .1, 0], [0, .98, -.02], .011, PALETTE.iron, 4);
      const bent = blade === 7 ? .12 : 0;
      kit.keep('wheel', kit.sheet('wheel', span(2), span(3), (u, v) => {
        const r = .3 + v * (reach - .3), wide = .15 + v * .31, pitch = .62 - v * .3 + bent * v, x = (u - .5) * wide;
        return [x * Math.cos(pitch), r + (short && v > .99 ? (u - .5) * .12 : 0), x * Math.sin(pitch) + Math.sin(u * Math.PI) * .018 - .03];
      }, (u, v) => rgb(paint(colour, .8 + random() * .25 + v * .1))));
    });
  }
}

// ---- The store tent ----
function drawTent(kit, stage) {
  const {tent} = GLASSHOUSE_LAYOUT.things, random = mulberry(0x51c0e7), camp = stage === 'camp';
  const ridge = 2.25, eave = 1.36, halfX = tent.halfX, halfZ = tent.halfZ, pole = camp ? PALETTE.timber : PALETTE.char;
  const roofAt = (x, z) => {
    const down = Math.abs(z) / halfZ, alongRidge = Math.cos(x / (halfX + .2) * Math.PI / 2);
    return ridge - .05 * (1 - Math.abs(x) / halfX) - (ridge - eave) * down - .1 * Math.sin(Math.min(1, down) * Math.PI) * (.5 + .5 * alongRidge) - (down > .95 ? .08 * alongRidge : 0);
  };
  kit.stand(tent.x, tent.z, tent.heading, () => {
    if (camp) {
      // The frame: two tall poles and a ridge of scaffold tube, four corner poles, and guy ropes to pegs.
      for (const side of [-1, 1]) kit.tube('hard', [side * halfX, -.2, 0], [side * (halfX + .05), ridge + .08, .03 * side], .034, pole, 6, .028);
      kit.tube('hard', [-halfX - .25, ridge + .03, 0], [halfX + .3, ridge + .05, 0], .024, PALETTE.tube, 6);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const topAt = [sx * (halfX + .06), eave + .06, sz * (halfZ + .04)];
        kit.tube('hard', [sx * (halfX - .04), -.2, sz * (halfZ - .05)], topAt, .028, paint(pole, .8 + random() * .4), 6, .022);
        const peg = [sx * (halfX + 1.15), .02, sz * (halfZ + .85)];
        kit.tube('hard', topAt, peg, .007, PALETTE.rope, 3);
        kit.tube('hard', [peg[0] + sx * .06, .2, peg[2] + sz * .04], [peg[0] - sx * .05, -.12, peg[2] - sz * .03], .014, PALETTE.rust, 4);
      }
      // The tarpaulin: over the ridge, down the back to the ground, sagging between its poles, faded in patches.
      const us = span(12).map(u => (u - .5) * 2 * (halfX + .16)), fade = us.map(() => span(14).map(() => random()));
      const vs = span(14);
      kit.keep('cloth', kit.sheet('cloth', us, vs, (x, v) => {
        // v runs from the front edge, over the ridge and down the back wall to the ground.
        const run = v * (2 * halfZ + .3 + 1.5) - (halfZ + .3);
        const crease = (fade[us.indexOf(x)][vs.indexOf(v)] - .5) * .05;
        if (run <= halfZ) return [x, roofAt(x, -run) + (run < -halfZ ? (run + halfZ) * .5 : 0) + crease, -run];
        const fall = (run - halfZ) / 1.5;
        return [x, roofAt(x, halfZ) * (1 - fall) + .02, -halfZ - .12 * Math.sin(fall * Math.PI) - fall * .22];
      }, (x, v) => {
        // Paler where the sun has had it, darker along the ridge and where water stands in the sag.
        const worn = fade[us.indexOf(x)][vs.indexOf(v)], ridgeLine = Math.abs(v * (2 * halfZ + 1.8) - (halfZ + .3)) < .2 ? .7 : 1;
        return rgb(PALETTE.canvas.clone().lerp(PALETTE.canvasPale, worn * .8).multiplyScalar(ridgeLine * (.8 + worn * .3)));
      }));
      // A patch of grey-blue sheet sewn over a hole in the roof, and a flap closing most of the west end.
      kit.keep('cloth', kit.sheet('cloth', span(3).map(u => -.9 + u * 1.2), span(3).map(v => .25 + v * .8), (x, z) => [x, roofAt(x, z) + .018, z], () => rgb(PALETTE.tarpBlue)));
      kit.keep('cloth', kit.sheet('cloth', span(4), span(4), (u, v) => {
        const z = -halfZ + u * (halfZ + .35), high = roofAt(-halfX, z) - .03;
        return [-halfX - .05 - Math.sin(v * Math.PI) * .09 * (1 - u * .5), high * (1 - v) + .03, z];
      }, (u, v) => rgb(paint(PALETTE.tarpGrey, .8 + u * .25 - v * .12))));
      // Inside: sacks stacked three, two and one, crates, and hoes leaning in the corner.
      const sack = (x, y, z, turn, colour) => { const body = new THREE.SphereGeometry(1, 9, 6); body.scale(.37, .13, .23); kit.keep('cloth', kit.place(body, x, y, z, [0, turn, random() * .08]), colour); };
      [[-1.25, .13, -.75], [-.9, .13, -.3], [-1.3, .13, -.1], [-1.15, .36, -.5], [-1.02, .36, -.12], [-1.1, .58, -.32], [.1, .13, -.95]].forEach(([x, y, z], index) =>
        sack(x, y, z, random() * .7 - .35 + (index === 6 ? 1.2 : 0), index % 3 === 1 ? PALETTE.sackDark : paint(PALETTE.sack, .85 + random() * .3)));
      for (const [x, z, turn, lift] of [[.75, -.85, .2, 0], [.82, -.82, -.25, .45], [1.45, -.45, 1.1, 0]]) kit.within(x, lift, z, [0, turn, 0], () => drawCrate(kit, .6, .44, .4, paint(PALETTE.paleTimber, .7 + random() * .4)));
      for (const [x, turn] of [[-1.82, .0], [-1.7, .5]]) kit.within(x, 0, 1.1, [.2, turn, .08], () => drawHoe(kit));
    } else {
      // Burned: the two tall poles stand, black, one snapped off; the ridge has come down at one end; the corner poles lie.
      kit.tube('hard', [-halfX, -.2, 0], [-halfX - .12, ridge - .05, .05], .032, PALETTE.char, 6, .02);
      kit.tube('hard', [halfX, -.2, 0], [halfX + .1, 1.25, -.06], .032, PALETTE.char, 6, .024);
      kit.tube('hard', [-halfX - .2, ridge - .1, .04], [halfX - .5, .16, .55], .024, paint(PALETTE.tube, .35), 6);
      for (const [x, z, turn] of [[-1.5, 1.3, .4], [1.7, -1.1, 2.2], [.9, 1.6, 1.3]]) kit.tube('hard', [x, .12, z], [x + Math.cos(turn) * 1.1, .15, z + Math.sin(turn) * 1.1], .024, PALETTE.char, 6, .012);
      kit.tube('hard', [-halfX + .04, -.2, -halfZ + .05], [-halfX - .1, .8, -halfZ - .1], .026, PALETTE.char, 6, .012);
      // Two scorched rags of the tarpaulin still hang from the ridge.
      for (const [x, wide, long] of [[-1.55, .5, .7], [-.6, .35, .45]]) kit.keep('plain', kit.sheet('plain', span(3), span(3), (u, v) => {
        const along = (x + u * wide + halfX + .2) / (2 * halfX - .3), y = ridge - .1 - along * (ridge - .26);
        return [x + u * wide, y - v * long * (.6 + Math.sin(u * 9) * .4), .04 + along * .5 + Math.sin(v * 3 + u * 4) * .05];
      }), paint(PALETTE.char, 1.5));
      // The ash: grey heaps run together over the tent's floor, black at their feet where things burned hottest, with the
      // ribs of the crates and the lumps of the sacks in them.
      const ashAt = (top, swell) => rgb(PALETTE.ashDark.clone().lerp(PALETTE.ash, top * top * (.3 + swell * .5)));
      for (const [x, z, radius, high] of [[-1.1, -.4, 1.05, .3], [-.2, .5, .95, .2], [.9, -.5, .9, .26], [1.4, .6, .8, .16], [-1.5, .9, .7, .15], [.2, -1.1, .85, .18], [.3, .1, 1.2, .14], [-.6, 1.25, .6, .12], [1.75, -1.2, .55, .12]])
        drawMound(kit, random, x, .06, z, radius * 1.25, high, ashAt, 12, 4);
      for (const [x, z, turn] of [[.7, -.8, .3], [.95, -.6, 1.9], [1.5, -.4, .9], [.6, -.5, 2.6]]) kit.batten('hard', [x, .12, z], [x + Math.cos(turn) * .12, .34 + random() * .2, z + Math.sin(turn) * .12], .035, .03, PALETTE.char);
      drawLamp(kit, random);
    }
    // The two spare screens: leaning in the mouth of the tent, or lying scorched in its ash.
    GLASSHOUSE_LAYOUT.spares.forEach((spare, index) => {
      if (camp) kit.within(spare.x, .03, spare.z, [spare.tilt - Math.PI / 2, spare.turn, 0], () => drawScreen(kit, spare.make, {dust: .22 + index * .1, seed: 950 + index}));
    });
  });
  if (!camp) {
    // Of the spare screens only splinters are left, at the mouth of the tent.
    const glass = kit.loose('glass');
    for (const spare of GLASSHOUSE_LAYOUT.spares) drawSplinters(kit, glass, random, tent.x + spare.x - .2, tent.z + spare.z - .3, .7, 16);
    glass.keep();
  }
}

// The broken car lamp in the ash (section 21: "A car lamp lies broken in the ash of the store tent"), in the tent's frame:
// a dull chrome bowl on its side, its rim, the stub of its bracket, a tail of wire, and what is left of its glass.
function drawLamp(kit, random) {
  const {tent, lamp} = GLASSHOUSE_LAYOUT.things;
  kit.within(lamp.x - tent.x, .3, lamp.z - tent.z, [1.0, .7, .2], () => {
    const bowl = new THREE.SphereGeometry(.095, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    bowl.scale(1, 1.15, 1);
    kit.keep('sheet', bowl, PALETTE.chrome);
    kit.keep('sheet', kit.place(new THREE.TorusGeometry(.097, .009, 5, 14), 0, 0, 0, [Math.PI / 2, 0, 0]), paint(PALETTE.chrome, 1.15));
    kit.tube('hard', [0, -.1, 0], [.02, -.19, .03], .016, PALETTE.iron, 5);
    kit.rope('hard', [[.02, -.18, .03], [.1, -.22, .08], [.2, -.16, .06], [.3, -.2, -.02]], .005, PALETTE.char, 3);
    const glass = kit.loose('glass');
    for (let piece = 0; piece < 5; piece++) {
      const a = piece * 1.1 + random(), b = a + .5 + random() * .4;
      glass.triangle([Math.cos(a) * .095, 0, Math.sin(a) * .095], [Math.cos(b) * .095, 0, Math.sin(b) * .095], [Math.cos((a + b) / 2) * .04, .01, Math.sin((a + b) / 2) * .04], GLASS.crazed);
    }
    glass.keep();
  });
  const glass = kit.loose('glass');
  for (let piece = 0; piece < 16; piece++) {
    const angle = random() * 6.3, far = .12 + random() * .4, x = lamp.x - tent.x + Math.cos(angle) * far, z = lamp.z - tent.z + Math.sin(angle) * far, size = .015 + random() * .035;
    glass.triangle([x, .27, z], [x + size, .275, z + size * .4], [x + size * .3, .27, z + size], GLASS.crack);
  }
  glass.keep();
}

// A hoe, standing on its blade at the frame's origin with its shaft straight up; the caller leans it.
function drawHoe(kit) {
  kit.tube('hard', [0, .03, 0], [0, 1.48, 0], .014, PALETTE.paleTimber, 5, .012);
  kit.box('hard', .15, .11, .006, PALETTE.rust, 0, .05, .045, [1.2, 0, 0]);
  kit.tube('hard', [0, .02, 0], [0, .12, 0], .019, PALETTE.iron, 5);
}

// ---- The stove ----
// Returns where its pipe ends (in the site's metres, y above the ground under the stove), for the smoke.
function drawStove(kit, stage) {
  const {stove} = GLASSHOUSE_LAYOUT.things, random = mulberry(0x2f0b1d), camp = stage === 'camp', facing = -.5;
  kit.stand(stove.x, stove.z, facing, () => {
    // An oil drum on three legs of bar, with a door cut in its side, a plate on top and a pipe that leans.
    for (let legIndex = 0; legIndex < 3; legIndex++) { const a = legIndex * 2.1 + .4; kit.tube('hard', [Math.cos(a) * .3, -.08, Math.sin(a) * .3], [Math.cos(a) * .2, .26, Math.sin(a) * .2], .013, PALETTE.rust, 4); }
    kit.keep('hard', kit.place(new THREE.CylinderGeometry(.29, .29, .62, 14), 0, .55, 0), paint(PALETTE.rust, .55));
    for (const y of [.36, .74]) kit.keep('hard', kit.place(new THREE.CylinderGeometry(.297, .297, .025, 14), 0, y, 0), PALETTE.iron);
    kit.keep('hard', kit.place(new THREE.CylinderGeometry(.31, .31, .022, 14), 0, .872, 0), PALETTE.iron);
    // The door: a dark mouth, its frame of bar, and the cut-out plate hanging open on a wire hinge.
    kit.box('hard', .22, .19, .02, PALETTE.char, 0, .5, .283);
    for (const [w, h, x, y] of [[.25, .018, 0, .6], [.25, .018, 0, .4], [.018, .2, -.12, .5], [.018, .2, .12, .5]]) kit.box('hard', w, h, .03, PALETTE.iron, x, y, .29);
    kit.box('hard', .2, .18, .008, paint(PALETTE.rust, .5), .22, .49, .36, [0, 1.1, .04]);
    kit.tube('hard', [.02, .87, -.17], [.05, 1.6, -.2], .055, paint(PALETTE.rust, .45), 8);
    kit.tube('hard', [.05, 1.56, -.2], [-.02, stove.pipeTop - .06, -.22], .052, paint(PALETTE.tin, .5), 8);
    kit.keep('hard', kit.place(new THREE.ConeGeometry(.11, .07, 8), -.02, stove.pipeTop + .04, -.22), PALETTE.iron);
    for (const a of [0, 2.1, 4.2]) kit.tube('hard', [-.02 + Math.cos(a) * .05, stove.pipeTop - .07, -.22 + Math.sin(a) * .05], [-.02 + Math.cos(a) * .075, stove.pipeTop + .02, -.22 + Math.sin(a) * .075], .004, PALETTE.iron, 3);
    // The kettle: on the plate, or on its side on the ground when the camp is burned.
    kit.within(camp ? .06 : .7, camp ? .883 : .09, camp ? .05 : .5, camp ? null : [1.4, 1, 0], () => {
      kit.keep('hard', kit.place(new THREE.CylinderGeometry(.075, .1, .11, 10), 0, .055, 0), PALETTE.iron);
      kit.keep('hard', kit.place(new THREE.ConeGeometry(.078, .04, 10), 0, .13, 0), PALETTE.iron);
      kit.tube('hard', [.08, .05, 0], [.17, .12, 0], .014, PALETTE.iron, 5, .009);
      kit.keep('hard', kit.place(new THREE.TorusGeometry(.065, .006, 4, 8, Math.PI), 0, .12, 0), PALETTE.iron);
    });
    // Bean stalks heaped ready to burn, a crate to sit on and a log.
    for (let stalk = 0; stalk < 34; stalk++) {
      const turn = .3 + (random() - .5) * .9, long = .45 + random() * .4, x = -.95 + (random() - .5) * .35, z = .25 + (random() - .5) * .55, y = .03 + random() * .2;
      kit.tube('hard', [x - Math.cos(turn) * long / 2, y, z - Math.sin(turn) * long / 2], [x + Math.cos(turn) * long / 2, y + (random() - .4) * .1, z + Math.sin(turn) * long / 2], .007, paint(PALETTE.straw, .7 + random() * .5), 3);
    }
    kit.within(.35, 0, 1.05, [camp ? 0 : 1.5, .5, 0], () => drawCrate(kit, .5, .36, .36, paint(PALETTE.paleTimber, .8)));
    kit.keep('hard', kit.place(new THREE.CylinderGeometry(.14, .15, .46, 9), -.55, .15, 1.15, [Math.PI / 2, .9, 0]), PALETTE.timber);
  });
  const sin = Math.sin(facing), cos = Math.cos(facing), px = -.02, pz = -.22;
  return {pipe: [stove.x + px * cos + pz * sin, stove.pipeTop + .08, stove.z - px * sin + pz * cos], door: {x: stove.x + .302 * sin, z: stove.z + .302 * cos, facing}};
}

// ---- The water cart ----
// About its own middle on the ground, its front towards +z: three wheels, a frame of tube, a drum of about 400 litres on its
// side, a small engine under a tractor's seat that drives the front wheel's fork by a tiller, a bucket and a tow eye.
function drawCart(kit) {
  const kind = 'cart';
  const wheel = (x, y, z, radius, fat, rim) => {
    kit.keep(kind, kit.place(new THREE.TorusGeometry(radius - fat, fat, 7, 14), x, y, z, [0, Math.PI / 2, 0]), PALETTE.rubber);
    kit.keep(kind, kit.place(new THREE.CylinderGeometry(radius - fat * 1.7, radius - fat * 1.7, fat * 1.1, 10), x, y, z, [0, 0, Math.PI / 2]), rim);
  };
  // Frame.
  for (const side of [-1, 1]) {
    kit.tube(kind, [side * .42, .44, -1.05], [side * .42, .44, .55], .023, PALETTE.tube, 6);
    kit.tube(kind, [side * .42, .44, .55], [side * .05, .66, 1], .023, PALETTE.tube, 6);
    kit.tube(kind, [side * .42, .44, -.55], [side * .42, .27, -.55], .02, PALETTE.iron, 5);
  }
  for (const z of [-1.03, -.2, .5]) kit.tube(kind, [-.45, .44, z], [.45, .44, z], .02, PALETTE.tube, 5);
  kit.tube(kind, [-.66, .27, -.55], [.66, .27, -.55], .019, PALETTE.iron, 6);
  wheel(-.6, .275, -.55, .275, .075, PALETTE.bonnet[2]);
  wheel(.6, .26, -.55, .26, .06, PALETTE.rust);
  // A mudguard over one back wheel only.
  kit.keep(kind, kit.place(new THREE.CylinderGeometry(.34, .34, .17, 9, 1, true, -.9, 1.8), -.6, .275, -.55, [-Math.PI / 2, 0, Math.PI / 2]), PALETTE.bonnet[4]);
  // The front wheel in its fork, and the tiller.
  wheel(0, .24, 1.14, .24, .06, PALETTE.iron);
  for (const side of [-1, 1]) kit.tube(kind, [side * .08, .24, 1.14], [side * .05, .74, .99], .016, PALETTE.tube, 5);
  kit.tube(kind, [0, .64, 1], [0, .76, .98], .03, PALETTE.iron, 6);
  kit.tube(kind, [0, .74, .99], [0, 1.04, .68], .016, PALETTE.tube, 5);
  kit.tube(kind, [-.27, 1.04, .68], [.27, 1.04, .68], .014, PALETTE.tube, 5);
  for (const side of [-1, 1]) kit.tube(kind, [side * .19, 1.04, .68], [side * .28, 1.04, .68], .019, PALETTE.rubber, 5);
  kit.keep(kind, kit.place(new THREE.TorusGeometry(.045, .01, 4, 8), 0, .5, 1.02, [Math.PI / 2, 0, 0]), PALETTE.iron);
  // The drum on its side on two chocks, held by two straps, with a bung on top and a tap and a hose at the back.
  kit.keep(kind, kit.place(new THREE.CylinderGeometry(.36, .36, 1.02, 16), 0, .85, -.38, [Math.PI / 2, 0, 0]), PALETTE.drum);
  for (const z of [-.72, -.04]) kit.keep(kind, kit.place(new THREE.CylinderGeometry(.368, .368, .035, 16), 0, .85, z, [Math.PI / 2, 0, 0]), paint(PALETTE.drum, .7));
  for (const z of [-.6, -.16]) {
    kit.keep(kind, kit.place(new THREE.TorusGeometry(.372, .009, 4, 16), 0, .85, z), PALETTE.rust);
    kit.box(kind, .9, .1, .09, PALETTE.timber, 0, .49, z);
  }
  kit.keep(kind, kit.place(new THREE.CylinderGeometry(.035, .035, .03, 7), .06, 1.215, -.5), PALETTE.iron);
  kit.tube(kind, [0, .58, -.89], [0, .56, -.99], .018, PALETTE.iron, 5);
  kit.tube(kind, [-.04, .62, -.97], [.05, .62, -.97], .007, PALETTE.rust, 3);
  kit.rope(kind, [[0, .56, -.99], [.04, .42, -1.04], [.2, .5, -1.02], [.38, .7, -1.0], [.43, .5, -1.03], [.36, .3, -1.06]], .013, PALETTE.rubber, 4, 16);
  // The seat off a tractor on a strip of spring steel, and a board for the feet.
  const pan = new THREE.SphereGeometry(.24, 9, 4, 0, Math.PI * 2, Math.PI * .74, Math.PI * .26);
  pan.scale(.85, 1, 1);
  kit.keep(kind, kit.place(pan, 0, 1.03, .34, [-.1, 0, 0]), PALETTE.bonnet[0]);
  kit.batten(kind, [0, .45, .2], [0, .8, .36], .06, .008, PALETTE.iron);
  kit.box(kind, .72, .022, .16, PALETTE.paleTimber, 0, .47, .66, [.05, .03, 0]);
  // The engine: a block with a finned head, a flywheel, a small tank, a pipe, and a chain to the back axle.
  kit.box(kind, .2, .17, .22, paint(PALETTE.rust, .5), .14, .56, .16);
  for (let fin = 0; fin < 5; fin++) kit.box(kind, .17, .009, .19, PALETTE.iron, .14, .67 + fin * .026, .16);
  kit.keep(kind, kit.place(new THREE.CylinderGeometry(.125, .125, .035, 12), .27, .56, .16, [0, 0, Math.PI / 2]), PALETTE.iron);
  kit.keep(kind, kit.place(new THREE.CylinderGeometry(.065, .065, .2, 8), -.12, .68, .14, [0, 0, Math.PI / 2]), PALETTE.bonnet[5]);
  kit.rope(kind, [[.14, .78, .2], [.14, .86, .3], [.32, .84, .34], [.44, .7, .3]], .017, paint(PALETTE.rust, .5), 5, 10);
  for (const y of [.5, .58]) kit.tube(kind, [.2, y, .1], [.2, y - .24, -.55], .006, PALETTE.iron, 3);
  // A bucket hung at the back.
  kit.keep(kind, kit.place(new THREE.CylinderGeometry(.13, .1, .22, 9, 1, true), -.38, .55, -1.12, [.1, 0, .06]), PALETTE.tin);
  kit.keep(kind, kit.place(new THREE.TorusGeometry(.12, .005, 3, 8, Math.PI), -.38, .66, -1.11, [0, 0, 0]), PALETTE.iron);
}

// ---- A sleeping shelter ----
// In its own frame with its open side towards +z: a tarpaulin from a rail on two poles down to a low rail at the back and
// on to the ground, a wall of sheet on the side the wind comes from, and under it two bench seats end to end for a bed.
function drawShelter(kit, index) {
  const random = mulberry(0x5e17 + index * 97), wide = 1.45, front = 1.05, back = -1.15;
  const tarp = [PALETTE.canvas, PALETTE.tarpGrey, PALETTE.tarpBlue][index % 3], frontHigh = 1.5 + random() * .12, backHigh = .5;
  for (const side of [-1, 1]) {
    kit.tube('hard', [side * wide, -.2, front], [side * (wide + .04), frontHigh + .06, front + .05], .028, paint(PALETTE.timber, .8 + random() * .4), 6, .022);
    kit.tube('hard', [side * (wide - .05), -.15, back], [side * wide, backHigh + .05, back - .03], .024, random() < .5 ? PALETTE.tube : PALETTE.timber, 5);
    kit.tube('hard', [side * (wide + .04), frontHigh + .04, front + .05], [side * (wide + .5), .02, front + 1.15], .007, PALETTE.rope, 3);
    kit.tube('hard', [side * (wide + .52), .16, front + 1.2], [side * (wide + .47), -.1, front + 1.1], .013, PALETTE.rust, 4);
  }
  kit.tube('hard', [-wide - .15, frontHigh + .02, front + .05], [wide + .2, frontHigh + .05, front + .05], .022, PALETTE.tube, 5);
  kit.batten('hard', [-wide - .1, backHigh + .02, back - .03], [wide + .1, backHigh + .03, back - .03], .045, .022, PALETTE.paleTimber);
  const us = span(8), vs = span(8), fade = us.map(() => vs.map(() => random()));
  kit.keep('cloth', kit.sheet('cloth', us, vs, (u, v) => {
    const x = (u - .5) * 2 * (wide + .14), run = v * 1.22, sag = Math.sin(Math.min(1, run) * Math.PI) * .1 * (.4 + Math.sin(u * Math.PI) * .8);
    if (run <= 1) return [x, frontHigh + .05 + (backHigh - frontHigh) * run - sag - (v < .02 ? Math.sin(u * Math.PI) * .07 : 0), front + .16 + (back - front - .16) * run];
    const fall = (run - 1) / .22;
    return [x, (backHigh + .04) * (1 - fall) + .02, back - .03 - fall * .28];
  }, (u, v) => rgb(paint(tarp, .78 + fade[us.indexOf(u)][vs.indexOf(v)] * .4))));
  // The wall on the west side: another sheet, hanging from the roof's edge to the ground.
  kit.keep('cloth', kit.sheet('cloth', span(4), span(3), (u, v) => {
    const z = front - .1 + (back - front) * u, high = frontHigh + (backHigh - frontHigh) * u;
    return [-wide - .1 - Math.sin(v * Math.PI) * .07, high * (1 - v) + .02, z];
  }), paint(index % 2 ? PALETTE.canvas : PALETTE.tarpGrey, .8));
  // The bed: two seat cushions end to end, one seat back as a headboard and one against the low rail, and a blanket.
  const vinylA = PALETTE.vinyl[index % 3], vinylB = PALETTE.vinyl[(index + 1) % 3];
  kit.keep('hard', kit.place(cushion(1.3, .18, .52), -.72, .11, -.5, [0, .03, 0]), vinylA);
  kit.keep('hard', kit.place(cushion(1.25, .16, .5), .62, .1, -.46, [0, -.05, 0]), vinylB);
  kit.keep('hard', kit.place(cushion(1.3, .14, .5), -.72, .36, -.88, [1.25, .03, 0]), vinylA);
  kit.keep('hard', kit.place(cushion(.5, .13, .46), 1.31, .34, -.46, [1.35, -Math.PI / 2, 0]), vinylB);
  const folds = span(6).map(() => span(4).map(() => random()));
  kit.keep('cloth', kit.sheet('cloth', span(6), span(4), (u, v) => [.05 + u * 1.2, .235 + folds[Math.round(u * 6)][Math.round(v * 4)] * .05 - (v > .99 || v < .01 ? .1 : 0), -.78 + v * .62], null), paint(PALETTE.wool, .8 + index * .15));
  if (index !== 1) kit.within(-1.0, 0, .45, [0, .4 + index, 0], () => drawCrate(kit, .5, .34, .36, paint(PALETTE.paleTimber, .75)));
  kit.keep('hard', kit.place(new THREE.CylinderGeometry(.045, .04, .09, 8), index === 1 ? .9 : -1.0, index === 1 ? .045 : .385, .45), PALETTE.tin);
}

// ---- The washing line and the bird-scarer ----
function drawWashing(kit, stage) {
  const [a, b] = GLASSHOUSE_LAYOUT.things.washing, random = mulberry(0x3a51), camp = stage === 'camp';
  const ya = kit.ground(a.x, a.z), yb = kit.ground(b.x, b.z), topA = [a.x + .05, ya + 1.86, a.z - .03], topB = [b.x - .06, yb + 1.8, b.z + .04];
  kit.tube('hard', [a.x, ya - .2, a.z], topA, .03, PALETTE.timber, 6, .024);
  kit.tube('hard', [b.x, yb - .2, b.z], topB, .028, PALETTE.tube, 6);
  const sag = t => [topA[0] + (topB[0] - topA[0]) * t, topA[1] + (topB[1] - topA[1]) * t - .26 * 4 * t * (1 - t), topA[2] + (topB[2] - topA[2]) * t];
  const across = Math.atan2(topB[0] - topA[0], topB[2] - topA[2]);
  // What hangs: [how far along the line, kind, width, length, colour].
  const hung = [[.1, 'sheet', .78, .7, 3], [.24, 'shirt', .44, .6, 0], [.37, 'trousers', .36, .82, 2], [.5, 'sheet', .56, .44, 5], [.63, 'shirt', .4, .56, 4], [.76, 'cloth', .34, .5, 1], [.87, 'cloth', .26, .32, 0]];
  // One piece of cloth hanging from its top edge, in a frame whose z runs along the line: folds down it, a ragged hem.
  const drape = (wide, long, colour, offset = 0, slant = 0) => {
    const phase = random() * 6, billow = (random() - .5) * .14;
    kit.keep('cloth', kit.sheet('cloth', span(4), span(4), (u, v) =>
      [Math.sin(v * 2.2) * billow + Math.sin(u * Math.PI * 3 + phase) * .022 * v, -v * long - Math.sin(u * Math.PI) * .025 * (1 - v) - (v > .99 ? Math.sin(u * 7 + phase) * .02 : 0) - Math.abs(slant) * v * .05,
        offset + (u - .5) * wide * (1 - v * .1) + slant * v * long]), colour);
  };
  if (camp) {
    kit.rope('hard', span(8).map(sag), .005, PALETTE.rope, 3, 16);
    for (const [t, kind, wide, long, colourIndex] of hung) {
      const at = sag(t), colour = paint(PALETTE.cloth[colourIndex], .8 + random() * .3);
      kit.within(at[0], at[1], at[2], [0, across, 0], () => {
        if (kind === 'trousers') { drape(wide, long * .28, colour); for (const side of [-1, 1]) kit.within(0, -long * .26, 0, null, () => drape(wide * .46, long * .74, colour, side * wide * .26, side * .05)); }
        else if (kind === 'shirt') { drape(wide, long, colour); for (const side of [-1, 1]) kit.within(0, -.02, 0, null, () => drape(wide * .3, long * .62, paint(colour, .9), side * wide * .64, side * .32)); }
        else drape(wide, long, colour);
      });
    }
  } else {
    // The line was torn down: it hangs from one post and trails on the ground, with the washing trodden into the dust.
    const end = [a.x + 2.6, kit.ground(a.x + 2.6, a.z + 1.9) + .04, a.z + 1.9];
    kit.rope('hard', [topA, [a.x + .3, ya + .9, a.z + .2], [a.x + .9, kit.ground(a.x + .9, a.z + .7) + .04, a.z + .7], [a.x + 1.8, kit.ground(a.x + 1.8, a.z + 1.2) + .04, a.z + 1.2], end], .005, PALETTE.rope, 3, 16);
    for (const [t, , wide, long, colour] of hung.filter((_, index) => index % 2 === 0)) {
      const x = a.x + .6 + t * 3 + (random() - .5), z = a.z + .6 + t * 2.2 + (random() - .5), turn = random() * 3;
      kit.stand(x, z, turn, () => kit.keep('cloth', kit.sheet('cloth', span(2), span(2), (u, v) => [(u - .5) * wide, .035 + random() * .03, (v - .5) * long]), paint(PALETTE.cloth[colour], .55)));
    }
  }
}

function drawScarer(kit) {
  const {scarer} = GLASSHOUSE_LAYOUT.things, random = mulberry(0x8c4b);
  kit.stand(scarer.x, scarer.z, .4, () => {
    const top = [.22, 3.25, -.08];
    kit.tube('hard', [0, -.3, 0], top, .028, PALETTE.timber, 6, .02);
    const arms = [[[-.72, 2.98, .1], [.95, 3.12, -.22]], [[.3, 2.5, -.6], [.1, 2.62, .55]]];
    for (const [from, to] of arms) kit.batten('hard', from, to, .04, .022, PALETTE.paleTimber);
    // Five hubcaps on wires, each hanging its own way.
    [[0, .08, .34], [0, .52, .22], [0, .93, .45], [1, .12, .3], [1, .9, .38]].forEach(([arm, t, drop], index) => {
      const [from, to] = arms[arm], at = from.map((value, part) => value + (to[part] - value) * t);
      kit.tube('hard', at, [at[0], at[1] - drop, at[2]], .004, PALETTE.iron, 3);
      const cap = new THREE.LatheGeometry([[0, .03], [.06, .034], [.12, .02], [.175, 0], [.19, -.012]].map(([r, y]) => new THREE.Vector2(r + .0001, y)), 12);
      kit.keep('sheet', kit.place(cap, at[0], at[1] - drop - .17, at[2], [Math.PI / 2 + (random() - .5) * .3, random() * 3, 0]), paint(index === 3 ? PALETTE.rust : PALETTE.chrome, .8 + random() * .4));
    });
  });
}

// A watering can by the rows and a hoe stuck in the last bed.
function drawSmallThings(kit, stage) {
  const camp = stage === 'camp';
  kit.stand(-.35, -1.6, 1.1, () => kit.within(0, camp ? 0 : .11, 0, camp ? null : [0, 0, 1.5], () => {
    kit.keep('sheet', kit.place(new THREE.CylinderGeometry(.11, .12, .27, 10, 1, true), 0, .135, 0), PALETTE.tin);
    kit.keep('sheet', kit.place(new THREE.CircleGeometry(.12, 10), 0, .004, 0, [-Math.PI / 2, 0, 0]), paint(PALETTE.tin, .7));
    kit.tube('hard', [.1, .06, 0], [.36, .3, 0], .017, PALETTE.tin, 5, .012);
    kit.keep('hard', kit.place(new THREE.ConeGeometry(.04, .05, 7), .375, .31, 0, [0, 0, -.9]), PALETTE.tin);
    kit.keep('hard', kit.place(new THREE.TorusGeometry(.1, .008, 4, 8, Math.PI), -.02, .27, 0, [0, 0, 0]), PALETTE.iron);
  }));
  if (camp) kit.stand(-.55, 3.35, .3, () => kit.within(0, .06, 0, [.12, 0, -.1], () => drawHoe(kit)));
  else kit.stand(.3, 3.9, 2.2, () => kit.within(0, .12, 0, [Math.PI / 2 - .03, 0, 0], () => drawHoe(kit)));
}

// ---- Marks on the ground ----
// A strip lying on the ground along a line of points, soft at its edges. `alphaAt(index)` says how strong it is at each
// point of the line, so that a mark breaks up along its length and does not read as a rail.
function groundStrip(kit, marks, line, half, colour, alphaAt, lift = .05) {
  const offsets = [-half, -half * .55, half * .55, half];
  for (let index = 0; index < line.length - 1; index++) {
    const a = line[index], b = line[index + 1], dx = b.x - a.x, dz = b.z - a.z, far = Math.hypot(dx, dz) || 1, nx = -dz / far, nz = dx / far;
    const ends = at => Math.min(1, at / 3, (line.length - 1 - at) / 3);
    const alphaA = alphaAt(index) * ends(index), alphaB = alphaAt(index + 1) * ends(index + 1);
    if (alphaA <= 0 && alphaB <= 0) continue;
    for (let band = 0; band < 3; band++) {
      const edge = band === 0 ? [0, 1] : band === 1 ? [1, 1] : [1, 0];
      const corner = (point, offset) => { const x = point.x + nx * offsets[offset], z = point.z + nz * offsets[offset]; return [x, kit.ground(x, z) + lift, z]; };
      marks.quad(corner(a, band), corner(a, band + 1), corner(b, band + 1), corner(b, band),
        [...colour, alphaA * edge[0]], [...colour, alphaA * edge[1]], [...colour, alphaB * edge[1]], [...colour, alphaB * edge[0]]);
    }
  }
}

function drawGround(kit, stage, fresh) {
  const {rows, things, tracks, ruts, pods, spots} = GLASSHOUSE_LAYOUT, random = mulberry(0x6d0f33), camp = stage === 'camp';
  const marks = kit.loose('ground');
  const straight = (from, to) => lineThrough([from, to], .9);
  // A mark's strength along its length: it comes and goes over several metres, so that it does not read as a rail.
  const patchy = (low, high) => {
    const knots = Array.from({length: 60}, () => random()), offset = Math.floor(random() * 50);
    return index => { const at = (index + offset) / 5, k = Math.floor(at), t = at - k, a = knots[k % 60], b = knots[(k + 1) % 60], wave = a + (b - a) * t * t * (3 - 2 * t); return low + (high - low) * clamp01(wave * 2.1 - .6) * (.7 + .3 * knots[(index * 7 + offset) % 60]); };
  };
  // Paths trodden between the rows and from the rows to the stove, the tent and the pump.
  for (let path = 0; path < rows.length - 1; path++) {
    const z = (rows[path].z + rows[path + 1].z) / 2 + .1;
    groundStrip(kit, marks, straight({x: ROWS.x0 - .8, z}, {x: ROWS.x1 + .8, z}), .42, MARK.trodden, patchy(.1, .26));
  }
  const yard = [[{x: ROWS.x1 + .9, z: -4.4}, {x: 3.4, z: -7.2}, spots.pump], [{x: ROWS.x1 + .9, z: 0}, {x: 4.5, z: 2.6}, {x: 9.2, z: 3.4}, spots.tent],
    [{x: ROWS.x1 + .9, z: 4.4}, {x: .8, z: 7.6}, spots.stove], [spots.stove, {x: -2, z: 12.4}, {x: -3.6, z: 14}], [spots.pump, {x: 7.4, z: -4.6}, {x: 9.6, z: -2.2}, {x: 13, z: -3.4}, {x: 15.6, z: -1.6}]];
  for (const path of yard) groundStrip(kit, marks, lineThrough(path, .9), .36, MARK.trodden, patchy(.06, .2));
  // Damp earth round the trough, and a dark ring where the stove's ash is tipped.
  const blot = (x, z, reach, colour, strength) => {
    const rim = Array.from({length: 12}, () => reach * (.75 + random() * .5)), centre = [x, kit.ground(x, z) + .05, z];
    const edge = (index, share) => { const angle = index / 12 * Math.PI * 2, r = rim[index % 12] * share, px = x + Math.cos(angle) * r, pz = z + Math.sin(angle) * r; return [px, kit.ground(px, pz) + .05, pz]; };
    const full = [...colour, strength], none = [...colour, 0];
    for (let ring = 0; ring < 12; ring++) {
      marks.triangle(centre, edge(ring + 1, .5), edge(ring, .5), full);
      marks.quad(edge(ring, .5), edge(ring + 1, .5), edge(ring + 1, 1), edge(ring, 1), full, full, none, none);
    }
  };
  blot(things.trough.x, things.trough.z + .1, 1.5, MARK.damp, .5);
  blot(things.stove.x - 1.1, things.stove.z + .9, .9, MARK.scorch, .55);
  // The cart's own two wheel marks from the trough to the far rows and back, worn by many trips.
  for (const side of [-.55, .55]) groundStrip(kit, marks, lineThrough([{x: things.cart.x + side * .2, z: things.cart.z + 1.2}, {x: 6.5 + side * .5, z: -3}, {x: 1.5, z: -7.6 + side},
    {x: ROWS.x0 - 2 + side * .3, z: -7.4 + side}, {x: ROWS.x0 - 2.2 + side, z: 6.2}], .9), .09, MARK.tyre, patchy(.08, .34));
  if (camp) { marks.keep(); return; }
  // The tent's floor is scorched black beyond its ash.
  blot(things.tent.x, things.tent.z, 4.3, MARK.scorch, .72);
  blot(things.tent.x - .8, things.tent.z + .5, 2.6, MARK.scorch, .5);
  // Tyre marks straight down every row. These are pressed into dug earth and last; the ones across the hard ground beyond
  // the rows are gone when the wind has had two nights at them.
  tracks.forEach(line => {
    const inRows = line.filter(point => point.x <= ROWS.x1 + 1.2 && point.x >= ROWS.x0 - 1.2), beyond = line.filter(point => point.x > ROWS.x1 + .4);
    for (const side of [-.5, .5]) {
      const shifted = lineOffset(inRows, side);
      groundStrip(kit, marks, shifted, .085, MARK.tyre, patchy(.55, .9), .11);
      if (fresh) {
        groundStrip(kit, marks, lineOffset(line.filter(point => point.x < ROWS.x0 - .4), side), .08, MARK.tyre, patchy(.0, .6));
        const fade = index => { const point = beyond[Math.min(index, beyond.length - 1)]; return 1 - smooth(54, 66, Math.hypot(point.x, point.z)); };
        const beat = patchy(.0, .8);
        groundStrip(kit, marks, lineOffset(beyond, side), .08, MARK.tyre, index => beat(index) * fade(index));
      }
    }
  });
  if (!fresh) { marks.keep(); return; }
  // The water cart's two ruts, deeper and wider than the buggies' marks, each in a soft shoulder of thrown earth, and the
  // footprints of the people who were walked off between them: a child's and a grown woman's.
  for (const side of [-.45, .45]) {
    const line = lineOffset(ruts, side), fade = index => 1 - smooth(54, 66, Math.hypot(line[Math.min(index, line.length - 1)].x, line[Math.min(index, line.length - 1)].z));
    const thrown = patchy(.1, .42), depth = patchy(.45, .92);
    groundStrip(kit, marks, line, .3, MARK.damp, index => thrown(index) * fade(index), .052);
    groundStrip(kit, marks, line, .11, MARK.rut, index => (.3 + depth(index) * .7) * fade(index), .058);
  }
  const print = (x, z, heading, long, wide) => {
    const y = kit.ground(x, z) + .064, ax = Math.sin(heading), az = Math.cos(heading), strength = .3 + random() * .3;
    // The sole and, behind it, the heel.
    for (const [along, length, breadth] of [[long * .16, long * .62, wide], [-long * .36, long * .26, wide * .72]]) {
      const cx = x + ax * along, cz = z + az * along, centre = [cx, y, cz];
      const rim = angle => [cx + ax * Math.cos(angle) * length / 2 + az * Math.sin(angle) * breadth / 2, y, cz + az * Math.cos(angle) * length / 2 - ax * Math.sin(angle) * breadth / 2];
      for (let piece = 0; piece < 8; piece++) marks.triangle(centre, rim(piece / 8 * Math.PI * 2), rim((piece + 1) / 8 * Math.PI * 2), [...MARK.print, strength]);
    }
  };
  for (const [stride, long, wide, shift, start] of [[.44, .17, .07, -.12, 3], [.6, .24, .09, .14, 5]]) {
    let travelled = 0, next = start, foot = 1;
    for (let index = 0; index < ruts.length - 1; index++) {
      const a = ruts[index], b = ruts[index + 1], far = Math.hypot(b.x - a.x, b.z - a.z);
      while (next <= travelled + far) {
        const t = (next - travelled) / far, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, heading = Math.atan2(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / far, nz = (b.x - a.x) / far;
        if (Math.hypot(x, z) < 56) print(x + nx * (shift + foot * .08), z + nz * (shift + foot * .08), heading + foot * .12, long, wide);
        foot = -foot; next += stride * (.9 + random() * .2);
      }
      travelled += far;
    }
  }
  marks.keep();
  // The bean pods, dropped one at a time between the ruts: fresh and green, each a hand long and curved.
  for (const pod of pods) kit.stand(pod.x, pod.z, pod.turn, () => {
    kit.rope('plain', [[-.07, .075, 0], [-.03, .08, .012], [.03, .08, .012], [.075, .072, -.004]], .011, PALETTE.pod, 5, 6);
    kit.tube('plain', [.075, .072, -.004], [.1, .078, -.012], .004, PALETTE.leafOld, 3);
  });
}

// A line moved sideways by `side` metres (to its left when walking along it).
function lineOffset(line, side) {
  return line.map((point, index) => {
    const a = line[Math.max(0, index - 1)], b = line[Math.min(line.length - 1, index + 1)], far = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return {x: point.x - (b.z - a.z) / far * side, z: point.z + (b.x - a.x) / far * side};
  });
}

// The glass's own material: mostly see-through, dusty low down, and brighter wherever it throws the sky or the sun back.
// Three.js draws a see-through mesh that shows both its faces twice over; `forceSinglePass` makes it one draw, which is what
// the budget counts.
function glassMaterial() {
  const material = new THREE.MeshStandardMaterial({name: 'windscreen glass', vertexColors: true, transparent: true, roughness: .2, metalness: 0, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false, envMapIntensity: 1});
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float glassShine = dot(totalSpecular, vec3(.3, .5, .2));
      float glassGraze = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
      diffuseColor.a = clamp(diffuseColor.a + glassShine * .65 + glassGraze * .2, 0.0, 1.0);
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'glasshouse-glass-1';
  return material;
}

// The glint: one small star for each upright screen, drawn over the scene and added to it. Its sums are those of
// `glasshouseGlint` above. A star keeps about the same size on the screen however far off the viewer is.
function createGlint(heightAt) {
  const glints = GLASSHOUSE_LAYOUT.glints, corners = [], centres = [], normals = [], beats = [], indices = [];
  glints.forEach((glint, index) => {
    const y = heightAt(glint.x, glint.z) + glint.y;
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      corners.push(x, z, 0); centres.push(glint.x, y, glint.z); normals.push(glint.normal.x, glint.normal.y, glint.normal.z); beats.push(glint.period, glint.phase);
    }
    indices.push(index * 4, index * 4 + 1, index * 4 + 2, index * 4, index * 4 + 2, index * 4 + 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3));
  geometry.setAttribute('aCentre', new THREE.Float32BufferAttribute(centres, 3));
  geometry.setAttribute('aFace', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('aBeat', new THREE.Float32BufferAttribute(beats, 2));
  geometry.setIndex(indices);
  const G = GLASSHOUSE_GLINT, number = value => value.toFixed(5);
  const material = new THREE.ShaderMaterial({
    name: 'glint of glass',
    uniforms: {uSun: {value: new THREE.Vector3(0, -1, 0)}, uTime: {value: 0}},
    vertexShader: `
      attribute vec3 aCentre; attribute vec3 aFace; attribute vec2 aBeat;
      uniform vec3 uSun; uniform float uTime;
      varying vec2 vAt; varying float vGlow;
      void main() {
        vec3 centre = (modelMatrix * vec4(aCentre, 1.0)).xyz;
        vec3 face = normalize(mat3(modelMatrix) * aFace);
        vec3 sun = normalize(uSun);
        vec3 toEye = cameraPosition - centre;
        float reach = max(length(toEye), .001);
        float lit = dot(face, sun), seen = dot(face, toEye) / reach;
        vec2 mirror = 2.0 * lit * face.xz - sun.xz;
        float thrown = length(mirror), level = max(length(toEye.xz), .001);
        float aim = thrown > .000001 ? dot(mirror, toEye.xz) / (thrown * level) : 0.0;
        float lobe = smoothstep(${number(G.aimFrom)}, ${number(G.aimTo)}, aim) * smoothstep(.15, .4, thrown) * step(.05, lit) * step(.05, seen);
        float beat = fract(uTime / aBeat.x + aBeat.y) * aBeat.x;
        float flash = smoothstep(0.0, ${number(G.rise)}, beat) * (1.0 - smoothstep(${number(G.hold)}, ${number(G.gone)}, beat));
        vGlow = smoothstep(${number(G.sunFrom)}, ${number(G.sunTo)}, sun.y) * lobe * flash;
        vAt = position.xy;
        float size = (.5 + reach * .015) * (.35 + .65 * vGlow);
        vec4 view = viewMatrix * vec4(centre, 1.0);
        view.xy += position.xy * size;
        gl_Position = vGlow > .002 ? projectionMatrix * view : vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vAt; varying float vGlow;
      void main() {
        float d = length(vAt);
        float core = exp(-d * d * 22.0);
        float rays = exp(-abs(vAt.x) * 26.0) * exp(-abs(vAt.y) * 3.2) + exp(-abs(vAt.y) * 26.0) * exp(-abs(vAt.x) * 3.2);
        float glow = (core * 1.7 + rays * .8) * vGlow * (1.0 - smoothstep(.75, 1.0, d));
        gl_FragColor = vec4(vec3(1.0, .96, .86) * glow, glow);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'The Glasshouse, glint of glass'; mesh.frustumCulled = false; mesh.renderOrder = 3;
  return mesh;
}

const KINDS = Object.freeze({
  hard: {name: 'tube, timber and iron'}, sheet: {name: 'tin'}, cloth: {name: 'tarpaulin and cloth'}, plain: {name: 'beans, earth and ash'},
  glass: {name: 'glass', alpha: true}, ground: {name: 'marks on the ground', alpha: true}, wheel: {name: 'pump wheel'}, rod: {name: 'pump rod'}, cart: {name: 'water cart'}, ember: {name: 'stove fire'},
});

// The camp at a stage. `stage` is 'camp' or 'burned'; `fresh` (burned only) is whether the raiders' tracks, the cart's ruts,
// the footprints and the bean pods are still there; `heightAt(x, z)` is the ground under a point of the site.
export function buildGlasshouse({stage = 'camp', fresh = true, heightAt = () => 0} = {}) {
  if (!GLASSHOUSE_STAGES.includes(stage)) throw new RangeError(`The Glasshouse has no stage called ${JSON.stringify(stage)}.`);
  PALETTE ??= makePalette();
  const camp = stage === 'camp', {things} = GLASSHOUSE_LAYOUT;
  const group = new THREE.Group();
  group.name = `The Glasshouse (${camp ? 'camp' : fresh ? 'burned, fresh' : 'burned, cold'})`;
  const kit = createKit(heightAt, KINDS);

  drawGround(kit, stage, fresh);
  drawRows(kit, stage);
  const pump = drawPump(kit);
  drawTent(kit, stage);
  const stove = drawStove(kit, stage);
  things.shelters.forEach((shelter, index) => kit.stand(shelter.x, shelter.z, shelter.heading, () => drawShelter(kit, index)));
  drawWashing(kit, stage);
  drawScarer(kit);
  drawSmallThings(kit, stage);
  // The moving parts are drawn about their own middles and stood in place as meshes of their own.
  drawWheel(kit);
  kit.tube('rod', [0, 0, 0], [0, pump.rod.to - pump.rod.from, 0], .011, PALETTE.iron, 5);
  kit.box('rod', .05, .09, .05, PALETTE.iron, 0, pump.rod.to - pump.rod.from, 0);
  if (camp) {
    drawCart(kit);
    // The fire seen through the stove's door.
    kit.within(stove.door.x, heightAt(things.stove.x, things.stove.z) + .44, stove.door.z, [0, stove.door.facing, 0], () => kit.keep('ember', new THREE.PlaneGeometry(.17, .06), PALETTE.rust));
  }

  // One material for each kind, with wear over everything that is tube, tin or cloth.
  const wear = {
    hard: createScrapWear({paint: 1, dust: 0x6a5a44}), cloth: createScrapWear({paint: .6, dust: 0x6a5a44}),
    wheel: createScrapWear({paint: 1, dust: 0x6a5a44}), cart: createScrapWear({paint: 1, dust: 0x6a5a44, dustTop: .75}),
  };
  const materials = {
    hard: wear.hard.apply(new THREE.MeshStandardMaterial({name: KINDS.hard.name, vertexColors: true, roughness: .9, metalness: .1})),
    sheet: wear.hard.apply(new THREE.MeshStandardMaterial({name: KINDS.sheet.name, vertexColors: true, roughness: .82, metalness: .15, side: THREE.DoubleSide})),
    cloth: wear.cloth.apply(new THREE.MeshStandardMaterial({name: KINDS.cloth.name, vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide})),
    plain: new THREE.MeshStandardMaterial({name: KINDS.plain.name, vertexColors: true, roughness: .95, metalness: 0, side: THREE.DoubleSide}),
    glass: glassMaterial(),
    ground: new THREE.MeshStandardMaterial({name: KINDS.ground.name, vertexColors: true, transparent: true, roughness: 1, metalness: 0, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4}),
    wheel: wear.wheel.apply(new THREE.MeshStandardMaterial({name: KINDS.wheel.name, vertexColors: true, roughness: .82, metalness: .15, side: THREE.DoubleSide})),
    rod: wear.hard.apply(new THREE.MeshStandardMaterial({name: KINDS.rod.name, vertexColors: true, roughness: .9, metalness: .1})),
    cart: wear.cart.apply(new THREE.MeshStandardMaterial({name: KINDS.cart.name, vertexColors: true, roughness: .86, metalness: .12, side: THREE.DoubleSide})),
    ember: new THREE.MeshStandardMaterial({name: KINDS.ember.name, color: 0x2a1206, roughness: .6, emissive: 0xff6a1c, emissiveIntensity: .6}),
  };
  const parts = {};
  for (const [kind, list] of Object.entries(kit.lists)) {
    if (!list.length) { materials[kind].dispose(); continue; }
    const merged = mergeGeometries(list);
    for (const geometry of list) geometry.dispose();
    if (kind === 'ember') merged.deleteAttribute('color');
    const mesh = new THREE.Mesh(merged, materials[kind]);
    mesh.name = `The Glasshouse, ${KINDS[kind].name}`;
    mesh.castShadow = !['glass', 'ground', 'ember'].includes(kind);
    mesh.receiveShadow = kind !== 'ember';
    if (kind === 'ground') mesh.renderOrder = 1;
    if (kind === 'glass') mesh.renderOrder = 2;
    group.add(mesh);
    parts[kind] = mesh;
  }
  // Stand the moving parts where they belong.
  parts.wheel.position.set(pump.hub[0], heightAt(things.pump.x, things.pump.z) + pump.hub[1], pump.hub[2]);
  parts.wheel.rotation.set(0, pump.facing, 0, 'YXZ');
  parts.rod.position.set(pump.rod.x, heightAt(things.pump.x, things.pump.z) + pump.rod.from, pump.rod.z);
  if (parts.cart) {
    parts.cart.position.set(things.cart.x, heightAt(things.cart.x, things.cart.z), things.cart.z);
    parts.cart.rotation.y = things.cart.heading;
  }
  let smoke = null, glint = null;
  if (camp) {
    // Bean stalks hardly smoke: a thin pale thread that stands a long way up in still air. This is the camp's tell at dusk.
    smoke = createSmokeColumn({height: 50, foot: .12, top: 4, wind: WIND, lean: .4, colour: 0x7d7870, pale: 0xbdb8b0, strength: .44});
    smoke.name = 'The Glasshouse, stove smoke';
    smoke.position.set(stove.pipe[0], heightAt(things.stove.x, things.stove.z) + stove.pipe[1], stove.pipe[2]);
    group.add(smoke);
    glint = createGlint(heightAt);
    group.add(glint);
  }
  const draws = [];
  group.traverse(node => { if (node.isMesh) draws.push(node.name); });
  // The wear's dust and shade are measured up from the ground, so its own metres begin at the ground under the centre.
  const rodBase = parts.rod.position.y, wheelLift = new THREE.Matrix4().makeTranslation(0, 8, 0), toGround = new THREE.Matrix4().makeTranslation(0, -heightAt(0, 0), 0);
  group.userData = {
    stage, fresh: !camp && fresh, triangles: kit.triangles + (smoke ? smoke.geometry.index.count / 3 : 0) + (glint ? glint.geometry.index.count / 3 : 0), draws,
    wheel: parts.wheel, rod: parts.rod, cart: parts.cart ?? null, smoke, glint, ember: parts.ember ?? null,
    // The clues a player can find in this drawing (section 21, Scene 2).
    clues: camp ? [] : fresh ? ['frames', 'lamp', 'tracks', 'ruts', 'pods', 'pump'] : ['frames', 'lamp', 'pump'],
    update(seconds, {sun} = {}) {
      const turn = seconds * GLASSHOUSE_PUMP.turnsPerSecond * Math.PI * 2 + Math.sin(seconds * .37) * .3;
      parts.wheel.rotation.z = turn;
      parts.rod.position.y = rodBase + Math.sin(turn / GLASSHOUSE_PUMP.rodTurns) * GLASSHOUSE_PUMP.stroke;
      // The wear rides with each thing it lies on. The wheel's is lifted clear of the dust that gathers low down, which
      // would otherwise turn with the blades.
      for (const worn of [wear.hard, wear.cloth]) { worn.follow(group); worn.uniforms.uScrapInverse.value.premultiply(toGround); }
      parts.wheel.updateWorldMatrix(true, false);
      wear.wheel.uniforms.uScrapInverse.value.copy(parts.wheel.matrixWorld).invert().premultiply(wheelLift);
      if (parts.cart) wear.cart.follow(parts.cart);
      smoke?.userData.update(seconds);
      if (glint) { glint.material.uniforms.uTime.value = seconds; if (sun) glint.material.uniforms.uSun.value.set(sun.x, sun.y, sun.z); }
      if (parts.ember) parts.ember.material.emissiveIntensity = .55 + .2 * Math.sin(seconds * 9.1) * Math.sin(seconds * 5.3);
    },
    dispose() {
      group.traverse(node => { if (node.isMesh) { node.geometry.dispose(); node.material.dispose(); } });
    },
  };
  group.userData.update(0);
  return group;
}

// The parts that move. `seconds` is the game's clock; `sun`, if given, is the direction towards the sun in the world
// ({x, y, z}), for the glint.
export function updateGlasshouse(group, seconds, {sun} = {}) {
  group?.userData?.update?.(seconds, {sun});
}
